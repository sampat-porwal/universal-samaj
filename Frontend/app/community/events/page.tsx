"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Calendar, MapPin, Trophy, Users, ArrowRight, Vote, Loader2, Plus, X,
    CheckCircle, Clock, Trash2, MessageCircle, Send, Settings, LogOut,
    Pause, XCircle, RotateCcw, CheckCircle2, ChevronDown, AlertCircle, Info
} from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────
type EventStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';
type PollStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';
type TabType = 'EVENTS' | 'POLLS' | 'MY_EVENTS';

// ── Status helpers ─────────────────────────────────────────────────────────────
const EVENT_STATUS_CONFIG: Record<EventStatus, { label: string; color: string; icon: React.ReactNode }> = {
    ACTIVE:    { label: 'Active',    color: 'bg-green-100 text-green-700',   icon: <CheckCircle2 size={12} /> },
    PAUSED:    { label: 'Paused',    color: 'bg-yellow-100 text-yellow-700', icon: <Pause size={12} /> },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700',       icon: <XCircle size={12} /> },
    COMPLETED: { label: 'Completed', color: 'bg-blue-100 text-blue-700',     icon: <CheckCircle size={12} /> },
};

function StatusBadge({ status }: { status: EventStatus }) {
    const cfg = EVENT_STATUS_CONFIG[status] || EVENT_STATUS_CONFIG.ACTIVE;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${cfg.color}`}>
            {cfg.icon} {cfg.label}
        </span>
    );
}

// ── Poll Countdown ─────────────────────────────────────────────────────────────
function PollCountdown({ seconds }: { seconds: number }) {
    const [remaining, setRemaining] = useState(seconds);
    useEffect(() => {
        if (remaining <= 0) return;
        const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
        return () => clearInterval(t);
    }, []);
    if (remaining <= 0) return <span className="text-xs text-red-500 font-bold">Expired</span>;
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    return (
        <span className="text-xs font-bold text-orange-600 flex items-center gap-1">
            <Clock size={12} />
            {h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`} left
        </span>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CommunityEventsPage() {
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<TabType>('EVENTS');
    const [events, setEvents] = useState<any[]>([]);
    const [polls, setPolls] = useState<any[]>([]);
    const [sports, setSports] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState('');

    const isAdmin = ['SUPERADMIN', 'ADMIN', 'SKPUSER', 'SYSTEM_ADMIN', 'EVENT_ADMIN'].includes(userRole);

    // modals
    const [showEventModal, setShowEventModal] = useState(false);
    const [showPollModal, setShowPollModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [joiningId, setJoiningId] = useState<number | null>(null);
    const [leavingId, setLeavingId] = useState<number | null>(null);
    const [eventScope, setEventScope] = useState('GLOBAL');

    // chat panel state (side panel — NOT full overlay)
    const [activeChatEvent, setActiveChatEvent] = useState<any>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => { fetchAll(); fetchUserRole(); }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Poll chat every 8 seconds when chat is open
    useEffect(() => {
        if (activeChatEvent) {
            fetchChatMessages(activeChatEvent.id);
            chatPollRef.current = setInterval(() => fetchChatMessages(activeChatEvent.id), 8000);
        } else {
            if (chatPollRef.current) clearInterval(chatPollRef.current);
        }
        return () => { if (chatPollRef.current) clearInterval(chatPollRef.current); };
    }, [activeChatEvent]);

    const fetchUserRole = async () => {
        try {
            const res = await api.get('/auth/profile/');
            setUserRole(res.data.role?.toUpperCase() || '');
        } catch {}
    };

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const [evRes, pollRes] = await Promise.all([
                api.get('/events/list/'),
                api.get('/events/polls/'),
            ]);
            setEvents(evRes.data.filter((e: any) => e.event_type !== 'CRICKET'));
            setSports(evRes.data.filter((e: any) => e.event_type === 'CRICKET'));
            setPolls(pollRes.data);
        } catch (err) {
            console.error('Fetch error', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchChatMessages = async (eventId: number) => {
        try {
            const res = await api.get(`/events/list/${eventId}/chat/`);
            setChatMessages(res.data);
        } catch {}
    };

    // ── Actions ─────────────────────────────────────────────────────────────────
    const handleJoin = async (eventId: number) => {
        setJoiningId(eventId);
        try {
            await api.post(`/events/list/${eventId}/join/`);
            fetchAll();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to register.');
        } finally { setJoiningId(null); }
    };

    const handleLeave = async (eventId: number) => {
        if (!window.confirm('Leave this event?')) return;
        setLeavingId(eventId);
        try {
            await api.post(`/events/list/${eventId}/leave/`);
            fetchAll();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to leave event.');
        } finally { setLeavingId(null); }
    };

    const handleSetEventStatus = async (eventId: number, newStatus: EventStatus) => {
        try {
            await api.post(`/events/list/${eventId}/set_status/`, { event_status: newStatus });
            fetchAll();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update status.');
        }
    };

    const handleDeleteEvent = async (eventId: number) => {
        if (!window.confirm('Permanently delete this event?')) return;
        try { await api.delete(`/events/list/${eventId}/`); fetchAll(); }
        catch { alert('Failed to delete.'); }
    };

    const handleVote = async (pollId: number, optionId: number) => {
        try {
            await api.post(`/events/polls/${pollId}/cast_vote/`, { option_id: optionId });
            fetchAll();
        } catch (err: any) { alert(err.response?.data?.error || 'Failed to vote.'); }
    };

    const handleSetPollStatus = async (pollId: number, pollStatus: PollStatus) => {
        try {
            await api.post(`/events/polls/${pollId}/set_status/`, { poll_status: pollStatus });
            fetchAll();
        } catch (err: any) { alert(err.response?.data?.error || 'Failed.'); }
    };

    const handleDeletePoll = async (pollId: number) => {
        if (!window.confirm('Delete this poll?')) return;
        try { await api.delete(`/events/polls/${pollId}/`); fetchAll(); }
        catch { alert('Failed to delete poll.'); }
    };

    const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const data = Object.fromEntries(new FormData(e.currentTarget).entries());
        try {
            await api.post('/events/list/', data);
            setShowEventModal(false); fetchAll();
        } catch { alert('Error creating event.'); }
        finally { setIsSubmitting(false); }
    };

    const handleCreatePoll = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const valid = pollOptions.filter(o => o.trim());
        if (valid.length < 2) { alert('At least 2 options required.'); setIsSubmitting(false); return; }
        const fd = new FormData(e.currentTarget);
        try {
            await api.post('/events/polls/', {
                question: fd.get('question'),
                duration_hours: fd.get('duration_hours'),
                options: valid,
            });
            setShowPollModal(false); setPollOptions(['', '']); fetchAll();
        } catch { alert('Error creating poll.'); }
        finally { setIsSubmitting(false); }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !activeChatEvent) return;
        const msg = chatInput;
        setChatInput('');
        try {
            await api.post(`/events/list/${activeChatEvent.id}/chat/`, { message: msg });
            fetchChatMessages(activeChatEvent.id);
        } catch { alert('Failed to send.'); }
    };

    const myParticipations = [...events, ...sports].filter(e => e.is_joined);

    if (isLoading) return (
        <div className="flex justify-center items-center h-[60vh]">
            <Loader2 size={40} className="animate-spin text-blue-600" />
        </div>
    );

    // ── Event Card ───────────────────────────────────────────────────────────────
    const EventCard = ({ event, variant = 'blue' }: { event: any; variant?: 'blue' | 'yellow' }) => {
        const accent = variant === 'yellow'
            ? { join: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-500 hover:text-white hover:border-yellow-500', icon: <Trophy size={15} /> }
            : { join: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600', icon: <ArrowRight size={15} /> };

        const statusCfg = EVENT_STATUS_CONFIG[event.event_status as EventStatus] || EVENT_STATUS_CONFIG.ACTIVE;
        const canJoin = event.event_status === 'ACTIVE' && !event.is_joined && !event.is_full;

        return (
            <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden ${event.event_status !== 'ACTIVE' ? 'opacity-80' : ''}`}>
                {/* Status stripe */}
                {event.event_status !== 'ACTIVE' && (
                    <div className={`h-1 w-full ${event.event_status === 'PAUSED' ? 'bg-yellow-400' : event.event_status === 'CANCELLED' ? 'bg-red-400' : 'bg-blue-400'}`} />
                )}

                <div className="p-5">
                    {/* Tags row */}
                    <div className="flex items-center flex-wrap gap-2 mb-3 pr-8">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${variant === 'yellow' ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'}`}>
                            {event.event_type}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{event.event_scope}</span>
                        <StatusBadge status={event.event_status || 'ACTIVE'} />
                        {event.is_full && (
                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-50 text-red-600">Full</span>
                        )}
                    </div>

                    {/* Delete button */}
                    {isAdmin && (
                        <button onClick={() => handleDeleteEvent(event.id)}
                            className="absolute top-3 right-3 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition">
                            <Trash2 size={15} />
                        </button>
                    )}

                    <h3 className="text-base font-black text-gray-900 mb-3 capitalize">{event.title}</h3>

                    <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-4 border border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                            <Calendar size={14} className="text-blue-400 shrink-0" /> {event.date_start}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                            <MapPin size={14} className="text-red-400 shrink-0" /> {event.location_name}
                        </div>
                        {event.participant_count !== undefined && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                <Users size={14} className="text-gray-400 shrink-0" />
                                {event.participant_count} registered
                                {event.max_participants && ` / ${event.max_participants} max`}
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                        {/* Join / Registered / Leave */}
                        {event.is_joined ? (
                            <button
                                onClick={() => handleLeave(event.id)}
                                disabled={leavingId === event.id}
                                className="flex-1 font-bold py-2 px-3 rounded-xl flex justify-center items-center gap-1.5 text-sm bg-green-50 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition group"
                            >
                                <CheckCircle size={15} className="group-hover:hidden" />
                                <LogOut size={15} className="hidden group-hover:block" />
                                <span className="group-hover:hidden">Registered</span>
                                <span className="hidden group-hover:inline">Leave</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => handleJoin(event.id)}
                                disabled={!canJoin || joiningId === event.id}
                                className={`flex-1 font-bold py-2 px-3 rounded-xl flex justify-center items-center gap-1.5 text-sm border transition ${canJoin ? accent.join : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                            >
                                {joiningId === event.id ? <Loader2 size={15} className="animate-spin" /> : accent.icon}
                                {event.is_full ? 'Full' : event.event_status !== 'ACTIVE' ? event.event_status : 'Join'}
                            </button>
                        )}

                        {/* Chat (organizers only) */}
                        {(isAdmin || event.is_organizer) && (
                            <button
                                onClick={() => { setChatMessages([]); setActiveChatEvent(event); }}
                                className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 text-sm transition"
                            >
                                <MessageCircle size={15} /> Chat
                            </button>
                        )}

                        {/* Manage (admin only) */}
                        {isAdmin && (
                            <button
                                onClick={() => router.push(`/community/events/${event.id}`)}
                                className="bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 text-sm transition"
                            >
                                <Settings size={15} /> Manage
                            </button>
                        )}
                    </div>

                    {/* Admin: Status controls */}
                    {isAdmin && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                            <span className="text-[10px] text-gray-400 font-bold self-center">Status:</span>
                            {(['ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED'] as EventStatus[]).map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleSetEventStatus(event.id, s)}
                                    className={`text-[10px] px-2 py-1 rounded-lg font-bold border transition ${
                                        event.event_status === s
                                            ? 'bg-gray-900 text-white border-gray-900'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ── Render ───────────────────────────────────────────────────────────────────
    return (
        // Key fix: position relative, don't use fixed full-screen for chat
        <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans">

            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 mb-1">
                        <Calendar className="text-blue-600" size={26} /> Samaj Events Hub
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Community gatherings, sports, and key decisions.</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
                    <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                        <button onClick={() => setActiveTab('EVENTS')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'EVENTS' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                            Activities
                        </button>
                        <button onClick={() => setActiveTab('POLLS')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'POLLS' ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                            Decisions
                        </button>
                        <button onClick={() => setActiveTab('MY_EVENTS')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'MY_EVENTS' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                            Mine
                        </button>
                    </div>
                    {isAdmin && activeTab === 'EVENTS' && (
                        <button onClick={() => setShowEventModal(true)}
                            className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition">
                            <Plus size={16} /> New Event
                        </button>
                    )}
                    {isAdmin && activeTab === 'POLLS' && (
                        <button onClick={() => setShowPollModal(true)}
                            className="flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-700 transition">
                            <Plus size={16} /> New Poll
                        </button>
                    )}
                </div>
            </div>

            {/* Layout: main content + optional chat side panel */}
            <div className={`flex gap-6 ${activeChatEvent ? 'items-start' : ''}`}>

                {/* ── MAIN CONTENT ── */}
                <div className={`flex-1 min-w-0 transition-all ${activeChatEvent ? 'lg:max-w-[calc(100%-360px)]' : ''}`}>

                    {/* EVENTS TAB */}
                    {activeTab === 'EVENTS' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <h2 className="text-base font-black text-gray-700 mb-4 flex items-center gap-2">
                                    <Users size={16} className="text-blue-600" /> Cultural & Social Programs
                                </h2>
                                <div className="space-y-4">
                                    {events.length === 0
                                        ? <div className="p-8 text-center border-2 border-dashed rounded-2xl text-gray-400 font-bold text-sm">No upcoming events.</div>
                                        : events.map(ev => <EventCard key={ev.id} event={ev} variant="blue" />)
                                    }
                                </div>
                            </div>
                            <div>
                                <h2 className="text-base font-black text-gray-700 mb-4 flex items-center gap-2">
                                    <Trophy size={16} className="text-yellow-500" /> Sports Tournaments
                                </h2>
                                <div className="space-y-4">
                                    {sports.length === 0
                                        ? <div className="p-8 text-center border-2 border-dashed rounded-2xl text-gray-400 font-bold text-sm">No active tournaments.</div>
                                        : sports.map(ev => <EventCard key={ev.id} event={ev} variant="yellow" />)
                                    }
                                </div>
                            </div>
                        </div>
                    )}

                    {/* POLLS TAB */}
                    {activeTab === 'POLLS' && (
                        <div className="grid md:grid-cols-2 gap-5">
                            {polls.length === 0
                                ? <p className="col-span-full text-center text-gray-400 p-10">No active polls right now.</p>
                                : polls.map(poll => (
                                    <div key={poll.id}
                                        className={`bg-white rounded-2xl p-5 border shadow-sm relative ${poll.my_vote ? 'border-purple-200' : 'border-gray-200'} ${poll.status === 'PAUSED' ? 'opacity-70' : ''}`}>
                                        {/* Admin controls */}
                                        {isAdmin && (
                                            <div className="absolute top-3 right-3 flex gap-1">
                                                {poll.status === 'ACTIVE' && (
                                                    <button onClick={() => handleSetPollStatus(poll.id, 'PAUSED')}
                                                        title="Pause poll"
                                                        className="text-yellow-500 bg-yellow-50 hover:bg-yellow-100 p-1.5 rounded-lg transition">
                                                        <Pause size={14} />
                                                    </button>
                                                )}
                                                {poll.status === 'PAUSED' && (
                                                    <button onClick={() => handleSetPollStatus(poll.id, 'ACTIVE')}
                                                        title="Resume poll"
                                                        className="text-green-600 bg-green-50 hover:bg-green-100 p-1.5 rounded-lg transition">
                                                        <RotateCcw size={14} />
                                                    </button>
                                                )}
                                                {poll.status !== 'CLOSED' && (
                                                    <button onClick={() => handleSetPollStatus(poll.id, 'CLOSED')}
                                                        title="Close poll"
                                                        className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg transition">
                                                        <CheckCircle2 size={14} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDeletePoll(poll.id)}
                                                    className="text-red-400 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Poll status & timer */}
                                        <div className="flex items-center gap-2 mb-3 pr-24">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                poll.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                poll.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-500'
                                            }`}>{poll.status}</span>
                                            {poll.status === 'ACTIVE' && poll.time_left_seconds > 0 && (
                                                <PollCountdown seconds={poll.time_left_seconds} />
                                            )}
                                            <span className="text-xs text-gray-400 font-medium ml-auto">
                                                {poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-black text-gray-900 mb-4">{poll.question}</h3>

                                        <div className="space-y-2">
                                            {poll.options.map((opt: any) => {
                                                const isMyVote = poll.my_vote === opt.id;
                                                const canVote = !poll.my_vote && poll.status === 'ACTIVE';
                                                const pct = poll.status === 'CLOSED' && poll.total_votes > 0
                                                    ? Math.round((opt.vote_count / poll.total_votes) * 100)
                                                    : null;

                                                return (
                                                    <button key={opt.id}
                                                        onClick={() => canVote && handleVote(poll.id, opt.id)}
                                                        disabled={!canVote}
                                                        className={`w-full text-left p-3 rounded-xl border-2 transition-all relative overflow-hidden ${
                                                            isMyVote ? 'border-purple-500 bg-purple-50' :
                                                            canVote ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30' :
                                                            'border-gray-100 cursor-default'
                                                        }`}
                                                    >
                                                        {/* Vote % bar for closed polls */}
                                                        {pct !== null && (
                                                            <div className="absolute inset-0 bg-purple-100 transition-all"
                                                                style={{ width: `${pct}%`, opacity: 0.3 }} />
                                                        )}
                                                        <div className="relative flex justify-between items-center">
                                                            <span className="text-sm font-bold text-gray-800">{opt.option_text}</span>
                                                            {pct !== null && (
                                                                <span className="text-sm font-black text-purple-700">
                                                                    {pct}% <span className="text-xs text-gray-400 font-medium">({opt.vote_count})</span>
                                                                </span>
                                                            )}
                                                            {isMyVote && <CheckCircle size={16} className="text-purple-600 shrink-0" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* MY EVENTS TAB */}
                    {activeTab === 'MY_EVENTS' && (
                        <div className="grid md:grid-cols-3 gap-4">
                            {myParticipations.length === 0
                                ? <p className="col-span-full text-center text-gray-400 p-8 border border-dashed rounded-xl bg-white">
                                    You haven't joined any events yet.
                                  </p>
                                : myParticipations.map(ev => (
                                    <div key={ev.id} className="bg-white p-5 rounded-2xl shadow-sm border border-green-200 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-green-400" />
                                        <span className="bg-gray-100 text-gray-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-full mb-2 inline-block">
                                            {ev.event_type}
                                        </span>
                                        <h3 className="text-base font-black text-gray-900 mb-1 capitalize">{ev.title}</h3>
                                        <p className="text-xs text-gray-500 mb-3">{ev.date_start} · {ev.location_name}</p>
                                        <div className="flex gap-2">
                                            <div className="flex-1 text-sm font-bold text-green-700 flex items-center gap-1.5 bg-green-50 px-3 py-2 rounded-lg">
                                                <CheckCircle size={14} /> Confirmed
                                            </div>
                                            <button
                                                onClick={() => handleLeave(ev.id)}
                                                className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition font-bold text-xs flex items-center gap-1"
                                            >
                                                <LogOut size={13} /> Leave
                                            </button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                </div>

                {/* ── CHAT SIDE PANEL (not full overlay — respects sidebar) ── */}
                {activeChatEvent && (
                    <div className="hidden lg:flex flex-col w-[340px] shrink-0 bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
                        style={{ height: 'calc(100vh - 160px)', position: 'sticky', top: '24px' }}>
                        {/* Chat header */}
                        <div className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-sm font-black flex items-center gap-1.5">
                                    <MessageCircle size={15} /> {activeChatEvent.title}
                                </h3>
                                <p className="text-[10px] text-gray-400 mt-0.5">Event Team Chat</p>
                            </div>
                            <button onClick={() => setActiveChatEvent(null)}
                                className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-1.5 rounded-lg transition">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                            {chatMessages.length === 0
                                ? <p className="text-center text-gray-400 text-sm font-bold mt-8">No messages yet. Start coordinating! 👋</p>
                                : chatMessages.map((msg: any, idx: number) => (
                                    <div key={idx} className={`flex flex-col ${msg.is_me ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[10px] font-bold text-gray-400 mb-0.5">
                                            {msg.is_me ? 'You' : msg.sender_name}
                                        </span>
                                        <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm font-medium shadow-sm ${
                                            msg.is_me
                                                ? 'bg-blue-600 text-white rounded-tr-sm'
                                                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm'
                                        }`}>
                                            {msg.message}
                                        </div>
                                    </div>
                                ))
                            }
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-2.5 border-t border-gray-200 bg-white shrink-0">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-gray-100 rounded-full px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-200 py-2"
                                />
                                <button type="submit" disabled={!chatInput.trim()}
                                    className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 disabled:opacity-40 transition">
                                    <Send size={15} />
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Mobile chat (bottom sheet style) */}
                {activeChatEvent && (
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl rounded-t-2xl"
                        style={{ height: '60vh' }}>
                        <div className="flex flex-col h-full">
                            <div className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center rounded-t-2xl shrink-0">
                                <h3 className="text-sm font-black flex items-center gap-1.5">
                                    <MessageCircle size={15} /> {activeChatEvent.title}
                                </h3>
                                <button onClick={() => setActiveChatEvent(null)} className="text-gray-400 hover:text-white p-1.5 rounded-lg bg-gray-800">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                                {chatMessages.map((msg: any, idx: number) => (
                                    <div key={idx} className={`flex flex-col ${msg.is_me ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[10px] text-gray-400 mb-0.5">{msg.is_me ? 'You' : msg.sender_name}</span>
                                        <div className={`px-3 py-2 rounded-2xl max-w-[80%] text-sm ${msg.is_me ? 'bg-blue-600 text-white' : 'bg-white border text-gray-800'}`}>
                                            {msg.message}
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="p-2.5 border-t bg-white shrink-0">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                                        placeholder="Type..." className="flex-1 bg-gray-100 rounded-full px-3 py-2 text-sm outline-none" />
                                    <button type="submit" disabled={!chatInput.trim()} className="bg-blue-600 text-white p-2.5 rounded-full disabled:opacity-40">
                                        <Send size={15} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── CREATE EVENT MODAL ── */}
            {showEventModal && (
                <div className="fixed inset-0 bg-black/50 z-[200] flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-5 border-b bg-blue-50 rounded-t-2xl shrink-0">
                            <h2 className="text-lg font-black text-blue-900 flex items-center gap-2">
                                <Calendar size={18} /> Create New Event
                            </h2>
                            <button onClick={() => setShowEventModal(false)} className="text-blue-500 hover:bg-blue-200 p-2 rounded-full">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateEvent} className="p-5 flex flex-col gap-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Event Title</label>
                                <input type="text" name="title" required className="w-full border p-2.5 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                                    <select name="event_type" className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm">
                                        <option value="CRICKET">Cricket</option>
                                        <option value="MEETING">Meeting</option>
                                        <option value="VIVAH">Samuhik Vivah</option>
                                        <option value="BDC">Blood Donation</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Scope</label>
                                    <select name="event_scope" value={eventScope} onChange={e => setEventScope(e.target.value)}
                                        className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm">
                                        <option value="GLOBAL">Whole Samaj</option>
                                        <option value="DISTRICT">District</option>
                                        <option value="CITY">City/Village</option>
                                    </select>
                                </div>
                            </div>
                            {eventScope === 'DISTRICT' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Target District</label>
                                    <input type="text" name="target_district" required className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm" />
                                </div>
                            )}
                            {eventScope === 'CITY' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Target City/Village</label>
                                    <input type="text" name="target_city_village" required className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm" />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Start Date</label>
                                    <input type="date" name="date_start" required className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                                    <input type="text" name="location_name" required className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Max Participants (optional)</label>
                                <input type="number" name="max_participants" min="1"
                                    className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm"
                                    placeholder="Leave blank for unlimited" />
                            </div>
                            <button type="submit" disabled={isSubmitting}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl shadow transition mt-1">
                                {isSubmitting ? 'Saving...' : 'Publish Event'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── CREATE POLL MODAL ── */}
            {showPollModal && (
                <div className="fixed inset-0 bg-black/50 z-[200] flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-5 border-b bg-purple-50 rounded-t-2xl shrink-0">
                            <h2 className="text-lg font-black text-purple-900 flex items-center gap-2">
                                <Vote size={18} /> Create Poll
                            </h2>
                            <button onClick={() => setShowPollModal(false)} className="text-purple-500 hover:bg-purple-200 p-2 rounded-full">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreatePoll} className="p-5 flex flex-col gap-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Question</label>
                                <textarea name="question" required rows={2}
                                    className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm focus:ring-2 focus:ring-purple-200" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1">
                                    <Clock size={14} className="text-gray-400" /> Duration
                                </label>
                                <select name="duration_hours" className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm">
                                    <option value="1">1 Hour</option>
                                    <option value="24">24 Hours</option>
                                    <option value="72">3 Days</option>
                                    <option value="168">1 Week</option>
                                    <option value="720">1 Month</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-black text-gray-800 mb-2">Options</label>
                                <div className="space-y-2">
                                    {pollOptions.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="w-5 text-center text-xs font-bold text-gray-400 bg-gray-100 rounded-full py-1 shrink-0">{idx + 1}</span>
                                            <input
                                                type="text" value={opt}
                                                onChange={e => { const n = [...pollOptions]; n[idx] = e.target.value; setPollOptions(n); }}
                                                className="flex-1 border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200"
                                                placeholder={`Option ${idx + 1}`}
                                            />
                                            {pollOptions.length > 2 && (
                                                <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                                    className="text-gray-400 hover:text-red-500 p-1">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={() => setPollOptions([...pollOptions, ''])}
                                    className="mt-2 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                                    <Plus size={13} /> Add Option
                                </button>
                            </div>
                            <button type="submit" disabled={isSubmitting}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-xl shadow transition">
                                {isSubmitting ? 'Launching...' : 'Launch Poll'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
