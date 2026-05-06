from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .role_views import log_activity

# Temporary Template Storage (In production, replace with a UniversalTransaction Model)
# Structure: { id, date, name, payment_type (IN/OUT), amount, mode, remarks }
TEMPLATE_TRANSACTIONS = []

class UniversalPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(TEMPLATE_TRANSACTIONS[::-1], status=status.HTTP_200_OK)

    def post(self, request):
        # 🌟 Check if user has permission to record finances
        user_perms = getattr(request.user, 'custom_role', None)
        has_perm = request.user.is_superuser or getattr(request.user, 'role', '') in ['SUPERADMIN', 'COMPANY_ADMIN']
        if not has_perm and user_perms and 'manage_finances' not in user_perms.permissions:
            return Response({"error": "Permission Denied"}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        amount = float(data.get('amount', 0))
        if amount <= 0: 
            return Response({"error": "Amount must be greater than zero"}, status=status.HTTP_400_BAD_REQUEST)

        import datetime
        new_txn = {
            "id": len(TEMPLATE_TRANSACTIONS) + 1,
            "date": datetime.date.today().strftime('%Y-%m-%d'),
            "party_name": data.get('party_name', 'Unknown'),
            "payment_type": data.get('payment_type', 'IN'),
            "amount": amount,
            "payment_mode": data.get('payment_mode', 'Cash'),
            "remarks": data.get('remarks', '')
        }
        TEMPLATE_TRANSACTIONS.append(new_txn)
        
        action_word = 'Receipt' if new_txn['payment_type'] == 'IN' else 'Payment'
        log_activity(request.user, 'CREATE', 'Finance', f"Recorded {action_word} of ₹{amount} for {new_txn['party_name']}")
        
        return Response({"message": "Transaction Recorded!"}, status=status.HTTP_201_CREATED)