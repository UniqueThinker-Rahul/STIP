'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';

export default function Drafts() {
  const router = useRouter();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        setLoading(true);
        const res = await api.get('/appraisals').catch(() => ({ data: { data: [] } }));
        const allApps = res.data?.data || [];
        // FIX: Correct nested schema checking!
        setDrafts(allApps.filter(a => a.workflow?.status === 'DRAFT'));
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
    <div className="w-full max-w-full pb-[60px]">
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
            // FIX: Remap to complex schema
            const fName = d.employeeId?.personalDetails?.firstName || 'Unknown';
            const lName = d.employeeId?.personalDetails?.lastName || '';
            const jobTitle = d.employeeId?.employmentDetails?.jobTitle || 'Staff';
            const quarter = d.period?.quarter || 'Q3';

            return (
              <div key={d._id} className="bg-white border border-[#E2DDD4] rounded-[12px] p-[16px_20px] flex flex-col sm:flex-row sm:items-center justify-between gap-[14px] hover:border-[#0D2B55]/30 transition-colors shadow-sm">
                <div className="flex-1">
                  <div className="text-[14px] font-[700] text-[#0D2B55]">{fName} {lName}</div>
                  <div className="text-[11px] text-[#6b7280] mt-[3px]">
                    {jobTitle} &middot; {quarter} 2026 &middot; Last saved {new Date(d.updatedAt || d.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex items-center gap-[10px] flex-wrap justify-end">
                  <span className="text-[11px] font-[700] p-[3px_10px] rounded-full whitespace-nowrap bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                    &#128190; Draft
                  </span>
                  <div className="flex gap-[8px]">
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
    </div>
  );
}