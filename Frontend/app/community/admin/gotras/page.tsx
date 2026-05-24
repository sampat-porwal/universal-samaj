"use client";

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Loader2, BookOpen } from 'lucide-react';
import api from '@/lib/api';

export default function ManageGotrasPage() {
    const [gotras, setGotras] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingGotra, setEditingGotra] = useState<any>(null);
    const [formData, setFormData] = useState({ name_en: '', name_hi: '' });

    useEffect(() => {
        fetchGotras();
    }, []);

    const fetchGotras = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/samaj/gotras/');
            setGotras(res.data);
        } catch (error) {
            console.error("Failed to fetch gotras", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-search filtering logic (will be reused in profile editing)
    const filteredGotras = gotras.filter(g => 
        g.name_en?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        g.name_hi?.includes(searchQuery)
    );

    const openModal = (gotra: any = null) => {
        if (gotra) {
            setEditingGotra(gotra);
            setFormData({ name_en: gotra.name_en, name_hi: gotra.name_hi || '' });
        } else {
            setEditingGotra(null);
            setFormData({ name_en: '', name_hi: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingGotra) {
                await api.patch(`/samaj/gotras/${editingGotra.id}/`, formData);
            } else {
                await api.post('/samaj/gotras/', formData);
            }
            setIsModalOpen(false);
            fetchGotras();
        } catch (error) {
            alert('Error saving Gotra. Make sure it is unique.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this Gotra?')) return;
        try {
            await api.delete(`/samaj/gotras/${id}/`);
            fetchGotras();
        } catch (error) {
            alert('Failed to delete. It might be linked to existing users.');
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <BookOpen size={24} className="text-blue-600" /> Manage Gotras
                    </h1>
                    <p className="text-sm text-gray-500 font-medium">Add, update, or remove Gotras for the community.</p>
                </div>
                <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-5 py-2.5 rounded-xl flex items-center gap-2 transition shadow-sm w-full sm:w-auto justify-center">
                    <Plus size={18} /> Add New Gotra
                </button>
            </div>

            {/* SEARCH BAR (Simulates what the user will see in profile edit) */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Type to search existing gotras..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-300 font-bold text-sm text-gray-800"
                    />
                </div>
            </div>

            {/* LIST */}
            {isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {filteredGotras.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 font-bold text-sm">
                            No Gotras found matching "{searchQuery}". <br/>
                            <button onClick={() => openModal()} className="text-blue-600 hover:underline mt-2">Click here to add it.</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:gap-px bg-gray-100">
                            {filteredGotras.map(gotra => (
                                <div key={gotra.id} className="bg-white p-5 flex items-center justify-between hover:bg-blue-50/50 transition">
                                    <div>
                                        <p className="font-black text-gray-900 text-lg">{gotra.name_en}</p>
                                        {gotra.name_hi && <p className="text-sm font-bold text-gray-500">{gotra.name_hi}</p>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openModal(gotra)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(gotra.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ADD / EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-gray-900">{editingGotra ? 'Edit Gotra' : 'Add New Gotra'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition text-gray-600">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5">Gotra Name (English)</label>
                                <input 
                                    type="text" required
                                    value={formData.name_en} onChange={e => setFormData({...formData, name_en: e.target.value})}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-300 font-bold text-sm text-gray-800"
                                    placeholder="e.g. Anchera"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5">Gotra Name (Hindi) <span className="font-medium normal-case text-gray-400">- Optional</span></label>
                                <input 
                                    type="text" 
                                    value={formData.name_hi} onChange={e => setFormData({...formData, name_hi: e.target.value})}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-300 font-bold text-sm text-gray-800"
                                    placeholder="e.g. आंचेरा"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 font-black py-3 rounded-xl hover:bg-gray-200 transition">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving || !formData.name_en.trim()} className="flex-1 bg-blue-600 text-white font-black py-3 rounded-xl disabled:opacity-50 hover:bg-blue-700 transition shadow">
                                    {isSaving ? 'Saving...' : 'Save Gotra'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}