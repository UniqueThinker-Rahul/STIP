'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const cpPct = 13.01;

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const appRes = await api.get('/appraisals').catch(() => ({ data: { data: [] } }));
        const myAppraisals = appRes.data?.data || [];
        
        // FIX: The backend already only returns THIS manager's appraisals.
        // We just need to filter out the DRAFTS using the correct nested workflow status.
        const submitted = myAppraisals.filter(a => a.workflow?.status && a.workflow?.status !== 'DRAFT');
        
        // Sort newest first
        submitted.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        
        setSubmissions(submitted);
      } catch (error) {
        console.error('Failed to load submissions', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  const getStatusConfig = (status) => {
    switch(status) {
      case 'SUBMITTED': return { text: 'Submitted to HR', badgeClass: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]' };
      case 'UNDER_HR_REVIEW': return { text: 'Under HR Review', badgeClass: 'bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]' };
      case 'APPROVED_BY_HR': return { text: 'HR Approved', badgeClass: 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]' };
      case 'WITH_CEO': return { text: 'With CEO', badgeClass: 'bg-[#EDE9FE] text-[#4C1D95] border border-[#DDD6FE]' };
      case 'APPROVED': return { text: 'Fully Approved', badgeClass: 'bg-[#059669] text-white border border-[#065F46]' };
      case 'NOT_APPROVED': return { text: 'CEO Rejected', badgeClass: 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]' };
      default: return { text: status?.replace(/_/g, ' ') || 'Unknown', badgeClass: 'bg-[#E2DDD4] text-[#6b7280]' };
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading submissions...</div>;

  return (
    <div className="w-full max-w-full pb-[60px]">
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">&#128228; My Submissions</div>
        <div className="text-[13px] text-[#6b7280]">Appraisals sent to HR for review and approval</div>
      </div>
      
      {submissions.length === 0 ? (
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[40px] text-center">
          <div className="text-[40px] mb-[10px]">&#128194;</div>
          <div className="text-[15px] font-[700] text-[#0D2B55] mb-[5px]">No Submissions Yet</div>
          <div className="text-[13px] text-[#6b7280]">You haven't submitted any appraisals to HR.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {submissions.map((a) => {
            const statusConfig = getStatusConfig(a.workflow?.status);
            
            // Extract complex schema mapping securely
            const fName = a.employeeId?.personalDetails?.firstName || 'Unknown';
            const lName = a.employeeId?.personalDetails?.lastName || '';
            const jobTitle = a.employeeId?.employmentDetails?.jobTitle || 'Staff';
            const quarter = a.period?.quarter || 'Q3';
            
            // Calculate actuals
            const iprf = a.calculatedResults?.finalIprfScore || 0;
            const prorate = (a.employeeId?.employmentDetails?.prorateValue || 12) / 12;
            const awardPct = (cpPct * iprf * prorate).toFixed(2);

            return (
              <div key={a._id} className="bg-white border border-[#E2DDD4] rounded-[12px] p-[16px_20px] flex flex-col sm:flex-row sm:items-center justify-between gap-[14px] hover:border-[#0D2B55]/30 transition-colors shadow-sm">
                <div className="flex-1">
                  <div className="text-[14px] font-[700] text-[#0D2B55]">{fName} {lName}</div>
                  <div className="text-[11px] text-[#6b7280] mt-[3px]">
                    {/* 🚨 UPGRADED: Added exact local time to the submission timestamp string */}
                    {jobTitle} &middot; {quarter} 2026 &middot; Submitted {new Date(a.updatedAt || a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(a.updatedAt || a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &middot; IPRF: {iprf.toFixed(1)} &mdash; Award: {awardPct}%
                  </div>
                  
                  {a.narrative?.generalComments && a.workflow?.status === 'REOPENED' && (
                    <div className="mt-[8px] bg-[#FEE2E2] p-[8px_12px] rounded-[6px] text-[11px] text-[#991B1B] border border-[#FECACA]">
                      <strong>HR Feedback:</strong> "{a.narrative.generalComments}"
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-[10px] flex-wrap shrink-0">
                  <span className={`text-[11px] font-[700] p-[4px_12px] rounded-full whitespace-nowrap ${statusConfig.badgeClass}`}>
                    {statusConfig.text}
                  </span>
                  <div className="text-[11px] text-[#6b7280] bg-[#FAF8F4] border border-[#E2DDD4] px-[10px] py-[4px] rounded-full font-mono">
                    ID: {a.appraisalRef || a._id.toString().slice(-6).toUpperCase()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}