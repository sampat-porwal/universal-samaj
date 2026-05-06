import os
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import get_user_model

from google import genai
from google.genai import types

from .models import AuditLog
from .role_views import log_activity
from .finance_views import TEMPLATE_TRANSACTIONS # Linking to our cashbook

User = get_user_model()

# ===================================================================
# 🤖 THE ACTION AGENTS (TEMPLATE EDITION)
# ===================================================================
def get_agent_tools(user):
    
    # 1. SYSTEM AGENT: Fetch Audit Logs
    def get_recent_logs(limit: int = 5) -> str:
        """Fetches the most recent system activities and audit logs. Use this when the user asks what happened recently."""
        try:
            logs = AuditLog.objects.all().order_by('-timestamp')[:limit]
            data = [{"Action": log.action, "Module": log.module, "Details": log.details, "User": log.user.username if log.user else "System"} for log in logs]
            return f"SYSTEM LOGS: {json.dumps(data)}. IMPORTANT: Present this clearly to the user."
        except Exception as e:
            return f"ERROR: {str(e)}"

    # 2. USER AGENT: Get Staff Stats
    def get_user_stats() -> str:
        """Fetches the total number of registered users and staff in the system."""
        try:
            total = User.objects.count()
            return f"SUCCESS: There are currently {total} registered users in the system."
        except Exception as e:
            return f"ERROR: {str(e)}"

    # 3. FINANCE AGENT: Record a Payment
    def record_payment(party_name: str, amount: float, payment_type: str = "IN") -> str:
        """Records money received (IN) or money paid (OUT) to the cashbook ledger."""
        if float(amount) <= 0:
            return "ERROR: Amount must be greater than zero."
            
        try:
            import datetime
            new_txn = {
                "id": len(TEMPLATE_TRANSACTIONS) + 1,
                "date": datetime.date.today().strftime('%Y-%m-%d'),
                "party_name": party_name.title(),
                "payment_type": payment_type.upper(),
                "amount": float(amount),
                "payment_mode": "AI Assistant",
                "remarks": "Auto-recorded by AI"
            }
            TEMPLATE_TRANSACTIONS.append(new_txn)
            
            # Log the action
            log_activity(user, 'CREATE', 'Finance_AI', f"AI recorded {payment_type} of ₹{amount} for {party_name}")
            return f"SUCCESS: Recorded {payment_type} transaction of ₹{amount} for {party_name}."
        except Exception as e:
            return f"ERROR: Failed to record payment: {str(e)}"

    return [get_recent_logs, get_user_stats, record_payment]

# ===================================================================
# 🧠 THE MAIN AI CHAT ENGINE
# ===================================================================
class UniversalAIChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            user_message = request.data.get('message', '').strip()
            raw_history = request.data.get('history', [])
            
            if not user_message:
                return Response({"error": "Message is empty"}, status=status.HTTP_400_BAD_REQUEST)

            api_key = os.environ.get("GEMINI_API_KEY") 
            if not api_key:
                 return Response({"reply": "AI is offline. Please check GEMINI_API_KEY in Django .env"}, status=status.HTTP_200_OK)
                
            client = genai.Client(api_key=api_key)
            ai_tools = get_agent_tools(request.user)
            
            system_prompt = f"""
            You are the 'Universal System AI', an enterprise ERP assistant.
            The current user is: {request.user.username}

            CRITICAL RULES:
            1. You can answer general questions, but you also have TOOLS to read logs, check users, and record payments.
            2. If the user asks you to "record a payment of 500 from Rahul", use the `record_payment` tool.
            3. Always format your responses cleanly. Do not use complex markdown tables, use bullet points or simple text.
            """

            history_contents = []
            for msg in raw_history:
                role = 'user' if msg['role'] == 'user' else 'model'
                history_contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg['content'])]))

            chat = client.chats.create(
                model="gemini-2.5-flash",
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    tools=ai_tools, 
                ),
                history=history_contents
            )
            
            response = chat.send_message(user_message)
            log_activity(request.user, 'CREATE', 'AI_Chat', f"User chatted with AI.")

            return Response({"reply": response.text}, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": "Failed to connect to AI Engine."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)