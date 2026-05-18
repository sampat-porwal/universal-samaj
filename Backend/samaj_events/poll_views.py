from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import SecretPoll, PollVote, PollOption
from .serializers import SecretPollSerializer

class SecretPollViewSet(viewsets.ModelViewSet):
    queryset = SecretPoll.objects.all().order_by('-created_at')
    serializer_class = SecretPollSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        question = request.data.get('question')
        options_data = request.data.get('options', [])
        duration_hours = int(request.data.get('duration_hours', 24)) # 🌟 Default 24 hours

        if not question or len(options_data) < 2:
            return Response({"error": "Question and at least 2 options are required."}, status=status.HTTP_400_BAD_REQUEST)

        # 🌟 Calculate exact expiry time
        expires_at = timezone.now() + timedelta(hours=duration_hours)

        poll = SecretPoll.objects.create(
            question=question,
            status='ACTIVE',
            expires_at=expires_at,
            created_by=request.user,
            updated_by=request.user
        )

        for opt_text in options_data:
            if opt_text.strip():
                PollOption.objects.create(
                    poll=poll,
                    option_text=opt_text.strip(),
                    created_by=request.user,
                    updated_by=request.user
                )

        serializer = self.get_serializer(poll)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cast_vote(self, request, pk=None):
        poll = self.get_object()
        user = request.user
        option_id = request.data.get('option_id')

        if not hasattr(user, 'samaj_profile'):
            return Response({"error": "Verified profile required."}, status=status.HTTP_403_FORBIDDEN)

        if poll.status != 'ACTIVE':
            return Response({"error": "Poll is closed."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            option = PollOption.objects.get(id=option_id, poll=poll)
            PollVote.objects.create(
                poll=poll, option=option, voter=user.samaj_profile,
                created_by=user, updated_by=user
            )
            return Response({"message": "Vote cast successfully."}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": "Invalid option or you already voted."}, status=status.HTTP_400_BAD_REQUEST)