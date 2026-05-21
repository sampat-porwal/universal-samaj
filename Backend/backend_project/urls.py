from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # The Admin Panel
    path('admin/', admin.site.urls),
    
    # Your Universal API Routes (Core App)
    path('api/', include('core_app.urls')), 

    # 🌟 NEW: SAMAJ EVENTS ROUTES (Isolated in its own app)
    path('api/events/', include('samaj_events.urls')),

    # 🌟 RAZORPAY ROUTES
    path('api/payments/', include('payment_gateway.urls')),
]

# 🌟 MUST ADD FOR MEDIA FILES (Profile Photos) IN DEVELOPMENT
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)



# from django.contrib import admin
# from django.urls import path, include
# from django.conf import settings
# from django.conf.urls.static import static

# urlpatterns = [
#     # The Admin Panel
#     path('admin/', admin.site.urls),
    
#     # Your Universal API Routes
#     path('api/', include('core_app.urls')), 

#     # 🌟 RAZORPAY ROUTES
#     path('api/payments/', include('payment_gateway.urls')),


# ]

# # 🌟 MUST ADD FOR MEDIA FILES (Profile Photos) IN DEVELOPMENT
# if settings.DEBUG:
#     urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)