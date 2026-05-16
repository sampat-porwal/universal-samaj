"""
samaj_csv_views.py
==================
Two endpoints:
  GET  /samaj/csv/export/   → Download all members as CSV with relations
  POST /samaj/csv/import/   → Upload CSV to bulk-create members + link relations

CSV Column Order (exact):
  samaj_id, first_name, last_name, first_name_hi, last_name_hi,
  username, mobile_no, email, gender, dob,
  gotra_en, gotra_hi, village_en, village_hi,
  occupation_en, occupation_hi, business_name, education,
  address_1, address_2,
  is_alive, verification_status, registration_source,
  father_samaj_id, mother_samaj_id, spouse_samaj_ids,
  profile_image_url
"""

import csv
import io
from django.http import HttpResponse
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .models import SamajProfile, AuditLog

User = get_user_model()


def log_activity(user, action, module, details):
    try:
        if user and not user.is_anonymous:
            AuditLog.objects.create(user=user, action=action, module=module, details=details)
    except Exception:
        pass


# ──────────────────────────────────────────────────────────────────────────────
# CSV COLUMN DEFINITIONS  (single source of truth for both export & import)
# ──────────────────────────────────────────────────────────────────────────────
CSV_COLUMNS = [
    'samaj_id',
    'first_name',
    'last_name',
    'first_name_hi',
    'last_name_hi',
    'username',
    'mobile_no',
    'email',
    'gender',           # M / F / O
    'dob',              # YYYY-MM-DD or blank
    'gotra_en',
    'gotra_hi',
    'village_en',
    'village_hi',
    'occupation_en',
    'occupation_hi',
    'business_name',
    'education',
    'address_1',
    'address_2',
    'is_alive',         # TRUE / FALSE
    'verification_status',   # PENDING / VERIFIED / REJECTED
    'registration_source',   # SELF / BULK
    'father_samaj_id',       # samaj_id of father profile (blank if none)
    'mother_samaj_id',       # samaj_id of mother profile (blank if none)
    'spouse_samaj_ids',      # pipe-separated list: "S-001|S-002" (blank if none)
    'profile_image_url',     # full URL (read-only on import, ignored)
]


