"use client";
import React, { useState, useEffect, useRef } from 'react';
// 🌟 FIX: Added 'Users' to the import list below!
import { MapPin, Phone, Mail, ShieldCheck, Heart, Edit, Camera, X, Search, Clock, CheckCircle, Send, Trash2, UserCheck, Users } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export default function MyProfilePage() {
    const [authProfile, setAuthProfile] = useState<any>(null);
    const [samajProfile, setSamajProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ mobile_no: '', village_en: '', gotra_en: '' });
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [allVerifiedProfiles, setAllVerifiedProfiles] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [selectedRelation, setSelectedRelation] = useState('');
    
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [sentRequests, setSentRequests] = useState<any[]>([]); 

    useEffect(() => {
        fetchMyData();
    }, []);

    const fetchMyData = async () => {
        try {
            const authRes = await api.get('/auth/profile/');
            setAuthProfile(authRes.data);

            const samajRes = await api.get('/samaj/profiles/');
            const myProfile = samajRes.data.find((p: any) => p.user.username === authRes.data.username);
            setSamajProfile(myProfile);

            if (myProfile && authRes.data) {
                setEditForm({ mobile_no: authRes.data.mobile_no || '', village_en: myProfile.village_en || '', gotra_en: myProfile.gotra_en || '' });
            }

            const verified = samajRes.data.filter((p: any) => p.verification_status === 'VERIFIED' && p.id !== myProfile?.id);
            setAllVerifiedProfiles(verified);

            const requestsRes = await api.get('/samaj/profiles/pending_requests/');
            setPendingRequests(requestsRes.data);

            const sentRes = await api.get('/samaj/profiles/sent_requests/');
            setSentRequests(sentRes.data);

        } catch (error) { console.error("Failed to load profile", error); } 
        finally { setIsLoading(false); }
    };

    const getImgUrl = (path: string) => {
        if (!path) return '';
        return path.startsWith('http') ? path : `http://127.0.0.1:8000${path}`;
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !samajProfile) return;
        const formData = new FormData();
        formData.append('profile_image', file);
        try {
            await api.patch(`/samaj/profiles/${samajProfile.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            alert("✅ Profile photo updated successfully!");
            fetchMyData(); 
        } catch (error) { alert("❌ Failed to upload photo."); }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.patch('/auth/profile/', { mobile_no: editForm.mobile_no });
            await api.patch(`/samaj/profiles/${samajProfile.id}/`, { village_en: editForm.village_en, gotra_en: editForm.gotra_en });
            alert("✅ Profile details updated!");
            setIsEditing(false);
            fetchMyData(); 
        } catch (error) { alert("❌ Failed to update profile details."); } 
        finally { setIsSaving(false); }
    };

    const handleSendLinkRequest = async () => {
        try {
            await api.post('/samaj/profiles/send_family_request/', {
                receiver_id: selectedMember.id,
                relation_type: selectedRelation
            });
            alert(`✅ Request Sent! Waiting for ${selectedMember.user.first_name} to accept.`);
            setIsLinkModalOpen(false);
            setSelectedMember(null);
            setSelectedRelation('');
            fetchMyData(); 
        } catch (error: any) { alert(error.response?.data?.error || "❌ Failed to send request."); }
    };

    const handleRespondRequest = async (reqId: number, action: 'ACCEPT' | 'REJECT') => {
        try {
            await api.post('/samaj/profiles/respond_request/', { request_id: reqId, action: action });
            alert(`✅ Request ${action}ED successfully!`);
            fetchMyData(); 
        } catch (error) { alert("❌ Something went wrong."); }
    };

    const handleCancelRequest = async (reqId: number) => {
        if(!confirm("Are you sure you want to cancel this request?")) return;
        try {
            await api.post('/samaj/profiles/cancel_family_request/', { request_id: reqId });
            alert(`✅ Request cancelled successfully!`);
            fetchMyData(); 
        } catch (error) { alert("❌ Failed to cancel request."); }
    };

    const getRelationOptions = (gender: string) => {
        if (gender === 'M') return ['Father', 'Son', 'Husband'];
        if (gender === 'F') return ['Mother', 'Daughter', 'Wife'];
        return [];
    };

    const searchResults = allVerifiedProfiles.filter(p => {
        if (!searchQuery) return true;
        const name = `${p.user?.first_name} ${p.user?.last_name}`.toLowerCase();
        const sq = searchQuery.toLowerCase();
        return name.includes(sq) || (p.village_en && p.village_en.toLowerCase().includes(sq)) || (p.samaj_id && p.samaj_id.toLowerCase().includes(sq));
    });

    if (isLoading) return <div className="p-6 max-w-3xl mx-auto space-y-6"><div className="h-40 bg-gray-200 rounded-3xl animate-pulse"></div><div className="h-64 bg-gray-200 rounded-3xl animate-pulse"></div></div>;

    // 🌟 BUILD FULL FAMILY ARRAY (Core + Secondary)
    const familyMembers: any[] = [];
    if (samajProfile?.father && samajProfile.father.id) familyMembers.push({ type: 'Father', data: samajProfile.father });
    if (samajProfile?.mother && samajProfile.mother.id) familyMembers.push({ type: 'Mother', data: samajProfile.mother });
    if (samajProfile?.spouse && samajProfile.spouse.id) familyMembers.push({ type: 'Spouse', data: samajProfile.spouse });
    if (samajProfile?.children && Array.isArray(samajProfile.children)) {
        samajProfile.children.forEach((child: any) => {
            const relType = child.gender === 'M' ? 'Son' : 'Daughter';
            familyMembers.push({ type: relType, data: child });
        });
    }
    if (samajProfile?.siblings && Array.isArray(samajProfile.siblings)) {
        samajProfile.siblings.forEach((sibling: any) => {
            const relType = sibling.gender === 'M' ? 'Brother' : 'Sister';
            familyMembers.push({ type: relType, data: sibling });
        });
    }

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto font-sans relative">
            
            {/* LINK MODAL */}
            {isLinkModalOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-gray-900">Link Family Member</h2>
                            <button onClick={() => {setIsLinkModalOpen(false); setSelectedMember(null);}} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition"><X size={20} className="text-gray-600" /></button>
                        </div>

                        {!selectedMember ? (
                            <>
                                <div className="relative mb-4">
                                    <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                    <input type="text" placeholder="Search verified member by Name, Village, Samaj ID..." onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                                </div>
                                <div className="overflow-y-auto flex-1 space-y-2 pr-2 custom-scrollbar">
                                    {searchResults.length === 0 ? <p className="text-center text-gray-400 py-10 font-bold">No verified members found.</p> : (
                                        searchResults.map(p => (
                                            <div key={p.id} onClick={() => setSelectedMember(p)} className="p-4 border border-gray-100 rounded-2xl flex justify-between items-center hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-black text-blue-600 text-lg overflow-hidden shrink-0">
                                                        <span className="absolute z-0">{p.user?.first_name?.[0] || 'U'}</span>
                                                        {p.profile_image && <img src={getImgUrl(p.profile_image)} className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => e.currentTarget.style.display = 'none'} alt="" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-800">{p.user?.first_name} {p.user?.last_name}</p>
                                                        <p className="text-xs font-bold text-gray-500">{p.samaj_id} • {p.village_en}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="bg-blue-50 p-6 rounded-2xl flex items-center gap-4 border border-blue-100">
                                    <div className="relative w-16 h-16 rounded-full bg-blue-200 flex items-center justify-center font-black text-blue-700 text-2xl border-2 border-white shadow-md overflow-hidden shrink-0">
                                        <span className="absolute z-0">{selectedMember.user?.first_name?.[0] || 'U'}</span>
                                        {selectedMember.profile_image && <img src={getImgUrl(selectedMember.profile_image)} className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => e.currentTarget.style.display = 'none'} alt="" />}
                                    </div>
                                    <div>
                                        <p className="font-black text-xl text-blue-900">{selectedMember.user?.first_name} {selectedMember.user?.last_name}</p>
                                        <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">{selectedMember.gender === 'M' ? 'Male' : 'Female'} • {selectedMember.village_en}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-black text-gray-800 mb-2">How is {selectedMember.user?.first_name} related to you?</label>
                                    <select className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-blue-500 font-bold text-gray-800" value={selectedRelation} onChange={(e) => setSelectedRelation(e.target.value)}>
                                        <option value="">-- Select Relation --</option>
                                        {getRelationOptions(selectedMember.gender).map(rel => <option key={rel} value={rel.toUpperCase()}>{rel}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => {setSelectedMember(null); setSelectedRelation('');}} className="flex-1 bg-gray-100 text-gray-600 font-black py-4 rounded-xl hover:bg-gray-200 transition">Back</button>
                                    <button onClick={handleSendLinkRequest} disabled={!selectedRelation} className="flex-1 bg-blue-600 text-white font-black py-4 rounded-xl disabled:bg-blue-300 hover:bg-blue-700 transition shadow-lg">Send Request</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* EDIT PROFILE MODAL */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-gray-900">Edit Profile Details</h2>
                            <button onClick={() => setIsEditing(false)} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition"><X size={20} className="text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mobile Number</label><input type="text" value={editForm.mobile_no} onChange={e => setEditForm({...editForm, mobile_no: e.target.value})} className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"/></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Village/City</label><input type="text" value={editForm.village_en} onChange={e => setEditForm({...editForm, village_en: e.target.value})} className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"/></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gotra</label><input type="text" value={editForm.gotra_en} onChange={e => setEditForm({...editForm, gotra_en: e.target.value})} className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"/></div>
                            <button type="submit" disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl mt-4 transition shadow-md">{isSaving ? 'Saving...' : 'Save Changes'}</button>
                        </form>
                    </div>
                </div>
            )}

            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />

            {/* TOP BANNER & AVATAR */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="h-32 md:h-40 bg-gradient-to-r from-blue-600 to-purple-600 relative">
                    <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl backdrop-blur-sm transition flex items-center gap-2 text-sm font-bold shadow-sm">
                        <Edit size={16} /> Edit Profile
                    </button>
                </div>
                
                <div className="px-6 md:px-10 pb-8 relative">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-4 -mt-16 md:-mt-20">
                        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
                            <div className="relative z-20 shrink-0" style={{ width: '140px', height: '140px' }}>
                                <div className="w-full h-full rounded-full bg-blue-50 border-[6px] border-white shadow-xl flex items-center justify-center text-blue-600 font-black text-6xl overflow-hidden relative">
                                    <span className="absolute z-0">{authProfile?.first_name?.charAt(0) || 'U'}</span>
                                    {samajProfile.profile_image && <img src={getImgUrl(samajProfile.profile_image)} alt="" className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => e.currentTarget.style.display = 'none'} />}
                                </div>
                                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-1 right-1 z-30 bg-blue-600 text-white p-3 rounded-full border-4 border-white hover:bg-blue-700 transition shadow-lg cursor-pointer flex items-center justify-center hover:scale-105">
                                    <Camera size={20} />
                                </button>
                            </div>
                            
                            <div className="mb-2">
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">{authProfile?.first_name} {authProfile?.last_name}</h1>
                                <p className="text-gray-500 font-bold text-lg mt-1">{samajProfile.samaj_id}</p>
                            </div>
                        </div>
                        
                        {samajProfile.verification_status === 'VERIFIED' && (
                            <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-full flex items-center gap-2 text-sm font-black uppercase tracking-wider shadow-sm mt-4 md:mt-0 self-start md:self-end shrink-0">
                                <ShieldCheck size={18} /> Verified Member
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MIDDLE SECTION: BASIC INFO */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
                <h2 className="text-xl font-black text-gray-800 mb-6 border-b border-gray-100 pb-4">Personal Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={14}/> Origin / Gotra</p>
                        <p className="font-black text-gray-900 text-lg">{samajProfile.village_en || 'N/A'} {samajProfile.gotra_en ? `(${samajProfile.gotra_en})` : ''}</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Phone size={14}/> Mobile</p>
                        <p className="font-black text-gray-900 text-lg">{authProfile?.mobile_no || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Mail size={14}/> Email</p>
                        <p className="font-bold text-gray-700 text-lg truncate" title={authProfile?.email}>{authProfile?.email || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Users size={14}/> Gender</p>
                        <p className="font-black text-gray-900 text-lg">{samajProfile.gender === 'M' ? 'Male' : 'Female'}</p>
                    </div>
                </div>
            </div>

            {/* BOTTOM SECTION: CORE FAMILY GRAPH & REQUESTS */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center border-b border-gray-100 mb-6 pb-4">
                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-2"><Heart className="text-pink-500" size={24} /> Family Relationships</h2>
                    <button onClick={() => setIsLinkModalOpen(true)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-black text-sm px-4 py-2 rounded-xl transition shadow-sm hidden sm:block">+ Add Relative</button>
                </div>
                
                {/* PENDING REQUESTS TO ACCEPT */}
                {pendingRequests.length > 0 && (
                    <div className="mb-6 border bg-yellow-50 border-yellow-300 shadow-md rounded-2xl p-4 md:p-6 transition-all">
                        <div className="flex items-center gap-2 font-black mb-4 text-sm text-yellow-800"><Clock size={18}/> Requests to Accept ({pendingRequests.length})</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingRequests.map(req => (
                                <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border border-yellow-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-black text-blue-600 text-xl overflow-hidden shrink-0">
                                            <span className="absolute z-0">{req.sender_name[0] || 'U'}</span>
                                            {req.sender_image && <img src={getImgUrl(req.sender_image)} className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => e.currentTarget.style.display = 'none'} alt=""/>}
                                        </div>
                                        <div className="leading-tight">
                                            <p className="font-black text-gray-900 text-base">{req.sender_name}</p>
                                            <p className="text-xs font-bold text-gray-500 uppercase mt-0.5">wants to be your <span className="text-blue-600">{req.relation_type}</span></p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <button onClick={() => handleRespondRequest(req.id, 'REJECT')} className="flex-1 sm:flex-none bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-sm px-4 py-2 rounded-lg transition">Reject</button>
                                        <button onClick={() => handleRespondRequest(req.id, 'ACCEPT')} className="flex-1 sm:flex-none bg-green-600 text-white hover:bg-green-700 font-black text-sm px-4 py-2 rounded-lg transition shadow-md flex justify-center items-center gap-1"><CheckCircle size={16}/> Accept</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* SENT REQUESTS */}
                {sentRequests.length > 0 && (
                    <div className="mb-8 border rounded-2xl p-4 md:p-6 bg-blue-50 border-blue-200 shadow-sm">
                        <div className="flex items-center gap-2 font-black mb-4 text-sm text-blue-800"><Send size={18}/> Sent Requests ({sentRequests.length})</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {sentRequests.map(req => (
                                <div key={req.id} className="bg-white p-3 rounded-xl shadow-sm border border-blue-100 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-xs overflow-hidden shrink-0">
                                            <span className="absolute z-0">{req.receiver_name[0] || 'U'}</span>
                                            {req.receiver_image && <img src={getImgUrl(req.receiver_image)} className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => e.currentTarget.style.display = 'none'} alt=""/>}
                                        </div>
                                        <div className="leading-tight">
                                            <p className="font-bold text-gray-900 text-xs">{req.receiver_name}</p>
                                            <p className="text-[9px] font-bold text-gray-500 uppercase">Pending as <span className="text-blue-600">{req.relation_type}</span></p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleCancelRequest(req.id)} className="font-black text-red-600 bg-red-50 hover:bg-red-600 hover:text-white px-2.5 py-1.5 rounded-lg transition border border-red-100 flex items-center gap-1 text-[10px]"><Trash2 size={12}/> Cancel</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* FAMILY GRID */}
                {familyMembers.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-sm text-gray-500 font-bold mb-4 px-2">Your family tree is empty. Connect with your relatives!</p>
                        <button onClick={() => setIsLinkModalOpen(true)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-black text-sm px-6 py-3 rounded-xl transition shadow-sm">+ Link Family Member</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {familyMembers.map((fam: any, idx) => (
                            <Link key={idx} href={`/community/directory/${fam.data.id}`} className="block bg-blue-50 p-5 rounded-2xl border border-blue-100 hover:bg-blue-100 hover:border-blue-300 transition-colors group shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-12 h-12 rounded-full bg-blue-200 text-blue-700 font-black flex items-center justify-center overflow-hidden shrink-0 border-2 border-white shadow-sm">
                                            <span className="absolute z-0">{fam.data.user?.first_name?.charAt(0) || 'U'}</span>
                                            {fam.data.profile_image && <img src={getImgUrl(fam.data.profile_image)} className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => e.currentTarget.style.display = 'none'} alt=""/>}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">{fam.type}</p>
                                            <p className="font-black text-gray-900 text-base group-hover:text-blue-700 transition-colors">{fam.data.user?.first_name} {fam.data.user?.last_name}</p>
                                        </div>
                                    </div>
                                    <div className="text-blue-400 group-hover:text-blue-600 font-black">→</div>
                                </div>
                                <div className="pt-3 border-t border-blue-100/50 flex flex-col gap-1 text-xs font-bold text-gray-600">
                                    <span className="flex items-center gap-1"><UserCheck size={12} className="text-blue-400"/> ID: {fam.data.samaj_id}</span>
                                    {fam.data.village_en && <span className="flex items-center gap-1"><MapPin size={12} className="text-red-400"/> {fam.data.village_en}</span>}
                                </div>
                            </Link>
                        ))}
                        
                        <div className="sm:hidden w-full">
                            <button onClick={() => setIsLinkModalOpen(true)} className="w-full bg-white border-2 border-blue-100 text-blue-600 hover:bg-blue-50 font-black text-sm px-6 py-4 rounded-xl transition shadow-sm">+ Add More Relatives</button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}