from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count  # 🌟 Added Count for Analytics
from .models import SamajEvent, EventOrganizer, EventParticipant, EventChatMessage
from .serializers import SamajEventSerializer, EventOrganizerSerializer, EventChatMessageSerializer
from core_app.models import SamajProfile

class SamajEventViewSet(viewsets.ModelViewSet):
    serializer_class = SamajEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    # 🌟 1. GEO-FENCING LOGIC (Show only relevant events)
    def get_queryset(self):
        user = self.request.user
        qs = SamajEvent.objects.all().order_by('-date_start')

        # SuperAdmins and System Admins see EVERYTHING
        if user.role in ['SUPERADMIN', 'ADMIN', 'SKPUSER', 'SYSTEM_ADMIN']:
            return qs

        # Normal Users see only GLOBAL events OR events matching their City/District
        if hasattr(user, 'samaj_profile'):
            profile = user.samaj_profile
            user_city = profile.village_en or "" 
            
            qs = qs.filter(
                Q(event_scope='GLOBAL') | 
                Q(event_scope='DISTRICT', target_district__icontains=user_city) |
                Q(event_scope='CITY', target_city_village__icontains=user_city) |
                Q(organizers__profile=profile) # Always show events where they are an organizer
            ).distinct()
            
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    # 🌟 2. SMART SEARCH API FOR COMMITTEE MEMBERS
    @action(detail=False, methods=['get'])
    def search_profiles(self, request):
        q = request.query_params.get('q', '').strip()
        if not q or len(q) < 2:
            return Response([])
        
        # Searching in Name, Mobile, Village, and Samaj ID
        profiles = SamajProfile.objects.filter(
            Q(user__first_name__icontains=q) |
            Q(user__mobile_no__icontains=q) |
            Q(village_en__icontains=q) |
            Q(samaj_id__icontains=q)
        ).select_related('user', 'father', 'father__user')[:10] # Show top 10 results

        data = []
        for p in profiles:
            father_name = p.father.user.first_name if p.father and hasattr(p.father, 'user') else "N/A"
            photo_url = request.build_absolute_uri(p.profile_image.url) if p.profile_image else None
            data.append({
                "samaj_id": p.samaj_id,
                "name": p.user.first_name,
                "mobile": p.user.mobile_no,
                "village": p.village_en,
                "father_name": father_name,
                "photo_url": photo_url
            })
        return Response(data)

    # 🌟 3. EVENT REGISTRATION LOGIC
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        event = self.get_object()
        user = request.user
        if not hasattr(user, 'samaj_profile'):
            return Response({"error": "Only verified profiles can join events."}, status=status.HTTP_403_FORBIDDEN)
        try:
            EventParticipant.objects.create(event=event, profile=user.samaj_profile, created_by=user, updated_by=user)
            return Response({"message": "Successfully joined the event!"}, status=status.HTTP_201_CREATED)
        except Exception:
            return Response({"error": "You have already joined this event."}, status=status.HTTP_400_BAD_REQUEST)

    # 🌟 4. MANAGE TEAM LOGIC (With Strict Event Admin Permissions)
    @action(detail=True, methods=['get', 'post', 'delete'])
    def team(self, request, pk=None):
        event = self.get_object()
        
        # Security Check: Only Main Admins OR "Event Admins" can manage the team
        is_admin = request.user.role in ['SUPERADMIN', 'ADMIN', 'SKPUSER']
        is_event_admin = event.organizers.filter(profile__user=request.user, role_title='Event Admin').exists()
        
        if not (is_admin or is_event_admin):
            return Response({"error": "Access Denied. Only Event Admins can manage the team."}, status=403)

        if request.method == 'GET':
            organizers = event.organizers.all()
            return Response(EventOrganizerSerializer(organizers, many=True).data)
            
        elif request.method == 'POST':
            samaj_id = request.data.get('samaj_id')
            role_title = request.data.get('role_title', 'Event Member')
            try:
                profile = SamajProfile.objects.get(samaj_id=samaj_id)
                EventOrganizer.objects.create(event=event, profile=profile, role_title=role_title, created_by=request.user, updated_by=request.user)
                return Response({"message": "Member added to committee."})
            except SamajProfile.DoesNotExist:
                return Response({"error": "Invalid Samaj ID. Profile not found."}, status=404)
            except Exception:
                return Response({"error": "Member is already in the committee."}, status=400)
                
        elif request.method == 'DELETE':
            org_id = request.data.get('organizer_id')
            EventOrganizer.objects.filter(id=org_id, event=event).delete()
            return Response({"message": "Member removed."})

    # 🌟 5. EVENT CHAT LOGIC
    @action(detail=True, methods=['get', 'post'])
    def chat(self, request, pk=None):
        event = self.get_object()
        is_admin = request.user.role in ['SUPERADMIN', 'ADMIN', 'SKPUSER']
        is_organizer = event.organizers.filter(profile__user=request.user).exists()
        
        if not (is_admin or is_organizer):
            return Response({"error": "Access Denied. Only Committee members can view this chat."}, status=403)
            
        if request.method == 'GET':
            msgs = event.chat_messages.all()
            return Response(EventChatMessageSerializer(msgs, many=True, context={'request': request}).data)
            
        elif request.method == 'POST':
            msg = request.data.get('message')
            if msg and msg.strip():
                EventChatMessage.objects.create(event=event, sender=request.user.samaj_profile, message=msg, created_by=request.user, updated_by=request.user)
                return Response({"message": "Sent."})
            return Response({"error": "Message cannot be empty."}, status=400)

    # 🌟 6. NEW: EVENT DASHBOARD ANALYTICS
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        event = self.get_object()
        
        # Security Check: Only Organizers or Admins can see analytics
        is_admin = request.user.role in ['SUPERADMIN', 'ADMIN', 'SKPUSER']
        is_organizer = event.organizers.filter(profile__user=request.user).exists()
        
        if not (is_admin or is_organizer):
            return Response({"error": "Access Denied."}, status=403)

        # Count registrations grouped by user's village
        stats = event.participants.values('profile__village_en').annotate(count=Count('id')).order_by('-count')
        
        return Response({
            "total_registrations": event.participants.count(),
            "village_wise": stats,
            "committee_size": event.organizers.count()
        })


class EventOrganizerViewSet(viewsets.ModelViewSet):
    queryset = EventOrganizer.objects.all()
    serializer_class = EventOrganizerSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)