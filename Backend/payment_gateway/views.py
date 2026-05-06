import razorpay
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

# 🌟 Import your Transaction model and the Universal Logger
from .models import Transaction 
from core_app.role_views import log_activity 

# 🔑 Razorpay Client Setup
client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

class CreatePaymentOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            data = request.data
            amount = data.get('amount') # Amount in INR (e.g. 1999)
            project_tag = data.get('project_tag', 'UNIVERSAL_TEMPLATE') # Generic Tag
            remarks = data.get('remarks', 'Premium Upgrade')

            if not amount:
                return Response({"error": "Amount is required"}, status=status.HTTP_400_BAD_REQUEST)

            # 1. Razorpay Order Create (Amount in paise)
            razorpay_order = client.order.create({
                "amount": int(float(amount) * 100),
                "currency": "INR",
                "payment_capture": "1" # Auto capture
            })

            # 2. Universal Transaction Database Entry
            transaction = Transaction.objects.create(
                user=request.user,
                project=project_tag,
                amount=amount,
                razorpay_order_id=razorpay_order['id'],
                remarks=remarks,
                status='PENDING'
            )

            # 3. Send data to Next.js Frontend
            return Response({
                "order_id": razorpay_order['id'],
                "amount": amount,
                "currency": "INR",
                "key_id": settings.RAZORPAY_KEY_ID,
                "transaction_uuid": str(transaction.id), # Internal tracking ID
                "company_name": "Universal System", # 🌟 Generic Name
                "description": remarks
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            razorpay_order_id = request.data.get('razorpay_order_id')
            razorpay_payment_id = request.data.get('razorpay_payment_id')
            razorpay_signature = request.data.get('razorpay_signature')

            # 1. Verify Signature (Security Check)
            params_dict = {
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            }
            
            # Razorpay library verifies the cryptographic signature
            client.utility.verify_payment_signature(params_dict)

            # 2. Update Transaction Status
            transaction = Transaction.objects.get(razorpay_order_id=razorpay_order_id)
            transaction.status = 'SUCCESS'
            transaction.razorpay_payment_id = razorpay_payment_id
            transaction.razorpay_signature = razorpay_signature
            transaction.save()

            # 3. 🌟 UNIVERSAL LOGIC: Log the successful payment!
            # You can easily add logic here later if you add subscription models back!
            log_activity(request.user, 'UPDATE', 'Payment', f"Payment of ₹{transaction.amount} verified successfully. Order ID: {razorpay_order_id}")

            return Response({"status": "Payment Verified Successfully!"}, status=status.HTTP_200_OK)

        except razorpay.errors.SignatureVerificationError:
            return Response({"error": "Payment verification failed: Invalid Signature!"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Verification error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)