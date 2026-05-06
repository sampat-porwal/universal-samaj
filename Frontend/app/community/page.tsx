"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, Megaphone, Heart, MessageSquare, Share2, Award, MapPin } from 'lucide-react';
import api from '@/lib/api';

export default function CommunityFeedPage() {
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await api.get('/auth/profile/');
                setProfile(res.data);
            } catch (error) {
                console.error("Failed to load user profile", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUserData();
    }, []);

    // 🌟 DUMMY POSTS (Later we will fetch this from backend)
    const FEED_POSTS = [
        {
            id: 1,
            author: "Samaj Core Committee",
            time: "2 hours ago",
            content: "Samuhik Vivah Sammelan 2026 is officially announced! Registrations for brides and grooms will open next week. Please share this with all relatives.",
            likes: 124,
            comments: 18,
            isOfficial: true
        },
        {
            id: 2,
            author: "Ramesh Sharma",
            time: "5 hours ago",
            content: "Very proud to announce that my daughter secured 95% in her 12th Board Exams. Thank you everyone for your blessings! 🙏",
            likes: 89,
            comments: 42,
            isOfficial: false
        }
    ];

    if (isLoading) {
        return (
            <div className="p-6 max-w-3xl mx-auto space-y-4">
                <div className="h-32 bg-gray-200 rounded-2xl animate-pulse"></div>
                <div className="h-64 bg-gray-200 rounded-2xl animate-pulse"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto font-sans">
            
            {/* 🌟 WELCOME BANNER */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-6 md:p-8 text-white shadow-lg mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h2 className="text-sm font-bold text-blue-200 uppercase tracking-widest mb-1">Welcome to Samaj Connect</h2>
                    <h1 className="text-3xl md:text-4xl font-black mb-2">Namaste, {profile?.first_name}! 🙏</h1>
                    <p className="text-blue-100 font-medium max-w-md leading-relaxed">
                        Stay connected with your community. See latest updates, find members in the directory, and participate in upcoming events.
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 🌟 LEFT COLUMN: NEWS FEED */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 mb-4">
                        <Megaphone className="text-blue-600" /> Community Updates
                    </h3>

                    {/* CREATE POST INPUT (UI Only for now) */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black shrink-0">
                            {profile?.first_name?.charAt(0) || 'U'}
                        </div>
                        <input 
                            type="text" 
                            placeholder="Share an update or news with the Samaj..." 
                            className="w-full bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                    </div>

                    {/* FEED ITEMS */}
                    {FEED_POSTS.map((post) => (
                        <div key={post.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black ${post.isOfficial ? 'bg-purple-600' : 'bg-gray-400'}`}>
                                        {post.author.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 flex items-center gap-1">
                                            {post.author} 
                                            {post.isOfficial && <Award size={14} className="text-blue-500" fill="currentColor" />}
                                        </h4>
                                        <p className="text-xs text-gray-500 font-medium">{post.time}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-gray-700 font-medium mb-4 leading-relaxed">
                                {post.content}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <button className="flex items-center gap-2 text-gray-500 hover:text-red-500 font-bold transition">
                                    <Heart size={18} /> {post.likes}
                                </button>
                                <button className="flex items-center gap-2 text-gray-500 hover:text-blue-500 font-bold transition">
                                    <MessageSquare size={18} /> {post.comments} Comments
                                </button>
                                <button className="flex items-center gap-2 text-gray-500 hover:text-green-500 font-bold transition">
                                    <Share2 size={18} /> Share
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 🌟 RIGHT COLUMN: WIDGETS */}
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

                    {/* Stats Widget */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2">
                            <Users size={18} className="text-purple-600" /> Samaj Stats
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-medium text-sm">Total Verified Families</span>
                                <span className="font-black text-gray-900">1,240</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-medium text-sm">New Members This Week</span>
                                <span className="font-black text-green-600">+12</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}