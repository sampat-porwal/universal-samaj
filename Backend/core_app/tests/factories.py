# core_app/tests/factories.py
import factory
from django.utils import timezone
from datetime import timedelta
from core_app.models import Company, CustomUser, Subscription, Product, Party

class CompanyFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Company
    name = factory.Sequence(lambda n: f"Test Company {n}")
    is_active = True

class SubscriptionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Subscription
    company = factory.SubFactory(CompanyFactory)
    plan_type = 'FREE'
    valid_until = factory.LazyFunction(lambda: timezone.now() + timedelta(days=14))
    is_locked = False

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CustomUser
    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    company = factory.SubFactory(CompanyFactory)
    role = 'COMPANY_ADMIN'

class ProductFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Product
    company = factory.SubFactory(CompanyFactory)
    name = "Test Fabric"
    stock_quantity = 100.00
    price_per_meter = 50.00

class PartyFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Party
    company = factory.SubFactory(CompanyFactory)
    name = "Test Client"
    party_type = "CUSTOMER"