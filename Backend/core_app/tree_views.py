from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from .models import SamajProfile

class SamajFamilyTreeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, profile_id):
        # 1. Root Node ko pakdo
        root_profile = get_object_or_404(SamajProfile, id=profile_id)
        
        # 🌟 HIGH-SPEED FETCHING: Pre-fetch all profiles into memory to avoid N+1 DB Queries
        # Kyunki ek Samaj me max 50k-100k log honge, RAM me ID map rakhna database hit se 100x fast hai.
        all_profiles = SamajProfile.objects.select_related('user').prefetch_related('spouses').all()
        
        # Dictionary for instant O(1) lookup
        profile_map = {p.id: p for p in all_profiles}
        
        def build_node(profile_id, current_level, max_level=5):
            if current_level > max_level or profile_id not in profile_map:
                return None
                
            p = profile_map[profile_id]
            
            # Format Node Data
            node_data = {
                "id": p.id,
                "name": f"{p.user.first_name} {p.user.last_name}".strip() or p.user.username,
                "samaj_id": p.samaj_id,
                "image": p.profile_image.url if p.profile_image else None,
                "gender": p.gender,
                "gotra": p.gotra_en,
                "spouses": [],
                "children": []
            }
            
            # Add Spouses
            for spouse in p.spouses.all():
                node_data["spouses"].append({
                    "id": spouse.id,
                    "name": f"{spouse.user.first_name} {spouse.user.last_name}".strip() or spouse.user.username,
                    "image": spouse.profile_image.url if spouse.profile_image else None,
                    "gender": spouse.gender,
                })

            # Add Children (Sirf wahi bacche jinka pita ya mata ye profile hai)
            # Find children from the map to avoid DB query inside loop
            children_ids = [
                child.id for child in profile_map.values() 
                if child.father_id == profile_id or child.mother_id == profile_id
            ]
            
            for child_id in children_ids:
                child_node = build_node(child_id, current_level + 1, max_level)
                if child_node:
                    node_data["children"].append(child_node)
                    
            return node_data

        # 3. Build Tree from Root
        tree_data = build_node(root_profile.id, current_level=1)
        
        return Response(tree_data, status=status.HTTP_200_OK)