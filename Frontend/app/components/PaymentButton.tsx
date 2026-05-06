"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

interface PaymentProps {
    amount: number;
    // 🌟 FIX: Added UNIVERSAL_TEMPLATE so TypeScript doesn't yell at you!
    projectTag: 'TEXTILE_ERP' | 'ROYAL_EDUCATION' | 'SOCIAL_APP' | 'UNIVERSAL_TEMPLATE' | string;
    remarks?: string;
    onSuccess: (response: any) => void;
}

export default function PaymentButton({ amount, projectTag, remarks, onSuccess }: PaymentProps) {
    const [loading, setLoading] = useState(false);
    const [userProfile, setUserProfile] = useState<any>({});

    // 🌟 1. SMART LOADER & USER DATA FETCH
    useEffect(() => {
        // Razorpay script loading
        const loadRazorpayScript = () => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            document.body.appendChild(script);
        };
        loadRazorpayScript();

        // Prefill Data Extraction
        const profileStr = localStorage.getItem('user_profile');
        if (profileStr) {
            try {
                setUserProfile(JSON.parse(profileStr));
            } catch (e) {}
        }
    }, []);

    const handlePayment = async () => {
        // 🌟 2. AMOUNT VALIDATION
        if (!amount || amount <= 0) {
            alert("⚠️ Invalid amount. Payment cannot be zero or negative.");
            return;
        }

        if (!(window as any).Razorpay) {
            alert("⚠️ Razorpay SDK is still loading. Please check your internet connection or try again in a few seconds.");
            return;
        }

        setLoading(true);
        try {
            // 🌟 FIX: Removed the extra /api. Now perfectly routes to localhost:8000/api/payments/create-order/
            const res = await api.post('/payments/create-order/', {
                amount,
                project_tag: projectTag,
                remarks: remarks || `Payment for ${projectTag}`
            });

            const data = res.data;

            // 2. Razorpay Options Configure
            const options = {
                key: data.key_id,
                amount: data.amount * 100, // Paise
                currency: data.currency,
                name: "System Upgrade", // 🌟 FIX: Generic name for the Universal Template
                description: data.description || "Secure Payment Gateway",
                order_id: data.order_id,
                
                handler: function (response: any) {
                    onSuccess(response);
                },
                
                // 🌟 3. SMART PREFILL
                prefill: {
                    name: userProfile?.name || userProfile?.username || "Client",
                    email: userProfile?.email || "support@universaltemplate.com", // 🌟 FIX: Generic email fallback
                    contact: userProfile?.phone || "", 
                },
                theme: { color: "#2563eb" }, 
            };

            const rzp = new (window as any).Razorpay(options);

            // 🌟 4. FAILURE HANDLER
            rzp.on('payment.failed', function (response: any) {
                console.error("Payment Failed Data:", response.error);
                alert(`❌ Payment Failed: ${response.error.description}`);
            });

            rzp.open();

        } catch (error) {
            console.error("Payment Error:", error);
            alert("❌ Failed to initiate payment. Please check backend configuration.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition-all active:scale-95 disabled:bg-blue-400 shadow-lg text-lg tracking-wide"
        >
            {loading ? "Connecting securely..." : `Pay ₹${amount} Now`}
        </button>
    );
}