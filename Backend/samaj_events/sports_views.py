from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import SportsTeam, TournamentPlayer, SamajEvent
from .serializers import SportsTeamSerializer, TournamentPlayerSerializer
from core_app.models import SamajProfile

SYSTEM_ADMINS = ['SUPERADMIN', 'ADMIN', 'SKPUSER', 'SYSTEM_ADMIN', 'EVENT_ADMIN']


class SportsTeamViewSet(viewsets.ModelViewSet):
    """
    Manages Sports Teams for Cricket/Sports events.
    - All teams belong to an event.
    - Only samaj-registered members can be players (no guests).
    """
    serializer_class = SportsTeamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = SportsTeam.objects.all().prefetch_related('players__profile__user')
        event_id = self.request.query_params.get('event_id')
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    # ── ADD PLAYER TO TEAM ─────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def add_player(self, request, pk=None):
        """
        Body: { "samaj_id": "...", "player_role": "Batsman", "jersey_number": 7 }
        Only samaj registered profiles can be added.
        """
        team = self.get_object()
        is_admin = getattr(request.user, 'role', '').upper() in SYSTEM_ADMINS
        is_event_admin = team.event.organizers.filter(
            profile__user=request.user, role_title='Event Admin'
        ).exists()

        if not (is_admin or is_event_admin):
            return Response({"error": "Only Event Admins can add players."}, status=403)

        samaj_id = request.data.get('samaj_id')
        player_role = request.data.get('player_role', '')
        jersey_number = request.data.get('jersey_number')

        try:
            profile = SamajProfile.objects.get(samaj_id=samaj_id)
        except SamajProfile.DoesNotExist:
            return Response({"error": "Samaj member not found. Only registered members can play."}, status=404)

        try:
            player = TournamentPlayer.objects.create(
                team=team, profile=profile, player_role=player_role,
                jersey_number=jersey_number,
                created_by=request.user, updated_by=request.user
            )
            return Response(TournamentPlayerSerializer(player).data, status=201)
        except Exception:
            return Response({"error": "This player is already in the team."}, status=400)

    # ── REMOVE PLAYER ─────────────────────────────────────────────────────────
    @action(detail=True, methods=['delete'], url_path='remove_player/(?P<player_id>[^/.]+)')
    def remove_player(self, request, pk=None, player_id=None):
        team = self.get_object()
        is_admin = getattr(request.user, 'role', '').upper() in SYSTEM_ADMINS
        is_event_admin = team.event.organizers.filter(
            profile__user=request.user, role_title='Event Admin'
        ).exists()

        if not (is_admin or is_event_admin):
            return Response({"error": "Only Event Admins can remove players."}, status=403)

        deleted, _ = TournamentPlayer.objects.filter(id=player_id, team=team).delete()
        if deleted:
            return Response({"message": "Player removed from team."})
        return Response({"error": "Player not found."}, status=404)