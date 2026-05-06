from django.db import models
from django.conf import settings
import uuid

# ==========================================
# 🕒 1. BASE MODEL (For all upcoming models)
# ==========================================
class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True  # 🌟 This ensures it's not a table itself

# ==========================================
# 🌍 2. UNIVERSAL PAYMENT TRANSACTION
# ==========================================
class ProjectTag(models.TextChoices):
    TEXTILE_ERP = 'TEXTILE_ERP', 'Textile ERP System'
    ROYAL_EDUCATION = 'ROYAL_EDUCATION', 'Royal Education Institute'
    SOCIAL_APP = 'SOCIAL_APP', 'Social Networking Site'
    OTHER = 'OTHER', 'Other Projects'

class Transaction(BaseModel): # 🌟 Inheriting Timing from BaseModel
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]

    # 🆔 Unique Tracking
    transaction_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    # 🏢 Project & User Context
    project = models.CharField(
        max_length=50, 
        choices=ProjectTag.choices, 
        default=ProjectTag.TEXTILE_ERP
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='payments'
    )
    
    # 💰 Money Details
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    
    # 💳 Razorpay Specific Fields
    razorpay_order_id = models.CharField(max_length=255, unique=True)
    razorpay_payment_id = models.CharField(max_length=255, null=True, blank=True)
    razorpay_signature = models.CharField(max_length=500, null=True, blank=True)
    
    # 📊 Status & Remarks
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    remarks = models.TextField(null=True, blank=True) 

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.project} - {self.amount} - {self.status}"