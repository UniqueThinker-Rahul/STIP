'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, User, Mail, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';

import api from '../../lib/api';

export default function ForgotPassword() {
  const router = useRouter();
  const [formData, setFormData] = useState({ employeeId: '', contactData: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); // 🚨 NEW: Error state for debugging

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      // 🚨 FIX 1: Strip accidental spaces from the input before sending to the backend
      const cleanPayload = {
        employeeId: formData.employeeId.trim(),
        contactData: formData.contactData.trim()
      };

      const res = await api.post('/auth/forgot-password', cleanPayload);
      
      // 🚨 FIX 2: Check if the backend explicitly returned a failure message
      if (res.data && res.data.success === false) {
         setErrorMessage(res.data.message || 'Database rejected the request.');
      } else {
         setSuccess(true);
      }
      
    } catch (error) {
      // 🚨 FIX 3: Temporarily expose the exact backend error to the screen so you can debug!
      const errorText = error.response?.data?.message || error.message || 'Network or Server Error';
      setErrorMessage(`Backend Error: ${errorText}`);
      console.error("FORGOT PASSWORD CRASH:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] font-sans p-[20px]">
      <div className="w-full max-w-[460px] bg-white rounded-[16px] shadow-xl border border-[#E2DDD4] overflow-hidden">
        
        <div className="bg-[#0D2B55] p-[30px] text-center">
          <div className="w-[56px] h-[56px] bg-white/10 rounded-full flex items-center justify-center mx-auto mb-[16px]">
            <ShieldAlert className="w-[28px] h-[28px] text-[#e8c96a]" />
          </div>
          <h1 className="text-[22px] font-[800] text-white tracking-tight">Account Recovery</h1>
          <p className="text-[13px] text-white/70 mt-[6px]">Submit a secure reset request to ICT Administration</p>
        </div>

        <div className="p-[30px]">
          {success ? (
            <div className="text-center py-[20px] animate-in fade-in duration-500">
              <CheckCircle className="w-[48px] h-[48px] text-[#059669] mx-auto mb-[16px]" />
              <h2 className="text-[18px] font-[800] text-[#0D2B55] mb-[8px]">Request Forwarded</h2>
              <p className="text-[13px] text-[#6b7280] leading-relaxed mb-[24px]">
                If the provided details match our records, your request has been added to the ICT Admin verification queue. Please contact the IT Helpdesk directly if you require immediate assistance.
              </p>
              <button onClick={() => router.push('/')} className="w-full py-[12px] bg-[#0D2B55] text-white rounded-[8px] text-[13px] font-[800] hover:bg-[#1a3d6e] transition-colors">
                Return to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-[20px]">
              
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] p-[12px] text-[12px] text-[#991B1B] leading-relaxed">
                <strong>Important:</strong> For security reasons, password resets must be manually verified. Submitting this form alerts the administration team to securely override your credentials.
              </div>

              {/* 🚨 NEW: Error Banner Display */}
              {errorMessage && (
                <div className="bg-red-100 border border-red-300 text-red-800 rounded-[8px] p-[12px] text-[12px] font-bold">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-[12px] font-[800] text-[#0D2B55] mb-[6px]">Your Employee ID</label>
                <div className="relative">
                  <User className="absolute left-[12px] top-[10px] w-[16px] h-[16px] text-[#6b7280]" />
                  <input 
                    type="text" required placeholder="e.g., FSM-1234"
                    value={formData.employeeId} onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    className="w-full pl-[40px] pr-[14px] py-[10px] bg-[#FAF8F4] border border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-[800] text-[#0D2B55] mb-[6px]">Login Username (Not Email)</label>
                <div className="relative">
                  <Mail className="absolute left-[12px] top-[10px] w-[16px] h-[16px] text-[#6b7280]" />
                  <input 
                    type="text" required placeholder="Enter the exact username used to log in"
                    value={formData.contactData} onChange={(e) => setFormData({...formData, contactData: e.target.value})}
                    className="w-full pl-[40px] pr-[14px] py-[10px] bg-[#FAF8F4] border border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
                  />
                </div>
              </div>

              <button 
                type="submit" disabled={isSubmitting}
                className="mt-[8px] w-full py-[12px] bg-[#0D2B55] text-white rounded-[8px] text-[13px] font-[800] hover:bg-[#1a3d6e] transition-colors shadow-md flex items-center justify-center gap-[8px] disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-[16px] h-[16px] animate-spin" /> : 'Submit Verification Request'}
              </button>
              
              <button type="button" onClick={() => router.push('/')} className="text-[12px] font-[700] text-[#6b7280] hover:text-[#0D2B55] transition-colors flex items-center justify-center gap-[4px]">
                <ArrowLeft className="w-[12px] h-[12px]" /> Back to login page
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}