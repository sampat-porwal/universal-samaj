from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from collections import defaultdict
from .models import SamajProfile


class SamajFamilyTreeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, profile_id):
        # ── 1. Get requested root ────────────────────────────────────────────
        root_profile = get_object_or_404(SamajProfile, id=profile_id)

        # ── 2. Max level from query param (default 10, max allowed 15) ───────
        try:
            max_level = min(int(request.query_params.get('levels', 10)), 15)
        except (ValueError, TypeError):
            max_level = 10

        # ── 3. Load ALL profiles once into RAM (avoids N+1 queries) ──────────
        #    select_related('user') → no extra query for user fields
        #    prefetch_related('spouses') → no extra query for spouse M2M
        all_profiles = SamajProfile.objects.select_related('user').prefetch_related('spouses').only(
            'id', 'samaj_id', 'gender', 'gotra_en', 'profile_image',
            'father_id', 'mother_id',
            'user__first_name', 'user__last_name', 'user__username',
        )

        # ── 4. Build lookup structures (all O(1) access) ──────────────────────

        # id → profile object
        profile_map: dict = {}

        # parent_id → list of child profile ids
        # A child belongs to a parent if father_id OR mother_id matches
        children_of: dict = defaultdict(list)

        for p in all_profiles:
            profile_map[p.id] = p
            if p.father_id:
                children_of[p.father_id].append(p.id)
            if p.mother_id:
                children_of[p.mother_id].append(p.id)

        # ── 5. Iterative BFS tree builder (no recursion → no stack overflow) ──
        #
        # WHY ITERATIVE instead of recursive?
        # Python default recursion limit is 1000.
        # A 10-level tree with branching factor 5 = 5^10 = ~10M nodes worst case.
        # Iterative BFS using a queue is safe for any depth.

        def build_node_data(p_id: int) -> dict:
            """Build the dict shell for a node (no children yet)."""
            p = profile_map[p_id]
            name = f"{p.user.first_name} {p.user.last_name}".strip() or p.user.username
            node = {
                "id": p.id,
                "name": name,
                "samaj_id": p.samaj_id,
                "image": p.profile_image.url if p.profile_image else None,
                "gender": p.gender,
                "gotra": p.gotra_en,
                "spouses": [],
                "children": [],
            }
            for spouse in p.spouses.all():
                spouse_name = f"{spouse.user.first_name} {spouse.user.last_name}".strip() or spouse.user.username
                node["spouses"].append({
                    "id": spouse.id,
                    "name": spouse_name,
                    "image": spouse.profile_image.url if spouse.profile_image else None,
                    "gender": spouse.gender,
                })
            return node

        # BFS queue items: (profile_id, parent_node_dict, current_depth)
        root_node = build_node_data(root_profile.id)
        queue = [(root_profile.id, root_node, 1)]

        # Track visited to avoid circular references (e.g. if spouse loops)
        visited = {root_profile.id}

        while queue:
            current_id, current_node, depth = queue.pop(0)

            if depth >= max_level:
                # Still add children list as empty so frontend knows it's a leaf
                continue

            for child_id in children_of.get(current_id, []):
                if child_id in visited:
                    continue  # Prevent infinite loops from bad data
                visited.add(child_id)

                if child_id not in profile_map:
                    continue

                child_node = build_node_data(child_id)
                current_node["children"].append(child_node)

                # Queue child for its own children processing
                queue.append((child_id, child_node, depth + 1))

        # ── 6. Return ─────────────────────────────────────────────────────────
        return Response(root_node, status=status.HTTP_200_OK)