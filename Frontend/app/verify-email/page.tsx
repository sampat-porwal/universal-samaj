"use client";

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api'; // 🌟 USING OUR UNIVERSAL API ROUTER

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  // 🌟 GUARD: Prevent double API calls in React Strict Mode
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!uid || !token) {
      setStatus('error');
      setMessage('Invalid or missing verification link.');
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const verifyEmail = async () => {
      try {
        // 🌟 CLEAN API CALL
        await api.post('/auth/verify-email/', { uid, token });

        setStatus('success');
        setMessage('✅ Email verified successfully! Redirecting to login...');
        setTimeout(() => router.push('/login'), 3000);
        
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed. Link might be expired.');
      }
    };

    verifyEmail();
  }, [uid, token, router]);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-md text-center font-sans">
      <h2 className="text-2xl font-black text-gray-800 mb-6">Email Verification</h2>
      
      {status === 'loading' && (
          <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <p className="text-blue-600 font-bold">{message}</p>
          </div>
      )}
      
      {status === 'success' && (
        <div className="text-green-700 bg-green-50 p-6 rounded-xl border border-green-200 shadow-sm">
          <p className="text-lg font-black">{message}</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="text-red-700 bg-red-50 p-6 rounded-xl border border-red-200 shadow-sm">
          <p className="text-lg font-black">❌ {message}</p>
          <Link href="/login" className="mt-6 inline-block bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-bold hover:bg-gray-50 transition shadow-sm">
            Go to Login
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}