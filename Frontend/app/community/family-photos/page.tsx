"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, CheckCircle, Users, Heart, User, Baby } from 'lucide-react';
import api from '@/lib/api';

// ── Relation config ────────────────────────────────────────────────────────────
const RELATION_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    Self:      { label: 'Self',     color: 'bg-blue-50 border-blue-200 text-blue-700',       icon: <User size={10} /> },
    Father:    { label: 'Father',   color: 'bg-orange-50 border-orange-200 text-orange-700', icon: <Users size={10} /> },
    Mother:    { label: 'Mother',   color: 'bg-pink-50 border-pink-200 text-pink-700',       icon: <Users size={10} /> },
    Husband:   { label: 'Husband',  color: 'bg-purple-50 border-purple-200 text-purple-700', icon: <Heart size={10} /> },
    Wife:      { label: 'Wife',     color: 'bg-rose-50 border-rose-200 text-rose-700',       icon: <Heart size={10} /> },
    Son:       { label: 'Son',      color: 'bg-green-50 border-green-200 text-green-700',    icon: <Baby size={10} /> },
    Daughter:  { label: 'Daughter', color: 'bg-teal-50 border-teal-200 text-teal-700',       icon: <Baby size={10} /> },
    Brother:   { label: 'Brother',  color: 'bg-indigo-50 border-indigo-200 text-indigo-700', icon: <Users size={10} /> },
    Sister:    { label: 'Sister',   color: 'bg-violet-50 border-violet-200 text-violet-700', icon: <Users size={10} /> },
};

const getImgUrl = (path: string) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `http://127.0.0.1:8000${path}`;
};

