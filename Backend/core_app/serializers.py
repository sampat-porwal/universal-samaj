from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Q  
from .models import (
    CustomRole, SamajProfile, FamilyAlbum, AlbumImage, 
    SamajCommittee, CommitteeMessage, ActivityTag, ActivityRegistration,
    VerificationVote 
)

User = get_user_model()

class CustomRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomRole
        fields = ['id', 'name', 'permissions', 'created_at']
        read_only_fields = ['id', 'created_at']

class UserProfileSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField() 
    custom_role_name = serializers.CharField(source='custom_role.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'first_name_hi', 'last_name_hi', 
            'email', 'mobile_no', 'aadhaar_no', 'role', 'custom_role', 
            'custom_role_name', 'permissions', 'is_active'
        ]

    def get_permissions(self, obj):
        if obj.role in ['SUPERADMIN', 'ADMIN']: return ["ALL_ACCESS"]
        if getattr(obj, 'custom_role', None) and obj.custom_role.permissions: return obj.custom_role.permissions
        role_upper = str(obj.role).upper()
        if role_upper == 'STAFF': return ["view_dashboard", "edit_profile", "view_logs"] 
        else: return ["view_dashboard"]

# ==========================================
# 🌟 FAMILY MEMBER SERIALIZER
# ==========================================
class FamilyMemberSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    class Meta:
        model = SamajProfile
        fields = ['id', 'samaj_id', 'profile_image', 'user', 'gender', 'village_en']

# ==========================================
# 🌟 SAMAJ ADVANCED SERIALIZER
# ==========================================
class SamajProfileSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    family_summary = serializers.JSONField(read_only=True)
    
    # 🌟 CORE RELATIONS
    father = FamilyMemberSerializer(read_only=True)
    mother = FamilyMemberSerializer(read_only=True)
    
    # ❌ PEHLE YAHAN GALTI THI: spouse = FamilyMemberSerializer(read_only=True)
    # ✅ THE BUG FIX: It MUST be 'spouses' and 'many=True' because it's a ManyToManyField!
    spouses = FamilyMemberSerializer(many=True, read_only=True)
    
    children = serializers.SerializerMethodField()
    
    # 🌟 NEW: SECONDARY RELATIONS (Auto-Calculated Siblings)
    siblings = serializers.SerializerMethodField()
    
    # Voting Data
    votes_count = serializers.SerializerMethodField()
    voters_list = serializers.SerializerMethodField()
    has_voted = serializers.SerializerMethodField()

    class Meta:
        model = SamajProfile
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'verification_status']

    # ... (Baki neeche ka poora code waisa hi rahega) ...
    # Fetch Children
    def get_children(self, obj):
        kids = SamajProfile.objects.filter(Q(father=obj) | Q(mother=obj)).distinct()
        return FamilyMemberSerializer(kids, many=True).data

    # 🌟 FETCH SIBLINGS (Bhai/Behan automatically calculate honge)
    def get_siblings(self, obj):
        if not obj.father and not obj.mother:
            return []
        
        parent_q = Q()
        if obj.father:
            parent_q |= Q(father=obj.father)
        if obj.mother:
            parent_q |= Q(mother=obj.mother)
            
        # exclude(id=obj.id) prevents showing 'self' as a sibling
        siblings = SamajProfile.objects.exclude(id=obj.id).filter(parent_q).distinct()
        return FamilyMemberSerializer(siblings, many=True).data

    def get_votes_count(self, obj):
        return obj.votes_received.count()

    def get_voters_list(self, obj):
        return [vote.core_member.first_name for vote in obj.votes_received.all()]

    def get_has_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.votes_received.filter(core_member=request.user).exists()
        return False

# Other serializers...
class AlbumImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlbumImage
        fields = ['id', 'image', 'created_at']

class FamilyAlbumSerializer(serializers.ModelSerializer):
    images = AlbumImageSerializer(many=True, read_only=True)
    class Meta:
        model = FamilyAlbum
        fields = ['id', 'name_en', 'name_hi', 'images', 'created_at']

class SamajCommitteeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SamajCommittee
        fields = ['id', 'name_en', 'name_hi', 'purpose', 'is_active']