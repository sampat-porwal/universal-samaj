from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import FamilyAlbum
from .serializers import FamilyAlbumSerializer

class FamilyAlbumViewSet(viewsets.ModelViewSet):
    """Handles Family Albums with 3-Album and 10-Photo limits"""
    queryset = FamilyAlbum.objects.all()
    serializer_class = FamilyAlbumSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)