// ── Member Card ────────────────────────────────────────────────────────────────
function MemberCard({
    type, data, isSelf, isUploading, targetUploadId, onUpload
}: {
    type: string; data: any; isSelf: boolean;
    isUploading: boolean; targetUploadId: number | null;
    onUpload: (id: number) => void;
}) {
    const meta = RELATION_META[type] || RELATION_META['Self'];
    const hasPhoto = !!data.profile_image;
    const uploading = isUploading && targetUploadId === data.id;
    const name = `${data.user?.first_name || ''} ${data.user?.last_name || ''}`.trim();
    const initial = data.user?.first_name?.charAt(0)?.toUpperCase() || '?';

    return (
        <div className={`rounded-2xl border-2 p-5 flex flex-col items-center text-center shadow-sm transition-all hover:shadow-md ${
            isSelf ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-gray-200'
        }`}>
            {/* Relation badge */}
            <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border mb-4 ${meta.color}`}>
                {meta.icon} {meta.label}
            </span>

            {/* Avatar */}
            <div className="relative w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center text-3xl font-black text-gray-400 overflow-hidden mb-4 shrink-0">
                <span className="absolute z-0 select-none">{initial}</span>
                {hasPhoto && (
                    <img src={getImgUrl(data.profile_image)} alt={name}
                        className="absolute inset-0 w-full h-full object-cover z-10" />
                )}
                {hasPhoto && (
                    <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5 z-20 shadow border-2 border-white">
                        <CheckCircle size={11} className="text-white" />
                    </div>
                )}
            </div>

            {/* Name + ID */}
            <h3 className="font-black text-gray-900 text-base leading-tight mb-0.5">{name}</h3>
            <p className="text-xs font-bold text-gray-400 mb-5">{data.samaj_id}</p>

            {/* Upload button */}
            <button
                onClick={() => onUpload(data.id)}
                disabled={uploading}
                className={`w-full py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm border ${
                    uploading
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : hasPhoto
                            ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                            : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                }`}
            >
                {uploading
                    ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full" /> Uploading...</>
                    : <><Camera size={15} /> {hasPhoto ? 'Update Photo' : 'Upload Photo'}</>
                }
            </button>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function FamilyPhotoManagerPage() {
    const [authProfile, setAuthProfile] = useState<any>(null);
    const [myProfile, setMyProfile] = useState<any>(null);
    const [familyMembers, setFamilyMembers] = useState<{ type: string; data: any }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [targetUploadId, setTargetUploadId] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => { fetchMyData(); }, []);

    const fetchMyData = async () => {
        setIsLoading(true);
        setError('');
        try {
            // Step 1: Get logged-in user info
            const authRes = await api.get('/auth/profile/');
            setAuthProfile(authRes.data);

            // Step 2: Get all profiles to find self + full data
            const samajRes = await api.get('/samaj/profiles/');
            const allProfiles: any[] = samajRes.data;

            // Find self by username match
            const self = allProfiles.find((p: any) => p.user.username === authRes.data.username);
            if (!self) { setError('Your samaj profile was not found.'); return; }
            setMyProfile(self);

            // ── Build core family list ─────────────────────────────────────────
            const members: { type: string; data: any }[] = [];

            // 1. Self
            members.push({ type: 'Self', data: self });

            // 2. Father
            if (self.father?.id) members.push({ type: 'Father', data: self.father });

            // 3. Mother
            if (self.mother?.id) members.push({ type: 'Mother', data: self.mother });

            // 4. Spouse(s) — THE FIX: use `spouses` (ManyToMany, array), NOT `spouse`
            //    Also handle BOTH directions:
            //    a) spouses field on my own profile (I linked them)
            //    b) Someone else has ME in THEIR spouses (reverse: they linked me)
            const spouseIds = new Set<number>();

            // Direction A: spouses I know about
            if (Array.isArray(self.spouses) && self.spouses.length > 0) {
                self.spouses.forEach((sp: any) => {
                    if (sp?.id && !spouseIds.has(sp.id)) {
                        spouseIds.add(sp.id);
                        const spouseType = sp.gender === 'M' ? 'Husband' : 'Wife';
                        members.push({ type: spouseType, data: sp });
                    }
                });
            }

            // Direction B: search ALL profiles to find who has ME in their spouses
            // (covers case where the link was added from the other person's side)
            allProfiles.forEach((p: any) => {
                if (p.id === self.id) return; // skip self
                if (spouseIds.has(p.id)) return; // already added
                if (Array.isArray(p.spouses)) {
                    const iAmTheirSpouse = p.spouses.some((sp: any) => sp.id === self.id);
                    if (iAmTheirSpouse) {
                        spouseIds.add(p.id);
                        const spouseType = p.gender === 'M' ? 'Husband' : 'Wife';
                        members.push({ type: spouseType, data: p });
                    }
                }
            });

            // 5. Children — use the `children` field from serializer (already computed)
            //    Also check reverse: profiles whose father/mother is me
            const childIds = new Set<number>();
            if (Array.isArray(self.children)) {
                self.children.forEach((child: any) => {
                    if (child?.id && !childIds.has(child.id)) {
                        childIds.add(child.id);
                        const relType = child.gender === 'M' ? 'Son' : 'Daughter';
                        members.push({ type: relType, data: child });
                    }
                });
            }

            // Also scan all profiles for children pointing to me
            // (in case serializer `children` field missed some)
            allProfiles.forEach((p: any) => {
                if (p.id === self.id) return;
                if (childIds.has(p.id)) return;
                const iAmFather = p.father?.id === self.id;
                const iAmMother = p.mother?.id === self.id;
                if (iAmFather || iAmMother) {
                    childIds.add(p.id);
                    const relType = p.gender === 'M' ? 'Son' : 'Daughter';
                    members.push({ type: relType, data: p });
                }
            });

            // 6. Siblings (Brothers & Sisters)
            //    A sibling shares at least one parent with me.
            //    Use the `siblings` field from serializer first, then scan all profiles.
            const siblingIds = new Set<number>();

            // From serializer siblings field
            if (Array.isArray(self.siblings)) {
                self.siblings.forEach((sib: any) => {
                    if (sib?.id && !siblingIds.has(sib.id)) {
                        siblingIds.add(sib.id);
                        const relType = sib.gender === 'M' ? 'Brother' : 'Sister';
                        members.push({ type: relType, data: sib });
                    }
                });
            }

            // Fallback scan: find profiles sharing father OR mother with me
            // (catches cases where serializer missed due to partial links)
            if (self.father?.id || self.mother?.id) {
                allProfiles.forEach((p: any) => {
                    if (p.id === self.id) return;           // skip self
                    if (siblingIds.has(p.id)) return;       // already added
                    if (childIds.has(p.id)) return;         // don't double-count children
                    if (spouseIds.has(p.id)) return;        // don't double-count spouse

                    const sharesFather = self.father?.id && p.father?.id === self.father.id;
                    const sharesMother = self.mother?.id && p.mother?.id === self.mother.id;

                    if (sharesFather || sharesMother) {
                        siblingIds.add(p.id);
                        const relType = p.gender === 'M' ? 'Brother' : 'Sister';
                        members.push({ type: relType, data: p });
                    }
                });
            }

            setFamilyMembers(members);
        } catch (err: any) {
            console.error('Failed to load profile data', err);
            setError('Failed to load family data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const initiateUpload = (profileId: number) => {
        setTargetUploadId(profileId);
        fileInputRef.current?.click();
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !targetUploadId) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('profile_image', file);

        try {
            await api.patch(
                `/samaj/profiles/${targetUploadId}/update_family_photo/`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            await fetchMyData(); // Refresh all cards
        } catch (err: any) {
            alert(err.response?.data?.error || '❌ Failed to upload photo. You may not have permission.');
        } finally {
            setIsUploading(false);
            setTargetUploadId(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-gray-500 font-bold text-sm">Loading family data...</p>
        </div>
    );

    if (error) return (
        <div className="p-10 text-center">
            <p className="text-red-500 font-bold">{error}</p>
            <button onClick={fetchMyData} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm">
                Retry
            </button>
        </div>
    );

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto font-sans">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                    <ImageIcon className="text-blue-600 shrink-0" size={30} /> Family Photo Manager
                </h1>
                {/* <p className="text-gray-500 font-medium mt-1 text-sm">
                    Manage profile photos for yourself and your core family. Core family = Self, Parents, Spouse, Children.
                </p> */}
            </div>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
            />

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
                {/* Section header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                    <h2 className="font-black text-xl text-gray-800 flex items-center gap-2">
                        <Users className="text-blue-500" size={20} />
                        Core Family Members ({familyMembers.length})
                    </h2>
                </div>

                {familyMembers.length === 0 ? (
                    <div className="py-16 text-center text-gray-400">
                        <Users size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold">No family members linked yet.</p>
                        <p className="text-sm mt-1">Use My Tree to link your parents, spouse, and children.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {familyMembers.map((fam, idx) => (
                            <MemberCard
                                key={`${fam.type}-${fam.data.id}-${idx}`}
                                type={fam.type}
                                data={fam.data}
                                isSelf={fam.type === 'Self'}
                                isUploading={isUploading}
                                targetUploadId={targetUploadId}
                                onUpload={initiateUpload}
                            />
                        ))}
                    </div>
                )}

                {/* Info note */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 font-medium flex items-start gap-2">
                        <span className="shrink-0 mt-0.5">ℹ️</span>
                        You can upload photos for yourself and your direct family — parents, spouse, brothers, sisters, and children.
                        If a family member is missing, link them first using <strong>My Tree</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
}