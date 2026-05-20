"use client";

import React, { useEffect, useState, use } from 'react';
// 🌟 FIXED: Added Trash2 to the imports
import { ArrowLeft, Users, UserCircle, X, CheckCircle2, Shield, UserPlus, Search, Loader2, Trash2 } from 'lucide-react'; 
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ManageEventTeamPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const unwrappedParams = use(params);
    const eventId = unwrappedParams.id;

    const [eventDetails, setEventDetails] = useState<any>(null);
    const [committeeMembers, setCommitteeMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [selectedRole, setSelectedRole] = useState('Event Member');

    useEffect(() => {
        if (eventId) fetchEventAndTeam();
    }, [eventId]);

    const fetchEventAndTeam = async () => {
        setIsLoading(true);
        try {
            const eventRes = await api.get(`/events/list/${eventId}/`);
            setEventDetails(eventRes.data);
            const teamRes = await api.get(`/events/list/${eventId}/team/`);
            setCommitteeMembers(teamRes.data || []);
        } catch (error) {
            console.error("Failed to load data.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (q.length < 2) { setSearchResults([]); return; }
        try {
            const res = await api.get(`/events/list/search_profiles/?q=${q}`);
            setSearchResults(res.data);
        } catch (err) { console.error("Search failed"); }
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProfile) return;
        try {
            await api.post(`/events/list/${eventId}/team/`, { 
                samaj_id: selectedProfile.samaj_id, 
                role_title: selectedRole 
            });
            alert("Member added successfully!");
            fetchEventAndTeam();
            setSearchQuery(''); setSelectedProfile(null);
        } catch (error: any) { alert("Failed to add."); }
    };

    const handleRemoveMember = async (orgId: number) => {
        if (!window.confirm("Remove this member?")) return;
        try { 
            await api.delete(`/events/list/${eventId}/team/`, { data: { organizer_id: orgId } }); 
            fetchEventAndTeam(); 
        } catch (error) { alert("Failed."); }
    };

    if (isLoading) return <div className="flex justify-center items-center h-[80vh]"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;
    if (!eventDetails) return <div className="p-10 text-center text-red-500 font-bold">Event not found.</div>;

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans bg-gray-50 min-h-screen">
            <button onClick={() => router.push('/community/events')} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold mb-6 transition">
                <ArrowLeft size={18} /> Back to Events
            </button>

            {/* HEADER */}
            <div className="bg-white rounded-3xl p-8 mb-8 shadow-sm border border-gray-100">
                <h1 className="text-3xl font-black text-gray-900">{eventDetails.title}</h1>
                <p className="text-gray-500 font-bold mt-1">Manage Committee Members</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* ADD MEMBER */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-6">
                        <h2 className="text-lg font-black text-gray-900 mb-6">Add Team Member</h2>
                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div className="relative">
                                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Search Profile</label>
                                <input type="text" value={searchQuery} onChange={handleSearch} placeholder="Name, Village..." className="w-full border-2 border-gray-100 p-3 rounded-xl text-sm font-bold bg-gray-50 outline-none focus:border-blue-500" />
                                {searchQuery.length >= 2 && !selectedProfile && (
                                    <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 shadow-2xl rounded-2xl z-50 max-h-60 overflow-y-auto">
                                        {searchResults.map(p => (
                                            <div key={p.samaj_id} onClick={() => { setSelectedProfile(p); setSearchQuery(p.name); setSearchResults([]); }} className="p-4 hover:bg-blue-50 cursor-pointer border-b">
                                                <div className="font-bold text-sm text-gray-900">{p.name}</div>
                                                <div className="text-[10px] text-gray-500">📍 {p.village || 'No village'}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Select Role</label>
                                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full border-2 border-gray-100 p-3 rounded-xl text-sm font-bold bg-gray-50 outline-none focus:border-blue-500">
                                    <option value="Event Admin">👑 Event Admin</option>
                                    <option value="Event Member">👤 Event Member</option>
                                </select>
                            </div>
                            <button type="submit" disabled={!selectedProfile} className={`w-full py-3 rounded-xl font-black transition ${selectedProfile ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400'}`}>Add Member</button>
                        </form>
                    </div>
                </div>

                {/* TEAM LIST */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-black text-gray-900 mb-6">Current Team ({committeeMembers.length})</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {committeeMembers.map((member) => (
                            <div key={member.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${member.role_title === 'Event Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {member.profile_name[0]}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-900 text-sm">{member.profile_name}</h4>
                                        <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${member.role_title === 'Event Admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {member.role_title}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => handleRemoveMember(member.id)} className="text-red-400 hover:bg-red-50 p-2.5 rounded-xl transition"><Trash2 size={18} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}