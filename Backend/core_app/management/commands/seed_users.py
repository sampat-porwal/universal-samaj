import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core_app.models import SamajProfile

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed database with dummy verified users for testing'

    def handle(self, *args, **kwargs):
        self.stdout.write("Creating 20 Dummy Users... Please wait.")
        
        first_names = ["Amit", "Vikas", "Suresh", "Ramesh", "Sunita", "Pooja", "Anil", "Neha", "Kamal", "Rekha"]
        last_names = ["Suwalka", "Suwalka", "Suwalka", "Suwalka", "Suwalka", "Suwalka", "Suwalka", "Suwalka"]
        villages = ["Gangapur", "Godash", "Bhilwara", "Jaipur", "Udaipur", "Ajmer", "Kota"]
        gotras = ["Dhundra", "Anchera", "Ramdiya", "Jackwaliya", "rajora"]

        created_count = 0

        for i in range(1, 21):
            fname = random.choice(first_names)
            lname = random.choice(last_names)
            username = f"user{i}{random.randint(10,99)}"
            email = f"{username}@test.com"
            mobile = f"9876543{i:03d}"
            gender = 'M' if fname in ["Amit", "Vikas", "Suresh", "Ramesh", "Anil", "Kamal"] else 'F'

            if not User.objects.filter(username=username).exists():
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password="password123",
                    first_name=fname,
                    last_name=lname,
                    mobile_no=mobile,
                    role='USER',
                    is_active=True
                )

                SamajProfile.objects.create(
                    user=user,
                    samaj_id=f"S-TEST-1{i:03d}",
                    village_en=random.choice(villages),
                    gotra_en=random.choice(gotras),
                    gender=gender,
                    verification_status='VERIFIED'
                )
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully created {created_count} dummy users!"))
        self.stdout.write(self.style.SUCCESS("All users have password: password123"))