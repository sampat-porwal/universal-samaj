"use client";

import React, { useEffect, useState, useRef } from 'react';
import {
    Calendar, MapPin, Trophy, Users, ArrowRight, Vote, Loader2, Plus, X,
    CheckCircle, Clock, Trash2, MessageCircle, Send, Settings, LogOut,
    Pause, XCircle, RotateCcw, CheckCircle2, AlertCircle, BarChart2, Eye, EyeOff
} from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

type EventStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';
type PollStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';
type TabType = 'EVENTS' | 'POLLS' | 'MY_EVENTS';

// ── Avatar component ────────────────────────────────────────────────────────
function Avatar({ name, photo, size = 'sm', color = 'blue' }: {
    name: string; photo?: string | null; size?: 'xs' | 'sm' | 'md'; color?: string;
}) {
    const sizes = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm' };
    if (photo) return (
        <img src={photo} alt={name}
            className={`${sizes[size]} rounded-full object-cover border-2 border-white shadow-sm shrink-0`} />
    );
    return (
        <div className={`${sizes[size]} rounded-full bg-${color}-100 text-${color}-700 font-black flex items-center justify-center shrink-0 border-2 border-white shadow-sm`}>
            {name?.[0]?.toUpperCase() || '?'}
        </div>
    );
}

// ── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<EventStatus, { label: string; cls: string }> = {
    ACTIVE:    { label: 'Active',    cls: 'bg-green-100 text-green-700' },
    PAUSED:    { label: 'Paused',    cls: 'bg-yellow-100 text-yellow-700' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
    COMPLETED: { label: 'Completed', cls: 'bg-blue-100 text-blue-700' },
};
function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CFG[status as EventStatus] || STATUS_CFG.ACTIVE;
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${cfg.cls}`}>{cfg.label}</span>;
}

// ── Poll Countdown ────────────────────────────────────────────────────────────
function PollCountdown({ seconds }: { seconds: number }) {
    const [rem, setRem] = useState(seconds);
    useEffect(() => {
        if (rem <= 0) return;
        const t = setInterval(() => setRem(r => Math.max(0, r - 1)), 1000);
        return () => clearInterval(t);
    }, []);
    if (rem <= 0) return <span className="text-xs text-red-500 font-bold flex items-center gap-1"><Clock size={11} />Expired</span>;
    const d = Math.floor(rem / 86400), h = Math.floor((rem % 86400) / 3600),
          m = Math.floor((rem % 3600) / 60), s = rem % 60;
    const label = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
    return <span className="text-xs font-bold text-orange-600 flex items-center gap-1"><Clock size={11} />{label} left</span>;
}

// Determines winner/tie from poll options
function getPollResult(options: any[]): { winnerId: number | null; isTie: boolean } {
    if (!options || options.length === 0) return { winnerId: null, isTie: false };
    const maxVotes = Math.max(...options.map((o: any) => o.vote_count ?? 0));
    if (maxVotes === 0) return { winnerId: null, isTie: false };
    const topOptions = options.filter((o: any) => o.vote_count === maxVotes);
    if (topOptions.length > 1) return { winnerId: null, isTie: true };
    return { winnerId: topOptions[0].id, isTie: false };
}

function PollResultBar({ opt, total, isWinner, isTie }: {
    opt: any; total: number; isWinner: boolean; isTie: boolean;
}) {
    const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0;
    const isTopTied = isTie && opt.vote_count > 0 && opt.vote_count === Math.max(opt.vote_count, 0);
    return (
        <div className={`rounded-xl border-2 overflow-hidden ${
            isWinner ? 'border-purple-400' :
            isTopTied ? 'border-orange-300' :
            'border-gray-100'
        }`}>
            <div className="relative px-4 py-2.5 bg-white">
                <div className="absolute inset-0 transition-all"
                    style={{
                        width: `${pct}%`,
                        backgroundColor: isWinner ? '#e9d5ff' : isTopTied ? '#fed7aa' : '#f3f4f6',
                        opacity: 0.6
                    }} />
                <div className="relative flex justify-between items-center gap-2">
                    <span className={`text-sm font-bold truncate ${
                        isWinner ? 'text-purple-900' : isTopTied ? 'text-orange-800' : 'text-gray-700'
                    }`}>
                        {isWinner && <span className="mr-1">🏆</span>}
                        {isTopTied && <span className="mr-1">🤝</span>}
                        {opt.option_text}
                    </span>
                    <span className={`text-sm font-black shrink-0 ${
                        isWinner ? 'text-purple-700' : isTopTied ? 'text-orange-600' : 'text-gray-500'
                    }`}>
                        {pct}% <span className="text-xs font-medium text-gray-400">({opt.vote_count})</span>
                    </span>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function CommunityEventsPage() {
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<TabType>('EVENTS');
    const [events, setEvents] = useState<any[]>([]);
    const [polls, setPolls] = useState<any[]>([]);
    const [sports, setSports] = useState<any[]>([]);
    const [archivedPolls, setArchivedPolls] = useState<any[]>([]);
    const [showArchive, setShowArchive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState('');

    // System admin = SUPERADMIN / ADMIN / SKPUSER / SYSTEM_ADMIN
    // Does NOT include event-level organizers
    const isSystemAdmin = ['SUPERADMIN', 'ADMIN', 'SKPUSER', 'SYSTEM_ADMIN'].includes(userRole);

    const [showEventModal, setShowEventModal] = useState(false);
    const [showPollModal, setShowPollModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [pollExpiryMode, setPollExpiryMode] = useState<'duration' | 'datetime'>('duration');
    const [joiningId, setJoiningId] = useState<number | null>(null);
    const [leavingId, setLeavingId] = useState<number | null>(null);
    const [eventScope, setEventScope] = useState('GLOBAL');

    // Result modal
    const [viewingPoll, setViewingPoll] = useState<any>(null);

    // Chat
    const [activeChatEvent, setActiveChatEvent] = useState<any>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => { fetchAll(); fetchUserRole(); }, []);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
    useEffect(() => {
        if (activeChatEvent) {
            fetchChatMessages(activeChatEvent.id);
            chatIntervalRef.current = setInterval(() => fetchChatMessages(activeChatEvent.id), 8000);
        } else {
            if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
        }
        return () => { if (chatIntervalRef.current) clearInterval(chatIntervalRef.current); };
    }, [activeChatEvent]);

    const fetchUserRole = async () => {
        try { const r = await api.get('/auth/profile/'); setUserRole(r.data.role?.toUpperCase() || ''); } catch {}
    };

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const [evR, pollR] = await Promise.all([api.get('/events/list/'), api.get('/events/polls/')]);
            const allPolls = pollR.data;
            setEvents(evR.data.filter((e: any) => e.event_type !== 'CRICKET'));
            setSports(evR.data.filter((e: any) => e.event_type === 'CRICKET'));
            // Active + Paused = visible polls. Closed = archive (keep for results)
            setPolls(allPolls.filter((p: any) => p.status !== 'CLOSED'));
            setArchivedPolls(allPolls.filter((p: any) => p.status === 'CLOSED'));
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const fetchChatMessages = async (id: number) => {
        try { const r = await api.get(`/events/list/${id}/chat/`); setChatMessages(r.data); } catch {}
    };

    // ── Event actions ─────────────────────────────────────────────────────────
    const handleJoin = async (id: number) => {
        setJoiningId(id);
        try { await api.post(`/events/list/${id}/join/`); fetchAll(); }
        catch (e: any) { alert(e.response?.data?.error || 'Failed to register.'); }
        finally { setJoiningId(null); }
    };
    const handleLeave = async (id: number) => {
        if (!window.confirm('Leave this event?')) return;
        setLeavingId(id);
        try { await api.post(`/events/list/${id}/leave/`); fetchAll(); }
        catch (e: any) { alert(e.response?.data?.error || 'Failed to leave.'); }
        finally { setLeavingId(null); }
    };
    const handleSetEventStatus = async (id: number, s: EventStatus) => {
        try { await api.post(`/events/list/${id}/set_status/`, { event_status: s }); fetchAll(); }
        catch (e: any) { alert(e.response?.data?.error || 'Failed.'); }
    };
    const handleDeleteEvent = async (id: number) => {
        if (!window.confirm('Permanently delete this event?')) return;
        try { await api.delete(`/events/list/${id}/`); fetchAll(); } catch { alert('Failed.'); }
    };

    // ── Poll actions ──────────────────────────────────────────────────────────
    const handleVote = async (pollId: number, optId: number) => {
        try { await api.post(`/events/polls/${pollId}/cast_vote/`, { option_id: optId }); fetchAll(); }
        catch (e: any) { alert(e.response?.data?.error || 'Failed to vote.'); }
    };
    const handleSetPollStatus = async (id: number, s: PollStatus) => {
        try { await api.post(`/events/polls/${id}/set_status/`, { poll_status: s }); fetchAll(); }
        catch (e: any) { alert(e.response?.data?.error || 'Failed.'); }
    };
    // Soft delete — moves to archive (backend keeps it, frontend hides from portal)
    const handleHidePoll = async (id: number) => {
        if (!window.confirm('Remove this poll from the portal? Results are permanently saved and can be viewed anytime.')) return;
        try {
            // Close it first (ensuring results are locked), then the admin can choose to hard-delete if needed
            await api.post(`/events/polls/${id}/set_status/`, { poll_status: 'CLOSED' });
            fetchAll();
        } catch { alert('Failed.'); }
    };
    const handleDeletePoll = async (id: number) => {
        if (!window.confirm('PERMANENTLY delete this poll and all votes? This cannot be undone.')) return;
        try { await api.delete(`/events/polls/${id}/`); fetchAll(); } catch { alert('Failed.'); }
    };

    // ── Create event ──────────────────────────────────────────────────────────
    const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); setIsSubmitting(true);
        const data = Object.fromEntries(new FormData(e.currentTarget).entries());
        try { await api.post('/events/list/', data); setShowEventModal(false); fetchAll(); }
        catch { alert('Error creating event.'); } finally { setIsSubmitting(false); }
    };

    // ── Create poll ───────────────────────────────────────────────────────────
    const handleCreatePoll = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); setIsSubmitting(true);
        const fd = new FormData(e.currentTarget);
        const valid = pollOptions.filter(o => o.trim());
        if (valid.length < 2) { alert('At least 2 options required.'); setIsSubmitting(false); return; }

        const payload: any = { question: fd.get('question'), options: valid };
        if (pollExpiryMode === 'duration') {
            payload.duration_hours = fd.get('duration_hours');
        } else {
            // Convert local datetime to ISO for backend
            const dt = fd.get('expires_at') as string;
            if (!dt) { alert('Please set an expiry date and time.'); setIsSubmitting(false); return; }
            payload.expires_at = new Date(dt).toISOString();
            payload.duration_hours = 0; // backend will use expires_at directly
        }
        try { await api.post('/events/polls/', payload); setShowPollModal(false); setPollOptions(['', '']); fetchAll(); }
        catch { alert('Error creating poll.'); } finally { setIsSubmitting(false); }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !activeChatEvent) return;
        const msg = chatInput; setChatInput('');
        try { await api.post(`/events/list/${activeChatEvent.id}/chat/`, { message: msg }); fetchChatMessages(activeChatEvent.id); }
        catch { alert('Failed to send.'); }
    };

    const myParticipations = [...events, ...sports].filter(e => e.is_joined);

    if (isLoading) return (
        <div className="flex justify-center items-center h-[60vh]">
            <Loader2 size={40} className="animate-spin text-blue-600" />
        </div>
    );

    // ── EVENT CARD ────────────────────────────────────────────────────────────
    const EventCard = ({ event, variant = 'blue' }: { event: any; variant?: 'blue' | 'yellow' }) => {
        const isYellow = variant === 'yellow';
        const canJoin = event.event_status === 'ACTIVE' && !event.is_joined && !event.is_full;
        // Only system admins see status controls; organizers only see Chat + Manage
        const canSeeOrgControls = isSystemAdmin || event.is_organizer;

        return (
            <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow ${event.event_status !== 'ACTIVE' ? 'opacity-80' : ''}`}>
                {event.event_status !== 'ACTIVE' && (
                    <div className={`h-1 rounded-t-2xl ${event.event_status === 'PAUSED' ? 'bg-yellow-400' : event.event_status === 'CANCELLED' ? 'bg-red-400' : 'bg-blue-400'}`} />
                )}
                <div className="p-4">
                    {/* Top row: badges + delete */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${isYellow ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'}`}>
                                {event.event_type}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">{event.event_scope}</span>
                            <StatusBadge status={event.event_status || 'ACTIVE'} />
                            {event.is_full && <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-600 shrink-0">Full</span>}
                        </div>
                        {isSystemAdmin && (
                            <button onClick={() => handleDeleteEvent(event.id)}
                                className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition shrink-0">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>

                    {/* Title — full width, no overlap */}
                    <h3 className="text-base font-black text-gray-900 mb-3 capitalize leading-tight">{event.title}</h3>

                    {/* Info */}
                    <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-3 border border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                            <Calendar size={13} className="text-blue-400 shrink-0" /> {event.date_start}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                            <MapPin size={13} className="text-red-400 shrink-0" /> {event.location_name}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                            <Users size={13} className="text-gray-400 shrink-0" />
                            {event.participant_count ?? 0} registered
                            {event.max_participants ? ` / ${event.max_participants} max` : ''}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                        {event.is_joined ? (
                            <button onClick={() => handleLeave(event.id)} disabled={leavingId === event.id}
                                className="flex-1 min-w-0 font-bold py-2 px-3 rounded-xl flex justify-center items-center gap-1.5 text-sm bg-green-50 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition group">
                                <CheckCircle size={14} className="group-hover:hidden shrink-0" />
                                <LogOut size={14} className="hidden group-hover:block shrink-0" />
                                <span className="group-hover:hidden truncate">Registered</span>
                                <span className="hidden group-hover:inline truncate">Leave</span>
                            </button>
                        ) : (
                            <button onClick={() => handleJoin(event.id)} disabled={!canJoin || joiningId === event.id}
                                className={`flex-1 min-w-0 font-bold py-2 px-3 rounded-xl flex justify-center items-center gap-1.5 text-sm border transition ${
                                    canJoin
                                        ? isYellow ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-500 hover:text-white' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white'
                                        : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                                }`}>
                                {joiningId === event.id ? <Loader2 size={14} className="animate-spin" /> : isYellow ? <Trophy size={14} /> : <ArrowRight size={14} />}
                                <span className="truncate">{event.is_full ? 'Full' : event.event_status !== 'ACTIVE' ? event.event_status : 'Join'}</span>
                            </button>
                        )}

                        {canSeeOrgControls && (
                            <button onClick={() => { setChatMessages([]); setActiveChatEvent(event); }}
                                className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 text-sm transition shrink-0">
                                <MessageCircle size={14} />
                                <span className="hidden sm:inline">Chat</span>
                            </button>
                        )}
                        {canSeeOrgControls && (
                            <button onClick={() => router.push(`/community/events/${event.id}`)}
                                className="bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 text-sm transition shrink-0">
                                <Settings size={14} />
                                <span className="hidden sm:inline">Manage</span>
                            </button>
                        )}
                    </div>

                    {/* Status controls — SYSTEM ADMINS ONLY */}
                    {isSystemAdmin && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5 items-center">
                            <span className="text-[10px] text-gray-400 font-bold">Status:</span>
                            {(['ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED'] as EventStatus[]).map(s => (
                                <button key={s} onClick={() => handleSetEventStatus(event.id, s)}
                                    className={`text-[10px] px-2 py-1 rounded-lg font-bold border transition ${
                                        event.event_status === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                    }`}>{s}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ── POLL CARD ─────────────────────────────────────────────────────────────
    const PollCard = ({ poll, isArchived = false }: { poll: any; isArchived?: boolean }) => {
        const showResults = poll.status === 'CLOSED';
        const canVote = !poll.my_vote && poll.status === 'ACTIVE';
        const { winnerId, isTie } = showResults ? getPollResult(poll.options) : { winnerId: null, isTie: false };

        return (
            <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${poll.my_vote && !showResults ? 'border-purple-200' : isArchived ? 'border-gray-200 opacity-90' : 'border-gray-200'}`}>
                {/* Poll header */}
                <div className={`px-4 pt-4 pb-3 ${showResults ? 'bg-gradient-to-r from-purple-50 to-blue-50' : ''}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                        {/* Status + timer */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                poll.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                poll.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                            }`}>{poll.status === 'CLOSED' ? '✓ Closed' : poll.status}</span>
                            {poll.status === 'ACTIVE' && poll.time_left_seconds > 0 && (
                                <PollCountdown seconds={poll.time_left_seconds} />
                            )}
                            {poll.status === 'ACTIVE' && poll.time_left_seconds === 0 && (
                                <span className="text-xs text-red-500 font-bold">Auto-closing...</span>
                            )}
                            <span className="text-xs text-gray-400 font-medium">{poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Admin controls */}
                        {isSystemAdmin && (
                            <div className="flex gap-1 shrink-0">
                                {poll.status === 'ACTIVE' && (
                                    <button onClick={() => handleSetPollStatus(poll.id, 'PAUSED')} title="Pause"
                                        className="text-yellow-600 bg-yellow-50 hover:bg-yellow-100 p-1.5 rounded-lg transition">
                                        <Pause size={13} />
                                    </button>
                                )}
                                {poll.status === 'PAUSED' && (
                                    <button onClick={() => handleSetPollStatus(poll.id, 'ACTIVE')} title="Resume"
                                        className="text-green-600 bg-green-50 hover:bg-green-100 p-1.5 rounded-lg transition">
                                        <RotateCcw size={13} />
                                    </button>
                                )}
                                {poll.status !== 'CLOSED' && (
                                    <button onClick={() => handleSetPollStatus(poll.id, 'CLOSED')} title="Close & reveal results"
                                        className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg transition">
                                        <CheckCircle2 size={13} />
                                    </button>
                                )}
                                {/* View results always available for admins */}
                                <button onClick={() => setViewingPoll(poll)} title="View full results"
                                    className="text-purple-600 bg-purple-50 hover:bg-purple-100 p-1.5 rounded-lg transition">
                                    <BarChart2 size={13} />
                                </button>
                                {/* Archive (soft delete) */}
                                {!isArchived && (
                                    <button onClick={() => handleHidePoll(poll.id)} title="Close & archive (results saved)"
                                        className="text-gray-500 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-lg transition">
                                        <EyeOff size={13} />
                                    </button>
                                )}
                                {/* Hard delete — only from archive */}
                                {isArchived && (
                                    <button onClick={() => handleDeletePoll(poll.id)} title="Permanently delete"
                                        className="text-red-400 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition">
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <h3 className="text-base font-black text-gray-900 leading-snug">{poll.question}</h3>
                </div>

                {/* Options */}
                <div className="px-4 pb-4 space-y-2">
                    {poll.options?.map((opt: any) => {
                        const isMyVote = poll.my_vote === opt.id;
                        const isWinner = showResults && !isTie && opt.id === winnerId;
                        const isTopTied = showResults && isTie && opt.vote_count > 0 &&
                            opt.vote_count === Math.max(...poll.options.map((o: any) => o.vote_count ?? 0));

                        if (showResults) {
                            return <PollResultBar key={opt.id} opt={opt} total={poll.total_votes}
                                isWinner={isWinner} isTie={isTopTied} />;
                        }
                        return (
                            <button key={opt.id}
                                onClick={() => canVote && handleVote(poll.id, opt.id)}
                                disabled={!canVote}
                                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-bold ${
                                    isMyVote ? 'border-purple-500 bg-purple-50 text-purple-900' :
                                    canVote ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30 text-gray-800' :
                                    'border-gray-100 text-gray-600 cursor-default'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <span>{opt.option_text}</span>
                                    {isMyVote && <CheckCircle size={15} className="text-purple-600 shrink-0" />}
                                </div>
                            </button>
                        );
                    })}

                    {/* Tie notice — no winner, re-poll needed */}
                    {showResults && isTie && (
                        <div className="mt-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-2">
                            <span className="text-lg">🤝</span>
                            <div>
                                <p className="text-sm font-black text-orange-800">It's a tie!</p>
                                <p className="text-xs text-orange-600 font-medium">Top options have equal votes. A re-poll is recommended.</p>
                            </div>
                        </div>
                    )}

                    {/* "View Results" button for non-admins on closed polls */}
                    {showResults && !isSystemAdmin && (
                        <button onClick={() => setViewingPoll(poll)}
                            className="w-full mt-2 text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 py-2 rounded-xl transition flex items-center justify-center gap-2">
                            <BarChart2 size={14} /> View Full Results
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans">

            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 mb-1">
                        <Calendar className="text-blue-600 shrink-0" size={24} /> Samaj Events Hub
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Community gatherings, sports, and key decisions.</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                        {(['EVENTS', 'POLLS', 'MY_EVENTS'] as TabType[]).map((t, i) => {
                            const labels = ['Activities', 'Decisions', 'Mine'];
                            const active = ['bg-blue-50 text-blue-700', 'bg-purple-50 text-purple-700', 'bg-green-50 text-green-700'];
                            return (
                                <button key={t} onClick={() => setActiveTab(t)}
                                    className={`px-3 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === t ? active[i] + ' shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                                    {labels[i]}
                                </button>
                            );
                        })}
                    </div>
                    {isSystemAdmin && activeTab === 'EVENTS' && (
                        <button onClick={() => setShowEventModal(true)}
                            className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition">
                            <Plus size={15} /> New Event
                        </button>
                    )}
                    {isSystemAdmin && activeTab === 'POLLS' && (
                        <button onClick={() => setShowPollModal(true)}
                            className="flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-700 transition">
                            <Plus size={15} /> New Poll
                        </button>
                    )}
                </div>
            </div>

            {/* Layout with sticky chat panel */}
            <div className="flex gap-5 items-start">
                <div className={`flex-1 min-w-0 ${activeChatEvent ? 'lg:max-w-[calc(100%-360px)]' : ''}`}>

                    {/* ── EVENTS TAB ── */}
                    {activeTab === 'EVENTS' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h2 className="text-sm font-black text-gray-600 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                    <Users size={14} className="text-blue-600" /> Cultural & Social
                                </h2>
                                <div className="space-y-4">
                                    {events.length === 0
                                        ? <div className="p-8 text-center border-2 border-dashed rounded-2xl text-gray-400 font-bold text-sm">No upcoming events.</div>
                                        : events.map(ev => <EventCard key={ev.id} event={ev} variant="blue" />)}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-gray-600 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                    <Trophy size={14} className="text-yellow-500" /> Sports Tournaments
                                </h2>
                                <div className="space-y-4">
                                    {sports.length === 0
                                        ? <div className="p-8 text-center border-2 border-dashed rounded-2xl text-gray-400 font-bold text-sm">No active tournaments.</div>
                                        : sports.map(ev => <EventCard key={ev.id} event={ev} variant="yellow" />)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── POLLS TAB ── */}
                    {activeTab === 'POLLS' && (
                        <div>
                            {/* Active + Paused polls */}
                            {polls.length === 0
                                ? <p className="text-center text-gray-400 p-10 text-sm">No active polls right now.</p>
                                : <div className="grid md:grid-cols-2 gap-5 mb-8">
                                    {polls.map(p => <PollCard key={p.id} poll={p} />)}
                                  </div>
                            }

                            {/* Archived / Closed polls — always preserved */}
                            {archivedPolls.length > 0 && (
                                <div>
                                    <button onClick={() => setShowArchive(v => !v)}
                                        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 mb-4 transition">
                                        {showArchive ? <EyeOff size={15} /> : <Eye size={15} />}
                                        {showArchive ? 'Hide' : 'Show'} Closed Polls & Results ({archivedPolls.length})
                                    </button>
                                    {showArchive && (
                                        <div className="grid md:grid-cols-2 gap-5">
                                            {archivedPolls.map(p => <PollCard key={p.id} poll={p} isArchived />)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── MY EVENTS TAB ── */}
                    {activeTab === 'MY_EVENTS' && (
                        <div className="grid md:grid-cols-3 gap-4">
                            {myParticipations.length === 0
                                ? <p className="col-span-full text-center text-gray-400 p-8 border border-dashed rounded-xl bg-white text-sm">
                                    You haven't joined any events yet.
                                  </p>
                                : myParticipations.map(ev => (
                                    <div key={ev.id} className="bg-white p-4 rounded-2xl shadow-sm border border-green-200 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-green-400" />
                                        <span className="bg-gray-100 text-gray-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-full mb-2 inline-block">
                                            {ev.event_type}
                                        </span>
                                        <h3 className="text-base font-black text-gray-900 mb-1 capitalize leading-tight">{ev.title}</h3>
                                        <p className="text-xs text-gray-500 mb-3">{ev.date_start} · {ev.location_name}</p>
                                        <div className="flex gap-2">
                                            <div className="flex-1 text-sm font-bold text-green-700 flex items-center gap-1.5 bg-green-50 px-3 py-2 rounded-lg">
                                                <CheckCircle size={13} /> Confirmed
                                            </div>
                                            <button onClick={() => handleLeave(ev.id)}
                                                className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition font-bold text-xs flex items-center gap-1">
                                                <LogOut size={13} /> Leave
                                            </button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                </div>

                {/* ── CHAT SIDE PANEL (desktop sticky) ── */}
                {activeChatEvent && (
                    <div className="hidden lg:flex flex-col w-[340px] shrink-0 bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
                        style={{ height: 'calc(100vh - 160px)', position: 'sticky', top: '24px' }}>
                        <div className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
                            <div className="min-w-0">
                                <h3 className="text-sm font-black flex items-center gap-1.5 truncate">
                                    <MessageCircle size={14} className="shrink-0" /> {activeChatEvent.title}
                                </h3>
                                <p className="text-[10px] text-gray-400 mt-0.5">Event Team Chat</p>
                            </div>
                            <button onClick={() => setActiveChatEvent(null)}
                                className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-1.5 rounded-lg transition shrink-0">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                            {chatMessages.length === 0
                                ? <p className="text-center text-gray-400 text-sm font-bold mt-8">No messages yet. 👋</p>
                                : chatMessages.map((msg: any, i: number) => (
                                    <div key={i} className={`flex flex-col ${msg.is_me ? 'items-end' : 'items-start'}`}>
                                        <div className={`flex items-end gap-1.5 ${msg.is_me ? 'flex-row-reverse' : ''}`}>
                                            <Avatar name={msg.sender_name} photo={msg.sender_photo} size="xs" color={msg.is_me ? 'blue' : 'gray'} />
                                            <div>
                                                <span className={`text-[10px] font-bold text-gray-400 mb-0.5 block ${msg.is_me ? 'text-right' : ''}`}>
                                                    {msg.is_me ? 'You' : msg.sender_name}
                                                </span>
                                                <div className={`px-3 py-2 rounded-2xl max-w-[220px] text-sm font-medium shadow-sm ${
                                                    msg.is_me ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm'
                                                }`}>{msg.message}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                            <div ref={chatEndRef} />
                        </div>
                        <div className="p-2.5 border-t border-gray-200 bg-white shrink-0">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-gray-100 rounded-full px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-200" />
                                <button type="submit" disabled={!chatInput.trim()}
                                    className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 disabled:opacity-40 transition">
                                    <Send size={14} />
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Mobile chat — right-anchored, respects sidebar */}
                {activeChatEvent && (
                    <div className="lg:hidden fixed bottom-0 right-0 z-50 bg-white border border-gray-200 shadow-2xl rounded-tl-2xl flex flex-col"
                        style={{ width: 'min(calc(100vw - 230px), 400px)', height: '60vh' }}>
                        <div className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center rounded-tl-2xl shrink-0">
                            <h3 className="text-sm font-black truncate flex items-center gap-1.5">
                                <MessageCircle size={14} className="shrink-0" /> {activeChatEvent.title}
                            </h3>
                            <button onClick={() => setActiveChatEvent(null)} className="text-gray-400 hover:text-white p-1.5 rounded-lg bg-gray-800 shrink-0">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                            {chatMessages.map((msg: any, i: number) => (
                                <div key={i} className={`flex flex-col ${msg.is_me ? 'items-end' : 'items-start'}`}>
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
                                    <Send size={14} />
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* ── POLL RESULTS MODAL ── */}
            {viewingPoll && (() => {
                const { winnerId: modalWinnerId, isTie: modalIsTie } = getPollResult(viewingPoll.options);
                return (
                <div className="fixed inset-0 bg-black/60 z-[300] flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
                        <div className="flex justify-between items-center p-5 border-b bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-2xl shrink-0">
                            <div>
                                <h2 className="text-lg font-black text-purple-900 flex items-center gap-2">
                                    <BarChart2 size={18} /> Poll Results
                                </h2>
                                <p className="text-xs text-purple-600 mt-0.5">
                                    {viewingPoll.total_votes} total votes · Status: {viewingPoll.status}
                                    {viewingPoll.expires_at_display && ` · Closed: ${viewingPoll.expires_at_display}`}
                                </p>
                            </div>
                            <button onClick={() => setViewingPoll(null)} className="text-gray-400 hover:text-gray-700 bg-white p-2 rounded-full shadow-sm">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto">
                            <h3 className="text-base font-black text-gray-900 mb-4">{viewingPoll.question}</h3>

                            {/* Verdict banner */}
                            {viewingPoll.total_votes === 0 ? (
                                <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-500 font-medium text-center">
                                    No votes were cast in this poll.
                                </div>
                            ) : modalIsTie ? (
                                <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3">
                                    <span className="text-2xl">🤝</span>
                                    <div>
                                        <p className="text-sm font-black text-orange-800">Result: Tie</p>
                                        <p className="text-xs text-orange-600 font-medium">
                                            Multiple options received equal votes. No clear winner — a re-poll is recommended.
                                        </p>
                                    </div>
                                </div>
                            ) : modalWinnerId ? (
                                <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center gap-3">
                                    <span className="text-2xl">🏆</span>
                                    <div>
                                        <p className="text-xs text-purple-500 font-bold uppercase">Winner</p>
                                        <p className="text-sm font-black text-purple-900">
                                            {viewingPoll.options.find((o: any) => o.id === modalWinnerId)?.option_text}
                                        </p>
                                    </div>
                                </div>
                            ) : null}

                            <div className="space-y-3">
                                {viewingPoll.options?.map((opt: any) => {
                                    const isTopTied = modalIsTie && opt.vote_count > 0 &&
                                        opt.vote_count === Math.max(...viewingPoll.options.map((o: any) => o.vote_count ?? 0));
                                    return (
                                        <PollResultBar key={opt.id} opt={opt}
                                            total={viewingPoll.total_votes}
                                            isWinner={!modalIsTie && opt.id === modalWinnerId}
                                            isTie={isTopTied}
                                        />
                                    );
                                })}
                            </div>
                            {viewingPoll.status !== 'CLOSED' && (
                                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2 text-sm text-yellow-800 font-medium">
                                    <AlertCircle size={15} className="shrink-0" />
                                    Poll is still {viewingPoll.status.toLowerCase()} — results may change.
                                </div>
                            )}
                            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-500 font-medium">
                                📦 Poll results are permanently stored. Closing or archiving does not delete votes.
                            </div>
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* ── CREATE EVENT MODAL ── */}
            {showEventModal && (
                <div className="fixed inset-0 bg-black/50 z-[200] flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-5 border-b bg-blue-50 rounded-t-2xl shrink-0">
                            <h2 className="text-lg font-black text-blue-900 flex items-center gap-2"><Calendar size={18} /> Create Event</h2>
                            <button onClick={() => setShowEventModal(false)} className="text-blue-500 hover:bg-blue-200 p-2 rounded-full"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreateEvent} className="p-5 flex flex-col gap-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Event Title</label>
                                <input type="text" name="title" required className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm focus:ring-2 focus:ring-blue-200" />
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
                                    <select name="event_scope" value={eventScope} onChange={e => setEventScope(e.target.value)} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm">
                                        <option value="GLOBAL">Whole Samaj</option>
                                        <option value="DISTRICT">District</option>
                                        <option value="CITY">City/Village</option>
                                    </select>
                                </div>
                            </div>
                            {eventScope === 'DISTRICT' && (
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">Target District</label>
                                    <input type="text" name="target_district" required className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm" /></div>
                            )}
                            {eventScope === 'CITY' && (
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">Target City/Village</label>
                                    <input type="text" name="target_city_village" required className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm" /></div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">Start Date</label>
                                    <input type="date" name="date_start" required className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm" /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                                    <input type="text" name="location_name" required className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm" /></div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Max Participants <span className="text-gray-400 font-normal">(optional)</span></label>
                                <input type="number" name="max_participants" min="1" placeholder="Unlimited" className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm" />
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl shadow transition">
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
                            <h2 className="text-lg font-black text-purple-900 flex items-center gap-2"><Vote size={18} /> Create Poll</h2>
                            <button onClick={() => setShowPollModal(false)} className="text-purple-500 hover:bg-purple-200 p-2 rounded-full"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreatePoll} className="p-5 flex flex-col gap-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Question</label>
                                <textarea name="question" required rows={2}
                                    className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm focus:ring-2 focus:ring-purple-200 resize-none" />
                            </div>

                            {/* Expiry mode toggle */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1"><Clock size={14} className="text-gray-400" /> Poll Expiry</label>
                                <div className="flex gap-2 mb-3">
                                    <button type="button" onClick={() => setPollExpiryMode('duration')}
                                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${pollExpiryMode === 'duration' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'}`}>
                                        ⏱ Duration
                                    </button>
                                    <button type="button" onClick={() => setPollExpiryMode('datetime')}
                                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${pollExpiryMode === 'datetime' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'}`}>
                                        📅 Exact Date & Time
                                    </button>
                                </div>

                                {pollExpiryMode === 'duration' ? (
                                    <select name="duration_hours" className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm">
                                        <option value="1">1 Hour</option>
                                        <option value="6">6 Hours</option>
                                        <option value="12">12 Hours</option>
                                        <option value="24">24 Hours</option>
                                        <option value="48">2 Days</option>
                                        <option value="72">3 Days</option>
                                        <option value="168">1 Week</option>
                                        <option value="336">2 Weeks</option>
                                        <option value="720">1 Month</option>
                                    </select>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Date</label>
                                            <input type="date" name="expires_date"
                                                min={new Date().toISOString().split('T')[0]}
                                                required className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Time</label>
                                            <input type="time" name="expires_time"
                                                required className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none text-sm" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Options */}
                            <div>
                                <label className="block text-sm font-black text-gray-800 mb-2">Poll Options</label>
                                <div className="space-y-2">
                                    {pollOptions.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="w-6 text-center text-xs font-bold text-gray-400 bg-gray-100 rounded-full py-1 shrink-0">{idx + 1}</span>
                                            <input type="text" value={opt}
                                                onChange={e => { const n = [...pollOptions]; n[idx] = e.target.value; setPollOptions(n); }}
                                                className="flex-1 border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200"
                                                placeholder={`Option ${idx + 1}`} />
                                            {pollOptions.length > 2 && (
                                                <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                                    className="text-gray-400 hover:text-red-500 p-1 shrink-0"><X size={14} /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={() => setPollOptions([...pollOptions, ''])}
                                    className="mt-2 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                                    <Plus size={13} /> Add Option
                                </button>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 font-medium flex items-start gap-2">
                                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                                Poll results are permanently saved even after closing. Admins can always view archived results.
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