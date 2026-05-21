"use client";
import React, { useEffect, useState, use } from 'react';
import {
    ArrowLeft, Trash2, UserPlus, Shield, Loader2, Users, BarChart2,
    Droplets, Trophy, CheckCircle2, XCircle, AlertCircle, Plus, X, Search
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

type ManageTab = 'TEAM' | 'PARTICIPANTS' | 'BDC' | 'ANALYTICS';

export default function ManageEventPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id: eventId } = use(params);

    const [event, setEvent] = useState<any>(null);
    const [team, setTeam] = useState<any[]>([]);
    const [participants, setParticipants] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [bdcRecords, setBdcRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ManageTab>('TEAM');

    // Add member form
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [selectedRole, setSelectedRole] = useState('Event Member');
    const [addingMember, setAddingMember] = useState(false);

    // BDC form
    const [showBdcForm, setShowBdcForm] = useState(false);
    const [bdcType, setBdcType] = useState<'member' | 'guest'>('guest');
    const [bdcSubmitting, setBdcSubmitting] = useState(false);

    useEffect(() => { if (eventId) loadAll(); }, [eventId]);
    useEffect(() => {
        if (activeTab === 'PARTICIPANTS') loadParticipants();
        if (activeTab === 'ANALYTICS') loadAnalytics();
        if (activeTab === 'BDC') loadBdc();
    }, [activeTab]);

    const loadAll = async () => {
        setIsLoading(true);
        try {
            const [evRes, teamRes] = await Promise.all([
                api.get(`/events/list/${eventId}/`),
                api.get(`/events/list/${eventId}/team/`),
            ]);
            setEvent(evRes.data);
            setTeam(teamRes.data || []);
        } catch { console.error('Load failed'); }
        finally { setIsLoading(false); }
    };

    const loadParticipants = async () => {
        try {
            const res = await api.get(`/events/list/${eventId}/participants/`);
            setParticipants(res.data || []);
        } catch {}
    };

    const loadAnalytics = async () => {
        try {
            const res = await api.get(`/events/list/${eventId}/analytics/`);
            setAnalytics(res.data);
        } catch {}
    };

    const loadBdc = async () => {
        try {
            const res = await api.get(`/events/bdc/?event_id=${eventId}`);
            setBdcRecords(res.data || []);
        } catch {}
    };

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setSearchQuery(q);
        setSelectedProfile(null);
        if (q.length < 2) { setSearchResults([]); return; }
        const res = await api.get(`/events/list/search_profiles/?q=${q}`);
        setSearchResults(res.data || []);
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProfile) { alert('Please select a profile from search.'); return; }
        setAddingMember(true);
        try {
            await api.post(`/events/list/${eventId}/team/`, {
                samaj_id: selectedProfile.samaj_id,
                role_title: selectedRole,
            });
            setSearchQuery(''); setSelectedProfile(null); setSearchResults([]);
            const res = await api.get(`/events/list/${eventId}/team/`);
            setTeam(res.data || []);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to add member.');
        } finally { setAddingMember(false); }
    };

    const handleRemoveMember = async (orgId: number) => {
        if (!window.confirm('Remove this member from the team?')) return;
        try {
            await api.delete(`/events/list/${eventId}/team/`, { data: { organizer_id: orgId } });
            setTeam(team.filter(m => m.id !== orgId));
        } catch { alert('Failed to remove.'); }
    };

    const handleRemoveParticipant = async (participantId: number) => {
        if (!window.confirm('Remove this participant?')) return;
        try {
            await api.delete(`/events/list/${eventId}/participants/${participantId}/`);
            setParticipants(participants.filter(p => p.id !== participantId));
        } catch { alert('Failed to remove.'); }
    };

    const handleBdcSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setBdcSubmitting(true);
        const fd = new FormData(e.currentTarget);
        const data: any = { event: eventId, donated_on: fd.get('donated_on') };
        if (bdcType === 'member') {
            data.samaj_id = fd.get('samaj_id');
        } else {
            data.guest_name = fd.get('guest_name');
            data.guest_mobile = fd.get('guest_mobile');
            data.guest_blood_group = fd.get('guest_blood_group');
            data.guest_age = fd.get('guest_age');
        }
        try {
            await api.post('/events/bdc/', data);
            setShowBdcForm(false);
            loadBdc();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to add donation record.');
        } finally { setBdcSubmitting(false); }
    };

    if (isLoading) return (
        <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40} /></div>
    );

    const TABS: { key: ManageTab; label: string; icon: React.ReactNode }[] = [
        { key: 'TEAM', label: 'Team', icon: <Shield size={15} /> },
        { key: 'PARTICIPANTS', label: 'Participants', icon: <Users size={15} /> },
        ...(event?.event_type === 'BDC' ? [{ key: 'BDC' as ManageTab, label: 'Donations', icon: <Droplets size={15} /> }] : []),
        { key: 'ANALYTICS', label: 'Analytics', icon: <BarChart2 size={15} /> },
    ];

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            {/* Back + Event title */}
            <button onClick={() => router.back()} className="mb-5 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition">
                <ArrowLeft size={16} /> Back to Events
            </button>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                {event?.event_type}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                event?.event_status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                event?.event_status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                            }`}>{event?.event_status}</span>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 capitalize">{event?.title}</h1>
                        <p className="text-sm text-gray-500 mt-1">{event?.date_start} · {event?.location_name}</p>
                    </div>
                    <div className="flex gap-3 text-center">
                        <div className="bg-blue-50 rounded-xl px-4 py-2">
                            <div className="text-xl font-black text-blue-700">{team.length}</div>
                            <div className="text-[10px] text-blue-500 font-bold">Team</div>
                        </div>
                        <div className="bg-green-50 rounded-xl px-4 py-2">
                            <div className="text-xl font-black text-green-700">{event?.participant_count ?? '–'}</div>
                            <div className="text-[10px] text-green-500 font-bold">Participants</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab navigation */}
            <div className="flex gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm mb-6 w-fit">
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${
                            activeTab === tab.key ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:bg-gray-50'
                        }`}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ── TEAM TAB ── */}
            {activeTab === 'TEAM' && (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Add member form */}
                    <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <h2 className="font-black text-gray-800 mb-4 flex items-center gap-2">
                            <UserPlus size={16} className="text-blue-600" /> Add Team Member
                        </h2>
                        <form onSubmit={handleAddMember} className="space-y-3">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={searchQuery} onChange={handleSearch}
                                    placeholder="Search name / mobile / ID..."
                                    className="w-full pl-8 pr-3 py-2.5 border rounded-xl text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>

                            {/* Search dropdown */}
                            {searchResults.length > 0 && (
                                <div className="border rounded-xl overflow-hidden shadow-sm">
                                    {searchResults.map(p => (
                                        <button key={p.samaj_id} type="button"
                                            onClick={() => { setSelectedProfile(p); setSearchQuery(p.name); setSearchResults([]); }}
                                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-blue-50 border-b last:border-b-0 transition">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-black shrink-0">
                                                {p.name[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">{p.name}</div>
                                                <div className="text-xs text-gray-400">{p.village} · {p.samaj_id}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedProfile && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                                    <div>
                                        <div className="text-sm font-bold text-green-800">{selectedProfile.name}</div>
                                        <div className="text-xs text-green-600">{selectedProfile.samaj_id}</div>
                                    </div>
                                </div>
                            )}

                            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                                className="w-full border p-2.5 rounded-xl bg-gray-50 text-sm outline-none">
                                <option value="Event Admin">Event Admin (can add/remove members)</option>
                                <option value="Event Member">Event Member</option>
                            </select>

                            <button type="submit" disabled={addingMember || !selectedProfile}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2">
                                {addingMember ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                                Add Member
                            </button>
                        </form>
                    </div>

                    {/* Team member cards */}
                    <div className="lg:col-span-2">
                        <div className="grid sm:grid-cols-2 gap-3">
                            {team.length === 0
                                ? <div className="col-span-2 p-8 text-center border-2 border-dashed rounded-2xl text-gray-400 text-sm font-bold">
                                    No team members yet. Add someone above.
                                  </div>
                                : team.map(m => (
                                    <div key={m.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${
                                                m.role_title === 'Event Admin' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {m.profile_name?.[0] || '?'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-gray-900">{m.profile_name}</div>
                                                <div className={`text-[10px] font-black uppercase ${
                                                    m.role_title === 'Event Admin' ? 'text-blue-600' : 'text-gray-400'
                                                }`}>
                                                    {m.role_title}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveMember(m.id)}
                                            className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))
                            }
                        </div>
                        <p className="text-xs text-gray-400 mt-3 font-medium flex items-center gap-1">
                            <AlertCircle size={12} /> Event Admins can add/remove members. Event Members have chat access only.
                        </p>
                    </div>
                </div>
            )}

            {/* ── PARTICIPANTS TAB ── */}
            {activeTab === 'PARTICIPANTS' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                        <h2 className="font-black text-gray-700 flex items-center gap-2">
                            <Users size={16} className="text-green-600" /> Registered Participants
                        </h2>
                        <span className="text-sm font-bold text-gray-500">{participants.length} total</span>
                    </div>
                    {participants.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm font-bold">No participants yet.</div>
                    ) : (
                        <div className="divide-y">
                            {participants.map((p, idx) => (
                                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-black shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-900">{p.profile_name}</div>
                                            <div className="text-xs text-gray-400">{p.village} · {p.samaj_id}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveParticipant(p.id)}
                                        className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition">
                                        <XCircle size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── BDC TAB ── */}
            {activeTab === 'BDC' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-black text-gray-700 flex items-center gap-2">
                            <Droplets size={16} className="text-red-500" /> Blood Donation Records
                        </h2>
                        <button onClick={() => setShowBdcForm(!showBdcForm)}
                            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition">
                            <Plus size={15} /> Add Donor
                        </button>
                    </div>

                    {/* Add donor form */}
                    {showBdcForm && (
                        <div className="bg-white rounded-2xl border border-red-100 p-5 mb-5 shadow-sm">
                            <div className="flex gap-2 mb-4">
                                <button onClick={() => setBdcType('guest')}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition ${bdcType === 'guest' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                    Guest Donor
                                </button>
                                <button onClick={() => setBdcType('member')}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition ${bdcType === 'member' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                    Samaj Member
                                </button>
                            </div>

                            <form onSubmit={handleBdcSubmit} className="grid grid-cols-2 gap-3">
                                {bdcType === 'member' ? (
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Samaj ID</label>
                                        <input name="samaj_id" required className="w-full border p-2.5 rounded-xl bg-gray-50 text-sm outline-none" placeholder="SKP-XXXX" />
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                                            <input name="guest_name" required className="w-full border p-2.5 rounded-xl bg-gray-50 text-sm outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Mobile</label>
                                            <input name="guest_mobile" className="w-full border p-2.5 rounded-xl bg-gray-50 text-sm outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Blood Group *</label>
                                            <select name="guest_blood_group" required className="w-full border p-2.5 rounded-xl bg-gray-50 text-sm outline-none">
                                                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Age</label>
                                            <input name="guest_age" type="number" min="18" max="65" className="w-full border p-2.5 rounded-xl bg-gray-50 text-sm outline-none" />
                                        </div>
                                    </>
                                )}
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Donation Date *</label>
                                    <input name="donated_on" type="date" required className="w-full border p-2.5 rounded-xl bg-gray-50 text-sm outline-none" />
                                </div>
                                <div className="col-span-2 flex gap-2">
                                    <button type="submit" disabled={bdcSubmitting}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition">
                                        {bdcSubmitting ? 'Saving...' : 'Save Record'}
                                    </button>
                                    <button type="button" onClick={() => setShowBdcForm(false)}
                                        className="px-4 bg-gray-100 text-gray-600 font-bold py-2.5 rounded-xl text-sm hover:bg-gray-200 transition">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Records list */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {bdcRecords.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm font-bold">No donation records yet.</div>
                        ) : (
                            <div className="divide-y">
                                {bdcRecords.map((r: any, idx: number) => (
                                    <div key={r.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-sm shrink-0">
                                            {r.blood_group_display || '?'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-gray-900">{r.donor_display_name}</div>
                                            <div className="text-xs text-gray-400">{r.donated_on}</div>
                                        </div>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                            r.profile ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {r.profile ? 'Member' : 'Guest'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── ANALYTICS TAB ── */}
            {activeTab === 'ANALYTICS' && (
                <div>
                    {!analytics ? (
                        <div className="text-center p-8"><Loader2 className="animate-spin mx-auto text-blue-600" size={32} /></div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-5 mb-6">
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                                <div className="text-4xl font-black text-blue-700 mb-1">{analytics.total_registrations}</div>
                                <div className="text-sm text-gray-500 font-bold">Total Registrations</div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                                <div className="text-4xl font-black text-purple-700 mb-1">{analytics.committee_size}</div>
                                <div className="text-sm text-gray-500 font-bold">Committee Members</div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                                <div className={`text-2xl font-black mb-1 ${analytics.is_full ? 'text-red-600' : 'text-green-600'}`}>
                                    {analytics.is_full ? 'FULL' : 'OPEN'}
                                </div>
                                <div className="text-sm text-gray-500 font-bold">
                                    {analytics.max_participants
                                        ? `${analytics.total_registrations} / ${analytics.max_participants} spots`
                                        : 'Unlimited spots'
                                    }
                                </div>
                            </div>

                            {analytics.village_wise?.length > 0 && (
                                <div className="md:col-span-3 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                    <h3 className="font-black text-gray-700 mb-4 flex items-center gap-2">
                                        <BarChart2 size={16} className="text-blue-600" /> Village-wise Participation
                                    </h3>
                                    <div className="space-y-2">
                                        {analytics.village_wise.map((v: any, idx: number) => {
                                            const pct = analytics.total_registrations > 0
                                                ? Math.round((v.count / analytics.total_registrations) * 100)
                                                : 0;
                                            return (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <div className="w-28 text-sm font-bold text-gray-700 truncate">{v.profile__village_en || 'Unknown'}</div>
                                                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                                                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <div className="text-sm font-black text-gray-700 w-8 text-right">{v.count}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
