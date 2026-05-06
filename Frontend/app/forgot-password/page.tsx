"use client";
import { useState } from 'react';
import Link from 'next/link';

// 🌟 1. IMPORT UNIVERSAL API AND VALIDATORS
import api from '@/lib/api';
import { isValidEmail, isValidMobile } from '@/lib/validators';

export default function ForgotPassword() {
  const [username, setUsername] = useState(''); // Changed 'email' to 'username' to support both
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const safeUsername = username.trim();

    if (!safeUsername) {
        setError('⚠️ Please enter an email address or mobile number.');
        setLoading(false);
        return;
    }

    // 🌟 2. SMART FRONTEND VALIDATION
    if (safeUsername.includes('@')) {
        if (!isValidEmail(safeUsername)) {
            setError("❌ Please enter a valid email address.");
            setLoading(false); 
            return;
        }
    } else if (/^\d+$/.test(safeUsername)) {
        if (!isValidMobile(safeUsername)) {
            setError("❌ Please enter a valid 10-digit mobile number.");
            setLoading(false); 
            return;
        }
    } else {
        // If it's not an email and not just numbers, it's invalid for resetting
        setError("❌ Please enter a valid email address or mobile number.");
        setLoading(false); 
        return;
    }

    try {
      // 🌟 3. CLEAN API CALL (Using your universal api.ts router)
      // Note: Make sure your Django url is actually /api/auth/request-reset-email/ or similar
      const res = await api.post('/auth/request-reset-email/', { username: safeUsername });

      if (res.status === 200 || res.status === 201) {
        setMessage(res.data?.success || '✅ Reset link sent successfully.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '❌ Failed to find an account with that information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <h2 className="text-2xl font-black text-center text-blue-900 mb-2">Universal System</h2>
        <h3 className="text-xl font-bold text-center text-gray-800 mb-2">Forgot Password</h3>
        <p className="text-sm text-gray-500 text-center mb-6 font-medium">
          Enter your registered email or mobile number to receive a reset link.
        </p>

        {message && <div className="p-4 mb-6 text-sm text-green-700 bg-green-50 rounded-xl border border-green-200 font-bold text-center">{message}</div>}
        {error && <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200 font-bold text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email or Mobile Number</label>
            <input
              type="text" 
              id="username"
              required
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-gray-900 placeholder-gray-400"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin@company.com or 9876543210"
            />
          </div>

          <button
            type="submit"
            disabled={loading || message !== ''}
            className="w-full flex justify-center py-4 px-4 rounded-xl shadow-md text-sm font-black text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition active:scale-95 mt-6"
          >
            {loading ? 'Sending Request...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <Link href="/login" className="text-sm font-black text-blue-600 hover:text-blue-800 transition">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}