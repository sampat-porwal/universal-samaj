from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import SamajProfile, VerificationVote, FamilyLinkRequest
from .serializers import SamajProfileSerializer

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

    # ==========================================
    # 🌟 DECENTRALIZED RELATIONSHIP ENGINE
    # ==========================================
    
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
        data = []
        for r in reqs:
            data.append({
                "id": r.id,
                "sender_name": f"{r.sender.user.first_name} {r.sender.user.last_name}".strip(),
                "sender_image": r.sender.profile_image.url if r.sender.profile_image else None,
                "relation_type": r.relation_type,
                "created_at": r.created_at
            })
        return Response(data, status=status.HTTP_200_OK)

    # 🌟 NEW: Get requests that the user has SENT (so they can cancel them)
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def sent_requests(self, request):
        profile = request.user.samaj_profile
        reqs = FamilyLinkRequest.objects.filter(sender=profile, status='PENDING').order_by('-created_at')
        data = []
        for r in reqs:
            data.append({
                "id": r.id,
                "receiver_name": f"{r.receiver.user.first_name} {r.receiver.user.last_name}".strip(),
                "receiver_image": r.receiver.profile_image.url if r.receiver.profile_image else None,
                "relation_type": r.relation_type,
                "created_at": r.created_at
            })
        return Response(data, status=status.HTTP_200_OK)

    # 🌟 NEW: Cancel a wrongly sent request
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel_family_request(self, request):
        req_id = request.data.get('request_id')
        try:
            link_req = FamilyLinkRequest.objects.get(id=req_id, sender=request.user.samaj_profile, status='PENDING')
            link_req.delete() # Hard delete the pending request
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

                if rel == 'FATHER':
                    sender.father = receiver
                elif rel == 'MOTHER':
                    sender.mother = receiver
                elif rel == 'HUSBAND' or rel == 'WIFE':
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