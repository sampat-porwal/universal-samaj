from rest_framework import viewsets, permissions
from .models import SportsTeam
from .serializers import SportsTeamSerializer

class SportsTeamViewSet(viewsets.ModelViewSet):
    """ Manages Sports Teams and Tournament Players """
    queryset = SportsTeam.objects.all()
    serializer_class = SportsTeamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)