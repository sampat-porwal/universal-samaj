"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Phone, ShieldCheck, Heart, ArrowLeft, Users, UserCheck } from 'lucide-react';
import api from '@/lib/api';

export default function PublicProfilePage() {
    const params = useParams();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const profileId = params.id;

    useEffect(() => {
        const fetchPublicProfile = async () => {
            try {
                const res = await api.get(`/samaj/profiles/${profileId}/`);
                setProfile(res.data);
            } catch (error) {
                console.error("Failed to load public profile", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPublicProfile();
    }, [profileId]);

    const getImgUrl = (path: string) => {
        if (!path) return '';
        return path.startsWith('http') ? path : `http://127.0.0.1:8000${path}`;
    };

    if (isLoading) return <div className="p-10 text-center font-bold text-gray-500 animate-pulse">Loading Member Details...</div>;
    if (!profile) return <div className="p-10 text-center font-bold text-red-500">Profile Not Found!</div>;

    // 🌟 BUILD FULL FAMILY GRAPH
    const familyMembers: any[] = [];
    if (profile.father && profile.father.id) familyMembers.push({ type: 'Father', data: profile.father });
    if (profile.mother && profile.mother.id) familyMembers.push({ type: 'Mother', data: profile.mother });
    if (profile.spouse && profile.spouse.id) familyMembers.push({ type: 'Spouse', data: profile.spouse });
    if (profile.children && Array.isArray(profile.children)) {
        profile.children.forEach((child: any) => {
            const relType = child.gender === 'M' ? 'Son' : 'Daughter';
            familyMembers.push({ type: relType, data: child });
        });
    }

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto font-sans relative">
            <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 w-fit">
                <ArrowLeft size={18} /> Back
            </button>

            {/* 🌟 1. TOP SECTION: FIXED BANNER & AVATAR */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-8 pt-24 md:pt-32 relative">
                {/* Colored Banner Background */}
                <div className="absolute top-0 left-0 w-full h-32 md:h-40 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-3xl"></div>
                
                <div className="px-6 md:px-10 pb-8 flex flex-col md:flex-row items-start justify-between gap-4 relative z-10">
                    
                    <div className="flex flex-col md:flex-row md:items-end gap-5 -mt-16 md:-mt-20">
                        
                        {/* 🌟 FOOLPROOF AVATAR: Strictly locked width and height so it never shrinks */}
                        <div className="relative shrink-0 z-20" style={{ width: '140px', height: '140px' }}>
                            <div className="w-full h-full rounded-full bg-blue-50 border-[6px] border-white shadow-xl flex items-center justify-center text-blue-600 font-black text-6xl overflow-hidden relative">
                                <span className="absolute z-0">{profile.user?.first_name?.charAt(0) || 'U'}</span>
                                {profile.profile_image && (
                                    <img 
                                        src={getImgUrl(profile.profile_image)} 
                                        alt="Profile" 
                                        className="absolute inset-0 w-full h-full object-cover z-10"
                                        onError={(e) => e.currentTarget.style.display = 'none'}
                                    />
                                )}
                            </div>
                        </div>
                        
                        <div className="mb-2">
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
                                {profile.user?.first_name} {profile.user?.last_name}
                            </h1>
                            <p className="text-gray-500 font-bold text-lg mt-1">{profile.samaj_id}</p>
                        </div>
                    </div>
                    
                    {profile.verification_status === 'VERIFIED' && (
                        <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-full flex items-center gap-2 text-sm font-black uppercase tracking-wider shadow-sm mt-4 md:mt-0 self-start md:self-end shrink-0">
                            <ShieldCheck size={18} /> Verified Member
                        </div>
                    )}
                </div>
            </div>

            {/* 🌟 2. MIDDLE SECTION: BASIC INFO */}
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

            {/* 🌟 3. BOTTOM SECTION: CORE FAMILY GRAPH */}
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
                                            {fam.data.profile_image && (
                                                <img src={getImgUrl(fam.data.profile_image)} className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => e.currentTarget.style.display = 'none'} alt=""/>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">{fam.type}</p>
                                            <p className="font-black text-gray-900 text-base group-hover:text-blue-700 transition-colors">{fam.data.user?.first_name} {fam.data.user?.last_name}</p>
                                        </div>
                                    </div>
                                    <div className="text-blue-400 group-hover:text-blue-600 font-black">→</div>
                                </div>
                                {/* 🌟 Extra Info in Relative Card */}
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