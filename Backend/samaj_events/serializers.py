from rest_framework import serializers
from django.utils import timezone
from .models import (
    SamajEvent, EventOrganizer, EventParticipant,
    BloodDonationRecord, SecretPoll, PollOption, PollVote,
    SportsTeam, TournamentPlayer, EventChatMessage
)


# ──────────────────────────────────────────────────────────────────────────────
# EVENT SERIALIZERS
# ──────────────────────────────────────────────────────────────────────────────
class SamajEventSerializer(serializers.ModelSerializer):
    is_joined = serializers.SerializerMethodField()
    is_organizer = serializers.SerializerMethodField()
    organizer_role = serializers.SerializerMethodField()   # 🌟 NEW: what role does this user have?
    participant_count = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)

    class Meta:
        model = SamajEvent
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')

    def get_is_joined(self, obj):
        request = self.context.get('request')
        if request and hasattr(request.user, 'samaj_profile'):
            return obj.participants.filter(profile=request.user.samaj_profile).exists()
        return False

    def get_is_organizer(self, obj):
        request = self.context.get('request')
        if request and hasattr(request.user, 'samaj_profile'):
            return obj.organizers.filter(profile=request.user.samaj_profile).exists()
        return False

    def get_organizer_role(self, obj):
        """Returns 'Event Admin', 'Event Member', or None"""
        request = self.context.get('request')
        if request and hasattr(request.user, 'samaj_profile'):
            org = obj.organizers.filter(profile=request.user.samaj_profile).first()
            return org.role_title if org else None
        return None


class EventOrganizerSerializer(serializers.ModelSerializer):
    profile_name = serializers.CharField(source='profile.user.first_name', read_only=True)
    profile_mobile = serializers.CharField(source='profile.user.mobile_no', read_only=True)
    samaj_id = serializers.CharField(source='profile.samaj_id', read_only=True)
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = EventOrganizer
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')

    def get_profile_photo(self, obj):
        request = self.context.get('request')
        if obj.profile.profile_image and request:
            return request.build_absolute_uri(obj.profile.profile_image.url)
        return None


class EventParticipantSerializer(serializers.ModelSerializer):
    profile_name = serializers.CharField(source='profile.user.first_name', read_only=True)
    profile_mobile = serializers.CharField(source='profile.user.mobile_no', read_only=True)
    village = serializers.CharField(source='profile.village_en', read_only=True)
    samaj_id = serializers.CharField(source='profile.samaj_id', read_only=True)
    # 🌟 NEW: photo and father name for participant cards
    profile_photo = serializers.SerializerMethodField()
    father_name = serializers.SerializerMethodField()

    class Meta:
        model = EventParticipant
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')

    def get_profile_photo(self, obj):
        request = self.context.get('request')
        if obj.profile.profile_image and request:
            return request.build_absolute_uri(obj.profile.profile_image.url)
        return None

    def get_father_name(self, obj):
        """Returns father's name if linked via father FK on SamajProfile."""
        try:
            father = obj.profile.father  # FK to another SamajProfile
            if father and hasattr(father, 'user'):
                return father.user.first_name
        except Exception:
            pass
        return None


# ──────────────────────────────────────────────────────────────────────────────
# CHAT SERIALIZER
# ──────────────────────────────────────────────────────────────────────────────
class EventChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.user.first_name', read_only=True)
    sender_photo = serializers.SerializerMethodField()  # 🌟 profile photo
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = EventChatMessage
        fields = ['id', 'sender_name', 'sender_photo', 'message', 'created_at', 'is_me']
        read_only_fields = ('created_at',)

    def get_is_me(self, obj):
        request = self.context.get('request')
        return request and request.user == obj.sender.user

    def get_sender_photo(self, obj):
        request = self.context.get('request')
        if obj.sender.profile_image and request:
            return request.build_absolute_uri(obj.sender.profile_image.url)
        return None


# ──────────────────────────────────────────────────────────────────────────────
# POLL SERIALIZERS
# ──────────────────────────────────────────────────────────────────────────────
class PollOptionSerializer(serializers.ModelSerializer):
    vote_count = serializers.SerializerMethodField()

    class Meta:
        model = PollOption
        fields = ['id', 'option_text', 'vote_count']

    def get_vote_count(self, obj):
        # Show counts only when poll is CLOSED (results revealed)
        if obj.poll.status == 'CLOSED':
            return obj.vote_count
        return None  # Hidden while voting is active


class SecretPollSerializer(serializers.ModelSerializer):
    options = PollOptionSerializer(many=True, read_only=True)
    my_vote = serializers.SerializerMethodField()
    time_left_seconds = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()
    expires_at_display = serializers.SerializerMethodField()  # 🌟 human readable

    class Meta:
        model = SecretPoll
        fields = [
            'id', 'event', 'question', 'status', 'expires_at', 'expires_at_display',
            'options', 'my_vote', 'time_left_seconds', 'total_votes', 'created_at'
        ]
        read_only_fields = ('created_at',)

    def get_my_vote(self, obj):
        request = self.context.get('request')
        if request and hasattr(request.user, 'samaj_profile'):
            vote = PollVote.objects.filter(poll=obj, voter=request.user.samaj_profile).first()
            return vote.option.id if vote else None
        return None

    def get_time_left_seconds(self, obj):
        if obj.expires_at and obj.status == 'ACTIVE':
            delta = obj.expires_at - timezone.now()
            return max(0, int(delta.total_seconds()))
        return 0

    def get_total_votes(self, obj):
        return PollVote.objects.filter(poll=obj).count()

    def get_expires_at_display(self, obj):
        """Returns a friendly local datetime string for display."""
        if not obj.expires_at:
            return None
        from django.utils.timezone import localtime
        local = localtime(obj.expires_at)
        return local.strftime('%d %b %Y, %I:%M %p')


# ──────────────────────────────────────────────────────────────────────────────
# BLOOD DONATION SERIALIZERS
# ──────────────────────────────────────────────────────────────────────────────
class BloodDonationRecordSerializer(serializers.ModelSerializer):
    donor_display_name = serializers.CharField(source='get_donor_name', read_only=True)
    blood_group_display = serializers.CharField(source='get_blood_group', read_only=True)

    class Meta:
        model = BloodDonationRecord
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')


# ──────────────────────────────────────────────────────────────────────────────
# SPORTS SERIALIZERS
# ──────────────────────────────────────────────────────────────────────────────
class TournamentPlayerSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='profile.user.first_name', read_only=True)
    samaj_id = serializers.CharField(source='profile.samaj_id', read_only=True)

    class Meta:
        model = TournamentPlayer
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')


class SportsTeamSerializer(serializers.ModelSerializer):
    captain_name = serializers.CharField(source='captain.user.first_name', read_only=True)
    players = TournamentPlayerSerializer(many=True, read_only=True)
    player_count = serializers.SerializerMethodField()

    class Meta:
        model = SportsTeam
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')

    def get_player_count(self, obj):
        return obj.players.count()