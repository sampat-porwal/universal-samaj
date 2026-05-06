from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    CustomUser, CustomRole, AuditLog, SamajProfile, 
    FamilyAlbum, AlbumImage, SamajCommittee, CommitteeMessage, 
    ActivityTag, ActivityRegistration
)

# ==========================================
# 🎨 Admin Panel UI Header Change (Preserved)
# ==========================================
admin.site.site_header = "Universal System - SuperAdmin Panel"
admin.site.site_title = "Universal Auth Portal"
admin.site.index_title = "Welcome to Central Management System"

# ==========================================
# 🛡️ CUSTOM ROLE ADMIN (Preserved)
# ==========================================
@admin.register(CustomRole)
class CustomRoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)

# ==========================================
# 👤 USER ADMIN (Enhanced for Hindi Fields)
# ==========================================
@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    # 🛠️ ADDED: "Regional Identity" section for Hindi names
    fieldsets = UserAdmin.fieldsets + (
        ('Regional Identity (Hindi)', {
            'fields': ('first_name_hi', 'last_name_hi')
        }),
        ('Universal Identity & Roles', {
            'fields': ('role', 'custom_role', 'mobile_no', 'aadhaar_no')
        }),
    )
    
    list_display = ('username', 'first_name', 'first_name_hi', 'mobile_no', 'role', 'is_active')
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email', 'mobile_no', 'aadhaar_no', 'first_name', 'first_name_hi')
    autocomplete_fields = ['custom_role']

# ==========================================
# 🕵️‍♂️ AUDIT LOGS ADMIN (Preserved - Read Only)
# ==========================================
@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'module', 'timestamp')
    list_filter = ('action', 'module', 'timestamp')
    search_fields = ('user__username', 'user__first_name', 'details')
    
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False

# ==========================================
# 🏛️ SAMAJ PROFILE ADMIN (New)
# ==========================================
@admin.register(SamajProfile)
class SamajProfileAdmin(admin.ModelAdmin):
    list_display = ('samaj_id', 'user', 'gender', 'village_en', 'verification_status')
    search_fields = ('samaj_id', 'user__first_name', 'user__first_name_hi', 'mobile_2')
    list_filter = ('verification_status', 'gender', 'village_en')
    # Use raw_id_fields for large datasets to prevent browser lag when selecting parents/spouse
    raw_id_fields = ('user', 'father', 'mother', 'spouse')

# ==========================================
# 📸 ALBUMS & COMMITTEES ADMIN (New)
# ==========================================
class AlbumImageInline(admin.TabularInline):
    """Allows adding images directly from the Album screen"""
    model = AlbumImage
    extra = 1

@admin.register(FamilyAlbum)
class FamilyAlbumAdmin(admin.ModelAdmin):
    list_display = ('name_en', 'profile', 'created_at')
    search_fields = ('name_en', 'name_hi', 'profile__samaj_id')
    inlines = [AlbumImageInline]

@admin.register(SamajCommittee)
class SamajCommitteeAdmin(admin.ModelAdmin):
    list_display = ('name_en', 'purpose', 'is_active')
    search_fields = ('name_en', 'purpose')
    filter_horizontal = ('members',) # Makes a nice dual-box UI for adding multiple members

# Register remaining simple models
admin.site.register(ActivityTag)
admin.site.register(ActivityRegistration)
admin.site.register(CommitteeMessage)