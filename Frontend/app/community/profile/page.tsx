"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
    MapPin, Phone, Mail, ShieldCheck, Heart, Edit, Camera,
    X, Search, Clock, Users, AlertTriangle,
    Briefcase, Star, PlusCircle, Globe, Building2,
    UserCheck, Network, UserPlus, Droplets, GraduationCap,
    ArrowRight, Baby
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

// ── Helpers ────────────────────────────────────────────────────────────────────
const getImgUrl = (path: string) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `http://127.0.0.1:8000${path}`;
};

const RELATION_COLOR: Record<string, string> = {
    Father: 'bg-orange-50 border-orange-200 text-orange-700',
    Mother: 'bg-pink-50 border-pink-200 text-pink-700',
    Husband: 'bg-purple-50 border-purple-200 text-purple-700',
    Wife: 'bg-rose-50 border-rose-200 text-rose-700',
    Son: 'bg-green-50 border-green-200 text-green-700',
    Daughter: 'bg-teal-50 border-teal-200 text-teal-700',
    Brother: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    Sister: 'bg-violet-50 border-violet-200 text-violet-700',
};

// ── Small Avatar ───────────────────────────────────────────────────────────────
function MiniAvatar({ name, photo, size = 44 }: { name: string; photo?: string | null; size?: number }) {
    return (
        <div style={{ width: size, height: size, minWidth: size, borderRadius: '50%', overflow: 'hidden', border: '2px solid #e5e7eb', flexShrink: 0 }}>
            {photo ? (
                <img src={getImgUrl(photo)} alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                    onError={e => (e.currentTarget.style.display = 'none')} />
            ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: size * 0.35, background: '#dbeafe', color: '#1d4ed8' }}>
                    {name?.[0]?.toUpperCase() || '?'}
                </div>
            )}
        </div>
    );
}

