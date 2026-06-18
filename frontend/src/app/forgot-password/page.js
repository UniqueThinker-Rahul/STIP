'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, User, Mail, CheckCircle, Loader2, ArrowLeft, KeyRound } from 'lucide-react';

import api from '../../lib/api';

export default function ForgotPassword() {
  const router = useRouter();
  const [formData, setFormData] = useState({ employeeId: '', contactData: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dynamic State to handle the two different success paths
  const [successState, setSuccessState] = useState({
    isSuccess: false,
    isAdminReset: false, // True if the backend emailed an automated reset link
    message: ''
  });
  
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      // Strip accidental spaces
      const cleanPayload = {
        employeeId: formData.employeeId.trim(),
        contactData: formData.contactData.trim()
      };

      // We use your existing endpoint, but the backend now handles the smart logic!
      const res = await api.post('/auth/forgot-password', cleanPayload);
      
      if (res.data && res.data.success === false) {
         setErrorMessage(res.data.message || 'Database rejected the request.');
      } else {
         // The backend will set `isAdminReset: true` if it sent the automated email
         setSuccessState({
           isSuccess: true,
           isAdminReset: res.data.isAdminReset || false,
           message: res.data.message || 'Request processed successfully.'
         });
      }
      
    } catch (error) {
      const errorText = error.response?.data?.message || error.message || 'Network or Server Error';
      setErrorMessage(`Backend Error: ${errorText}`);
      console.error("FORGOT PASSWORD CRASH:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] font-sans p-[20px]">
      <div className="w-full max-w-[460px] bg-white rounded-[16px] shadow-xl border border-[#E2DDD4] overflow-hidden animate-in zoom-in-95 duration-300">
        
        <div className="bg-[#0D2B55] p-[30px] text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
          
          <div className="w-[60px] h-[60px] bg-white/10 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-[16px] relative z-10 backdrop-blur-sm shadow-inner">
            <ShieldAlert className="w-[30px] h-[30px] text-[#e8c96a]" />
          </div>
          <h1 className="text-[24px] font-[900] text-white tracking-tight relative z-10">Account Recovery</h1>
          <p className="text-[13px] text-white/70 mt-[6px] font-medium relative z-10">Secure credential restoration portal</p>
        </div>

        <div className="p-[30px]">
          {successState.isSuccess ? (
            <div className="text-center py-[20px] animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Conditional Success Icon & Header based on User Type */}
              {successState.isAdminReset ? (
                <>
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
                     <KeyRound className="w-[36px] h-[36px] text-blue-600" />
                  </div>
                  <h2 className="text-[20px] font-[900] text-[#0D2B55] mb-[8px]">Recovery Link Sent</h2>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100 shadow-sm">
                     <CheckCircle className="w-[40px] h-[40px] text-[#059669]" />
                  </div>
                  <h2 className="text-[20px] font-[900] text-[#0D2B55] mb-[8px]">Request Forwarded</h2>
                </>
              )}

              {/* Dynamic Success Message from Backend */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-[24px] shadow-inner">
                <p className="text-[13px] text-[#475569] leading-relaxed font-medium">
                  {successState.message}
                </p>
              </div>

              <button onClick={() => router.push('/')} className="w-full py-[14px] bg-[#0D2B55] text-white rounded-[10px] text-[14px] font-[800] hover:bg-[#1a3d6e] hover:shadow-lg transition-all flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Return to Login Securely
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-[20px] animate-in fade-in duration-300">
              
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] p-[14px] text-[12px] text-[#991B1B] leading-relaxed shadow-sm">
                <strong>Standard Protocol:</strong> Password resets are manually verified by administration. Submitting this form flags your account for override.<br/><br/>
                <strong>ICT Protocol:</strong> If verified as a System Administrator, an automated secure recovery link will be dispatched immediately.
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-[8px] p-[14px] text-[12px] font-bold flex items-start gap-2 shadow-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-[12px] font-[800] text-[#0D2B55] mb-[8px] uppercase tracking-wider">Your Employee ID</label>
                <div className="relative">
                  <User className="absolute left-[14px] top-[12px] w-[18px] h-[18px] text-[#94a3b8]" />
                  <input 
                    type="text" required placeholder="e.g., FSM-1234"
                    value={formData.employeeId} onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    className="w-full pl-[44px] pr-[14px] py-[12px] bg-white border border-[#E2DDD4] rounded-[10px] text-[14px] font-medium text-slate-800 outline-none focus:border-[#0D2B55] focus:ring-4 focus:ring-[#0D2B55]/10 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-[800] text-[#0D2B55] mb-[8px] uppercase tracking-wider">Login Username / Email</label>
                <div className="relative">
                  <Mail className="absolute left-[14px] top-[12px] w-[18px] h-[18px] text-[#94a3b8]" />
                  <input 
                    type="text" required placeholder="Enter exact system identifier"
                    value={formData.contactData} onChange={(e) => setFormData({...formData, contactData: e.target.value})}
                    className="w-full pl-[44px] pr-[14px] py-[12px] bg-white border border-[#E2DDD4] rounded-[10px] text-[14px] font-medium text-slate-800 outline-none focus:border-[#0D2B55] focus:ring-4 focus:ring-[#0D2B55]/10 transition-all shadow-sm"
                  />
                </div>
              </div>

              <button 
                type="submit" disabled={isSubmitting || !formData.employeeId || !formData.contactData}
                className="mt-[8px] w-full py-[14px] bg-[#0D2B55] text-white rounded-[10px] text-[14px] font-[800] hover:bg-[#1a3d6e] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" /> 
                    Authenticating Matrix...
                  </>
                ) : (
                  'Submit Verification Request'
                )}
              </button>
              
              <button type="button" onClick={() => router.push('/')} className="text-[12px] font-[700] text-[#6b7280] hover:text-[#0D2B55] transition-colors flex items-center justify-center gap-[6px] mt-2">
                <ArrowLeft className="w-[12px] h-[12px]" /> Back to secure login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}