from django.db import models
from django.conf import settings

# 🌟 IMPORTING YOUR ABSTRACT BASE MODEL FROM CORE APP
from core_app.models import SamajBaseModel

# ──────────────────────────────────────────────────────────────────────────────
# 1. UNIVERSAL EVENT SYSTEM (With City/District Scope)
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
        ('GLOBAL', 'Whole Samaj (Everyone)'),
        ('DISTRICT', 'District Level'),
        ('CITY', 'City / Village Level'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    
    event_scope = models.CharField(max_length=20, choices=EVENT_SCOPES, default='GLOBAL')
    target_district = models.CharField(max_length=100, blank=True, null=True, help_text="Fill if scope is DISTRICT or CITY")
    target_city_village = models.CharField(max_length=100, blank=True, null=True, help_text="Fill if scope is CITY")
    
    date_start = models.DateField()
    date_end = models.DateField(blank=True, null=True)
    location_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.title} ({self.get_event_scope_display()})"


class EventOrganizer(SamajBaseModel):
    """ Separation of Power: Only Verified Profiles managing the event """
    event = models.ForeignKey(SamajEvent, on_delete=models.CASCADE, related_name='organizers')
    profile = models.ForeignKey('core_app.SamajProfile', on_delete=models.CASCADE)
    role_title = models.CharField(max_length=100, help_text="e.g. Main Coordinator, Fund Manager")
    
    class Meta:
        unique_together = ('event', 'profile')

    def __str__(self):
        return f"{self.profile.user.first_name} - {self.role_title}"


# ──────────────────────────────────────────────────────────────────────────────
# 2. BLOOD DONATION CAMP (BDC) ENGINE - For Verified & Guests
# ──────────────────────────────────────────────────────────────────────────────
class BloodDonationRecord(SamajBaseModel):
    event = models.ForeignKey(SamajEvent, on_delete=models.SET_NULL, null=True, blank=True)
    profile = models.ForeignKey('core_app.SamajProfile', on_delete=models.SET_NULL, null=True, blank=True)
    guest_name = models.CharField(max_length=150, blank=True, null=True)
    guest_mobile = models.CharField(max_length=15, blank=True, null=True)
    guest_blood_group = models.CharField(max_length=5, blank=True, null=True, help_text="e.g., O+, A-, B+")
    donated_on = models.DateField()
    remarks = models.TextField(blank=True, null=True)

    def get_donor_name(self):
        if self.profile:
            return f"{self.profile.user.first_name} (Verified)"
        return f"{self.guest_name} (Guest)"
        
    def __str__(self):
        return f"{self.get_donor_name()} donated on {self.donated_on}"


# ──────────────────────────────────────────────────────────────────────────────
# 3. SECRET POLLING & VOTING SYSTEM (Decision Making)
# ──────────────────────────────────────────────────────────────────────────────
class SecretPoll(SamajBaseModel):
    event = models.ForeignKey(SamajEvent, on_delete=models.CASCADE, related_name='polls', null=True, blank=True)
    question = models.CharField(max_length=500)
    status = models.CharField(max_length=20, choices=[('ACTIVE', 'Active & Hidden'), ('CLOSED', 'Closed & Results Declared')], default='ACTIVE')
    expires_at = models.DateTimeField(null=True, blank=True, help_text="When the poll automatically closes")
    
    def __str__(self):
        return self.question

class PollOption(SamajBaseModel):
    poll = models.ForeignKey(SecretPoll, on_delete=models.CASCADE, related_name='options')
    option_text = models.CharField(max_length=200)

    def __str__(self):
        return f"{self.poll.question} -> {self.option_text}"

class PollVote(SamajBaseModel):
    poll = models.ForeignKey(SecretPoll, on_delete=models.CASCADE)
    option = models.ForeignKey(PollOption, on_delete=models.CASCADE)
    voter = models.ForeignKey('core_app.SamajProfile', on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ('poll', 'voter')

    def __str__(self):
        return "Secret Vote"


# ──────────────────────────────────────────────────────────────────────────────
# 4. SPORTS / CRICKET TOURNAMENT MODULE
# ──────────────────────────────────────────────────────────────────────────────
class SportsTeam(SamajBaseModel):
    event = models.ForeignKey(SamajEvent, on_delete=models.CASCADE, related_name='teams')
    team_name = models.CharField(max_length=100)
    captain = models.ForeignKey('core_app.SamajProfile', on_delete=models.SET_NULL, null=True, related_name='captained_teams')
    
    def __str__(self):
        return self.team_name

class TournamentPlayer(SamajBaseModel):
    team = models.ForeignKey(SportsTeam, on_delete=models.CASCADE, related_name='players')
    profile = models.ForeignKey('core_app.SamajProfile', on_delete=models.CASCADE)
    player_role = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. Batsman, Bowler, All-Rounder")
    
    class Meta:
        unique_together = ('team', 'profile')

    def __str__(self):
        return f"{self.profile.user.first_name} ({self.team.team_name})"
    

# ──────────────────────────────────────────────────────────────────────────────
# 5. EVENT PARTICIPATION & REGISTRATION
# ──────────────────────────────────────────────────────────────────────────────
class EventParticipant(SamajBaseModel):
    """ Tracks which verified user has registered/joined an event """
    event = models.ForeignKey(SamajEvent, on_delete=models.CASCADE, related_name='participants')
    profile = models.ForeignKey('core_app.SamajProfile', on_delete=models.CASCADE, related_name='event_registrations')
    status = models.CharField(max_length=20, default='REGISTERED') 
    
    class Meta:
        unique_together = ('event', 'profile')

    def __str__(self):
        return f"{self.profile.user.first_name} joined {self.event.title}"


# ──────────────────────────────────────────────────────────────────────────────
# 6. EVENT GROUP CHAT (WHATSAPP STYLE) 🌟 FIX IS HERE 🌟
# ──────────────────────────────────────────────────────────────────────────────
class EventChatMessage(SamajBaseModel):
    """ Secure group chat for committee members of an event """
    event = models.ForeignKey(SamajEvent, on_delete=models.CASCADE, related_name='chat_messages')
    sender = models.ForeignKey('core_app.SamajProfile', on_delete=models.CASCADE)
    message = models.TextField()

    class Meta:
        ordering = ['created_at'] # Shows oldest first, newest at bottom

    def __str__(self):
        return f"{self.sender.user.first_name}: {self.message[:20]}"