'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../../../lib/api';
import usePersistentFilter from '../../../hooks/usePersistentFilter';

export default function EmployeeDashboard() {
  const router = useRouter();

  const currentYearNum = new Date().getFullYear();
  const currentYearStr = currentYearNum.toString();
  const yearOptions = [currentYearNum - 3, currentYearNum - 2, currentYearNum - 1, currentYearNum, currentYearNum + 1];

  const [selectedYear, setSelectedYear] = usePersistentFilter('emp_dash_year', currentYearStr);
  const [selectedQuarterName, setSelectedQuarterName] = usePersistentFilter('emp_dash_quarter', '');
  const [isManualYear, setIsManualYear] = useState(false);

  const [user, setUser] = useState(null);
  const [allMyAppraisals, setAllMyAppraisals] = useState([]);
  const [appraisal, setAppraisal] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [allQuarters, setAllQuarters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);
  
  const [activeQuarter, setActiveQuarter] = useState(null);
  const [viewDetailsModalOpen, setViewDetailsModalOpen] = useState(false);

  // 1. Fetch Base Data (User, Appraisals, Quarters)
  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        setLoading(true);
        
        const userCookie = Cookies.get('stip_user');
        if (!userCookie) {
          router.push('/login');
          return;
        }
        const sessionUser = JSON.parse(userCookie);

        const [meRes, appraisalsRes, quartersRes] = await Promise.all([
          api.get('/auth/me').catch(() => ({ data: { data: sessionUser } })),
          api.get('/appraisals').catch(() => ({ data: { data: [] } })),
          api.get('/quarters').catch(() => ({ data: { data: [] } }))
        ]);

        const myUser = meRes.data?.data || sessionUser;
        setUser(myUser);

        const allApps = appraisalsRes.data?.data || [];
        
        const myApps = allApps.filter(a => {
            const eId = a.employeeId?._id || a.employeeId || a.employee?._id || a.employee;
            return eId === myUser._id || a.employeeId?.employeeId === myUser.employeeId || a.employee?.employeeId === myUser.employeeId;
        });
        setAllMyAppraisals(myApps);

        const fetchedQuarters = quartersRes.data?.data || [];
        setAllQuarters(fetchedQuarters);

      } catch (error) {
        console.error('Failed to load employee base data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBaseData();
  }, [router]);

  // 2. The Loading Guard: Safely bind dropdown options to db availability
  useEffect(() => {
    if (allQuarters.length === 0) return;
    const qtrsForSelectedYear = allQuarters.filter(q => q.year.toString() === selectedYear.toString());
    
    if (qtrsForSelectedYear.length > 0) {
      const availableQs = [...new Set(qtrsForSelectedYear.map(q => q.name))].sort();
      
      if (!selectedQuarterName || !availableQs.includes(selectedQuarterName)) {
        const now = new Date();
        let active = qtrsForSelectedYear.find(q => {
          const start = new Date(q.startDate); start.setHours(0,0,0,0);
          const end = new Date(q.endDate); end.setHours(23,59,59,999);
          return now >= start && now <= end;
        });
        setSelectedQuarterName(active ? active.name : availableQs[availableQs.length - 1]);
      }
    } else {
      setSelectedQuarterName('');
    }
  }, [allQuarters, selectedYear, selectedQuarterName, setSelectedQuarterName]);

  // 3. Dynamic Metrics Fetch based on persistent filters
  useEffect(() => {
    const fetchDynamicMetrics = async () => {
      if (!selectedYear || !selectedQuarterName) {
         setMetrics(null);
         return;
      }
      try {
        const qMatch = String(selectedQuarterName).match(/Q?([1-4])/i);
        const targetMonth = qMatch ? parseInt(qMatch[1]) * 3 : 3;
        const metricsRes = await api.get(`/company-metrics/${selectedYear}/${targetMonth}`).catch(() => ({ data: { data: null } }));
        setMetrics(metricsRes.data?.data || null);
      } catch (error) {
        console.error('Failed to fetch dynamic company metrics', error);
      }
    };
    fetchDynamicMetrics();
  }, [selectedYear, selectedQuarterName]);

  // 4. Appraisal Target Matching
  useEffect(() => {
    if (selectedYear && selectedQuarterName && allQuarters.length > 0) {
      const foundQuarter = allQuarters.find(q => 
        q.year.toString() === selectedYear.toString() && q.name === selectedQuarterName
      );
      
      setActiveQuarter(foundQuarter || null);

      if (foundQuarter) {
        const targetAppraisal = allMyAppraisals.find(a => {
            const qId = a.appraisalQuarter?._id || a.appraisalQuarter || a.quarter?._id || a.quarterId;
            if (qId === foundQuarter._id) return true;
            
            const qName = a.period?.quarter || a.reviewPeriod?.quarter || a.quarter?.name || a.quarterName;
            const qYear = a.period?.year || a.reviewPeriod?.year || a.year || a.quarter?.year;
            return qName === foundQuarter.name && qYear.toString() === foundQuarter.year.toString();
        });
        
        setAppraisal(targetAppraisal || null);
      } else {
        setAppraisal(null);
      }
    } else {
        setAppraisal(null);
    }
  }, [selectedYear, selectedQuarterName, allQuarters, allMyAppraisals]);

  const handleAcknowledge = () => {
    setAcknowledged(true);
    alert(`You have successfully acknowledged your STIP Award for ${activeQuarter ? activeQuarter.year : 'this cycle'}!`);
  };

  // 🚨 UPGRADED: 887-point accurate dynamic calculation injected here
  const { financialResilience, operationalEffectiveness, humanCapital, safetyEnvironment, reputationalCapital } = metrics || {};
  
  let calcBscRaw = null;
  let safeCpPct = null;

  if (metrics) {
    const kpaActuals = [financialResilience, operationalEffectiveness, humanCapital, safetyEnvironment, reputationalCapital];
    const anyKpaEntered = kpaActuals.some(v => v !== null && v !== undefined);

    if (anyKpaEntered) {
      calcBscRaw = kpaActuals.reduce((sum, val, idx) => {
        const maxPts = [120, 400, 230, 110, 27][idx];
        const pts = ((val || 0) / 100) * maxPts;
        return sum + Number(pts.toFixed(1)); 
      }, 0);
      
      const rawCp = calcBscRaw / 100;
      safeCpPct = Math.round((rawCp + Number.EPSILON) * 100) / 100;
    }
  }

  const cpPct = safeCpPct;
  const bscRaw = calcBscRaw;

  const prMonths = user?.employmentDetails?.prorateValue || 12;
  const pr = prMonths / 12;
  const pct = Math.min(100, Math.round(pr * 100));

  const iprf = appraisal?.calculatedResults?.finalIprfScore || appraisal?.finalIprfScore || appraisal?.iprfScore || 0;
  
  let awardPct = '—';
  if (cpPct !== null && iprf > 0) {
    awardPct = (cpPct * iprf * pr).toFixed(2);
  } else if (appraisal?.stipAward) {
    awardPct = appraisal.stipAward.toFixed(2);
  }

  const iprfColor = (score) => {
    if (score >= 1.3) return '#1E40AF'; 
    if (score >= 1.0) return '#059669'; 
    if (score >= 0.7) return '#D97706'; 
    if (score > 0) return '#DC2626'; 
    return '#0D2B55'; 
  };

  const iprfLabel = (score) => {
    if (score >= 1.3) return 'Exceeds Performance';
    if (score >= 1.0) return 'Fully Effective';
    if (score >= 0.7) return 'Needs Improvement';
    if (score > 0) return 'Less than Satisfactory';
    return 'Not yet submitted';
  };

  const status = appraisal?.workflow?.status || appraisal?.status || 'DRAFT';
  const step1Done = !!appraisal && status !== 'DRAFT';
  const step2Done = step1Done && ['APPROVED_BY_HR', 'WITH_CEO', 'APPROVED', 'HR_APPROVED', 'ACKNOWLEDGED'].includes(status);
  const step3Done = step1Done && ['APPROVED', 'CEO_APPROVED', 'ACKNOWLEDGED'].includes(status);
  const step4Done = acknowledged || status === 'ACKNOWLEDGED';

  const getStatusDisplay = (currentStatus) => {
    if (!step1Done) return 'Not Started'; 
    switch(currentStatus) {
      case 'DRAFT': return 'Draft Saved';
      case 'SUBMITTED': 
      case 'UNDER_HR_REVIEW': return 'At HR';
      case 'APPROVED_BY_HR': 
      case 'HR_APPROVED':
      case 'WITH_CEO': return 'Pending CEO';
      case 'APPROVED': 
      case 'CEO_APPROVED': return 'CEO Approved';
      case 'ACKNOWLEDGED': return 'Acknowledged';
      case 'NOT_APPROVED': return 'Returned for Revision';
      case 'REOPENED': return 'Rejected by HR';
      default: return 'Pending Action';
    }
  };

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

  const filteredQuarterNames = allQuarters.filter(q => q.year.toString() === selectedYear).map(q => q.name);

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-[600] animate-pulse">Loading Your STIP Dashboard...</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px] flex justify-between items-start">
        <div>
          <h1 className="text-[24px] font-[800] text-[#0D2B55] mb-[4px]">My STIP Dashboard</h1>
          <p className="text-[13px] text-[#6b7280]">CY{activeQuarter ? activeQuarter.year : new Date().getFullYear()} &mdash; Short-Term Incentive Program overview</p>
        </div>
        {step3Done && !step4Done && (
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
          <span>Your {activeQuarter?.name || 'appraisal'} has not been submitted yet by your Line Manager. Deadline: <strong className="font-[800]">{activeQuarter ? new Date(activeQuarter.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Pending'}</strong>.</span>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px] mb-[24px]">
        
        {/* 🚨 UPGRADED: Navy Card strictly connected to the 887-point system */}
        <div className="bg-[#0D2B55] rounded-[14px] p-[20px] shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-white/50 mb-[4px]">My CP%</div>
            <div className="text-[32px] font-[800] text-[#e8c96a] leading-none mb-[6px]">{cpPct !== null ? cpPct.toFixed(2) + '%' : '—'}</div>
            <div className="text-[12px] font-[600] text-white/40">Company Performance Score</div>
          </div>
          <div>
            <div className="mt-[12px] h-[5px] bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#C9A84C] rounded-full transition-all duration-[600ms]" style={{ width: bscRaw !== null ? Math.min(100, (bscRaw / 887) * 100) + '%' : '0%' }}></div>
            </div>
            <div className="text-[10px] font-[600] text-white/35 mt-[6px]">BSC: {bscRaw !== null ? bscRaw.toFixed(1) : '—'} / 887</div>
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
              {step1Done && iprf > 0 ? iprf.toFixed(1) : '—'}
            </div>
            <div className="text-[12px] font-[600] text-[#6b7280] leading-[1.3] pr-[10px]">
              {step1Done ? iprfLabel(iprf) : 'Not yet submitted'}
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">My Award %</div>
            <div className="text-[32px] font-[800] text-[#059669] leading-none mb-[6px]">
              {step3Done ? `${awardPct}%` : '—'}
            </div>
            <div className="text-[12px] font-[600] text-[#6b7280] leading-[1.4] pr-[10px]">
              {step3Done ? 'Your final STIP award percentage' : (step1Done ? 'Pending final approval' : 'CP% × IPRF × Pro-Rata')}
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-[20px] mb-[20px]">
        
        {/* Appraisal Timeline Status */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center flex-wrap gap-[10px]">
            <div className="flex items-center gap-[12px]">
              <div className="w-[36px] h-[36px] rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[16px]">&#128203;</div>
              <div>
                <div className="text-[15px] font-[800] text-[#0D2B55]">{activeQuarter?.name || 'Appraisal'} Status</div>
                <div className="text-[12px] font-[500] text-[#6b7280]">Real-time status of your appraisal journey</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {step1Done && (
                <button 
                  onClick={() => setViewDetailsModalOpen(true)}
                  className="text-[11px] font-[700] text-[#0f1923] bg-white border border-[#E2DDD4] px-[12px] py-[8px] rounded-[6px] hover:border-[#0D2B55] transition-colors shadow-sm"
                >
                  View Details
                </button>
              )}
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  {isManualYear ? (
                    <input 
                      type="number" 
                      autoFocus
                      defaultValue={selectedYear}
                      onBlur={(e) => {
                        if (e.target.value) {
                          setSelectedYear(e.target.value);
                          const newQuarters = allQuarters.filter(q => q.year.toString() === e.target.value);
                          if (newQuarters.length > 0) setSelectedQuarterName(newQuarters[0].name);
                          else setSelectedQuarterName('');
                        }
                        setIsManualYear(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (e.target.value) {
                            setSelectedYear(e.target.value);
                            const newQuarters = allQuarters.filter(q => q.year.toString() === e.target.value);
                            if (newQuarters.length > 0) setSelectedQuarterName(newQuarters[0].name);
                            else setSelectedQuarterName('');
                          }
                          setIsManualYear(false);
                        }
                      }}
                      className="text-[12px] font-[800] text-[#0D2B55] bg-white border border-[#0D2B55] outline-none px-[14px] py-[8px] rounded-[8px] transition-colors shadow-sm w-[90px]"
                    />
                  ) : (
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        const newYear = e.target.value;
                        if (newYear === 'manual') {
                          setIsManualYear(true);
                        } else {
                          setSelectedYear(newYear);
                          const newQuarters = allQuarters.filter(q => q.year.toString() === newYear);
                          if (newQuarters.length > 0) setSelectedQuarterName(newQuarters[0].name);
                          else setSelectedQuarterName('');
                        }
                      }}
                      className="text-[12px] font-[800] text-[#0D2B55] bg-white border border-[#E2DDD4] outline-none px-[14px] py-[8px] pr-[30px] rounded-[8px] hover:border-[#C9A84C] cursor-pointer appearance-none transition-colors shadow-sm"
                    >
                      {yearOptions.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                      <option value="manual" className="font-bold text-[#1E40AF]">Enter Manually...</option>
                    </select>
                  )}
                  {!isManualYear && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#6b7280]">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={selectedQuarterName}
                    onChange={(e) => setSelectedQuarterName(e.target.value)}
                    disabled={!selectedYear || filteredQuarterNames.length === 0}
                    className={`text-[12px] font-[800] outline-none px-[14px] py-[8px] pr-[30px] rounded-[8px] appearance-none transition-colors shadow-sm min-w-[80px] ${selectedYear && filteredQuarterNames.length > 0 ? 'text-[#0D2B55] bg-white border border-[#E2DDD4] hover:border-[#C9A84C] cursor-pointer' : 'bg-slate-50 border-[#E2DDD4] text-[#94a3b8] cursor-not-allowed'}`}
                  >
                    {filteredQuarterNames.length === 0 && <option value="">No Quarters</option>}
                    {filteredQuarterNames.map(qName => (
                      <option key={qName} value={qName}>{qName}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#6b7280]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
            </div>
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
                <div className={`w-[32px] h-[32px] rounded-full border-[2.5px] flex items-center justify-center text-[12px] transition-colors ${status === 'REOPENED' ? 'bg-[#FEE2E2] border-[#FEE2E2] text-[#991B1B]' : step2Done ? 'bg-[#1E40AF] border-[#1E40AF] text-white' : 'bg-[#DBEAFE] border-[#DBEAFE] text-[#1E40AF]'}`}>
                  {status === 'REOPENED' ? '❌' : '👤'}
                </div>
                <div className="pt-[6px]">
                  <div className={`text-[14px] font-[800] mb-[2px] ${status === 'REOPENED' ? 'text-[#991B1B]' : step2Done ? 'text-[#0f1923]' : 'text-[#6b7280]'}`}>
                    {status === 'REOPENED' ? 'Rejected by HR' : 'HR Manager reviews'}
                  </div>
                  <div className="text-[13px] text-[#6b7280]">
                    {status === 'REOPENED' 
                      ? `Returned to Line Manager on ${appraisal.workflow?.rejectedAt ? new Date(appraisal.workflow.rejectedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}.`
                      : step2Done 
                        ? 'HR Manager approved and submitted to CEO.' 
                        : (step1Done ? 'Waiting for HR review.' : 'Pending Manager submission.')}
                  </div>
                </div>
              </div>

              {/* Step 3: CEO */}
              <div className="flex items-start gap-[16px] relative z-10">
                <div className={`w-[32px] h-[32px] rounded-full border-[2.5px] flex items-center justify-center text-[12px] transition-colors ${status === 'NOT_APPROVED' ? 'bg-[#FEE2E2] border-[#FEE2E2] text-[#991B1B]' : step3Done ? 'bg-[#D97706] border-[#D97706] text-white' : 'bg-[#FEF3C7] border-[#FEF3C7] text-[#D97706]'}`}>
                  {status === 'NOT_APPROVED' ? '❌' : '👑'}
                </div>
                <div className="pt-[6px]">
                  <div className={`text-[14px] font-[800] mb-[2px] ${status === 'NOT_APPROVED' ? 'text-[#991B1B]' : step3Done ? 'text-[#0f1923]' : 'text-[#6b7280]'}`}>
                    {status === 'NOT_APPROVED' ? 'Rejected by CEO' : 'CEO approves'}
                  </div>
                  <div className="text-[13px] text-[#6b7280]">
                    {status === 'NOT_APPROVED' 
                      ? `Returned for revision on ${appraisal.workflow?.rejectedAt ? new Date(appraisal.workflow.rejectedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}.`
                      : step3Done 
                        ? 'CEO approved your appraisal result.' 
                        : (step2Done ? 'Waiting for CEO decision.' : 'Pending prior steps.')}
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
                    {step4Done ? `Acknowledged` : (step3Done ? 'Action required — please acknowledge your result.' : 'Available after CEO approval.')}
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
                    {step3Done ? `${awardPct}%` : '—'}
                  </div>
                  <div className="text-[13px] font-[600] text-[#6b7280] mb-[12px]">
                    {iprfLabel(iprf)}
                  </div>
                  <div className="inline-block">
                    <span className={`px-[12px] py-[6px] rounded-full text-[11px] font-[800] uppercase tracking-wider ${step3Done ? 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]' : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'}`}>
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
              <div className="text-[14px] font-[800] text-[#0D2B55]">Cycle Deadline</div>
            </div>
            <div className="p-[24px] text-center flex-1 flex flex-col justify-center">
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

      {/* Appraisal Details Modal */}
      {viewDetailsModalOpen && appraisal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[600px] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-[20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-[18px] font-[800] text-[#0D2B55]">{activeQuarter?.name || 'Appraisal'} Details</h3>
                <p className="text-[12px] text-[#6b7280]">Review period: {activeQuarter?.year || new Date().getFullYear()}</p>
              </div>
              <button 
                onClick={() => setViewDetailsModalOpen(false)}
                className="w-[32px] h-[32px] rounded-full bg-white border border-[#E2DDD4] flex items-center justify-center text-[#6b7280] hover:text-[#0D2B55] hover:border-[#0D2B55] transition-colors"
              >
                &times;
              </button>
            </div>
            
            <div className="p-[24px] overflow-y-auto flex-1 custom-scrollbar space-y-[20px]">
              
              {/* IPRF Score Section */}
              <div className="bg-[#F8FAFC] border border-[#E2DDD4] rounded-[10px] p-[16px]">
                <div className="text-[11px] font-[800] text-[#6b7280] uppercase tracking-wider mb-[8px]">Calculated IPRF Factor</div>
                <div className="flex items-end gap-[12px]">
                  <div className="text-[32px] font-[800] leading-none" style={{ color: iprfColor(appraisal.calculatedResults?.finalIprfScore || 0) }}>
                    {(appraisal.calculatedResults?.finalIprfScore || 0).toFixed(2)}
                  </div>
                  <div className="text-[14px] font-[700] text-[#0f1923] mb-[4px]">
                    {iprfLabel(appraisal.calculatedResults?.finalIprfScore || 0)}
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div>
                <h4 className="text-[13px] font-[800] text-[#0D2B55] border-b border-[#E2DDD4] pb-[8px] mb-[12px]">Appraisal Comments & Feedback</h4>
                
                <div className="space-y-[16px]">
                  {/* Manager Comment */}
                  <div className="bg-white border border-[#E2DDD4] rounded-[8px] p-[12px] shadow-sm">
                    <div className="text-[11px] font-[700] text-[#1E40AF] mb-[4px]">Line Manager Notes</div>
                    <p className="text-[13px] text-[#475569] leading-relaxed whitespace-pre-wrap">
                      {appraisal.narrative?.generalComments || appraisal.narrative?.epJustification || <span className="italic text-[#94a3b8]">No notes provided.</span>}
                    </p>
                  </div>

                  {/* HR Comment (if exists) */}
                  {appraisal.narrative?.hrComments && (
                    <div className="bg-white border border-[#E2DDD4] rounded-[8px] p-[12px] shadow-sm">
                      <div className="text-[11px] font-[700] text-[#059669] mb-[4px]">HR Review Notes</div>
                      <p className="text-[13px] text-[#475569] leading-relaxed whitespace-pre-wrap">
                        {appraisal.narrative.hrComments}
                      </p>
                    </div>
                  )}

                  {/* CEO Comment (if exists) */}
                  {appraisal.narrative?.ceoComments && (
                    <div className="bg-white border border-[#E2DDD4] rounded-[8px] p-[12px] shadow-sm border-l-4 border-l-[#D97706]">
                      <div className="text-[11px] font-[700] text-[#D97706] mb-[4px]">CEO Final Decision Notes</div>
                      <p className="text-[13px] text-[#475569] leading-relaxed whitespace-pre-wrap">
                        {appraisal.narrative.ceoComments}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          </div>
        </div>
      )}

    </div>
  );
}