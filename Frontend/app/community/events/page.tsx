"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Calendar, MapPin, Trophy, Users, ArrowRight, Vote, Loader2, Plus, X, CheckCircle, Clock, Trash2, BookmarkCheck, MessageCircle, Send, UserPlus } from 'lucide-react';
import api from '@/lib/api';

export default function CommunityEventsPage() {
    const [activeTab, setActiveTab] = useState<'EVENTS' | 'POLLS' | 'MY_EVENTS'>('EVENTS');
    const [events, setEvents] = useState<any[]>([]);
    const [polls, setPolls] = useState<any[]>([]);
    const [sports, setSports] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [userRole, setUserRole] = useState('');
    const isAdmin = ['SUPERADMIN', 'ADMIN', 'SKPUSER', 'SYSTEM_ADMIN', 'EVENT_ADMIN'].includes(userRole);

    const [showEventModal, setShowEventModal] = useState(false);
    const [showPollModal, setShowPollModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pollOptions, setPollOptions] = useState(['', '']); 
    const [joiningId, setJoiningId] = useState<number | null>(null);

    // GEO-FENCING STATE
    const [eventScope, setEventScope] = useState('GLOBAL');

    // COMMITTEE & CHAT STATES
    const [activeChatEvent, setActiveChatEvent] = useState<any>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [committeeMembers, setCommitteeMembers] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchDashboardData();
        fetchUserRole();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    const fetchUserRole = async () => {
        try {
            const res = await api.get('/auth/profile/');
            setUserRole(res.data.role?.toUpperCase() || '');
        } catch (error) {
            console.error("Failed to fetch role");
        }
    };

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const [eventsRes, pollsRes] = await Promise.all([api.get('/events/list/'), api.get('/events/polls/')]);
            setEvents(eventsRes.data.filter((e: any) => e.event_type !== 'CRICKET'));
            setSports(eventsRes.data.filter((e: any) => e.event_type === 'CRICKET'));
            setPolls(pollsRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinEvent = async (eventId: number) => {
        setJoiningId(eventId);
        try {
            await api.post(`/events/list/${eventId}/join/`);
            alert("Congratulations! You are successfully registered.");
            fetchDashboardData(); 
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to register.");
        } finally {
            setJoiningId(null);
        }
    };

    const handleVote = async (pollId: number, optionId: number) => {
        try {
            await api.post(`/events/polls/${pollId}/cast_vote/`, { option_id: optionId });
            alert("Your vote has been securely cast.");
            fetchDashboardData(); 
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to cast vote.");
        }
    };

    const handleDeleteEvent = async (eventId: number) => {
        if (!window.confirm("Delete this event?")) return;
        try { await api.delete(`/events/list/${eventId}/`); fetchDashboardData(); } catch (error) { alert("Failed to delete event."); }
    };

    const handleDeletePoll = async (pollId: number) => {
        if (!window.confirm("Delete this poll?")) return;
        try { await api.delete(`/events/polls/${pollId}/`); fetchDashboardData(); } catch (error) { alert("Failed to delete poll."); }
    };

    const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const data = Object.fromEntries(new FormData(e.currentTarget).entries());
        try {
            await api.post('/events/list/', data);
            setShowEventModal(false);
            fetchDashboardData();
        } catch (error) { alert("Error creating event."); } finally { setIsSubmitting(false); }
    };

    const handleCreatePoll = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const validOptions = pollOptions.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) { alert("At least 2 options required."); setIsSubmitting(false); return; }
        try {
            await api.post('/events/polls/', { question: new FormData(e.currentTarget).get('question'), duration_hours: new FormData(e.currentTarget).get('duration_hours'), options: validOptions });
            setShowPollModal(false); setPollOptions(['', '']); fetchDashboardData();
        } catch (error) { alert("Error creating poll."); } finally { setIsSubmitting(false); }
    };

    const openChatModal = async (event: any) => {
        setActiveChatEvent(event);
        fetchChatAndTeam(event.id);
    };

    const fetchChatAndTeam = async (eventId: number) => {
        try {
            const [chatRes, teamRes] = await Promise.all([
                api.get(`/events/list/${eventId}/chat/`),
                api.get(`/events/list/${eventId}/team/`)
            ]);
            setChatMessages(chatRes.data);
            setCommitteeMembers(teamRes.data);
        } catch (error) {
            console.error("Chat load failed", error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !activeChatEvent) return;
        try {
            await api.post(`/events/list/${activeChatEvent.id}/chat/`, { message: chatInput });
            setChatInput('');
            fetchChatAndTeam(activeChatEvent.id); 
        } catch (error) { alert("Failed to send message."); }
    };

    const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        try {
            await api.post(`/events/list/${activeChatEvent.id}/team/`, { samaj_id: fd.get('samaj_id'), role_title: fd.get('role_title') });
            alert("Member added!");
            fetchChatAndTeam(activeChatEvent.id);
            (e.target as HTMLFormElement).reset();
        } catch (error: any) { alert(error.response?.data?.error || "Failed to add."); }
    };

    const handleRemoveMember = async (orgId: number) => {
        if (!window.confirm("Remove this member?")) return;
        try {
            await api.delete(`/events/list/${activeChatEvent.id}/team/`, { data: { organizer_id: orgId } });
            fetchChatAndTeam(activeChatEvent.id);
        } catch (error) { alert("Failed to remove."); }
    };

    const myParticipations = [...events, ...sports].filter(e => e.is_joined);

    if (isLoading) return <div className="flex justify-center items-center h-[60vh]"><Loader2 size={48} className="animate-spin text-blue-600" /></div>;

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans relative">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 mb-2"><Calendar className="text-blue-600" size={32} /> Samaj Events Hub</h1>
                    <p className="text-gray-500 font-medium">Participate in community gatherings, sports, and vital decisions.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-center w-full lg:w-auto overflow-x-auto custom-scrollbar pb-2 lg:pb-0">
                    <div className="flex bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm w-full sm:w-auto shrink-0">
                        <button onClick={() => setActiveTab('EVENTS')} className={`flex-1 sm:w-32 py-2 px-4 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'EVENTS' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>Activities</button>
                        <button onClick={() => setActiveTab('POLLS')} className={`flex-1 sm:w-32 py-2 px-4 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'POLLS' ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>Decisions</button>
                        <button onClick={() => setActiveTab('MY_EVENTS')} className={`flex-1 sm:w-40 py-2 px-4 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'MY_EVENTS' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>My Registrations</button>
                    </div>
                    {isAdmin && (
                        <div className="flex gap-2 w-full sm:w-auto shrink-0">
                            {activeTab === 'EVENTS' && <button onClick={() => setShowEventModal(true)} className="flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition"><Plus size={18} /> New Event</button>}
                            {activeTab === 'POLLS' && <button onClick={() => setShowPollModal(true)} className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition"><Plus size={18} /> New Poll</button>}
                        </div>
                    )}
                </div>
            </div>

            {/* EVENTS TAB */}
            {activeTab === 'EVENTS' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                    <div>
                        <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2"><Users className="text-blue-600" /> Cultural & Social Programs</h2>
                        <div className="space-y-4">
                            {events.map(event => (
                                <div key={event.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition relative">
                                    {isAdmin && <button onClick={() => handleDeleteEvent(event.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition"><Trash2 size={18} /></button>}
                                    <div className="flex items-center gap-2 mb-3 pr-10">
                                        <span className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">{event.event_type}</span>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">{event.event_scope}</span>
                                    </div>
                                    <h3 className="text-lg font-black text-gray-900 mt-1 mb-2">{event.title}</h3>
                                    <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-2 text-sm text-gray-700 font-medium"><Calendar size={16} className="text-blue-500" /> {event.date_start}</div>
                                        <div className="flex items-center gap-2 text-sm text-gray-700 font-medium"><MapPin size={16} className="text-red-400" /> {event.location_name}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleJoinEvent(event.id)} disabled={event.is_joined || !event.is_active} className={`flex-1 font-bold py-2.5 rounded-xl flex justify-center items-center gap-2 ${event.is_joined ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white'}`}>
                                            {event.is_joined ? <CheckCircle size={16} /> : <ArrowRight size={16} />} {event.is_joined ? 'Registered' : 'Join Event'}
                                        </button>
                                        {(isAdmin || event.is_organizer) && (
                                            <button onClick={() => openChatModal(event)} className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2" title="Committee Chat">
                                                <MessageCircle size={18} /> Chat
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2"><Trophy className="text-yellow-500" /> Sports Tournaments</h2>
                        <div className="space-y-4">
                            {sports.map(game => (
                                <div key={game.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition relative">
                                    {isAdmin && <button onClick={() => handleDeleteEvent(game.id)} className="absolute top-4 right-4 text-red-400 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={18} /></button>}
                                    <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mb-3"><Trophy size={24} /></div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-yellow-50 text-yellow-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">{game.event_type}</span>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">{game.event_scope}</span>
                                    </div>
                                    <h3 className="text-lg font-black text-gray-900 mb-2">{game.title}</h3>
                                    <div className="space-y-2 mb-4 mt-4 text-sm text-gray-700 font-medium">
                                        <div className="flex items-center gap-2"><Calendar size={16} className="text-gray-400" /> {game.date_start}</div>
                                        <div className="flex items-center gap-2"><MapPin size={16} className="text-gray-400" /> {game.location_name}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleJoinEvent(game.id)} disabled={game.is_joined || !game.is_active} className={`flex-1 font-bold py-2.5 rounded-xl flex justify-center items-center gap-2 ${game.is_joined ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-500 hover:text-white border border-yellow-200'}`}>
                                            {game.is_joined ? <CheckCircle size={16} /> : <Trophy size={16} />} {game.is_joined ? 'Registered' : 'Join'}
                                        </button>
                                        {(isAdmin || game.is_organizer) && (
                                            <button onClick={() => openChatModal(game)} className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2">
                                                <MessageCircle size={18} /> Chat
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* POLLS TAB */}
            {activeTab === 'POLLS' && (
                <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    {polls.map(poll => (
                        <div key={poll.id} className={`bg-white p-6 rounded-2xl shadow-sm border relative ${poll.my_vote ? 'border-purple-200 bg-purple-50/20' : 'border-gray-200'}`}>
                            {isAdmin && <button onClick={() => handleDeletePoll(poll.id)} className="absolute top-4 right-4 text-red-400 bg-red-50 p-2 rounded-lg"><Trash2 size={18} /></button>}
                            <h3 className="text-lg font-black text-gray-900 mb-4 pr-10">{poll.question}</h3>
                            <div className="space-y-3">
                                {poll.options.map((option: any) => (
                                    <button key={option.id} onClick={() => !poll.my_vote && poll.status === 'ACTIVE' && handleVote(poll.id, option.id)} disabled={!!poll.my_vote || poll.status === 'CLOSED'} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${poll.my_vote === option.id ? 'border-purple-600 bg-purple-50 font-black' : 'border-gray-200 hover:border-purple-300'}`}>
                                        <div className="flex justify-between items-center">
                                            <span>{option.option_text}</span>
                                            {poll.status === 'CLOSED' && <span className="font-bold bg-white px-2 py-1 rounded shadow-sm text-sm">{option.vote_count} votes</span>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MY REGISTRATIONS */}
            {activeTab === 'MY_EVENTS' && (
                <div className="grid md:grid-cols-3 gap-6">
                    {myParticipations.length === 0 ? <p className="col-span-full text-center text-gray-500 p-8 border border-dashed rounded-xl bg-white">You haven't joined any events or tournaments yet.</p> : myParticipations.map(event => (
                        <div key={event.id} className="bg-white p-6 rounded-2xl shadow-sm border border-green-200 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                            <span className="bg-gray-100 text-gray-700 text-[10px] font-black uppercase px-3 py-1 rounded-full mb-3 inline-block">{event.event_type}</span>
                            <h3 className="text-lg font-black text-gray-900 mb-2">{event.title}</h3>
                            <div className="text-sm font-bold text-green-700 flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg mt-4"><CheckCircle size={16} /> Confirmed</div>
                        </div>
                    ))}
                </div>
            )}

            {/* 🌟 NEW BEAUTIFUL & COMPACT EVENT CREATION MODAL */}
            {showEventModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-5 border-b shrink-0 bg-blue-50">
                            <h2 className="text-xl font-black text-blue-900 flex items-center gap-2"><Calendar size={20}/> Create New Event</h2>
                            <button onClick={() => setShowEventModal(false)} className="text-blue-500 hover:bg-blue-200 p-2 rounded-full transition"><X size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleCreateEvent} className="p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-gray-700">Event Title</label>
                                <input type="text" name="title" required className="w-full border p-2.5 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none" placeholder="e.g. Samaj Diwali Milan" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-sm font-bold text-gray-700">Type</label>
                                    <select name="event_type" className="w-full border p-2.5 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none">
                                        <option value="CRICKET">Cricket</option>
                                        <option value="MEETING">Meeting</option>
                                        <option value="VIVAH">Samuhik Vivah</option>
                                        <option value="BDC">Blood Donation</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-sm font-bold text-gray-700">Scope</label>
                                    <select name="event_scope" value={eventScope} onChange={(e) => setEventScope(e.target.value)} className="w-full border p-2.5 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none">
                                        <option value="GLOBAL">Whole Samaj</option>
                                        <option value="DISTRICT">District Level</option>
                                        <option value="CITY">City Level</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* DYNAMIC INPUTS BASED ON SCOPE */}
                            {eventScope === 'DISTRICT' && (
                                <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-sm font-bold text-gray-700">Target District</label>
                                    <input type="text" name="target_district" required className="w-full border p-2.5 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none" placeholder="e.g. Bhilwara" />
                                </div>
                            )}
                            {eventScope === 'CITY' && (
                                <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-sm font-bold text-gray-700">Target City/Village</label>
                                    <input type="text" name="target_city_village" required className="w-full border p-2.5 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none" placeholder="e.g. Pachmata" />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-sm font-bold text-gray-700">Start Date</label>
                                    <input type="date" name="date_start" required className="w-full border p-2.5 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-sm font-bold text-gray-700">Location</label>
                                    <input type="text" name="location_name" required className="w-full border p-2.5 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none" placeholder="City/Ground" />
                                </div>
                            </div>

                            <div className="border-t pt-4 mt-2">
                                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl shadow-md transition">
                                    {isSubmitting ? 'Saving...' : 'Publish Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* POLL MODAL */}
            {showPollModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-5 border-b shrink-0 bg-purple-50">
                            <h2 className="text-xl font-black text-purple-900 flex items-center gap-2"><Vote size={20}/> Create Secret Poll</h2>
                            <button onClick={() => setShowPollModal(false)} className="text-purple-500 hover:bg-purple-200 p-2 rounded-full transition"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleCreatePoll} className="p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-gray-700">Question</label>
                                <textarea name="question" required className="w-full border p-2.5 rounded-xl bg-gray-50 focus:ring-2 focus:ring-purple-200 outline-none" rows={2}></textarea>
                            </div>
                            <div className="space-y-1">
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700"><Clock size={16} className="text-gray-400"/> Poll Duration</label>
                                <select name="duration_hours" className="w-full border p-2.5 rounded-xl bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-purple-200">
                                    <option value="1">1 Hour</option><option value="24">24 Hours</option><option value="168">1 Week</option><option value="720">1 Month</option>
                                </select>
                            </div>
                            <div className="border-t pt-4 space-y-2">
                                <label className="block text-sm font-black text-gray-800">Poll Options</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {pollOptions.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className="w-6 text-center text-xs font-bold text-gray-400 bg-gray-100 rounded-full py-1">{idx + 1}</div>
                                            <input type="text" value={opt} onChange={(e) => { const newOpts = [...pollOptions]; newOpts[idx] = e.target.value; setPollOptions(newOpts); }} className="w-full border p-2 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-purple-200" />
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-1 mt-2 transition"><Plus size={14} /> Add Option</button>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-xl mt-2 shadow-md transition">{isSubmitting ? 'Launching...' : 'Launch Poll Now'}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* WHATSAPP STYLE CHAT & COMMITTEE MODAL */}
            {activeChatEvent && (
                <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
                    <div className="bg-gray-50 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
                        <div className="bg-gray-900 text-white p-4 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-lg font-black flex items-center gap-2"><MessageCircle size={20} /> {activeChatEvent.title}</h2>
                                <p className="text-xs text-gray-300 font-medium">Committee Group Chat</p>
                            </div>
                            <button onClick={() => setActiveChatEvent(null)} className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-full"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {chatMessages.length === 0 ? <p className="text-center text-gray-400 font-bold mt-10">No messages yet. Say Hello! 👋</p> : chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col ${msg.is_me ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] font-bold text-gray-400 mb-1 ml-1">{msg.is_me ? 'You' : msg.sender_name}</span>
                                    <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] shadow-sm text-sm font-medium ${msg.is_me ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm'}`}>
                                        {msg.message}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="bg-white p-3 border-t border-gray-200 shrink-0">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-gray-100 border-none rounded-full px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-200" />
                                <button type="submit" disabled={!chatInput.trim()} className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50"><Send size={18} /></button>
                            </form>
                        </div>
                        {isAdmin && (
                            <div className="bg-white border-t-4 border-gray-100 p-4 shrink-0">
                                <h3 className="text-sm font-black text-gray-800 mb-2 flex items-center gap-1"><Users size={16}/> Manage Committee</h3>
                                <form onSubmit={handleAddMember} className="flex gap-2 mb-3">
                                    <input type="text" name="samaj_id" required placeholder="Samaj ID (e.g. S-001)" className="w-1/3 border p-2 rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-blue-200" />
                                    <input type="text" name="role_title" required placeholder="Role (e.g. Tent Manager)" className="flex-1 border p-2 rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-blue-200" />
                                    <button type="submit" className="bg-gray-900 text-white px-3 rounded-lg hover:bg-gray-800 transition"><UserPlus size={16}/></button>
                                </form>
                                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                                    {committeeMembers.map(m => (
                                        <div key={m.id} className="bg-gray-100 px-3 py-1.5 rounded-full text-xs font-bold text-gray-700 flex items-center gap-2 whitespace-nowrap border border-gray-200">
                                            {m.profile_name} <span className="text-gray-400 font-normal">({m.role_title})</span>
                                            <button onClick={() => handleRemoveMember(m.id)} className="text-red-500 hover:text-red-700"><X size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}