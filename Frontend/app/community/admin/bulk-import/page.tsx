"use client";
import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Users, FileJson, Link as LinkIcon, Search, Copy, User } from 'lucide-react';
import api from '@/lib/api';

export default function BulkImportPage() {
    const [authProfile, setAuthProfile] = useState<any>(null);
    const [jsonInput, setJsonInput] = useState('');
    const [parsedData, setParsedData] = useState<any>(null);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string[]>([]);
    
    // 🌟 States for the new ID Finder feature
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [copiedId, setCopiedId] = useState('');

    useEffect(() => {
        api.get('/auth/profile/').then(res => setAuthProfile(res.data)).catch(err => console.error(err));
    }, []);

    const loadNewFamilyTemplate = () => {
        const template = {
            head_of_family: {
                is_existing: false,
                first_name: "Ramesh", 
                last_name: "Suwalka", 
                mobile_no: "9876543210", 
                email: "ramesh@example.com", 
                gender: "M", 
                village_en: "Dhundra", 
                gotra_en: "Godash"
            },
            members: [
                { 
                    is_existing: false,
                    relation_to_head: "WIFE", 
                    first_name: "Sunita", 
                    last_name: "Suwalka", 
                    mobile_no: "9876543211", 
                    email: "sunita@example.com",
                    gender: "F", 
                    village_en: "Dhundra", 
                    gotra_en: "Anchera" 
                }
            ]
        };
        setJsonInput(JSON.stringify(template, null, 2));
        resetStates();
    };

    const loadExistingMemberTemplate = () => {
        const template = {
            head_of_family: {
                is_existing: true,
                existing_username: "skpsupper", 
            },
            members: [
                { 
                    is_existing: false,
                    relation_to_head: "WIFE", 
                    first_name: "Uma", 
                    last_name: "Suwalka", 
                    mobile_no: "", 
                    email: "uma@example.com", 
                    gender: "F", 
                    village_en: "Bhilwara", 
                    gotra_en: "Rathore" 
                }
            ]
        };
        setJsonInput(JSON.stringify(template, null, 2));
        resetStates();
    };

    const loadLinkBranchesTemplate = () => {
        const template = {
            head_of_family: {
                is_existing: false,
                first_name: "Mohan Lal",
                last_name: "Suwalka", 
                gender: "M", 
                village_en: "Dhundra", 
                gotra_en: "Godash"
            },
            members: [
                { 
                    is_existing: true,
                    relation_to_head: "SON", 
                    existing_username: "sampat3418" 
                },
                { 
                    is_existing: false,
                    relation_to_head: "SON", 
                    first_name: "Ramesh",
                    last_name: "Suwalka",
                    gender: "M", 
                    village_en: "Dhundra", 
                    gotra_en: "Godash"
                }
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
            setError(err.response?.data?.error || "Server Error. Are you an Admin or Core Member?");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 🌟 Search Member ID Function
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const res = await api.get(`/samaj/profiles/admin_search/?q=${searchQuery}`);
            setSearchResults(res.data);
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setIsSearching(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(text);
        setTimeout(() => setCopiedId(''), 2000);
    };

    const getImgUrl = (path: string | null) => {
        if (!path) return '';
        return path.startsWith('http') ? path : `http://127.0.0.1:8000${path}`;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans pb-20">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <UploadCloud className="text-blue-600" size={32}/> Bulk Family Onboarding
                    </h1>
                    <p className="text-gray-500 font-bold mt-2">Superadmin / Core Member Access: Auto-verify and connect families via JSON.</p>
                </div>
                {authProfile && (
                    <p className="text-sm font-bold text-gray-400 bg-gray-100 px-4 py-2 rounded-xl">
                        Operating as: <span className="text-blue-600 font-black">{authProfile.username} (Admin)</span>
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* LEFT: JSON EDITOR */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
                    <div className="flex flex-col gap-3 mb-4 border-b pb-4">
                        <h2 className="font-black text-gray-800 flex items-center gap-2"><FileJson size={18}/> Request Payload</h2>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={loadNewFamilyTemplate} className="text-xs font-bold bg-purple-50 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-100 transition border border-purple-200">
                                1. New Family
                            </button>
                            <button onClick={loadExistingMemberTemplate} className="text-xs font-bold bg-teal-50 text-teal-700 px-3 py-2 rounded-lg hover:bg-teal-100 transition border border-teal-200">
                                2. Extend Member
                            </button>
                            <button onClick={loadLinkBranchesTemplate} className="text-xs font-bold bg-orange-50 text-orange-700 px-3 py-2 rounded-lg hover:bg-orange-100 transition border border-orange-200 flex items-center gap-1">
                                <LinkIcon size={12}/> 3. Link Existing Branches
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
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[600px] overflow-y-auto custom-scrollbar">
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
                                <CheckCircle size={24}/> Network Connected!
                            </div>
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
                            <div className={`p-5 rounded-2xl border ${parsedData.head_of_family.is_existing ? 'bg-teal-50 border-teal-200' : 'bg-purple-50 border-purple-200'}`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1 ${parsedData.head_of_family.is_existing ? 'text-teal-600' : 'text-purple-600'}`}>
                                    <Users size={14}/> {parsedData.head_of_family.is_existing ? 'Linking to Existing Master' : 'Creating New Master'}
                                </p>
                                
                                {parsedData.head_of_family.is_existing ? (
                                    <h3 className="font-black text-xl text-gray-900">ID: <span className="text-teal-700 underline">{parsedData.head_of_family.existing_username}</span></h3>
                                ) : (
                                    <h3 className="font-black text-xl text-gray-900">{parsedData.head_of_family.first_name} {parsedData.head_of_family.last_name}</h3>
                                )}
                            </div>

                            <div className="space-y-3 pl-4 border-l-2 border-blue-100">
                                {parsedData.members?.map((mem: any, i: number) => (
                                    <div key={i} className={`bg-gray-50 border p-4 rounded-2xl relative ${mem.is_existing ? 'border-orange-200' : 'border-gray-200'}`}>
                                        <div className="absolute -left-[25px] top-1/2 w-6 border-t-2 border-blue-100"></div>
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{mem.relation_to_head}</p>
                                        
                                        {mem.is_existing ? (
                                            <div className="flex items-center gap-2">
                                                <LinkIcon size={14} className="text-orange-500" />
                                                <h4 className="font-black text-gray-900">Linking Existing ID: <span className="text-orange-600 underline">{mem.existing_username}</span></h4>
                                            </div>
                                        ) : (
                                            <h4 className="font-black text-gray-900">{mem.first_name} {mem.last_name}</h4>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button onClick={handleSubmit} disabled={isSubmitting} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg transition flex justify-center items-center gap-2">
                                {isSubmitting ? 'Executing Database Query...' : <><UploadCloud size={20}/> Execute Bulk Import</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 🌟 NEW FULL-WIDTH SECTION: ID FINDER */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 w-full mt-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <Search className="text-blue-500"/> Member ID Finder
                        </h2>
                        <p className="text-gray-500 font-bold text-sm mt-1">Search members by Name or Mobile to copy their exact User ID for linking.</p>
                    </div>
                    
                    <div className="flex w-full md:w-auto gap-2">
                        <input 
                            type="text" 
                            placeholder="Enter Name or Mobile..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="flex-1 md:w-64 bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-800"
                        />
                        <button 
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="bg-gray-800 hover:bg-gray-900 text-white font-black px-6 py-3 rounded-xl transition"
                        >
                            {isSearching ? '...' : 'Search'}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-black">
                                <th className="p-4 rounded-tl-xl rounded-bl-xl">Profile</th>
                                <th className="p-4">Father's Name</th>
                                <th className="p-4">Location & Gotra</th>
                                <th className="p-4">Mobile</th>
                                <th className="p-4 rounded-tr-xl rounded-br-xl text-right">Action (Copy ID)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {searchResults.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-gray-400 font-bold">
                                        No results found. Type a name and click Search.
                                    </td>
                                </tr>
                            ) : (
                                searchResults.map((user) => (
                                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                        <td className="p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 shrink-0 overflow-hidden">
                                                {user.image ? <img src={getImgUrl(user.image)} className="w-full h-full object-cover" alt=""/> : <User size={18}/>}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900">{user.name}</p>
                                                <p className="text-xs font-bold text-gray-500">{user.gender === 'M' ? 'Male' : 'Female'}</p>
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-gray-700">{user.father_name}</td>
                                        <td className="p-4">
                                            <p className="font-bold text-gray-700">{user.village || 'N/A'}</p>
                                            <p className="text-xs font-bold text-gray-500">{user.gotra || 'N/A'}</p>
                                        </td>
                                        <td className="p-4 font-bold text-gray-700">{user.mobile || 'N/A'}</td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => copyToClipboard(user.username)}
                                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-black transition border
                                                    ${copiedId === user.username ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700 shadow-sm'}
                                                `}
                                            >
                                                {copiedId === user.username ? <><CheckCircle size={14}/> Copied!</> : <><Copy size={14}/> Copy ID</>}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}