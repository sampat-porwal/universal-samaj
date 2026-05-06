import pytest
from unittest.mock import patch
from django.urls import reverse
from rest_framework.test import APIClient
from core_app.models import Company, CustomUser, CompanySchemaSetup

@pytest.mark.django_db
class TestMainViews:
    def setup_method(self):
        self.client = APIClient()

   # THE MASTER TEST: Registration Flow
    @patch('core_app.views.send_mail') # Email mat bhejo
    def test_saas_client_registration(self, mock_send_mail):
        try: 
            # 🌟 FIX: Sahi URL name 'saas_register' daala
            url = reverse('saas_register') 
        except: 
            url = '/api/auth/register/' # 🌟 FIX: Sahi fallback URL daali

        payload = {
            "company_name": "Royal Textile Mills",
            "owner_name": "Sampat Porwal",
            "email": "owner@royaltextile.com",
            "password": "securepassword123",
            "industry_code": "TEXTILE"
        }

        response = self.client.post(url, payload, format='json')

        # 1. Assert Response is 201 Created
        assert response.status_code == 201
        
        # 2. Assert Company is Created
        company = Company.objects.get(name="Royal Textile Mills")
        assert company is not None
        
        # 3. Assert User is Created and INACTIVE (awaiting email verify)
        user = CustomUser.objects.get(email="owner@royaltextile.com")
        assert user.is_active == False
        assert user.role == 'COMPANY_ADMIN'

        # 4. Assert Schema is Generated
        schema = CompanySchemaSetup.objects.get(company=company)
        assert schema is not None

        # 5. Check if system tried to send verify email
        mock_send_mail.assert_called_once()