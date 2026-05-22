from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    SamajEvent, EventOrganizer, EventParticipant,
    EventChatMessage, BloodDonationRecord
)
from .serializers import (
    SamajEventSerializer, EventOrganizerSerializer, EventParticipantSerializer,
    EventChatMessageSerializer, BloodDonationRecordSerializer
)
from core_app.models import SamajProfile


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────
SYSTEM_ADMINS = ['SUPERADMIN', 'ADMIN', 'SKPUSER', 'SYSTEM_ADMIN', 'EVENT_ADMIN']

def is_system_admin(user):
    return getattr(user, 'role', '').upper() in SYSTEM_ADMINS

def is_event_admin(event, user):
    """Returns True if user is a system admin OR an Event Admin organizer."""
    # 🌟 FIX: Added __iexact to ensure case-insensitive matching for full access
    return is_system_admin(user) or event.organizers.filter(
        profile__user=user, role_title__iexact='event admin'
    ).exists()

def is_event_organizer(event, user):
    """Returns True if user is any kind of organizer (admin or member)."""
    return is_system_admin(user) or event.organizers.filter(
        profile__user=user
    ).exists()


# ──────────────────────────────────────────────────────────────────────────────
# MAIN EVENT VIEWSET
# ──────────────────────────────────────────────────────────────────────────────
class SamajEventViewSet(viewsets.ModelViewSet):
    serializer_class = SamajEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    # ── 1. GEO-FENCING + SCOPE FILTER ────────────────────────────────────────
    def get_queryset(self):
        user = self.request.user
        qs = SamajEvent.objects.all().order_by('-date_start')

        if is_system_admin(user):
            return qs

        if hasattr(user, 'samaj_profile'):
            profile = user.samaj_profile
            user_city = profile.village_en or ""
            qs = qs.filter(
                Q(event_scope='GLOBAL') |
                Q(event_scope='DISTRICT', target_district__icontains=user_city) |
                Q(event_scope='CITY', target_city_village__icontains=user_city) |
                Q(organizers__profile=profile)
            ).distinct()

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    # ── 2. STATUS MANAGEMENT ────────────
    @action(detail=True, methods=['post'])
    def set_status(self, request, pk=None):
        event = self.get_object()
        if not is_system_admin(request.user):
            return Response({"error": "Only admins can change event status."}, status=403)

        new_status = request.data.get('event_status', '').upper()
        valid = [s[0] for s in SamajEvent.EVENT_STATUS]
        if new_status not in valid:
            return Response({"error": f"Invalid status. Choose from {valid}"}, status=400)

        event.event_status = new_status
        event.is_active = (new_status == 'ACTIVE')
        event.updated_by = request.user
        event.save(update_fields=['event_status', 'is_active', 'updated_by'])
        return Response({"message": f"Event status updated to {new_status}."})

    # ── 3. PROFILE SEARCH ───────────────────────────
    @action(detail=False, methods=['get'])
    def search_profiles(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response([])
        profiles = SamajProfile.objects.filter(
            Q(user__first_name__icontains=q) |
            Q(user__mobile_no__icontains=q) |
            Q(village_en__icontains=q) |
            Q(samaj_id__icontains=q)
        ).select_related('user')[:10]
        data = [{
            "samaj_id": p.samaj_id,
            "name": p.user.first_name,
            "mobile": p.user.mobile_no,
            "village": p.village_en,
            "photo_url": request.build_absolute_uri(p.profile_image.url) if p.profile_image else None,
        } for p in profiles]
        return Response(data)

    # ── 4. JOIN EVENT ─────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        event = self.get_object()
        if not hasattr(request.user, 'samaj_profile'):
            return Response({"error": "Only verified samaj members can join events."}, status=403)
        if event.event_status in ['CANCELLED', 'COMPLETED']:
            return Response({"error": f"Cannot join a {event.event_status.lower()} event."}, status=400)
        if event.is_full:
            return Response({"error": "Event is full. No more registrations accepted."}, status=400)
        try:
            EventParticipant.objects.create(
                event=event, profile=request.user.samaj_profile,
                created_by=request.user, updated_by=request.user
            )
            return Response({"message": "Successfully registered for the event!"}, status=201)
        except Exception:
            return Response({"error": "You are already registered for this event."}, status=400)

    # ── 5. LEAVE EVENT ────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        event = self.get_object()
        if not hasattr(request.user, 'samaj_profile'):
            return Response({"error": "Profile not found."}, status=403)
        deleted, _ = EventParticipant.objects.filter(
            event=event, profile=request.user.samaj_profile
        ).delete()
        if deleted:
            return Response({"message": "You have left the event."})
        return Response({"error": "You were not registered for this event."}, status=400)

    # ── 6. PARTICIPANTS LIST ──────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        event = self.get_object()
        if not is_event_organizer(event, request.user):
            return Response({"error": "Access denied. Organizers only."}, status=403)
        qs = event.participants.select_related('profile__user').all()
        return Response(EventParticipantSerializer(qs, many=True).data)

    # ── 7. REMOVE PARTICIPANT ──────────────────────────────────
    @action(detail=True, methods=['delete'], url_path='participants/(?P<participant_id>[^/.]+)')
    def remove_participant(self, request, pk=None, participant_id=None):
        event = self.get_object()
        if not is_event_admin(event, request.user):
            return Response({"error": "Only Event Admins can remove participants."}, status=403)
        deleted, _ = EventParticipant.objects.filter(id=participant_id, event=event).delete()
        if deleted:
            return Response({"message": "Participant removed."})
        return Response({"error": "Participant not found."}, status=404)

    # ── 8. TEAM MANAGEMENT ────────────────────────────────────────────────────
    @action(detail=True, methods=['get', 'post', 'delete'])
    def team(self, request, pk=None):
        event = self.get_object()

        if request.method == 'GET':
            if not is_event_organizer(event, request.user):
                return Response({"error": "Access denied."}, status=403)
            organizers = event.organizers.select_related('profile__user').all()
            return Response(EventOrganizerSerializer(organizers, many=True, context={'request': request}).data)

        elif request.method == 'POST':
            # 🌟 FIX: Uses updated is_event_admin which correctly identifies Abhiyanta
            if not is_event_admin(event, request.user):
                return Response({"error": "Only Event Admins can add team members."}, status=403)
            samaj_id = request.data.get('samaj_id')
            role_title = request.data.get('role_title', 'Event Member')
            
            # Case insensitive check
            if role_title.lower() not in ['event admin', 'event member']:
                return Response({"error": "Invalid role. Choose 'Event Admin' or 'Event Member'."}, status=400)
            try:
                profile = SamajProfile.objects.get(samaj_id=samaj_id)
                EventOrganizer.objects.create(
                    event=event, profile=profile, role_title=role_title,
                    created_by=request.user, updated_by=request.user
                )
                return Response({"message": f"{profile.user.first_name} added as {role_title}."})
            except SamajProfile.DoesNotExist:
                return Response({"error": "Profile not found with this Samaj ID."}, status=404)
            except Exception:
                return Response({"error": "This member is already on the team."}, status=400)

        elif request.method == 'DELETE':
            org_id = request.data.get('organizer_id')
            if not org_id and hasattr(request.user, 'samaj_profile'):
                deleted, _ = EventOrganizer.objects.filter(event=event, profile=request.user.samaj_profile).delete()
                if deleted: return Response({"message": "You have left the event team."})
                return Response({"error": "You are not on this team."}, status=400)

            if not is_event_admin(event, request.user):
                return Response({"error": "Only Event Admins can remove team members."}, status=403)
            deleted, _ = EventOrganizer.objects.filter(id=org_id, event=event).delete()
            if deleted: return Response({"message": "Member removed from team."})
            return Response({"error": "Member not found."}, status=404)

    # ── 9. CHAT ───────────────────────────────────────────────────────────────
    @action(detail=True, methods=['get', 'post'])
    def chat(self, request, pk=None):
        event = self.get_object()
        if not is_event_organizer(event, request.user):
            return Response({"error": "Only team members can access this chat."}, status=403)

        if request.method == 'GET':
            msgs = event.chat_messages.select_related('sender__user').order_by('created_at')
            return Response(EventChatMessageSerializer(msgs, many=True, context={'request': request}).data)

        elif request.method == 'POST':
            msg = request.data.get('message', '').strip()
            if not msg: return Response({"error": "Message cannot be empty."}, status=400)
            if not hasattr(request.user, 'samaj_profile'): return Response({"error": "Profile required to send messages."}, status=403)
            EventChatMessage.objects.create(
                event=event, sender=request.user.samaj_profile, message=msg,
                created_by=request.user, updated_by=request.user
            )
            return Response({"message": "Sent."}, status=201)

    # ── 10. ANALYTICS DASHBOARD ───────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        event = self.get_object()
        if not is_event_organizer(event, request.user):
            return Response({"error": "Access denied."}, status=403)

        village_stats = (
            event.participants
            .values('profile__village_en')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        return Response({
            "total_registrations": event.participants.count(),
            "committee_size": event.organizers.count(),
            "village_wise": list(village_stats),
            "event_status": event.event_status,
            "is_full": event.is_full,
            "max_participants": event.max_participants,
        })


class EventOrganizerViewSet(viewsets.ModelViewSet):
    queryset = EventOrganizer.objects.all()
    serializer_class = EventOrganizerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)