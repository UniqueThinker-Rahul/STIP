"use client";

import React, { useState, useEffect } from 'react';
import { Info, Hourglass, CheckCircle, Loader2, X } from 'lucide-react';
import api from '../../../../../lib/api'; // Adjust path based on your folder structure

// Helper to calculate working days passed (skipping weekends)
const getResponseStatus = (noticeDateStr) => {
  if (!noticeDateStr) return { isOverdue: false, daysLeft: 5, overdueBy: 0 };
  
  const startDate = new Date(noticeDateStr);
  const today = new Date();
  startDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  let daysPassed = 0;
  let curDate = new Date(startDate);
  
  while (curDate < today) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
      daysPassed++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  
  if (daysPassed > 5) {
     return { isOverdue: true, daysLeft: 0, overdueBy: daysPassed - 5 };
  } else {
     return { isOverdue: false, daysLeft: 5 - daysPassed, overdueBy: 0 };
  }
};

export default function MyNotices() {
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [showInfo, setShowInfo] = useState(true);
  
  // Modal states
  const [activeModal, setActiveModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMyNotices();
  }, []);

  const fetchMyNotices = async () => {
    try {
      setLoading(true);
      // FIX: Added /hr-queue prefix to match the router mounting path
      const res = await api.get('/hr-queue/staff/my-notices'); 
      setCases(res.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch My Notices:", error);
    } finally {
      setLoading(false);
    }
  };

  const openRespondModal = (caseItem) => {
    setSelectedCase(caseItem);
    setResponseText("");
    setActiveModal(true);
  };

  const closeModal = () => {
    setActiveModal(false);
    setSelectedCase(null);
    setResponseText("");
  };

  const submitResponse = async () => {
    if (!responseText.trim()) return;
    setIsSubmitting(true);
    try {
      // FIX: Use the new dedicated staff route that bypasses the HR role block
      await api.post(`/hr-queue/staff/respond/${selectedCase._id}`, { response: responseText });
      closeModal();
      fetchMyNotices(); // Refresh to show the response text and updated status
    } catch (error) {
      console.error("Error submitting response:", error);
      alert("Failed to submit response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4]">
        <Loader2 className="w-10 h-10 animate-spin text-[#0f172a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] p-6 font-sans text-gray-800">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold flex items-center gap-2 text-[#0f172a]">
          My Notices <Info size={18} className="text-[#0f172a] cursor-pointer" />
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">Disciplinary notices addressed to employees — give your response here</p>
      </div>

      {/* Info Box */}
      {showInfo ? (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-5 mb-6 relative shadow-sm transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 text-blue-600 rounded p-1"><Info size={16} /></div>
              <h2 className="font-bold text-[#0f172a] text-sm">How My Notices works</h2>
              <span className="bg-[#bbf7d0] text-[#166534] text-[11px] px-2 py-0.5 rounded font-bold">Staff</span>
            </div>
            <button onClick={() => setShowInfo(false)} className="text-sm text-gray-500 hover:text-gray-800 font-medium">Hide</button>
          </div>
          <ul className="text-[13px] text-gray-600 space-y-2 list-disc pl-5 ml-1 leading-relaxed">
            <li>Official notices addressed to employees. Respond within 5 working days, giving your side and any mitigating reasons.</li>
            <li>Your response is considered before management makes its decision — it is an opportunity to give your account, not an appeal after a decision.</li>
          </ul>
        </div>
      ) : (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-3 mb-6 flex items-center justify-between shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-600 rounded p-1"><Info size={16} /></div>
            <h2 className="font-bold text-[#0f172a] text-sm">How My Notices works</h2>
            <span className="bg-[#bbf7d0] text-[#166534] text-[11px] px-2 py-0.5 rounded font-bold">Staff</span>
          </div>
          <button onClick={() => setShowInfo(true)} className="text-sm text-gray-500 hover:text-gray-800 font-medium">Show</button>
        </div>
      )}

      {/* Cases List */}
      <div className="space-y-4 pb-20">
        {cases.length === 0 ? (
          <div className="text-center p-10 bg-white border border-gray-200 rounded-lg text-gray-500 text-sm">
            You have no active disciplinary notices.
          </div>
        ) : (
          cases.map((c) => {
            const caseId = `DC-${c._id.slice(-4).toUpperCase()}`;
            const offence = c.offences?.[0] || {};
            const offenceText = offence.offence || 'Notice details pending';
            const occurrence = offence.occurrence || '1st';
            
            // Extract code and action name based on the HR selection structure
            const proposedActionStr = offence.action || 'Written warning';
            const actionCode = proposedActionStr.includes('—') ? proposedActionStr.split('—')[0].trim() : proposedActionStr.charAt(0).toUpperCase();
            const actionName = proposedActionStr.includes('—') ? proposedActionStr.split('—')[1].trim() : proposedActionStr;
            
            const isClosed = c.status === 'CLOSED';
            const hasResponded = !!c.employeeResponse;
            const { daysLeft, isOverdue } = getResponseStatus(c.noticeDate);

            return (
              <div key={c._id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                {/* Card Header */}
                <div className="mb-4">
                  <h3 className="font-bold text-[#0f172a] text-[15px]">
                    {caseId} &middot; {c.employeeId?.personalDetails?.firstName} {c.employeeId?.personalDetails?.lastName}
                  </h3>
                  <p className="text-[13px] text-gray-500 mt-0.5">{offenceText}</p>
                </div>
                
                <hr className="border-gray-100 mb-4" />

                {/* Card Body */}
                <div className="text-[13px] text-gray-700 mb-3">
                  Charge: <span className="text-gray-900">{offenceText}</span> — {occurrence} occurrence &middot; proposed{' '}
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${actionCode === 'D' ? 'bg-[#fef2f2] text-[#b91c1c]' : actionCode.startsWith('S') ? 'bg-[#ffedd5] text-[#c2410c]' : 'bg-[#fef08a] text-[#854d0e]'}`}>
                    {actionCode}
                  </span>{' '}
                  {actionName}
                </div>

                {/* Status and Timer */}
                {!isClosed && !hasResponded && (
                  <>
                    <div className="flex items-center gap-1.5 text-[12px] text-gray-500 mb-4">
                      <Hourglass size={13} className="text-[#854d0e]" /> 
                      {isOverdue ? (
                        <span className="text-red-600 font-bold">Response period overdue</span>
                      ) : (
                        <span>{daysLeft} working days left to respond</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="bg-[#fffbeb] text-[#b45309] border border-[#fde68a] px-3 py-1 rounded-full text-[11px] font-bold">
                        Awaiting Response
                      </span>
                      <button 
                        onClick={() => openRespondModal(c)}
                        className="bg-[#0f172a] text-white px-4 py-1.5 rounded text-[12px] font-bold hover:bg-gray-800 transition-colors"
                      >
                        Respond ({daysLeft} working days)
                      </button>
                    </div>
                  </>
                )}

                {/* Closed / Responded States */}
                {hasResponded && (
                  <div className="mt-4 space-y-3">
                    <div className="border border-gray-200 bg-[#f8fafc] rounded p-3 text-[13px] text-gray-600 italic">
                      Your response: "{c.employeeResponse}"
                    </div>
                    
                    {isClosed ? (
                      <div className="flex items-center gap-3 pt-2">
                        <span className="text-[13px] text-gray-700">
                          Decision: <span className="bg-[#fef2f2] text-[#b91c1c] px-1.5 py-0.5 rounded text-[11px] font-bold mr-1">D</span> 
                          — Dismissal upheld by CEO
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 pt-2">
                        <span className="bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1] px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                          <CheckCircle size={12}/> Response submitted — under review
                        </span>
                      </div>
                    )}
                    
                    {isClosed && (
                      <div className="mt-3">
                        <span className="bg-[#dcfce3] text-[#166534] px-3 py-1 rounded-full text-[11px] font-bold">Closed</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Response Modal */}
      {activeModal && selectedCase && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="bg-[#0f172a] px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-lg">
                Submit Response — DC-{selectedCase._id.slice(-4).toUpperCase()}
              </h3>
              <button onClick={closeModal} className="text-gray-300 hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-6">
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded text-sm mb-6 text-[#0f172a]">
                <span className="font-bold block mb-1">Charge Summary:</span>
                {selectedCase.offences?.[0]?.offence}
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-2">Your response</label>
                <textarea 
                  className="w-full border border-gray-300 rounded p-3 text-sm min-h-[150px] outline-none focus:border-blue-500"
                  placeholder="Provide your account of the incident and any mitigating circumstances..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                ></textarea>
                <p className="text-[11px] text-gray-500 mt-2">
                  Once submitted, this response cannot be edited and will be sent directly to HR and Management.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                Cancel
              </button>
              <button 
                onClick={submitResponse} 
                disabled={!responseText.trim() || isSubmitting}
                className="bg-[#0f172a] text-white text-sm font-bold px-6 py-2 rounded hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                Submit response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}