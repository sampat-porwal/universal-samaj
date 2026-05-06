from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import SamajCommittee
from .serializers import SamajCommitteeSerializer

class SamajCommitteeViewSet(viewsets.ModelViewSet):
    """Handles Event Committees (e.g. Cricket, Samuhik Vivah)"""
    queryset = SamajCommittee.objects.all()
    serializer_class = SamajCommitteeSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        