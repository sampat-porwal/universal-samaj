from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter

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
from .views import HealthCheckView

# 🌟 NEW: IMPORT SAMAJ VIEWS
from .samaj_profile_views import SamajProfileViewSet
from .samaj_media_views import FamilyAlbumViewSet
from .samaj_committee_views import SamajCommitteeViewSet

from .tree_views import SamajFamilyTreeView

# 🌟 NEW: CREATE ROUTER FOR SAMAJ VIEWSETS
router = DefaultRouter()
router.register(r'profiles', SamajProfileViewSet, basename='samaj-profile')
router.register(r'albums', FamilyAlbumViewSet, basename='samaj-album')
router.register(r'committees', SamajCommitteeViewSet, basename='samaj-committee')

urlpatterns = [
    # 🟢 HEALTH CHECK
    path('health/', HealthCheckView.as_view(), name='api-health'),

    # 🔐 AUTH & SECURITY
    path('auth/register/', UniversalRegisterView.as_view(), name='api-register'),
    path('auth/login/', UniversalLoginView.as_view(), name='api-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='api-refresh'),
    path('auth/profile/', UserProfileView.as_view(), name='api-profile'),
    
    # 📧 EMAIL VERIFICATION & PASSWORD RESET
    path('auth/verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('auth/password-reset/', RequestPasswordResetEmail.as_view(), name='password-reset'),
    path('auth/password-reset-complete/', PasswordResetComplete.as_view(), name='password-reset-complete'),
    
    # 👥 ROLES & STAFF
    path('roles/', CustomRoleView.as_view(), name='api-roles'),
    path('staff/', StaffView.as_view(), name='api-staff-list'),
    path('staff/<int:pk>/', StaffDetailView.as_view(), name='api-staff-detail'),
    path('audit-logs/', AuditLogView.as_view(), name='api-logs'),
    
    # ⚙️ SETTINGS
    path('settings/schema/', SettingsSchemaView.as_view(), name='api-settings-schema'),
    
    # 🤖 AI & FINANCES
    path('ai-chat/', UniversalAIChatView.as_view(), name='api-ai-chat'),
    path('payments/', UniversalPaymentView.as_view(), name='api-payments'),

    # 🏛️ SAMAJ ADVANCED MODULES (Grouped neatly under /samaj/...)
    path('samaj/', include(router.urls)),

    # Under the urlpatterns list add:
    path('samaj/tree/<int:profile_id>/', SamajFamilyTreeView.as_view(), name='api-family-tree'),
]


# from django.urls import path
# from rest_framework_simplejwt.views import TokenRefreshView

# from .auth_views import (
#     UniversalRegisterView, 
#     UniversalLoginView, 
#     UserProfileView,
#     VerifyEmailView, # 🌟 NEW
#     RequestPasswordResetEmail, # 🌟 NEW
#     PasswordResetComplete # 🌟 NEW
# )
# from .role_views import CustomRoleView, StaffView, StaffDetailView, AuditLogView
# from .settings_views import SettingsSchemaView
# from .ai_views import UniversalAIChatView
# from .finance_views import UniversalPaymentView

# urlpatterns = [
#     # 🔐 AUTH & SECURITY
#     path('auth/register/', UniversalRegisterView.as_view(), name='api-register'),
#     path('auth/login/', UniversalLoginView.as_view(), name='api-login'),
#     path('auth/refresh/', TokenRefreshView.as_view(), name='api-refresh'),
#     path('auth/profile/', UserProfileView.as_view(), name='api-profile'),
    
#     # 📧 EMAIL VERIFICATION & PASSWORD RESET
#     path('auth/verify-email/', VerifyEmailView.as_view(), name='verify-email'),
#     path('auth/password-reset/', RequestPasswordResetEmail.as_view(), name='password-reset'),
#     path('auth/password-reset-complete/', PasswordResetComplete.as_view(), name='password-reset-complete'),
    
#     # 👥 ROLES & STAFF
#     path('roles/', CustomRoleView.as_view(), name='api-roles'),
#     path('staff/', StaffView.as_view(), name='api-staff-list'),
#     path('staff/<int:pk>/', StaffDetailView.as_view(), name='api-staff-detail'),
#     path('audit-logs/', AuditLogView.as_view(), name='api-logs'),
    
#     # ⚙️ SETTINGS
#     path('settings/schema/', SettingsSchemaView.as_view(), name='api-settings-schema'),
    
#     # 🤖 AI & FINANCES
#     path('ai-chat/', UniversalAIChatView.as_view(), name='api-ai-chat'),
#     path('payments/', UniversalPaymentView.as_view(), name='api-payments'),
    
# ]