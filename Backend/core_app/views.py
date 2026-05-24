from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Gotra
from .serializers import GotraSerializer # Adjust import if your serializer is in a different file

class GotraViewSet(viewsets.ModelViewSet):
    queryset = Gotra.objects.all().order_by('name_en')
    serializer_class = GotraSerializer
    permission_classes = [IsAuthenticated]





# Add this import at the top of your views.py if you don't have it already
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

# ... your existing views like GotraViewSet etc ...

# Add this at the bottom:
class HealthCheckView(APIView):
    """
    A simple endpoint to verify the API is running successfully.
    """
    permission_classes = [] # Allow anyone to ping this

    def get(self, request):
        return Response({"status": "API is healthy and running!"}, status=status.HTTP_200_OK)