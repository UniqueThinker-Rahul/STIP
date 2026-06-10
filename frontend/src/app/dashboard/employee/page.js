'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../../../lib/api';

export default function EmployeeDashboard() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [appraisal, setAppraisal] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false); // Local state for acknowledgement demo
  
  // 🚨 NEW: State for active quarter
  const [activeQuarter, setActiveQuarter] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // 1. Get Logged In User Session
        const userCookie = Cookies.get('stip_user');
        if (!userCookie) {
          router.push('/login');
          return;
        }
        const sessionUser = JSON.parse(userCookie);

        // 2. Fetch Live Data
        const [usersRes, metricsRes, appraisalsRes, quartersRes] = await Promise.all([
          api.get('/users').catch(() => ({ data: { data: [] } })),
          api.get('/company-metrics/2026').catch(() => ({ data: { data: null } })),
          api.get('/appraisals').catch(() => ({ data: { data: [] } })),
          api.get('/quarters').catch(() => ({ data: { data: [] } }))
        ]);

        // Find my specific user details for accurate Pro-Rata
        const allUsers = usersRes.data?.data || [];
        const myUser = allUsers.find(u => u._id === sessionUser.id || u.employeeId === sessionUser.employeeId) || sessionUser;
        setUser(myUser);

        setMetrics(metricsRes.data?.data || null);

        // Find my specific appraisal
        const allApps = appraisalsRes.data?.data || [];
        // The backend might already filter this to just ours based on the EMPLOYEE role, but we check to be safe
        const myApp = allApps.find(a => (a.employeeId?._id || a.employeeId) === myUser._id || a.employeeId?.employeeId === myUser.employeeId);
        setAppraisal(myApp || null);

        // 🚨 NEW: Find active quarter
        const allQuarters = quartersRes.data?.data || [];
        const now = new Date();
        let currentActive = allQuarters.find(q => {
          const start = new Date(q.startDate); start.setHours(0,0,0,0);
          const end = new Date(q.endDate); end.setHours(23,59,59,999);
          return now >= start && now <= end;
        });
        
        if (!currentActive && allQuarters.length > 0) {
            currentActive = allQuarters[0]; 
        }
        
        if (currentActive) {
            setActiveQuarter(currentActive);
        }

      } catch (error) {
        console.error('Failed to load employee dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const handleAcknowledge = () => {
    setAcknowledged(true);
    alert("You have successfully acknowledged your STIP Award for CY2026!");
  };

  // Calculations
  const cpPct = metrics?.cpPct || null;
  const bscRaw = metrics?.bscRawScore || null;

  const prMonths = user?.employmentDetails?.prorateValue || 12;
  const pr = prMonths / 12;
  const pct = Math.min(100, Math.round(pr * 100));

  const iprf = appraisal?.calculatedResults?.finalIprfScore || 0;
  
  let awardPct = '—';
  if (cpPct !== null && iprf > 0) {
    awardPct = (cpPct * iprf * pr).toFixed(2);
  } else if (appraisal?.stipAward) {
    awardPct = appraisal.stipAward.toFixed(2);
  }

  const iprfColor = (score) => {
    if (score >= 1.3) return '#1E40AF'; // Blue
    if (score >= 1.0) return '#059669'; // Green
    if (score >= 0.7) return '#D97706'; // Amber
    if (score > 0) return '#DC2626'; // Red
    return '#0D2B55'; // Navy Default
  };

  const iprfLabel = (score) => {
    if (score >= 1.3) return 'Exceeds Performance';
    if (score >= 1.0) return 'Fully Effective';
    if (score >= 0.7) return 'Needs Improvement';
    if (score > 0) return 'Less than Satisfactory';
    return 'Not yet submitted';
  };

  const getStatusDisplay = (status) => {
    switch(status) {
      case 'DRAFT': return 'Draft Saved';
      case 'SUBMITTED': 
      case 'UNDER_HR_REVIEW': return 'At HR';
      case 'APPROVED_BY_HR': 
      case 'WITH_CEO': return 'Pending CEO';
      case 'APPROVED': return 'CEO Approved';
      case 'NOT_APPROVED': 
      case 'REOPENED': return 'Returned for Revision';
      default: return 'Pending Action';
    }
  };

  // Timeline Logic
  const status = appraisal?.workflow?.status;
  const step1Done = !!appraisal && status !== 'DRAFT';
  const step2Done = step1Done && ['APPROVED_BY_HR', 'WITH_CEO', 'APPROVED'].includes(status);
  const step3Done = status === 'APPROVED';
  const step4Done = acknowledged;

  // 🚨 NEW: Dynamic countdown logic
  let daysRemaining = null;
  if (activeQuarter) {
    const now = new Date();
    const end = new Date(activeQuarter.endDate); end.setHours(23,59,59,999);
    if (end > now) {
        const diffTime = Math.abs(end - now);
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  const formatDeadlineDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    return `${day} ${month}`;
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-[600] animate-pulse">Loading Your STIP Dashboard...</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px] flex justify-between items-start">
        <div>
          <h1 className="text-[24px] font-[800] text-[#0D2B55] mb-[4px]">My STIP Dashboard</h1>
          {/* 🚨 UPGRADED: Dynamic Year */}
          <p className="text-[13px] text-[#6b7280]">CY{activeQuarter ? activeQuarter.year : '2026'} &mdash; Short-Term Incentive Program overview</p>
        </div>
        {status === 'APPROVED' && !acknowledged && (
          <button 
            onClick={handleAcknowledge}
            className="bg-[#0D2B55] hover:bg-[#1a3d6e] text-white px-[16px] py-[10px] rounded-[8px] text-[13px] font-[800] transition-colors shadow-sm flex items-center gap-[6px]"
          >
            &#9997; Acknowledge My Result
          </button>
        )}
      </div>

      {/* Alert Banner */}
      {!step1Done && (
        <div className="bg-[#FFFBEB] border-[1.5px] border-[#FDE68A] text-[#92400E] rounded-[10px] p-[12px_16px] text-[13px] mb-[20px] shadow-sm flex items-center gap-[8px]">
          <span className="text-[16px] leading-none">&#9200;</span> 
          {/* 🚨 UPGRADED: Dynamic text and date */}
          <span>Your {activeQuarter?.name || 'appraisal'} has not been submitted yet by your Line Manager. Deadline: <strong className="font-[800]">{activeQuarter ? new Date(activeQuarter.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Pending'}</strong>.</span>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px] mb-[24px]">
        
        <div className="bg-[#0D2B55] rounded-[14px] p-[20px] shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-white/50 mb-[4px]">My CP%</div>
            <div className="text-[32px] font-[800] text-[#e8c96a] leading-none mb-[6px]">{cpPct !== null ? cpPct.toFixed(2) + '%' : '—'}</div>
            <div className="text-[12px] font-[600] text-white/40">Company Performance Score</div>
          </div>
          <div>
            <div className="mt-[12px] h-[5px] bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#C9A84C] rounded-full transition-all duration-[600ms]" style={{ width: cpPct !== null ? bscRaw + '%' : '0%' }}></div>
            </div>
            <div className="text-[10px] font-[600] text-white/35 mt-[6px]">BSC: {bscRaw !== null ? bscRaw.toFixed(2) : '—'} / 100</div>
          </div>
        </div>

        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">My Pro-Rata</div>
            <div className="text-[32px] font-[800] text-[#0D2B55] leading-none mb-[6px]">{pr.toFixed(3)}</div>
            <div className="text-[12px] font-[600] text-[#6b7280]">{prMonths.toFixed(2)} / 12 months</div>
          </div>
          <div className="mt-[12px] h-[7px] bg-[#E2DDD4] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#059669] to-[#C9A84C] rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
          </div>
        </div>

        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">My IPRF Rating</div>
            <div className="text-[32px] font-[800] leading-none mb-[6px]" style={{ color: iprfColor(iprf) }}>
              {iprf > 0 ? iprf.toFixed(1) : '—'}
            </div>
            <div className="text-[12px] font-[600] text-[#6b7280] leading-[1.3] pr-[10px]">
              {iprfLabel(iprf)}
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">My Award %</div>
            <div className="text-[32px] font-[800] text-[#059669] leading-none mb-[6px]">
              {status === 'APPROVED' ? `${awardPct}%` : '—'}
            </div>
            <div className="text-[12px] font-[600] text-[#6b7280] leading-[1.4] pr-[10px]">
              {status === 'APPROVED' ? 'Your final STIP award percentage' : (appraisal ? 'Pending final approval' : 'CP% × IPRF × Pro-Rata')}
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-[20px] mb-[20px]">
        
        {/* Appraisal Timeline Status */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center">
            <div className="flex items-center gap-[12px]">
              <div className="w-[36px] h-[36px] rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[16px]">&#128203;</div>
              <div>
                {/* 🚨 UPGRADED: Dynamic Quarter Name */}
                <div className="text-[15px] font-[800] text-[#0D2B55]">{activeQuarter?.name || 'Appraisal'} Status</div>
                <div className="text-[12px] font-[500] text-[#6b7280]">Real-time status of your appraisal journey</div>
              </div>
            </div>
            <button className="text-[11px] font-[700] text-[#0f1923] bg-white border border-[#E2DDD4] px-[12px] py-[6px] rounded-[6px] hover:border-[#0D2B55] transition-colors shadow-sm">
              View Details
            </button>
          </div>
          
          <div className="p-[30px_24px] flex-1">
            <div className="flex flex-col gap-[28px] relative">
              {/* Connecting Line */}
              <div className="absolute top-[16px] bottom-[16px] left-[15px] w-[2px] bg-[#E2DDD4] z-0"></div>

              {/* Step 1: Manager */}
              <div className="flex items-start gap-[16px] relative z-10">
                <div className={`w-[32px] h-[32px] rounded-full border-[2.5px] flex items-center justify-center text-[12px] bg-[#0D2B55] border-[#0D2B55] text-white`}>
                  &#128101;
                </div>
                <div className="pt-[6px]">
                  <div className={`text-[14px] font-[800] mb-[2px] ${step1Done ? 'text-[#0f1923]' : 'text-[#6b7280]'}`}>Line Manager submits appraisal</div>
                  <div className="text-[13px] text-[#6b7280]">
                    {step1Done ? `Submitted ${activeQuarter?.name || ''} appraisal. IPRF: ${iprf.toFixed(1)} — ${iprfLabel(iprf)}` : 'Your manager has not submitted your appraisal yet.'}
                  </div>
                </div>
              </div>

              {/* Step 2: HR */}
              <div className="flex items-start gap-[16px] relative z-10">
                <div className={`w-[32px] h-[32px] rounded-full border-[2.5px] flex items-center justify-center text-[12px] transition-colors ${step2Done ? 'bg-[#1E40AF] border-[#1E40AF] text-white' : 'bg-[#DBEAFE] border-[#DBEAFE] text-[#1E40AF]'}`}>
                  &#128100;
                </div>
                <div className="pt-[6px]">
                  <div className={`text-[14px] font-[800] mb-[2px] ${step2Done ? 'text-[#0f1923]' : 'text-[#6b7280]'}`}>HR Manager reviews</div>
                  <div className="text-[13px] text-[#6b7280]">
                    {step2Done ? 'HR Manager approved and submitted to CEO.' : 'Waiting for HR review.'}
                  </div>
                </div>
              </div>

              {/* Step 3: CEO */}
              <div className="flex items-start gap-[16px] relative z-10">
                <div className={`w-[32px] h-[32px] rounded-full border-[2.5px] flex items-center justify-center text-[12px] transition-colors ${step3Done ? 'bg-[#D97706] border-[#D97706] text-white' : 'bg-[#FEF3C7] border-[#FEF3C7] text-[#D97706]'}`}>
                  &#128081;
                </div>
                <div className="pt-[6px]">
                  <div className={`text-[14px] font-[800] mb-[2px] ${step3Done ? 'text-[#0f1923]' : 'text-[#6b7280]'}`}>CEO approves</div>
                  <div className="text-[13px] text-[#6b7280]">
                    {step3Done ? 'CEO approved your appraisal result.' : 'Waiting for CEO decision.'}
                  </div>
                </div>
              </div>

              {/* Step 4: Acknowledge */}
              <div className="flex items-start gap-[16px] relative z-10">
                <div className={`w-[32px] h-[32px] rounded-full border-[2.5px] flex items-center justify-center text-[12px] transition-colors ${step4Done ? 'bg-[#059669] border-[#059669] text-white' : 'bg-[#D1FAE5] border-[#D1FAE5] text-[#059669]'}`}>
                  &#9989;
                </div>
                <div className="pt-[6px]">
                  <div className={`text-[14px] font-[800] mb-[2px] ${step4Done ? 'text-[#0f1923]' : 'text-[#6b7280]'}`}>You acknowledge</div>
                  <div className="text-[13px] text-[#6b7280]">
                    {step4Done ? `Acknowledged on ${new Date().toLocaleDateString('en-GB')}` : (step3Done ? 'Action required — please acknowledge your result.' : 'Available after CEO approval.')}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Sidebar Columns */}
        <div className="flex flex-col gap-[16px]">
          
          {/* Potential Award */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FFFBEB] flex items-center justify-center text-[14px]">&#128176;</div>
              <div>
                <div className="text-[14px] font-[800] text-[#0D2B55]">Potential Award</div>
                <div className="text-[11px] text-[#6b7280]">Based on current status</div>
              </div>
            </div>
            <div className="p-[24px] text-center flex-1 flex flex-col justify-center">
              {!step1Done ? (
                <div className="text-[#6b7280] text-[12px] font-[600]">
                  Award calculated after appraisal approval
                </div>
              ) : (
                <div>
                  <div className="text-[42px] font-[800] leading-none mb-[8px]" style={{ color: iprfColor(iprf) }}>
                    {status === 'APPROVED' ? `${awardPct}%` : '—'}
                  </div>
                  <div className="text-[13px] font-[600] text-[#6b7280] mb-[12px]">
                    {iprfLabel(iprf)}
                  </div>
                  <div className="inline-block">
                    <span className={`px-[12px] py-[6px] rounded-full text-[11px] font-[800] uppercase tracking-wider ${status === 'APPROVED' ? 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]' : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'}`}>
                      {getStatusDisplay(status)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Next Deadline */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FEF3C7] flex items-center justify-center text-[14px]">&#128197;</div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">Next Deadline</div>
            </div>
            <div className="p-[24px] text-center flex-1 flex flex-col justify-center">
              {/* 🚨 UPGRADED: Fully dynamic next deadline data */}
              <div className="text-[36px] font-[800] text-[#92400E] leading-none mb-[6px]">
                {activeQuarter ? formatDeadlineDate(activeQuarter.endDate) : '—'}
              </div>
              <div className="text-[12px] font-[600] text-[#6b7280] mb-[12px]">
                {activeQuarter ? `${activeQuarter.name} submission deadline` : 'No active quarter'}
              </div>
              
              {daysRemaining !== null ? (
                <div className="inline-block">
                  <span className="px-[12px] py-[4px] rounded-[6px] text-[11px] font-[700] bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                    {daysRemaining} days remaining
                  </span>
                </div>
              ) : (
                <div className="inline-block">
                  <span className="px-[12px] py-[4px] rounded-[6px] text-[11px] font-[700] bg-[#FAF8F4] text-[#6b7280] border border-[#E2DDD4]">
                    Deadline passed
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}