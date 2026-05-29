from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.crypto import get_random_string
from django.conf import settings
from django.core.exceptions import ValidationError

# 🌟 IMPORT YOUR BACKEND VALIDATORS (From your Universal Template)
from .validators import validate_mobile_number, validate_aadhaar_number, validate_alpha_only

# ==========================================
# 1. UNIVERSAL ROLE & PERMISSION SYSTEM
# ==========================================
class CustomRole(models.Model):
    name = models.CharField(max_length=50, unique=True)
    permissions = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

# ==========================================
# 2. UNIVERSAL USER MODEL (Core Identity)
# ==========================================
class CustomUser(AbstractUser):
    # 🌟 UPDATED: PERFECT 7-LEVEL ARCHITECTURE ROLES + ERP STAFF
    ROLE_CHOICES = (
        ('SUPERADMIN', 'System Owner (IT Admin)'),      # Access All
        ('ADMIN', 'Admin'),                             # Access all except create admin
        ('CORE_ADMIN', 'Core Admin (Samaj Leader)'),    # Can promote Core Members & Bulk Import
        ('CORE_MEMBER', 'Core Member (Verifier)'),      # Can verify & Bulk Import
        ('EVENT_ADMIN', 'Event Admin'),                 # Manage events
        ('EVENT_USER', 'Event User'),                   # Ground level event worker
        ('USER', 'Simple User'),                        # Normal Samaj Member
        ('STAFF', 'ERP Staff'),                         # For your existing ERP software
    )
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='USER')
    custom_role = models.ForeignKey(CustomRole, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')

    # Hindi Name Support (Dono bhasha ek saath dikhane ke liye)
    first_name_hi = models.CharField(max_length=150, blank=True, null=True)
    last_name_hi = models.CharField(max_length=150, blank=True, null=True)

    mobile_no = models.CharField(max_length=15, blank=True, null=True, validators=[validate_mobile_number])
    email = models.EmailField(blank=True, null=True)
    aadhaar_no = models.CharField(max_length=20, blank=True, null=True, validators=[validate_aadhaar_number])

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['first_name', 'last_name', 'mobile_no', 'aadhaar_no'],
                name='unique_person_combination'
            )
        ]

    def save(self, *args, **kwargs):
        # Auto-generate unique username for login fallback
        if not self.username:
            first_part = self.first_name.upper().replace(" ", "") if self.first_name else "USER"
            random_part = get_random_string(length=4, allowed_chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
            self.username = f"{first_part}-{random_part}"
        
        if self.email:
            self.email = self.email.lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} / {self.first_name_hi} ({self.username})"

# ==========================================
# 3. UNIVERSAL AUDIT LOGS
# ==========================================
class AuditLog(models.Model):
    ACTION_CHOICES = (('CREATE', 'Create'), ('UPDATE', 'Update'), ('DELETE', 'Delete'), ('LOGIN', 'Login'))
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    module = models.CharField(max_length=100)
    details = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.timestamp}] {self.user} {self.action} {self.module}"

