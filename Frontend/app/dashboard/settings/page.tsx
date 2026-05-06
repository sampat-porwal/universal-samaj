"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { AlertCircle } from 'lucide-react';

// 🌟 INDUSTRY SPECIFIC MENU MAPPING (Kept exactly as you designed it)
const INDUSTRY_MENUS = {
    TEXTILE: [
        "Parties (CRM)", "Yarn Inventory", "Fabric Stock", "Sales Orders", 
        "Wholesale Orders", "Production", "Weaving Jobs", "Mechanics", "Suppliers"
    ],
    MEDICAL: [
        "Parties (CRM)", "Medicines (Stock)", "Prescriptions", 
        "Sales Orders", "Suppliers"
    ],
    KIRANA: [
        "Parties (CRM)", "Groceries Stock", "Sales Orders", "Suppliers"
    ],
    ELECTRONICS: [
        "Parties (CRM)", "Electronics Stock", "Spare Parts", "Sales Orders", 
        "Warranty Claims", "Repair Jobs", "Mechanics", "Suppliers"
    ],
    GENERAL: [
        "Parties (CRM)", "Inventory", "Products", "Orders", 
        "Production", "Suppliers"
    ]
};

export default function SettingsPage() {
    const [schema, setSchema] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('FIELDS'); 
    
    const [industryType, setIndustryType] = useState('GENERAL');
    const [userPerms, setUserPerms] = useState<string[]>([]);

    useEffect(() => {
        fetchSchema();
    }, []);

    const fetchSchema = async () => {
        try {
            // 🌟 FIXED ROUTE: Removed the extra /api/
            const res = await api.get('/settings/schema/');
            setSchema(res.data.product_schema || []);
            setMenuItems(res.data.menu_items || []);

            const profileStr = localStorage.getItem('user_profile');
            if (profileStr) {
                const profile = JSON.parse(profileStr);
                
                const userIndustry = profile?.industry_code || 'GENERAL';
                if (INDUSTRY_MENUS[userIndustry as keyof typeof INDUSTRY_MENUS]) {
                    setIndustryType(userIndustry);
                } else {
                    setIndustryType('GENERAL');
                }

                setUserPerms(profile?.permissions || []);
            }

        } catch (error) {
            console.error("Error fetching schema", error);
        } finally {
            setLoading(false);
        }
    };

    // 🌟 PERMISSION LOGIC (Updated to match our Step 3 Template Permissions)
    const hasAllAccess = userPerms.includes('ALL_ACCESS');
    const canEditSettings = hasAllAccess || userPerms.includes('manage_settings');

    // --- FIELDS LOGIC ---
    const handleAddField = () => setSchema([...schema, { name: '', label: '', type: 'text' }]);
    const handleRemoveField = (index: number) => setSchema(schema.filter((_, i) => i !== index));
    
    const handleFieldChange = (index: number, key: string, value: string) => {
        const newSchema = [...schema];
        
        if (key === 'label') {
            const cleanLabel = value.replace(/^\s+/, ''); 
            newSchema[index]['label'] = cleanLabel;
            
            newSchema[index]['name'] = cleanLabel
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '') 
                .trim()
                .replace(/\s+/g, '_'); 
        } else {
            newSchema[index][key] = value;
        }
        
        setSchema(newSchema);
    };

    // --- MENU LOGIC ---
    const handleMenuToggle = (menuName: string) => {
        if (!canEditSettings) return; 
        
        let updatedMenus;
        if (menuItems.includes(menuName)) {
            updatedMenus = menuItems.filter(item => item !== menuName);
        } else {
            updatedMenus = [...menuItems, menuName];
        }
        setMenuItems(updatedMenus);
    };

   // --- SAVE LOGIC ---
    const handleSaveSchema = async () => {
        if (!canEditSettings) {
            alert("You do not have permission to modify system settings.");
            return;
        }

        // 🌟 STRUCTURAL VALIDATION 1: Prevent Empty Fields
        const hasEmptyFields = schema.some(field => !field.label || field.label.trim() === '');
        if (hasEmptyFields) {
            alert("❌ Please fill in all field names, or click 'Remove' on the empty ones before saving.");
            return;
        }

        // 🌟 STRUCTURAL VALIDATION 2: Prevent Duplicate Fields
        const names = schema.map(f => f.name);
        const hasDuplicates = new Set(names).size !== names.length;
        if (hasDuplicates) {
            alert("❌ You have duplicate field names! Each field must have a unique name.");
            return;
        }

        const cleanSchema = schema; // We know it's clean now because of the checks above!

        try {
            // FIXED ROUTE: Removed the extra /api/
            await api.put('/settings/schema/', { 
                product_schema: cleanSchema, 
                menu_items: menuItems 
            });
            
            const profileStr = localStorage.getItem('user_profile');
            if (profileStr) {
                const profile = JSON.parse(profileStr);
                if (!profile.schema) profile.schema = {};
                profile.schema.product_schema = cleanSchema;
                profile.schema.menu_items = menuItems;
                localStorage.setItem('user_profile', JSON.stringify(profile));
            }

            alert("✅ Settings Saved Successfully! Sidebar will reflect changes upon reload.");
            window.location.reload(); 
        } catch (error) {
            console.error("Error saving schema", error);
            alert("❌ Failed to save settings.");
        }
    };

    const menusToShow = INDUSTRY_MENUS[industryType as keyof typeof INDUSTRY_MENUS] || INDUSTRY_MENUS.GENERAL;

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="p-8 bg-gray-50 min-h-screen font-sans">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                
                {/* 🌟 View-Only Warning Banner */}
                {!canEditSettings && (
                    <div className="bg-yellow-50 border-b border-yellow-200 p-4 flex items-center gap-3 text-yellow-800 font-medium">
                        <AlertCircle size={20} className="text-yellow-600" />
                        You are in "View-Only" mode. Only administrators can modify system schemas and menus.
                    </div>
                )}

                {/* TABS HEADER */}
                <div className="flex border-b bg-gray-50">
                    <button 
                        onClick={() => setActiveTab('FIELDS')}
                        className={`flex-1 py-4 font-bold text-center transition ${activeTab === 'FIELDS' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        📋 Product Fields Manager
                    </button>
                    <button 
                        onClick={() => setActiveTab('MENUS')}
                        className={`flex-1 py-4 font-bold text-center transition ${activeTab === 'MENUS' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        🗂️ Sidebar Menu Manager
                    </button>
                </div>

                <div className="p-8">
                    {/* TAB 1: FIELDS MANAGER */}
                    {activeTab === 'FIELDS' && (
                        <div className="animate-in fade-in">
                            <h2 className="text-xl font-bold text-gray-800 mb-6">Manage Data Fields</h2>
                            <div className="space-y-4 mb-8">
                                {schema.map((field, index) => (
                                    <div key={index} className="flex flex-wrap md:flex-nowrap items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="w-full md:w-1/2">
                                            <input 
                                                disabled={!canEditSettings} 
                                                type="text" 
                                                value={field.label || ''} 
                                                onChange={(e) => handleFieldChange(index, 'label', e.target.value)} 
                                                placeholder="Field Name (e.g. Color, Size)" 
                                                className="w-full border border-gray-300 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 font-bold" 
                                            />
                                        </div>
                                        <div className="w-full md:w-1/3">
                                            <select 
                                                disabled={!canEditSettings} 
                                                value={field.type || 'text'} 
                                                onChange={(e) => handleFieldChange(index, 'type', e.target.value)} 
                                                className="w-full border border-gray-300 rounded p-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 font-medium"
                                            >
                                                <option value="text">Text (Words/Letters)</option>
                                                <option value="number">Number (Digits only)</option>
                                            </select>
                                        </div>
                                        <div className="w-full md:w-auto">
                                            {canEditSettings && (
                                                <button onClick={() => handleRemoveField(index)} className="text-red-500 font-bold p-2 hover:bg-red-50 rounded transition">Remove</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {canEditSettings && (
                                <button onClick={handleAddField} className="bg-gray-100 font-semibold py-2 px-4 rounded border hover:bg-gray-200 transition text-gray-700">+ Add Field</button>
                            )}
                        </div>
                    )}

                    {/* TAB 2: MENU MANAGER */}
                    {activeTab === 'MENUS' && (
                        <div className="animate-in fade-in">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800 mb-1">Select Active Menus</h2>
                                    <p className="text-gray-500 text-sm">Turn menus on or off based on your business needs.</p>
                                </div>
                                <span className="bg-blue-100 text-blue-800 text-xs font-black uppercase px-3 py-1 rounded-full border border-blue-200">
                                    Industry: {industryType}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                                {menusToShow.map(menu => (
                                    <label key={menu} className={`flex items-center p-4 border rounded-xl transition-all ${menuItems.includes(menu) ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'} ${canEditSettings ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}>
                                        <input 
                                            disabled={!canEditSettings}
                                            type="checkbox" 
                                            className={`h-5 w-5 text-blue-600 rounded focus:ring-blue-500 ${canEditSettings ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                            checked={menuItems.includes(menu)}
                                            onChange={() => handleMenuToggle(menu)}
                                        />
                                        <span className={`ml-3 font-bold text-sm ${menuItems.includes(menu) ? 'text-blue-900' : 'text-gray-700'}`}>{menu}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {canEditSettings && (
                    <div className="bg-gray-50 p-6 border-t flex justify-end">
                        <button onClick={handleSaveSchema} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition active:scale-95 flex items-center gap-2">
                            💾 Save All Settings
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}