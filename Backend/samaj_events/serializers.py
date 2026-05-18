from rest_framework import serializers
from .models import (
    SamajEvent, EventOrganizer, BloodDonationRecord,
    SecretPoll, PollOption, PollVote,
    SportsTeam, TournamentPlayer, EventChatMessage  # 🌟 Added EventChatMessage
)

class SamajEventSerializer(serializers.ModelSerializer):
    is_joined = serializers.SerializerMethodField()
    is_organizer = serializers.SerializerMethodField() # 🌟 Checks if user is committee member

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


class EventOrganizerSerializer(serializers.ModelSerializer):
    profile_name = serializers.CharField(source='profile.user.first_name', read_only=True)
    samaj_id = serializers.CharField(source='profile.samaj_id', read_only=True)
    
    class Meta:
        model = EventOrganizer
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')


# 🌟 THE MISSING CHAT SERIALIZER 🌟
class EventChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.user.first_name', read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = EventChatMessage
        fields = ['id', 'sender_name', 'message', 'created_at', 'is_me']
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')
    
    def get_is_me(self, obj):
        request = self.context.get('request')
        return request and request.user == obj.sender.user


# ──────────────────────────────────────────────────────────────────────────────
# POLLING SERIALIZERS
# ──────────────────────────────────────────────────────────────────────────────
class PollOptionSerializer(serializers.ModelSerializer):
    vote_count = serializers.SerializerMethodField()

    class Meta:
        model = PollOption
        fields = ['id', 'option_text', 'vote_count']
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')

    def get_vote_count(self, obj):
        if obj.poll.status == 'CLOSED':
            return obj.pollvote_set.count()
        return None  


class SecretPollSerializer(serializers.ModelSerializer):
    options = PollOptionSerializer(many=True, read_only=True)
    my_vote = serializers.SerializerMethodField() 

    class Meta:
        model = SecretPoll
        fields = ['id', 'event', 'question', 'status', 'expires_at', 'options', 'my_vote', 'created_at']
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')

    def get_my_vote(self, obj):
        request = self.context.get('request')
        if request and hasattr(request.user, 'samaj_profile'):
            vote = PollVote.objects.filter(poll=obj, voter=request.user.samaj_profile).first()
            if vote:
                return vote.option.id
        return None


# ──────────────────────────────────────────────────────────────────────────────
# OTHER SERIALIZERS
# ──────────────────────────────────────────────────────────────────────────────
class BloodDonationRecordSerializer(serializers.ModelSerializer):
    donor_display_name = serializers.CharField(source='get_donor_name', read_only=True)

    class Meta:
        model = BloodDonationRecord
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')


class SportsTeamSerializer(serializers.ModelSerializer):
    captain_name = serializers.CharField(source='captain.user.first_name', read_only=True)

    class Meta:
        model = SportsTeam
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')