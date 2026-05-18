from rest_framework import viewsets, permissions
from .models import BloodDonationRecord
from .serializers import BloodDonationRecordSerializer

class BloodDonationViewSet(viewsets.ModelViewSet):
    """ Registry for all blood donations (Verified profiles + Guests) """
    queryset = BloodDonationRecord.objects.all().order_by('-donated_on')
    serializer_class = BloodDonationRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)