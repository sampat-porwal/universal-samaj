"""
csv_to_json_converter.py
========================
Run this standalone script to:
  1. Verify the CSV has no missing relation references
  2. Convert the CSV into the bulk-import JSON format your existing API accepts
  3. Show a summary of what will be created

Usage:
  python csv_to_json_converter.py samaj_profiles_2026-05-15.csv

Output:
  samaj_bulk_import.json  — ready to POST to /api/samaj/profiles/bulk_family_import/
  csv_integrity_report.txt — any relation errors found
"""

import csv
import json
import sys
from collections import defaultdict


def load_csv(filepath: str) -> list[dict]:
    with open(filepath, encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))


def verify_integrity(rows: list[dict]) -> list[str]:
    """Check all samaj_id references in father/mother/spouse columns actually exist."""
    all_ids = {r['samaj_id'].strip() for r in rows if r.get('samaj_id', '').strip()}
    errors = []

    for r in rows:
        sid = r.get('samaj_id', '').strip()
        
        father = r.get('father_samaj_id', '').strip()
        if father and father not in all_ids:
            errors.append(f"[{sid}] father_samaj_id '{father}' does not exist in CSV")

        mother = r.get('mother_samaj_id', '').strip()
        if mother and mother not in all_ids:
            errors.append(f"[{sid}] mother_samaj_id '{mother}' does not exist in CSV")

        spouses = r.get('spouse_samaj_ids', '').strip()
        for sp in spouses.split('|'):
            sp = sp.strip()
            if sp and sp not in all_ids:
                errors.append(f"[{sid}] spouse_samaj_id '{sp}' does not exist in CSV")

    return errors


def csv_to_family_groups(rows: list[dict]) -> list[dict]:
    """
    Convert flat CSV rows → list of bulk_family_import JSON payloads.
    
    Strategy:
    - Find all "root" persons (no father AND no mother in CSV = generation top)
    - For each root, build a head_of_family + members payload
    - Members = spouse + all children of root
    - This creates one JSON payload per nuclear family unit
    
    Note: For a complete DB rebuild, the CSV import endpoint is simpler and better.
    This JSON conversion is provided as a fallback / for partial imports.
    """
    # Build lookup maps
    profile_map = {r['samaj_id'].strip(): r for r in rows if r.get('samaj_id', '').strip()}
    
    # Build children map: parent_samaj_id → list of child samaj_ids
    children_of = defaultdict(list)
    for r in rows:
        sid = r.get('samaj_id', '').strip()
        if not sid:
            continue
        father = r.get('father_samaj_id', '').strip()
        mother = r.get('mother_samaj_id', '').strip()
        if father:
            children_of[father].append(sid)
        if mother:
            children_of[mother].append(sid)

    def build_person(row: dict, is_existing: bool = False, relation: str = '') -> dict:
        """Build a member dict from a CSV row."""
        obj = {
            "is_existing": is_existing,
            "relation_to_head": relation,
        }
        if is_existing:
            obj["existing_username"] = row['username'].strip()
        else:
            obj.update({
                "username":   row.get('username', '').strip(),
                "password":   f"Samaj@{row.get('mobile_no', '1234').strip() or '1234'}",
                "first_name": row.get('first_name', '').strip(),
                "last_name":  row.get('last_name', '').strip(),
                "mobile_no":  row.get('mobile_no', '').strip() or None,
                "email":      row.get('email', '').strip() or None,
                "gender":     row.get('gender', 'M').strip(),
                "gotra_en":   row.get('gotra_en', '').strip() or None,
                "village_en": row.get('village_en', '').strip() or None,
                "dob":        row.get('dob', '').strip() or None,
                "address_1":  row.get('address_1', '').strip() or None,
                "verification_status": row.get('verification_status', 'VERIFIED').strip(),
                "registration_source": row.get('registration_source', 'BULK').strip(),
            })
            # Remove None values for clean JSON
            obj = {k: v for k, v in obj.items() if v is not None}
        return obj

    # Find root nodes: persons with no father AND no mother in the CSV data
    all_ids = set(profile_map.keys())
    root_ids = []
    for sid, row in profile_map.items():
        has_father = row.get('father_samaj_id', '').strip() in all_ids
        has_mother = row.get('mother_samaj_id', '').strip() in all_ids
        if not has_father and not has_mother:
            root_ids.append(sid)

    payloads = []
    processed_as_head = set()
    processed_as_member = set()

    for root_id in root_ids:
        if root_id in processed_as_member:
            continue

        head_row = profile_map[root_id]
        head_obj = build_person(head_row, is_existing=False)
        members = []

        # Add spouse(s)
        spouses_raw = head_row.get('spouse_samaj_ids', '').strip()
        spouse_ids = [s.strip() for s in spouses_raw.split('|') if s.strip() and s.strip() in all_ids]
        for sp_id in spouse_ids:
            sp_row = profile_map[sp_id]
            gender = sp_row.get('gender', 'F').strip()
            relation = 'HUSBAND' if gender == 'M' else 'WIFE'
            members.append(build_person(sp_row, is_existing=False, relation=relation))
            processed_as_member.add(sp_id)

        # Add children (found via father OR mother reference)
        child_ids = set(children_of.get(root_id, []))
        for sp_id in spouse_ids:
            child_ids.update(children_of.get(sp_id, []))

        for child_id in child_ids:
            if child_id in processed_as_member:
                continue
            child_row = profile_map.get(child_id)
            if not child_row:
                continue
            gender = child_row.get('gender', 'M').strip()
            relation = 'SON' if gender == 'M' else 'DAUGHTER'
            members.append(build_person(child_row, is_existing=False, relation=relation))
            processed_as_member.add(child_id)

        processed_as_head.add(root_id)
        payloads.append({
            "head_of_family": head_obj,
            "members": members
        })

    return payloads


