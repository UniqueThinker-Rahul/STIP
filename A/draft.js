'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, X } from 'lucide-react';
import api from '../../../../lib/api';

const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Map backend API score keys to readable labels
const SCORE_LABELS = {
  jobCompetence: "Job Competence",
  dependability: "Dependability",
  deliveredResults: "Delivered Results",
  adaptability: "Adaptability/Flexibility",
  safeWorking: "Safe Working Environment",
  behaviors: "Behaviors & Initiative"
};

export default function Drafts() {
  const router = useRouter();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);

  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        setLoading(true);
        const res = await api.get('/appraisals').catch(() => ({ data: { data: [] } }));
        const allApps = res.data?.data || [];
        
        // Smart Auto-Cleanup & Garbage Collection
        const submittedApps = allApps.filter(a => a.workflow?.status !== 'DRAFT');
        
        const submittedSignatures = new Set(
          submittedApps.map(a => {
            const empId = a.employeeId?._id || a.employeeId || 'unknown';
            const qtr = a.period?.quarter || 'unknown';
            return `${empId}-${qtr}`;
          })
        );

        const rawDrafts = allApps.filter(a => a.workflow?.status === 'DRAFT');
        rawDrafts.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        const validDrafts = [];
        const seenDraftSignatures = new Set();

        for (const draft of rawDrafts) {
          const empId = draft.employeeId?._id || draft.employeeId || 'unknown';
          const qtr = draft.period?.quarter || 'unknown';
          const signature = `${empId}-${qtr}`;

          if (submittedSignatures.has(signature)) {
            api.delete(`/appraisals/${draft._id}`).catch(e => console.error('Auto-cleanup failed', e));
          } 
          else if (seenDraftSignatures.has(signature)) {
            api.delete(`/appraisals/${draft._id}`).catch(e => console.error('Auto-cleanup duplicate failed', e));
          } 
          else {
            seenDraftSignatures.add(signature);
            validDrafts.push(draft);
          }
        }

        setDrafts(validDrafts);
      } catch (e) { 
        console.error('Error fetching drafts:', e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchDrafts();
  }, []);

  const deleteDraft = async (id) => {
    if (confirm('Are you sure you want to delete this draft?')) {
      try {
        await api.delete(`/appraisals/${id}`);
        setDrafts(drafts.filter(d => d._id !== id));
      } catch (e) {
        console.error('Failed to delete', e);
      }
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading drafts...</div>;

  return (
    <div className="w-full max-w-full pb-[60px] relative">
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">&#128190; Saved Drafts</div>
        <div className="text-[13px] text-[#6b7280]">Appraisals in progress, not yet sent to HR</div>
      </div>
      
      {drafts.length === 0 ? (
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[40px] text-center">
          <div className="text-[40px] mb-[10px]">&#128221;</div>
          <div className="text-[15px] font-[700] text-[#0D2B55] mb-[5px]">No Drafts</div>
          <div className="text-[13px] text-[#6b7280]">You do not have any saved appraisal drafts.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {drafts.map((d) => {
            const fName = d.employeeId?.personalDetails?.firstName || 'Unknown';
            const lName = d.employeeId?.personalDetails?.lastName || '';
            const jobTitle = d.employeeId?.employmentDetails?.jobTitle || 'Staff';
            const quarter = d.period?.quarter || 'Q3';

            return (
              <div key={d._id} className="bg-white border border-[#E2DDD4] rounded-[12px] p-[16px_20px] flex flex-col sm:flex-row sm:items-center justify-between gap-[14px] hover:border-[#0D2B55]/30 transition-colors shadow-sm">
                <div className="flex-1">
                  <div className="text-[14px] font-[700] text-[#0D2B55]">{fName} {lName}</div>
                  <div className="text-[11px] text-[#6b7280] mt-[3px]">
                    {jobTitle} &middot; {quarter} 2026 &middot; Last saved {new Date(d.updatedAt || d.createdAt).toLocaleDateString()} at {new Date(d.updatedAt || d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <div className="flex items-center gap-[10px] flex-wrap justify-end">
                  <span className="text-[11px] font-[700] p-[3px_10px] rounded-full whitespace-nowrap bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] hidden sm:block">
                    &#128190; Draft
                  </span>
                  <div className="flex gap-[8px]">
                    <button 
                      onClick={() => setSelectedAppraisal(d)} 
                      className="px-[14px] py-[7px] bg-white border border-[#E2DDD4] hover:border-[#0D2B55] hover:text-[#0D2B55] text-[#0f1923] text-[12px] font-[700] rounded-[9px] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>

                    <button 
                      className="px-[14px] py-[7px] bg-[#0D2B55] hover:bg-[#1a3d6e] text-white text-[12px] font-[700] rounded-[9px] transition-colors" 
                     onClick={() => router.push(`/dashboard/manager/new?draft=${d._id}`)}
                    >
                      Continue &rarr;
                    </button>
                    <button 
                      className="px-[14px] py-[7px] bg-[#FEE2E2] hover:bg-[#FECACA] text-[#991B1B] text-[12px] font-[700] rounded-[9px] transition-colors"
                      onClick={() => deleteDraft(d._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedAppraisal && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 backdrop-blur-sm z-[200] flex items-center justify-center p-[20px] animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[700px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden slide-in-from-bottom-4">
            
            <div className="p-[20px_24px] border-b border-[#E2DDD4] flex justify-between items-center bg-[#FAF8F4] relative">
              <h2 className="text-[18px] font-[800] text-[#0D2B55]">&#128269; Draft Preview</h2>
              <button onClick={() => setSelectedAppraisal(null)} className="absolute top-[16px] right-[16px] w-[30px] h-[30px] rounded-full bg-white border border-[#E2DDD4] flex items-center justify-center text-[#6b7280] hover:border-[#0D2B55] hover:text-[#0D2B55] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-[24px] overflow-y-auto custom-scrollbar">
              
              <div className="flex items-center gap-[16px] mb-[24px] pb-[20px] border-b border-[#E2DDD4]">
                <div className="w-[56px] h-[56px] rounded-full bg-gradient-to-br from-[#1a3d6e] to-[#2a527f] text-white flex items-center justify-center text-[20px] font-[800] shadow-sm">
                  {selectedAppraisal.employeeId?.personalDetails?.firstName?.[0] || ''}{selectedAppraisal.employeeId?.personalDetails?.lastName?.[0] || ''}
                </div>
                <div>
                  <h3 className="text-[20px] font-[800] text-[#0D2B55] leading-tight">
                    {selectedAppraisal.employeeId?.personalDetails?.firstName} {selectedAppraisal.employeeId?.personalDetails?.lastName}
                  </h3>
                  <div className="text-[13px] text-[#6b7280] mt-[2px] font-[500]">
                    {selectedAppraisal.employeeId?.employmentDetails?.jobTitle} &middot; Last saved {new Date(selectedAppraisal.updatedAt || selectedAppraisal.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px] mb-[24px]">
                <div className="bg-[#FAF8F4] p-[12px_16px] rounded-[10px] border border-[#E2DDD4]">
                  <div className="text-[10px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">Current IPRF</div>
                  <div className="text-[22px] font-[800] text-[#1E40AF]">{selectedAppraisal.calculatedResults?.finalIprfScore?.toFixed(1) || '0.0'}</div>
                </div>
                <div className="bg-[#FAF8F4] p-[12px_16px] rounded-[10px] border border-[#E2DDD4]">
                  <div className="text-[10px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">STIP Award</div>
                  <div className="text-[22px] font-[800] text-[#059669]">{selectedAppraisal.stipAward ? `${selectedAppraisal.stipAward.toFixed(2)}%` : '—'}</div>
                </div>
                <div className="bg-[#FAF8F4] p-[12px_16px] rounded-[10px] border border-[#E2DDD4]">
                  <div className="text-[10px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">Period</div>
                  <div className="text-[18px] font-[800] text-[#0f1923] truncate">{selectedAppraisal.appraisalQuarter?.name || selectedAppraisal.period?.quarter || 'N/A'}</div>
                </div>
                <div className="bg-[#FAF8F4] p-[12px_16px] rounded-[10px] border border-[#E2DDD4]">
                  <div className="text-[10px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">Company</div>
                  <div className="text-[22px] font-[800] text-[#0f1923]">{selectedAppraisal.employeeId?.companyCode || 'FSM'}</div>
                </div>
              </div>

              {/* 🚨 UPGRADE: Expanded KPA Rating Details */}
              <div className="mb-[24px]">
                <h4 className="text-[12px] font-[800] text-[#0D2B55] uppercase tracking-wider mb-[12px] pb-[8px] border-b border-[#E2DDD4]">Drafted KPA Ratings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
                  {Object.entries(SCORE_LABELS).map(([key, label]) => {
                    const rating = selectedAppraisal.scores?.[key]?.rating;
                    return (
                      <div key={key} className="flex justify-between items-center bg-white border border-[#E2DDD4] p-[10px_14px] rounded-[8px] shadow-sm">
                        <span className="text-[13px] font-[600] text-[#475569]">{label}</span>
                        <span className={`text-[14px] font-[800] ${!rating ? 'text-slate-300' : rating >= 3 ? 'text-[#059669]' : rating >= 2 ? 'text-[#D97706]' : 'text-[#DC2626]'}`}>
                          {rating ? rating.toFixed(1) : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-[24px] pt-[16px] border-t border-[#E2DDD4] flex items-center justify-between">
                <div className="text-[11px] font-[700] p-[4px_12px] rounded-full whitespace-nowrap bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                  DRAFT
                </div>
                <div className="text-[11px] text-[#6b7280] font-mono font-[600]">REF: {selectedAppraisal.appraisalRef || selectedAppraisal._id}</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}