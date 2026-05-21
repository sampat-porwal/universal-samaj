"""
samaj_csv_views.py  (v2 — roles + photo path)
==============================================
GET  /samaj/csv/export/   → Download all members as CSV
POST /samaj/csv/import/   → Upload CSV to restore full DB

NEW in v2:
  • Exports user role (SUPERADMIN/ADMIN/CORE_ADMIN/CORE_MEMBER/USER…)
  • Exports is_superuser, is_core_member flags
  • Exports profile_image_path (relative path inside MEDIA_ROOT)
    so you copy media/ folder once and re-import — photos auto-link
  • Import restores roles, superuser flags, core_member flags
  • Import links photos if file exists on disk (no re-upload needed)
  • Backward-compatible with v1 CSVs (no role columns → defaults to USER)
"""

import csv
import io
import os
from django.http import HttpResponse
from django.db import transaction
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .models import SamajProfile, AuditLog

User = get_user_model()

VALID_ROLES = {'SUPERADMIN', 'ADMIN', 'CORE_ADMIN', 'CORE_MEMBER',
               'EVENT_ADMIN', 'EVENT_USER', 'USER', 'STAFF'}


def log_activity(user, action, module, details):
    try:
        if user and not user.is_anonymous:
            AuditLog.objects.create(user=user, action=action, module=module, details=details)
    except Exception:
        pass


CSV_COLUMNS = [
    'samaj_id',
    'first_name',
    'last_name',
    'first_name_hi',
    'last_name_hi',
    'username',
    'mobile_no',
    'email',
    'gender',
    'dob',
    'role',               # SUPERADMIN / ADMIN / CORE_ADMIN / CORE_MEMBER / USER …
    'is_superuser',       # TRUE / FALSE
    'is_core_member',     # TRUE / FALSE  (SamajProfile flag)
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
    'is_alive',
    'verification_status',
    'registration_source',
    'father_samaj_id',
    'mother_samaj_id',
    'spouse_samaj_ids',
    'profile_image_path',   # relative path inside MEDIA_ROOT e.g. samaj_profiles/vivek.jpeg
    'profile_image_url',    # full http URL (reference only, ignored on import)
]


# ─────────────────────────────────────────────────────────────────────────────
# EXPORT
# ─────────────────────────────────────────────────────────────────────────────
class SamajCSVExportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        allowed_roles = ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN', 'CORE_MEMBER']
        if not (request.user.is_superuser or request.user.role in allowed_roles):
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)

        profiles = (
            SamajProfile.objects
            .select_related('user', 'father__user', 'mother__user')
            .prefetch_related('spouses')
            .order_by('samaj_id')
        )

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="samaj_export.csv"'
        response.write('\ufeff')  # UTF-8 BOM so Excel opens Hindi text correctly

        writer = csv.DictWriter(response, fieldnames=CSV_COLUMNS)
        writer.writeheader()

        for p in profiles:
            u = p.user
            spouse_ids = '|'.join(sp.samaj_id for sp in p.spouses.all())

            # Relative path (e.g. "samaj_profiles/vivek.jpeg") — survives server move
            img_path = str(p.profile_image) if p.profile_image else ''
            img_url = ''
            if p.profile_image:
                try:
                    img_url = request.build_absolute_uri(p.profile_image.url)
                except Exception:
                    img_url = getattr(p.profile_image, 'url', '')

            writer.writerow({
                'samaj_id':            p.samaj_id,
                'first_name':          u.first_name,
                'last_name':           u.last_name,
                'first_name_hi':       u.first_name_hi or '',
                'last_name_hi':        u.last_name_hi or '',
                'username':            u.username,
                'mobile_no':           u.mobile_no or '',
                'email':               u.email or '',
                'gender':              p.gender,
                'dob':                 str(p.dob) if p.dob else '',
                'role':                getattr(u, 'role', 'USER') or 'USER',
                'is_superuser':        'TRUE' if u.is_superuser else 'FALSE',
                'is_core_member':      'TRUE' if p.is_core_member else 'FALSE',
                'gotra_en':            p.gotra_en or '',
                'gotra_hi':            p.gotra_hi or '',
                'village_en':          p.village_en or '',
                'village_hi':          p.village_hi or '',
                'occupation_en':       p.occupation_en or '',
                'occupation_hi':       p.occupation_hi or '',
                'business_name':       p.business_name or '',
                'education':           p.education or '',
                'address_1':           p.address_1 or '',
                'address_2':           p.address_2 or '',
                'is_alive':            'TRUE' if p.is_alive else 'FALSE',
                'verification_status': p.verification_status,
                'registration_source': p.registration_source,
                'father_samaj_id':     p.father.samaj_id if p.father else '',
                'mother_samaj_id':     p.mother.samaj_id if p.mother else '',
                'spouse_samaj_ids':    spouse_ids,
                'profile_image_path':  img_path,
                'profile_image_url':   img_url,
            })

        log_activity(request.user, 'UPDATE', 'CSV Export',
                     f"Exported {profiles.count()} records (v2 with roles+photos)")
        return response


