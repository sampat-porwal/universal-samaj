from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SamajProfile, VerificationVote

# ==========================================
# 1. FAST UI CACHE SIGNAL (Family Tree)
# ==========================================
@receiver(post_save, sender=SamajProfile)
def sync_family_summary(sender, instance, created, **kwargs):
    """
    Jab bhi kisi profile ka data change hoga, ye function 
    unke relatives ka JSON cache update kar dega (Fast Next.js UI ke liye).
    """
    photo_url = instance.profile_image.url if instance.profile_image else None
    
    shared_data = {
        "id": instance.id,
        "samaj_id": instance.samaj_id,
        "name_en": f"{instance.user.first_name} {instance.user.last_name}",
        "name_hi": f"{instance.user.first_name_hi} {instance.user.last_name_hi}" if instance.user.first_name_hi else "",
        "photo": photo_url
    }

    # Auto-update Father
    if instance.father:
        instance.father.family_summary[f"child_{instance.id}"] = shared_data
        instance.father.save(update_fields=['family_summary'])

    # Auto-update Mother
    if instance.mother:
        instance.mother.family_summary[f"child_{instance.id}"] = shared_data
        instance.mother.save(update_fields=['family_summary'])

    # Auto-update Spouse
    if instance.spouse:
        instance.spouse.family_summary["partner"] = shared_data
        instance.spouse.save(update_fields=['family_summary'])


# ==========================================
# 2. SOCIAL NETWORK VERIFICATION SIGNAL
# ==========================================
@receiver(post_save, sender=VerificationVote)
def check_verification_quorum(sender, instance, created, **kwargs):
    """
    Jab bhi koi Core Member naya vote cast karega, ye total votes count karega.
    Jaise hi 5 votes pure honge, status automatically 'VERIFIED' ho jayega.
    """
    if created:
        profile = instance.pending_profile
        
        # Agar already verified hai toh process rok do (Server resource bachega)
        if profile.verification_status == 'VERIFIED':
            return

        # Total kitne core members ne is profile par vote diya hai?
        total_votes = profile.votes_received.count()
        
        # 🌟 THE 5-VOTE TRIGGER
        if total_votes >= 5:
            profile.verification_status = 'VERIFIED'
            profile.save(update_fields=['verification_status'])