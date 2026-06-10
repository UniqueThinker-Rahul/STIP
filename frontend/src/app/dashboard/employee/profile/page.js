'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import api from '../../../../lib/api'; // Adjust path based on how deep the folder is
import { User, Lock, Mail, Building, Briefcase } from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Password Update State
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userCookie = Cookies.get('stip_user');
        if (userCookie) {
          const parsedUser = JSON.parse(userCookie);
          
          // 🚨 FIX: Prefer fetching specific user data directly if possible, or fall back to finding in the users array
          try {
            // First try to hit the specific auth/me or users/me endpoint if it exists
            const meRes = await api.get('/auth/me');
            if (meRes.data?.data) {
                setUser(meRes.data.data);
                return; // Exit early if successful
            }
          } catch (e) {
            // Ignore failure here and fallback to scanning the /users array
          }

          // Fallback: Fetch fresh data from backend users list
          const res = await api.get('/users').catch(() => ({ data: { data: [] } }));
          const allUsers = res.data?.data || [];
          const currentUser = allUsers.find(u => u._id === parsedUser.id || u.employeeId === parsedUser.employeeId) || parsedUser;
          
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Failed to load user', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (passwords.newPassword !== passwords.confirmPassword) {
      return setMessage({ type: 'error', text: 'New passwords do not match.' });
    }
    
    if (passwords.newPassword.length < 6) {
      return setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
    }

    setIsSubmitting(true);
    try {
      // Calls the backend to update the password securely
      await api.patch('/auth/update-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update password. Check your current password.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-[#6b7280] font-[600]">Loading Profile...</div>;
  if (!user) return null;

  const fName = user.personalDetails?.firstName || user.firstName || '';
  const lName = user.personalDetails?.lastName || user.lastName || '';
  const fullName = `${fName} ${lName}`.trim() || user.email?.split('@')[0] || 'Unknown User';
  const init = fName ? fName[0] : (fullName[0] || 'U');

  // 🚨 FIX: Safely extract job title and company code checking both flat and nested structures
  const displayJobTitle = user.employmentDetails?.jobTitle || user.jobTitle || 'Not Assigned';
  const displayCompanyCode = user.companyCode || user.employmentDetails?.companyCode || 'FSM';

  return (
    <div className="max-w-[1000px] mx-auto pb-[60px] font-sans">
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
          <User size={22} className="text-[#C9A84C]" /> My Profile & Security
        </div>
        <div className="text-[13px] text-[#6b7280]">Manage your account details and update your password</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
        
        {/* Profile Details Card */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden h-fit">
          <div className="bg-[#0D2B55] p-[24px] text-center">
            <div className="w-[80px] h-[80px] mx-auto rounded-full bg-gradient-to-br from-[#C9A84C] to-[#9a7a2e] flex items-center justify-center text-[#0D2B55] font-[800] text-[32px] shadow-md border-[4px] border-[#0D2B55]">
              {init}
            </div>
            <h2 className="text-white text-[18px] font-[800] mt-[12px]">{fullName}</h2>
            <div className="text-[#C9A84C] text-[12px] font-[700] uppercase tracking-widest">{user.security?.role?.replace('_', ' ') || 'EMPLOYEE'}</div>
          </div>
          <div className="p-[24px] flex flex-col gap-[16px]">
            <div className="flex items-center gap-[12px] p-[12px] bg-[#FAF8F4] rounded-[8px] border border-[#E2DDD4]">
              <Briefcase className="text-[#6b7280] w-[18px] h-[18px]" />
              <div>
                <div className="text-[10px] font-[700] text-[#6b7280] uppercase tracking-widest">Job Title</div>
                <div className="text-[13px] font-[700] text-[#0f1923]">{displayJobTitle}</div>
              </div>
            </div>
            <div className="flex items-center gap-[12px] p-[12px] bg-[#FAF8F4] rounded-[8px] border border-[#E2DDD4]">
              <Building className="text-[#6b7280] w-[18px] h-[18px]" />
              <div>
                <div className="text-[10px] font-[700] text-[#6b7280] uppercase tracking-widest">Company Code</div>
                <div className="text-[13px] font-[700] text-[#0f1923]">{displayCompanyCode}</div>
              </div>
            </div>
            <div className="flex items-center gap-[12px] p-[12px] bg-[#FAF8F4] rounded-[8px] border border-[#E2DDD4]">
              <User className="text-[#6b7280] w-[18px] h-[18px]" />
              <div>
                <div className="text-[10px] font-[700] text-[#6b7280] uppercase tracking-widest">Employee ID</div>
                <div className="text-[13px] font-[700] text-[#0f1923] font-mono">{user.employeeId}</div>
              </div>
            </div>
            <div className="flex items-center gap-[12px] p-[12px] bg-[#FAF8F4] rounded-[8px] border border-[#E2DDD4]">
              <Mail className="text-[#6b7280] w-[18px] h-[18px]" />
              <div>
                <div className="text-[10px] font-[700] text-[#6b7280] uppercase tracking-widest">Username / Email</div>
                <div className="text-[13px] font-[700] text-[#0f1923]">{user.username || user.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Update Password Form Card */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden h-fit">
          <div className="p-[20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
            <div className="w-[32px] h-[32px] rounded-[8px] bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center"><Lock size={16} /></div>
            <div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">Update Password</div>
              <div className="text-[11px] text-[#6b7280]">Ensure your account stays secure</div>
            </div>
          </div>
          
          <form onSubmit={handlePasswordUpdate} className="p-[24px]">
            {message.text && (
              <div className={`p-[12px] rounded-[8px] text-[12px] font-[600] mb-[20px] flex items-center gap-[8px] ${message.type === 'error' ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]' : 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]'}`}>
                {message.type === 'error' ? '⚠️' : '✅'} {message.text}
              </div>
            )}

            <div className="flex flex-col gap-[16px]">
              <div>
                <label className="block text-[12px] font-[700] text-[#0D2B55] mb-[6px]">Current Password</label>
                <input 
                  type="password" 
                  name="currentPassword"
                  required
                  value={passwords.currentPassword}
                  onChange={handleChange}
                  className="w-full p-[10px_14px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
                />
              </div>
              
              <div className="h-[1px] bg-[#E2DDD4] my-[4px]"></div>

              <div>
                <label className="block text-[12px] font-[700] text-[#0D2B55] mb-[6px]">New Password</label>
                <input 
                  type="password" 
                  name="newPassword"
                  required
                  value={passwords.newPassword}
                  onChange={handleChange}
                  className="w-full p-[10px_14px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[12px] font-[700] text-[#0D2B55] mb-[6px]">Confirm New Password</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  required
                  value={passwords.confirmPassword}
                  onChange={handleChange}
                  className="w-full p-[10px_14px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="mt-[8px] w-full py-[12px] bg-[#0D2B55] text-white rounded-[8px] text-[13px] font-[800] hover:bg-[#1a3d6e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {isSubmitting ? 'Updating...' : 'Save New Password'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}