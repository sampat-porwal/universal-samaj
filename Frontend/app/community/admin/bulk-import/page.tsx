"use client";
import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Users, FileJson } from 'lucide-react';
import api from '@/lib/api';

export default function BulkImportPage() {
    const [authProfile, setAuthProfile] = useState<any>(null);
    const [jsonInput, setJsonInput] = useState('');
    const [parsedData, setParsedData] = useState<any>(null);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string[]>([]);

    useEffect(() => {
        api.get('/auth/profile/').then(res => setAuthProfile(res.data)).catch(err => console.error(err));
    }, []);

    // 🌟 TEMPLATE 1: START NEW FAMILY
    const loadNewFamilyTemplate = () => {
        const template = {
            head_of_family: {
                is_existing: false,
                first_name: "Ramesh", last_name: "Suwalka", mobile_no: "9876543210", gender: "M", village_en: "Dhundra", gotra_en: "Godash"
            },
            members: [
                { relation_to_head: "WIFE", first_name: "Sunita", last_name: "Suwalka", mobile_no: "", gender: "F", village_en: "Dhundra", gotra_en: "Anchera" },
                { relation_to_head: "SON", first_name: "Rahul", last_name: "Suwalka", mobile_no: "", gender: "M", village_en: "Dhundra", gotra_en: "Godash" }
            ]
        };
        setJsonInput(JSON.stringify(template, null, 2));
        resetStates();
    };

    // 🌟 TEMPLATE 2: EXTEND EXISTING MEMBER
    const loadExistingMemberTemplate = () => {
        const template = {
            head_of_family: {
                is_existing: true,
                existing_username: "rahul3210", // 👈 Type the user ID you want to extend here!
            },
            members: [
                { relation_to_head: "WIFE", first_name: "Priya", last_name: "Suwalka", mobile_no: "", gender: "F", village_en: "Dhundra", gotra_en: "Rathore" },
                { relation_to_head: "SON", first_name: "Aarav", last_name: "Suwalka", mobile_no: "", gender: "M", village_en: "Dhundra", gotra_en: "Godash" }
            ]
        };
        setJsonInput(JSON.stringify(template, null, 2));
        resetStates();
    };

    const resetStates = () => {
        setError(''); setParsedData(null); setSuccessMessage([]);
    };

    const handleParse = () => {
        try {
            const data = JSON.parse(jsonInput);
            if (!data.head_of_family) throw new Error("Missing 'head_of_family' object.");
            setParsedData(data);
            setError('');
        } catch (e: any) {
            setError(`Invalid JSON format: ${e.message}`);
            setParsedData(null);
        }
    };

    const handleSubmit = async () => {
        if (!parsedData) return;
        setIsSubmitting(true);
        resetStates();

        try {
            const res = await api.post('/samaj/profiles/bulk_family_import/', parsedData);
            setSuccessMessage(res.data.imported_users);
            setJsonInput('');
            setParsedData(null);
        } catch (err: any) {
            setError(err.response?.data?.error || "Server Error. Are you a Core Member?");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto font-sans">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <UploadCloud className="text-blue-600" size={32}/> Bulk Family Onboarding
                    </h1>
                    <p className="text-gray-500 font-bold mt-2">Paste properly formatted JSON to create auto-verified family networks instantly.</p>
                </div>
                {authProfile && (
                    <p className="text-sm font-bold text-gray-400 bg-gray-100 px-4 py-2 rounded-xl">
                        Operating as: <span className="text-blue-600">{authProfile.first_name}</span>
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT: JSON EDITOR */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[650px]">
                    <div className="flex flex-col gap-3 mb-4 border-b pb-4">
                        <h2 className="font-black text-gray-800 flex items-center gap-2"><FileJson size={18}/> Request Payload</h2>
                        <div className="flex gap-2">
                            <button onClick={loadNewFamilyTemplate} className="text-xs font-bold bg-purple-50 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-100 transition flex-1 text-left border border-purple-200">
                                1. Start New Family
                            </button>
                            <button onClick={loadExistingMemberTemplate} className="text-xs font-bold bg-teal-50 text-teal-700 px-3 py-2 rounded-lg hover:bg-teal-100 transition flex-1 text-left border border-teal-200">
                                2. Extend Existing Member
                            </button>
                        </div>
                    </div>
                    
                    <textarea 
                        className="w-full flex-1 p-4 bg-gray-900 text-green-400 font-mono text-sm rounded-xl outline-none focus:ring-2 focus:ring-blue-500 custom-scrollbar resize-none"
                        placeholder="Paste your JSON here..."
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                    ></textarea>
                    
                    <button onClick={handleParse} className="w-full mt-4 bg-gray-800 hover:bg-gray-900 text-white font-black py-4 rounded-xl transition shadow-md">
                        Validate JSON Structure
                    </button>
                </div>

                {/* RIGHT: PREVIEW & SUBMIT */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[650px] overflow-y-auto custom-scrollbar">
                    <h2 className="font-black text-gray-800 mb-6 border-b pb-4">Preview & Confirm Execution</h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-start gap-3 mb-6 font-bold text-sm">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5"/>
                            <p>{error}</p>
                        </div>
                    )}

                    {successMessage.length > 0 && (
                        <div className="bg-green-50 border border-green-200 p-5 rounded-2xl mb-6">
                            <div className="flex items-center gap-2 text-green-700 font-black mb-3 text-lg">
                                <CheckCircle size={24}/> Network Created!
                            </div>
                            <p className="text-xs font-bold text-green-600 mb-4 bg-white p-2 rounded-lg border border-green-100">
                                Save these "User IDs" to use them as Masters in the next step.
                            </p>
                            <ul className="space-y-2">
                                {successMessage.map((msg, i) => (
                                    <li key={i} className="text-sm font-bold text-gray-800 bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div> {msg}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {parsedData && !error && successMessage.length === 0 && (
                        <div className="space-y-6 animate-in fade-in">
                            {/* Head Preview */}
                            <div className={`p-5 rounded-2xl border ${parsedData.head_of_family.is_existing ? 'bg-teal-50 border-teal-200' : 'bg-purple-50 border-purple-200'}`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1 ${parsedData.head_of_family.is_existing ? 'text-teal-600' : 'text-purple-600'}`}>
                                    <Users size={14}/> {parsedData.head_of_family.is_existing ? 'Linking to Existing Master' : 'Creating New Master'}
                                </p>
                                
                                {parsedData.head_of_family.is_existing ? (
                                    <h3 className="font-black text-xl text-gray-900">User ID: <span className="text-teal-700 underline">{parsedData.head_of_family.existing_username}</span></h3>
                                ) : (
                                    <>
                                        <h3 className="font-black text-xl text-gray-900">{parsedData.head_of_family.first_name} {parsedData.head_of_family.last_name}</h3>
                                        <p className="text-sm font-bold text-gray-500 mt-1">Mobile: {parsedData.head_of_family.mobile_no || 'N/A'} • {parsedData.head_of_family.village_en}</p>
                                    </>
                                )}
                            </div>

                            {/* Members Preview */}
                            <div className="space-y-3 pl-4 border-l-2 border-blue-100">
                                {parsedData.members?.map((mem: any, i: number) => (
                                    <div key={i} className="bg-gray-50 border border-gray-200 p-4 rounded-2xl relative">
                                        <div className="absolute -left-[25px] top-1/2 w-6 border-t-2 border-blue-100"></div>
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{mem.relation_to_head}</p>
                                        <h4 className="font-black text-gray-900">{mem.first_name} {mem.last_name}</h4>
                                        <p className="text-xs font-bold text-gray-500">{mem.gender === 'M' ? 'Male' : 'Female'} • {mem.village_en}</p>
                                    </div>
                                ))}
                            </div>

                            <button onClick={handleSubmit} disabled={isSubmitting} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg transition flex justify-center items-center gap-2">
                                {isSubmitting ? 'Executing Database Query...' : <><UploadCloud size={20}/> Execute Bulk Import</>}
                            </button>
                        </div>
                    )}
                    
                    {!parsedData && !error && successMessage.length === 0 && (
                        <div className="flex-1 flex items-center justify-center text-gray-400 font-bold text-sm text-center px-10">
                            Paste JSON format on the left and click "Validate JSON Structure" to see the visual preview.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}