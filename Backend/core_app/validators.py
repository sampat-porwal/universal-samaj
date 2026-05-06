import re
from django.core.exceptions import ValidationError

def validate_mobile_number(value):
    if not value:
        return
    # Indian Mobile: Starts with 6-9, exactly 10 digits
    if not re.match(r'^[6-9]\d{9}$', str(value)):
        raise ValidationError('Please enter a valid 10-digit mobile number.')

def validate_aadhaar_number(value):
    if not value:
        return
    # Aadhaar: Exactly 12 digits, no letters or spaces
    clean_value = str(value).replace(" ", "")
    if not re.match(r'^\d{12}$', clean_value):
        raise ValidationError('Government ID/Aadhaar must be exactly 12 digits.')

def validate_alpha_only(value):
    if not value:
        return
    # Names: Only letters and spaces allowed
    if not re.match(r'^[A-Za-z\s]+$', str(value)):
        raise ValidationError('This field must contain only letters and spaces.')