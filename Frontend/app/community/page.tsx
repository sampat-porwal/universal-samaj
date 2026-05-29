"use client";
import React, { useEffect, useState } from 'react';
import { 
    Users, Calendar, Droplets, Briefcase, 
    MapPin, BookOpen, Activity, Loader2, Trophy
} from 'lucide-react';
import api from '@/lib/api';

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

export default function SamajDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await api.get('/samaj/dashboard-stats/');
                setData(res.data);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 size={48} className="animate-spin text-blue-600" />
            </div>
        );
    }

    if (!data) return null;

    // Helper to format employment labels
    const formatEmployment = (type: string) => {
        const labels: Record<string, string> = {
            GOVT: 'Government', PRIVATE: 'Private Sector', 
            BUSINESS: 'Business', SELF: 'Self Employed', OTHER: 'Other'
        };
        return labels[type] || type;
    };

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans space-y-6">
            
            {/* ── HEADER ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900">Community Dashboard</h1>
                    <p className="text-gray-500 font-medium mt-1">Live metrics and demographics from the Samaj database.</p>
                </div>
            </div>

            {/* ── TOP STATS CARDS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-wide">Verified Members</p>
                        <h3 className="text-2xl font-black text-gray-900">{data.overview.total_members}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-wide">Active Events</p>
                        <h3 className="text-2xl font-black text-gray-900">{data.overview.active_events}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                        <Droplets size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-wide">Blood Donations</p>
                        <h3 className="text-2xl font-black text-gray-900">{data.overview.total_blood_donations}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <Trophy size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-wide">Completed Events</p>
                        <h3 className="text-2xl font-black text-gray-900">{data.overview.completed_events}</h3>
                    </div>
                </div>
            </div>

            {/* ── DEMOGRAPHICS GRID ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Top Villages / Cities */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-black text-gray-800 border-b pb-3 mb-4 flex items-center gap-2">
                        <MapPin size={18} className="text-blue-600" /> Top Cities & Villages
                    </h3>
                    <div className="space-y-4">
                        {data.demographics.top_villages.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <span className="font-bold text-gray-700">{item.village_en}</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500 rounded-full" 
                                            style={{ width: `${(item.total / data.overview.total_members) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-black text-gray-900 w-8 text-right">{item.total}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Gotras */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-black text-gray-800 border-b pb-3 mb-4 flex items-center gap-2">
                        <BookOpen size={18} className="text-purple-600" /> Major Gotras
                    </h3>
                    <div className="space-y-4">
                        {data.demographics.top_gotras.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <span className="font-bold text-gray-700">{item.gotra_en}</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-purple-500 rounded-full" 
                                            style={{ width: `${(item.total / data.overview.total_members) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-black text-gray-900 w-8 text-right">{item.total}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Employment Breakdown */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-black text-gray-800 border-b pb-3 mb-4 flex items-center gap-2">
                        <Briefcase size={18} className="text-orange-500" /> Career Sectors
                    </h3>
                    <div className="space-y-4">
                        {data.demographics.employment.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <span className="font-bold text-gray-700">{formatEmployment(item.employment_type)}</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-orange-400 rounded-full" 
                                            style={{ width: `${(item.total / data.overview.total_members) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-black text-gray-900 w-8 text-right">{item.total}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}