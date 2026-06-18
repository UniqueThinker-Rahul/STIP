'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../../../lib/api';

export default function ResetPassword({ params }) {
  const router = useRouter();
  const token = params.token;
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setStatus({ type: 'error', msg: "Passwords do not match." });
    }
    if (password.length < 8) {
      return setStatus({ type: 'error', msg: "Password must be at least 8 characters long." });
    }

    setLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      const res = await api.post(`/auth/reset-password/${token}`, { password });
      setStatus({ type: 'success', msg: res.data.message });
      setTimeout(() => router.push('/login'), 3000); // Auto-redirect after 3s
    } catch (error) {
      setStatus({ type: 'error', msg: error.response?.data?.message || 'Token is invalid or expired.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] font-sans p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E2DDD4] overflow-hidden">
        <div className="p-8 text-center bg-[#0D2B55]">
          <Lock className="w-12 h-12 text-[#e8c96a] mx-auto mb-3" />
          <h1 className="text-2xl font-black text-white">Create New Password</h1>
        </div>

        <div className="p-8">
          {status.msg && (
            <div className={`p-4 rounded-lg mb-6 text-sm font-bold flex items-start gap-2 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {status.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
              {status.msg}
            </div>
          )}

          {status.type !== 'success' && (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">New Password</label>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-[#0D2B55] outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Confirm Password</label>
                <input
                  type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-[#0D2B55] outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" disabled={loading || !password || !confirmPassword} className="w-full bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white font-bold py-3.5 rounded-lg flex justify-center items-center gap-2 transition-all">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Secure & Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}