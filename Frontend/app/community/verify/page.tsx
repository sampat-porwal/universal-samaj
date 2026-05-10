"use client";
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, AlertTriangle, CheckCircle, Search, User, MapPin, XCircle } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

export default function VerifyMembersPage() {
    const [pendingProfiles, setPendingProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const checkAccessAndFetch = async () => {
            try {
                const authRes = await api.get('/auth/profile/');
                const currentRole = authRes.data.role || 'USER';
                setUserRole(currentRole);

                if (['SUPERADMIN', 'ADMIN', 'CORE_ADMIN', 'CORE_MEMBER'].includes(currentRole)) {
                    const res = await api.get('/samaj/profiles/pending_verifications/');
                    setPendingProfiles(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch fresh role or verifications", err);
            } finally {
                setLoading(false);
            }
        };

        checkAccessAndFetch();
    }, []);

    const handleVerificationAction = async (id: number, name: string, actionType: 'VERIFY' | 'REJECT') => {
        const confirmMsg = actionType === 'VERIFY' 
            ? `Are you sure you want to verify ${name}? By clicking OK, you confirm that you know this person.`
            : `Are you sure you want to REJECT ${name}? This will mark their profile as invalid.`;

        if (!confirm(confirmMsg)) return;
        
        try {
            const res = await api.post(`/samaj/profiles/${id}/verify_member/`, { action: actionType });
            alert(`✅ ${res.data.message}`);
            
            const verifyRes = await api.get('/samaj/profiles/pending_verifications/');
            setPendingProfiles(verifyRes.data);
        } catch (err: any) {
            alert(`❌ ${err.response?.data?.error || "Action failed."}`);
        }
    };

    const getImgUrl = (path: string) => {
        if (!path) return '';
        return path.startsWith('http') ? path : `http://127.0.0.1:8000${path}`;
    };

    const isAuthorized = ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN', 'CORE_MEMBER'].includes(userRole);

    if (loading) return <div className="p-10 text-center font-bold text-gray-500 animate-pulse">Loading Pending Requests...</div>;

    if (!isAuthorized) {
        return (
            <div className="p-6 max-w-3xl mx-auto mt-10">
                <div className="bg-red-50 border border-red-200 p-8 rounded-3xl text-center shadow-sm">
                    <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-600 font-bold mb-6">
                        Only Core Members and Admins have the authority to verify new users.
                    </p>
                    <Link href="/community" className="bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 font-black px-6 py-3 rounded-xl transition shadow-sm inline-block">
                        Go Back to Feed
                    </Link>
                </div>
            </div>
        );
    }

    const filteredProfiles = pendingProfiles.filter(p => {
        if (!searchQuery) return true;
        const name = `${p.user?.first_name} ${p.user?.last_name}`.toLowerCase();
        const sq = searchQuery.toLowerCase();
        return name.includes(sq) || (p.village_en && p.village_en.toLowerCase().includes(sq)) || (p.samaj_id && p.samaj_id.toLowerCase().includes(sq));
    });

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto font-sans pb-20">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3">
                        <ShieldCheck className="text-blue-500" size={32} /> 
                        Core Verification Center
                    </h1>
                    <p className="text-gray-500 font-medium mt-2 max-w-lg">
                        Review and vote to verify new members joining the Samaj. A user needs 5 votes from Core Members to be fully verified.
                    </p>
                </div>
                
                {/* 🌟 FIX: Clarity on "Pending" badge. It now says "Profiles in Queue" */}
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-2xl text-center min-w-[150px] relative z-10 shadow-sm">
                    <p className="text-3xl font-black">{pendingProfiles.length}</p>
                    <p className="text-xs font-bold uppercase tracking-wider mt-1">Profiles in Queue</p>
                </div>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-4 top-4 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search pending members by Name, ID, or Village..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-gray-200 pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-800 shadow-sm transition"
                />
            </div>

            {filteredProfiles.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <CheckCircle className="mx-auto text-green-400 mb-4" size={64} />
                    <h3 className="text-xl font-black text-gray-800">All Caught Up!</h3>
                    <p className="text-gray-500 font-medium mt-2">There are no pending verifications at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredProfiles.map((p) => (
                        <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-300 transition-all flex flex-col justify-between group relative overflow-hidden">
                            
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>

                            <div className="flex justify-between items-start mb-4 pl-2">
                                <div className="flex items-center gap-4">
                                    <div className="relative w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-400 text-2xl overflow-hidden shrink-0 border-2 border-white shadow-sm">
                                        <span className="absolute z-0">{p.user?.first_name?.[0] || 'U'}</span>
                                        {p.profile_image && <img src={getImgUrl(p.profile_image)} className="absolute inset-0 w-full h-full object-cover z-10" alt="" onError={(e) => e.currentTarget.style.display = 'none'} />}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-gray-900">{p.user?.first_name} {p.user?.last_name}</h3>
                                        <p className="text-sm font-bold text-gray-500">{p.samaj_id}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl mb-4 ml-2 space-y-2 border border-gray-100">
                                <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <MapPin size={16} className="text-gray-400" /> {p.village_en || 'Village not provided'} {p.gotra_en ? `(${p.gotra_en})` : ''}
                                </p>
                                <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <User size={16} className="text-gray-400" /> {p.gender === 'M' ? 'Male' : 'Female'}
                                </p>
                            </div>

                            {/* 🌟 PROGRESS AND DIRECTORY-STYLE VOTER LIST */}
                            <div className="px-2 mb-4">
                                <div className="flex justify-between items-end mb-1.5">
                                    <span className="text-xs font-black text-gray-500 tracking-wider uppercase">Verification Progress</span>
                                    <span className="text-blue-600 text-xs font-black">{p.current_votes || 0} / 5 Votes</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5 shadow-inner mb-1">
                                    <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${((p.current_votes || 0) / 5) * 100}%` }}></div>
                                </div>
                                
                                {/* 🌟 FIX: Remaining Votes Needed text */}
                                <p className="text-[10px] text-gray-500 font-bold mb-4 text-right">
                                    {5 - (p.current_votes || 0)} more votes needed
                                </p>
                                
                                {/* 🌟 FIX: Rich mini-cards for voters */}
                                {p.verified_by && p.verified_by.length > 0 && (
                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Verified so far by:</p>
                                        <div className="flex flex-col gap-2">
                                            {p.verified_by.map((voter: any, idx: number) => (
                                                <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-xs shrink-0 overflow-hidden border border-blue-200">
                                                        {voter.image ? <img src={getImgUrl(voter.image)} className="w-full h-full object-cover" alt=""/> : voter.name?.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-gray-800">{voter.name}</span>
                                                        <span className="text-[10px] text-gray-500 font-medium">ID: {voter.samaj_id} {voter.gotra ? `• ${voter.gotra}` : ''}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 mt-auto pl-2">
                                <button onClick={() => handleVerificationAction(p.id, p.user?.first_name, 'REJECT')} className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-gray-200 hover:border-red-200 text-center font-black py-3 rounded-xl transition text-sm flex items-center justify-center gap-1 shadow-sm">
                                    <XCircle size={16}/> Reject
                                </button>
                                <button onClick={() => handleVerificationAction(p.id, p.user?.first_name, 'VERIFY')} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl shadow-md transition flex justify-center items-center gap-2 text-sm">
                                    <ShieldCheck size={18} /> Verify Member
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}