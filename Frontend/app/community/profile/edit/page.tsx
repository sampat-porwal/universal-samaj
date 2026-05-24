"use client";
import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Save, Loader2, UserCheck, Briefcase, Plus,
    Trash2, ChevronRight, Search, ListPlus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

type Tab = 'BASIC' | 'CAREER' | 'EXTRA';

const TABS: { key: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: 'BASIC',   label: 'Basic & Contact', icon: <UserCheck size={18} />,  desc: 'Mobile, email, DOB, blood group, address' },
    { key: 'CAREER',  label: 'Profession',      icon: <Briefcase size={18} />, desc: 'Employment, role, company, education' },
    { key: 'EXTRA',   label: 'Additional Details', icon: <ListPlus size={18} />, desc: 'Add City, State, Pincode, and more' },
];

export default function EditProfilePage() {
    const router = useRouter();
    const [samajProfile, setSamajProfile] = useState<any>(null);
    const [authProfile, setAuthProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('BASIC');
    const [saveMsg, setSaveMsg] = useState('');

    // Gotra State
    const [availableGotras, setAvailableGotras] = useState<any[]>([]);
    const [showGotraDropdown, setShowGotraDropdown] = useState(false);

    const [form, setForm] = useState({
        mobile_no: '',
        email: '',
        dob: '',
        blood_group: '',
        village_en: '',
        gotra_en: '',
        address_1: '',
        new_password: '',
        employment_type: 'OTHER',
        occupation_en: '',
        business_name: '',
        work_address: '',
        education: '',
        extra_details: {} as Record<string, string>,
    });

    const [newCustomField, setNewCustomField] = useState('');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [authRes, samajRes, gotraRes] = await Promise.all([
                api.get('/auth/profile/'),
                api.get('/samaj/profiles/'),
                api.get('/samaj/gotras/')
            ]);

            setAuthProfile(authRes.data);
            setAvailableGotras(gotraRes.data);

            const mine = samajRes.data.find((p: any) => p.user.username === authRes.data.username);
            setSamajProfile(mine);

            if (mine) {
                setForm({
                    mobile_no:       authRes.data.mobile_no || '',
                    email:           authRes.data.email || '',
                    dob:             mine.dob || '',
                    blood_group:     mine.blood_group || '',
                    village_en:      mine.village_en || '',
                    gotra_en:        mine.gotra_en || '',
                    address_1:       mine.address_1 || '',
                    new_password:    '',
                    employment_type: mine.employment_type || 'OTHER',
                    occupation_en:   mine.occupation_en || '',
                    business_name:   mine.business_name || '',
                    work_address:    mine.work_address || '',
                    education:       mine.education || '',
                    extra_details:   mine.extra_details || {},
                });
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!samajProfile) return;
        setIsSaving(true);
        setSaveMsg('');
        try {
            const authPayload: any = { mobile_no: form.mobile_no, email: form.email };
            if (form.new_password.trim()) authPayload.password = form.new_password;
            await api.patch('/auth/profile/', authPayload);

            await api.patch(`/samaj/profiles/${samajProfile.id}/`, {
                village_en:      form.village_en,
                gotra_en:        form.gotra_en,
                dob:             form.dob || null,
                blood_group:     form.blood_group,
                address_1:       form.address_1,
                employment_type: form.employment_type,
                occupation_en:   form.occupation_en,
                business_name:   form.business_name,
                work_address:    form.work_address,
                education:       form.education,
                extra_details:   form.extra_details,
            });
            setSaveMsg('✅ Profile saved successfully!');
            setTimeout(() => router.push('/community/profile'), 1200);
        } catch (e: any) {
            setSaveMsg('❌ Save failed. Check fields and try again.');
            console.error(e.response?.data);
        } finally { setIsSaving(false); }
    };

    // ─── DYNAMIC CUSTOM FIELD LOGIC ──────────────────────────────────────────

    // Add an empty field to the JSON object so the user can type into it
    const addCustomField = (keyName: string) => {
        const key = keyName.trim();
        if (!key) return;
        
        // Prevent overwriting if it already exists
        if (form.extra_details[key] !== undefined) {
            setNewCustomField('');
            return;
        }

        setForm(f => ({ ...f, extra_details: { ...f.extra_details, [key]: '' } }));
        setNewCustomField('');
    };

    // Update the value of an existing custom field
    const updateCustomValue = (key: string, val: string) => {
        setForm(f => ({ ...f, extra_details: { ...f.extra_details, [key]: val } }));
    };

    // Completely remove a custom field
    const removeCustomField = (key: string) => {
        const d = { ...form.extra_details };
        delete d[key];
        setForm(f => ({ ...f, extra_details: d }));
    };

    // ─────────────────────────────────────────────────────────────────────────

    const filteredGotras = availableGotras.filter(g => 
        g.name_en?.toLowerCase().includes(form.gotra_en.toLowerCase()) || 
        g.name_hi?.includes(form.gotra_en)
    );

    if (isLoading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <Loader2 size={36} className="animate-spin text-blue-600" />
        </div>
    );

    const inputCls = "w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white text-sm font-bold text-gray-900 transition";
    const labelCls = "block text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5";

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* TOP BAR */}
            <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/community/profile')} className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-600">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-gray-900">Edit Profile</h1>
                        <p className="text-xs text-gray-400 font-medium hidden sm:block">
                            {TABS.find(t => t.key === activeTab)?.desc}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {saveMsg && (
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${saveMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                            {saveMsg}
                        </span>
                    )}
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black px-5 py-2.5 rounded-xl transition shadow-sm disabled:opacity-60 text-sm">
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            <div className="flex w-full mx-auto">
                {/* SIDEBAR TABS */}
                <div className="w-64 shrink-0 hidden md:block border-r border-gray-200 bg-white">
                    <div className="p-4 sticky top-20">
                        <nav className="space-y-1">
                            {TABS.map(tab => (
                                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                    className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-sm transition text-left ${
                                        activeTab === tab.key ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-500 hover:bg-gray-50'
                                    }`}>
                                    <span className={activeTab === tab.key ? 'text-blue-600' : 'text-gray-400'}>{tab.icon}</span>
                                    <div>
                                        <div>{tab.label}</div>
                                        <div className="text-[10px] font-medium text-gray-400 mt-0.5 leading-tight">{tab.desc}</div>
                                    </div>
                                    {activeTab === tab.key && <ChevronRight size={14} className="ml-auto text-blue-400" />}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* MOBILE TABS */}
                <div className="flex md:hidden overflow-x-auto gap-2 p-4 pb-0 w-full">
                    {TABS.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap transition ${
                                activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
                            }`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* FORM AREA */}
                <div className="flex-1 p-4 md:p-8 overflow-hidden w-full">
                    <form onSubmit={handleSave} className="w-full space-y-6">

                        {/* ────── BASIC & CONTACT ────── */}
                        {activeTab === 'BASIC' && (
                            <>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 w-full">
                                    <h3 className="font-black text-gray-800 border-b pb-3 flex items-center gap-2">
                                        <UserCheck size={16} className="text-blue-600" /> Contact Details
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        <div>
                                            <label className={labelCls}>Mobile Number</label>
                                            <input type="tel" value={form.mobile_no} onChange={e => set('mobile_no', e.target.value)} className={inputCls} placeholder="9876543210" />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Email Address</label>
                                            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="name@example.com" />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Date of Birth</label>
                                            <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Blood Group</label>
                                            <select value={form.blood_group} onChange={e => set('blood_group', e.target.value)} className={inputCls}>
                                                <option value="">-- Select --</option>
                                                {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(g => <option key={g}>{g}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Origin Village / City</label>
                                            <input type="text" value={form.village_en} onChange={e => set('village_en', e.target.value)} className={inputCls} placeholder="e.g. Godash" />
                                        </div>

                                        {/* GOTRA AUTOCOMPLETE */}
                                        <div className="relative">
                                            <label className={labelCls}>Gotra</label>
                                            <input 
                                                type="text" 
                                                value={form.gotra_en} 
                                                onChange={e => {
                                                    set('gotra_en', e.target.value);
                                                    setShowGotraDropdown(true);
                                                }} 
                                                onFocus={() => setShowGotraDropdown(true)}
                                                onBlur={() => setTimeout(() => setShowGotraDropdown(false), 200)}
                                                className={inputCls} 
                                                placeholder="Type to search Gotra..." 
                                            />
                                            {showGotraDropdown && form.gotra_en && (
                                                <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                                                    {filteredGotras.length > 0 ? (
                                                        filteredGotras.map(g => (
                                                            <li 
                                                                key={g.id} 
                                                                onMouseDown={() => {
                                                                    set('gotra_en', g.name_en);
                                                                    setShowGotraDropdown(false);
                                                                }}
                                                                className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer font-black text-sm text-gray-800 flex justify-between items-center transition border-b border-gray-50 last:border-0"
                                                            >
                                                                <span>{g.name_en}</span>
                                                                {g.name_hi && <span className="text-gray-400 font-bold text-xs">{g.name_hi}</span>}
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <li className="px-4 py-3 text-sm font-bold text-gray-400 text-center">
                                                            No matches found
                                                        </li>
                                                    )}
                                                </ul>
                                            )}
                                        </div>

                                        <div className="sm:col-span-2 lg:col-span-3">
                                            <label className={labelCls}>Current Address</label>
                                            <textarea rows={3} value={form.address_1} onChange={e => set('address_1', e.target.value)}
                                                className={`${inputCls} resize-none`} placeholder="House no., Street, City, State..." />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                                    <h3 className="font-black text-gray-800 border-b pb-3">🔐 Security</h3>
                                    <div className="max-w-md">
                                        <label className={labelCls}>Change Password <span className="text-gray-400 font-normal normal-case">(leave blank to keep current)</span></label>
                                        <input type="password" value={form.new_password} onChange={e => set('new_password', e.target.value)}
                                            className={inputCls} placeholder="New password..." />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ────── CAREER / PROFESSION ────── */}
                        {activeTab === 'CAREER' && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 w-full">
                                <h3 className="font-black text-gray-800 border-b pb-3 flex items-center gap-2">
                                    <Briefcase size={16} className="text-purple-600" /> Profession Details
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <div>
                                        <label className={labelCls}>Employment Type</label>
                                        <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)} className={inputCls}>
                                            <option value="GOVT">Government Job</option>
                                            <option value="PRIVATE">Private / Corporate Job</option>
                                            <option value="BUSINESS">Business / Entrepreneur</option>
                                            <option value="SELF">Self Employed / Professional</option>
                                            <option value="OTHER">Other / Retired / Student</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Designation / Role</label>
                                        <input type="text" value={form.occupation_en} onChange={e => set('occupation_en', e.target.value)} className={inputCls} placeholder="e.g. Manager, Doctor, Owner" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>{form.employment_type === 'BUSINESS' ? 'Business Name' : 'Company / Organisation'}</label>
                                        <input type="text" value={form.business_name} onChange={e => set('business_name', e.target.value)} className={inputCls} placeholder="e.g. TCS, Sharma Traders" />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-3">
                                        <label className={labelCls}>Highest Education</label>
                                        <input type="text" value={form.education} onChange={e => set('education', e.target.value)} className={inputCls} placeholder="e.g. B.Tech, M.Com, 12th" />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-3">
                                        <label className={labelCls}>Work / Office Address</label>
                                        <textarea rows={2} value={form.work_address} onChange={e => set('work_address', e.target.value)} className={`${inputCls} resize-none`} placeholder="Office or shop address..." />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ────── ADDITIONAL DETAILS (Dynamically Rendered Form) ────── */}
                        {activeTab === 'EXTRA' && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 w-full">
                                <div>
                                    <h3 className="font-black text-gray-800 flex items-center justify-between border-b pb-3 mb-4">
                                        <div className="flex items-center gap-2">
                                            <ListPlus size={18} className="text-purple-600" /> Additional Details
                                        </div>
                                        <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-bold">
                                            {Object.keys(form.extra_details).length} Saved
                                        </span>
                                    </h3>
                                    
                                    {/* Quick Suggestions for fast data entry */}
                                    <div className="mb-6">
                                        <p className="text-xs font-bold text-gray-500 mb-2">Quick Add Fields:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {['City', 'District', 'Pin Code', 'State', 'Country', 'Facebook', 'Hobbies'].map(field => (
                                                <button 
                                                    key={field} type="button" 
                                                    onClick={() => addCustomField(field)}
                                                    disabled={form.extra_details[field] !== undefined}
                                                    className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-purple-100 hover:text-purple-800 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-1.5 rounded-full transition border border-gray-200"
                                                >
                                                    + {field}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Active Dynamic Input Fields */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {Object.keys(form.extra_details).length === 0 ? (
                                        <div className="col-span-full text-center py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-bold">
                                            No additional details added yet. Use the quick add buttons above!
                                        </div>
                                    ) : (
                                        Object.entries(form.extra_details).map(([key, val]) => (
                                            <div key={key} className="relative group">
                                                <label className={labelCls}>{key}</label>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        value={val} 
                                                        onChange={e => updateCustomValue(key, e.target.value)} 
                                                        className={`${inputCls} pr-10 border-purple-200 focus:ring-purple-300 bg-purple-50/30`} 
                                                        placeholder={`Enter ${key}...`} 
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeCustomField(key)} 
                                                        className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Add a completely custom field name */}
                                <div className="border-t border-gray-100 pt-6 mt-4">
                                    <p className="text-xs font-black text-gray-600 uppercase tracking-wide mb-3">Or create a custom field name</p>
                                    <div className="flex gap-3 max-w-sm">
                                        <input 
                                            type="text" 
                                            value={newCustomField} 
                                            onChange={e => setNewCustomField(e.target.value)} 
                                            placeholder="e.g. Website URL" 
                                            className={inputCls} 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => addCustomField(newCustomField)} 
                                            disabled={!newCustomField.trim()} 
                                            className="px-5 bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-black rounded-xl text-sm transition shrink-0"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="md:hidden pb-6">
                            <button type="submit" disabled={isSaving} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-black py-3 rounded-xl shadow transition disabled:opacity-60">
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {isSaving ? 'Saving...' : 'Save Profile'}
                            </button>
                            {saveMsg && <p className="text-center text-sm font-bold mt-3">{saveMsg}</p>}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}