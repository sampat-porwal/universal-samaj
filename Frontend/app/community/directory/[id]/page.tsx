"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Phone, ShieldCheck, Heart, ArrowLeft, Users, UserCheck, Star, Camera, Settings, X, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

export default function PublicProfilePage() {
    const params = useParams();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loggedInUser, setLoggedInUser] = useState<any>(null); 
    const [isLoading, setIsLoading] = useState(true);
    const [isNotFound, setIsNotFound] = useState(false);
    
    // 🌟 State for Role Management Modal
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState('USER');
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const profileId = params.id;

    useEffect(() => {
        fetchDetails();
    }, [profileId]);

    const fetchDetails = async () => {
        try {
            const authRes = await api.get('/auth/profile/');
            setLoggedInUser(authRes.data);

            const res = await api.get(`/samaj/profiles/${profileId}/`);
            setProfile(res.data);
            setIsNotFound(false);

        } catch (error: any) {
            console.error("Failed to load details", error);
            if (error.response && error.response.status === 404) {
                setIsNotFound(true); 
            }
        } finally {
            setIsLoading(false);
        }
    };

    const getImgUrl = (path: string) => {
        if (!path) return '';
        return path.startsWith('http') ? path : `http://127.0.0.1:8000${path}`;
    };

    // 🌟 Assign Role Logic
    const handleAssignRole = async () => {
        if (!confirm(`Are you sure you want to assign ${selectedRole.replace('_', ' ')} role to ${profile.user?.first_name}?`)) return;
        
        setIsUpdatingRole(true);
        try {
            const res = await api.post(`/samaj/profiles/${profileId}/assign_role/`, { role: selectedRole });
            alert(res.data.message);
            setProfile({ ...profile, is_core_member: res.data.is_core_member });
            setIsRoleModalOpen(false);
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to update role.");
        } finally {
            setIsUpdatingRole(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;
        const formData = new FormData();
        formData.append('profile_image', file);
        try {
            await api.patch(`/samaj/profiles/${profile.id}/update_family_photo/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            alert("✅ Member's photo updated successfully!");
            fetchDetails(); 
        } catch (error) { 
            alert("❌ Failed to upload photo."); 
        }
    };

    if (isLoading) return <div className="p-10 text-center font-bold text-gray-500 animate-pulse">Loading Member Details...</div>;
    
    if (isNotFound || !profile) return (
        <div className="p-10 text-center flex flex-col items-center">
            <p className="font-black text-red-500 text-2xl mb-4">Profile Not Found!</p>
            <button onClick={() => router.back()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-xl font-bold transition">
                Go Back
            </button>
        </div>
    );

    const isSelf = loggedInUser?.username === profile.user?.username;
    
    // 🌟 STRICT ROLE CONDITIONS: Added CORE_ADMIN here
    const canManageRole = ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN'].includes(loggedInUser?.role);
    const canSuperEditPhoto = ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN'].includes(loggedInUser?.role);

    let familyMembers: any[] = [];
    
    if (profile.father && profile.father.id) familyMembers.push({ type: 'Father', data: profile.father });
    if (profile.mother && profile.mother.id) familyMembers.push({ type: 'Mother', data: profile.mother });
    
    if (profile.spouse && profile.spouse.id) {
        const spouseType = profile.spouse.gender === 'M' ? 'Husband' : 'Wife';
        familyMembers.push({ type: spouseType, data: profile.spouse });
    }
    
    if (profile.children && Array.isArray(profile.children)) {
        profile.children.forEach((child: any) => {
            const relType = child.gender === 'M' ? 'Son' : 'Daughter';
            familyMembers.push({ type: relType, data: child });
        });
    }
    
    if (profile.siblings && Array.isArray(profile.siblings)) {
        profile.siblings.forEach((sibling: any) => {
            const relType = sibling.gender === 'M' ? 'Brother' : 'Sister';
            familyMembers.push({ type: relType, data: sibling });
        });
    }

    familyMembers.sort((a, b) => {
        const priorityOrder: any = { 'Father': 1, 'Mother': 2, 'Husband': 3, 'Wife': 3 };
        const priorityA = priorityOrder[a.type] || 99;
        const priorityB = priorityOrder[b.type] || 99;
        if (priorityA !== priorityB) return priorityA - priorityB;

        const dobA = a.data.dob ? new Date(a.data.dob).getTime() : Infinity;
        const dobB = b.data.dob ? new Date(b.data.dob).getTime() : Infinity;
        return dobA - dobB; 
    });

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto font-sans relative">
            
            {/* 🌟 ROLE MANAGEMENT MODAL */}
            {isRoleModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2"><Settings size={20} className="text-blue-600"/> Manage User Role</h2>
                            <button onClick={() => setIsRoleModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition"><X size={20} className="text-gray-600" /></button>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-gray-500">Assigning role for <span className="text-gray-900">{profile.user?.first_name}</span>.</p>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Community Level</label>
                                <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="w-full border-2 border-gray-200 p-4 rounded-xl font-bold bg-gray-50 outline-none focus:border-blue-500">
                                    <option value="USER">Standard User (Default)</option>
                                    <option value="EVENT_USER">Event User (Volunteer)</option>
                                    <option value="CORE_MEMBER">Core Member (Verifier)</option>
                                    
                                    {/* 🌟 Admin and Superadmin Options */}
                                    {['SUPERADMIN', 'ADMIN'].includes(loggedInUser?.role) && (
                                        <>
                                            <option value="EVENT_ADMIN">Event Admin (Manager)</option>
                                            <option value="CORE_ADMIN">Core Admin (Samaj Leader)</option>
                                        </>
                                    )}
                                    
                                    {/* 🌟 Only Superadmin can make another Admin */}
                                    {loggedInUser?.role === 'SUPERADMIN' && (
                                        <option value="ADMIN">System Admin</option>
                                    )}
                                </select>
                            </div>

                            <button onClick={handleAssignRole} disabled={isUpdatingRole} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl mt-4 transition shadow-md flex items-center justify-center gap-2">
                                {isUpdatingRole ? 'Updating...' : <><CheckCircle size={18}/> Confirm & Assign Role</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />

            <div className="flex justify-between items-center mb-6">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 w-fit">
                    <ArrowLeft size={18} /> Back
                </button>

                {/* 🌟 Manage Role Button Visibility */}
                {canManageRole && !isSelf && (
                    <button 
                        onClick={() => setIsRoleModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-black transition shadow-sm border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-blue-600"
                    >
                        <Settings size={18} /> Manage Role
                    </button>
                )}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8 pt-24 md:pt-32 relative">
                <div className="absolute top-0 left-0 w-full h-32 md:h-40 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-3xl"></div>
                
                <div className="px-6 md:px-10 pb-8 flex flex-col md:flex-row items-start justify-between gap-4 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end gap-5 -mt-16 md:-mt-20">
                        <div className="relative shrink-0 z-20" style={{ width: '140px', height: '140px' }}>
                            <div className="w-full h-full rounded-full bg-blue-50 border-4 border-white shadow-xl flex items-center justify-center text-blue-600 font-black text-5xl overflow-hidden relative">
                                <span className="absolute z-0">{profile.user?.first_name?.charAt(0) || 'U'}</span>
                                {profile.profile_image && <img src={getImgUrl(profile.profile_image)} alt="" className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => e.currentTarget.style.display = 'none'} />}
                            </div>
                            
                            {canSuperEditPhoto && !isSelf && (
                                <button onClick={() => fileInputRef.current?.click()} title="Upload photo for this member" className="absolute bottom-1 right-1 z-30 bg-blue-600 text-white p-2.5 rounded-full border-4 border-white hover:bg-blue-700 transition shadow-lg cursor-pointer flex items-center justify-center hover:scale-105">
                                    <Camera size={16} />
                                </button>
                            )}
                        </div>
                        
                        <div className="mb-2">
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight flex items-center gap-3">
                                {profile.user?.first_name} {profile.user?.last_name}
                            </h1>
                            <p className="text-gray-500 font-bold text-lg mt-1">{profile.samaj_id}</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
                        {profile.is_core_member && (
                            <div className="bg-yellow-100 text-yellow-800 border border-yellow-300 px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-sm">
                                <Star size={14} className="fill-yellow-600" /> Core Member
                            </div>
                        )}
                        {profile.verification_status === 'VERIFIED' && (
                            <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-sm">
                                <ShieldCheck size={16} /> Verified
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
                <h2 className="text-xl font-black text-gray-800 mb-6 border-b border-gray-100 pb-4">Member Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={14}/> Origin / Gotra</p>
                        <p className="font-black text-gray-900 text-lg">{profile.village_en || 'N/A'} {profile.gotra_en ? `(${profile.gotra_en})` : ''}</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Phone size={14}/> Mobile</p>
                        <p className="font-black text-gray-900 text-lg">{profile.user?.mobile_no ? `+91 ${profile.user.mobile_no}` : 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Users size={14}/> Gender</p>
                        <p className="font-black text-gray-900 text-lg">{profile.gender === 'M' ? 'Male' : 'Female'}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-gray-800 mb-6 border-b border-gray-100 pb-4 flex items-center gap-2">
                    <Heart className="text-pink-500" size={24} /> Family Relationships
                </h2>
                
                {familyMembers.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-sm text-gray-500 font-bold px-2">No relatives linked yet.</p>
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
                                            {/* Relation Type: Husband/Wife, Son/Daughter, etc. */}
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
                    </div>
                )}
            </div>
        </div>
    );
}