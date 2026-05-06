import pytest
from django.urls import reverse
from django.test import Client
from .factories import UserFactory, SubscriptionFactory
from django.utils import timezone
from datetime import timedelta

@pytest.mark.django_db
class TestSubscriptionMiddleware:
        
    def setup_method(self):
            self.client = Client()
            
            # ==========================================
            # STEP 1: REGISTRATION (Without Email Verification)
            # User aur Company ban gaye, par abhi Inactive hain
            # ==========================================
            self.user = UserFactory(is_active=False)
            self.user.company.is_active = False
            self.user.company.save()
            
            # ==========================================
            # STEP 2: AUTO FREE TRIAL (Starts on Registration Day)
            # Signal ne pehle din hi trial bana diya hai, usko fetch kar lo
            # ==========================================
            self.subscription = self.user.company.subscription 
            
            # ==========================================
            # STEP 3: EMAIL VERIFICATION (User clicked the link)
            # Ab user aur uski company dono Active ho jayenge
            # ==========================================
            self.user.is_active = True
            self.user.save()
            
            self.user.company.is_active = True
            self.user.company.save()
            
            # ==========================================
            # STEP 4: LOGIN 
            # Verified user ab dashboard access kar raha hai
            # ==========================================
            self.client.force_login(self.user)

    def test_active_subscription_allows_post(self):
        """Active subscription should allow POST requests (e.g., creating a product)"""
        # Note: Replace 'product-create' with your actual URL name for creating products
        # Using a dummy URL path for the concept
        response = self.client.post('/api/products/create/', {"name": "New Fabric"})
        
        # 403 nahi aana chahiye. (It might return 404 if URL doesn't exist in test, but not 403 Forbidden by middleware)
        assert response.status_code != 403

    def test_expired_subscription_blocks_post(self):
        """Expired subscription should block POST/PUT/DELETE requests with 403"""
        # Expire the subscription (Past date)
        self.subscription.valid_until = timezone.now() - timedelta(days=1)
        self.subscription.save()

        # Try to modify data
        response = self.client.post('/api/products/create/', {"name": "Hacked Fabric"})
        
        # Middleware should catch this and throw 403 Forbidden
        assert response.status_code == 403
        
        # Check if the custom JSON message is returned
        response_data = response.json()
        assert response_data["code"] == "SUBSCRIPTION_EXPIRED"
        assert "Your free trial has expired" in response_data["error"]

    def test_expired_subscription_allows_get(self):
        """Even if expired, GET requests (Dashboard view) should be allowed"""
        self.subscription.valid_until = timezone.now() - timedelta(days=1)
        self.subscription.save()

        # Try to READ data
        response = self.client.get('/api/products/')
        assert response.status_code != 403 # Read-only access works