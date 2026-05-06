import re
from django.http import JsonResponse

class SubscriptionCheckMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        
        # 🌟 EXEMPT URLs: These endpoints should always work, even if the trial is expired.
        # Example: Login, Register, Logout, and Payment Webhooks.
        self.exempt_urls = [
            re.compile(r'^/api/auth/'),   # Let them login/register
            re.compile(r'^/admin/'),      # Let superadmins work
            re.compile(r'^/api/subscription/'), # Let them fetch plans & pay
        ]

    def __call__(self, request):
        path = request.path_info

        # 1. Skip checks for exempt URLs
        if any(m.match(path) for m in self.exempt_urls):
            return self.get_response(request)

        # 2. Only block write/modify requests (POST, PUT, PATCH, DELETE)
        # We allow GET requests so they can still see their old data (Dashboard, Reports)
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            if request.user.is_authenticated:
                
                # Get the company attached to the user
                company = request.user.active_company or request.user.company

                if company and hasattr(company, 'subscription'):
                    # Call the is_valid() method you created in your model
                    if not company.subscription.is_valid():
                        
                        # 🚫 STRICT ENGLISH ERROR MESSAGE FOR THE USER
                        return JsonResponse({
                            "error": "Your free trial has expired. Please upgrade your plan to perform this action.",
                            "code": "SUBSCRIPTION_EXPIRED"
                        }, status=403)

        # 3. If everything is fine, let the request pass to the views
        response = self.get_response(request)
        return response