# ==========================================
# 4. ABSTRACT BASE FOR LOG MANAGEMENT
# ==========================================
class SamajBaseModel(models.Model):
    """Common fields for all Samaj tables to ensure strict audit trails"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="%(class)s_created")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="%(class)s_updated")

    class Meta:
        abstract = True

# ==========================================
# 5. SAMAJ PROFILE (Advanced Community Logic)
# ==========================================
class SamajProfile(SamajBaseModel):
    GENDER_CHOICES = (('M', 'Male'), ('F', 'Female'), ('O', 'Other'))

    # 🌟 NEW: EMPLOYMENT TYPES (Govt, Private, Business)
    EMPLOYMENT_CHOICES = (
        ('GOVT', 'Government Job'),
        ('PRIVATE', 'Private Job'),
        ('BUSINESS', 'Business / Entrepreneur'),
        ('SELF', 'Self Employed / Professional'),
        ('OTHER', 'Other / Retired / Student')
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='samaj_profile')
    
    # Community & Identity (Hindi/English Side-by-side)
    samaj_id = models.CharField(max_length=50, unique=True)
    gotra_en = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    gotra_hi = models.CharField(max_length=100, blank=True, null=True)
    village_en = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    village_hi = models.CharField(max_length=100, blank=True, null=True)
    
    dob = models.DateField(null=True, blank=True, db_index=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='M')
    
    # 🌟 NEW: Fast Search Direct Field (Blood Group)
    blood_group = models.CharField(max_length=5, blank=True, null=True, db_index=True)
    
    # Media: Self Image
    profile_image = models.ImageField(upload_to='samaj_profiles/', null=True, blank=True)

    # Extended Contacts
    mobile_2 = models.CharField(max_length=15, blank=True, null=True, validators=[validate_mobile_number])
    mobile_3 = models.CharField(max_length=15, blank=True, null=True, validators=[validate_mobile_number])
    address_1 = models.TextField(blank=True, null=True)
    address_2 = models.TextField(blank=True, null=True)
    address_3 = models.TextField(blank=True, null=True)
    
    # 🌟 UPGRADED: Career & Business Management
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_CHOICES, default='OTHER', db_index=True)
    occupation_en = models.CharField(max_length=255, blank=True, null=True, help_text="Designation or Profession")
    occupation_hi = models.CharField(max_length=255, blank=True, null=True)
    business_name = models.CharField(max_length=255, blank=True, null=True, help_text="Company or Business Name", db_index=True)
    work_address = models.TextField(blank=True, null=True, help_text="Office or Shop Address")
    education = models.CharField(max_length=255, blank=True, null=True)
    
    # 🌟 NEW: Unlimited Custom Attributes (JSON Field)
    extra_details = models.JSONField(default=dict, blank=True, help_text="Store unlimited custom attributes like Hobbies, Social Links, etc.")

    # Status & Security Verification
    # is_alive = models.BooleanField(default=True)



    MARITAL_STATUS_CHOICES = (
        ('UNMARRIED',     'Unmarried / अविवाहित'),
        ('MARRIED',       'Married / विवाहित'),
        ('WIDOW_WIDOWER', 'Widow/Widower / विधवा/विधुर'),       # Merged spouse died
        ('DIVORCED',      'Divorced / तलाकशुदा'),
        ('SEPARATED',     'Separated / अलग'),
        ('REMARRIED',     'Remarried / पुनर्विवाहित'),
    )
 
    # ── Alive / Dead ──────────────────────────────────────────────
    is_alive = models.BooleanField(default=True, db_index=True)
    death_date = models.DateField(
        null=True, blank=True,
        help_text="Date of death (if not alive)"
    )
    death_reason = models.CharField(
        max_length=255, blank=True, null=True,
        help_text="Brief reason or cause of death (optional)"
    )
 
    # ── Marital Status ────────────────────────────────────────────
    marital_status = models.CharField(
        max_length=20,
        choices=MARITAL_STATUS_CHOICES,
        default='UNMARRIED',
        help_text="Current marital status — important for matrimonial matching",
        db_index=True
    )
    marriage_date = models.DateField(
        null=True, blank=True,
        help_text="Marriage date (for anniversary reminders)"
    )



    verification_status = models.CharField(max_length=20, choices=(('PENDING', 'Pending'), ('VERIFIED', 'Verified'), ('REJECTED', 'Rejected')), default='PENDING', db_index=True)
    
    # Existing core member flag
    is_core_member = models.BooleanField(default=False, help_text="Can verify other pending members")

    # TRACK BULK VS SELF IMPORT
    REG_SOURCE_CHOICES = (
        ('SELF', 'Self Registered'),
        ('BULK', 'Bulk Import by Admin'),
    )
    registration_source = models.CharField(max_length=10, choices=REG_SOURCE_CHOICES, default='SELF')

    # Relationship Caching (Hindi & English both stored here for Next.js speed)
    family_summary = models.JSONField(default=dict, blank=True)

    # Recursive Family Tree
    father = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='child_f')
    mother = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='child_m')
    spouses = models.ManyToManyField('self', blank=True)

    def __str__(self):
        return f"{self.user.first_name} - {self.samaj_id}"

# ==========================================
# 6. LIMITED ALBUM SYSTEM (Media Guards)
# ==========================================
class FamilyAlbum(SamajBaseModel):
    profile = models.ForeignKey(SamajProfile, on_delete=models.CASCADE, related_name='albums')
    name_en = models.CharField(max_length=100)
    name_hi = models.CharField(max_length=100, blank=True)

    def clean(self):
        # 🛡️ Business Logic: Max 3 Albums per profile
        if not self.pk and FamilyAlbum.objects.filter(profile=self.profile).count() >= 3:
            raise ValidationError("Aap sirf 3 family albums bana sakte hain.")

    def __str__(self):
        return self.name_en

class AlbumImage(SamajBaseModel):
    album = models.ForeignKey(FamilyAlbum, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='samaj_albums/')

    def clean(self):
        # 🛡️ Business Logic: Max 10 Photos per Album
        if not self.pk and AlbumImage.objects.filter(album=self.album).count() >= 10:
            raise ValidationError("Ek album mein maximum 10 photos ho sakti hain.")

# ==========================================
# 7. COMMITTEE, CHAT & ACTIVITY POOL
# ==========================================
class SamajCommittee(SamajBaseModel):
    name_en = models.CharField(max_length=255)
    name_hi = models.CharField(max_length=255, blank=True)
    purpose = models.CharField(max_length=255, blank=True)
    members = models.ManyToManyField(SamajProfile, related_name='committees')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name_en

class CommitteeMessage(SamajBaseModel):
    committee = models.ForeignKey(SamajCommittee, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(SamajProfile, on_delete=models.CASCADE)
    message = models.TextField()
    is_task = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False)

class ActivityTag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    def __str__(self): return self.name

class ActivityRegistration(SamajBaseModel):
    profile = models.ForeignKey(SamajProfile, on_delete=models.CASCADE)
    activity = models.ForeignKey(ActivityTag, on_delete=models.CASCADE)
    is_assigned_to_team = models.BooleanField(default=False)
    team_name = models.CharField(max_length=255, blank=True, null=True)
    
    class Meta:
        constraints = [models.UniqueConstraint(fields=['profile', 'activity'], name='unique_act_reg')]


# ==========================================
# 8. VERIFICATION QUORUM (The 5-Vote System)
# ==========================================
class VerificationVote(SamajBaseModel):
    """Tracks which Core Member verified which Pending Profile"""
    core_member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='votes_given')
    pending_profile = models.ForeignKey(SamajProfile, on_delete=models.CASCADE, related_name='votes_received')

    class Meta:
        constraints = [
            # 🛡️ Prevent duplicate voting: Ek core member ek profile ko sirf 1 baar vote de sakta hai
            models.UniqueConstraint(fields=['core_member', 'pending_profile'], name='unique_verification_vote')
        ]

    def __str__(self):
        return f"{self.core_member.username} verified {self.pending_profile.samaj_id}"
    

# ==========================================
# 9. FAMILY RELATIONSHIP REQUESTS (The Social Graph)
# ==========================================
class FamilyLinkRequest(SamajBaseModel):
    """Tracks Relationship requests between two Samaj Profiles before they become official"""
    RELATION_CHOICES = (
        ('FATHER', 'Father'),
        ('MOTHER', 'Mother'),
        ('HUSBAND', 'Husband'),
        ('WIFE', 'Wife'),
        ('SON', 'Son'),
        ('DAUGHTER', 'Daughter'),
    )
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
    )
    
    sender = models.ForeignKey(SamajProfile, on_delete=models.CASCADE, related_name='sent_family_requests')
    receiver = models.ForeignKey(SamajProfile, on_delete=models.CASCADE, related_name='received_family_requests')
    relation_type = models.CharField(max_length=20, choices=RELATION_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    class Meta:
        constraints = [
            # 🛡️ Ek user dusre ko sirf ek hi active request bhej sakta hai
            models.UniqueConstraint(fields=['sender', 'receiver', 'status'], name='unique_family_link_request')
        ]

    def __str__(self):
        return f"{self.sender.user.first_name} requested {self.receiver.user.first_name} as {self.relation_type} ({self.status})"
    

class Gotra(models.Model):
    name_en = models.CharField(max_length=100, unique=True)
    name_hi = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.name_en