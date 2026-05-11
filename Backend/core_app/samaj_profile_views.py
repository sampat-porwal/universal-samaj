from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.core.exceptions import ObjectDoesNotExist
from .models import SamajProfile, VerificationVote, FamilyLinkRequest, AuditLog
from .serializers import SamajProfileSerializer

User = get_user_model()

# 🌟 HELPER: Universal Logging Function
def log_activity(user, action, module, details):
    try:
        if user and not user.is_anonymous:
            AuditLog.objects.create(user=user, action=action, module=module, details=details)
    except Exception as e:
        pass

class SamajProfileViewSet(viewsets.ModelViewSet):
    queryset = SamajProfile.objects.all().order_by('-created_at')
    serializer_class = SamajProfileSerializer
    permission_classes = [IsAuthenticated]

    # 🌟 NEW: ADMIN SEARCH API FOR BULK IMPORT (ID Finder)
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def admin_search(self, request):
        if not (request.user.is_superuser or request.user.role in ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN', 'CORE_MEMBER']):
            return Response({"error": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)
            
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response([], status=status.HTTP_200_OK)
            
        profiles = SamajProfile.objects.filter(
            Q(user__first_name__icontains=query) | 
            Q(user__last_name__icontains=query) | 
            Q(user__username__icontains=query) |
            Q(user__mobile_no__icontains=query)
        )[:20]
        
        data = []
        for p in profiles:
            father_name = f"{p.father.user.first_name} {p.father.user.last_name}".strip() if p.father else "N/A"
            data.append({
                "id": p.id,
                "username": p.user.username,
                "name": f"{p.user.first_name} {p.user.last_name}".strip(),
                "mobile": p.user.mobile_no,
                "village": p.village_en,
                "gotra": p.gotra_en,
                "gender": p.gender,
                "father_name": father_name,
                "image": p.profile_image.url if p.profile_image else None
            })
            
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def pending_verifications(self, request):
        profiles = SamajProfile.objects.filter(verification_status='PENDING').order_by('created_at')
        serializer = self.get_serializer(profiles, many=True, context={'request': request})
        
        data = serializer.data
        for i, profile in enumerate(profiles):
            votes = profile.votes_received.all()
            data[i]['current_votes'] = votes.count()
            
            voter_details = []
            for vote in votes:
                voter_user = vote.core_member
                try:
                    v_profile = SamajProfile.objects.get(user=voter_user)
                    voter_details.append({
                        "name": f"{voter_user.first_name} {voter_user.last_name}".strip() or voter_user.username,
                        "samaj_id": v_profile.samaj_id,
                        "image": v_profile.profile_image.url if v_profile.profile_image else None,
                        "gotra": v_profile.gotra_en
                    })
                except SamajProfile.DoesNotExist:
                    voter_details.append({
                        "name": f"{voter_user.first_name} {voter_user.last_name}".strip() or voter_user.username,
                        "samaj_id": "N/A",
                        "image": None,
                        "gotra": ""
                    })
                    
            data[i]['verified_by'] = voter_details
            
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def verify_member(self, request, pk=None):
        profile = self.get_object()
        action_type = request.data.get('action', 'VERIFY')

        try:
            voter_profile = SamajProfile.objects.get(user=request.user)
            is_authorized = voter_profile.is_core_member or request.user.role in ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN']
        except SamajProfile.DoesNotExist:
            is_authorized = request.user.is_superuser or request.user.role in ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN']

        if not is_authorized:
            return Response({"error": "Access Denied: Only Core Members or Admins can review users."}, status=status.HTTP_403_FORBIDDEN)

        if action_type == 'REJECT':
            profile.verification_status = 'REJECTED'
            profile.save(update_fields=['verification_status'])
            log_activity(request.user, 'UPDATE', 'Verification', f"Rejected user profile: {profile.user.first_name} ({profile.samaj_id})")
            return Response({"message": f"{profile.user.first_name}'s profile has been Rejected.", "status": "REJECTED"}, status=status.HTTP_200_OK)

        if request.user.role in ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN'] or request.user.is_superuser:
            profile.verification_status = 'VERIFIED'
            profile.save(update_fields=['verification_status'])
            log_activity(request.user, 'UPDATE', 'Verification', f"Admin 1-Shot Verify: Verified user {profile.user.first_name} ({profile.samaj_id})")
            return Response({"message": "Admin Override: Profile verified instantly!", "status": "VERIFIED"}, status=status.HTTP_200_OK)

        vote, created = VerificationVote.objects.get_or_create(core_member=request.user, pending_profile=profile)
        if not created: 
            return Response({"error": "You have already voted to verify this profile."}, status=status.HTTP_400_BAD_REQUEST)

        current_votes = profile.votes_received.count()
        current_status = "VERIFIED" if current_votes >= 5 else "PENDING"
        
        log_activity(request.user, 'UPDATE', 'Verification', f"Voted to verify {profile.user.first_name}. Total votes: {current_votes}/5")

        if current_status == "VERIFIED":
            profile.verification_status = 'VERIFIED'
            profile.save(update_fields=['verification_status'])
            log_activity(request.user, 'UPDATE', 'Verification', f"Profile Fully Verified: {profile.user.first_name} ({profile.samaj_id}) reached 5 votes.")

        return Response({"message": f"Vote cast successfully! ({current_votes}/5 votes collected)", "current_votes": current_votes, "status": current_status}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def pending_requests(self, request):
        if not hasattr(request.user, 'samaj_profile'):
            return Response([], status=status.HTTP_200_OK)
            
        profile = request.user.samaj_profile
        reqs = FamilyLinkRequest.objects.filter(receiver=profile, status='PENDING').order_by('-created_at')
        data = [{"id": r.id, "sender_name": f"{r.sender.user.first_name} {r.sender.user.last_name}".strip(), "sender_image": r.sender.profile_image.url if r.sender.profile_image else None, "relation_type": r.relation_type, "created_at": r.created_at} for r in reqs]
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def sent_requests(self, request):
        if not hasattr(request.user, 'samaj_profile'):
            return Response([], status=status.HTTP_200_OK)

        profile = request.user.samaj_profile
        reqs = FamilyLinkRequest.objects.filter(sender=profile, status='PENDING').order_by('-created_at')
        data = [{"id": r.id, "receiver_name": f"{r.receiver.user.first_name} {r.receiver.user.last_name}".strip(), "receiver_image": r.receiver.profile_image.url if r.receiver.profile_image else None, "relation_type": r.relation_type, "created_at": r.created_at} for r in reqs]
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def send_family_request(self, request):
        if not hasattr(request.user, 'samaj_profile'):
            return Response({"error": "You must have a Samaj Profile to send requests."}, status=status.HTTP_400_BAD_REQUEST)
            
        sender = request.user.samaj_profile
        receiver_id = request.data.get('receiver_id')
        relation_type = request.data.get('relation_type')
        try:
            receiver = SamajProfile.objects.get(id=receiver_id)
            if FamilyLinkRequest.objects.filter(sender=sender, receiver=receiver, status='PENDING').exists():
                return Response({"error": "Request already pending with this user."}, status=status.HTTP_400_BAD_REQUEST)
            FamilyLinkRequest.objects.create(sender=sender, receiver=receiver, relation_type=relation_type)
            log_activity(request.user, 'CREATE', 'Family Graph', f"Sent {relation_type} link request to {receiver.user.first_name}")
            return Response({"message": "Request sent successfully!"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel_family_request(self, request):
        if not hasattr(request.user, 'samaj_profile'):
            return Response({"error": "Profile not found."}, status=status.HTTP_400_BAD_REQUEST)
            
        req_id = request.data.get('request_id')
        try:
            link_req = FamilyLinkRequest.objects.get(id=req_id, sender=request.user.samaj_profile, status='PENDING')
            link_req.delete()
            return Response({"message": "Request cancelled successfully!"}, status=status.HTTP_200_OK)
        except FamilyLinkRequest.DoesNotExist:
            return Response({"error": "Request not found or already processed."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def respond_request(self, request):
        if not hasattr(request.user, 'samaj_profile'):
            return Response({"error": "Profile not found."}, status=status.HTTP_400_BAD_REQUEST)

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
                    sender.spouses.add(receiver)
                    receiver.spouses.add(sender)
                elif rel in ['SON', 'DAUGHTER']:
                    if receiver.gender == 'M': sender.father = receiver
                    else: sender.mother = receiver
                sender.save()
                receiver.save()
                link_req.status = 'ACCEPTED'
                log_activity(request.user, 'UPDATE', 'Family Graph', f"Accepted {rel} connection with {sender.user.first_name}")
            else:
                link_req.status = 'REJECTED'
                log_activity(request.user, 'UPDATE', 'Family Graph', f"Rejected link request from {link_req.sender.user.first_name}")
                
            link_req.save()
            return Response({"message": f"Request {action.lower()}ed successfully!"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": "Failed to process request."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def update_family_photo(self, request, pk=None):
        target_profile = self.get_object()
        
        is_allowed = False
        if request.user.is_superuser or request.user.role in ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN']:
            is_allowed = True
        elif hasattr(request.user, 'samaj_profile'):
            user_profile = request.user.samaj_profile
            if target_profile.id == user_profile.id:
                is_allowed = True
            elif target_profile in user_profile.spouses.all() or target_profile in [user_profile.father, user_profile.mother]:
                is_allowed = True
            elif user_profile in [target_profile.father, target_profile.mother]:
                is_allowed = True

        if not is_allowed:
            return Response({"error": "You don't have permission to update this member's photo."}, status=status.HTTP_403_FORBIDDEN)

        if 'profile_image' in request.FILES:
            target_profile.profile_image = request.FILES['profile_image']
            target_profile.save(update_fields=['profile_image'])
            log_activity(request.user, 'UPDATE', 'Directory Profile', f"Updated photo for {target_profile.user.first_name} ({target_profile.samaj_id})")
            return Response({"message": "Photo updated successfully!", "profile_image": target_profile.profile_image.url}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "No image provided."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def assign_role(self, request, pk=None):
        target_profile = self.get_object()
        target_user = target_profile.user
        new_role = request.data.get('role')

        user_role = request.user.role
        is_authorized = False

        if request.user.is_superuser or user_role == 'SUPERADMIN':
            is_authorized = True
        elif user_role == 'ADMIN' and new_role in ['CORE_ADMIN', 'CORE_MEMBER', 'EVENT_ADMIN', 'EVENT_USER', 'USER']:
            is_authorized = True
        elif user_role == 'CORE_ADMIN' and new_role in ['CORE_MEMBER', 'EVENT_USER', 'USER']:
            is_authorized = True

        if not is_authorized:
            return Response({"error": "Access Denied: You cannot assign this high-level role."}, status=status.HTTP_403_FORBIDDEN)

        if hasattr(request.user, 'samaj_profile') and target_profile.id == request.user.samaj_profile.id:
            return Response({"error": "You cannot change your own role."}, status=status.HTTP_400_BAD_REQUEST)

        target_user.role = new_role
        target_user.save(update_fields=['role'])

        if new_role in ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN', 'CORE_MEMBER']:
            target_profile.is_core_member = True
        else:
            target_profile.is_core_member = False
            
        target_profile.save(update_fields=['is_core_member'])
        log_activity(request.user, 'UPDATE', 'Role Management', f"Assigned role {new_role} to {target_user.first_name} ({target_user.username})")

        return Response({
            "message": f"Successfully assigned {new_role} role!", 
            "role": new_role,
            "is_core_member": target_profile.is_core_member
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def bulk_family_import(self, request):
        is_authorized = False
        if request.user.is_superuser or request.user.role in ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN', 'CORE_MEMBER']:
            is_authorized = True
        elif hasattr(request.user, 'samaj_profile') and request.user.samaj_profile.is_core_member:
            is_authorized = True

        if not is_authorized:
            return Response({"error": "Access Denied: Only Admins or Core Members can upload bulk data."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        head_data = data.get('head_of_family')
        members_data = data.get('members', [])

        if not head_data:
            return Response({"error": "head_of_family data is missing!"}, status=status.HTTP_400_BAD_REQUEST)

        # 🌟 NEW UPGRADED FUNCTION: Safely auto-increments if duplicate found, preventing 500 crashes
        def safe_generate_username(fname, mobile):
            base = f"{(fname or 'user').lower().strip()}{str(mobile)[-4:]}" if mobile else f"{(fname or 'user').lower().strip()}{User.objects.count()}"
            base = base.replace(" ", "")
            username = base
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{counter}"
                counter += 1
            return username

        created_profiles = []

        try:
            with transaction.atomic():
                
                # --- PROCESS HEAD ---
                if head_data.get('is_existing') and head_data.get('existing_username'):
                    try:
                        head_user = User.objects.get(username=head_data['existing_username'])
                        head_profile = SamajProfile.objects.get(user=head_user)
                        created_profiles.append(f"Master Linked: {head_user.first_name} ({head_user.username})")
                    except User.DoesNotExist:
                        return Response({"error": f"Master user '{head_data['existing_username']}' not found in DB!"}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    # Check Custom Username
                    req_h_uname = head_data.get('username')
                    if req_h_uname:
                        if User.objects.filter(username=req_h_uname).exists():
                            return Response({"error": f"Username '{req_h_uname}' is already taken! Use is_existing=true or choose another."}, status=status.HTTP_400_BAD_REQUEST)
                        head_username = req_h_uname
                    else:
                        head_username = safe_generate_username(head_data.get('first_name'), head_data.get('mobile_no'))

                    head_pwd = head_data.get('password', f"Samaj@{head_data.get('mobile_no', '1234')}")
                    
                    head_user = User.objects.create_user(
                        username=head_username,
                        email=head_data.get('email', f"{head_username}@test.com"),
                        password=head_pwd,
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
                        dob=head_data.get('dob'),
                        address_1=head_data.get('address_1', ''),
                        verification_status='VERIFIED',
                        registration_source='BULK'
                    )
                    created_profiles.append(f"Master Created: {head_user.first_name} (User ID: {head_user.username})")

                # --- PROCESS MEMBERS ---
                for mem in members_data:
                    relation = mem.get('relation_to_head', '').upper()
                    
                    if mem.get('is_existing') and mem.get('existing_username'):
                        try:
                            m_user = User.objects.get(username=mem['existing_username'])
                            m_profile = SamajProfile.objects.get(user=m_user)
                            created_profiles.append(f"Linked Existing {relation}: {m_user.first_name} ({m_user.username})")
                        except User.DoesNotExist:
                            raise Exception(f"Existing member '{mem['existing_username']}' not found!")
                    else:
                        # Check Custom Username for members
                        req_m_uname = mem.get('username')
                        if req_m_uname:
                            if User.objects.filter(username=req_m_uname).exists():
                                raise Exception(f"Custom username '{req_m_uname}' for {mem.get('first_name')} already exists!")
                            m_username = req_m_uname
                        else:
                            m_username = safe_generate_username(mem.get('first_name'), mem.get('mobile_no'))

                        m_pwd = mem.get('password', f"Samaj@{mem.get('mobile_no', '1234')}")

                        m_user = User.objects.create_user(
                            username=m_username,
                            email=mem.get('email', f"{m_username}@test.com"),
                            password=m_pwd,
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
                            dob=mem.get('dob'),
                            address_1=mem.get('address_1', ''),
                            verification_status='VERIFIED',
                            registration_source='BULK'
                        )
                        created_profiles.append(f"New {relation}: {m_user.first_name} (User ID: {m_user.username})")

                    # Establish Relationships
                    if relation in ['WIFE', 'HUSBAND', 'SPOUSE']:
                        head_profile.spouses.add(m_profile)
                        m_profile.spouses.add(head_profile)
                    elif relation in ['SON', 'DAUGHTER', 'CHILD']:
                        if head_profile.gender == 'M': m_profile.father = head_profile
                        else: m_profile.mother = head_profile
                    elif relation == 'FATHER':
                        head_profile.father = m_profile
                    elif relation == 'MOTHER':
                        head_profile.mother = m_profile

                    m_profile.save()
                
                head_profile.save()

                actual_head = SamajProfile.objects.get(id=head_profile.id)

                for sp in actual_head.spouses.all():
                    if actual_head.gender == 'M': 
                        SamajProfile.objects.filter(father=actual_head, mother__isnull=True).update(mother=sp)
                    elif actual_head.gender == 'F': 
                        SamajProfile.objects.filter(mother=actual_head, father__isnull=True).update(father=sp)
                            
                if actual_head.father and actual_head.mother:
                    actual_head.father.spouses.add(actual_head.mother)
                    actual_head.mother.spouses.add(actual_head.father)
            
            log_activity(request.user, 'CREATE', 'Bulk Import', f"Imported/Linked family graph for {head_data.get('first_name') or head_data.get('existing_username')}")

            return Response({
                "message": "Family Bulk Import & Linking Successful!", 
                "imported_users": created_profiles
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": f"Import failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)