from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import BloodDonationRecord, SamajEvent
from .serializers import BloodDonationRecordSerializer
from core_app.models import SamajProfile

SYSTEM_ADMINS = ['SUPERADMIN', 'ADMIN', 'SKPUSER', 'SYSTEM_ADMIN', 'EVENT_ADMIN']


class BloodDonationViewSet(viewsets.ModelViewSet):
    """
    Blood Donation Registry.
    
    KEY RULE: Anyone can donate — both samaj members AND outside guests.
    - For samaj members: link via `profile` (samaj_id lookup)
    - For guests: fill guest_name, guest_mobile, guest_blood_group, guest_age
    
    Only event organizers/admins can view/manage donations for their event.
    """
    serializer_class = BloodDonationRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = BloodDonationRecord.objects.all().order_by('-donated_on')
        event_id = self.request.query_params.get('event_id')
        if event_id:
            qs = qs.filter(event_id=event_id)
        blood_group = self.request.query_params.get('blood_group')
        if blood_group:
            qs = qs.filter(
                Q(guest_blood_group=blood_group) |
                Q(profile__blood_group=blood_group)
            )
        return qs

    def create(self, request, *args, **kwargs):
        """
        Two modes:
        1. Samaj Member: provide samaj_id → auto-links profile
        2. Guest Donor:  provide guest_name, guest_mobile, guest_blood_group, guest_age
        """
        data = request.data.copy()
        samaj_id = data.get('samaj_id', '').strip()

        if samaj_id:
            # Mode 1: Verified samaj member
            try:
                profile = SamajProfile.objects.get(samaj_id=samaj_id)
                data['profile'] = profile.id
            except SamajProfile.DoesNotExist:
                return Response({"error": "No samaj member found with this ID."}, status=404)
        else:
            # Mode 2: Guest donor — validate required guest fields
            if not data.get('guest_name', '').strip():
                return Response({"error": "Guest name is required for non-member donors."}, status=400)
            if not data.get('guest_blood_group', '').strip():
                return Response({"error": "Blood group is required."}, status=400)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user, updated_by=request.user)
        return Response(serializer.data, status=201)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    # ── SUMMARY STATS FOR AN EVENT ─────────────────────────────────────────────
    @action(detail=False, methods=['get'])
    def event_summary(self, request):
        """GET /bdc/event_summary/?event_id=X"""
        event_id = request.query_params.get('event_id')
        if not event_id:
            return Response({"error": "event_id is required."}, status=400)

        qs = BloodDonationRecord.objects.filter(event_id=event_id)

        # Blood group breakdown
        blood_group_stats = {}
        for record in qs:
            bg = record.get_blood_group() or 'Unknown'
            blood_group_stats[bg] = blood_group_stats.get(bg, 0) + 1

        return Response({
            "total_donors": qs.count(),
            "verified_members": qs.filter(profile__isnull=False).count(),
            "guest_donors": qs.filter(profile__isnull=True).count(),
            "blood_group_breakdown": blood_group_stats,
        })