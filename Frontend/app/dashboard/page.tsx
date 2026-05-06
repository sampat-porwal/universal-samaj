"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Activity, Server, ShieldCheck } from "lucide-react";

export default function UniversalDashboardHome() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profileName, setProfileName] = useState("User");
    const [profileRole, setProfileRole] = useState("USER");

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        
        if (!token) {
            router.push('/login');
        } else {
            // Read the real profile data saved by layout.tsx
            const savedProfile = localStorage.getItem('user_profile');
            if (savedProfile) {
                const parsed = JSON.parse(savedProfile);
                setProfileName(parsed.first_name || parsed.username || "User");
                setProfileRole(parsed.role || "USER");
            }
            setLoading(false);
        }
    }, [router]);

    if (loading) {
        return (
            <div className="h-[80vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto font-sans">
            <div className="mb-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-800">Welcome back, {profileName}!</h1>
                    <p className="text-gray-500 mt-2 text-lg">Your profile is securely connected via JWT.</p>
                </div>
            </div>

            {/* Universal Stats Row (Static for now until Step 4) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><Users size={32} /></div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase">Total Users</h3>
                        <p className="text-3xl font-black text-gray-800">1</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
                    <div className="p-4 bg-green-50 text-green-600 rounded-xl"><ShieldCheck size={32} /></div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase">My Role</h3>
                        <p className="text-3xl font-black text-green-700 uppercase">{profileRole}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
                    <div className="p-4 bg-purple-50 text-purple-600 rounded-xl"><Server size={32} /></div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase">System Health</h3>
                        <p className="text-3xl font-black text-gray-800">100%</p>
                    </div>
                </div>
            </div>

            {/* Success Message Area */}
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-gray-700 mb-2">Step 2: Profile Complete</h2>
                <p className="text-gray-500 max-w-2xl mx-auto">
                    Your frontend is now successfully fetching real user data from your Django database. 
                    We are ready to move forward to <strong>Step 3: Roles & Permissions</strong> whenever you are ready!
                </p>
            </div>
        </div>
    );
}