from datetime import timedelta
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import SecretPoll, PollVote, PollOption
from .serializers import SecretPollSerializer

SYSTEM_ADMINS = ['SUPERADMIN', 'ADMIN', 'SKPUSER', 'SYSTEM_ADMIN']


class SecretPollViewSet(viewsets.ModelViewSet):
    serializer_class = SecretPollSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = SecretPoll.objects.all().order_by('-created_at')
        # Bulk auto-close expired polls
        expired_ids = list(qs.filter(
            status='ACTIVE', expires_at__lte=timezone.now()
        ).values_list('id', flat=True))
        if expired_ids:
            SecretPoll.objects.filter(id__in=expired_ids).update(status='CLOSED')
        return qs.prefetch_related('options')

    # ── CREATE ─────────────────────────────────────────────────────────────────
    def create(self, request, *args, **kwargs):
        if getattr(request.user, 'role', '').upper() not in SYSTEM_ADMINS:
            return Response({"error": "Only admins can create polls."}, status=403)

        question = request.data.get('question', '').strip()
        options_data = request.data.get('options', [])

        if not question:
            return Response({"error": "Question is required."}, status=400)
        valid_opts = [o for o in options_data if str(o).strip()]
        if len(valid_opts) < 2:
            return Response({"error": "At least 2 non-empty options are required."}, status=400)

        # ── Expiry: support both duration_hours AND direct expires_at ──────────
        expires_at_raw = request.data.get('expires_at')  # ISO string from frontend datetime picker
        duration_hours = request.data.get('duration_hours')

        if expires_at_raw:
            # Frontend sent exact datetime (from "Exact Date & Time" mode)
            try:
                expires_at = parse_datetime(expires_at_raw)
                if expires_at is None:
                    raise ValueError("Bad format")
                # Make timezone-aware if naive
                if timezone.is_naive(expires_at):
                    expires_at = timezone.make_aware(expires_at)
            except (ValueError, TypeError):
                return Response({"error": "Invalid expiry datetime format. Use ISO 8601."}, status=400)

            if expires_at <= timezone.now():
                return Response({"error": "Expiry time must be in the future."}, status=400)
        elif duration_hours is not None:
            try:
                hours = int(duration_hours)
                if hours < 1:
                    raise ValueError()
                expires_at = timezone.now() + timedelta(hours=hours)
            except (ValueError, TypeError):
                return Response({"error": "duration_hours must be a positive integer."}, status=400)
        else:
            # Default: 24 hours
            expires_at = timezone.now() + timedelta(hours=24)

        poll = SecretPoll.objects.create(
            question=question,
            status='ACTIVE',
            expires_at=expires_at,
            created_by=request.user,
            updated_by=request.user,
        )
        for opt_text in valid_opts:
            PollOption.objects.create(
                poll=poll,
                option_text=str(opt_text).strip(),
                created_by=request.user,
                updated_by=request.user,
            )

        return Response(
            SecretPollSerializer(poll, context={'request': request}).data,
            status=201
        )

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
                poll=poll, option=option,
                voter=request.user.samaj_profile,
                created_by=request.user, updated_by=request.user,
            )
            return Response({"message": "Your vote has been cast securely."}, status=201)
        except PollOption.DoesNotExist:
            return Response({"error": "Invalid option selected."}, status=400)
        except Exception:
            return Response({"error": "You have already voted in this poll."}, status=400)

    # ── SET STATUS (pause / close / reopen) ────────────────────────────────────
    @action(detail=True, methods=['post'])
    def set_status(self, request, pk=None):
        if getattr(request.user, 'role', '').upper() not in SYSTEM_ADMINS:
            return Response({"error": "Only admins can change poll status."}, status=403)

        poll = self.get_object()
        new_status = request.data.get('poll_status', '').upper()
        if new_status not in ['ACTIVE', 'PAUSED', 'CLOSED']:
            return Response({"error": "Use ACTIVE, PAUSED, or CLOSED."}, status=400)

        poll.status = new_status
        poll.updated_by = request.user
        poll.save(update_fields=['status', 'updated_by'])
        return Response({"message": f"Poll {new_status.lower()}."})

    # ── EXTEND POLL ────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def extend(self, request, pk=None):
        if getattr(request.user, 'role', '').upper() not in SYSTEM_ADMINS:
            return Response({"error": "Only admins can extend polls."}, status=403)

        poll = self.get_object()

        # Support both extra_hours and new exact expires_at
        new_expires_raw = request.data.get('expires_at')
        extra_hours = request.data.get('extra_hours')

        if new_expires_raw:
            try:
                new_expires = parse_datetime(new_expires_raw)
                if new_expires and timezone.is_naive(new_expires):
                    new_expires = timezone.make_aware(new_expires)
                if not new_expires or new_expires <= timezone.now():
                    raise ValueError()
                poll.expires_at = new_expires
            except (ValueError, TypeError):
                return Response({"error": "Invalid or past expiry datetime."}, status=400)
        elif extra_hours:
            base = poll.expires_at if poll.expires_at and poll.expires_at > timezone.now() else timezone.now()
            poll.expires_at = base + timedelta(hours=int(extra_hours))
        else:
            return Response({"error": "Provide expires_at or extra_hours."}, status=400)

        poll.status = 'ACTIVE'
        poll.save(update_fields=['expires_at', 'status'])
        return Response({"message": "Poll extended.", "expires_at": poll.expires_at})

    # ── RESULTS (always accessible, even for closed polls) ─────────────────────
    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """
        Returns full poll results.
        - Admins: always accessible regardless of status
        - Regular users: only accessible when poll is CLOSED
        """
        poll = self.get_object()
        is_admin = getattr(request.user, 'role', '').upper() in SYSTEM_ADMINS

        if not is_admin and poll.status != 'CLOSED':
            return Response({"error": "Results are only visible after the poll closes."}, status=403)

        data = SecretPollSerializer(poll, context={'request': request}).data
        # Force include vote counts regardless of status for this endpoint
        for opt in data['options']:
            opt_obj = PollOption.objects.get(id=opt['id'])
            opt['vote_count'] = opt_obj.vote_count

        total = PollVote.objects.filter(poll=poll).count()
        winner = max(data['options'], key=lambda o: o['vote_count'] or 0) if data['options'] else None

        return Response({
            **data,
            "total_votes": total,
            "winner": winner,
            "expires_at": poll.expires_at,
        })