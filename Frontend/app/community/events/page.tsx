"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Calendar, MapPin, Trophy, Users, ArrowRight, Vote, Loader2, Plus, X, CheckCircle, Clock, Trash2, BookmarkCheck, MessageCircle, Send, Settings } from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation'; // 🌟 NEW: For page navigation

export default function CommunityEventsPage() {
    const router = useRouter(); // 🌟 NEW
    
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
    const [eventScope, setEventScope] = useState('GLOBAL');

    // CHAT STATES ONLY (Management moved to separate page)
    const [activeChatEvent, setActiveChatEvent] = useState<any>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
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
        } catch (error) { console.error("Failed to fetch role"); }
    };

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const [eventsRes, pollsRes] = await Promise.all([api.get('/events/list/'), api.get('/events/polls/')]);
            setEvents(eventsRes.data.filter((e: any) => e.event_type !== 'CRICKET'));
            setSports(eventsRes.data.filter((e: any) => e.event_type === 'CRICKET'));
            setPolls(pollsRes.data);
        } catch (error) { console.error("Failed to fetch data", error); } finally { setIsLoading(false); }
    };

    const handleJoinEvent = async (eventId: number) => {
        setJoiningId(eventId);
        try {
            await api.post(`/events/list/${eventId}/join/`);
            alert("Congratulations! You are successfully registered.");
            fetchDashboardData(); 
        } catch (error: any) { alert(error.response?.data?.error || "Failed to register."); } finally { setJoiningId(null); }
    };

    const handleVote = async (pollId: number, optionId: number) => {
        try {
            await api.post(`/events/polls/${pollId}/cast_vote/`, { option_id: optionId });
            alert("Your vote has been securely cast.");
            fetchDashboardData(); 
        } catch (error: any) { alert(error.response?.data?.error || "Failed to cast vote."); }
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
            setShowEventModal(false); fetchDashboardData();
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

    // 🌟 CHAT LOGIC ONLY (Team logic removed from here)
    const openChatModal = async (event: any) => {
        setActiveChatEvent(event);
        fetchChatMessages(event.id);
    };

    const fetchChatMessages = async (eventId: number) => {
        try {
            const res = await api.get(`/events/list/${eventId}/chat/`);
            setChatMessages(res.data);
        } catch (error) { console.error("Chat load failed", error); }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !activeChatEvent) return;
        try {
            await api.post(`/events/list/${activeChatEvent.id}/chat/`, { message: chatInput });
            setChatInput(''); fetchChatMessages(activeChatEvent.id); 
        } catch (error) { alert("Failed to send message."); }
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
                                    
                                    {/* 🌟 ACTION BUTTONS */}
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={() => handleJoinEvent(event.id)} disabled={event.is_joined || !event.is_active} className={`flex-1 font-bold py-2.5 px-3 rounded-xl flex justify-center items-center gap-2 text-sm ${event.is_joined ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white'}`}>
                                            {event.is_joined ? <CheckCircle size={16} /> : <ArrowRight size={16} />} {event.is_joined ? 'Registered' : 'Join'}
                                        </button>
                                        
                                        {(isAdmin || event.is_organizer) && (
                                            <button onClick={() => openChatModal(event)} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm">
                                                <MessageCircle size={16} /> Chat
                                            </button>
                                        )}
                                        
                                        {/* 🌟 NEW: MANAGE TEAM BUTTON (Redirects to new page) */}
                                        {isAdmin && (
                                            <button onClick={() => router.push(`/community/events/${event.id}`)} className="bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition">
                                                <Settings size={16} /> Manage
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
                                    
                                    {/* 🌟 ACTION BUTTONS */}
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={() => handleJoinEvent(game.id)} disabled={game.is_joined || !game.is_active} className={`flex-1 font-bold py-2.5 px-3 rounded-xl flex justify-center items-center gap-2 text-sm ${game.is_joined ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-500 hover:text-white border border-yellow-200'}`}>
                                            {game.is_joined ? <CheckCircle size={16} /> : <Trophy size={16} />} {game.is_joined ? 'Registered' : 'Join'}
                                        </button>
                                        
                                        {(isAdmin || game.is_organizer) && (
                                            <button onClick={() => openChatModal(game)} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm">
                                                <MessageCircle size={16} /> Chat
                                            </button>
                                        )}

                                        {/* 🌟 NEW: MANAGE TEAM BUTTON */}
                                        {isAdmin && (
                                            <button onClick={() => router.push(`/community/events/${game.id}`)} className="bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition">
                                                <Settings size={16} /> Manage
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* POLLS TAB & MY REGISTRATIONS - (Keeping identical to save space, do not change anything here) */}
            {/* ... */}
            
            {/* 🌟 WHATSAPP STYLE CHAT MODAL (Cleaned up! No Add Member Form here) */}
            {activeChatEvent && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4">
                    <div className="bg-gray-50 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">
                        <div className="bg-gray-900 text-white p-4 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-lg font-black flex items-center gap-2"><MessageCircle size={20} /> {activeChatEvent.title}</h2>
                                <p className="text-xs text-gray-300 font-medium">Event Team Chat</p>
                            </div>
                            <button onClick={() => setActiveChatEvent(null)} className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-full"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {chatMessages.length === 0 ? <p className="text-center text-gray-400 font-bold mt-10">No messages yet. Start coordinating! 👋</p> : chatMessages.map((msg, idx) => (
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
                    </div>
                </div>
            )}
        </div>
    );
}