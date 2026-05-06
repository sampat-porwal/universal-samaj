from django.db import IntegrityError, transaction
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .role_views import log_activity
from .models import SamajProfile 

User = get_user_model()

class UniversalLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        login_id = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not login_id or not password:
            return Response({"detail": "Please provide both ID and password."}, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(Q(username=login_id) | Q(email__iexact=login_id) | Q(mobile_no=login_id))
        valid_users = [u for u in users if u.check_password(password)]

        if not valid_users:
            return Response({"detail": "Invalid login credentials. Please try again."}, status=status.HTTP_401_UNAUTHORIZED)

        user = valid_users[0]
        if not user.is_active:
            return Response({"detail": "Your email is not verified. Please check your inbox."}, status=status.HTTP_403_FORBIDDEN)

        if len(valid_users) == 1:
            refresh = RefreshToken.for_user(user)
            log_activity(user, 'LOGIN', 'Auth', "User logged in successfully.")
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'username': user.username, 
                    'name': user.first_name,
                    'role': user.role  
                }
            }, status=status.HTTP_200_OK)

        profiles = [{"username": u.username, "name": f"{u.first_name} {u.last_name}".strip()} for u in valid_users]
        return Response({"status": "MULTIPLE_PROFILES", "message": "Shared account detected.", "profiles": profiles}, status=status.HTTP_200_OK)


class UniversalRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        try:
            with transaction.atomic():
                email = data.get('email', '').strip().lower()
                
                if User.objects.filter(email=email).exists():
                    return Response({"error": "Registration failed. Profile with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)

                # 1. CREATE CORE IDENTITY
                user = User(
                    first_name=data.get('first_name', '').strip(),
                    last_name=data.get('last_name', '').strip(),
                    first_name_hi=data.get('first_name_hi', '').strip(), 
                    last_name_hi=data.get('last_name_hi', '').strip(),   
                    mobile_no=data.get('mobile_no', '').strip(),
                    email=email,
                    aadhaar_no=data.get('aadhaar_no', '').strip(),
                    role='USER' 
                )
                user.set_password(data.get('password'))
                user.is_active = False 
                user.save() 
                
                # 2. CREATE SAMAJ PROFILE
                SamajProfile.objects.create(
                    user=user,
                    samaj_id=data.get('samaj_id') or user.username, 
                    village_en=data.get('village_en', '').strip(),
                    village_hi=data.get('village_hi', '').strip(),
                    gotra_en=data.get('gotra_en', '').strip(),
                    gotra_hi=data.get('gotra_hi', '').strip(),
                    gender=data.get('gender', 'M'),
                    verification_status='PENDING' 
                )
                
                uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
                verify_link = f"{frontend_url}/verify-email?uid={uidb64}&token={token}"

            try:
                send_mail(
                    subject='Verify Your Account', 
                    message=f"Hello {user.first_name},\n\nPlease verify your email to activate your account by clicking the link below:\n\n{verify_link}", 
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL'), 
                    recipient_list=[email],
                    fail_silently=False
                )
                log_activity(user, 'CREATE', 'Auth', f"New user registered: {email}. Verification email sent.")
            except Exception as email_err:
                print(f"\n{'='*60}")
                print(f"🚨 BREVO EMAIL FAILED: {email_err}")
                print(f"✅ USE THIS LINK TO VERIFY THE ACCOUNT MANUALLY:")
                print(f"{verify_link}")
                print(f"{'='*60}\n")
                log_activity(user, 'CREATE', 'Auth', f"New user registered: {email}. Email failed, verified via terminal.")

            return Response({
                "message": "Registration Successful! Check your email (or terminal) to verify your account.",
                "username": user.username
            }, status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response({"error": "Registration failed. Profile already exists or Samaj ID is duplicate."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Server Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
            
            if default_token_generator.check_token(user, token):
                user.is_active = True 
                user.save()
                log_activity(user, 'UPDATE', 'Auth', "User verified their email address.")
                return Response({'success': 'Email verified! You can now login.'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Verification link is invalid or expired.'}, status=status.HTTP_400_BAD_REQUEST)
                
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'error': 'Invalid verification link.'}, status=status.HTTP_400_BAD_REQUEST)


class RequestPasswordResetEmail(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Please provide a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
            reset_link = f"{frontend_url}/reset-password?uid={uidb64}&token={token}"
            
            try:
                send_mail(
                    subject='Reset Your Password', 
                    message=f"Hello {user.first_name},\n\nPlease use the link below to reset your password:\n\n{reset_link}\n\nIf you didn't request this, ignore this email.", 
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL'), 
                    recipient_list=[email],
                    fail_silently=False
                )
                log_activity(user, 'UPDATE', 'Auth', "Requested password reset link.")
            except Exception as email_err:
                print(f"\n{'='*60}")
                print(f"🚨 BREVO EMAIL FAILED: {email_err}")
                print(f"✅ USE THIS LINK TO RESET PASSWORD MANUALLY:")
                print(f"{reset_link}")
                print(f"{'='*60}\n")

            return Response({'success': 'If an account exists, a reset link has been sent.'}, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({'success': 'If an account exists, a reset link has been sent.'}, status=status.HTTP_200_OK)


class PasswordResetComplete(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('password', '').strip()

        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
            
            if default_token_generator.check_token(user, token):
                user.set_password(new_password)
                user.save()
                log_activity(user, 'UPDATE', 'Auth', "Successfully reset password via email link.")
                return Response({'success': 'Password reset successful. You can now login.'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
                
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'error': 'Invalid link'}, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        if user.is_superuser:
            role_name = "SUPERADMIN"
        elif hasattr(user, 'custom_role') and user.custom_role:
            role_name = user.custom_role.name
        elif hasattr(user, 'role') and user.role:
            role_name = user.role
        else:
            role_name = "USER"

        user_permissions = []
        if user.is_superuser or role_name in ['SUPERADMIN', 'COMPANY_ADMIN']:
            user_permissions = ["ALL_ACCESS"]
        elif hasattr(user, 'custom_role') and user.custom_role:
            user_permissions = user.custom_role.permissions
            
        return Response({
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "email": user.email,
            "mobile_no": user.mobile_no,  # 🌟 Added mobile_no here
            "role": role_name,
            "is_superuser": user.is_superuser,
            "permissions": user_permissions 
        }, status=status.HTTP_200_OK)

    # 🌟 NEW: PATCH method to update Core User details (Mobile No)
    def patch(self, request):
        user = request.user
        mobile_no = request.data.get('mobile_no')

        if mobile_no is not None:
            user.mobile_no = str(mobile_no).strip()
            user.save(update_fields=['mobile_no'])
            log_activity(user, 'UPDATE', 'Auth', "User updated their mobile number.")

        return Response({"message": "Core profile updated successfully"}, status=status.HTTP_200_OK)