# ──────────────────────────────────────────────────────────────────────────────
# EXPORT VIEW
# ──────────────────────────────────────────────────────────────────────────────
class SamajCSVExportView(APIView):
    """
    GET /samaj/csv/export/
    Downloads all SamajProfile records as a UTF-8 CSV file.
    Relations are stored as samaj_id references so the file is
    human-readable AND re-importable.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Only admins / core members can export the full member list
        allowed_roles = ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN', 'CORE_MEMBER']
        if not (request.user.is_superuser or request.user.role in allowed_roles):
            return Response(
                {"error": "Access Denied: Only Admins or Core Members can export data."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ── Fetch everything in one shot (avoid N+1) ──────────────────────────
        profiles = (
            SamajProfile.objects
            .select_related('user', 'father__user', 'mother__user')
            .prefetch_related('spouses')
            .order_by('samaj_id')
        )

        # ── Build the HTTP response ───────────────────────────────────────────
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="samaj_members_export.csv"'

        # UTF-8 BOM so Excel opens it correctly without garbled Hindi text
        response.write('\ufeff')

        writer = csv.DictWriter(response, fieldnames=CSV_COLUMNS)
        writer.writeheader()

        for p in profiles:
            u = p.user

            # Spouse samaj_ids as pipe-separated string
            spouse_ids = '|'.join(
                sp.samaj_id for sp in p.spouses.all()
            )

            # Profile image absolute URL
            img_url = ''
            if p.profile_image:
                try:
                    img_url = request.build_absolute_uri(p.profile_image.url)
                except Exception:
                    img_url = p.profile_image.url

            writer.writerow({
                'samaj_id':           p.samaj_id,
                'first_name':         u.first_name,
                'last_name':          u.last_name,
                'first_name_hi':      u.first_name_hi or '',
                'last_name_hi':       u.last_name_hi or '',
                'username':           u.username,
                'mobile_no':          u.mobile_no or '',
                'email':              u.email or '',
                'gender':             p.gender,
                'dob':                str(p.dob) if p.dob else '',
                'gotra_en':           p.gotra_en or '',
                'gotra_hi':           p.gotra_hi or '',
                'village_en':         p.village_en or '',
                'village_hi':         p.village_hi or '',
                'occupation_en':      p.occupation_en or '',
                'occupation_hi':      p.occupation_hi or '',
                'business_name':      p.business_name or '',
                'education':          p.education or '',
                'address_1':          p.address_1 or '',
                'address_2':          p.address_2 or '',
                'is_alive':           'TRUE' if p.is_alive else 'FALSE',
                'verification_status': p.verification_status,
                'registration_source': p.registration_source,
                'father_samaj_id':    p.father.samaj_id if p.father else '',
                'mother_samaj_id':    p.mother.samaj_id if p.mother else '',
                'spouse_samaj_ids':   spouse_ids,
                'profile_image_url':  img_url,
            })

        log_activity(request.user, 'UPDATE', 'CSV Export', f"Exported {profiles.count()} member records")
        return response


# ──────────────────────────────────────────────────────────────────────────────
# IMPORT VIEW
# ──────────────────────────────────────────────────────────────────────────────
class SamajCSVImportView(APIView):
    """
    POST /samaj/csv/import/
    Accepts a multipart/form-data upload with key 'file' containing a CSV
    that matches the export format above.

    Strategy (two-pass):
      Pass 1 – Create / update User + SamajProfile rows (no relations yet).
               Uses samaj_id as the unique key: existing rows are UPDATED,
               new rows are CREATED.
      Pass 2 – Link father, mother, spouses using samaj_id references.
               Runs only after all profiles exist in DB.

    This way forward-references (e.g. a father listed after his children)
    are resolved correctly without requiring any specific row ordering.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # ── Auth check ───────────────────────────────────────────────────────
        allowed_roles = ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN', 'CORE_MEMBER']
        is_authorized = (
            request.user.is_superuser
            or request.user.role in allowed_roles
            or (
                hasattr(request.user, 'samaj_profile')
                and request.user.samaj_profile.is_core_member
            )
        )
        if not is_authorized:
            return Response(
                {"error": "Access Denied: Only Admins or Core Members can import data."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ── File validation ──────────────────────────────────────────────────
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({"error": "No file uploaded. Send CSV as 'file' field."}, status=status.HTTP_400_BAD_REQUEST)

        if not uploaded.name.endswith('.csv'):
            return Response({"error": "Only .csv files are accepted."}, status=status.HTTP_400_BAD_REQUEST)

        # Decode bytes → text (handle BOM)
        try:
            raw = uploaded.read().decode('utf-8-sig')   # utf-8-sig strips BOM automatically
        except UnicodeDecodeError:
            raw = uploaded.read().decode('latin-1')

        reader = csv.DictReader(io.StringIO(raw))

        # Validate columns
        missing = set(CSV_COLUMNS) - set(CSV_COLUMNS[-1:]) - set(reader.fieldnames or [])
        # profile_image_url is optional on import; remove from required set
        required_cols = set(CSV_COLUMNS) - {'profile_image_url'}
        missing_required = required_cols - set(reader.fieldnames or [])
        if missing_required:
            return Response(
                {"error": f"CSV is missing required columns: {sorted(missing_required)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rows = list(reader)
        if not rows:
            return Response({"error": "CSV file is empty."}, status=status.HTTP_400_BAD_REQUEST)

        # ── Helper: safe username generator ─────────────────────────────────
        def safe_username(first_name, mobile):
            base = f"{(first_name or 'user').lower().strip().replace(' ', '')}"
            if mobile:
                base += str(mobile)[-4:]
            else:
                base += get_random_string(4, 'abcdefghijklmnopqrstuvwxyz0123456789')
            username = base
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{counter}"
                counter += 1
            return username

        created_count  = 0
        updated_count  = 0
        skipped_rows   = []   # (row_number, samaj_id, reason)
        relation_queue = []   # deferred relation data for pass 2

        # ── PASS 1: Create / update profiles ─────────────────────────────────
        try:
            with transaction.atomic():
                for row_num, row in enumerate(rows, start=2):   # row 1 = header
                    samaj_id = row.get('samaj_id', '').strip()
                    if not samaj_id:
                        skipped_rows.append((row_num, '—', 'samaj_id is blank'))
                        continue

                    first_name = row.get('first_name', '').strip()
                    last_name  = row.get('last_name', '').strip()
                    username   = row.get('username', '').strip()
                    mobile_no  = row.get('mobile_no', '').strip() or None
                    email      = row.get('email', '').strip().lower() or None
                    gender     = row.get('gender', 'M').strip().upper() or 'M'
                    dob        = row.get('dob', '').strip() or None
                    is_alive   = row.get('is_alive', 'TRUE').strip().upper() != 'FALSE'
                    v_status   = row.get('verification_status', 'PENDING').strip().upper()
                    reg_source = row.get('registration_source', 'BULK').strip().upper()

                    # ── Find or create User ──────────────────────────────────
                    existing_profile = SamajProfile.objects.filter(samaj_id=samaj_id).first()

                    if existing_profile:
                        # UPDATE existing
                        u = existing_profile.user
                        u.first_name    = first_name
                        u.last_name     = last_name
                        u.first_name_hi = row.get('first_name_hi', '').strip() or u.first_name_hi
                        u.last_name_hi  = row.get('last_name_hi', '').strip() or u.last_name_hi
                        u.mobile_no     = mobile_no or u.mobile_no
                        u.email         = email or u.email
                        u.save()

                        p = existing_profile
                        p.gender             = gender
                        p.dob                = dob
                        p.gotra_en           = row.get('gotra_en', '').strip() or p.gotra_en
                        p.gotra_hi           = row.get('gotra_hi', '').strip() or p.gotra_hi
                        p.village_en         = row.get('village_en', '').strip() or p.village_en
                        p.village_hi         = row.get('village_hi', '').strip() or p.village_hi
                        p.occupation_en      = row.get('occupation_en', '').strip() or p.occupation_en
                        p.occupation_hi      = row.get('occupation_hi', '').strip() or p.occupation_hi
                        p.business_name      = row.get('business_name', '').strip() or p.business_name
                        p.education          = row.get('education', '').strip() or p.education
                        p.address_1          = row.get('address_1', '').strip() or p.address_1
                        p.address_2          = row.get('address_2', '').strip() or p.address_2
                        p.is_alive           = is_alive
                        p.verification_status = v_status if v_status in ('PENDING', 'VERIFIED', 'REJECTED') else p.verification_status
                        p.registration_source = reg_source if reg_source in ('SELF', 'BULK') else p.registration_source
                        p.save()
                        updated_count += 1

                    else:
                        # CREATE new user + profile
                        if not username:
                            username = safe_username(first_name, mobile_no)
                        elif User.objects.filter(username=username).exists():
                            username = safe_username(first_name, mobile_no)

                        u = User.objects.create_user(
                            username=username,
                            password=f"Samaj@{mobile_no or get_random_string(6)}",
                            first_name=first_name,
                            last_name=last_name,
                            mobile_no=mobile_no,
                            email=email or f"{username}@samaj.local",
                            is_active=True,
                        )
                        u.first_name_hi = row.get('first_name_hi', '').strip()
                        u.last_name_hi  = row.get('last_name_hi', '').strip()
                        u.save(update_fields=['first_name_hi', 'last_name_hi'])

                        p = SamajProfile.objects.create(
                            user=u,
                            samaj_id=samaj_id,
                            gender=gender,
                            dob=dob,
                            gotra_en=row.get('gotra_en', '').strip(),
                            gotra_hi=row.get('gotra_hi', '').strip(),
                            village_en=row.get('village_en', '').strip(),
                            village_hi=row.get('village_hi', '').strip(),
                            occupation_en=row.get('occupation_en', '').strip(),
                            occupation_hi=row.get('occupation_hi', '').strip(),
                            business_name=row.get('business_name', '').strip(),
                            education=row.get('education', '').strip(),
                            address_1=row.get('address_1', '').strip(),
                            address_2=row.get('address_2', '').strip(),
                            is_alive=is_alive,
                            verification_status=v_status if v_status in ('PENDING', 'VERIFIED', 'REJECTED') else 'PENDING',
                            registration_source=reg_source if reg_source in ('SELF', 'BULK') else 'BULK',
                        )
                        created_count += 1

                    # Queue relation data for pass 2
                    relation_queue.append({
                        'samaj_id':        samaj_id,
                        'father_samaj_id': row.get('father_samaj_id', '').strip(),
                        'mother_samaj_id': row.get('mother_samaj_id', '').strip(),
                        'spouse_samaj_ids': [
                            s.strip() for s in row.get('spouse_samaj_ids', '').split('|') if s.strip()
                        ],
                    })

                # ── PASS 2: Link relations ────────────────────────────────────
                # Build id map once — O(1) lookups
                profile_map = {p.samaj_id: p for p in SamajProfile.objects.all()}

                relation_errors = []
                for rel in relation_queue:
                    sid = rel['samaj_id']
                    p = profile_map.get(sid)
                    if not p:
                        continue

                    changed = False

                    # Father
                    if rel['father_samaj_id']:
                        father = profile_map.get(rel['father_samaj_id'])
                        if father:
                            p.father = father
                            changed = True
                        else:
                            relation_errors.append(f"{sid}: father '{rel['father_samaj_id']}' not found")

                    # Mother
                    if rel['mother_samaj_id']:
                        mother = profile_map.get(rel['mother_samaj_id'])
                        if mother:
                            p.mother = mother
                            changed = True
                        else:
                            relation_errors.append(f"{sid}: mother '{rel['mother_samaj_id']}' not found")

                    if changed:
                        p.save(update_fields=['father', 'mother'])

                    # Spouses (M2M — bidirectional)
                    for sp_sid in rel['spouse_samaj_ids']:
                        sp = profile_map.get(sp_sid)
                        if sp:
                            p.spouses.add(sp)
                            sp.spouses.add(p)
                        else:
                            relation_errors.append(f"{sid}: spouse '{sp_sid}' not found")

        except Exception as e:
            return Response(
                {"error": f"Import failed and rolled back: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        log_activity(
            request.user, 'CREATE', 'CSV Import',
            f"CSV Import: {created_count} created, {updated_count} updated, {len(skipped_rows)} skipped"
        )

        return Response({
            "message":        "CSV Import completed successfully!",
            "created":        created_count,
            "updated":        updated_count,
            "skipped":        len(skipped_rows),
            "skipped_detail": skipped_rows,
            "relation_warnings": relation_errors,   # non-fatal: profiles exist, relation ref was bad
        }, status=status.HTTP_201_CREATED)