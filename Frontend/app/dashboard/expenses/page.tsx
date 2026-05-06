"use client";
import React, { useState, useEffect } from 'react';
import { Receipt, Plus, X, CheckCircle, AlertCircle } from "lucide-react";
import api from '@/lib/api';

// 🌟 1. IMPORT FINANCIAL VALIDATOR
import { isDecimal } from '@/lib/validators';

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // 🌟 NAYA: User Permissions State
    const [userPerms, setUserPerms] = useState<string[]>([]);

    // --- FORM STATES ---
    const [category, setCategory] = useState('Tea & Snacks');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const fetchExpenses = async () => {
        try {
            // 🌟 BUG FIX: Removed extra /api/ from URL
            const res = await api.get('/expenses/');
            setExpenses(res.data || []);
        } catch (error) {
            console.error("Error fetching expenses:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchExpenses(); 
        
        // 🌟 NAYA: Profile se Permissions nikalna
        const profileStr = localStorage.getItem('user_profile');
        if (profileStr) {
            const profile = JSON.parse(profileStr);
            setUserPerms(profile?.permissions || []);
        }
    }, []);

    // 🌟 PERMISSION LOGIC (Checks)
    const hasAllAccess = userPerms.includes('ALL_ACCESS');
    // Using manage_finances here to match the Cashbook logic, but adjust if you have a specific add_expenses perm
    const canAddExpense = hasAllAccess || userPerms.includes('manage_finances');

    // 🌟 VALIDATION HELPER: Block negative sign and 'e' in number inputs
    const blockInvalidChar = (e: React.KeyboardEvent) => {
        if (['-', '+', 'e', 'E'].includes(e.key)) {
            e.preventDefault();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Extra UI Safety lock
        if (!canAddExpense) {
            alert("You do not have permission to add expenses.");
            return;
        }

        const safeAmount = amount.toString().trim();
        const finalDescription = description.trim();

        if (!safeAmount) return alert("⚠️ Please enter a valid amount!");

        // 🌟 2. SMART FRONTEND VALIDATION: Strict Decimal Check
        if (!isDecimal(safeAmount)) {
            return alert("❌ Invalid Amount! Please enter a valid number (e.g., 500 or 1500.50).");
        }

        if (parseFloat(safeAmount) <= 0) return alert("❌ Amount must be greater than zero.");

        try {
            // 🌟 BUG FIX: Removed extra /api/ from URL
            await api.post('/expenses/', {
                category,
                amount: safeAmount,
                description: finalDescription
            });
            alert("✅ Expense Saved Successfully!");
            setShowForm(false);
            setAmount(''); 
            setDescription('');
            fetchExpenses(); 
        } catch (error: any) {
            alert("❌ Error saving expense.");
        }
    };

    const totalExpenseAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    if (loading) return <div className="flex h-full items-center justify-center p-8 text-rose-600 font-bold animate-pulse">Loading Expenses...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><Receipt size={24} /></div>
                        Daily Expenses
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Record Chai, Rent, Salary and other shop expenses.</p>
                </div>
                
                {/* 🌟 HIDE 'ADD EXPENSE' BUTTON IF NO PERMISSION */}
                {canAddExpense && (
                    <button onClick={() => setShowForm(!showForm)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-sm ${showForm ? 'bg-gray-100 text-gray-700' : 'bg-rose-600 text-white hover:bg-rose-700'}`}>
                        {showForm ? <X size={20}/> : <Plus size={20}/>}
                        {showForm ? 'Cancel Entry' : 'Add Expense'}
                    </button>
                )}
            </div>

            {/* View-Only Banner */}
            {!canAddExpense && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-center gap-3 text-yellow-800 font-medium">
                    <AlertCircle size={20} className="text-yellow-600" />
                    View-Only Mode. You do not have permission to add expenses.
                </div>
            )}

            {/* 🌟 FORM BHI TABHI DIKHEGA JAB PERMISSION HOGI */}
            {showForm && canAddExpense && (
                <div className="bg-white p-8 rounded-2xl shadow-lg mb-8 border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rose-500 font-bold text-gray-700 bg-white">
                                    <option value="Tea & Snacks">Chai / Tea & Snacks</option>
                                    <option value="Salary">Staff Salary</option>
                                    <option value="Rent">Shop/Godown Rent</option>
                                    <option value="Electricity & Water">Electricity & Water Bill</option>
                                    <option value="Transport & Petrol">Transport / Petrol</option>
                                    <option value="Maintenance">Maintenance & Repair</option>
                                    <option value="Other">Other Expenses</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amount (₹)</label>
                                <input 
                                    type="number" 
                                    step="any" 
                                    min="0" 
                                    onKeyDown={blockInvalidChar} 
                                    onWheel={(e) => e.currentTarget.blur()} 
                                    value={amount} 
                                    onChange={e => setAmount(e.target.value)} 
                                    className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rose-500 font-black text-rose-700" 
                                    placeholder="0.00" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Details / Description</label>
                                <input 
                                    type="text" 
                                    maxLength={250} 
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)} 
                                    className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rose-500 font-medium text-gray-700" 
                                    placeholder="e.g. Raju ki salary, Bijli bill..." 
                                />
                            </div>
                        </div>
                        <button type="submit" className="flex items-center justify-center gap-2 text-white font-black py-3.5 px-8 rounded-xl shadow-md transition w-full md:w-auto bg-rose-600 hover:bg-rose-700">
                            <CheckCircle size={20} /> SAVE EXPENSE
                        </button>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-black text-gray-800">Recent Expenses</h3>
                    <h3 className="font-black text-rose-600 text-xl">Total: ₹ {totalExpenseAmount.toLocaleString('en-IN')}</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                        {expenses.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-16 text-center text-gray-400 font-bold">No expenses recorded yet.</td></tr>
                        ) : (
                            expenses.map((e, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-gray-500 text-sm font-bold">{e.date}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold border border-gray-200 tracking-wide">
                                            {e.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-700">{e.description || '-'}</td>
                                    <td className="px-6 py-4 text-right font-black text-rose-600 text-lg">
                                        ₹ {parseFloat(e.amount).toLocaleString('en-IN')}
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