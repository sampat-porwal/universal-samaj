from django.db import models
from django.utils import timezone
from core_app.models import SamajBaseModel


# ──────────────────────────────────────────────────────────────────────────────
# 1. UNIVERSAL EVENT SYSTEM
# ──────────────────────────────────────────────────────────────────────────────
class SamajEvent(SamajBaseModel):
    EVENT_TYPES = [
        ('CRICKET', 'Cricket Tournament'),
        ('BDC', 'Blood Donation Camp'),
        ('MEETING', 'Samaj Meeting'),
        ('VIVAH', 'Samuhik Vivah Sammelan'),
        ('OTHER', 'Other Cultural Event'),
    ]
    EVENT_SCOPES = [
        ('GLOBAL', 'Whole Samaj'),
        ('DISTRICT', 'District Level'),
        ('CITY', 'City / Village Level'),
    ]
    # 🌟 NEW: Rich event status system
    EVENT_STATUS = [
        ('ACTIVE', 'Active'),
        ('PAUSED', 'Paused'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    event_scope = models.CharField(max_length=20, choices=EVENT_SCOPES, default='GLOBAL')
    event_status = models.CharField(max_length=20, choices=EVENT_STATUS, default='ACTIVE')  # 🌟 NEW
    
    target_district = models.CharField(max_length=100, blank=True, null=True)
    target_city_village = models.CharField(max_length=100, blank=True, null=True)

    date_start = models.DateField()
    date_end = models.DateField(blank=True, null=True)
    location_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)  # kept for backwards compat
    
    # 🌟 NEW: Max participants cap (optional)
    max_participants = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} ({self.get_event_scope_display()})"

    @property
    def participant_count(self):
        return self.participants.count()

    @property
    def is_full(self):
        if self.max_participants:
            return self.participants.count() >= self.max_participants
        return False


class EventOrganizer(SamajBaseModel):
    """
    Committee / Team members for an event.
    role_title: 'Event Admin' can add/remove members. 'Event Member' cannot.
    """
    ROLE_CHOICES = [
        ('Event Admin', 'Event Admin'),
        ('Event Member', 'Event Member'),
    ]
    event = models.ForeignKey(SamajEvent, on_delete=models.CASCADE, related_name='organizers')
    profile = models.ForeignKey('core_app.SamajProfile', on_delete=models.CASCADE)
    role_title = models.CharField(max_length=100, choices=ROLE_CHOICES, default='Event Member')

    class Meta:
        unique_together = ('event', 'profile')

    def __str__(self):
        return f"{self.profile.user.first_name} - {self.role_title}"


# ──────────────────────────────────────────────────────────────────────────────
# 2. EVENT PARTICIPATION
# ──────────────────────────────────────────────────────────────────────────────
class EventParticipant(SamajBaseModel):
    event = models.ForeignKey(SamajEvent, on_delete=models.CASCADE, related_name='participants')
    profile = models.ForeignKey('core_app.SamajProfile', on_delete=models.CASCADE, related_name='event_registrations')
    status = models.CharField(max_length=20, default='REGISTERED')

    class Meta:
        unique_together = ('event', 'profile')

    def __str__(self):
        return f"{self.profile.user.first_name} joined {self.event.title}"


# ──────────────────────────────────────────────────────────────────────────────
# 3. BLOOD DONATION CAMP — Open to guests (no samaj membership needed)
# ──────────────────────────────────────────────────────────────────────────────
class BloodDonationRecord(SamajBaseModel):
    BLOOD_GROUPS = [
        ('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'), ('O+', 'O+'), ('O-', 'O-'),
    ]
    event = models.ForeignKey(SamajEvent, on_delete=models.SET_NULL, null=True, blank=True)
    # Verified member (optional)
    profile = models.ForeignKey('core_app.SamajProfile', on_delete=models.SET_NULL, null=True, blank=True)
    # Guest donor fields (no membership required)
    guest_name = models.CharField(max_length=150, blank=True, null=True)
    guest_mobile = models.CharField(max_length=15, blank=True, null=True)
    guest_blood_group = models.CharField(max_length=5, choices=BLOOD_GROUPS, blank=True, null=True)
    guest_age = models.PositiveIntegerField(null=True, blank=True)  # 🌟 NEW
    guest_address = models.CharField(max_length=255, blank=True, null=True)  # 🌟 NEW
    
    donated_on = models.DateField()
    remarks = models.TextField(blank=True, null=True)

    def get_donor_name(self):
        if self.profile:
            return f"{self.profile.user.first_name} (Verified Member)"
        return f"{self.guest_name} (Guest)"

    def get_blood_group(self):
        if self.profile and hasattr(self.profile, 'blood_group'):
            return self.profile.blood_group
        return self.guest_blood_group

    def __str__(self):
        return f"{self.get_donor_name()} donated on {self.donated_on}"


