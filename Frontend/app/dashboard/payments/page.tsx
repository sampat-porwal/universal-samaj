"use client";
import React, { useState, useEffect } from 'react';
import { IndianRupee, Plus, X, CheckCircle, ArrowDownToLine, ArrowUpFromLine, AlertCircle } from "lucide-react";
import api from '@/lib/api';

// 🌟 1. IMPORT YOUR FINANCIAL VALIDATOR
import { isDecimal } from '@/lib/validators';

export default function UniversalCashbookPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [userPerms, setUserPerms] = useState<string[]>([]);

    const [partyName, setPartyName] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [remarks, setRemarks] = useState('');
    const [paymentType, setPaymentType] = useState<'IN' | 'OUT'>('IN'); 

    const fetchData = async () => {
        try {
            const res = await api.get('/payments/');
            setPayments(res.data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchData(); 
        const profileStr = localStorage.getItem('user_profile');
        if (profileStr) {
            const profile = JSON.parse(profileStr);
            setUserPerms(profile?.permissions || []);
        }
    }, []);

    const hasAllAccess = userPerms.includes('ALL_ACCESS');
    const canRecordPayment = hasAllAccess || userPerms.includes('manage_finances');

    const blockInvalidChar = (e: React.KeyboardEvent) => {
        if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!canRecordPayment) return alert("You do not have permission to record payments.");
        
        const safePartyName = partyName.trim();
        const safeAmount = amount.toString().trim();

        if (!safePartyName || !safeAmount) return alert("⚠️ Please enter a Name and Amount!");

        // 🌟 2. SMART FRONTEND VALIDATION: Strict Decimal Check
        if (!isDecimal(safeAmount)) {
            return alert("❌ Invalid Amount! Please enter a valid number with up to 2 decimal places (e.g., 500 or 1500.50).");
        }

        if (parseFloat(safeAmount) <= 0) return alert("❌ Amount must be greater than zero.");

        try {
            await api.post('/payments/', {
                party_name: safePartyName,
                payment_type: paymentType,
                amount: safeAmount,
                payment_mode: paymentMode,
                remarks: remarks.trim() 
            });

            alert(paymentType === 'IN' ? "✅ Receipt Saved!" : "✅ Payment Saved!");
            setShowForm(false);
            setPartyName(''); setAmount(''); setRemarks('');
            fetchData(); 
        } catch (error: any) {
            alert("❌ Error saving transaction.");
        }
    };

    if (loading) return <div className="flex h-full items-center justify-center p-8 text-emerald-600 font-bold animate-pulse">Loading Ledger...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><IndianRupee size={24} /></div>
                        Universal Cashbook
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Record money received or paid out.</p>
                </div>
                
                {canRecordPayment && (
                    <button onClick={() => setShowForm(!showForm)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-sm ${showForm ? 'bg-gray-100 text-gray-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                        {showForm ? <X size={20}/> : <Plus size={20}/>}
                        {showForm ? 'Cancel Entry' : 'New Transaction'}
                    </button>
                )}
            </div>

            {!canRecordPayment && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-center gap-3 text-yellow-800 font-medium">
                    <AlertCircle size={20} className="text-yellow-600" />
                    View-Only Mode. You do not have permission to add transactions.
                </div>
            )}

            {showForm && canRecordPayment && (
                <div className="bg-white p-8 rounded-2xl shadow-lg mb-8 border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSubmit}>
                        <div className="flex gap-4 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
                            <button type="button" onClick={() => setPaymentType('IN')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-black text-sm transition ${paymentType === 'IN' ? 'bg-white text-emerald-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                                <ArrowDownToLine size={18}/> Money IN (Receipt)
                            </button>
                            <button type="button" onClick={() => setPaymentType('OUT')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-black text-sm transition ${paymentType === 'OUT' ? 'bg-white text-rose-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                                <ArrowUpFromLine size={18}/> Money OUT (Paid)
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Name / Reference</label>
                                <input type="text" value={partyName} onChange={e => setPartyName(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-800" placeholder="e.g. Office Rent" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amount (₹)</label>
                                <input type="number" step="any" min="0" onKeyDown={blockInvalidChar} onWheel={(e) => e.currentTarget.blur()} value={amount} onChange={e => setAmount(e.target.value)} className={`w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 font-black ${paymentType === 'IN' ? 'focus:ring-emerald-500 text-emerald-700' : 'focus:ring-rose-500 text-rose-700'}`} placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mode</label>
                                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700 bg-white">
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI / App</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Remarks</label>
                                <input type="text" maxLength={100} value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-gray-700" placeholder="Optional notes..." />
                            </div>
                        </div>
                        <button type="submit" className={`flex items-center justify-center gap-2 text-white font-black py-3.5 px-8 rounded-xl shadow-md transition w-full md:w-auto ${paymentType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                            <CheckCircle size={20} /> {paymentType === 'IN' ? 'SAVE RECEIPT' : 'SAVE PAYMENT'}
                        </button>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reference Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Mode & Remarks</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {payments.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-bold">No transactions recorded yet.</td></tr>
                        ) : (
                            payments.map((p, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-gray-500 text-sm font-bold">{p.date}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black border uppercase tracking-wider ${p.payment_type === 'IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                            {p.payment_type === 'IN' ? 'MONEY IN' : 'MONEY OUT'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{p.party_name}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-700">{p.payment_mode}</div>
                                        <div className="text-xs text-gray-400 mt-0.5">{p.remarks || '-'}</div>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-black text-lg ${p.payment_type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {p.payment_type === 'IN' ? '+' : '-'} ₹ {parseFloat(p.amount).toLocaleString('en-IN')}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}