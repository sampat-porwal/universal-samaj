"use client";

import { useState, useEffect } from 'react';
import { User, Lock, Shield, Mail, BadgeInfo } from 'lucide-react';
import api from '@/lib/api';

export default function ProfilePage() {
  // --- Profile States ---
  const [userName, setUserName] = useState('Loading...');
  const [userEmail, setUserEmail] = useState('Loading...');
  const [userRole, setUserRole] = useState('STAFF');

  // --- Password States ---
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Profile data fetch karke dikhane ke liye
  useEffect(() => {
    const profileStr = localStorage.getItem('user_profile');
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      setUserName(profile.username || 'Admin User');
      setUserEmail(profile.email || 'user@royallogic.com'); 
      setUserRole(profile.role || 'STAFF');
    }
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const safeOldPassword = oldPassword.trim();
    const safeNewPassword = newPassword.trim();
    const safeConfirmPassword = confirmPassword.trim();

    // 🌟 FRONTEND VALIDATION 1: Empty check
    if (!safeNewPassword) {
      setError("Naya password khali ya sirf spaces ka nahi ho sakta!");
      setLoading(false);
      return;
    }

    // 🌟 FRONTEND VALIDATION 2: 8-Character Minimum Check
    if (safeNewPassword.length < 8) {
      setError("Naya password kam se kam 8 characters lamba hona chahiye!");
      setLoading(false);
      return;
    }

    // 🌟 FRONTEND VALIDATION 3: Match check
    if (safeNewPassword !== safeConfirmPassword) {
      setError("Naya password aur Confirm password match nahi ho rahe hain!");
      setLoading(false);
      return;
    }

    try {
      // 🌟 BUG FIX: Removed the extra /api/ from the URL!
      // Make sure this matches your exact Django URL (e.g., /auth/change-password/ or /users/change-password/)
      const res = await api.post('/auth/change-password/', {
        old_password: safeOldPassword, 
        new_password: safeNewPassword 
      });

      setMessage("✅ Password successfully updated.");
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword(''); 
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Password change failed.";
      setError("❌ " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto font-sans">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
        <p className="text-gray-500 mt-1">Apni personal details aur security settings manage karein.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Basic Profile Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-gray-100">
              <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{userName}</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider uppercase bg-blue-100 text-blue-800 mt-1">
                  {userRole}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center text-gray-600">
                <User className="w-5 h-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Username</p>
                  <p className="font-bold text-gray-800">{userName}</p>
                </div>
              </div>
              <div className="flex items-center text-gray-600">
                <Mail className="w-5 h-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Email Address</p>
                  <p className="font-bold text-gray-800">{userEmail}</p>
                </div>
              </div>
              <div className="flex items-center text-gray-600">
                <Shield className="w-5 h-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Access Level</p>
                  <p className="font-bold text-gray-800">{userRole} Permissions</p>
                </div>
              </div>
            </div>
            
            <button className="w-full mt-6 bg-gray-50 text-gray-600 border border-gray-200 py-3 rounded-xl hover:bg-gray-100 transition text-sm font-bold">
              Edit Basic Profile (Coming Soon)
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Security & Password */}
        <div className="md:col-span-2">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-6">
              <Lock className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-black text-gray-800">Change Password</h2>
            </div>
            
            <p className="text-gray-500 text-sm mb-6 font-medium">
              Apna account secure rakhne ke liye ek strong password ka use karein jisme letters, numbers aur symbols hon.
            </p>

            {message && <div className="p-4 mb-6 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl font-bold">{message}</div>}
            {error && <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl font-bold">{error}</div>}

            <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Old Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-gray-900 placeholder-gray-400"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              
              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-gray-900 placeholder-gray-400"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-gray-900 placeholder-gray-400"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retype new password"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white font-black py-3 px-6 rounded-xl shadow-md hover:bg-blue-700 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-full sm:w-auto"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}