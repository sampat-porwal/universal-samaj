import pytest
from unittest.mock import patch
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework.test import APIClient
from .factories import UserFactory

User = get_user_model()

@pytest.mark.django_db
class TestAuthViews:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory(email="test@example.com", is_active=False)
        # Token generate for email verification/reset
        self.uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.token = default_token_generator.make_token(self.user)

    # 1. Test Verification Email
    def test_verify_email_success(self):
        # Fallback URL if reverse fails
        url = '/api/verify-email/' 
        try: url = reverse('verify-email') 
        except: pass

        response = self.client.post(url, {"uid": self.uidb64, "token": self.token}, format='json')
        
        assert response.status_code == 200
        self.user.refresh_from_db()
        assert self.user.is_active == True # User aazad ho gaya!

# 2. Test Forgot Password Email Request (MOCKING SEND_MAIL)
    @patch('core_app.auth_views.send_mail') # Asli email mat bhejo, fake karo
    def test_request_password_reset(self, mock_send_mail):
        try: 
            # 🌟 FIX: Sahi URL name 'request-reset-email' daala
            url = reverse('request-reset-email')
        except: 
            url = '/api/request-reset-email/'

        response = self.client.post(url, {"email": "test@example.com"}, format='json')
        
        assert response.status_code == 200
        mock_send_mail.assert_called_once() # Verify ki system ne email bhejne ki koshish ki
    # 3. Test Password Reset Complete
    def test_password_reset_complete(self):
        url = '/api/reset-password-complete/'
        try: url = reverse('password-reset-complete')
        except: pass

        response = self.client.post(url, {
            "uid": self.uidb64, 
            "token": self.token, 
            "password": "NewStrongPassword123"
        }, format='json')
        
        assert response.status_code == 200
        
        # Check if password actually changed
        self.user.refresh_from_db()
        assert self.user.check_password("NewStrongPassword123") == True

    # 4. Test Change Password (Logged in User)
    def test_change_password(self):
        self.user.set_password("OldPassword")
        self.user.is_active = True
        self.user.save()
        self.client.force_authenticate(user=self.user) # Login the user

        url = '/api/change-password/'
        try: url = reverse('change-password')
        except: pass

        response = self.client.post(url, {
            "old_password": "OldPassword",
            "new_password": "NewSuperPassword"
        }, format='json')

        assert response.status_code == 200
        self.user.refresh_from_db()
        assert self.user.check_password("NewSuperPassword") == True