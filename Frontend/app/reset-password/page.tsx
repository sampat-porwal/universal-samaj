"use client";

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const safePassword = password.trim();
    const safeConfirmPassword = confirmPassword.trim();

    // 🌟 FRONTEND VALIDATIONS (Already perfect!)
    if (safePassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (safePassword !== safeConfirmPassword) {
      setError("Passwords do not match. Please try again.");
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/password-reset-complete/', { 
          uid, 
          token, 
          password: safePassword 
      });

      setMessage("✅ Success! Your password has been changed. Redirecting to Login...");
      setTimeout(() => {
        router.push('/login'); 
      }, 3000);
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Link expired or invalid. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  if (!uid || !token) {
    return (
      <div className="text-center p-8 text-red-600 bg-red-50 rounded-2xl shadow-sm border border-red-100 max-w-md w-full font-sans">
        <h2 className="text-xl font-black mb-2">Invalid Link 🚫</h2>
        <p className="font-medium">This password reset link is incomplete or broken.</p>
        <Link href="/forgot-password" className="text-blue-600 hover:text-blue-800 underline mt-4 inline-block font-bold transition">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 font-sans">
      <h2 className="text-2xl font-black text-center text-gray-800 mb-6">Create New Password</h2>
      
      {message && <div className="p-4 mb-6 text-sm text-green-700 bg-green-50 rounded-xl border border-green-200 font-bold text-center">{message}</div>}
      {error && <div className="p-4 mb-6 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200 font-bold text-center">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Password *</label>
          <input
            type="password"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-gray-900 placeholder-gray-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm New Password *</label>
          <input
            type="password"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-gray-900 placeholder-gray-400"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Type password again"
          />
        </div>

        <button
          type="submit"
          disabled={loading || message !== ''}
          className="w-full flex justify-center py-4 px-4 rounded-xl shadow-md text-sm font-black text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition active:scale-95 mt-6"
        >
          {loading ? 'Updating Password...' : 'Save New Password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}