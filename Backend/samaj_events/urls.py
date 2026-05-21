from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .event_views import SamajEventViewSet, EventOrganizerViewSet
from .bdc_views import BloodDonationViewSet
from .poll_views import SecretPollViewSet
from .sports_views import SportsTeamViewSet

router = DefaultRouter()
router.register(r'list', SamajEventViewSet, basename='samaj-events')
router.register(r'organizers', EventOrganizerViewSet, basename='event-organizers')
router.register(r'bdc', BloodDonationViewSet, basename='blood-donation')
router.register(r'polls', SecretPollViewSet, basename='secret-polls')
router.register(r'cricket/teams', SportsTeamViewSet, basename='sports-teams')

urlpatterns = [
    path('', include(router.urls)),
]