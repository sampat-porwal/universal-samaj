from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .models import AuditLog

User = get_user_model()

class AuditLogView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['SUPERADMIN', 'ADMIN']:
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

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        total_users = User.objects.count()
        recent_logins = User.objects.filter(is_active=True).count()

        return Response({
            "total_users": total_users,
            "active_users": recent_logins,
            "system_health": "100%",
            # Zeroes to prevent frontend crashes from old ERP code
            "total_sales": 0, "client_pending": 0, "net_profit": 0, "total_expenses": 0
        })

class DashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        empty_chart = [
            {"name": "Jan", "sales": 0, "purchases": 0},
            {"name": "Feb", "sales": 0, "purchases": 0},
        ]
        return Response({
            "stats": {"total_sales": 0, "profit_estimate": 0},
            "chartData": empty_chart,
            "recent_transactions": []
        })