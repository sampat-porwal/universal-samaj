"use client";
import React, { useState, useEffect } from 'react';
import { Users, Plus, X, CheckCircle, MapPin, UserCheck, Heart, AlertCircle, Building } from "lucide-react";
import api from '@/lib/api';

export default function SamajManagementPage() {
    // 🗂️ TABS & PERMISSIONS
    const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'COMMITTEES'>('DIRECTORY');
    const [userPerms, setUserPerms] = useState<string[]>([]);

    // 👤 SAMAJ PROFILE STATES
    const [profiles, setProfiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showProfileForm, setShowProfileForm] = useState(false);

    // Form States (Basic setup for next step)
    const [samajId, setSamajId] = useState('');
    const [firstNameEn, setFirstNameEn] = useState('');
    const [firstNameHi, setFirstNameHi] = useState('');
    const [villageEn, setVillageEn] = useState('');

    useEffect(() => {
        fetchProfiles();

        // Load permissions just like your Staff page
        const profileStr = localStorage.getItem('user_profile');
        if (profileStr) {
            const profile = JSON.parse(profileStr);
            setUserPerms(profile?.permissions || []);
        }
    }, []);

    // 🌟 PERMISSION LOGIC (Reusing your robust logic)
    const hasAllAccess = userPerms.includes('ALL_ACCESS');
    // Assuming if they can manage users, they can manage Samaj profiles for now
    const canManageSamaj = hasAllAccess || userPerms.includes('manage_users'); 

    const fetchProfiles = async () => {
        setIsLoading(true);
        try {
            // 🌟 Using your centralized api instance (no double /api)
            const res = await api.get('/samaj/profiles/');
            setProfiles(res.data || []);
        } catch (error) { 
            console.error("Error fetching Samaj profiles:", error); 
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageSamaj) return alert("You do not have permission to add members.");
        
        // This will be expanded later, just a placeholder for now to match your style
        alert("Create Profile API logic will go here in the next step!");
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen max-w-7xl mx-auto font-sans">
            
            {/* 🟢 TOP HEADER SECTION (Matches your Staff page style exactly) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                        {activeTab === 'DIRECTORY' ? <Users className="text-blue-600" size={28} /> : <Building className="text-purple-600" size={28} />}
                        Samaj Community Hub
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">Manage community members, family trees, and committees.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('DIRECTORY')} className={`px-6 py-2.5 rounded-lg font-bold transition ${activeTab === 'DIRECTORY' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Directory</button>
                    <button onClick={() => setActiveTab('COMMITTEES')} className={`px-6 py-2.5 rounded-lg font-bold transition ${activeTab === 'COMMITTEES' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Committees</button>
                </div>
            </div>

            {/* Warning Banner (Matches your style) */}
            {!canManageSamaj && activeTab === 'DIRECTORY' && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-center gap-3 text-yellow-800 font-medium">
                    <AlertCircle size={20} className="text-yellow-600" />
                    You are in "View-Only" mode. Only administrators can add or modify Samaj members.
                </div>
            )}

            {/* ========================================== */}
            {/* 👥 TAB 1: SAMAJ DIRECTORY                  */}
            {/* ========================================== */}
            {activeTab === 'DIRECTORY' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Add Button */}
                    {canManageSamaj && (
                        <div className="flex justify-end mb-6">
                            <button onClick={() => setShowProfileForm(!showProfileForm)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition shadow-md flex items-center gap-2">
                                {showProfileForm ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Add New Member</>}
                            </button>
                        </div>
                    )}

                    {/* Inline Form (Matches your Staff creation form) */}
                    {showProfileForm && canManageSamaj && (
                        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 mb-8">
                             <h2 className="text-lg font-black text-gray-800 mb-6 border-b pb-4">Register New Samaj Member</h2>
                            <form onSubmit={handleProfileSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Samaj ID <span className="text-red-500">*</span></label>
                                        <input type="text" value={samajId} onChange={e => setSamajId(e.target.value)} required placeholder="e.g. S-2026-001" className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">First Name (English)</label>
                                        <input type="text" value={firstNameEn} onChange={e => setFirstNameEn(e.target.value)} placeholder="e.g. Sampat" className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">First Name (Hindi)</label>
                                        <input type="text" value={firstNameHi} onChange={e => setFirstNameHi(e.target.value)} placeholder="e.g. संपत" className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium font-hindi"/>
                                    </div>
                                </div>
                                <button type="submit" className="flex items-center justify-center gap-2 w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-xl shadow-md transition">
                                    <CheckCircle size={20} /> CREATE PROFILE
                                </button>
                            </form>
                        </div>
                    )}

                    {/* DATA DISPLAY: Grid View instead of Table for better Profile feel */}
                    {isLoading ? (
                        <div className="text-center py-20 text-gray-400 font-bold">Loading Profiles...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {profiles.map((profile, i) => (
                                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-300 transition group">
                                    
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-4">
                                            {profile.profile_image ? (
                                                <img src={profile.profile_image} alt="Profile" className="w-14 h-14 rounded-full object-cover border-2 border-gray-100" />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                                    <Users size={24} />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-lg font-black text-gray-800">{profile.user?.first_name} {profile.user?.last_name}</h3>
                                                <p className="text-sm text-gray-500 font-medium font-hindi">{profile.user?.first_name_hi} {profile.user?.last_name_hi}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] uppercase tracking-wider font-black px-3 py-1 rounded-full ${profile.verification_status === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {profile.verification_status}
                                        </span>
                                    </div>

                                    <div className="space-y-2 mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <p className="text-xs text-gray-600 flex items-center gap-2 font-bold uppercase tracking-wide">
                                            <UserCheck size={14} className="text-blue-500"/>
                                            ID: <span className="text-gray-900">{profile.samaj_id}</span>
                                        </p>
                                        <p className="text-xs text-gray-600 flex items-center gap-2 font-bold uppercase tracking-wide">
                                            <MapPin size={14} className="text-red-400"/>
                                            Village: <span className="text-gray-900">{profile.village_en || 'N/A'} {profile.village_hi ? `/ ${profile.village_hi}` : ''}</span>
                                        </p>
                                    </div>

                                    {/* FAST UI: Show Spouse instantly from JSON Cache */}
                                    {profile.family_summary?.partner && (
                                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 bg-pink-50 text-pink-700 px-3 py-2 rounded-lg font-medium border border-pink-100">
                                            <Heart size={14} className="text-pink-500" fill="currentColor" />
                                            Spouse: {profile.family_summary.partner.name_en}
                                        </div>
                                    )}

                                </div>
                            ))}
                            
                            {profiles.length === 0 && !isLoading && (
                                <div className="col-span-full text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                                    <Users className="mx-auto text-gray-300 mb-4" size={56} />
                                    <p className="text-gray-600 font-bold text-xl mb-1">No profiles found.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================== */}
            {/* 🏛️ TAB 2: COMMITTEES                       */}
            {/* ========================================== */}
            {activeTab === 'COMMITTEES' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                    <Building className="mx-auto text-gray-300 mb-4" size={56} />
                    <h2 className="text-gray-600 font-bold text-xl mb-1">Committees Module Coming Soon</h2>
                    <p className="text-gray-400 text-sm">This space will manage Cricket and Samuhik Vivah events.</p>
                </div>
            )}
        </div>
    );
}