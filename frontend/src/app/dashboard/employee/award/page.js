'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../../../../lib/api';

export default function EmployeeAward() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [appraisal, setAppraisal] = useState(null);
  const [loading, setLoading] = useState(true);

  // Constants
  const CP = 13.01;

  useEffect(() => {
    const fetchAwardData = async () => {
      try {
        setLoading(true);
        const userCookie = Cookies.get('stip_user');
        if (!userCookie) {
          router.push('/login');
          return;
        }
        const sessionUser = JSON.parse(userCookie);

        const [usersRes, appraisalsRes] = await Promise.all([
          api.get('/users').catch(() => ({ data: { data: [] } })),
          api.get('/appraisals').catch(() => ({ data: { data: [] } }))
        ]);

        const allUsers = usersRes.data?.data || [];
        const myUser = allUsers.find(u => u._id === sessionUser.id || u.employeeId === sessionUser.employeeId) || sessionUser;
        setUser(myUser);

        const allApps = appraisalsRes.data?.data || [];
        const myApp = allApps.find(a => (a.employeeId?._id || a.employeeId) === myUser._id || a.employeeId?.employeeId === myUser.employeeId);
        setAppraisal(myApp || null);

      } catch (error) {
        console.error('Failed to load award data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAwardData();
  }, [router]);

  const iprfLabel = (score) => {
    if (score >= 1.3) return 'Exceeds Performance';
    if (score >= 1.0) return 'Fully Effective';
    if (score >= 0.7) return 'Needs Improvement';
    if (score > 0) return 'Less than Satisfactory';
    return 'Not yet submitted';
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-[600] animate-pulse">Loading Award Information...</div>;
  }

  if (!user) return null;

  const prMonths = user?.employmentDetails?.prorateValue || 12;
  const pr = prMonths / 12;

  const iprf = appraisal?.calculatedResults?.finalIprfScore || 0;
  const status = appraisal?.workflow?.status;
  const isApproved = status === 'APPROVED';
  
  const awardPct = isApproved ? (CP * iprf * pr).toFixed(2) : null;
  const myT = iprf >= 1.3 ? 'ep' : iprf >= 1.0 ? 'e' : iprf >= 0.7 ? 'ni' : iprf > 0 ? 'ls' : '';

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
          &#127942; My STIP Award
        </div>
        <div className="text-[13px] text-[#6b7280]">
          Your calculated Short-Term Incentive Payment for CY2026
        </div>
      </div>
      
      <div className="bg-[#DBEAFE] border-[1.5px] border-[#BFDBFE] text-[#1E40AF] rounded-[10px] p-[12px_16px] text-[13px] mb-[20px] shadow-sm flex items-start gap-[10px]">
        <span className="text-[18px] leading-none">&#8505;</span> 
        <div className="leading-[1.5]">
          STIP Award = CP% &times; IPRF Factor &times; Pro-Rata &times; Base Salary. Your award is calculated once your appraisal is CEO-approved and the scorecard is locked.
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-[20px]">
        
        {/* Left Column */}
        <div className="flex flex-col gap-[16px]">
          
          {/* Award Calculation */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FFFBEB] flex items-center justify-center text-[14px]">&#129518;</div>
              <div>
                <div className="text-[14px] font-[800] text-[#0D2B55]">Award Calculation</div>
                <div className="text-[11px] text-[#6b7280]">Full breakdown of your STIP award</div>
              </div>
            </div>
            
            <div className="p-[20px]">
              <div className="flex flex-col gap-[8px] mb-[20px] text-[13px]">
                <div className="flex justify-between py-[10px] border-b border-[#E2DDD4]">
                  <span className="text-[#6b7280] font-[600]">Company Performance (CP%)</span>
                  <span className="font-[800] text-[#0D2B55]">13.01%</span>
                </div>
                <div className="flex justify-between py-[10px] border-b border-[#E2DDD4]">
                  <span className="text-[#6b7280] font-[600]">IPRF Factor (my rating)</span>
                  <span className="font-[800] text-[#0D2B55]">{appraisal ? `${iprf.toFixed(1)} (${iprfLabel(iprf)})` : '—'}</span>
                </div>
                <div className="flex justify-between py-[10px] border-b border-[#E2DDD4]">
                  <span className="text-[#6b7280] font-[600]">Pro-Rata</span>
                  <span className="font-[800] text-[#0D2B55]">{pr.toFixed(3)}</span>
                </div>
                <div className="flex justify-between py-[10px] border-b border-[#E2DDD4]">
                  <span className="text-[#6b7280] font-[600]">Base Award %</span>
                  <span className="font-[800] text-[#D97706]">{appraisal ? (CP * iprf).toFixed(2) + '%' : '—'}</span>
                </div>
                <div className="flex justify-between py-[10px]">
                  <span className="text-[#6b7280] font-[800]">Final Award %</span>
                  <span className="font-[800] text-[16px] text-[#059669]">
                    {isApproved ? `${awardPct}%` : 'Pending approval'}
                  </span>
                </div>
              </div>
              
              <div className="bg-[#0D2B55] rounded-[14px] p-[20px] flex items-center justify-between flex-wrap gap-[12px] shadow-inner mb-[12px]">
                <div>
                  <div className="text-[10px] text-white/50 font-[800] uppercase tracking-widest mb-[6px]">Formula</div>
                  <div className="text-[14px] text-white/80 font-mono font-[600]">13.01% &times; IPRF &times; Pro-Rata</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-white/50 font-[800] uppercase tracking-widest mb-[4px]">My Award %</div>
                  <div className="text-[36px] font-[800] text-[#e8c96a] leading-none">
                    {isApproved ? `${awardPct}%` : '—'}
                  </div>
                </div>
              </div>
              
              <div className="bg-[#FEF3C7] rounded-[8px] p-[12px_16px] text-[11px] font-[600] text-[#92400E] leading-[1.6]">
                &#9888; All STIP award amounts are <strong className="font-[800]">gross before tax</strong>. Income tax will be deducted by payroll as per FSM tax regulations.
              </div>
            </div>
          </div>

          {/* All rating scenarios */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#DBEAFE] flex items-center justify-center text-[14px]">&#128176;</div>
              <div>
                <div className="text-[14px] font-[800] text-[#0D2B55]">Award at Each Rating Level</div>
                <div className="text-[11px] text-[#6b7280]">What you would receive under each IPRF</div>
              </div>
            </div>
            <div className="p-[20px] flex flex-col gap-[12px]">
              
              {/* LS */}
              <div className={`p-[14px_16px] rounded-[10px] flex justify-between items-center transition-all ${myT === 'ls' ? 'bg-[#FEE2E2] border-[2px] border-[#DC2626] shadow-md scale-[1.02]' : 'bg-[#FAF8F4] border border-[#E2DDD4]'}`}>
                <div>
                  <div className={`text-[13px] font-[800] mb-[4px] ${myT === 'ls' ? 'text-[#991B1B]' : 'text-[#0f1923]'}`}>0.0 &mdash; Less than Satisfactory</div>
                  <div className="text-[11px] text-[#6b7280] font-mono font-[600]">13.01% &times; 0.0 &times; {pr.toFixed(3)} = 0.00%</div>
                </div>
                <div className={`text-[18px] font-[800] ${myT === 'ls' ? 'text-[#991B1B]' : 'text-[#0D2B55]'}`}>0.00%</div>
              </div>

              {/* NI */}
              <div className={`p-[14px_16px] rounded-[10px] flex justify-between items-center transition-all ${myT === 'ni' ? 'bg-[#FEF3C7] border-[2px] border-[#D97706] shadow-md scale-[1.02]' : 'bg-[#FAF8F4] border border-[#E2DDD4]'}`}>
                <div>
                  <div className={`text-[13px] font-[800] mb-[4px] ${myT === 'ni' ? 'text-[#92400E]' : 'text-[#0f1923]'}`}>0.7 &mdash; Needs Improvement</div>
                  <div className="text-[11px] text-[#6b7280] font-mono font-[600]">13.01% &times; 0.7 &times; {pr.toFixed(3)} = {(CP * 0.7 * pr).toFixed(2)}%</div>
                </div>
                <div className={`text-[18px] font-[800] ${myT === 'ni' ? 'text-[#92400E]' : 'text-[#0D2B55]'}`}>{(CP * 0.7 * pr).toFixed(2)}%</div>
              </div>

              {/* E */}
              <div className={`p-[14px_16px] rounded-[10px] flex justify-between items-center transition-all ${myT === 'e' ? 'bg-[#D1FAE5] border-[2px] border-[#059669] shadow-md scale-[1.02]' : 'bg-[#FAF8F4] border border-[#E2DDD4]'}`}>
                <div>
                  <div className={`text-[13px] font-[800] mb-[4px] ${myT === 'e' ? 'text-[#065F46]' : 'text-[#0f1923]'}`}>1.0 &mdash; Fully Effective</div>
                  <div className="text-[11px] text-[#6b7280] font-mono font-[600]">13.01% &times; 1.0 &times; {pr.toFixed(3)} = {(CP * 1.0 * pr).toFixed(2)}%</div>
                </div>
                <div className={`text-[18px] font-[800] ${myT === 'e' ? 'text-[#065F46]' : 'text-[#0D2B55]'}`}>{(CP * 1.0 * pr).toFixed(2)}%</div>
              </div>

              {/* EP */}
              <div className={`p-[14px_16px] rounded-[10px] flex justify-between items-center transition-all ${myT === 'ep' ? 'bg-[#DBEAFE] border-[2px] border-[#1E40AF] shadow-md scale-[1.02]' : 'bg-[#FAF8F4] border border-[#E2DDD4]'}`}>
                <div>
                  <div className={`text-[13px] font-[800] mb-[4px] ${myT === 'ep' ? 'text-[#1E40AF]' : 'text-[#0f1923]'}`}>1.3 &mdash; Exceeds Performance</div>
                  <div className="text-[11px] text-[#6b7280] font-mono font-[600]">13.01% &times; 1.3 &times; {pr.toFixed(3)} = {(CP * 1.3 * pr).toFixed(2)}%</div>
                </div>
                <div className={`text-[18px] font-[800] ${myT === 'ep' ? 'text-[#1E40AF]' : 'text-[#0D2B55]'}`}>{(CP * 1.3 * pr).toFixed(2)}%</div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-[16px]">
          
          {/* My Result Compact */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#D1FAE5] flex items-center justify-center text-[14px]">&#9989;</div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">My Result</div>
            </div>
            <div className="p-[24px] text-center flex flex-col items-center">
              <div className="text-[48px] font-[800] text-[#059669] mb-[8px] leading-none">
                {isApproved ? `${awardPct}%` : '—'}
              </div>
              <div className="text-[13px] font-[600] text-[#6b7280] mb-[16px]">
                {isApproved ? iprfLabel(iprf) : 'Not yet approved'}
              </div>
              
              {isApproved ? (
                <span className="bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] px-[16px] py-[6px] rounded-full text-[12px] font-[800] flex items-center gap-[6px]">
                  &#10003; CEO Approved
                </span>
              ) : appraisal ? (
                <span className="bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-[16px] py-[6px] rounded-full text-[12px] font-[800] flex items-center gap-[6px]">
                  &#9200; Pending Approval
                </span>
              ) : null}
            </div>
          </div>

          {/* Criteria Reference */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[14px]">&#128200;</div>
              <div>
                <div className="text-[14px] font-[800] text-[#0D2B55]">Appraisal Criteria</div>
                <div className="text-[11px] text-[#6b7280]">Your 6 ratings</div>
              </div>
            </div>
            <div className="p-[20px]">
              {!appraisal ? (
                <div className="text-center text-[12px] font-[600] text-[#6b7280] py-[10px]">
                  Ratings visible after appraisal is submitted
                </div>
              ) : (
                <div className="flex flex-col gap-[12px]">
                  {Object.entries(CRIT_NAMES).map(([key, name]) => {
                    const rating = appraisal.scores?.[key]?.rating || 0;
                    const col = iprfColor(rating);
                    const lbl = {0:'LS',0.7:'NI',1:'E',1.3:'EP'}[rating] || rating;
                    return (
                      <div key={key} className="flex justify-between items-center text-[12px] border-b border-[#E2DDD4] pb-[10px] last:border-0 last:pb-0">
                        <span className="font-[600] text-[#0f1923] flex-1">{name}</span>
                        <span className="text-[#6b7280] w-[30px] text-right font-[600] mr-[10px]">{CRIT_WTS[key]}</span>
                        <span className="font-[800] w-[60px] text-right" style={{color: col}}>{rating.toFixed(1)} &mdash; {lbl}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}