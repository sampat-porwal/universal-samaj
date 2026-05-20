"use client";
import React, { useEffect, useState, use } from 'react';
import { ArrowLeft, Trash2, UserPlus, UserCircle, Shield, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ManageEventTeamPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const eventId = resolvedParams.id;

    const [eventDetails, setEventDetails] = useState<any>(null);
    const [committeeMembers, setCommitteeMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // UI states
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
            const [ev, tm] = await Promise.all([
                api.get(`/events/list/${eventId}/`),
                api.get(`/events/list/${eventId}/team/`)
            ]);
            setEventDetails(ev.data);
            setCommitteeMembers(tm.data || []);
        } catch (e) { console.error("Load failed"); } finally { setIsLoading(false); }
    };

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (q.length < 2) { setSearchResults([]); return; }
        const res = await api.get(`/events/list/search_profiles/?q=${q}`);
        setSearchResults(res.data);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProfile) return;
        await api.post(`/events/list/${eventId}/team/`, { samaj_id: selectedProfile.samaj_id, role_title: selectedRole });
        fetchEventAndTeam();
        setSearchQuery(''); setSelectedProfile(null);
    };

    const handleRemove = async (orgId: number) => {
        if (!window.confirm("Remove?")) return;
        await api.delete(`/events/list/${eventId}/team/`, { data: { organizer_id: orgId } });
        fetchEventAndTeam();
    };

    if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto"/></div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <button onClick={() => router.back()} className="mb-6 font-bold text-gray-500">← Back</button>
            <div className="bg-white p-8 rounded-3xl shadow-sm border mb-8">
                <h1 className="text-3xl font-black">{eventDetails?.title}</h1>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white p-6 rounded-3xl border">
                    <h2 className="font-black mb-4">Add Team Member</h2>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <input value={searchQuery} onChange={handleSearch} placeholder="Search name/mobile..." className="w-full p-3 border rounded-xl" />
                        {searchResults.map(p => (
                            <div key={p.samaj_id} onClick={() => { setSelectedProfile(p); setSearchQuery(p.name); setSearchResults([]); }} className="p-3 border-b cursor-pointer">{p.name}</div>
                        ))}
                        <select onChange={(e) => setSelectedRole(e.target.value)} className="w-full p-3 border rounded-xl">
                            <option>Event Admin</option><option>Event Member</option>
                        </select>
                        <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold">Add Member</button>
                    </form>
                </div>
                <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
                    {committeeMembers.map(m => (
                        <div key={m.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between">
                            <div className="font-bold text-sm">{m.profile_name} - {m.role_title}</div>
                            <button onClick={() => handleRemove(m.id)} className="text-red-500"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}