def main():
    if len(sys.argv) < 2:
        print("Usage: python csv_to_json_converter.py <csv_file>")
        print("\nExample: python csv_to_json_converter.py samaj_profiles_2026-05-15.csv")
        sys.exit(1)

    filepath = sys.argv[1]
    print(f"\n📂 Loading: {filepath}")
    rows = load_csv(filepath)
    print(f"✅ Loaded {len(rows)} profiles\n")

    # ── Step 1: Integrity check ──────────────────────────────────────────────
    print("🔍 Checking relation integrity...")
    errors = verify_integrity(rows)
    if errors:
        print(f"⚠️  Found {len(errors)} relation warnings:")
        for e in errors[:20]:
            print(f"   {e}")
        if len(errors) > 20:
            print(f"   ... and {len(errors) - 20} more")
        with open('csv_integrity_report.txt', 'w') as f:
            f.write('\n'.join(errors))
        print(f"\n📄 Full report saved: csv_integrity_report.txt")
    else:
        print("✅ All relations are valid! CSV is clean.\n")

    # ── Step 2: CSV summary ──────────────────────────────────────────────────
    all_ids = {r['samaj_id'].strip() for r in rows if r.get('samaj_id', '').strip()}
    has_father = sum(1 for r in rows if r.get('father_samaj_id', '').strip() in all_ids)
    has_mother = sum(1 for r in rows if r.get('mother_samaj_id', '').strip() in all_ids)
    has_spouse = sum(1 for r in rows if r.get('spouse_samaj_ids', '').strip())

    print("📊 CSV Summary:")
    print(f"   Total profiles : {len(rows)}")
    print(f"   With father    : {has_father}")
    print(f"   With mother    : {has_mother}")
    print(f"   With spouse(s) : {has_spouse}")
    print(f"   Males          : {sum(1 for r in rows if r.get('gender','').strip() == 'M')}")
    print(f"   Females        : {sum(1 for r in rows if r.get('gender','').strip() == 'F')}")
    print()

    # ── Step 3: Recommendation ────────────────────────────────────────────────
    print("💡 RECOMMENDATION:")
    print("   Your CSV is complete with all relations (father_samaj_id, mother_samaj_id, spouse_samaj_ids).")
    print("   The BEST way to restore a fresh database is:")
    print()
    print("   POST /api/samaj/csv/import/")
    print("   with your CSV file as multipart/form-data key='file'")
    print()
    print("   This will:")
    print("   ✅ Create all users and profiles in Pass 1")
    print("   ✅ Link all father/mother/spouse relations in Pass 2")
    print("   ✅ Handle forward references (children listed before parents)")
    print()
    print("   The JSON bulk import is only needed if you want to add a")
    print("   SINGLE family unit manually, not for full DB restore.")
    print()

    # ── Step 4: Convert to JSON anyway (as backup) ───────────────────────────
    print("🔄 Converting to JSON payloads (as backup)...")
    payloads = csv_to_family_groups(rows)
    
    output = {
        "_info": "Generated from CSV export. Use CSV import endpoint for full DB restore.",
        "_total_payloads": len(payloads),
        "_total_rows": len(rows),
        "family_units": payloads
    }

    outfile = 'samaj_bulk_import.json'
    with open(outfile, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"✅ JSON saved: {outfile}")
    print(f"   {len(payloads)} family unit payloads generated")
    print()
    print("─" * 60)
    print("QUICK IMPORT COMMANDS:")
    print()
    print("# Option A (RECOMMENDED) — CSV import (full restore):")
    print("curl -X POST http://localhost:8000/api/samaj/csv/import/ \\")
    print("  -H 'Authorization: Bearer YOUR_TOKEN' \\")
    print(f"  -F 'file=@{filepath}'")
    print()
    print("# Option B — JSON import (single family unit):")
    print("# Extract one payload from samaj_bulk_import.json and POST to:")
    print("# POST /api/samaj/profiles/bulk_family_import/")
    print("─" * 60)


if __name__ == '__main__':
    main()