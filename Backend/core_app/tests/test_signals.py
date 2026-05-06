import pytest
from decimal import Decimal # 🌟 FIX: Decimal module import kiya
from .factories import CompanyFactory, PartyFactory, ProductFactory
from core_app.models import SalesOrder, DeliveryChallan 

@pytest.mark.django_db
def test_delivery_challan_deducts_and_restores_stock():
    # 1. SETUP
    # 🌟 FIX: Sab jagah Decimal('...') use kiya
    product = ProductFactory(stock_quantity=Decimal('500.00')) 
    party = PartyFactory(company=product.company, party_type="CLIENT") 
    
    order = SalesOrder.objects.create(
        company=product.company,
        client=party,
        product=product,
        ordered_qty=Decimal('200.00'),
        total_bill=Decimal('1000.00')
    )

    # 2. ACTION: Create Challan for 150 meters
    challan = DeliveryChallan.objects.create(
        company=product.company,
        order=order,
        quantity=Decimal('150.00')
    )

    # 3. ASSERT: Stock should be reduced to 350
    product.refresh_from_db()
    assert product.stock_quantity == Decimal('350.00')
    
    # 4. ACTION: Delete Challan (Rollback)
    challan.delete()
    
    # 5. ASSERT: Stock should be restored to 500
    product.refresh_from_db()
    assert product.stock_quantity == Decimal('500.00')