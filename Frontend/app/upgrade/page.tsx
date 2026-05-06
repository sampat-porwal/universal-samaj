"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import PaymentButton from '../components/PaymentButton';
import api from '@/lib/api'; // 🌟 ZAROORI: API call ke liye isko import karna padega

export default function UpgradePage() {
    const router = useRouter();
    
    // 🌟 NAYA: Payment Verify hone tak screen block karne ke liye state
    const [isVerifying, setIsVerifying] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
            
            {/* 🌟 NAYA: VERIFICATION OVERLAY (Jab tak backend verify na kare, screen lock rahegi) */}
            {isVerifying && (
                <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-6"></div>
                    <h2 className="text-3xl font-black mb-2 animate-pulse">Verifying Secure Payment...</h2>
                    <p className="text-gray-300 font-medium bg-red-500/20 px-4 py-2 rounded-lg border border-red-500/30">
                        ⚠️ Please DO NOT close or refresh this window.
                    </p>
                </div>
            )}

            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
                    Unlock the Full Power of Your ERP
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Your free trial has ended. Upgrade to our Premium plan to continue managing your business seamlessly.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 max-w-4xl w-full">
                
                {/* 1. Free Trial Plan (Disabled State) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex-1 opacity-75">
                    <h3 className="text-2xl font-semibold text-gray-900">Demo Plan</h3>
                    <p className="mt-4 text-gray-500">14 Days Access</p>
                    <div className="mt-4 text-4xl font-extrabold text-gray-900">Free</div>
                    <ul className="mt-8 space-y-4">
                        <li className="flex items-center text-gray-500"><span className="mr-3 text-red-500">✖</span> Expired</li>
                        <li className="flex items-center text-gray-500"><span className="mr-3 text-red-500">✖</span> Add New Orders</li>
                        <li className="flex items-center text-gray-500"><span className="mr-3 text-green-500">✔</span> View Old Data</li>
                    </ul>
                    <button disabled className="mt-8 w-full bg-gray-200 text-gray-500 font-semibold py-3 rounded-lg cursor-not-allowed">
                        Trial Ended
                    </button>
                </div>

                {/* 2. Pro SaaS Plan (Active State) */}
                <div className="bg-blue-600 rounded-2xl shadow-xl border border-blue-700 p-8 flex-1 transform scale-105 relative overflow-hidden">
                    <h3 className="text-2xl font-semibold text-white">Pro Cloud SaaS</h3>
                    <p className="mt-4 text-blue-200">Perfect for growing factories</p>
                    <div className="mt-4 text-4xl font-extrabold text-white">
                        ₹1,999 <span className="text-xl font-medium text-blue-200">/ month</span>
                    </div>
                    <ul className="mt-8 space-y-4">
                        <li className="flex items-center text-white"><span className="mr-3">✔</span> Unlimited Orders & Invoices</li>
                        <li className="flex items-center text-white"><span className="mr-3">✔</span> Unlimited Parties & Products</li>
                        <li className="flex items-center text-white"><span className="mr-3">✔</span> Live Stock & Production Tracking</li>
                        <li className="flex items-center text-white"><span className="mr-3">✔</span> Priority Support</li>
                    </ul>

                    {/* 🌟 YAHAN AAYA NAYA VERIFICATION LOGIC */}
                    <div className="mt-8 relative z-10">
                        <PaymentButton 
                            amount={1999} 
                            projectTag="TEXTILE_ERP" 
                            remarks="Pro Plan 1 Year Subscription"
                            onSuccess={async (response) => {
                                console.log("Success Details from Razorpay:", response);
                                
                                // 🌟 UI LOCK ON SUCCESS
                                setIsVerifying(true);
                                
                                try {
                                    // 1. Backend ko Payment details bhejein verify aur activate karne ke liye
                                    const verifyRes = await api.post('/api/payments/verify-payment/', {
                                        razorpay_order_id: response.razorpay_order_id,
                                        razorpay_payment_id: response.razorpay_payment_id,
                                        razorpay_signature: response.razorpay_signature
                                    });
                            
                                    // 2. Agar backend ne 'OK' bol diya, toh Success alert dikhayein
                                    if (verifyRes.status === 200) {
                                        alert("✅ Payment Verified Successfully! Your ERP is now Unlocked for 1 Year.");
                                        // 3. User ko Dashboard par bhej dein
                                        window.location.href = "/dashboard";
                                    }
                                } catch (error) {
                                    console.error("Verification failed:", error);
                                    alert("❌ Payment was deducted but verification failed. Please contact support.");
                                    setIsVerifying(false); // Sirf fail hone par unlock karein
                                }
                            }}
                        />
                    </div>
                </div>

            </div>

            <button 
                onClick={() => router.push('/dashboard')}
                className="mt-12 text-gray-500 hover:text-gray-900 underline font-medium transition"
            >
                Back to Dashboard (Read-Only Mode)
            </button>
        </div>
    );
}