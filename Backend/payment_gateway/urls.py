from django.urls import path
from .views import CreatePaymentOrderView, VerifyPaymentView

urlpatterns = [
    path('create-order/', CreatePaymentOrderView.as_view(), name='create-payment-order'),
    path('verify-payment/', VerifyPaymentView.as_view(), name='verify-payment'),
]