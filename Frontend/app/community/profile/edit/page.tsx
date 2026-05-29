"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
    ArrowLeft, Save, Loader2, UserCheck, Briefcase, Globe,
    Trash2, PlusCircle, ChevronRight, ChevronDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

type Tab = 'BASIC' | 'CAREER' | 'EXTRA';

// ── Tab config ─────────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: 'BASIC',   label: 'Basic & Contact', icon: <UserCheck size={18} />,  desc: 'Mobile, email, DOB, blood group, address' },
    { key: 'CAREER',  label: 'Profession',      icon: <Briefcase size={18} />, desc: 'Employment, role, company, education' },
    { key: 'EXTRA',   label: 'Custom Info',     icon: <Globe size={18} />,      desc: 'Add any extra info as key-value pairs' },
];

// ── Custom Dropdown Component ──────────────────────────────────────────────────
interface MaritalStatusSelectProps {
  value: string;
  onChange: (value: string) => void;
}

function MaritalStatusSelect({ value, onChange }: MaritalStatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    { id: 'UNMARRIED', emoji: '🧑', label: 'Unmarried', subLabel: 'अविवाहित' },
    { id: 'MARRIED', emoji: '💑', label: 'Married', subLabel: 'विवाहित' },
    { id: 'WIDOW_WIDOWER', emoji: '🕊️', label: 'Widow/Widower', subLabel: 'विधवा/विधुर' },
    { id: 'DIVORCED', emoji: '⚖️', label: 'Divorced', subLabel: 'तलाकशुदा' },
    { id: 'SEPARATED', emoji: '↔️', label: 'Separated', subLabel: 'अलग' },
    { id: 'REMARRIED', emoji: '💒', label: 'Remarried', subLabel: 'पुनर्विवाह' },
  ];

  const selectedOption = options.find((opt) => opt.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full sm:w-2/3 md:w-1/2" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white shadow-sm"
      >
        {selectedOption ? (
          <div className="flex items-center gap-3">
            <span className="text-xl leading-none">{selectedOption.emoji}</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900 leading-tight">{selectedOption.label}</span>
              <span className="text-[10px] text-gray-500 font-medium leading-tight">{selectedOption.subLabel}</span>
            </div>
          </div>
        ) : (
          <span className="text-sm font-bold text-gray-400">Select marital status...</span>
        )}
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option) => (
              <div
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${
                  value === option.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-xl leading-none">{option.emoji}</span>
                <div className="flex flex-col">
                  <span className={`text-sm font-bold leading-tight ${value === option.id ? 'text-blue-700' : 'text-gray-800'}`}>
                    {option.label}
                  </span>
                  <span className="text-[10px] font-medium text-gray-500 leading-tight">{option.subLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function EditProfilePage() {
    const router = useRouter();
    const [samajProfile, setSamajProfile] = useState<any>(null);
    const [authProfile, setAuthProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('BASIC');
    const [saveMsg, setSaveMsg] = useState('');

    const [form, setForm] = useState({
        // BASIC (direct fields — fast search)
        mobile_no: '',
        email: '',
        dob: '',
        blood_group: '',
        village_en: '',
        gotra_en: '',
        address_1: '',
        new_password: '',
        // Marital & Life status (direct fields — searchable for matrimonial)
        marital_status: 'UNMARRIED',
        marriage_date: '',
        is_alive: true,
        death_date: '',
        death_reason: '',
        // CAREER (direct fields)
        employment_type: 'OTHER',
        occupation_en: '',
        business_name: '',
        work_address: '',
        education: '',
        // EXTRA (JSON field — unlimited custom data)
        extra_details: {} as Record<string, string>,
    });

    // For adding new custom key-value
    const [newKey, setNewKey] = useState('');
    const [newVal, setNewVal] = useState('');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const authRes = await api.get('/auth/profile/');
            setAuthProfile(authRes.data);
            const samajRes = await api.get('/samaj/profiles/');
            const mine = samajRes.data.find((p: any) => p.user.username === authRes.data.username);
            setSamajProfile(mine);
            
            if (mine) {
                // Normalize legacy WIDOW/WIDOWER to the new dropdown option
                let normalizedMaritalStatus = mine.marital_status || 'UNMARRIED';
                if (normalizedMaritalStatus === 'WIDOW' || normalizedMaritalStatus === 'WIDOWER') {
                    normalizedMaritalStatus = 'WIDOW_WIDOWER';
                }

                setForm({
                    mobile_no:       authRes.data.mobile_no || '',
                    email:           authRes.data.email || '',
                    dob:             mine.dob || '',
                    blood_group:     mine.blood_group || '',
                    village_en:      mine.village_en || '',
                    gotra_en:        mine.gotra_en || '',
                    address_1:       mine.address_1 || '',
                    new_password:    '',
                    marital_status:  normalizedMaritalStatus,
                    marriage_date:   mine.marriage_date || '',
                    is_alive:        mine.is_alive !== false, // default true
                    death_date:      mine.death_date || '',
                    death_reason:    mine.death_reason || '',
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

    const set = (key: string, val: string | boolean) => setForm(f => ({ ...f, [key]: val }));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!samajProfile) return;
        setIsSaving(true);
        setSaveMsg('');
        try {
            // Auth user fields (mobile, email, password)
            const authPayload: any = { mobile_no: form.mobile_no, email: form.email };
            if (form.new_password.trim()) authPayload.password = form.new_password;
            await api.patch('/auth/profile/', authPayload);

            // Samaj profile — all direct + json fields
            await api.patch(`/samaj/profiles/${samajProfile.id}/`, {
                village_en:      form.village_en,
                gotra_en:        form.gotra_en,
                dob:             form.dob || null,
                blood_group:     form.blood_group,
                address_1:       form.address_1,
                // Marital & life status
                marital_status:  form.marital_status,
                marriage_date:   form.marriage_date || null,
                is_alive:        form.is_alive,
                death_date:      form.is_alive ? null : (form.death_date || null),
                death_reason:    form.is_alive ? '' : form.death_reason,
                // Career
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

    const addExtra = () => {
        if (!newKey.trim() || !newVal.trim()) return;
        setForm(f => ({ ...f, extra_details: { ...f.extra_details, [newKey.trim()]: newVal.trim() } }));
        setNewKey(''); setNewVal('');
    };

    const removeExtra = (key: string) => {
        const d = { ...form.extra_details };
        delete d[key];
        setForm(f => ({ ...f, extra_details: d }));
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <Loader2 size={36} className="animate-spin text-blue-600" />
        </div>
    );

    const inputCls = "w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white text-sm font-bold text-gray-900 transition";
    const labelCls = "block text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5";

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* ── TOP BAR ── */}
            <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/community/profile')}
                        className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-600">
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
                    <button onClick={handleSave} disabled={isSaving}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black px-5 py-2.5 rounded-xl transition shadow-sm disabled:opacity-60 text-sm">
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            <div className="flex max-w-5xl mx-auto">
                {/* ── SIDEBAR TABS ── */}
                <div className="w-64 shrink-0 hidden md:block">
                    <div className="p-4 sticky top-20">
                        <nav className="space-y-1">
                            {TABS.map(tab => (
                                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                                    className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-sm transition text-left ${
                                        activeTab === tab.key
                                            ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                                            : 'text-gray-500 hover:bg-white hover:shadow-sm'
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

                {/* ── MOBILE TABS ── */}
                <div className="flex md:hidden overflow-x-auto gap-2 p-4 pb-0 w-full">
                    {TABS.map(tab => (
                        <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap transition ${
                                activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
                            }`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── FORM AREA ── */}
                <div className="flex-1 p-4 md:p-8">
                    <form onSubmit={handleSave} className="max-w-2xl space-y-6">

                        {/* ────── BASIC & CONTACT ────── */}
                        {activeTab === 'BASIC' && (
                            <>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                                    <h3 className="font-black text-gray-800 border-b pb-3 flex items-center gap-2">
                                        <UserCheck size={16} className="text-blue-600" /> Contact Details
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                        <div>
                                            <label className={labelCls}>Gotra</label>
                                            <input type="text" value={form.gotra_en} onChange={e => set('gotra_en', e.target.value)} className={inputCls} placeholder="e.g. Dhundra" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Current Address</label>
                                        <textarea rows={3} value={form.address_1} onChange={e => set('address_1', e.target.value)}
                                            className={`${inputCls} resize-none`} placeholder="House no., Street, City, State..." />
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                                    <h3 className="font-black text-gray-800 border-b pb-3">🔐 Security</h3>
                                    <div>
                                        <label className={labelCls}>Change Password <span className="text-gray-400 font-normal normal-case">(leave blank to keep current)</span></label>
                                        <input type="password" value={form.new_password} onChange={e => set('new_password', e.target.value)}
                                            className={inputCls} placeholder="New password..." />
                                    </div>
                                </div>

                                {/* ── MARITAL STATUS ── */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                                    <h3 className="font-black text-gray-800 border-b pb-3 flex items-center gap-2">
                                        💍 Marital Status
                                        <span className="text-xs text-gray-400 font-normal normal-case">For matrimonial search</span>
                                    </h3>

                                    {/* The New Custom Dropdown Component */}
                                    <MaritalStatusSelect 
                                        value={form.marital_status} 
                                        onChange={(val) => set('marital_status', val)} 
                                    />

                                    {/* Marriage date — only if married/remarried */}
                                    {['MARRIED', 'REMARRIED'].includes(form.marital_status) && (
                                        <div className="pt-2">
                                            <label className={labelCls}>Marriage Date <span className="text-gray-400 font-normal normal-case">(optional, for anniversary)</span></label>
                                            <input type="date" value={form.marriage_date}
                                                onChange={e => set('marriage_date', e.target.value)}
                                                className={inputCls} />
                                        </div>
                                    )}
                                </div>

                                {/* ── ALIVE / DEAD STATUS ── */}
                                <div className={`rounded-2xl border-2 shadow-sm p-6 space-y-5 ${!form.is_alive ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-100'}`}>
                                    <h3 className={`font-black border-b pb-3 flex items-center gap-2 ${!form.is_alive ? 'text-white border-gray-600' : 'text-gray-800 border-gray-200'}`}>
                                        {form.is_alive ? '✅ Living Status' : '🕊️ स्वर्गीय / Deceased'}
                                        <span className={`text-xs font-normal normal-case ml-1 ${!form.is_alive ? 'text-gray-400' : 'text-gray-400'}`}>
                                            Managed by admin or family
                                        </span>
                                    </h3>

                                    {/* Toggle alive / deceased */}
                                    <div className="flex gap-3">
                                        <button type="button"
                                            onClick={() => setForm(f => ({ ...f, is_alive: true, death_date: '', death_reason: '' }))}
                                            className={`flex-1 py-3 rounded-xl border-2 font-black text-sm transition ${
                                                form.is_alive
                                                    ? 'bg-green-500 border-green-500 text-white'
                                                    : 'bg-white border-gray-200 text-gray-500 hover:border-green-300'
                                            }`}>
                                            ✅ Alive / जीवित
                                        </button>
                                        <button type="button"
                                            onClick={() => setForm(f => ({ ...f, is_alive: false }))}
                                            className={`flex-1 py-3 rounded-xl border-2 font-black text-sm transition ${
                                                !form.is_alive
                                                    ? 'bg-gray-600 border-gray-500 text-white'
                                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                                            }`}>
                                            🕊️ Deceased / स्वर्गीय
                                        </button>
                                    </div>

                                    {/* Death details — only if deceased */}
                                    {!form.is_alive && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                            <div>
                                                <label className="block text-xs font-black text-gray-300 uppercase tracking-wide mb-1.5">Date of Death / मृत्यु तिथि</label>
                                                <input type="date" value={form.death_date}
                                                    onChange={e => set('death_date', e.target.value)}
                                                    className="w-full border border-gray-600 bg-gray-700 text-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-gray-400 text-sm font-bold" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-gray-300 uppercase tracking-wide mb-1.5">Reason / कारण <span className="font-normal normal-case text-gray-500">(optional)</span></label>
                                                <input type="text" value={form.death_reason}
                                                    onChange={e => set('death_reason', e.target.value)}
                                                    className="w-full border border-gray-600 bg-gray-700 text-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-gray-400 text-sm font-bold"
                                                    placeholder="e.g. Natural causes, Illness..." />
                                            </div>
                                            <div className="bg-gray-700 border border-gray-600 rounded-xl p-3 text-xs text-gray-400 font-medium">
                                                ⚠️ This marks the profile as deceased. The profile remains visible with a "स्वर्गीय" badge for family history. Marital status will auto-suggest Widow/Widower for the spouse.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ────── CAREER / PROFESSION ────── */}
                        {activeTab === 'CAREER' && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                                <h3 className="font-black text-gray-800 border-b pb-3 flex items-center gap-2">
                                    <Briefcase size={16} className="text-purple-600" /> Profession Details
                                </h3>
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Designation / Role</label>
                                        <input type="text" value={form.occupation_en} onChange={e => set('occupation_en', e.target.value)}
                                            className={inputCls} placeholder="e.g. Manager, Doctor, Owner" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>{form.employment_type === 'BUSINESS' ? 'Business Name' : 'Company / Organisation'}</label>
                                        <input type="text" value={form.business_name} onChange={e => set('business_name', e.target.value)}
                                            className={inputCls} placeholder="e.g. TCS, Sharma Traders" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className={labelCls}>Highest Education</label>
                                        <input type="text" value={form.education} onChange={e => set('education', e.target.value)}
                                            className={inputCls} placeholder="e.g. B.Tech, M.Com, 12th" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Work / Office Address</label>
                                    <textarea rows={2} value={form.work_address} onChange={e => set('work_address', e.target.value)}
                                        className={`${inputCls} resize-none`} placeholder="Office or shop address..." />
                                </div>
                            </div>
                        )}

                        {/* ────── CUSTOM / EXTRA INFO (JSON) ────── */}
                        {activeTab === 'EXTRA' && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                                <div>
                                    <h3 className="font-black text-gray-800 flex items-center gap-2 mb-1">
                                        <Globe size={16} className="text-purple-600" /> Custom Information
                                    </h3>
                                    <p className="text-xs text-gray-400 font-medium">
                                        Add any extra info — Facebook link, Hobbies, Languages, Skills, Social handles, etc.
                                        These are stored as flexible key-value pairs.
                                    </p>
                                </div>

                                {/* Existing entries */}
                                <div className="space-y-2">
                                    {Object.entries(form.extra_details).length === 0 ? (
                                        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-bold">
                                            No custom info added yet. Add one below!
                                        </div>
                                    ) : Object.entries(form.extra_details).map(([key, val]) => (
                                        <div key={key} className="flex items-center gap-3 bg-purple-50 border border-purple-100 p-3 rounded-xl">
                                            <div className="w-1/3 min-w-0">
                                                <span className="text-xs font-black text-purple-700 uppercase tracking-wide truncate block">{key}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-bold text-gray-800 truncate block">{val as string}</span>
                                            </div>
                                            <button type="button" onClick={() => removeExtra(key)}
                                                className="text-red-400 hover:text-red-600 bg-white hover:bg-red-50 p-1.5 rounded-lg transition shrink-0">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add new entry */}
                                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                                    <p className="text-xs font-black text-gray-600 uppercase tracking-wide mb-3">Add New Info</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className={labelCls}>Title / Key</label>
                                            <input type="text" value={newKey} onChange={e => setNewKey(e.target.value)}
                                                placeholder="e.g. Facebook, Hobby, Skill"
                                                className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Value</label>
                                            <input type="text" value={newVal} onChange={e => setNewVal(e.target.value)}
                                                placeholder="e.g. facebook.com/me"
                                                className={inputCls} />
                                        </div>
                                    </div>
                                    <button type="button" onClick={addExtra} disabled={!newKey.trim() || !newVal.trim()}
                                        className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-black py-2.5 rounded-xl text-sm transition">
                                        <PlusCircle size={16} /> Add This Info
                                    </button>
                                </div>

                                {/* Suggestions */}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 mb-2">Quick suggestions:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['Facebook', 'Instagram', 'WhatsApp', 'LinkedIn', 'Hobbies', 'Languages Known', 'Speciality', 'Awards'].map(s => (
                                            <button key={s} type="button" onClick={() => setNewKey(s)}
                                                className="text-xs font-bold text-gray-600 bg-gray-100 hover:bg-purple-50 hover:text-purple-700 px-3 py-1 rounded-full transition border border-gray-200">
                                                + {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Mobile save button */}
                        <div className="md:hidden pb-6">
                            <button type="submit" disabled={isSaving}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-black py-3 rounded-xl shadow transition disabled:opacity-60">
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