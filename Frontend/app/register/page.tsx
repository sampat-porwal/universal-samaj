"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

// 🌟 IMPORT YOUR VALIDATORS
import { 
    isAlphaOnly, 
    isValidMobile, 
    isValidEmail, 
    isValidAadhaar 
} from '@/lib/validators';

export default function UniversalRegister() {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        first_name_hi: '',
        last_name_hi: '',
        mobile_no: '',
        email: '',
        aadhaar_no: '',
        samaj_id: '',
        village_en: '',
        gotra_en: '',
        password: '',
        confirm_password: '',
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successData, setSuccessData] = useState<{username: string, name: string} | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const firstName = formData.first_name.trim();
        const mobileNo = formData.mobile_no.trim();
        const email = formData.email.trim();
        
        // 🌟 FRONTEND VALIDATION CHECKS
        if (!firstName || !mobileNo) {
            setError("First Name and Mobile Number are required.");
            setLoading(false); return;
        }

        if (!isValidMobile(mobileNo)) {
            setError("Please enter a valid 10-digit mobile number.");
            setLoading(false); return;
        }

        if (email && !isValidEmail(email)) {
            setError("Please enter a valid email address.");
            setLoading(false); return;
        }

        if (formData.password !== formData.confirm_password) {
            setError("Passwords do not match.");
            setLoading(false); return;
        }

        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters long.");
            setLoading(false); return;
        }

        try {
            // Sending all the extended data to the backend API
            const response = await api.post('/auth/register/', formData);
            
            if (response.status === 201 || response.status === 200) {
                setSuccessData({
                    username: response.data.username || "Sent to your email/SMS",
                    name: firstName
                }); 
            }
            
        } catch (err: any) {
            console.error("Registration Error:", err);
            if (err.response?.status === 404) {
                setError("Network Error: Could not reach the registration server.");
            } else {
                setError(err.response?.data?.error || err.response?.data?.non_field_errors?.[0] || 'Registration failed. Check inputs.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (successData) {
        return (
            <div className="min-h-screen bg-gray-50 py-10 px-4 flex items-center justify-center">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border-t-4 border-green-500 text-center">
                    <div className="text-5xl mb-4">🎉</div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Welcome, {successData.name}!</h2>
                    <p className="text-gray-600 mb-4 font-medium">Your profile has been submitted for verification.</p>
                    
                    <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
                        <p className="text-sm text-blue-800 font-bold mb-1">Your Unique Login ID is:</p>
                        <p className="text-2xl font-black text-blue-900 tracking-wider">{successData.username}</p>
                        <p className="text-xs text-blue-600 mt-2">Please save this ID. You will use it to log in.</p>
                    </div>

                    <Link href="/login" className="inline-block w-full bg-blue-600 text-white font-black py-3 px-4 rounded-xl shadow-md hover:bg-blue-700 transition">
                        Go to Login Page
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-extrabold text-blue-900 tracking-tight">Samaj Registration</h2>
                    <p className="text-gray-500 mt-2">Join the community. Complete your profile below.</p>
                </div>

                <div className="bg-white py-8 px-8 shadow-xl rounded-2xl border border-gray-100">
                    {error && <div className="mb-6 text-red-700 text-sm font-bold text-center bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}

                    <form onSubmit={handleRegistration} className="space-y-6">
                        
                        {/* Section 1: Basic Identity */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Personal Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">First Name (English) *</label>
                                    <input name="first_name" type="text" required onChange={handleChange} className="block w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none font-medium" placeholder="e.g. Rahul" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Last Name (English)</label>
                                    <input name="last_name" type="text" onChange={handleChange} className="block w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none font-medium" placeholder="e.g. Sharma" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">First Name (Hindi)</label>
                                    <input name="first_name_hi" type="text" onChange={handleChange} className="block w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none font-medium font-hindi" placeholder="e.g. राहुल" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Last Name (Hindi)</label>
                                    <input name="last_name_hi" type="text" onChange={handleChange} className="block w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none font-medium font-hindi" placeholder="e.g. शर्मा" />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Contact & Samaj Info */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 mt-6">Samaj Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Mobile Number *</label>
                                    <input name="mobile_no" type="tel" required onChange={handleChange} className="block w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none font-medium" placeholder="10 Digits" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Email (Optional)</label>
                                    <input name="email" type="email" onChange={handleChange} className="block w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none font-medium" placeholder="For notifications" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Village/City</label>
                                    <input name="village_en" type="text" onChange={handleChange} className="block w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none font-medium" placeholder="e.g. Bhilwara" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Gotra</label>
                                    <input name="gotra_en" type="text" onChange={handleChange} className="block w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none font-medium" placeholder="Your Gotra" />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Security */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 mt-6">Security</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Password *</label>
                                    <input name="password" type="password" required minLength={8} onChange={handleChange} className="block w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none font-medium" placeholder="Min 8 chars" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Confirm Password *</label>
                                    <input name="confirm_password" type="password" required minLength={8} onChange={handleChange} className="block w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 bg-gray-50 outline-none font-medium" placeholder="••••••••" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-lg py-4 px-4 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                                {loading ? 'Submitting Application...' : 'Submit Profile for Verification'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}