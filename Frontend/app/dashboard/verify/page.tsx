"use client";
import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, CheckCircle, AlertCircle, Clock, Users } from "lucide-react";
import api from '@/lib/api';

export default function VerificationDashboardPage() {
    const [pendingProfiles, setPendingProfiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCoreMember, setIsCoreMember] = useState(false);

    useEffect(() => {
        // Quick check: Is this user a SuperAdmin or Core Member?
        const profileStr = localStorage.getItem('user_profile');
        if (profileStr) {
            const profile = JSON.parse(profileStr);
            // In a real app, you might want the backend to pass is_core_member inside this profile object.
            // For now, if they are SUPERADMIN, they always see this.
            if (profile.role === 'SUPERADMIN') setIsCoreMember(true);
            else setIsCoreMember(true); // Temporarily true so you can test it!
        }
        fetchPendingProfiles();
    }, []);

    const fetchPendingProfiles = async () => {
        setIsLoading(true);
        try {
            // Fetching ONLY pending files using the new Action Route we created
            const res = await api.get('/samaj/profiles/pending_verifications/');
            setPendingProfiles(res.data);
        } catch (error) {
            console.error("Failed to load pending verifications", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (profileId: number) => {
        try {
            const res = await api.post(`/samaj/profiles/${profileId}/verify_member/`);
            alert(`✅ ${res.data.message}`);
            // Remove the user from the list if they hit 5 votes, otherwise just refresh to update progress bar
            fetchPendingProfiles();
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to verify.");
        }
    };

    if (!isCoreMember) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-gray-500">
                <ShieldCheck size={64} className="text-red-400 mb-4" />
                <h2 className="text-2xl font-bold">Access Denied</h2>
                <p>Only verified Core Members and Superadmins can access the Verification Board.</p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen max-w-7xl mx-auto font-sans">
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                        <ShieldCheck className="text-blue-600" size={28} />
                        Core Member Portal: Pending Verifications
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">Review new self-registered users and approve them for Samaj access.</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                    <Clock size={18}/> {pendingProfiles.length} Pending
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-20 text-gray-400 font-bold">Loading pending applications...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pendingProfiles.map((profile, i) => {
                        const progressPercent = (profile.votes_count / 5) * 100;

                        return (
                            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 font-black text-xl">
                                            {profile.user?.first_name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-gray-800">{profile.user?.first_name} {profile.user?.last_name}</h3>
                                            <p className="text-sm text-gray-500 font-medium">{profile.samaj_id} • {profile.village_en}</p>
                                        </div>
                                    </div>
                                    <span className="bg-yellow-100 text-yellow-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                        Action Required
                                    </span>
                                </div>

                                {/* 🌟 QUORUM PROGRESS BAR */}
                                <div className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs font-bold text-gray-500 uppercase">Verification Progress</span>
                                        <span className="text-sm font-black text-blue-600">{profile.votes_count} / 5 Votes</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                                        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                                    </div>

                                    {/* 🌟 WHO VOTED? (Transparency logic) */}
                                    {profile.voters_list && profile.voters_list.length > 0 ? (
                                        <div className="flex items-start gap-2 mt-3 text-xs text-gray-600 font-medium">
                                            <Users size={14} className="mt-0.5 text-green-600 shrink-0"/>
                                            <p>Verified by: <span className="font-bold text-gray-800">{profile.voters_list.join(", ")}</span></p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 font-medium italic mt-2">No core members have verified this user yet.</p>
                                    )}
                                </div>

                                {/* ACTION BUTTON */}
                                <div className="mt-4">
                                    {profile.has_voted ? (
                                        <button disabled className="w-full bg-green-50 text-green-700 border border-green-200 font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                                            <CheckCircle size={18}/> You have already verified this user
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleVerify(profile.id)} 
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2"
                                        >
                                            <UserCheck size={18}/> Verify This Member
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {pendingProfiles.length === 0 && (
                        <div className="col-span-full text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <CheckCircle className="mx-auto text-green-400 mb-4" size={56} />
                            <p className="text-gray-600 font-bold text-xl mb-1">All Caught Up!</p>
                            <p className="text-gray-400 text-sm">There are no pending registrations waiting for verification.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}