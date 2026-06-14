'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, KeyRound, AlertTriangle, Loader2, CheckCircle, Clock, Trash2, Settings, Users } from 'lucide-react';
import api from '../../../../lib/api'; 

export default function AdminPasswordReset() {
  const [formData, setFormData] = useState({ employeeId: '', username: '', newPassword: '', confirmPassword: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for the request queue
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Default Password States
  const [defaultPassword, setDefaultPassword] = useState('STIP@2026'); // Fallback default
  const [isSavingDefault, setIsSavingDefault] = useState(false);
  const [isMassResetting, setIsMassResetting] = useState(false);

  // 🚨 NEW: Custom Modal State to lock page and center alerts
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'alert', // 'alert' | 'confirm' | 'prompt'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });
  const [modalInput, setModalInput] = useState('');

  const closeDialog = () => {
    setModalConfig({ ...modalConfig, isOpen: false });
    setModalInput('');
  };

  const showDialog = (type, title, message, onConfirm = closeDialog, onCancel = closeDialog) => {
    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      onConfirm,
      onCancel
    });
    setModalInput('');
  };

  const fetchRequests = async () => {
    try {
      const res = await api.get('/auth/password-requests');
      setRequests(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load request queue");
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchConfig = () => {
    try {
      const savedPwd = localStorage.getItem('stip_admin_default_pwd');
      if (savedPwd) {
        setDefaultPassword(savedPwd);
      }
    } catch (err) {
      console.error("Failed to read local storage", err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchConfig();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleProcessRequest = (reqData) => {
    setFormData({
      employeeId: reqData.employeeId,
      username: reqData.username,
      newPassword: defaultPassword, 
      confirmPassword: defaultPassword
    });
    setStatus({ type: 'success', message: `Ready to reset ${reqData.username}. The Default Password has been auto-filled.` });
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  // 🚨 UPGRADE: Use Custom Modal for Dismissal
  const handleDismissRequest = (id) => {
    showDialog('confirm', 'Dismiss Request', 'Are you sure you want to dismiss and delete this password reset request?', async () => {
      closeDialog();
      try {
        await api.patch(`/auth/password-requests/${id}/dismiss`);
        fetchRequests(); 
      } catch (err) {
        showDialog('alert', 'Error', 'Failed to dismiss request.');
      }
    });
  };

  // 🚨 UPGRADE: Use Custom Modal for Saving Settings
  const handleSaveDefaultPassword = () => {
    if (defaultPassword.length < 8) return showDialog('alert', 'Validation Error', 'Default password must be at least 8 characters.');
    
    setIsSavingDefault(true);
    try {
      localStorage.setItem('stip_admin_default_pwd', defaultPassword); 
      setTimeout(() => {
        setIsSavingDefault(false);
        showDialog('alert', 'Success', 'Default Password preference saved successfully to this browser.');
      }, 400); 
    } catch (err) {
      setIsSavingDefault(false);
      showDialog('alert', 'Error', 'Failed to save preference.');
    }
  };

  // 🚨 UPGRADE: Use Custom Modal for the multi-step Mass Reset Warning
  const handleMassReset = () => {
    showDialog(
      'confirm', 
      'Global Staff Reset (DANGER)', 
      `WARNING: You are about to reset EVERY staff member's password to: ${defaultPassword}\n\nAre you absolutely sure?`, 
      () => {
        // Step 2: The text confirmation prompt
        showDialog(
          'prompt',
          'Confirm MASSIVE Action',
          'To confirm this MASSIVE action, type "RESET ALL" below:',
          async (inputValue) => {
            if (inputValue !== "RESET ALL") {
              showDialog('alert', 'Action Cancelled', 'Mass reset cancelled.');
              return;
            }
            
            closeDialog();
            setIsMassResetting(true);
            try {
              await api.patch('/auth/admin-mass-reset', { newPassword: defaultPassword });
              showDialog('alert', 'SUCCESS', 'All staff passwords have been reset to the default password. They will be forced to change it on next login.');
              fetchRequests(); // Queue should be empty now
            } catch (err) {
              showDialog('alert', 'Execution Failed', err.response?.data?.message || "Failed to execute mass reset.");
            } finally {
              setIsMassResetting(false);
            }
          },
          closeDialog
        );
      },
      closeDialog
    );
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (formData.newPassword !== formData.confirmPassword) return setStatus({ type: 'error', message: 'New passwords do not match.' });
    if (formData.newPassword.length < 8) return setStatus({ type: 'error', message: 'The new password must be at least 8 characters long.' });

    setIsSubmitting(true);
    try {
      const res = await api.patch('/auth/admin-reset-password', {
        employeeId: formData.employeeId, username: formData.username, newPassword: formData.newPassword
      });

      setStatus({ type: 'success', message: res.data?.message || 'Password successfully overridden.' });
      setFormData({ employeeId: '', username: '', newPassword: '', confirmPassword: '' });
      fetchRequests(); 
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to reset password. Verify the Employee ID and Username are correct.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto pb-[60px] font-sans relative">
      
      <div className="mb-[24px]">
        <div className="text-[24px] font-[800] text-[#0D2B55] mb-[4px] flex items-center gap-[8px]">
          <ShieldCheck className="w-[24px] h-[24px] text-[#2563EB]" /> Identity Verification & Password Override
        </div>
        <div className="text-[13px] text-[#6b7280]">
          Review incoming password reset requests submitted via the public portal, or execute a manual override.
        </div>
      </div>

      {/* System Settings Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mb-[32px]">
        
        {/* Default Password Config */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden p-[20px]">
          <div className="flex items-center gap-[8px] mb-[12px]">
            <Settings className="w-[18px] h-[18px] text-[#0D2B55]" />
            <div className="text-[14px] font-[800] text-[#0D2B55]">System Default Password</div>
          </div>
          <div className="text-[11px] text-[#6b7280] mb-[12px]">
            Set the default password used when auto-processing queue requests.
          </div>
          <div className="flex gap-[10px]">
            <input 
              type="text" 
              value={defaultPassword} 
              onChange={(e) => setDefaultPassword(e.target.value)}
              className="flex-1 p-[8px_12px] bg-[#FAF8F4] border border-[#E2DDD4] rounded-[8px] text-[13px] font-mono outline-none focus:border-[#0D2B55]"
            />
            <button 
              onClick={handleSaveDefaultPassword}
              disabled={isSavingDefault}
              className="px-[16px] py-[8px] bg-[#0D2B55] text-white rounded-[8px] text-[12px] font-[800] hover:bg-[#1a3d6e] disabled:opacity-50"
            >
              {isSavingDefault ? 'Saving...' : 'Save Default'}
            </button>
          </div>
        </div>

        {/* Global Mass Reset */}
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[14px] shadow-sm overflow-hidden p-[20px]">
           <div className="flex items-center gap-[8px] mb-[12px]">
            <Users className="w-[18px] h-[18px] text-[#DC2626]" />
            <div className="text-[14px] font-[800] text-[#991B1B]">Global Staff Reset (DANGER)</div>
          </div>
          <div className="text-[11px] text-[#991B1B] mb-[12px] font-[600] leading-tight">
            Reset every active employee's password to the Default Password simultaneously.
          </div>
          <button 
            onClick={handleMassReset}
            disabled={isMassResetting}
            className="w-full py-[10px] bg-[#DC2626] text-white rounded-[8px] text-[12px] font-[800] hover:bg-[#B91C1C] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {isMassResetting ? <Loader2 className="w-[14px] h-[14px] animate-spin" /> : <AlertTriangle className="w-[14px] h-[14px]" />} 
            {isMassResetting ? 'Executing Global Reset...' : 'Execute Mass Reset to Default'}
          </button>
        </div>

      </div>

      {/* Incoming Request Queue */}
      <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden mb-[32px]">
        <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center">
          <div className="flex items-center gap-[10px]">
            <div className="w-[32px] h-[32px] rounded-[8px] bg-[#FFFBEB] text-[#D97706] flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">Pending Reset Requests</div>
              <div className="text-[11px] text-[#6b7280]">Submitted from the public Forgot Password page</div>
            </div>
          </div>
          <span className="bg-[#D97706] text-white text-[11px] font-[800] px-[10px] py-[4px] rounded-full">
            {requests.length} Pending
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead className="bg-white border-b border-[#E2DDD4] text-[#6b7280] font-[800] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-[12px_20px]">Employee Details</th>
                <th className="p-[12px_20px]">Requested On</th>
                <th className="p-[12px_20px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4]">
              {loadingRequests ? (
                <tr><td colSpan="3" className="p-[24px] text-center text-[#6b7280] animate-pulse font-[600]">Scanning for requests...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan="3" className="p-[32px] text-center text-[#6b7280] font-[600]">The request queue is completely empty.</td></tr>
              ) : (
                requests.map(req => (
                  <tr key={req._id} className="hover:bg-[#FAF8F4] transition-colors">
                    <td className="p-[16px_20px]">
                      <div className="font-[800] text-[#0D2B55]">{req.personalDetails?.firstName} {req.personalDetails?.lastName}</div>
                      <div className="text-[11px] text-[#6b7280] font-mono mt-[2px]">ID: {req.employeeId} &middot; User: {req.username}</div>
                    </td>
                    <td className="p-[16px_20px] text-[#6b7280]">
                      {new Date(req.security?.resetRequestDate).toLocaleString()}
                    </td>
                    <td className="p-[16px_20px] text-right">
                      <div className="flex justify-end gap-[8px]">
                        <button onClick={() => handleDismissRequest(req._id)} className="p-[8px] bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FECACA] rounded-[6px] transition-colors" title="Dismiss Invalid Request">
                          <Trash2 className="w-[14px] h-[14px]" />
                        </button>
                        <button onClick={() => handleProcessRequest(req)} className="px-[12px] py-[6px] bg-[#EFF6FF] text-[#1E40AF] font-[700] text-[11px] hover:bg-[#DBEAFE] rounded-[6px] transition-colors border border-[#BFDBFE]">
                          Process &rarr;
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Execution Form */}
      <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden">
        <div className="p-[20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
          <div className="w-[32px] h-[32px] rounded-[8px] bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
            <KeyRound size={16} />
          </div>
          <div>
            <div className="text-[14px] font-[800] text-[#0D2B55]">Execute Password Reset</div>
            <div className="text-[11px] text-[#6b7280]">Auto-filled from queue, or enter details manually</div>
          </div>
        </div>

        <form onSubmit={handleReset} className="p-[24px]">
          {status.message && (
            <div className={`p-[16px] rounded-[10px] text-[13px] font-[600] mb-[24px] flex items-center gap-[10px] ${status.type === 'error' ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]' : 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]'}`}>
              {status.type === 'error' ? <AlertTriangle className="w-[18px] h-[18px]" /> : <CheckCircle className="w-[18px] h-[18px]" />} 
              {status.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mb-[24px]">
            <div className="flex flex-col gap-[8px]">
              <label className="text-[12px] font-[800] text-[#0D2B55]">Target Employee ID <span className="text-[#DC2626]">*</span></label>
              <input 
                type="text" name="employeeId" placeholder="e.g., FSM-1234" required
                value={formData.employeeId} onChange={handleChange}
                className="w-full p-[12px_16px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] font-mono outline-none focus:border-[#0D2B55] transition-colors"
              />
            </div>
            
            <div className="flex flex-col gap-[8px]">
              <label className="text-[12px] font-[800] text-[#0D2B55]">Target Login Username <span className="text-[#DC2626]">*</span></label>
              <input 
                type="text" name="username" placeholder="e.g., FSM-12342026" required
                value={formData.username} onChange={handleChange}
                className="w-full p-[12px_16px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
              />
            </div>
          </div>

          <div className="bg-[#FAF8F4] h-[1px] w-full my-[8px]"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mt-[24px] mb-[32px]">
            <div className="flex flex-col gap-[8px]">
              <label className="text-[12px] font-[800] text-[#0D2B55]">New Temporary Password <span className="text-[#DC2626]">*</span></label>
              <input 
                type="password" name="newPassword" placeholder="Min. 8 characters" required
                value={formData.newPassword} onChange={handleChange}
                className="w-full p-[12px_16px] bg-[#F8FAFC] border border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-[8px]">
              <label className="text-[12px] font-[800] text-[#0D2B55]">Confirm Temporary Password <span className="text-[#DC2626]">*</span></label>
              <input 
                type="password" name="confirmPassword" placeholder="Re-type password" required
                value={formData.confirmPassword} onChange={handleChange}
                className="w-full p-[12px_16px] bg-[#F8FAFC] border border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" disabled={isSubmitting}
              className="py-[12px] px-[24px] bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-[8px] text-[13px] font-[800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-[8px]"
            >
              {isSubmitting ? <><Loader2 className="w-[16px] h-[16px] animate-spin" /> Executing Reset...</> : <><KeyRound className="w-[16px] h-[16px]" /> Force Reset Password</>}
            </button>
          </div>
        </form>
      </div>

      {/* 🚨 NEW: Centered Screen-Locking Custom Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-[24px]">
              <div className="flex items-center gap-[10px] mb-[12px]">
                {modalConfig.title.includes('Error') || modalConfig.title.includes('DANGER') ? (
                  <AlertTriangle className="w-[20px] h-[20px] text-[#DC2626]" />
                ) : (
                  <ShieldCheck className="w-[20px] h-[20px] text-[#2563EB]" />
                )}
                <h3 className="text-[18px] font-[800] text-[#0D2B55]">{modalConfig.title}</h3>
              </div>
              
              <p className="text-[14px] text-[#475569] mb-[24px] whitespace-pre-wrap leading-relaxed">
                {modalConfig.message}
              </p>
              
              {modalConfig.type === 'prompt' && (
                <input 
                  type="text"
                  autoFocus
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  className="w-full p-[12px_16px] mb-[24px] bg-[#FAF8F4] border border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors font-mono"
                  placeholder="Type here to confirm..."
                />
              )}

              <div className="flex justify-end gap-[12px]">
                {(modalConfig.type === 'confirm' || modalConfig.type === 'prompt') && (
                  <button 
                    type="button"
                    onClick={modalConfig.onCancel}
                    className="px-[16px] py-[10px] text-[#475569] font-[700] text-[13px] hover:bg-[#F1F5F9] rounded-[8px] transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => {
                    if (modalConfig.type === 'prompt') {
                      modalConfig.onConfirm(modalInput);
                    } else {
                      modalConfig.onConfirm();
                    }
                  }}
                  className={`px-[20px] py-[10px] text-white font-[800] text-[13px] rounded-[8px] shadow-sm transition-colors ${
                    modalConfig.title.includes('Error') || modalConfig.title.includes('DANGER') || modalConfig.title.includes('Confirm MASSIVE')
                      ? 'bg-[#DC2626] hover:bg-[#B91C1C]' 
                      : 'bg-[#0D2B55] hover:bg-[#1a3d6e]'
                  }`}
                >
                  {modalConfig.type === 'alert' ? 'Acknowledge' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}