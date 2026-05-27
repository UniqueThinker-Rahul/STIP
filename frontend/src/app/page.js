'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../lib/api'; 

export default function UnifiedLogin() {
  const router = useRouter();
  
  const [view, setView] = useState('role_select');
  const [selectedRole, setSelectedRole] = useState({ id: '', name: '' });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const selectRole = (roleId, roleName) => {
    setError('');
    setUsername('');
    setPassword('');
    if (roleId === 'EMPLOYEE') {
      setView('staff_login');
    } else {
      setSelectedRole({ id: roleId, name: roleName });
      setView('standard_login');
    }
  };

  const handleStandardLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 💡 REQUESTED PORTAL: We send the specific portal they clicked to the backend
      const response = await api.post('/auth/login', { 
        username, 
        password,
        requestedPortal: selectedRole.id 
      });
      
      const { token, user } = response.data;
      
      Cookies.set('stip_token', token, { expires: 1/48 }); 
      Cookies.set('stip_user', JSON.stringify(user), { expires: 1/48 });

      if (user.isFirstLogin) {
        router.push('/change-password');
      } else {
        // Because the backend verified and sandboxed their role, we trust the response
        if (user.role === 'HR_ADMIN') router.push('/dashboard/hr');
        else if (user.role === 'CEO') router.push('/dashboard/ceo');
        else if (user.role === 'ICT_ADMIN') router.push('/dashboard/ict');
        else router.push('/dashboard/manager');
      }
    } catch (err) {
      // Catches the 403 Forbidden Error if they try to access a portal they aren't allowed in!
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/staff-login', { username, password });
      const { token, user } = response.data;
      
      Cookies.set('stip_token', token, { expires: 1/48 });
      Cookies.set('stip_user', JSON.stringify(user), { expires: 1/48 });
      
      if (user.isFirstLogin) {
        router.push('/change-password');
      } else {
        router.push('/dashboard/employee');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#040f1e] via-[#0D2B55] to-[#1a3d6e] flex items-center justify-center p-5 font-sans">
      
      <div className="bg-white rounded-[24px] p-10 md:p-14 w-full max-w-[620px] shadow-2xl text-center relative overflow-hidden">
        
        <div className="text-3xl font-extrabold text-[#0D2B55] tracking-tight mb-2 flex items-center justify-center gap-2">
          <span>📈</span> STIP Portal
        </div>
        <div className="mb-6">
          <span className="inline-block bg-[#FEF3C7] text-[#92400E] text-[11px] font-bold px-4 py-1 rounded-full tracking-widest uppercase">
            CY2026 • Q3 Active
          </span>
        </div>
        <div className="text-sm text-slate-500 mb-10 leading-relaxed">
          FSM Petroleum Corporation — Short-Term Incentive Program<br/>
          // Unified Test Environment — All 5 Panels
        </div>

        {view === 'role_select' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-lg font-bold text-[#0D2B55] mb-2">Select Your Role to Enter</h2>
            <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
              Click your role to open the correct panel. Use the switcher bar at the top to move between panels instantly.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
              <button onClick={() => selectRole('MANAGER', 'Line Manager')} className="bg-[#F5F3EE] border-2 border-[#E2DDD4] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#0D2B55] hover:bg-[#EFF6FF] hover:-translate-y-1 hover:shadow-lg transition-all">
                <span className="text-3xl mb-2">👥</span>
                <span className="text-xs font-bold text-[#0D2B55] leading-tight">Line<br/>Manager</span>
                <span className="bg-[#DBEAFE] text-[#1E40AF] text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider mt-3">Appraisals</span>
              </button>

              <button onClick={() => selectRole('HR_ADMIN', 'HR Admin')} className="bg-[#F5F3EE] border-2 border-[#E2DDD4] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#0D2B55] hover:bg-[#EFF6FF] hover:-translate-y-1 hover:shadow-lg transition-all">
                <span className="text-3xl mb-2">👤</span>
                <span className="text-xs font-bold text-[#0D2B55] leading-tight">HR<br/>Admin</span>
                <span className="bg-[#D1FAE5] text-[#065F46] text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider mt-3">Review</span>
              </button>

              <button onClick={() => selectRole('CEO', 'CEO')} className="bg-[#F5F3EE] border-2 border-[#E2DDD4] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#0D2B55] hover:bg-[#EFF6FF] hover:-translate-y-1 hover:shadow-lg transition-all">
                <span className="text-3xl mb-2">👑</span>
                <span className="text-xs font-bold text-[#0D2B55] leading-tight">CEO</span>
                <span className="bg-[#FEF3C7] text-[#92400E] text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider mt-3">Approve</span>
              </button>

              <button onClick={() => selectRole('EMPLOYEE', 'Staff')} className="bg-[#F5F3EE] border-2 border-[#E2DDD4] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#0D2B55] hover:bg-[#EFF6FF] hover:-translate-y-1 hover:shadow-lg transition-all">
                <span className="text-3xl mb-2">📋</span>
                <span className="text-xs font-bold text-[#0D2B55] leading-tight">Staff</span>
                <span className="bg-[#EDE9FE] text-[#4C1D95] text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider mt-3">My STIP</span>
              </button>

              <button onClick={() => selectRole('ICT_ADMIN', 'ICT Admin')} className="bg-[#F5F3EE] border-2 border-[#E2DDD4] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#0D2B55] hover:bg-[#EFF6FF] hover:-translate-y-1 hover:shadow-lg transition-all col-span-2 md:col-span-1">
                <span className="text-3xl mb-2">💻</span>
                <span className="text-xs font-bold text-[#0D2B55] leading-tight">ICT<br/>Admin</span>
                <span className="bg-[#CCFBF1] text-[#134E4A] text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider mt-3">System</span>
              </button>
            </div>
            <div className="bg-[#F5F3EE] border border-[#E2DDD4] rounded-xl p-4 text-xs text-slate-600 text-left mb-6 leading-relaxed">
              <p><strong>🔒 Role-Based Security Active:</strong> The system verifies your Job Title clearance upon login. You will be blocked if you attempt to access a panel you are not authorized for.</p>
            </div>
          </div>
        )}

        {view === 'standard_login' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-sm mx-auto text-left">
            <button onClick={() => setView('role_select')} className="text-slate-400 hover:text-[#0D2B55] text-sm font-semibold mb-6 flex items-center transition-colors">
              &larr; Back to Roles
            </button>
            <h2 className="text-2xl font-bold text-[#0D2B55] mb-2">Sign In</h2>
            <p className="text-slate-500 text-sm mb-6">Accessing the <strong>{selectedRole.name}</strong> portal.</p>

            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 mb-6 font-medium leading-relaxed">{error}</div>}

            <form onSubmit={handleStandardLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username (Emp ID + Year of Joining)</label>
                <input 
                  type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D2B55]/20 focus:border-[#0D2B55] transition-all text-slate-800" 
                  placeholder="e.g. 1282008"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D2B55]/20 focus:border-[#0D2B55] transition-all text-slate-800" 
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#0D2B55] hover:bg-[#153b75] text-white font-bold py-3.5 rounded-xl transition-colors mt-2">
                {loading ? 'Authenticating...' : 'Secure Login'}
              </button>
            </form>
          </div>
        )}

        {view === 'staff_login' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-sm mx-auto text-left">
            <button onClick={() => setView('role_select')} className="text-slate-400 hover:text-[#C9A84C] text-sm font-semibold mb-6 flex items-center transition-colors">
              &larr; Back to Roles
            </button>
            <h2 className="text-2xl font-bold text-[#0D2B55] mb-2">Staff Portal Access</h2>
            <p className="text-slate-500 text-sm mb-6">Log in securely to view your personal STIP appraisal.</p>

            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 mb-6">{error}</div>}

            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username (Emp ID + Year of Joining)</label>
                <input 
                  type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 focus:border-[#C9A84C] transition-all text-slate-800" 
                  placeholder="e.g. 3642022"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 focus:border-[#C9A84C] transition-all text-slate-800" 
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#C9A84C] hover:bg-[#b59540] text-[#0D2B55] font-bold py-3.5 rounded-xl transition-colors mt-2">
                {loading ? 'Verifying...' : 'Access My Record'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
