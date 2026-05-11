"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, MapPin, Users, ShieldCheck, UserCheck, Network } from 'lucide-react';
import api from '@/lib/api';

export default function CommunityDirectoryPage() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchVerifiedProfiles();
    }, []);

    const fetchVerifiedProfiles = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/samaj/profiles/');
            const verifiedOnly = res.data.filter((p: any) => p.verification_status === 'VERIFIED');
            setProfiles(verifiedOnly);
        } catch (error) { console.error(error); } 
        finally { setIsLoading(false); }
    };

    const getImgUrl = (path: string) => {
        if (!path) return '';
        return path.startsWith('http') ? path : `http://127.0.0.1:8000${path}`;
    };

    const filteredProfiles = profiles.filter(profile => {
        const fullNameEn = `${profile.user?.first_name || ''} ${profile.user?.last_name || ''}`.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return (
            fullNameEn.includes(searchLower) ||
            (profile.samaj_id && profile.samaj_id.toLowerCase().includes(searchLower)) ||
            (profile.village_en && profile.village_en.toLowerCase().includes(searchLower))
        );
    });

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 mb-2">
                        <Users className="text-blue-600" size={32} />
                        Samaj Directory
                    </h1>
                    <p className="text-gray-500 font-medium">Search and connect with verified members of our community.</p>
                </div>
                
                <div className="w-full md:w-96 relative">
                    <input type="text" placeholder="Search by Name, ID, or Village..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all shadow-inner" />
                    <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((skeleton) => <div key={skeleton} className="h-48 bg-gray-200 rounded-2xl animate-pulse"></div>)}
                </div>
            ) : filteredProfiles.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <Users className="mx-auto text-gray-300 mb-4" size={64} />
                    <h2 className="text-2xl font-bold text-gray-600 mb-2">No members found</h2>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProfiles.map((profile, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all flex flex-col h-full">
                            <div className="flex justify-between items-start mb-5">
                                <div className="flex items-center gap-4">
                                    {profile.profile_image ? (
                                        <img src={getImgUrl(profile.profile_image)} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-gray-100" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-2xl">{profile.user?.first_name?.charAt(0) || 'U'}</div>
                                    )}
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 leading-tight">{profile.user?.first_name} {profile.user?.last_name}</h3>
                                        <p className="text-sm text-gray-500 font-medium font-hindi mt-0.5">{profile.user?.first_name_hi} {profile.user?.last_name_hi}</p>
                                    </div>
                                </div>
                                <ShieldCheck className="text-green-500" size={24} title="Verified" />
                            </div>

                            <div className="space-y-3 mb-5 flex-1">
                                <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                                    <UserCheck size={16} className="text-blue-500 shrink-0"/>
                                    <span className="font-bold">Samaj ID:</span> <span className="font-medium text-gray-600">{profile.samaj_id}</span>
                                </div>
                                {(profile.village_en || profile.gotra_en) && (
                                    <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                                        <MapPin size={16} className="text-red-400 shrink-0"/>
                                        <span className="font-medium">{profile.gotra_en ? `${profile.gotra_en} Gotra` : ''} {profile.gotra_en && profile.village_en ? ' • ' : ''} {profile.village_en}</span>
                                    </div>
                                )}
                            </div>

                            {/* 🌟 REPLACED SINGLE BUTTON WITH SPLIT BUTTONS FOR PROFILE & TREE */}
                            <div className="flex gap-2 mt-auto">
                                <Link href={`/community/directory/${profile.id}`} className="flex-[3] text-center bg-gray-50 hover:bg-blue-600 text-blue-600 hover:text-white font-bold py-2.5 rounded-xl border border-gray-200 transition-colors text-sm">
                                    View Profile
                                </Link>
                                <Link href={`/community/tree/${profile.id}`} title="View Family Tree" className="flex-[1] flex items-center justify-center bg-purple-50 hover:bg-purple-600 text-purple-600 hover:text-white font-bold py-2.5 rounded-xl border border-purple-200 transition-colors">
                                    <Network size={18} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}