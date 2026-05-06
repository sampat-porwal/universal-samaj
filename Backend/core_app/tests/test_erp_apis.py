import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from .factories import UserFactory
from .factories import UserFactory, ProductFactory, PartyFactory 

@pytest.mark.django_db
class TestERPApis:
    
    def setup_method(self):
        # 1. Setup Active User & Authenticate Client
        self.client = APIClient()
        self.user = UserFactory(is_active=True)
        self.user.company.is_active = True
        self.user.company.save()
        self.client.force_authenticate(user=self.user)

    # ==========================================
    # 📦 TEST 1: PRODUCTS API
    # ==========================================
    def test_products_api(self):
        try: url = reverse('dynamic-products')
        except: url = '/api/products/'

        # Test POST (Create Product)
        payload = {"name": "Premium Cotton", "stock_quantity": 500, "price_per_meter": 120}
        response_post = self.client.post(url, payload, format='json')
        assert response_post.status_code == 201

        # Test GET (List Products)
        response_get = self.client.get(url)
        assert response_get.status_code == 200
        assert len(response_get.json()['data']) >= 1

    # ==========================================
    # 👥 TEST 2: PARTIES API
    # ==========================================
    def test_parties_api(self):
        try: url = reverse('dynamic-parties')
        except: url = '/api/parties/'

        # Test POST (Create Party)
        payload = {"name": "Raju Traders", "party_type": "CUSTOMER", "phone": "9876543210"}
        response_post = self.client.post(url, payload, format='json')
        assert response_post.status_code == 201

        # Test GET (List Parties)
        response_get = self.client.get(url)
        assert response_get.status_code == 200
        assert len(response_get.json()['data']) >= 1

    # ==========================================
    # 📊 TEST 3: DASHBOARDS
    # ==========================================
    def test_dashboard_stats(self):
        try: url = reverse('dashboard_stats')
        except: url = '/api/dashboard-stats/'
        
        response = self.client.get(url)
        assert response.status_code == 200
        assert "total_sales" in response.json()

    def test_dashboard_summary(self):
        try: url = reverse('dashboard-summary')
        except: url = '/api/dashboard-summary/'
        
        response = self.client.get(url)
        assert response.status_code == 200
        assert "stats" in response.json()

    # ==========================================
    # ⚙️ TEST 4: COMPANY SETTINGS & EXPENSES
    # ==========================================
    def test_company_settings_api(self):
        try: url = reverse('settings')
        except: url = '/api/settings/'
        
        response_get = self.client.get(url)
        assert response_get.status_code == 200
        
        response_post = self.client.post(url, {"gstin": "22AAAAA0000A1Z5"}, format='json')
        assert response_post.status_code == 200

    def test_expenses_api(self):
        try: url = reverse('expenses')
        except: url = '/api/expenses/'
        
        response_post = self.client.post(url, {"category": "Tea", "amount": 500, "description": "Office tea"}, format='json')
        assert response_post.status_code == 201
        
        response_get = self.client.get(url)
        assert response_get.status_code == 200



# ==========================================
    # 🛒 TEST 5: ORDERS & BILLING API
    # ==========================================
    def test_orders_api(self):
        party = PartyFactory(company=self.user.company, party_type="CUSTOMER")
        product = ProductFactory(company=self.user.company, stock_quantity=100, price_per_meter=50)
        
        try: url = reverse('dynamic-orders')
        except: url = '/api/orders/'

        # Test POST (Order Create & Stock Deduct)
        payload = {
            "party_id": party.id,
            "transaction_type": "CHALLAN",
            "total_amount": 500,
            "items": [{"product_id": product.id, "quantity": 10, "rate": 50, "total": 500}]
        }
        response_post = self.client.post(url, payload, format='json')
        assert response_post.status_code == 201

        # Test GET
        response_get = self.client.get(url)
        assert response_get.status_code == 200
        assert len(response_get.json()) >= 1

    # ==========================================
    # 📥 TEST 6: PURCHASES API
    # ==========================================
    def test_purchases_api(self):
        party = PartyFactory(company=self.user.company, party_type="SUPPLIER")
        product = ProductFactory(company=self.user.company, stock_quantity=10)

        try: url = reverse('dynamic-purchases')
        except: url = '/api/purchases/'

        payload = {
            "party_id": party.id,
            "total_amount": 1000,
            "items": [{"product_id": product.id, "quantity": 20, "rate": 50, "total": 1000}]
        }
        response_post = self.client.post(url, payload, format='json')
        assert response_post.status_code == 201

        response_get = self.client.get(url)
        assert response_get.status_code == 200

    # ==========================================
    # 💸 TEST 7: PAYMENTS API
    # ==========================================
    def test_payments_api(self):
        party = PartyFactory(company=self.user.company)
        
        try: url = reverse('dynamic-payments')
        except: url = '/api/payments/'

        payload = {"party_id": party.id, "payment_type": "IN", "amount": 500, "payment_mode": "Cash"}
        response_post = self.client.post(url, payload, format='json')
        assert response_post.status_code == 201

        response_get = self.client.get(url)
        assert response_get.status_code == 200

    # ==========================================
    # 📖 TEST 8: PARTY LEDGER API
    # ==========================================
    def test_party_ledger_api(self):
        party = PartyFactory(company=self.user.company)
        
        try: url = reverse('party-ledger', kwargs={'pk': party.id})
        except: url = f'/api/ledger/{party.id}/'

        response = self.client.get(url)
        assert response.status_code == 200
        assert "ledger" in response.json()

    # ==========================================
    # 🏭 TEST 9: PRODUCTION / MANUFACTURING API
    # ==========================================
    def test_production_api(self):
        worker = PartyFactory(company=self.user.company, party_type="WORKER")
        raw_product = ProductFactory(company=self.user.company, stock_quantity=100)
        finished_product = ProductFactory(company=self.user.company, stock_quantity=0)

        try: url = reverse('production')
        except: url = '/api/production/'

        payload = {
            "worker_id": worker.id,
            "raw_materials": [{"product_id": raw_product.id, "quantity": 50}],
            "finished_goods": [{"product_id": finished_product.id, "quantity": 48, "rate_per_unit": 10}]
        }
        response_post = self.client.post(url, payload, format='json')
        assert response_post.status_code == 201

        response_get = self.client.get(url)
        assert response_get.status_code == 200