# ─────────────────────────────────────────────────────────────────────────────
# IMPORT
# ─────────────────────────────────────────────────────────────────────────────
class SamajCSVImportView(APIView):
    """
    Two-pass import strategy:
      Pass 1 – Create / update User + SamajProfile rows (no relations yet)
      Pass 2 – Link father / mother / spouses + restore photos

    Profile photos:
      If profile_image_path is set AND the file exists in MEDIA_ROOT,
      it is linked automatically — no re-upload needed.
      Just copy the old server's media/ folder to the new server first.

    Backward compatible:
      v1 CSVs (without role/is_superuser/is_core_member columns) are
      accepted — all users default to role=USER, is_superuser=False.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        allowed_roles = ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN', 'CORE_MEMBER']
        is_authorized = (
            request.user.is_superuser
            or request.user.role in allowed_roles
            or (hasattr(request.user, 'samaj_profile')
                and request.user.samaj_profile.is_core_member)
        )
        if not is_authorized:
            return Response({"error": "Access Denied."}, status=status.HTTP_403_FORBIDDEN)

        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({"error": "No file. Send CSV as multipart key='file'."}, status=400)
        if not uploaded.name.endswith('.csv'):
            return Response({"error": "Only .csv files accepted."}, status=400)

        try:
            raw = uploaded.read().decode('utf-8-sig')
        except UnicodeDecodeError:
            raw = uploaded.read().decode('latin-1')

        reader = csv.DictReader(io.StringIO(raw))
        fieldnames = set(reader.fieldnames or [])

        required = {'samaj_id', 'first_name', 'username', 'gender',
                    'father_samaj_id', 'mother_samaj_id', 'spouse_samaj_ids'}
        missing = required - fieldnames
        if missing:
            return Response({"error": f"Missing columns: {sorted(missing)}"}, status=400)

        is_v2 = 'role' in fieldnames   # v2 CSV has role column
        rows = list(reader)
        if not rows:
            return Response({"error": "CSV is empty."}, status=400)

        def safe_username(first_name, mobile):
            base = (first_name or 'user').lower().strip().replace(' ', '')
            base += str(mobile)[-4:] if mobile else get_random_string(
                4, 'abcdefghijklmnopqrstuvwxyz0123456789')
            username, counter = base, 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{counter}"
                counter += 1
            return username

        created_count = updated_count = 0
        skipped_rows = []
        relation_queue = []
        photo_warnings = []

        try:
            with transaction.atomic():

                # ── PASS 1: Users + Profiles ──────────────────────────────────
                for row_num, row in enumerate(rows, start=2):
                    samaj_id = row.get('samaj_id', '').strip()
                    if not samaj_id:
                        skipped_rows.append((row_num, '—', 'blank samaj_id'))
                        continue

                    first_name  = row.get('first_name', '').strip()
                    last_name   = row.get('last_name', '').strip()
                    username    = row.get('username', '').strip()
                    mobile_no   = row.get('mobile_no', '').strip() or None
                    email       = row.get('email', '').strip().lower() or None
                    gender      = row.get('gender', 'M').strip().upper() or 'M'
                    dob         = row.get('dob', '').strip() or None
                    is_alive    = row.get('is_alive', 'TRUE').strip().upper() != 'FALSE'
                    v_status    = row.get('verification_status', 'PENDING').strip().upper()
                    reg_source  = row.get('registration_source', 'BULK').strip().upper()

                    # Role fields — v2 only
                    role         = 'USER'
                    is_superuser = False
                    is_core_mem  = False
                    if is_v2:
                        role = row.get('role', 'USER').strip().upper()
                        if role not in VALID_ROLES:
                            role = 'USER'
                        is_superuser = row.get('is_superuser', 'FALSE').strip().upper() == 'TRUE'
                        is_core_mem  = row.get('is_core_member', 'FALSE').strip().upper() == 'TRUE'

                    existing = SamajProfile.objects.filter(samaj_id=samaj_id).first()

                    if existing:
                        # ── UPDATE existing record ────────────────────────────
                        u = existing.user
                        u.first_name = first_name or u.first_name
                        u.last_name  = last_name or u.last_name
                        u.mobile_no  = mobile_no or u.mobile_no
                        u.email      = email or u.email
                        if is_v2:
                            u.first_name_hi = row.get('first_name_hi', '').strip() or getattr(u, 'first_name_hi', '')
                            u.last_name_hi  = row.get('last_name_hi', '').strip() or getattr(u, 'last_name_hi', '')
                            u.role          = role
                            u.is_superuser  = is_superuser
                            u.is_staff      = is_superuser
                        u.save()

                        p = existing
                        p.gender              = gender
                        p.dob                 = dob
                        p.gotra_en            = row.get('gotra_en', '').strip() or p.gotra_en
                        p.gotra_hi            = row.get('gotra_hi', '').strip() or p.gotra_hi
                        p.village_en          = row.get('village_en', '').strip() or p.village_en
                        p.village_hi          = row.get('village_hi', '').strip() or p.village_hi
                        p.occupation_en       = row.get('occupation_en', '').strip() or p.occupation_en
                        p.occupation_hi       = row.get('occupation_hi', '').strip() or p.occupation_hi
                        p.business_name       = row.get('business_name', '').strip() or p.business_name
                        p.education           = row.get('education', '').strip() or p.education
                        p.address_1           = row.get('address_1', '').strip() or p.address_1
                        p.address_2           = row.get('address_2', '').strip() or p.address_2
                        p.is_alive            = is_alive
                        if is_v2:
                            p.is_core_member  = is_core_mem
                        if v_status in ('PENDING', 'VERIFIED', 'REJECTED'):
                            p.verification_status = v_status
                        if reg_source in ('SELF', 'BULK'):
                            p.registration_source = reg_source
                        p.save()
                        updated_count += 1

                    else:
                        # ── CREATE new record ─────────────────────────────────
                        if not username:
                            username = safe_username(first_name, mobile_no)
                        elif User.objects.filter(username=username).exists():
                            username = safe_username(first_name, mobile_no)

                        u = User(
                            username=username,
                            first_name=first_name,
                            last_name=last_name,
                            mobile_no=mobile_no,
                            email=email or f"{username}@samaj.local",
                            is_active=True,
                            is_superuser=is_superuser,
                            is_staff=is_superuser,
                        )
                        if is_v2:
                            u.role          = role
                            u.first_name_hi = row.get('first_name_hi', '').strip()
                            u.last_name_hi  = row.get('last_name_hi', '').strip()
                        # Password = Samaj@<mobile> (user can reset later)
                        u.set_password(f"Samaj@{mobile_no or get_random_string(8)}")
                        u.save()

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
                            is_core_member=is_core_mem,
                            verification_status=v_status if v_status in ('PENDING', 'VERIFIED', 'REJECTED') else 'PENDING',
                            registration_source=reg_source if reg_source in ('SELF', 'BULK') else 'BULK',
                        )
                        created_count += 1

                    relation_queue.append({
                        'samaj_id':           samaj_id,
                        'father_samaj_id':    row.get('father_samaj_id', '').strip(),
                        'mother_samaj_id':    row.get('mother_samaj_id', '').strip(),
                        'spouse_samaj_ids':   [s.strip() for s in row.get('spouse_samaj_ids', '').split('|') if s.strip()],
                        'profile_image_path': row.get('profile_image_path', '').strip(),
                    })

                # ── PASS 2: Relations + Photos ────────────────────────────────
                profile_map = {p.samaj_id: p for p in SamajProfile.objects.all()}
                relation_errors = []

                for rel in relation_queue:
                    sid = rel['samaj_id']
                    p = profile_map.get(sid)
                    if not p:
                        continue

                    changed = False

                    if rel['father_samaj_id']:
                        f = profile_map.get(rel['father_samaj_id'])
                        if f:
                            p.father = f; changed = True
                        else:
                            relation_errors.append(f"{sid}: father '{rel['father_samaj_id']}' not found")

                    if rel['mother_samaj_id']:
                        m = profile_map.get(rel['mother_samaj_id'])
                        if m:
                            p.mother = m; changed = True
                        else:
                            relation_errors.append(f"{sid}: mother '{rel['mother_samaj_id']}' not found")

                    # Photo: link if file already exists in MEDIA_ROOT
                    img_path = rel['profile_image_path']
                    if img_path and not p.profile_image:
                        full = os.path.join(settings.MEDIA_ROOT, img_path)
                        if os.path.exists(full):
                            p.profile_image = img_path
                            changed = True
                        else:
                            photo_warnings.append(
                                f"{sid}: '{img_path}' not found in MEDIA_ROOT — "
                                "copy old media/ folder to new server then re-import"
                            )

                    if changed:
                        p.save()

                    for sp_sid in rel['spouse_samaj_ids']:
                        sp = profile_map.get(sp_sid)
                        if sp:
                            p.spouses.add(sp); sp.spouses.add(p)
                        else:
                            relation_errors.append(f"{sid}: spouse '{sp_sid}' not found")

        except Exception as e:
            return Response({"error": f"Import failed (rolled back): {str(e)}"}, status=500)

        log_activity(request.user, 'CREATE', 'CSV Import',
                     f"v2 Import: {created_count} created, {updated_count} updated")

        photos_ok = len(photo_warnings) == 0
        return Response({
            "message":           "CSV Import completed!",
            "csv_version":       "v2 (roles restored)" if is_v2 else "v1 (all set to USER — re-export from new DB to upgrade)",
            "created":           created_count,
            "updated":           updated_count,
            "skipped":           len(skipped_rows),
            "skipped_detail":    skipped_rows,
            "relation_warnings": relation_errors,
            "photo_status":      "All photos linked!" if photos_ok else f"{len(photo_warnings)} photos need media/ folder copy",
            "photo_warnings":    photo_warnings,
            "next_steps":        [] if (photos_ok and is_v2) else [
                step for step in [
                    ("Copy media/ folder" if photo_warnings else None),
                    ("Re-export from this DB to get v2 CSV with roles" if not is_v2 else None),
                ] if step
            ],
        }, status=201)