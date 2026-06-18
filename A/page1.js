'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api'; 
import { User, Lock, Mail, Building, Briefcase, BellRing, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // User's Assigned Roles
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedRoleContext, setSelectedRoleContext] = useState('');

  // Password Update State
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notification Email State
  const [notificationEmail, setNotificationEmail] = useState('');
  const [emailMessage, setEmailMessage] = useState({ type: '', text: '' });
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);

  // 🚨 UPGRADE: Securely fetch ONLY the currently authenticated user AND set default role tab
  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const currentUser = res.data?.data;
        
        if (currentUser) {
          setUser(currentUser);
          
          // Combine Primary Role and Secondary Roles into one unique array
          const roles = Array.from(new Set([
            currentUser.security?.role, 
            ...(currentUser.security?.secondaryRoles || [])
          ])).filter(Boolean);
          
          setAvailableRoles(roles);

          // 🚨 THE FIX: Determine default role context based on the URL path
          const path = window.location.pathname;
          let defaultRole = roles[0] || 'EMPLOYEE'; // Fallback

          if (path.includes('/dashboard/hr') && roles.includes('HR_ADMIN')) {
            defaultRole = 'HR_ADMIN';
          } else if (path.includes('/dashboard/manager') && roles.includes('MANAGER')) {
            defaultRole = 'MANAGER';
          } else if (path.includes('/dashboard/ceo') && roles.includes('CEO')) {
            defaultRole = 'CEO';
          } else if (path.includes('/dashboard/ict') && roles.includes('ICT_ADMIN')) {
            defaultRole = 'ICT_ADMIN';
          }

          setSelectedRoleContext(defaultRole);
        }
      } catch (error) {
        console.error('Failed to load secure user profile', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMyProfile();
  }, []);

  // When the user switches the Role tab, load the email saved specifically for that role!
  useEffect(() => {
    if (user && selectedRoleContext) {
      const savedEmailForRole = user.personalDetails?.notificationEmails?.[selectedRoleContext];
      setNotificationEmail(savedEmailForRole || '');
      setEmailMessage({ type: '', text: '' }); 
    }
  }, [selectedRoleContext, user]);

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      return setMessage({ type: 'error', text: 'New passwords do not match.' });
    }
    if (passwords.newPassword.length < 8) {
      return setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
    }
    
    setIsSubmitting(true);
    try {
      await api.patch('/auth/change-password', { 
        currentPassword: passwords.currentPassword, 
        newPassword: passwords.newPassword 
      });
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update password.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailUpdate = async (e, isRemoval = false) => {
    if (e) e.preventDefault();
    setEmailMessage({ type: '', text: '' });
    setIsEmailSubmitting(true);

    try {
      // Create the payload exactly matching what the DB expects
      const payload = { 
        notificationEmails: {
          [selectedRoleContext]: isRemoval ? null : notificationEmail
        }
      };
      
      // Use the generic hr-update route which handles nested updates safely
      const response = await api.patch(`/users/${user._id}/hr-update`, payload);
      
      if (isRemoval) {
        setNotificationEmail('');
        setEmailMessage({ type: 'success', text: `Email removed for ${selectedRoleContext.replace('_', ' ')}.` });
      } else {
        setEmailMessage({ type: 'success', text: `Preferences saved for ${selectedRoleContext.replace('_', ' ')}!` });
      }
      
      // Update local state without full reload
      if (response.data?.data) setUser(response.data.data);
      setTimeout(() => setEmailMessage({ type: '', text: '' }), 5000);
      
    } catch (error) {
      setEmailMessage({ type: 'error', text: error.response?.data?.message || 'Update failed.' });
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-[#6b7280] font-[600]">Loading Secure Profile...</div>;
  if (!user) return <div className="p-10 text-center text-red-500 font-bold">Failed to load profile data.</div>;

  const fName = user.personalDetails?.firstName || '';
  const lName = user.personalDetails?.lastName || '';
  const fullName = `${fName} ${lName}`.trim() || user.username;
  const init = fName ? fName[0] : (fullName[0] || 'U');

  return (
    <div className="max-w-[1000px] mx-auto pb-[60px] font-sans">
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
          <User size={22} className="text-[#C9A84C]" /> My Profile & Security
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
        
        {/* Left Column: Details & Notifications */}
        <div className="flex flex-col gap-[20px]">
          
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
                  <div className="text-[13px] font-[700] text-[#0f1923]">{user.employmentDetails?.jobTitle || 'Not Assigned'}</div>
                </div>
              </div>
              <div className="flex items-center gap-[12px] p-[12px] bg-[#FAF8F4] rounded-[8px] border border-[#E2DDD4]">
                <Building className="text-[#6b7280] w-[18px] h-[18px]" />
                <div>
                  <div className="text-[10px] font-[700] text-[#6b7280] uppercase tracking-widest">Company Code</div>
                  <div className="text-[13px] font-[700] text-[#0f1923]">{user.companyCode || 'FSM'}</div>
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
                  <div className="text-[10px] font-[700] text-[#6b7280] uppercase tracking-widest">System Username</div>
                  <div className="text-[13px] font-[700] text-[#0f1923]">{user.username}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Preferences Card */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden h-fit">
            <div className="p-[20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex flex-col gap-[12px]">
              <div className="flex items-center gap-[10px]">
                <div className="w-[32px] h-[32px] rounded-[8px] bg-amber-50 text-amber-600 flex items-center justify-center"><BellRing size={16} /></div>
                <div>
                  <div className="text-[14px] font-[800] text-[#0D2B55]">Email Notifications by Role</div>
                  <div className="text-[11px] text-[#6b7280]">Configure separate inboxes for your different portal access levels.</div>
                </div>
              </div>
              
              {/* Role Context Tabs */}
              {availableRoles.length > 1 && (
                <div className="flex flex-wrap gap-[8px] bg-gray-100 p-1 rounded-[8px]">
                  {availableRoles.map(role => (
                    <button 
                      key={role}
                      type="button"
                      onClick={() => setSelectedRoleContext(role)}
                      className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded-[6px] transition-all ${selectedRoleContext === role ? 'bg-white shadow-sm text-[#0D2B55]' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                      {role.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <form onSubmit={handleEmailUpdate} className="p-[24px]">
              {emailMessage.text && (
                <div className={`p-[12px] rounded-[8px] text-[12px] font-[600] mb-[20px] ${emailMessage.type === 'error' ? 'bg-[#FEF2F2] text-[#991B1B]' : 'bg-[#D1FAE5] text-[#065F46]'}`}>
                  {emailMessage.text}
                </div>
              )}

              <div className="flex flex-col gap-[16px]">
                <div>
                  <label className="block text-[12px] font-[700] text-[#0D2B55] mb-[6px]">
                    Inbox Address for {selectedRoleContext.replace('_', ' ')} Alerts
                  </label>
                  <input 
                    type="email" 
                    placeholder={`e.g., ${selectedRoleContext.toLowerCase().replace('_', '.')}@fsmpc.fm`}
                    required
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    className="w-full p-[10px_14px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex gap-3 mt-[8px]">
                  <button 
                    type="submit" disabled={isEmailSubmitting}
                    className="flex-1 py-[12px] bg-amber-500 text-[#0D2B55] rounded-[8px] text-[13px] font-[800] hover:bg-amber-400 shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {isEmailSubmitting ? 'Saving...' : `Save for ${selectedRoleContext.replace('_', ' ')}`}
                  </button>
                  
                  {user.personalDetails?.notificationEmails?.[selectedRoleContext] && (
                    <button 
                      type="button" onClick={() => handleEmailUpdate(null, true)} disabled={isEmailSubmitting}
                      className="px-4 py-[12px] bg-red-50 text-red-600 border border-red-200 rounded-[8px] text-[13px] font-[800] hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Update Password Form Card */}
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
                  placeholder="Min. 8 characters"
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
                  placeholder="Re-type password"
                  value={passwords.confirmPassword}
                  onChange={handleChange}
                  className="w-full p-[10px_14px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="mt-[8px] w-full py-[12px] bg-[#0D2B55] text-white rounded-[8px] text-[13px] font-[800] hover:bg-[#1a3d6e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex justify-center items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isSubmitting ? 'Updating...' : 'Save New Password'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}