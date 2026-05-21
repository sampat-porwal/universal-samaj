from django.contrib import admin
from .models import (
    SamajEvent, EventOrganizer, BloodDonationRecord,
    SecretPoll, PollOption, PollVote,
    SportsTeam, TournamentPlayer
)

# ──────────────────────────────────────────────────────────────────────────────
# 1. UNIVERSAL EVENT ADMIN
# ──────────────────────────────────────────────────────────────────────────────
class EventOrganizerInline(admin.TabularInline):
    model = EventOrganizer
    extra = 1
    autocomplete_fields = ['profile'] # Easy searching for users

@admin.register(SamajEvent)
class SamajEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'event_type', 'event_scope', 'date_start', 'location_name', 'is_active')
    list_filter = ('event_type', 'event_scope', 'is_active', 'date_start')
    search_fields = ('title', 'description', 'location_name', 'target_district', 'target_city_village')
    inlines = [EventOrganizerInline]
    date_hierarchy = 'date_start'

# ──────────────────────────────────────────────────────────────────────────────
# 2. BLOOD DONATION ADMIN
# ──────────────────────────────────────────────────────────────────────────────
@admin.register(BloodDonationRecord)
class BloodDonationRecordAdmin(admin.ModelAdmin):
    list_display = ('get_donor_name', 'blood_group_display', 'event', 'donated_on')
    list_filter = ('donated_on', 'event', 'guest_blood_group')
    search_fields = ('guest_name', 'guest_mobile', 'profile__user__first_name', 'profile__samaj_id')
    autocomplete_fields = ['event', 'profile']

    def blood_group_display(self, obj):
        # Shows profile blood group if verified, else guest blood group
        # Assuming you will add blood_group to SamajProfile later, for now using guest field
        return obj.guest_blood_group or "Check Profile"
    blood_group_display.short_description = 'Blood Group'

# ──────────────────────────────────────────────────────────────────────────────
# 3. SECRET POLL ADMIN (With Options Inline)
# ──────────────────────────────────────────────────────────────────────────────
class PollOptionInline(admin.TabularInline):
    model = PollOption
    extra = 2

@admin.register(SecretPoll)
class SecretPollAdmin(admin.ModelAdmin):
    list_display = ('question', 'event', 'status', 'created_at')
    list_filter = ('status', 'event')
    search_fields = ('question',)
    inlines = [PollOptionInline] # Admin can create question & options on the same page!

@admin.register(PollVote)
class PollVoteAdmin(admin.ModelAdmin):
    list_display = ('poll', 'voter', 'option', 'created_at')
    list_filter = ('poll',)
    search_fields = ('voter__user__first_name', 'voter__samaj_id', 'poll__question')
    # NOTE: In production, you might want to hide this from simple admins to maintain extreme secrecy.

# ──────────────────────────────────────────────────────────────────────────────
# 4. SPORTS / CRICKET ADMIN
# ──────────────────────────────────────────────────────────────────────────────
class TournamentPlayerInline(admin.TabularInline):
    model = TournamentPlayer
    extra = 1
    autocomplete_fields = ['profile']

@admin.register(SportsTeam)
class SportsTeamAdmin(admin.ModelAdmin):
    list_display = ('team_name', 'event', 'captain')
    list_filter = ('event',)
    search_fields = ('team_name', 'captain__user__first_name')
    inlines = [TournamentPlayerInline] # Admin can add players while creating the team
    autocomplete_fields = ['event', 'captain']