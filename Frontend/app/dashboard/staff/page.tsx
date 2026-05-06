"use client";
import React, { useState, useEffect } from 'react';
import { Users, Plus, X, CheckCircle, Shield, Check, Lock, Trash2, Edit, AlertCircle } from "lucide-react";
import api from '@/lib/api';

// 🌟 UNIVERSAL PERMISSIONS LIST FOR TEMPLATE
const AVAILABLE_PERMISSIONS = [
    { id: 'view_dashboard', label: 'View Dashboard & Stats', module: 'General' },
    { id: 'manage_users', label: 'Add / Edit / Delete Users', module: 'User Management' },
    { id: 'manage_roles', label: 'Manage Custom Roles', module: 'Security' },
    { id: 'view_reports', label: 'View System Reports', module: 'Analytics' },
    { id: 'manage_settings', label: 'Edit System Settings', module: 'Settings' },
    { id: 'view_logs', label: 'View System Audit Logs', module: 'Security' },
];

export default function StaffAndRolesPage() {
    const [activeTab, setActiveTab] = useState<'STAFF' | 'ROLES'>('STAFF');
    const [userPerms, setUserPerms] = useState<string[]>([]);

    // 👥 STAFF STATES
    const [staffList, setStaffList] = useState<any[]>([]);
    const [showStaffForm, setShowStaffForm] = useState(false);
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [baseRole, setBaseRole] = useState('USER');
    const [selectedCustomRoleId, setSelectedCustomRoleId] = useState('');

    const [showEditModal, setShowEditModal] = useState(false);
    const [editStaffId, setEditStaffId] = useState<number | null>(null);
    const [editUsername, setEditUsername] = useState('');
    const [editBaseRole, setEditBaseRole] = useState('USER');
    const [editCustomRoleId, setEditCustomRoleId] = useState('');

    // 🛡️ ROLES STATES
    const [rolesList, setRolesList] = useState<any[]>([]);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editRoleId, setEditRoleId] = useState<number | null>(null); 
    const [roleName, setRoleName] = useState('');
    const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
    const [isRoleLoading, setIsRoleLoading] = useState(false);

    useEffect(() => {
        fetchStaff();
        fetchRoles();

        const profileStr = localStorage.getItem('user_profile');
        if (profileStr) {
            const profile = JSON.parse(profileStr);
            setUserPerms(profile?.permissions || []);
        }
    }, []);

    // 🌟 PERMISSION LOGIC
    const hasAllAccess = userPerms.includes('ALL_ACCESS');
    const canManageStaff = hasAllAccess || userPerms.includes('manage_users');
    const canManageRoles = hasAllAccess || userPerms.includes('manage_roles');

    const fetchStaff = async () => {
        try {
            // 🌟 FIXED ROUTE: No double /api
            const res = await api.get('/staff/');
            setStaffList(res.data || []);
        } catch (error) { console.error("Error fetching staff:", error); }
    };

    const fetchRoles = async () => {
        try {
            // 🌟 FIXED ROUTE: No double /api
            const res = await api.get('/roles/');
            setRolesList(res.data || []);
        } catch (error) { console.error("Failed to fetch roles", error); }
    };

    // ==========================================
    // 👥 STAFF ACTIONS
    // ==========================================
    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageStaff) return alert("You do not have permission to add staff.");
        
        const safeUsername = username.trim().replace(/\s+/g, ''); 
        const safeEmail = email.trim();

        if (!safeUsername) return alert("⚠️ Username cannot be empty.");
        if (password.length < 6) return alert("⚠️ Password must be at least 6 characters long.");
        if (password !== confirmPassword) return alert("❌ Error: Passwords do not match!");
        
        try {
            // 🌟 FIXED ROUTE: No double /api
            await api.post('/staff/', { 
                username: safeUsername, 
                first_name: firstName,
                email: safeEmail, 
                password, 
                role: baseRole, 
                custom_role_id: selectedCustomRoleId || null 
            });
            alert(`✅ Staff Created Successfully!`);
            setShowStaffForm(false);
            setUsername(''); setFirstName(''); setEmail(''); setPassword(''); setConfirmPassword(''); setBaseRole('USER'); setSelectedCustomRoleId('');
            fetchStaff();
        } catch (error: any) { alert("❌ Error: Username or Email might already exist."); }
    };

    const handleDeleteStaff = async (staffId: number) => {
        if (!canManageStaff) return alert("You do not have permission to delete staff.");
        if (!confirm("⚠️ Are you sure you want to remove this staff member permanently?")) return;
        
        try {
            // 🌟 FIXED ROUTE
            await api.delete(`/staff/${staffId}/`);
            alert("✅ Staff deleted successfully!");
            fetchStaff();
        } catch (error) { alert("❌ Failed to delete staff"); }
    };

    const openEditModal = (staff: any) => {
        setEditStaffId(staff.id); setEditUsername(staff.username); setEditBaseRole(staff.role); setEditCustomRoleId(staff.custom_role_id || ''); setShowEditModal(true);
    };

    const handleUpdateStaff = async () => {
        if (!canManageStaff) return alert("You do not have permission to edit staff.");
        try {
            // 🌟 FIXED ROUTE
            await api.put(`/staff/${editStaffId}/`, { role: editBaseRole, custom_role_id: editCustomRoleId || null });
            alert("✅ Staff Role Updated!");
            setShowEditModal(false); fetchStaff();
        } catch (error) { alert("❌ Failed to update staff"); }
    };

    // ==========================================
    // 🛡️ ROLE ACTIONS
    // ==========================================
    const togglePermission = (permId: string) => {
        if (selectedPerms.includes(permId)) setSelectedPerms(selectedPerms.filter(p => p !== permId));
        else setSelectedPerms([...selectedPerms, permId]);
    };

    const closeRoleModal = () => {
        setShowRoleModal(false);
        setEditRoleId(null);
        setRoleName('');
        setSelectedPerms([]);
    };

    const openEditRoleModal = (role: any) => {
        setEditRoleId(role.id);
        setRoleName(role.name);
        setSelectedPerms(role.permissions || []);
        setShowRoleModal(true);
    };

    const handleSaveRole = async () => {
        if (!canManageRoles) return alert("You do not have permission to modify roles.");
        
        const safeRoleName = roleName.trim(); 
        if (!safeRoleName) return alert("⚠️ Please enter a valid Role Name");
        if (selectedPerms.length === 0) return alert("⚠️ Please select at least one permission");

        setIsRoleLoading(true);
        try {
            const payload = { name: safeRoleName, permissions: selectedPerms };
            
            if (editRoleId) {
                // 🌟 FIXED ROUTE
                await api.put(`/roles/${editRoleId}/`, payload);
                alert("✅ Role updated successfully!");
            } else {
                // 🌟 FIXED ROUTE
                await api.post('/roles/', payload);
                alert("✅ Role created successfully!");
            }
            
            closeRoleModal();
            fetchRoles(); 
        } catch (error) {
            alert("❌ Failed to save role.");
        } finally {
            setIsRoleLoading(false);
        }
    };

    const handleDeleteRole = async (roleId: number) => {
        if (!canManageRoles) return alert("You do not have permission to delete roles.");
        if (!confirm("⚠️ Are you sure you want to delete this Role?")) return;
        
        try {
            // 🌟 FIXED ROUTE
            await api.delete(`/roles/${roleId}/`);
            alert("✅ Role deleted!");
            fetchRoles();
        } catch (error) { alert("❌ Failed to delete role"); }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen max-w-7xl mx-auto font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                        {activeTab === 'STAFF' ? <Users className="text-blue-600" size={28} /> : <Shield className="text-purple-600" size={28} />}
                        Team & Security Management
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">Manage your employees, assign roles, and control access permissions.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('STAFF')} className={`px-6 py-2.5 rounded-lg font-bold transition ${activeTab === 'STAFF' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Staff Directory</button>
                    <button onClick={() => setActiveTab('ROLES')} className={`px-6 py-2.5 rounded-lg font-bold transition ${activeTab === 'ROLES' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Roles Builder</button>
                </div>
            </div>

            {/* Warning Banner */}
            {!canManageStaff && activeTab === 'STAFF' && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-center gap-3 text-yellow-800 font-medium">
                    <AlertCircle size={20} className="text-yellow-600" />
                    You are in "View-Only" mode. Only administrators can modify staff.
                </div>
            )}

            {/* TAB 1: STAFF */}
            {activeTab === 'STAFF' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {canManageStaff && (
                        <div className="flex justify-end mb-6">
                            <button onClick={() => setShowStaffForm(!showStaffForm)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition shadow-md flex items-center gap-2">
                                {showStaffForm ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Add New User</>}
                            </button>
                        </div>
                    )}

                    {showStaffForm && canManageStaff && (
                        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 mb-8">
                             <h2 className="text-lg font-black text-gray-800 mb-6 border-b pb-4">Create New System User</h2>
                            <form onSubmit={handleStaffSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Username (Login ID) <span className="text-red-500">*</span></label>
                                        <input type="text" value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, ''))} required placeholder="e.g. jdoe123" className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Display Name</label>
                                        <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. John Doe" className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address <span className="text-red-500">*</span></label>
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Base Level</label>
                                        <select value={baseRole} onChange={e => setBaseRole(e.target.value)} className="w-full border p-3 rounded-xl font-bold">
                                            <option value="USER">Standard User</option>
                                            <option value="MANAGER">Manager</option>
                                            <option value="ADMIN">System Admin</option>
                                        </select>
                                    </div>
                                    
                                    <div className="lg:col-span-2 bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col md:flex-row gap-4 items-center">
                                        <Shield className="text-purple-500 hidden md:block" size={32} />
                                        <div className="flex-1 w-full">
                                            <label className="block text-xs font-bold text-purple-800 uppercase mb-1">Assign Custom Dynamic Role (Optional)</label>
                                            <select value={selectedCustomRoleId} onChange={e => setSelectedCustomRoleId(e.target.value)} className="w-full border border-purple-200 p-3 rounded-xl font-bold text-purple-900 outline-none">
                                                <option value="">-- No Custom Role (Use Base Level) --</option>
                                                {rolesList.map(r => (<option key={r.id} value={r.id}>{r.name} ({r.permissions.length} Permissions)</option>))}
                                            </select>
                                        </div>
                                    </div>
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Password <span className="text-red-500">*</span></label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 6 chars" className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Confirm Password <span className="text-red-500">*</span></label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                </div>
                                <button type="submit" className="flex items-center justify-center gap-2 w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-xl shadow-md transition"><CheckCircle size={20} /> CREATE USER</button>
                            </form>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 font-bold uppercase tracking-wider">User Details</th>
                                    <th className="p-4 font-bold uppercase tracking-wider">Base Role</th>
                                    <th className="p-4 font-bold uppercase tracking-wider">Custom Role</th>
                                    {canManageStaff && <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {staffList.map((s, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition group">
                                        <td className="p-4"><p className="font-bold text-gray-800 text-base">{s.first_name || s.username}</p><p className="text-gray-500 text-xs">{s.email}</p></td>
                                        <td className="p-4"><span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-200 text-gray-700">{s.role}</span></td>
                                        <td className="p-4">
                                            {s.custom_role_name ? (<span className="flex items-center gap-1 text-purple-700 font-bold bg-purple-100 px-3 py-1 rounded-full text-xs w-max"><Shield size={12} /> {s.custom_role_name}</span>) : (<span className="text-gray-400 text-xs italic">- None -</span>)}
                                        </td>
                                        {canManageStaff && (
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openEditModal(s)} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition" title="Edit Role"><Edit size={18} /></button>
                                                    <button onClick={() => handleDeleteStaff(s.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Delete User"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: ROLES BUILDER */}
            {activeTab === 'ROLES' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {canManageRoles && (
                        <div className="flex justify-end mb-6">
                            <button onClick={() => { closeRoleModal(); setShowRoleModal(true); }} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition shadow-md">
                                <Plus size={18} /> Create Custom Role
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rolesList.length === 0 ? (
                            <div className="col-span-full text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                                <Lock className="mx-auto text-gray-300 mb-4" size={56} />
                                <p className="text-gray-600 font-bold text-xl mb-1">No custom roles created yet.</p>
                            </div>
                        ) : (
                            rolesList.map((role: any) => (
                                <div key={role.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-purple-300 transition group cursor-default">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-black text-gray-800 group-hover:text-purple-700 transition">{role.name}</h3>
                                            {canManageRoles && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                    <button onClick={() => openEditRoleModal(role)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-md"><Edit size={16} /></button>
                                                    <button onClick={() => handleDeleteRole(role.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md"><Trash2 size={16} /></button>
                                                </div>
                                            )}
                                        </div>
                                        <span className="bg-purple-100 text-purple-800 text-[10px] uppercase tracking-wider font-black px-3 py-1 rounded-full mt-1">{role.permissions?.length || 0} Perms</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {role.permissions?.slice(0, 4).map((p: string, idx: number) => (
                                            <span key={idx} className="bg-gray-100 text-gray-600 text-[10px] uppercase font-bold px-2 py-1 rounded border border-gray-200">{p.replace('_', ' ')}</span>
                                        ))}
                                        {role.permissions?.length > 4 && (<span className="bg-purple-50 text-purple-600 text-[10px] font-black px-2 py-1 rounded border border-purple-100">+{role.permissions.length - 4} more</span>)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {showRoleModal && canManageRoles && (
                        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                                <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-2"><Shield className="text-purple-600" /> {editRoleId ? 'Edit Custom Role' : 'Build Custom Role'}</h2>
                                    <button onClick={closeRoleModal} className="text-gray-400 hover:text-red-500 bg-white p-1 rounded-md shadow-sm border transition"><X size={20} /></button>
                                </div>
                                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                                    <div className="mb-8">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Role Name</label>
                                        <input type="text" placeholder="e.g. Content Manager" className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-800" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Grant Capabilities (Permissions)</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {AVAILABLE_PERMISSIONS.map(perm => {
                                                const isSelected = selectedPerms.includes(perm.id);
                                                return (
                                                    <div key={perm.id} onClick={() => togglePermission(perm.id)} className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all ${isSelected ? 'border-purple-600 bg-purple-50' : 'border-gray-100 hover:border-gray-200 bg-white shadow-sm'}`}>
                                                        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-purple-600 text-white' : 'bg-gray-200 text-transparent'}`}><Check size={16} strokeWidth={3} /></div>
                                                        <div>
                                                            <p className={`font-bold text-sm ${isSelected ? 'text-purple-900' : 'text-gray-700'}`}>{perm.label}</p>
                                                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider mt-0.5">{perm.module}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-6 border-t border-gray-100 flex justify-end gap-3">
                                    <button onClick={closeRoleModal} className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition">Cancel</button>
                                    <button onClick={handleSaveRole} disabled={isRoleLoading} className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-8 py-2.5 rounded-xl font-black transition shadow-md flex items-center gap-2">
                                        {isRoleLoading ? "Saving..." : <><CheckCircle size={18} /> {editRoleId ? 'Update Role' : 'Save Role'}</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* EDIT STAFF MODAL */}
            {showEditModal && canManageStaff && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="bg-gray-50 p-5 border-b flex justify-between items-center"><h2 className="font-black text-gray-800 flex items-center gap-2"><Edit size={18} className="text-blue-600"/> Edit Role: {editUsername}</h2><button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button></div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Base Level</label>
                                <select value={editBaseRole} onChange={e => setEditBaseRole(e.target.value)} className="w-full border p-3 rounded-xl bg-gray-50 font-bold outline-none">
                                    <option value="USER">Standard User</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">System Admin</option>
                                </select>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                <label className="block text-xs font-bold text-purple-800 uppercase mb-2">Custom Dynamic Role</label>
                                <select value={editCustomRoleId} onChange={e => setEditCustomRoleId(e.target.value)} className="w-full border border-purple-200 p-3 rounded-xl font-bold text-purple-900 outline-none">
                                    <option value="">-- No Custom Role --</option>
                                    {rolesList.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
                                </select>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-5 border-t flex justify-end gap-3"><button onClick={() => setShowEditModal(false)} className="px-5 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-200">Cancel</button><button onClick={handleUpdateStaff} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold">Save Changes</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}