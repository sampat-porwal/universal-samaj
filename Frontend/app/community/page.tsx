"use client";
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { 
    Calendar, Users, Megaphone, Heart, 
    Share2, Award, MapPin, BarChart3, 
    Droplets, Briefcase, BookOpen, Trophy, 
    Loader2, FileText, Trash2, Edit, 
    Image as ImageIcon, Paperclip // 🌟 Added icons for file uploads
} from 'lucide-react';
import api from '@/lib/api';

// 🌟 Helper to fix local media URLs
const getFileUrl = (path: string) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `http://127.0.0.1:8000${path}`;
};

// Interfaces for our data
interface DashboardData {
    overview: {
        total_members: number;
        active_events: number;
        completed_events: number;
        total_blood_donations: number;
    };
    demographics: {
        top_villages: { village_en: string; total: number }[];
        top_gotras: { gotra_en: string; total: number }[];
        employment: { employment_type: string; total: number }[];
    };
}

interface Announcement {
    id: number;
    title: string;
    content: string;
    is_important: boolean;
    image: string | null;     // 🌟 Added image
    document: string | null;  // 🌟 Added document
    created_at: string;
    author_name: string;
    author_role: string;
}

export default function CommunityHomePage() {
    const [profile, setProfile] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>('USER');
    
    // Data States
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // States for creating & editing news
    const [newsTitle, setNewsTitle] = useState('');
    const [newsContent, setNewsContent] = useState('');
    const [isImportant, setIsImportant] = useState(false);
    
    // 🌟 States for File Uploads
    const [newsImage, setNewsImage] = useState<File | null>(null);
    const [newsDocument, setNewsDocument] = useState<File | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const documentInputRef = useRef<HTMLInputElement>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null); // Tracks if we are updating a post
    
    // View Toggle State: 'NEWS' or 'ANALYTICS'
    const [activeView, setActiveView] = useState<'NEWS' | 'ANALYTICS'>('NEWS');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [profileRes, statsRes, newsRes] = await Promise.all([
                api.get('/auth/profile/'),
                api.get('/samaj/dashboard-stats/'),
                api.get('/samaj/announcements/') 
            ]);
            setProfile(profileRes.data);
            setUserRole(profileRes.data.role?.toUpperCase() || 'USER');
            setDashboardData(statsRes.data);
            setAnnouncements(newsRes.data);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    };

    // 🌟 Handle Post AND Update (Now using FormData for files!)
    const handlePostNews = async () => {
        if (!newsTitle.trim() || !newsContent.trim()) return;
        setIsSubmitting(true);
        
        // Use FormData to allow image/pdf uploads
        const formData = new FormData();
        formData.append('title', newsTitle);
        formData.append('content', newsContent);
        formData.append('is_important', isImportant ? 'true' : 'false');
        
        if (newsImage) formData.append('image', newsImage);
        if (newsDocument) formData.append('document', newsDocument);

        try {
            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (editingId) {
                // UPDATE existing news
                await api.patch(`/samaj/announcements/${editingId}/`, formData, config);
            } else {
                // CREATE new news
                await api.post('/samaj/announcements/', formData, config);
            }
            
            // Clear inputs
            cancelEdit();
            fetchData(); 
        } catch (error) {
            console.error("Failed to post news", error);
            alert("Failed to save announcement. Please check files and try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 🌟 Handle Delete (Kept exactly as you had it)
    const handleDeleteNews = async (id: number) => {
        if (window.confirm("Are you sure you want to delete this announcement? This cannot be undone.")) {
            try {
                await api.delete(`/samaj/announcements/${id}/`);
                fetchData(); // Refresh the list after deleting
            } catch (error) {
                console.error("Failed to delete", error);
                alert("Failed to delete announcement.");
            }
        }
    };

    // 🌟 Populate form for Editing
    const startEdit = (news: Announcement) => {
        setNewsTitle(news.title);
        setNewsContent(news.content);
        setIsImportant(news.is_important);
        setNewsImage(null); // Clear pending files when editing starts
        setNewsDocument(null);
        setEditingId(news.id);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top so admin can see the form
    };

    const cancelEdit = () => {
        setNewsTitle('');
        setNewsContent('');
        setIsImportant(false);
        setNewsImage(null);
        setNewsDocument(null);
        setEditingId(null);
        // Clear file inputs
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (documentInputRef.current) documentInputRef.current.value = '';
    };

    const formatEmployment = (type: string) => {
        const labels: Record<string, string> = {
            GOVT: 'Government', PRIVATE: 'Private Sector', 
            BUSINESS: 'Business', SELF: 'Self Employed', OTHER: 'Other'
        };
        return labels[type] || type;
    };

    // Admin permission check (Includes all your admin roles)
    const canPostNews = ['SUPERADMIN', 'ADMIN', 'CORE_ADMIN', 'CORE_MEMBER', 'SKPUSER', 'SYSTEM_ADMIN'].includes(userRole);

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 size={48} className="animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto font-sans space-y-6">
            
            {/* ── 1. THE WELCOME BANNER ── */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h2 className="text-sm font-bold text-blue-200 uppercase tracking-widest mb-1">Welcome to Samaj Connect</h2>
                    <h1 className="text-3xl md:text-4xl font-black mb-2">Namaste, {profile?.first_name || profile?.username || 'Member'}! 🙏</h1>
                    <p className="text-blue-100 font-medium max-w-md leading-relaxed">
                        Stay connected with your community. See latest official announcements, find members in the directory, and view live Samaj analytics.
                    </p>
                </div>
                <div className="hidden md:flex flex-col gap-3 w-full md:w-auto">
                    <Link href="/community/directory" className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-blue-50 transition flex items-center justify-center gap-2">
                        <Users size={18} /> View Directory
                    </Link>
                    <Link href="/community/events" className="bg-blue-700 border border-blue-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition flex items-center justify-center gap-2">
                        <Calendar size={18} /> Samaj Events
                    </Link>
                </div>
            </div>

            {/* ── 2. THE VIEW TOGGLE BUTTONS ── */}
            <div className="flex bg-gray-200/50 p-1 rounded-xl max-w-md mx-auto md:mx-0">
                <button 
                    onClick={() => setActiveView('NEWS')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-black text-sm transition-all ${
                        activeView === 'NEWS' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Megaphone size={16} /> Official News
                </button>
                <button 
                    onClick={() => setActiveView('ANALYTICS')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-black text-sm transition-all ${
                        activeView === 'ANALYTICS' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <BarChart3 size={16} /> Samaj Analytics
                </button>
            </div>

            {/* ── 3. CONDITIONAL RENDERING BASED ON TAB ── */}
            
            {activeView === 'NEWS' ? (
                /* ================= NEWS VIEW ================= */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2">
                    
                    {/* Left Column: Official News */}
                    <div className="lg:col-span-2 space-y-6">
                        <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                            <FileText className="text-blue-600" /> Samaj Announcements
                        </h3>

                        {/* 🌟 CREATE / EDIT NEWS INPUT */}
                        {canPostNews && (
                            <div className={`bg-white p-4 rounded-2xl shadow-sm border flex gap-4 items-start ${editingId ? 'border-yellow-400 bg-yellow-50/30' : 'border-purple-200'}`}>
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-black shrink-0 mt-1">
                                    <Award size={18} />
                                </div>
                                <div className="w-full space-y-3">
                                    {editingId && (
                                        <p className="text-xs font-black text-yellow-600 uppercase tracking-widest">Editing Announcement</p>
                                    )}
                                    <input 
                                        type="text" 
                                        placeholder="Announcement Title..." 
                                        value={newsTitle}
                                        onChange={(e) => setNewsTitle(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-900"
                                    />
                                    <textarea 
                                        rows={3}
                                        placeholder="Write official news for the Samaj..." 
                                        value={newsContent}
                                        onChange={(e) => setNewsContent(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-purple-500 font-medium resize-none text-gray-900"
                                    />
                                    
                                    {/* 🌟 NEW: File Upload Buttons */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        <input type="file" ref={imageInputRef} onChange={(e) => setNewsImage(e.target.files?.[0] || null)} accept="image/*" className="hidden" />
                                        <input type="file" ref={documentInputRef} onChange={(e) => setNewsDocument(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx" className="hidden" />
                                        
                                        <button onClick={() => imageInputRef.current?.click()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${newsImage ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                            <ImageIcon size={14} /> {newsImage ? 'Image Selected' : 'Add Image'}
                                        </button>
                                        
                                        <button onClick={() => documentInputRef.current?.click()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${newsDocument ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                            <Paperclip size={14} /> {newsDocument ? 'PDF Selected' : 'Add PDF'}
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-600 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={isImportant}
                                                onChange={(e) => setIsImportant(e.target.checked)}
                                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                                            />
                                            Mark as Important
                                        </label>
                                        
                                        <div className="flex items-center gap-3">
                                            {editingId && (
                                                <button 
                                                    onClick={cancelEdit}
                                                    className="text-gray-600 bg-gray-100 hover:bg-gray-200 font-bold px-4 py-2 rounded-lg text-sm transition"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <button 
                                                onClick={handlePostNews}
                                                disabled={isSubmitting || !newsTitle.trim() || !newsContent.trim()}
                                                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-2 px-6 rounded-lg text-sm transition shadow-sm flex items-center gap-2"
                                            >
                                                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                                                {editingId ? 'Update News' : 'Post News'}
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 🌟 DYNAMIC NEWS FEED ITEMS */}
                        {announcements.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 font-bold border-2 border-dashed border-gray-200 rounded-2xl">
                                No official announcements yet.
                            </div>
                        ) : (
                            announcements.map((news) => (
                                <div key={news.id} className={`bg-white p-5 rounded-2xl shadow-sm border ${news.is_important ? 'border-red-200' : 'border-gray-100'} relative overflow-hidden group`}>
                                    
                                    {news.is_important && (
                                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-lg z-10">
                                            Important
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black">
                                                <Award size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{news.author_name}</h4>
                                                <p className="text-xs text-gray-500 font-medium">
                                                    {news.author_role} • {new Date(news.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* 🌟 ACTION BUTTONS (Edit / Delete) - Only admins see this */}
                                        {canPostNews && (
                                            <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => startEdit(news)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteNews(news.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-lg font-black text-gray-800 mb-2">{news.title}</h3>
                                    <p className="text-gray-700 font-medium whitespace-pre-wrap leading-relaxed mb-4">{news.content}</p>

                                    {/* 🌟 NEW: DISPLAY IMAGE IF IT EXISTS */}
                                    {news.image && (
                                        <div className="mb-4">
                                            <img 
                                                src={getFileUrl(news.image)} 
                                                alt="Announcement attachment" 
                                                className="w-full max-h-[400px] object-contain bg-gray-50 rounded-xl border border-gray-100" 
                                            />
                                        </div>
                                    )}
                                    
                                    {/* 🌟 NEW: DISPLAY DOCUMENT (PDF) IF IT EXISTS */}
                                    {news.document && (
                                        <div className="mb-4">
                                            <a 
                                                href={getFileUrl(news.document)} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl text-orange-700 font-bold hover:bg-orange-100 transition"
                                            >
                                                <div className="bg-orange-200 p-2 rounded-lg text-orange-800">
                                                    <Paperclip size={18} />
                                                </div>
                                                View Attached Document (PDF)
                                            </a>
                                        </div>
                                    )}

                                </div>
                            ))
                        )}
                    </div>

                    {/* Right Column: Widgets */}
                    <div className="space-y-6">
                        {/* Event Widget */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2">
                                <Calendar size={18} className="text-blue-600" /> Upcoming Event
                            </h3>
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <h4 className="font-bold text-blue-900 mb-1">Samuhik Vivah 2026</h4>
                                <p className="text-sm text-blue-700 font-medium mb-3 flex items-center gap-1"><MapPin size={14}/> Bhilwara Main Ground</p>
                                <button className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-blue-700 transition">
                                    View Details
                                </button>
                            </div>
                        </div>

                        {/* Quick Stats Widget */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2">
                                <Users size={18} className="text-purple-600" /> Quick Stats
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 font-medium text-sm">Verified Families</span>
                                    <span className="font-black text-gray-900">{dashboardData?.overview.total_members || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 font-medium text-sm">Active Events</span>
                                    <span className="font-black text-blue-600">{dashboardData?.overview.active_events || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ================= ANALYTICS VIEW ================= */
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Users size={24} /></div>
                            <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-wide">Verified Members</p>
                                <h3 className="text-2xl font-black text-gray-900">{dashboardData?.overview.total_members}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600"><Calendar size={24} /></div>
                            <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-wide">Active Events</p>
                                <h3 className="text-2xl font-black text-gray-900">{dashboardData?.overview.active_events}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500"><Droplets size={24} /></div>
                            <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-wide">Blood Donations</p>
                                <h3 className="text-2xl font-black text-gray-900">{dashboardData?.overview.total_blood_donations}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><Trophy size={24} /></div>
                            <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-wide">Completed Events</p>
                                <h3 className="text-2xl font-black text-gray-900">{dashboardData?.overview.completed_events}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Demographics Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Top Villages */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-black text-gray-800 border-b pb-3 mb-4 flex items-center gap-2"><MapPin size={18} className="text-blue-600" /> Top Cities</h3>
                            <div className="space-y-4">
                                {dashboardData?.demographics.top_villages.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <span className="font-bold text-gray-700 capitalize">{item.village_en}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(item.total / dashboardData.overview.total_members) * 100}%` }} />
                                            </div>
                                            <span className="text-sm font-black text-gray-900 w-8 text-right">{item.total}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Gotras */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-black text-gray-800 border-b pb-3 mb-4 flex items-center gap-2"><BookOpen size={18} className="text-purple-600" /> Major Gotras</h3>
                            <div className="space-y-4">
                                {dashboardData?.demographics.top_gotras.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <span className="font-bold text-gray-700 capitalize">{item.gotra_en}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(item.total / dashboardData.overview.total_members) * 100}%` }} />
                                            </div>
                                            <span className="text-sm font-black text-gray-900 w-8 text-right">{item.total}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Employment */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-black text-gray-800 border-b pb-3 mb-4 flex items-center gap-2"><Briefcase size={18} className="text-orange-500" /> Career Sectors</h3>
                            <div className="space-y-4">
                                {dashboardData?.demographics.employment.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <span className="font-bold text-gray-700">{formatEmployment(item.employment_type)}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(item.total / dashboardData.overview.total_members) * 100}%` }} />
                                            </div>
                                            <span className="text-sm font-black text-gray-900 w-8 text-right">{item.total}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}