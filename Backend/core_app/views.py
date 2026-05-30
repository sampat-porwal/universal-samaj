from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets, serializers
from django.db.models import Count

from core_app.models import SamajAnnouncement


# ── 1. Import from core_app ──
from core_app.models import SamajProfile, Gotra

# ── 2. Import from samaj_events (Fixes the first error) ──
from samaj_events.models import SamajEvent, BloodDonationRecord


# ==========================================
# 1. GOTRA VIEWSET (Fixes the current error)
# ==========================================
class GotraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gotra
        fields = '__all__'

class GotraViewSet(viewsets.ModelViewSet):
    queryset = Gotra.objects.all()
    serializer_class = GotraSerializer
    permission_classes = [IsAuthenticated]


# ==========================================
# 2. DASHBOARD ANALYTICS VIEW
# ==========================================
class DashboardAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # ── COMMUNITY DEMOGRAPHICS ──
        verified_profiles = SamajProfile.objects.filter(verification_status='VERIFIED', is_alive=True)
        
        total_members = verified_profiles.count()
        
        # Top 5 Villages/Cities
        top_villages = verified_profiles.exclude(village_en__isnull=True).exclude(village_en__exact='') \
            .values('village_en').annotate(total=Count('id')).order_by('-total')[:5]
            
        # Top 5 Gotras
        top_gotras = verified_profiles.exclude(gotra_en__isnull=True).exclude(gotra_en__exact='') \
            .values('gotra_en').annotate(total=Count('id')).order_by('-total')[:5]
            
        # Employment/Business Breakdown
        employment_stats = verified_profiles.exclude(employment_type__isnull=True) \
            .values('employment_type').annotate(total=Count('id')).order_by('-total')

        # ── EVENT & ACTIVITY METRICS ──
        active_events_count = SamajEvent.objects.filter(event_status='ACTIVE').count()
        completed_events_count = SamajEvent.objects.filter(event_status='COMPLETED').count()
        
        # Total Blood Donations
        total_blood_donations = BloodDonationRecord.objects.count()

        return Response({
            "overview": {
                "total_members": total_members,
                "active_events": active_events_count,
                "completed_events": completed_events_count,
                "total_blood_donations": total_blood_donations,
            },
            "demographics": {
                "top_villages": list(top_villages),
                "top_gotras": list(top_gotras),
                "employment": list(employment_stats),
            }
        })
    


# 1. Serializer
class SamajAnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_role = serializers.SerializerMethodField()

    class Meta:
        model = SamajAnnouncement
        fields = ['id', 'title', 'content', 'is_important', 'created_at', 'author_name', 'author_role']

    def get_author_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return "Samaj Admin"
        
    def get_author_role(self, obj):
        if obj.created_by:
            return obj.created_by.get_role_display()
        return "Official"

# 2. ViewSet
class SamajAnnouncementViewSet(viewsets.ModelViewSet):
    queryset = SamajAnnouncement.objects.all()
    serializer_class = SamajAnnouncementSerializer
    permission_classes = [IsAuthenticated]

    # Automatically set the 'created_by' field to the logged-in admin
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)




# from rest_framework import viewsets
# from rest_framework.permissions import IsAuthenticated
# from .models import Gotra
# from .serializers import GotraSerializer # Adjust import if your serializer is in a different file

# class GotraViewSet(viewsets.ModelViewSet):
#     queryset = Gotra.objects.all().order_by('name_en')
#     serializer_class = GotraSerializer
#     permission_classes = [IsAuthenticated]





# # Add this import at the top of your views.py if you don't have it already
# from rest_framework.views import APIView
# from rest_framework.response import Response
# from rest_framework import status

# # ... your existing views like GotraViewSet etc ...

# # Add this at the bottom:
# class HealthCheckView(APIView):
#     """
#     A simple endpoint to verify the API is running successfully.
#     """
#     permission_classes = [] # Allow anyone to ping this

#     def get(self, request):
#         return Response({"status": "API is healthy and running!"}, status=status.HTTP_200_OK)