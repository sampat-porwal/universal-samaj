from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction # 🌟 REQUIRED FOR SAFE BULK UPLOAD
from django.contrib.auth import get_user_model
from .models import SamajProfile, VerificationVote, FamilyLinkRequest
from .serializers import SamajProfileSerializer

User = get_user_model()

class SamajProfileViewSet(viewsets.ModelViewSet):
    queryset = SamajProfile.objects.all().order_by('-created_at')
    serializer_class = SamajProfileSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def pending_verifications(self, request):
        profiles = SamajProfile.objects.filter(verification_status='PENDING').order_by('created_at')
        serializer = self.get_serializer(profiles, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def verify_member(self, request, pk=None):
        profile = self.get_object()

        if request.user.role == 'SUPERADMIN' or request.user.is_superuser:
            profile.verification_status = 'VERIFIED'
            profile.save(update_fields=['verification_status'])
            return Response({"message": "Superadmin Override: Profile verified instantly!", "status": "VERIFIED"}, status=status.HTTP_200_OK)

        try:
            voter_profile = SamajProfile.objects.get(user=request.user)
            if not voter_profile.is_core_member:
                return Response({"error": "Access Denied: Only Core Members can verify other users."}, status=status.HTTP_403_FORBIDDEN)
        except SamajProfile.DoesNotExist:
            return Response({"error": "Your Samaj Profile does not exist."}, status=status.HTTP_400_BAD_REQUEST)

        vote, created = VerificationVote.objects.get_or_create(core_member=request.user, pending_profile=profile)
        if not created: return Response({"error": "You have already voted to verify this profile."}, status=status.HTTP_400_BAD_REQUEST)

        current_votes = profile.votes_received.count()
        current_status = "VERIFIED" if current_votes >= 5 else "PENDING"
        
        return Response({"message": f"Vote cast successfully! ({current_votes}/5 votes collected)", "current_votes": current_votes, "status": current_status}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def send_family_request(self, request):
        sender = request.user.samaj_profile
        receiver_id = request.data.get('receiver_id')
        relation_type = request.data.get('relation_type')
        try:
            receiver = SamajProfile.objects.get(id=receiver_id)
            if FamilyLinkRequest.objects.filter(sender=sender, receiver=receiver, status='PENDING').exists():
                return Response({"error": "Request already pending with this user."}, status=status.HTTP_400_BAD_REQUEST)
            FamilyLinkRequest.objects.create(sender=sender, receiver=receiver, relation_type=relation_type)
            return Response({"message": "Request sent successfully!"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def pending_requests(self, request):
        profile = request.user.samaj_profile
        reqs = FamilyLinkRequest.objects.filter(receiver=profile, status='PENDING').order_by('-created_at')
        data = [{"id": r.id, "sender_name": f"{r.sender.user.first_name} {r.sender.user.last_name}".strip(), "sender_image": r.sender.profile_image.url if r.sender.profile_image else None, "relation_type": r.relation_type, "created_at": r.created_at} for r in reqs]
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def sent_requests(self, request):
        profile = request.user.samaj_profile
        reqs = FamilyLinkRequest.objects.filter(sender=profile, status='PENDING').order_by('-created_at')
        data = [{"id": r.id, "receiver_name": f"{r.receiver.user.first_name} {r.receiver.user.last_name}".strip(), "receiver_image": r.receiver.profile_image.url if r.receiver.profile_image else None, "relation_type": r.relation_type, "created_at": r.created_at} for r in reqs]
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel_family_request(self, request):
        req_id = request.data.get('request_id')
        try:
            link_req = FamilyLinkRequest.objects.get(id=req_id, sender=request.user.samaj_profile, status='PENDING')
            link_req.delete()
            return Response({"message": "Request cancelled successfully!"}, status=status.HTTP_200_OK)
        except FamilyLinkRequest.DoesNotExist:
            return Response({"error": "Request not found or already processed."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def respond_request(self, request):
        req_id = request.data.get('request_id')
        action = request.data.get('action') 
        try:
            link_req = FamilyLinkRequest.objects.get(id=req_id, receiver=request.user.samaj_profile)
            if action == 'ACCEPT':
                sender = link_req.sender
                receiver = link_req.receiver
                rel = link_req.relation_type
                if rel == 'FATHER': sender.father = receiver
                elif rel == 'MOTHER': sender.mother = receiver
                elif rel in ['HUSBAND', 'WIFE']:
                    sender.spouse = receiver
                    receiver.spouse = sender
                elif rel in ['SON', 'DAUGHTER']:
                    if receiver.gender == 'M': sender.father = receiver
                    else: sender.mother = receiver
                sender.save()
                receiver.save()
                link_req.status = 'ACCEPTED'
            else:
                link_req.status = 'REJECTED'
            link_req.save()
            return Response({"message": f"Request {action.lower()}ed successfully!"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": "Failed to process request."}, status=status.HTTP_400_BAD_REQUEST)

    # ==========================================
    # 🌟 SUPER API: EXTENDABLE BULK FAMILY IMPORT
    # ==========================================
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def bulk_family_import(self, request):
        # 1. 🌟 FIX: Allow Superuser OR Core Member
        is_authorized = False
        if request.user.is_superuser:
            is_authorized = True
        else:
            try:
                voter_profile = SamajProfile.objects.get(user=request.user)
                if voter_profile.is_core_member:
                    is_authorized = True
            except SamajProfile.DoesNotExist:
                pass

        if not is_authorized:
            return Response({"error": "Access Denied: Only Admins or Core Members can upload bulk data."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        head_data = data.get('head_of_family')
        members_data = data.get('members', [])

        if not head_data:
            return Response({"error": "head_of_family data is missing!"}, status=status.HTTP_400_BAD_REQUEST)

        def generate_username(fname, mobile):
            base = f"{fname.lower().strip()}{str(mobile)[-4:]}" if mobile else f"{fname.lower().strip()}{User.objects.count()}"
            return base.replace(" ", "")

        created_profiles = []

        try:
            with transaction.atomic():
                
                # --- 1. HANDLE MASTER USER (NEW OR EXISTING) ---
                if head_data.get('is_existing') and head_data.get('existing_username'):
                    try:
                        head_user = User.objects.get(username=head_data['existing_username'])
                        head_profile = SamajProfile.objects.get(user=head_user)
                        created_profiles.append(f"Linked to Existing Master: {head_user.first_name} ({head_user.username})")
                    except User.DoesNotExist:
                        return Response({"error": f"Master user '{head_data['existing_username']}' not found in DB!"}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    head_username = generate_username(head_data.get('first_name'), head_data.get('mobile_no'))
                    head_user = User.objects.create_user(
                        username=head_username,
                        email=head_data.get('email', f"{head_username}@test.com"),
                        password=f"Samaj@{head_data.get('mobile_no', '1234')}",
                        first_name=head_data.get('first_name', ''),
                        last_name=head_data.get('last_name', ''),
                        mobile_no=head_data.get('mobile_no', ''),
                        is_active=True
                    )
                    head_profile = SamajProfile.objects.create(
                        user=head_user,
                        samaj_id=f"S-BLK-{User.objects.count()}",
                        village_en=head_data.get('village_en', ''),
                        gotra_en=head_data.get('gotra_en', ''),
                        gender=head_data.get('gender', 'M'),
                        verification_status='VERIFIED'
                    )
                    created_profiles.append(f"New Master Created: {head_user.first_name} (User ID: {head_user.username})")

                # --- 2. CREATE MEMBERS & SET RELATIONS ---
                for mem in members_data:
                    m_username = generate_username(mem.get('first_name'), mem.get('mobile_no'))
                    m_user = User.objects.create_user(
                        username=m_username,
                        email=mem.get('email', f"{m_username}@test.com"),
                        password=f"Samaj@{mem.get('mobile_no', '1234')}",
                        first_name=mem.get('first_name', ''),
                        last_name=mem.get('last_name', ''),
                        mobile_no=mem.get('mobile_no', ''),
                        is_active=True
                    )
                    m_profile = SamajProfile.objects.create(
                        user=m_user,
                        samaj_id=f"S-BLK-{User.objects.count()}",
                        village_en=mem.get('village_en', head_profile.village_en),
                        gotra_en=mem.get('gotra_en', ''),
                        gender=mem.get('gender', 'M'),
                        verification_status='VERIFIED'
                    )

                    relation = mem.get('relation_to_head', '').upper()
                    
                    if relation in ['WIFE', 'HUSBAND', 'SPOUSE']:
                        head_profile.spouse = m_profile
                        m_profile.spouse = head_profile
                    elif relation in ['SON', 'DAUGHTER', 'CHILD']:
                        if head_profile.gender == 'M': m_profile.father = head_profile
                        else: m_profile.mother = head_profile
                    elif relation == 'FATHER':
                        head_profile.father = m_profile
                    elif relation == 'MOTHER':
                        head_profile.mother = m_profile

                    m_profile.save()
                    created_profiles.append(f"{relation}: {m_user.first_name} (User ID: {m_user.username})")
                
                head_profile.save()

            return Response({
                "message": "Family Bulk Import Successful!", 
                "imported_users": created_profiles
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": f"Import failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        


# IMPORT THIS AT THE TOP IF NOT PRESENT
    # from django.db.models import Q

    # ==========================================
    # 🌟 NEW: UPDATE FAMILY MEMBER PHOTO API
    # ==========================================
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def update_family_photo(self, request, pk=None):
        target_profile = self.get_object()
        user_profile = request.user.samaj_profile

        # 1. Permission Check: Can this user update this target's photo?
        is_allowed = False
        
        # Superadmin / Core Member case
        if request.user.is_superuser or user_profile.is_core_member:
            is_allowed = True
            
        # Self Update Case
        elif target_profile.id == user_profile.id:
            is_allowed = True
            
        # Core Family Case (Father, Mother, Spouse, Children)
        elif target_profile in [user_profile.father, user_profile.mother, user_profile.spouse]:
            is_allowed = True
        elif user_profile in [target_profile.father, target_profile.mother]: # Target is my child
            is_allowed = True

        if not is_allowed:
            return Response({"error": "You don't have permission to update this member's photo."}, status=status.HTTP_403_FORBIDDEN)

        # 2. Update the Photo
        if 'profile_image' in request.FILES:
            target_profile.profile_image = request.FILES['profile_image']
            target_profile.save(update_fields=['profile_image'])
            return Response({"message": "Photo updated successfully!", "profile_image": target_profile.profile_image.url}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "No image provided."}, status=status.HTTP_400_BAD_REQUEST)