// ── Role Badge ─────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
    const cfg: Record<string, { label: string; cls: string }> = {
        SUPERADMIN:  { label: '⚡ Super Admin',   cls: 'bg-red-100 text-red-700 border-red-200' },
        ADMIN:       { label: '🛡️ Admin',          cls: 'bg-orange-100 text-orange-700 border-orange-200' },
        CORE_ADMIN:  { label: '👑 Core Admin',     cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
        CORE_MEMBER: { label: '⭐ Core Member',    cls: 'bg-amber-100 text-amber-700 border-amber-200' },
        EVENT_ADMIN: { label: '🎯 Event Admin',    cls: 'bg-blue-100 text-blue-700 border-blue-200' },
        EVENT_USER:  { label: '🎪 Event Worker',   cls: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
        USER:        { label: '👤 Member',         cls: 'bg-gray-100 text-gray-600 border-gray-200' },
    };
    const c = cfg[role?.toUpperCase()] || cfg.USER;
    return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border ${c.cls}`}>{c.label}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function MyProfilePage() {
    const router = useRouter();
    const [authProfile, setAuthProfile] = useState<any>(null);
    const [samajProfile, setSamajProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [sentRequests, setSentRequests] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Link modal
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [allVerifiedProfiles, setAllVerifiedProfiles] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [selectedRelation, setSelectedRelation] = useState('');

    useEffect(() => { fetchMyData(); }, []);

    const fetchMyData = async () => {
        setIsLoading(true);
        try {
            const authRes = await api.get('/auth/profile/');
            setAuthProfile(authRes.data);
            const samajRes = await api.get('/samaj/profiles/');
            const mine = samajRes.data.find((p: any) => p.user.username === authRes.data.username);
            setSamajProfile(mine);
            setAllVerifiedProfiles(samajRes.data.filter((p: any) => p.verification_status === 'VERIFIED' && p.id !== mine?.id));
            const [pendRes, sentRes] = await Promise.all([
                api.get('/samaj/profiles/pending_requests/'),
                api.get('/samaj/profiles/sent_requests/'),
            ]);
            setPendingRequests(pendRes.data);
            setSentRequests(sentRes.data);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !samajProfile) return;
        const fd = new FormData();
        fd.append('profile_image', file);
        try {
            await api.patch(`/samaj/profiles/${samajProfile.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            fetchMyData();
        } catch { alert('Failed to upload photo.'); }
    };

    const handleRespondRequest = async (reqId: number, action: 'ACCEPT' | 'REJECT') => {
        try {
            await api.post('/samaj/profiles/respond_request/', { request_id: reqId, action });
            fetchMyData();
        } catch { alert('Something went wrong.'); }
    };

    const handleSendLinkRequest = async () => {
        try {
            await api.post('/samaj/profiles/send_family_request/', { receiver_id: selectedMember.id, relation_type: selectedRelation });
            setIsLinkModalOpen(false); setSelectedMember(null); setSelectedRelation('');
            fetchMyData();
        } catch (e: any) { alert(e.response?.data?.error || 'Failed to send request.'); }
    };

    const getRelationOptions = (gender: string) => {
        if (gender === 'M') return ['FATHER', 'SON', 'HUSBAND'];
        if (gender === 'F') return ['MOTHER', 'DAUGHTER', 'WIFE'];
        return [];
    };

    const searchResults = allVerifiedProfiles.filter(p => {
        if (!searchQuery) return true;
        const sq = searchQuery.toLowerCase();
        return `${p.user?.first_name} ${p.user?.last_name}`.toLowerCase().includes(sq)
            || p.village_en?.toLowerCase().includes(sq)
            || p.samaj_id?.toLowerCase().includes(sq);
    });

    // Build family list
    const familyMembers: { type: string; data: any }[] = [];
    if (samajProfile?.father?.id) familyMembers.push({ type: 'Father', data: samajProfile.father });
    if (samajProfile?.mother?.id) familyMembers.push({ type: 'Mother', data: samajProfile.mother });
    if (Array.isArray(samajProfile?.spouses)) {
        samajProfile.spouses.forEach((s: any) => familyMembers.push({ type: s.gender === 'M' ? 'Husband' : 'Wife', data: s }));
    }
    if (Array.isArray(samajProfile?.children)) {
        samajProfile.children.forEach((c: any) => familyMembers.push({ type: c.gender === 'M' ? 'Son' : 'Daughter', data: c }));
    }
    if (Array.isArray(samajProfile?.siblings)) {
        samajProfile.siblings.forEach((s: any) => familyMembers.push({ type: s.gender === 'M' ? 'Brother' : 'Sister', data: s }));
    }

    if (isLoading) return (
        <div className="p-6 max-w-4xl mx-auto space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-3xl animate-pulse" />)}
        </div>
    );

    if (!samajProfile) return (
        <div className="p-6 max-w-3xl mx-auto mt-10">
            <div className="bg-yellow-50 border border-yellow-200 p-8 rounded-3xl text-center">
                <AlertTriangle size={48} className="text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-gray-900 mb-2">No Samaj Profile Found</h2>
                <p className="text-gray-600 font-bold">No Samaj Profile is linked to your account.</p>
            </div>
        </div>
    );

    const empLabel: Record<string, string> = {
        GOVT: 'Government Job', PRIVATE: 'Private Job', BUSINESS: 'Business',
        SELF: 'Self Employed', OTHER: 'Other'
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto font-sans">

            {/* ── LINK FAMILY MODAL ── */}
            {isLinkModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center mb-5 shrink-0">
                            <h2 className="text-xl font-black text-gray-900">Link Family Member</h2>
                            <button onClick={() => { setIsLinkModalOpen(false); setSelectedMember(null); setSearchQuery(''); }}
                                className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition">
                                <X size={18} />
                            </button>
                        </div>

                        {!selectedMember ? (
                            <>
                                <div className="relative mb-4 shrink-0">
                                    <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                                    <input type="text" placeholder="Search by Name, Village, Samaj ID..."
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-300 text-sm font-medium" />
                                </div>
                                <div className="overflow-y-auto flex-1 space-y-2">
                                    {searchResults.length === 0
                                        ? <p className="text-center text-gray-400 py-8 text-sm font-bold">No verified members found.</p>
                                        : searchResults.map(p => (
                                            <div key={p.id} onClick={() => setSelectedMember(p)}
                                                className="p-3 border rounded-2xl flex items-center gap-3 hover:bg-blue-50 cursor-pointer transition">
                                                <MiniAvatar name={p.user?.first_name} photo={p.profile_image} size={40} />
                                                <div>
                                                    <p className="font-black text-sm text-gray-900">{p.user?.first_name} {p.user?.last_name}</p>
                                                    <p className="text-xs text-gray-400 font-medium">{p.samaj_id} · {p.village_en}</p>
                                                </div>
                                                <ArrowRight size={14} className="ml-auto text-gray-300" />
                                            </div>
                                        ))
                                    }
                                </div>
                            </>
                        ) : (
                            <div className="space-y-5">
                                <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-4 border border-blue-100">
                                    <MiniAvatar name={selectedMember.user?.first_name} photo={selectedMember.profile_image} size={52} />
                                    <div>
                                        <p className="font-black text-blue-900">{selectedMember.user?.first_name} {selectedMember.user?.last_name}</p>
                                        <p className="text-xs text-blue-600 font-bold">{selectedMember.gender === 'M' ? 'Male' : 'Female'} · {selectedMember.village_en}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-black text-gray-800 mb-2">
                                        How is {selectedMember.user?.first_name} related to you?
                                    </label>
                                    <select value={selectedRelation} onChange={e => setSelectedRelation(e.target.value)}
                                        className="w-full p-3 border-2 rounded-xl bg-gray-50 outline-none focus:border-blue-400 font-bold text-sm">
                                        <option value="">-- Select Relation --</option>
                                        {getRelationOptions(selectedMember.gender).map(r => (
                                            <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => { setSelectedMember(null); setSelectedRelation(''); }}
                                        className="flex-1 bg-gray-100 text-gray-600 font-black py-3 rounded-xl hover:bg-gray-200 transition text-sm">Back</button>
                                    <button onClick={handleSendLinkRequest} disabled={!selectedRelation}
                                        className="flex-1 bg-blue-600 text-white font-black py-3 rounded-xl disabled:opacity-50 hover:bg-blue-700 transition text-sm shadow">
                                        Send Request
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />

            {/* ── HERO CARD ── */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="h-28 md:h-36 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative">
                    {/* Dead/Alive indicator */}
                    {!samajProfile?.is_alive && (
                        <div className="absolute top-4 left-4 bg-gray-900/70 text-white text-xs font-black px-3 py-1.5 rounded-full backdrop-blur-sm">
                            🕊️ स्वर्गीय / Late
                        </div>
                    )}
                </div>

                <div className="px-6 md:px-8 pb-6 relative">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-14 md:-mt-16 mb-4">
                        {/* Profile photo */}
                        <div className="relative shrink-0 z-10" style={{ width: 110, height: 110 }}>
                            <div style={{ width: 110, height: 110, borderRadius: '50%', overflow: 'hidden', border: '5px solid white', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 900, color: '#1d4ed8' }}>
                                {samajProfile?.profile_image ? (
                                    <img src={getImgUrl(samajProfile.profile_image)} alt=""
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                                ) : (
                                    authProfile?.first_name?.[0]?.toUpperCase() || '?'
                                )}
                            </div>
                            <button onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0.5 right-0.5 bg-blue-600 text-white p-2 rounded-full border-4 border-white hover:bg-blue-700 transition shadow-lg z-20">
                                <Camera size={16} />
                            </button>
                        </div>

                        {/* Text Content & Edit Button Area */}
                        <div className="flex-1 md:mb-2 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h1 className="text-2xl md:text-3xl font-black text-gray-900">
                                        {authProfile?.first_name} {authProfile?.last_name}
                                    </h1>
                                    {!samajProfile?.is_alive && (
                                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-black">Late</span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className="text-sm font-bold text-gray-400">{samajProfile?.samaj_id}</span>
                                    <span className="text-gray-300">·</span>
                                    <span className="text-sm font-bold text-gray-500">{samajProfile?.village_en}</span>
                                    {samajProfile?.gotra_en && <>
                                        <span className="text-gray-300">·</span>
                                        <span className="text-sm font-bold text-gray-500">{samajProfile.gotra_en} Gotra</span>
                                    </>}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <RoleBadge role={authProfile?.role} />
                                    {samajProfile?.verification_status === 'VERIFIED' && (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-green-50 text-green-700 border border-green-200">
                                            <ShieldCheck size={12} /> Verified
                                        </span>
                                    )}
                                    {samajProfile?.is_core_member && (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-yellow-50 text-yellow-700 border border-yellow-200">
                                            <Star size={12} /> Core Member
                                        </span>
                                    )}
                                    {samajProfile?.blood_group && (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-red-50 text-red-600 border border-red-200">
                                            <Droplets size={12} /> {samajProfile.blood_group}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* NEW EDIT BUTTON PLACEMENT (Impossible to hide) */}
                            <button onClick={() => router.push('/community/profile/edit')}
                                className="bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm font-black shrink-0 w-full md:w-auto">
                                <Edit size={16} /> Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── INFO GRID ── */}
            <div className="grid md:grid-cols-2 gap-5 mb-6">

                {/* Personal & Contact */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-black text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <UserCheck size={14} className="text-blue-500" /> Personal & Contact
                    </h2>
                    <div className="space-y-3">
                        {authProfile?.mobile_no && (
                            <div className="flex items-center gap-3">
                                <Phone size={14} className="text-gray-400 shrink-0" />
                                <span className="text-sm font-bold text-gray-900">{authProfile.mobile_no}</span>
                            </div>
                        )}
                        {authProfile?.email && (
                            <div className="flex items-center gap-3">
                                <Mail size={14} className="text-gray-400 shrink-0" />
                                <span className="text-sm font-bold text-gray-900 truncate">{authProfile.email}</span>
                            </div>
                        )}
                        {samajProfile?.dob && (
                            <div className="flex items-center gap-3">
                                <Baby size={14} className="text-gray-400 shrink-0" />
                                <span className="text-sm font-bold text-gray-900">
                                    DOB: {new Date(samajProfile.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        )}
                        {samajProfile?.address_1 && (
                            <div className="flex items-start gap-3">
                                <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                                <span className="text-sm font-bold text-gray-700">{samajProfile.address_1}</span>
                            </div>
                        )}
                        {samajProfile?.gender && (
                            <div className="flex items-center gap-3">
                                <Users size={14} className="text-gray-400 shrink-0" />
                                <span className="text-sm font-bold text-gray-900">{samajProfile.gender === 'M' ? 'Male' : samajProfile.gender === 'F' ? 'Female' : 'Other'}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Profession */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-black text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Briefcase size={14} className="text-purple-500" /> Profession & Education
                    </h2>
                    <div className="space-y-3">
                        {samajProfile?.employment_type && (
                            <div className="flex items-center gap-3">
                                <Building2 size={14} className="text-gray-400 shrink-0" />
                                <span className="text-sm font-bold text-gray-900">{empLabel[samajProfile.employment_type] || samajProfile.employment_type}</span>
                            </div>
                        )}
                        {samajProfile?.occupation_en && (
                            <div className="flex items-center gap-3">
                                <Briefcase size={14} className="text-gray-400 shrink-0" />
                                <span className="text-sm font-bold text-gray-900">{samajProfile.occupation_en}</span>
                            </div>
                        )}
                        {samajProfile?.business_name && (
                            <div className="flex items-center gap-3">
                                <Star size={14} className="text-gray-400 shrink-0" />
                                <span className="text-sm font-bold text-gray-900">{samajProfile.business_name}</span>
                            </div>
                        )}
                        {samajProfile?.education && (
                            <div className="flex items-center gap-3">
                                <GraduationCap size={14} className="text-gray-400 shrink-0" />
                                <span className="text-sm font-bold text-gray-900">{samajProfile.education}</span>
                            </div>
                        )}
                        {samajProfile?.work_address && (
                            <div className="flex items-start gap-3">
                                <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                                <span className="text-sm font-bold text-gray-700">{samajProfile.work_address}</span>
                            </div>
                        )}
                        {!samajProfile?.occupation_en && !samajProfile?.education && (
                            <p className="text-sm text-gray-400 font-medium">Not added yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── EXTRA / CUSTOM INFO ── */}
            {samajProfile?.extra_details && Object.keys(samajProfile.extra_details).length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-5 mb-6">
                    <h2 className="text-sm font-black text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Globe size={14} className="text-blue-500" /> Additional Information
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(samajProfile.extra_details).map(([key, val]: any) => (
                            <div key={key} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wide mb-0.5">{key}</p>
                                <p className="text-sm font-black text-gray-900 truncate">{val}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── PENDING REQUESTS ── */}
            {pendingRequests.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-6">
                    <h2 className="text-sm font-black text-yellow-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Clock size={14} /> Pending Requests ({pendingRequests.length})
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="bg-white rounded-xl border border-yellow-100 p-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <MiniAvatar name={req.sender_name} photo={req.sender_image} size={40} />
                                    <div className="min-w-0">
                                        <p className="font-black text-sm text-gray-900 truncate">{req.sender_name}</p>
                                        <p className="text-xs text-gray-500 font-medium">
                                            wants to be your <span className="text-blue-600 font-black">{req.relation_type}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                    <button onClick={() => handleRespondRequest(req.id, 'REJECT')}
                                        className="bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-xs px-3 py-1.5 rounded-lg transition">✗</button>
                                    <button onClick={() => handleRespondRequest(req.id, 'ACCEPT')}
                                        className="bg-green-600 text-white hover:bg-green-700 font-bold text-xs px-3 py-1.5 rounded-lg transition">✓ Accept</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── FAMILY SECTION ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-black text-gray-500 uppercase tracking-wide flex items-center gap-2">
                        <Heart size={14} className="text-pink-500" /> Family Relationships ({familyMembers.length})
                    </h2>
                    <button onClick={() => setIsLinkModalOpen(true)}
                        className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-sm px-3 py-1.5 rounded-xl transition border border-blue-200">
                        <UserPlus size={13} /> Add
                    </button>
                </div>

                {familyMembers.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-xl">
                        <Network size={32} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400 font-bold">No family linked yet.</p>
                        <button onClick={() => setIsLinkModalOpen(true)}
                            className="mt-3 text-sm text-blue-600 font-black hover:underline">+ Link a family member</button>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {familyMembers.map((fam, idx) => {
                            const name = `${fam.data.user?.first_name || ''} ${fam.data.user?.last_name || ''}`.trim() || 'Unknown';
                            const relColor = RELATION_COLOR[fam.type] || 'bg-gray-50 border-gray-200 text-gray-600';
                            return (
                                <Link key={idx} href={`/community/directory/${fam.data.id}`}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition group">
                                    <MiniAvatar name={name} photo={fam.data.profile_image} size={44} />
                                    <div className="min-w-0 flex-1">
                                        <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${relColor}`}>
                                            {fam.type}
                                        </span>
                                        <p className="font-black text-sm text-gray-900 truncate mt-0.5 group-hover:text-blue-700 transition">{name}</p>
                                        <p className="text-[10px] text-gray-400 font-medium">{fam.data.samaj_id}</p>
                                    </div>
                                    <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-400 transition shrink-0" />
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}