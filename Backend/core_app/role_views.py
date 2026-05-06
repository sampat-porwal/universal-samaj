from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .models import CustomRole, AuditLog

User = get_user_model()

def log_activity(user, action, module, details):
    """ Universal Helper to record system actions """
    try:
        AuditLog.objects.create(user=user, action=action, module=module, details=details)
    except Exception as e:
        print(f"Audit Log Failed: {e}")

# ==========================================
# 🛡️ 1. DYNAMIC ROLES API 
# ==========================================
class CustomRoleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # In a universal template, superadmins see all roles
        roles = CustomRole.objects.all()
        data = [{"id": r.id, "name": r.name, "permissions": r.permissions} for r in roles]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        if request.user.is_superuser or getattr(request.user, 'role', '') in ['SUPERADMIN', 'ADMIN']:
            data = request.data
            role = CustomRole.objects.create(
                name=data.get('name'),
                permissions=data.get('permissions', [])
            )
            log_activity(request.user, 'CREATE', 'Roles', f"Created new role: {role.name}")
            return Response({"message": "Role created successfully!", "id": role.id}, status=status.HTTP_201_CREATED)
        return Response({"error": "Permission Denied"}, status=status.HTTP_403_FORBIDDEN)

# ==========================================
# 👥 2. STAFF MANAGEMENT API 
# ==========================================
class StaffView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Fetch all users except the person making the request
        staff = User.objects.exclude(id=request.user.id)
        data = [{
            "id": s.id, 
            "username": s.username, 
            "first_name": s.first_name,
            "email": s.email, 
            "role": getattr(s, 'role', 'USER'),
            "custom_role_name": s.custom_role.name if getattr(s, 'custom_role', None) else None,
            "custom_role_id": s.custom_role.id if getattr(s, 'custom_role', None) else ""
        } for s in staff]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        if not request.user.is_superuser:
            return Response({"error": "Permission Denied"}, status=status.HTTP_403_FORBIDDEN)
            
        data = request.data
        try:
            new_staff = User.objects.create_user(
                username=data.get('username', data.get('email')), 
                email=data.get('email', ''), 
                first_name=data.get('first_name', ''),
                password=data['password']
            )
            new_staff.role = data.get('role', 'USER') 
            
            if data.get('custom_role_id'):
                new_staff.custom_role_id = data.get('custom_role_id')
                
            new_staff.save()
            log_activity(request.user, 'CREATE', 'Staff', f"Created new staff member: {new_staff.username}")
            return Response({"message": "Staff created successfully!"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class StaffDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        if not request.user.is_superuser:
            return Response({"error": "Permission Denied"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            staff = User.objects.get(id=pk)
            data = request.data
            
            if 'role' in data: staff.role = data['role']
            if 'custom_role_id' in data:
                staff.custom_role_id = data['custom_role_id'] if data['custom_role_id'] else None
                
            staff.save()
            log_activity(request.user, 'UPDATE', 'Staff', f"Updated role for: {staff.username}")
            return Response({"message": "Staff updated successfully!"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not request.user.is_superuser:
            return Response({"error": "Permission Denied"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            staff = User.objects.get(id=pk)
            if staff.id == request.user.id:
                return Response({"error": "You cannot delete yourself!"}, status=status.HTTP_400_BAD_REQUEST)
            
            username = staff.username
            staff.delete()
            log_activity(request.user, 'DELETE', 'Staff', f"Deleted staff member: {username}")
            return Response({"message": "Staff deleted successfully!"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

# ==========================================
# 📝 3. AUDIT LOGS API 
# ==========================================
class AuditLogView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        logs = AuditLog.objects.all().order_by('-timestamp')[:100]
        data = [{
            "id": log.id,
            "user": log.user.username if log.user else "System",
            "action": log.action,
            "module": log.module,
            "details": log.details,
            "timestamp": log.timestamp.strftime("%Y-%m-%d %I:%M %p")
        } for log in logs]
        
        return Response(data, status=status.HTTP_200_OK)