"use client";
import React from 'react';
import { Calendar, MapPin, Clock, Trophy, Users, ArrowRight } from 'lucide-react';

export default function CommunityEventsPage() {
    // 🌟 DUMMY DATA FOR NOW
    const UPCOMING_EVENTS = [
        {
            id: 1,
            title: "Samuhik Vivah Sammelan 2026",
            date: "15 Nov 2026",
            time: "09:00 AM onwards",
            location: "Bhilwara Main Samaj Ground",
            type: "Cultural",
            status: "Registrations Open",
            description: "Annual mass marriage ceremony for our community. Looking for volunteers and participants."
        },
        {
            id: 2,
            title: "Samaj Diwali Milan",
            date: "05 Nov 2026",
            time: "06:00 PM - 10:00 PM",
            location: "City Town Hall",
            type: "Gathering",
            status: "Upcoming",
            description: "A grand get-together to celebrate Diwali with all family members. Dinner will be provided."
        }
    ];

    const SPORTS_GAMES = [
        {
            id: 1,
            title: "Samaj Premier League (Cricket)",
            date: "10 Dec 2026",
            teams: "16 Teams Registered",
            location: "Sports Complex, Bhilwara",
            status: "Matches Scheduled"
        }
    ];

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto font-sans">
            
            {/* HEADER */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 mb-2">
                    <Calendar className="text-blue-600" size={32} />
                    Events & Games
                </h1>
                <p className="text-gray-500 font-medium">Participate in community gatherings, cultural programs, and sports.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* LEFT: CULTURAL EVENTS */}
                <div>
                    <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                        <Users className="text-purple-600" /> Cultural & Social Events
                    </h2>
                    <div className="space-y-4">
                        {UPCOMING_EVENTS.map(event => (
                            <div key={event.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest">
                                        {event.type}
                                    </span>
                                    <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-md">
                                        {event.status}
                                    </span>
                                </div>
                                <h3 className="text-lg font-black text-gray-900 mb-2">{event.title}</h3>
                                <p className="text-gray-600 text-sm mb-4 leading-relaxed">{event.description}</p>
                                
                                <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                        <Calendar size={16} className="text-blue-500" /> {event.date}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                        <Clock size={16} className="text-blue-500" /> {event.time}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                        <MapPin size={16} className="text-red-400" /> {event.location}
                                    </div>
                                </div>
                                
                                <button className="w-full bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold py-2.5 rounded-xl transition-colors flex justify-center items-center gap-2">
                                    View Details <ArrowRight size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: SPORTS & GAMES */}
                <div>
                    <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                        <Trophy className="text-yellow-500" /> Sports Tournaments
                    </h2>
                    <div className="space-y-4">
                        {SPORTS_GAMES.map(game => (
                            <div key={game.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center">
                                        <Trophy size={24} />
                                    </div>
                                    <span className="text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded-md">
                                        {game.status}
                                    </span>
                                </div>
                                <h3 className="text-lg font-black text-gray-900 mb-2">{game.title}</h3>
                                
                                <div className="space-y-2 mb-4 mt-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                        <Calendar size={16} className="text-gray-400" /> {game.date}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                        <Users size={16} className="text-gray-400" /> {game.teams}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                        <MapPin size={16} className="text-gray-400" /> {game.location}
                                    </div>
                                </div>
                                
                                <button className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl border border-gray-200 transition-colors">
                                    View Leaderboard
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}