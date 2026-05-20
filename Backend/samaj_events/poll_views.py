from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import SecretPoll, PollVote, PollOption
from .serializers import SecretPollSerializer

SYSTEM_ADMINS = ['SUPERADMIN', 'ADMIN', 'SKPUSER', 'SYSTEM_ADMIN', 'EVENT_ADMIN']


class SecretPollViewSet(viewsets.ModelViewSet):
    serializer_class = SecretPollSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = SecretPoll.objects.all().order_by('-created_at')
        # Auto-close expired active polls in bulk
        expired_ids = qs.filter(
            status='ACTIVE',
            expires_at__lte=timezone.now()
        ).values_list('id', flat=True)
        if expired_ids:
            SecretPoll.objects.filter(id__in=expired_ids).update(status='CLOSED')
        return qs.prefetch_related('options')

    # ── CREATE POLL ────────────────────────────────────────────────────────────
    def create(self, request, *args, **kwargs):
        if getattr(request.user, 'role', '').upper() not in SYSTEM_ADMINS:
            return Response({"error": "Only admins can create polls."}, status=403)

        question = request.data.get('question', '').strip()
        options_data = request.data.get('options', [])
        duration_hours = int(request.data.get('duration_hours', 24))

        if not question:
            return Response({"error": "Question is required."}, status=400)
        if len([o for o in options_data if o.strip()]) < 2:
            return Response({"error": "At least 2 non-empty options are required."}, status=400)

        expires_at = timezone.now() + timedelta(hours=duration_hours)
        poll = SecretPoll.objects.create(
            question=question, status='ACTIVE', expires_at=expires_at,
            created_by=request.user, updated_by=request.user
        )
        for opt_text in options_data:
            if opt_text.strip():
                PollOption.objects.create(
                    poll=poll, option_text=opt_text.strip(),
                    created_by=request.user, updated_by=request.user
                )
        return Response(SecretPollSerializer(poll, context={'request': request}).data, status=201)

    # ── CAST VOTE ──────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def cast_vote(self, request, pk=None):
        poll = self.get_object()
        poll.auto_close_if_expired()

        if not hasattr(request.user, 'samaj_profile'):
            return Response({"error": "Verified samaj profile required to vote."}, status=403)
        if poll.status != 'ACTIVE':
            return Response({"error": f"Poll is {poll.status.lower()}. Voting is closed."}, status=400)

        option_id = request.data.get('option_id')
        try:
            option = PollOption.objects.get(id=option_id, poll=poll)
            PollVote.objects.create(
                poll=poll, option=option, voter=request.user.samaj_profile,
                created_by=request.user, updated_by=request.user
            )
            return Response({"message": "Your vote has been cast securely."}, status=201)
        except PollOption.DoesNotExist:
            return Response({"error": "Invalid option selected."}, status=400)
        except Exception:
            return Response({"error": "You have already voted in this poll."}, status=400)

    # ── CHANGE POLL STATUS (pause / close / reopen) ────────────────────────────
    @action(detail=True, methods=['post'])
    def set_status(self, request, pk=None):
        """
        Body: { "poll_status": "ACTIVE" | "PAUSED" | "CLOSED" }
        Only admins can use this.
        """
        if getattr(request.user, 'role', '').upper() not in SYSTEM_ADMINS:
            return Response({"error": "Only admins can change poll status."}, status=403)

        poll = self.get_object()
        new_status = request.data.get('poll_status', '').upper()
        if new_status not in ['ACTIVE', 'PAUSED', 'CLOSED']:
            return Response({"error": "Invalid status. Use ACTIVE, PAUSED, or CLOSED."}, status=400)

        poll.status = new_status
        poll.updated_by = request.user
        poll.save(update_fields=['status', 'updated_by'])
        return Response({"message": f"Poll {new_status.lower()}."})

    # ── EXTEND POLL DURATION ───────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def extend(self, request, pk=None):
        """
        Body: { "extra_hours": 24 }
        Extends the poll's expiry by given hours.
        """
        if getattr(request.user, 'role', '').upper() not in SYSTEM_ADMINS:
            return Response({"error": "Only admins can extend polls."}, status=403)

        poll = self.get_object()
        extra_hours = int(request.data.get('extra_hours', 24))
        base = poll.expires_at if poll.expires_at and poll.expires_at > timezone.now() else timezone.now()
        poll.expires_at = base + timedelta(hours=extra_hours)
        poll.status = 'ACTIVE'
        poll.save(update_fields=['expires_at', 'status'])
        return Response({"message": f"Poll extended by {extra_hours} hours."})