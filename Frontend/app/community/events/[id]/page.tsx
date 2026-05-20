"use client";

import React, { useEffect, useState, use } from 'react';
import { ArrowLeft, Users, UserCircle, X, ShieldAlert, CheckCircle2, Shield, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ManageEventTeamPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const eventId = resolvedParams.id;

    const [eventDetails, setEventDetails] = useState<any>(null);
    const [teamMembers, setTeamMembers] = useState<any[]>([]); // 🌟 FIXED: Defined state
    const [committeeMembers, setCommitteeMembers] = useState<any[]>([]); // 🌟 FIXED: Defined state
    const [isLoading, setIsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [selectedRole, setSelectedRole] = useState('Event Member');

    useEffect(() => {
        if (eventId) fetchEventAndTeam();
    }, [eventId]);

    const fetchEventAndTeam = async () => {
        setIsLoading(true);
        try {
            const [eventRes, teamRes] = await Promise.all([
                api.get(`/events/list/${eventId}/`),
                api.get(`/events/list/${eventId}/team/`)
            ]);
            setEventDetails(eventRes.data);
            setTeamMembers(teamRes.data);
            setCommitteeMembers(teamRes.data); // 🌟 FIXED: Populating state
        } catch (error) {
            console.error("Failed to load event data.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (q.length < 2) { setSearchResults([]); return; }
        setIsSearching(true);
        try {
            const res = await api.get(`/events/list/search_profiles/?q=${q}`);
            setSearchResults(res.data);
        } catch (err) { console.error("Search failed", err); } finally { setIsSearching(false); }
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProfile) return;
        try {
            await api.post(`/events/list/${eventId}/team/`, { 
                samaj_id: selectedProfile.samaj_id, 
                role_title: selectedRole 
            });
            alert("Member added!");
            fetchEventAndTeam();
            setSearchQuery(''); setSelectedProfile(null);
        } catch (error: any) { alert(error.response?.data?.error || "Failed to add."); }
    };

    const handleRemoveMember = async (orgId: number) => {
        if (!window.confirm("Remove this member?")) return;
        try {
            await api.delete(`/events/list/${eventId}/team/`, { data: { organizer_id: orgId } });
            fetchEventAndTeam();
        } catch (error) { alert("Failed to remove."); }
    };

    if (isLoading) return <div className="flex justify-center items-center h-[80vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
    if (!eventDetails) return <div className="p-10 text-center text-red-500 font-bold">Event not found.</div>;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans animate-in fade-in">
            <button onClick={() => router.push('/community/events')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold mb-6 transition">
                <ArrowLeft size={18} /> Back to Events Hub
            </button>

            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 mb-8 text-white shadow-lg">
                <h1 className="text-3xl font-black mb-2">{eventDetails.title}</h1>
                <p className="text-gray-300 font-medium">Manage Team Members & Access</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-black mb-6">Add Team Member</h2>
                        <form onSubmit={handleAddMember} className="space-y-5">
                            <div className="space-y-1 relative">
                                <label className="block text-sm font-bold text-gray-700">Search Profile</label>
                                <input type="text" value={searchQuery} onChange={handleSearch} placeholder="Name, Mobile..." className="w-full border p-3 rounded-xl text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-blue-200" />
                                {searchQuery.length >= 2 && !selectedProfile && (
                                    <div className="absolute top-full mt-2 left-0 w-full bg-white border shadow-2xl rounded-xl z-50 max-h-60 overflow-y-auto">
                                        {searchResults.map(p => (
                                            <div key={p.samaj_id} onClick={() => { setSelectedProfile(p); setSearchQuery(p.name); setSearchResults([]); }} className="p-3 border-b hover:bg-blue-50 cursor-pointer flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs">{p.name[0]}</div>
                                                <div className="text-sm font-bold">{p.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-gray-700">Role</label>
                                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full border p-3 rounded-xl bg-gray-50 font-bold text-sm">
                                    <option value="Event Admin">Event Admin</option>
                                    <option value="Event Member">Event Member</option>
                                </select>
                            </div>
                            <button type="submit" disabled={!selectedProfile} className={`w-full py-3 rounded-xl font-black ${selectedProfile ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>Add Member</button>
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-black mb-6">Current Team ({committeeMembers.length})</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {committeeMembers.map((member) => (
                            <div key={member.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">{member.profile_name[0]}</div>
                                    <div>
                                        <h4 className="font-bold text-sm">{member.profile_name}</h4>
                                        <p className="text-[11px] font-black text-gray-500 uppercase">{member.role_title}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleRemoveMember(member.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-xl"><X size={18} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}