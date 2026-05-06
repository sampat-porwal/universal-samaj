from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .role_views import log_activity

# Temporary Template Storage (In production, link this to your database model)
TEMPLATE_SCHEMA = {
    "product_schema": [{"name": "category", "label": "Category", "type": "text"}],
    "menu_items": ["Parties (CRM)", "Inventory", "Products", "Orders", "Production", "Suppliers"]
}

class SettingsSchemaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(TEMPLATE_SCHEMA, status=status.HTTP_200_OK)

    def put(self, request):
        # 🌟 Protect this route: Only Admins can modify the schema
        if not request.user.is_superuser and not getattr(request.user, 'role', '') in ['SUPERADMIN', 'ADMIN', 'COMPANY_ADMIN']:
            return Response({"error": "Permission Denied"}, status=status.HTTP_403_FORBIDDEN)
        
        TEMPLATE_SCHEMA['product_schema'] = request.data.get('product_schema', [])
        TEMPLATE_SCHEMA['menu_items'] = request.data.get('menu_items', [])
        
        log_activity(request.user, 'UPDATE', 'Settings', "Updated system schemas and menus.")
        
        return Response({"message": "Settings updated successfully!"}, status=status.HTTP_200_OK)