# ──────────────────────────────────────────────────────────────────────────────
# 4. CRICKET / SPORTS TOURNAMENT
# ──────────────────────────────────────────────────────────────────────────────
class SportsTeam(SamajBaseModel):
    event = models.ForeignKey(SamajEvent, on_delete=models.CASCADE, related_name='teams')
    team_name = models.CharField(max_length=100)
    captain = models.ForeignKey(
        'core_app.SamajProfile', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='captained_teams'
    )
    # 🌟 NEW: Team color for UI
    team_color = models.CharField(max_length=7, default='#3B82F6', help_text="Hex color e.g. #3B82F6")

    def __str__(self):
        return f"{self.team_name} ({self.event.title})"


class TournamentPlayer(SamajBaseModel):
    """
    Only registered (samaj member) profiles can be tournament players.
    """
    PLAYER_ROLES = [
        ('Batsman', 'Batsman'),
        ('Bowler', 'Bowler'),
        ('All-Rounder', 'All-Rounder'),
        ('Wicket-Keeper', 'Wicket-Keeper'),
    ]
    team = models.ForeignKey(SportsTeam, on_delete=models.CASCADE, related_name='players')
    profile = models.ForeignKey('core_app.SamajProfile', on_delete=models.CASCADE)
    player_role = models.CharField(max_length=50, choices=PLAYER_ROLES, blank=True, null=True)
    jersey_number = models.PositiveIntegerField(null=True, blank=True)  # 🌟 NEW

    class Meta:
        unique_together = ('team', 'profile')

    def __str__(self):
        return f"{self.profile.user.first_name} ({self.team.team_name})"


# ──────────────────────────────────────────────────────────────────────────────
# 5. SECRET POLLING SYSTEM
# ──────────────────────────────────────────────────────────────────────────────
class SecretPoll(SamajBaseModel):
    event = models.ForeignKey(SamajEvent, on_delete=models.CASCADE, related_name='polls', null=True, blank=True)
    question = models.CharField(max_length=500)
    status = models.CharField(
        max_length=20,
        choices=[('ACTIVE', 'Active'), ('PAUSED', 'Paused'), ('CLOSED', 'Closed')],  # 🌟 Added PAUSED
        default='ACTIVE'
    )
    expires_at = models.DateTimeField(null=True, blank=True)

    def auto_close_if_expired(self):
        """Call this before serializing to auto-close expired polls."""
        if self.status == 'ACTIVE' and self.expires_at and timezone.now() >= self.expires_at:
            self.status = 'CLOSED'
            self.save(update_fields=['status'])

    def __str__(self):
        return self.question


class PollOption(SamajBaseModel):
    poll = models.ForeignKey(SecretPoll, on_delete=models.CASCADE, related_name='options')
    option_text = models.CharField(max_length=200)

    @property
    def vote_count(self):
        return self.pollvote_set.count()

    def __str__(self):
        return f"{self.poll.question[:30]} → {self.option_text}"


class PollVote(SamajBaseModel):
    poll = models.ForeignKey(SecretPoll, on_delete=models.CASCADE)
    option = models.ForeignKey(PollOption, on_delete=models.CASCADE, related_name='pollvote_set')
    voter = models.ForeignKey('core_app.SamajProfile', on_delete=models.CASCADE)

    class Meta:
        unique_together = ('poll', 'voter')

    def __str__(self):
        return f"Vote by {self.voter}"


# ──────────────────────────────────────────────────────────────────────────────
# 6. EVENT GROUP CHAT
# ──────────────────────────────────────────────────────────────────────────────
class EventChatMessage(SamajBaseModel):
    event = models.ForeignKey(SamajEvent, on_delete=models.CASCADE, related_name='chat_messages')
    sender = models.ForeignKey('core_app.SamajProfile', on_delete=models.CASCADE)
    message = models.TextField()

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.user.first_name}: {self.message[:30]}"