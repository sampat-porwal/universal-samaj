"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

// 🌟 IMPORT VALIDATORS
import { isValidMobile, isValidEmail } from '@/lib/validators';

type Profile = { username: string; name: string };

export default function UniversalLogin() {
    const router = useRouter();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // NETFLIX STATE: Holds the family profiles if a shared account is detected
    const [sharedProfiles, setSharedProfiles] = useState<Profile[] | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Removed .trim() here so it doesn't block typing spaces (we will trim on submit)
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e?: React.FormEvent<HTMLFormElement>, directUsername?: string) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        // 🌟 FIX FOR BROWSER AUTOFILL BUG
        let finalUsername = directUsername || formData.username;
        let finalPassword = formData.password;

        // Agar React State khali hai (autofill ki wajah se), toh direct HTML Input se utha lo
        if (e && e.currentTarget) {
            const form = e.currentTarget;
            const userField = form.elements.namedItem('username') as HTMLInputElement;
            const passField = form.elements.namedItem('password') as HTMLInputElement;
            
            if (!finalUsername && userField) finalUsername = userField.value;
            if (!finalPassword && passField) finalPassword = passField.value;
        }

        finalUsername = finalUsername.trim();

        if (!finalUsername || !finalPassword) {
            setError("Please provide both ID and password.");
            setLoading(false); 
            return;
        }

        // SMART FRONTEND VALIDATION
        if (!directUsername) {
            if (finalUsername.includes('@')) {
                if (!isValidEmail(finalUsername)) {
                    setError("Please enter a valid email address.");
                    setLoading(false); return;
                }
            } else if (/^\d+$/.test(finalUsername)) {
                if (!isValidMobile(finalUsername)) {
                    setError("Please enter a valid 10-digit mobile number.");
                    setLoading(false); return;
                }
            }
        }

        const loginPayload = {
            username: finalUsername,
            password: finalPassword
        };

        try {
            const response = await api.post('/auth/login/', loginPayload);
            
            if (response.data.status === "MULTIPLE_PROFILES") {
                setSharedProfiles(response.data.profiles);
            } else if (response.data.access) {
                localStorage.setItem('access_token', response.data.access);
                localStorage.setItem('refresh_token', response.data.refresh);
                
                // ROLE-BASED REDIRECT LOGIC
                const userRole = response.data.user?.role || 'USER'; 
                
                if (userRole === 'SUPERADMIN' || userRole === 'ADMIN') {
                    router.push('/dashboard'); 
                } else {
                    router.push('/community'); 
                }
            }
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 404) {
                setError("Network Error: Backend API not reachable.");
            } else {
                setError(err.response?.data?.detail || "Invalid login credentials. Please try again.");
            }
            setSharedProfiles(null); 
        } finally {
            setLoading(false);
        }
    };

    if (sharedProfiles) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans px-4">
                <div className="max-w-2xl w-full text-center">
                    <h2 className="text-4xl font-extrabold text-blue-900 mb-2">Who is logging in?</h2>
                    <p className="text-gray-600 mb-10 font-medium text-lg">Multiple profiles found for this contact.</p>
                    
                    <div className="flex flex-wrap justify-center gap-6">
                        {sharedProfiles.map((profile) => (
                            <button 
                                key={profile.username}
                                onClick={() => handleLogin(undefined, profile.username)}
                                disabled={loading}
                                className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-md border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition transform hover:-translate-y-2 focus:outline-none w-40"
                            >
                                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-3xl font-black mb-4">
                                    {profile.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold text-gray-800 text-lg truncate w-full">{profile.name}</span>
                                <span className="text-xs text-gray-400 mt-1">{profile.username}</span>
                            </button>
                        ))}
                    </div>

                    <div className="mt-12">
                        <button onClick={() => setSharedProfiles(null)} className="text-blue-600 font-bold hover:underline">
                            ← Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 flex items-center justify-center font-sans">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-extrabold text-blue-900 tracking-tight">Welcome Back</h2>
                    <p className="mt-3 text-lg text-gray-600 font-medium">Log in to your account</p>
                </div>

                <div className="bg-white py-8 px-8 shadow-xl rounded-2xl border border-gray-100">
                    {error && <div className="mb-6 text-red-700 text-sm font-bold text-center bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Email, Mobile, or System ID</label>
                            <input name="username" type="text" required onChange={handleChange}
                                className="block w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none font-medium placeholder-gray-400" 
                                placeholder="e.g., 9876543210 or USER-A1B2" />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-bold text-gray-700">Password</label>
                                <Link href="/forgot-password" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                    Forgot password?
                                </Link>
                            </div>
                            <input name="password" type="password" required onChange={handleChange}
                                className="block w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none font-medium placeholder-gray-400" 
                                placeholder="••••••••" />
                        </div>

                        <div className="pt-2">
                            <button type="submit" disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-lg py-4 px-4 rounded-xl shadow-lg transition active:scale-95 disabled:bg-blue-400">
                                {loading ? 'Processing...' : 'Secure Login 🔒'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center border-t border-gray-100 pt-6">
                        <p className="text-sm text-gray-600 font-medium">
                            Don't have an account? <Link href="/register" className="font-black text-blue-600 hover:text-blue-800 transition">Register here</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}