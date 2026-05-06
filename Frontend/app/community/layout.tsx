"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Calendar, User, Bell, LogOut, Clock, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [samajStatus, setSamajStatus] = useState('LOADING'); // PENDING, VERIFIED, REJECTED

    useEffect(() => {
        const checkAuthAndStatus = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) {
                router.push("/login");
                return;
            }

            try {
                // 1. Get User Data
                const res = await api.get('/auth/profile/');
                setProfile(res.data);
                
                // 2. Fetch Samaj Profile to check VERIFICATION STATUS
                // Note: You will need a simple API endpoint to get the logged-in user's Samaj Profile
                // For now, assuming your backend sends status in profile or we fetch it:
                const samajRes = await api.get('/samaj/profiles/'); 
                // Getting the logged in user's specific profile from the list (or create a /me endpoint later)
                const myProfile = samajRes.data.find((p: any) => p.user.username === res.data.username);
                
                if (myProfile) {
                    setSamajStatus(myProfile.verification_status);
                } else {
                    setSamajStatus('NOT_FOUND');
                }

            } catch (error) {
                console.error("Auth failed", error);
                router.push("/login");
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthAndStatus();
    }, [router]);

    const handleLogout = () => {
        localStorage.clear();
        router.push("/login");
    };

    const NAV_ITEMS = [
        { name: 'Feed', path: '/community', icon: <Home size={24} /> },
        { name: 'Directory', path: '/community/directory', icon: <Users size={24} /> },
        { name: 'Events & Games', path: '/community/events', icon: <Calendar size={24} /> },
        { name: 'My Profile', path: '/community/profile', icon: <User size={24} /> },
    ];

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div></div>;

    // 🌟 THE "PENDING" LOCK SCREEN (Like Facebook's review process)
    if (samajStatus === 'PENDING') {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-gray-100">
                    <Clock size={64} className="mx-auto text-yellow-500 mb-6 animate-pulse" />
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Verification Pending</h2>
                    <p className="text-gray-600 mb-6 font-medium leading-relaxed">
                        Namaste {profile?.first_name}! Your profile has been submitted to the Samaj Core Committee. You will get access to the community features once 5 Core Members verify your identity.
                    </p>
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm font-bold border border-yellow-200 mb-6">
                        Current Status: Under Review
                    </div>
                    <button onClick={handleLogout} className="text-gray-500 font-bold hover:text-red-500 transition flex items-center justify-center gap-2 w-full">
                        <LogOut size={18} /> Logout for now
                    </button>
                </div>
            </div>
        );
    }

    // 🌟 THE VERIFIED COMMUNITY APP UI
    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            
            {/* DESKTOP SIDEBAR (Hidden on Mobile) */}
            <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <h1 className="font-black text-xl text-blue-700 tracking-tight">Samaj Connect</h1>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link key={item.name} href={item.path} className={`flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                                {item.icon}
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-gray-100">
                    <button onClick={handleLogout} className="flex items-center gap-3 text-red-500 font-bold hover:bg-red-50 w-full p-3 rounded-xl transition">
                        <LogOut size={20} /> Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col h-full relative">
                
                {/* TOP MOBILE HEADER */}
                <header className="md:hidden h-14 bg-white flex items-center justify-between px-4 border-b border-gray-200 shadow-sm z-10">
                    <h1 className="font-black text-lg text-blue-700 tracking-tight">Samaj Connect</h1>
                    <button className="text-gray-600 relative p-2">
                        <Bell size={22} />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>
                </header>

                {/* TOP DESKTOP HEADER */}
                <header className="hidden md:flex h-16 bg-white items-center justify-between px-8 border-b border-gray-200 shadow-sm z-10">
                    <div className="text-gray-500 font-medium">Welcome back, <span className="font-bold text-gray-900">{profile?.first_name}</span>!</div>
                    <button className="bg-gray-100 p-2 rounded-full text-gray-600 hover:bg-gray-200 transition relative">
                        <Bell size={20} />
                    </button>
                </header>

                {/* SCROLLABLE PAGE CONTENT */}
                <main className="flex-1 overflow-y-auto bg-gray-50 pb-20 md:pb-0 custom-scrollbar">
                    {children}
                </main>

                {/* BOTTOM MOBILE NAVIGATION (Facebook/Insta Style) */}
                <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 z-20 pb-safe">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link key={item.name} href={item.path} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                {item.icon}
                                <span className="text-[10px] font-bold">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}