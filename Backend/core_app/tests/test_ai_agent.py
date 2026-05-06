import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework.test import APIClient  # 🌟 FIX 1: DRF ka APIClient import kiya
from .factories import UserFactory, ProductFactory

@pytest.mark.django_db
@patch('core_app.ai_views.genai.Client') 
def test_ai_chat_product_intent(mock_gemini_client):
    user = UserFactory(is_active=True)
    user.company.is_active = True
    user.company.save()
    
    # 🌟 FIX 2: DRF Client use kiya aur authenticate kiya
    client = APIClient()
    client.force_authenticate(user=user)
    
    ProductFactory(company=user.company, name="Blue Cotton", stock_quantity=200)

    mock_chat_instance = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "Here is the stock report:\n| Item | Stock |\n| Blue Cotton | 200 |"
    
    mock_chat_instance.send_message.return_value = mock_response
    mock_gemini_client.return_value.chats.create.return_value = mock_chat_instance

    try:
        url = reverse('ai-chat') 
    except:
        url = '/api/chat/' 
        
    response = client.post(
        url, 
        {"message": "Show me my product stock", "history": []}, 
        format='json'  # 🌟 FIX 3: DRF ke liye format='json'
    )

    assert response.status_code == 200
    response_data = response.json()
    assert "reply" in response_data
    assert "Blue Cotton" in response_data["reply"]