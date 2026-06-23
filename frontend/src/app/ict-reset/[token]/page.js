'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ShieldCheck, Lock, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import api from '../../../lib/api';

export default function ICTResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token;

  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [status, setStatus] = useState({ loading: false, success: false, error: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: '' });

    if (passwords.newPassword.length < 8) {
      return setStatus({ loading: false, success: false, error: 'Password must be at least 8 characters long.' });
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      return setStatus({ loading: false, success: false, error: 'Passwords do not match.' });
    }

    try {
      // Connects to the new dedicated execute route
      await api.patch(`/ict-recovery/execute-reset/${token}`, {
        newPassword: passwords.newPassword
      });
      
      setStatus({ loading: false, success: true, error: '' });
    } catch (error) {
      setStatus({ 
        loading: false, 
        success: false, 
        error: error.response?.data?.message || 'Invalid or expired token. Please request a new link.' 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] p-4 font-sans">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-[#E2DDD4] overflow-hidden">
        
        <div className="bg-[#0D2B55] p-6 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-[#C9A84C]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Set New Password</h1>
          <p className="text-sm text-white/70">ICT Admin Security Protocol</p>
        </div>

        <div className="p-8">
          {status.success ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-16 h-16 text-[#059669] mx-auto mb-4" />
              <h2 className="text-xl font-bold text-[#0D2B55] mb-2">Password Updated!</h2>
              <p className="text-sm text-gray-500 mb-8">Your ICT Admin password has been securely reset. You can now log into the portal.</p>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-[#0D2B55] hover:bg-[#1a3d6e] text-white font-bold py-3 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                Go to Login <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {status.error && (
                <div className="p-4 rounded-lg text-sm font-semibold mb-6 flex items-start gap-3 bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
                  <span className="text-lg leading-none">⚠️</span>
                  <p>{status.error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-[#0D2B55] mb-2">New Secure Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      required
                      autoFocus
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0D2B55] focus:ring-2 focus:ring-[#0D2B55]/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#0D2B55] mb-2">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      placeholder="Re-type new password"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0D2B55] focus:ring-2 focus:ring-[#0D2B55]/10 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status.loading || !passwords.newPassword || !passwords.confirmPassword}
                  className="w-full bg-[#0D2B55] hover:bg-[#1a3d6e] text-white font-bold py-3 mt-4 rounded-xl shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {status.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {status.loading ? 'Updating Password...' : 'Save New Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}