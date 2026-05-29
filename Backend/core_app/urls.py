from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter

# ── CORE IMPORTS ─────────────────────────────────────────────────────────────
from .auth_views import (
    UniversalRegisterView, 
    UniversalLoginView, 
    UserProfileView,
    VerifyEmailView, 
    RequestPasswordResetEmail, 
    PasswordResetComplete 
)
from .role_views import CustomRoleView, StaffView, StaffDetailView, AuditLogView
from .settings_views import SettingsSchemaView
from .ai_views import UniversalAIChatView
from .finance_views import UniversalPaymentView

from .views import DashboardAnalyticsView # Make sure this is imported

# ── SAMAJ IMPORTS ────────────────────────────────────────────────────────────
from .samaj_profile_views import SamajProfileViewSet
from .samaj_media_views import FamilyAlbumViewSet
from .samaj_committee_views import SamajCommitteeViewSet
from .tree_views import SamajFamilyTreeView
from .samaj_csv_views import SamajCSVExportView, SamajCSVImportView  
from .views import GotraViewSet  

# 🌟 SAMAJ VIEWSET ROUTER
samaj_router = DefaultRouter()
samaj_router.register(r'profiles', SamajProfileViewSet, basename='samaj-profile')
samaj_router.register(r'albums', FamilyAlbumViewSet, basename='samaj-album')
samaj_router.register(r'committees', SamajCommitteeViewSet, basename='samaj-committee')
samaj_router.register(r'gotras', GotraViewSet, basename='samaj-gotra')

# ═════════════════════════════════════════════════════════════════════════════
# URL PATTERNS
# ═════════════════════════════════════════════════════════════════════════════
urlpatterns = [
    # 🔐 AUTH & SECURITY
    path('auth/register/', UniversalRegisterView.as_view(), name='api-register'),
    path('auth/login/', UniversalLoginView.as_view(), name='api-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='api-refresh'),
    path('auth/profile/', UserProfileView.as_view(), name='api-profile'),
    path('auth/verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('auth/password-reset/', RequestPasswordResetEmail.as_view(), name='password-reset'),
    path('auth/password-reset-complete/', PasswordResetComplete.as_view(), name='password-reset-complete'),
    
    # 👥 ROLES & STAFF
    path('roles/', CustomRoleView.as_view(), name='api-roles'),
    path('staff/', StaffView.as_view(), name='api-staff-list'),
    path('staff/<int:pk>/', StaffDetailView.as_view(), name='api-staff-detail'),
    path('audit-logs/', AuditLogView.as_view(), name='api-logs'),
    
    # ⚙️ SETTINGS & SYSTEM TOOLS
    path('settings/schema/', SettingsSchemaView.as_view(), name='api-settings-schema'),
    path('ai-chat/', UniversalAIChatView.as_view(), name='api-ai-chat'),
    path('payments/', UniversalPaymentView.as_view(), name='api-payments'),

    # 🏛️ SAMAJ ADVANCED MODULES
    # 1. ViewSets (Profiles, Albums, Committees, Gotras)
    path('samaj/', include(samaj_router.urls)),
    
    # 🌟 NEW: Dashboard Stats API (Moved here with samaj/ prefix)
    path('samaj/dashboard-stats/', DashboardAnalyticsView.as_view(), name='samaj-dashboard-stats'),
    
    # 2. Family Tree
    path('samaj/tree/<int:profile_id>/', SamajFamilyTreeView.as_view(), name='api-family-tree'),

    # 3. CSV Import / Export
    path('samaj/csv/export/', SamajCSVExportView.as_view(), name='samaj-csv-export'),
    path('samaj/csv/import/', SamajCSVImportView.as_view(), name='samaj-csv-import'),
]