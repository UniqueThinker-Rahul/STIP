"use client";

import React, { useState, useEffect } from 'react';
import { Info, X, FileText, CheckCircle, Clock, Search, Briefcase, History } from 'lucide-react';
import api from '../../../../../lib/api'; // Adjust path based on your folder structure

const ACTIONS = {
  A: "Admonishment (verbal warning)",
  R: "Written warning",
  S3: "3-day suspension (unpaid)",
  S10: "10-day suspension (unpaid)",
  S20: "20-day suspension (unpaid)",
  D: "Dismissal"
};

export default function CEOReferrals() {
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [showInfo, setShowInfo] = useState(true);
  
  // Modal states
  const [activeModal, setActiveModal] = useState(null); // 'history' or 'decision'
  const [selectedCase, setSelectedCase] = useState(null);
  const [decisionData, setDecisionData] = useState({ action: '', note: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      // Fetch cases and filter for those explicitly with the CEO
      const res = await api.get('/hr-queue'); 
      const allCases = res.data?.data || [];
      const ceoCases = allCases.filter(c => c.hrWorkflowStatus === 'WITH_CEO');
      setCases(ceoCases);
    } catch (error) {
      console.error("Failed to fetch CEO referrals:", error);
    } finally {
      setLoading(false);
    }
  };

  const openHistoryModal = (caseItem) => {
    setSelectedCase(caseItem);
    setActiveModal('history');
  };

  const openDecisionModal = (caseItem) => {
    setSelectedCase(caseItem);
    setDecisionData({ action: '', note: '' });
    setActiveModal('decision');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedCase(null);
  };

  const submitDecision = async () => {
    if (!decisionData.action) return;
    setIsSubmitting(true);
    try {
      // Assuming a standard endpoint for CEO decision recording
      await api.post(`/hr-queue/${selectedCase._id}/record-decision`, { 
        finalAction: decisionData.action, 
        ceoNote: decisionData.note,
        status: 'CLOSED',
        hrWorkflowStatus: 'CLOSED'
      });
      closeModal();
      fetchReferrals();
    } catch (error) {
      console.error("Error submitting decision:", error);
      alert("Failed to submit decision. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to extract min/max codes for range display
  const getRangeCodes = (caseItem) => {
      // Dummy logic based on provided screenshot structures
      // Ideally this maps from a real OFFENCES_DATA utility
      const actionStr = caseItem.offences?.[0]?.action || '';
      return { min: 'W', max: 'D' }; // Fallback
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4]">
        <div className="w-10 h-10 border-4 border-[#0f172a] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] p-6 font-sans text-gray-800 pb-20">
      
      {/* Header[cite: 52] */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold flex items-center gap-2 text-[#0f172a]">
          Referrals — CEO Decision <Briefcase size={20} className="text-[#0f172a]" />
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">Cases forwarded by HR, or recommended by the SMT</p>
      </div>

      {/* Info Box[cite: 52] */}
      {showInfo ? (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-5 mb-6 relative shadow-sm transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 text-blue-600 rounded p-1"><Info size={16} /></div>
              <h2 className="font-bold text-[#0f172a] text-sm">How Referrals works</h2>
            </div>
            <button onClick={() => setShowInfo(false)} className="text-sm text-gray-500 hover:text-gray-800 font-medium">Hide</button>
          </div>
          <ul className="text-[13px] text-gray-600 space-y-2 list-disc pl-5 ml-1 leading-relaxed">
            <li>Cases HR forwarded directly to the CEO, or that came up through the SMT with a recommendation.</li>
            <li>Where the SMT has recommended an action, it is shown here — you may follow it or decide differently, within the offence range.</li>
            <li>Click "View full case history" to see everything on the case prior: the counselling, the line manager's statement, the HR investigation, witness statements, uploaded evidence, any Jury of Peers finding, recommendations and the audit trail.</li>
            <li>The Table of Charges is in your menu — it lists every offence and its penalties (verbal warning, written warning, suspension or dismissal) by occurrence.</li>
            <li>Your decision is final and closes the case.</li>
          </ul>
        </div>
      ) : (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-3 mb-6 flex items-center justify-between shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-600 rounded p-1"><Info size={16} /></div>
            <h2 className="font-bold text-[#0f172a] text-sm">How Referrals works</h2>
          </div>
          <button onClick={() => setShowInfo(true)} className="text-sm text-gray-500 hover:text-gray-800 font-medium">Show</button>
        </div>
      )}

      {/* Case List[cite: 52] */}
      <div className="space-y-6">
        {cases.length === 0 ? (
          <div className="text-center p-10 bg-white border border-gray-200 rounded-lg text-gray-500 text-sm">
            No cases currently requiring CEO decision.
          </div>
        ) : (
          cases.map((c) => {
            const caseId = `DC-${c._id.slice(-4).toUpperCase()}`;
            const offence = c.offences?.[0] || {};
            const offenceText = offence.offence || 'Notice details pending';
            const occurrence = offence.occurrence || '1st';
            const isSmtRoute = !!c.smtRecommendation; // Assuming SMT data exists if routed through SMT
            
            return (
              <div key={c._id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                
                {/* Case Header */}
                <div className="mb-4">
                  <h3 className="font-bold text-[#0f172a] text-[15px]">
                    {caseId} : {c.employeeId?.personalDetails?.firstName} {c.employeeId?.personalDetails?.lastName}
                  </h3>
                  <p className="text-[13px] text-gray-500 mt-0.5">{offenceText}</p>
                </div>
                
                {/* Meta Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px] text-gray-600 mb-4 bg-gray-50 p-3 rounded">
                  <div><span className="font-bold text-gray-800">Occurrence:</span> {occurrence}</div>
                  <div><span className="font-bold text-gray-800">Range:</span> <span className="font-bold text-orange-600">{getRangeCodes(c).min} &rarr; {getRangeCodes(c).max}</span></div>
                  <div className="col-span-2"><span className="font-bold text-gray-800">Route:</span> {isSmtRoute ? 'HR &rarr; SMT &rarr; CEO' : 'HR &rarr; CEO (direct)'}</div>
                </div>

                {/* Recommendations Box */}
                <div className="space-y-3 mb-4">
                  {/* HR Recommendation */}
                  <div className="text-[13px]">
                    <span className="font-bold text-gray-800">HR recommended:</span> {c.hrRecommendation?.hrRecommendedAction || '10-day suspension (unpaid)'}
                    {c.hrRecommendation?.hrRationale && (
                      <p className="text-gray-500 mt-1 italic block break-words border-l-2 border-gray-300 pl-2">
                        HR rationale: "{c.hrRecommendation.hrRationale}"
                      </p>
                    )}
                  </div>
                  
                  {/* SMT Recommendation (If applicable) */}
                  {isSmtRoute && c.smtRecommendation && (
                    <div className="text-[13px] bg-red-50 border border-red-100 p-3 rounded text-red-900">
                      <span className="font-bold">SMT recommendation:</span> {c.smtRecommendation.recommendedAction}
                    </div>
                  )}
                </div>

                {/* Investigation Snippet */}
                <div className="text-[13px] text-gray-700 mb-6 border-t border-gray-100 pt-4">
                  <span className="font-bold">Investigation:</span> <span className="text-gray-600">{c.investigationDetails?.findings || 'No investigation details recorded.'}</span>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#f3e8ff] text-[#6b21a8] px-3 py-1.5 rounded-full text-[11px] font-bold border border-[#e9d5ff]">
                      With CEO
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => openHistoryModal(c)}
                      className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-[12px] font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <History size={14} /> View full case history
                    </button>
                    <button 
                      onClick={() => openDecisionModal(c)}
                      className="bg-[#0f172a] text-white px-5 py-2 rounded text-[12px] font-bold hover:bg-gray-800 transition-colors"
                    >
                      Make final decision
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* FULL CASE HISTORY MODAL[cite: 52] */}
      {activeModal === 'history' && selectedCase && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl overflow-hidden flex flex-col h-[90vh]">
            
            <div className="bg-[#0f172a] px-6 py-4 flex items-center justify-between text-white shrink-0">
              <h3 className="font-bold text-lg">
                Full case history — DC-{selectedCase._id.slice(-4).toUpperCase()}
              </h3>
              <button onClick={closeModal} className="text-gray-300 hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-6 overflow-y-auto bg-gray-50 space-y-4">
              
              {/* 1. Employee & Charge */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h4 className="font-bold text-[#0f172a] text-sm flex items-center gap-2 mb-4 border-b pb-2">
                  <span className="bg-gray-200 text-gray-800 rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span> 
                  Employee & Charge
                </h4>
                <div className="grid grid-cols-[120px_1fr] gap-y-2 text-[13px]">
                  <div className="font-bold text-gray-600">Employee</div>
                  <div>{selectedCase.employeeId?.personalDetails?.firstName} {selectedCase.employeeId?.personalDetails?.lastName} — {selectedCase.employeeId?.employmentDetails?.jobTitle}</div>
                  
                  <div className="font-bold text-gray-600">Department</div>
                  <div>{selectedCase.employeeId?.employmentDetails?.department}</div>
                  
                  <div className="font-bold text-gray-600 mt-2">Offence</div>
                  <div className="mt-2 font-medium text-[#0f172a]">{selectedCase.offences?.[0]?.offence}</div>
                  
                  <div className="font-bold text-gray-600">Range</div>
                  <div>
                    {selectedCase.offences?.[0]?.occurrence || '1st'} occurrence — range 
                    <span className="font-bold text-orange-600 ml-1">{getRangeCodes(selectedCase).min} &rarr; {getRangeCodes(selectedCase).max}</span>
                  </div>
                </div>
              </div>

              {/* 2. Counselling before the case */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h4 className="font-bold text-[#0f172a] text-sm flex items-center gap-2 mb-3 border-b pb-2">
                  <span className="bg-gray-200 text-gray-800 rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span> 
                  Counselling before the case
                </h4>
                <p className="text-[13px] text-gray-500 italic">No counselling recorded for this employee.</p>
              </div>

              {/* 3. Case raised by line manager */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h4 className="font-bold text-[#0f172a] text-sm flex items-center gap-2 mb-4 border-b pb-2">
                  <span className="bg-gray-200 text-gray-800 rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span> 
                  Case raised by the line manager
                </h4>
                <div className="grid grid-cols-[150px_1fr] gap-y-2 text-[13px] mb-4">
                  <div className="font-bold text-gray-600 uppercase text-xs">Date Raised</div>
                  <div>{new Date(selectedCase.createdAt).toLocaleDateString()}</div>
                  <div className="font-bold text-gray-600 uppercase text-xs">LM Recommended</div>
                  <div className="font-bold text-orange-600">{selectedCase.offences?.[0]?.action || 'Written warning'}</div>
                </div>
                <div className="text-[13px] bg-red-50 text-red-800 p-2 rounded inline-block font-bold mb-3 text-xs">
                  ⚠ Flagged as a serious offence — reported to HR immediately
                </div>
                <p className="text-[13px] text-gray-700 bg-gray-50 p-3 border border-gray-200 rounded">
                  {selectedCase.description || 'Details reported by line manager.'}
                </p>
              </div>

              {/* 4. HR Investigation */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h4 className="font-bold text-[#0f172a] text-sm flex items-center gap-2 mb-4 border-b pb-2">
                  <span className="bg-gray-200 text-gray-800 rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span> 
                  HR Investigation
                </h4>
                <div className="space-y-4 text-[13px]">
                  <div>
                    <div className="font-bold text-gray-600 uppercase text-[11px] mb-1">Findings</div>
                    <div className="text-gray-800">{selectedCase.investigationDetails?.findings || 'No findings recorded.'}</div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-600 uppercase text-[11px] mb-1">Discussion with Line Manager</div>
                    <div className="text-gray-800">{selectedCase.investigationDetails?.discussionManager || '-'}</div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-600 uppercase text-[11px] mb-1">Discussion with Employee</div>
                    <div className="text-gray-800">{selectedCase.investigationDetails?.discussionEmployee || '-'}</div>
                  </div>
                </div>
              </div>

              {/* 7. Escalation & Recommendations */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h4 className="font-bold text-[#0f172a] text-sm flex items-center gap-2 mb-4 border-b pb-2">
                  <span className="bg-gray-200 text-gray-800 rounded-full w-5 h-5 flex items-center justify-center text-xs">7</span> 
                  Escalation & recommendations
                </h4>
                <div className="grid grid-cols-[150px_1fr] gap-y-3 text-[13px]">
                  <div className="font-bold text-gray-600 uppercase text-[11px]">Route</div>
                  <div>HR &rarr; {selectedCase.smtRecommendation ? 'SMT &rarr; ' : ''}CEO (direct)</div>
                  
                  <div className="font-bold text-gray-600 uppercase text-[11px]">HR Recommended</div>
                  <div className="font-bold text-[#0f172a]">{selectedCase.hrRecommendation?.hrRecommendedAction || '10-day suspension (unpaid)'}</div>

                  {selectedCase.hrRecommendation?.hrRationale && (
                    <>
                      <div className="font-bold text-gray-600 uppercase text-[11px]">HR Rationale</div>
                      <div className="text-gray-700 italic">"{selectedCase.hrRecommendation.hrRationale}"</div>
                    </>
                  )}
                  
                  {selectedCase.smtRecommendation && (
                    <>
                      <div className="font-bold text-gray-600 uppercase text-[11px] mt-2">SMT Recommended</div>
                      <div className="font-bold text-red-700 mt-2">{selectedCase.smtRecommendation.recommendedAction}</div>
                    </>
                  )}
                </div>
              </div>

              {/* 8. Employee response & decision */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h4 className="font-bold text-[#0f172a] text-sm flex items-center gap-2 mb-4 border-b pb-2">
                  <span className="bg-gray-200 text-gray-800 rounded-full w-5 h-5 flex items-center justify-center text-xs">8</span> 
                  Employee response & decision
                </h4>
                <div className="grid grid-cols-[150px_1fr] gap-y-3 text-[13px]">
                  <div className="font-bold text-gray-600 uppercase text-[11px]">Employee Response</div>
                  <div className="text-gray-700 bg-gray-50 border border-gray-200 p-3 rounded">{selectedCase.employeeResponse || 'No response recorded.'}</div>
                  
                  <div className="font-bold text-gray-600 uppercase text-[11px] mt-2">Current Status</div>
                  <div className="mt-2">
                    <span className="bg-[#f3e8ff] text-[#6b21a8] px-3 py-1 rounded text-[11px] font-bold border border-[#e9d5ff]">
                      WITH CEO
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MAKE FINAL DECISION MODAL[cite: 52] */}
      {activeModal === 'decision' && selectedCase && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200">
              <h3 className="font-bold text-[18px] text-[#0f172a]">
                CEO decision — DC-{selectedCase._id.slice(-4).toUpperCase()}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-800 transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Employee Intro */}
              <div>
                <h4 className="font-bold text-[#0f172a] text-[16px] mb-1">
                  {selectedCase.employeeId?.personalDetails?.firstName} {selectedCase.employeeId?.personalDetails?.lastName}
                </h4>
                <p className="text-[13px] text-gray-600">
                  {selectedCase.offences?.[0]?.offence} — {selectedCase.offences?.[0]?.occurrence || '1st'} occurrence — range
                  <span className="text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-[11px] font-bold mx-2">
                    {getRangeCodes(selectedCase).min}
                  </span> 
                  <span className="text-gray-400">&rarr;</span> 
                  <span className="text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-[11px] font-bold mx-2">
                    {getRangeCodes(selectedCase).max}
                  </span>
                </p>
              </div>

              {/* Recommendations */}
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="text-[12px] font-bold text-blue-800 uppercase mb-1">HR recommended</div>
                  <div className="font-bold text-[#0f172a] text-sm">
                    {selectedCase.hrRecommendation?.hrRecommendedAction || '10-day suspension (unpaid)'}
                  </div>
                  {selectedCase.hrRecommendation?.hrRationale && (
                    <div className="text-[13px] text-gray-600 mt-2">
                      {selectedCase.hrRecommendation.hrRationale}
                    </div>
                  )}
                </div>

                {selectedCase.smtRecommendation && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                    <div className="text-[12px] font-bold text-red-800 uppercase mb-1">SMT recommended</div>
                    <div className="font-bold text-red-900 text-sm">
                      {selectedCase.smtRecommendation.recommendedAction}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Input */}
              <div className="border-t border-gray-200 pt-5 space-y-4">
                <div>
                  <label className="block text-[13px] font-bold text-[#0f172a] mb-2">Final action for each offence</label>
                  <p className="text-[12px] text-gray-500 mb-2 truncate">{selectedCase.offences?.[0]?.offence}</p>
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={decisionData.action}
                    onChange={(e) => setDecisionData({...decisionData, action: e.target.value})}
                  >
                    <option value="">— Select final decision —</option>
                    {Object.entries(ACTIONS).map(([key, label]) => (
                      <option key={key} value={label}>{key} — {label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-[#0f172a] mb-2">Note (optional)</label>
                  <textarea 
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    placeholder="Any final notes from the CEO..."
                    value={decisionData.note}
                    onChange={(e) => setDecisionData({...decisionData, note: e.target.value})}
                  />
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
              <button onClick={closeModal} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                Cancel
              </button>
              <button 
                onClick={submitDecision} 
                disabled={!decisionData.action || isSubmitting}
                className="bg-[#0f172a] text-white text-sm font-bold px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? 'Recording...' : 'Record final decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}