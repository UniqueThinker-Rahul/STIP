'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

// Fallback colors for dynamically generated company badges
const BADGE_COLORS = [
  'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]', // Blue
  'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]', // Green
  'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]', // Amber
  'bg-[#EDE9FE] text-[#4C1D95] border-[#DDD6FE]', // Purple
  'bg-[#FCE7F3] text-[#9D174D] border-[#FBCFE8]', // Pink
  'bg-[#CCFBF1] text-[#115E59] border-[#99F6E4]'  // Teal
];

export default function CEODashboard() {
  const router = useRouter();

  // State
  const [appraisals, setAppraisals] = useState([]);
  const [staff, setStaff] = useState([]); // Need raw staff array to calculate company specific counts
  const [totalStaff, setTotalStaff] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // 🚨 UPGRADE: Dynamic Company Codes State
  const [companyCodes, setCompanyCodes] = useState([]);
  
  // Real KPA actuals state (fetched from backend)
  const [kpaActuals, setKpaActuals] = useState([null, null, null, null, null]);
  const [bscRaw, setBscRaw] = useState(null);
  const [cpPct, setCpPct] = useState(null);
  const [locked, setLocked] = useState(false);
  const [lockedAt, setLockedAt] = useState('');

  // Fetch Live Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data points concurrently
        const [appRes, usersRes, metricsRes, configRes] = await Promise.all([
           api.get('/appraisals').catch(() => ({ data: { data: [] } })),
           api.get('/users').catch(() => ({ data: { data: [] } })),
           api.get('/company-metrics/2026').catch(() => ({ data: { data: null } })),
           api.get('/config/dropdowns').catch(() => ({ data: { data: {} } })) // 🚨 Fetch DB config
        ]);

        const allApps = appRes.data?.data || [];
        setAppraisals(allApps);

        const allUsers = usersRes.data?.data || [];
        setStaff(allUsers);
        setTotalStaff(allUsers.length || 190);

        // 🚨 UPGRADE: Set the dynamic company codes from the DB
        if (configRes.data?.data?.companyCodes) {
          setCompanyCodes(configRes.data.data.companyCodes);
        } else {
          // Fallback just in case the DB is empty
          setCompanyCodes(['FSM', 'CDU', 'NAR', 'GUM']);
        }

        const metricsData = metricsRes.data?.data;

        if (metricsData) {
          setKpaActuals([
            metricsData.financialResilience,
            metricsData.operationalEffectiveness,
            metricsData.humanCapital,
            metricsData.safetyEnvironment,
            metricsData.reputationalCapital
          ]);
          setBscRaw(metricsData.bscRawScore);
          setCpPct(metricsData.cpPct);
          setLocked(metricsData.locked);
          if (metricsData.lockedAt) {
            setLockedAt(new Date(metricsData.lockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
          }
        }
      } catch (error) {
        console.error('Failed to load live data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Dynamically calculate counts from the DB
  const epCount = appraisals.filter(a => a.calculatedResults?.finalIprfScore >= 1.3).length;
  const pendingCount = appraisals.filter(a => a.workflow?.status === 'WITH_CEO').length;
  const approvedCount = appraisals.filter(a => a.workflow?.status === 'APPROVED').length;
  const rejectedCount = appraisals.filter(a => a.workflow?.status === 'NOT_APPROVED').length;

  const awNIf = cpPct ? `CP% × 0.7 × Pro-Rata` : 'CP% × 0.7 × Pro-Rata';
  const awEf = cpPct ? `CP% × 1.0 × Pro-Rata` : 'CP% × 1.0 × Pro-Rata';
  const awEPf = cpPct ? `CP% × 1.3 × Pro-Rata` : 'CP% × 1.3 × Pro-Rata';

  const anyKpaEntered = kpaActuals.some(v => v !== null);

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-medium animate-pulse">Loading Executive Dashboard...</div>;
  }

  return (
    <div className="w-full max-w-full pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px] flex justify-between items-end">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">CEO Dashboard</div>
          <div className="text-[13px] text-[#6b7280]">Real-time STIP program overview &mdash; CY2026</div>
        </div>
        <button className="bg-[#C9A84C] hover:bg-[#b59540] text-[#0D2B55] text-[12px] font-[800] px-[16px] py-[8px] rounded-[8px] transition-colors shadow-sm" onClick={() => router.push('/dashboard/ceo/kpa')}>
          &#9997; Enter KPA Scores
        </button>
      </div>

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px] mb-[20px]">
        
        {/* CP% Card */}
        <div className="bg-[#0D2B55] rounded-[14px] p-[20px] shadow-sm relative overflow-hidden">
          <div className="text-[11px] font-[700] uppercase tracking-widest text-white/50 mb-[4px]">Company Performance (CP%)</div>
          <div className="text-[32px] font-[800] text-[#e8c96a] leading-none mb-[8px]">{cpPct !== null ? cpPct.toFixed(2) + '%' : '—'}</div>
          <div className="text-[12px] font-[600] text-white/40">BSC Raw Score: <span className="text-white/80">{bscRaw !== null ? bscRaw.toFixed(2) : '—'}</span> / 100</div>
          <div className="mt-[12px] h-[5px] bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#C9A84C] rounded-full transition-all duration-[600ms]" style={{ width: cpPct !== null ? bscRaw + '%' : '0%' }}></div>
          </div>
        </div>
        
        {/* Total Staff Card */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">Total Staff Covered</div>
            <div className="text-[32px] font-[800] text-[#0D2B55] leading-none mb-[8px]">{totalStaff}</div>
            <div className="text-[12px] font-[600] text-[#6b7280]">STIP-eligible employees</div>
          </div>
          {/* 🚨 UPGRADE: Dynamic Map for Company Code Badges with Auto-Scroll */}
          <div className="flex gap-[6px] mt-[12px] overflow-x-auto pb-1 custom-scrollbar whitespace-nowrap">
            {companyCodes.map((code, index) => {
              const count = staff.filter(s => s.companyCode === code).length || 0;
              const colorClass = BADGE_COLORS[index % BADGE_COLORS.length];
              return (
                <span key={code} className={`text-[10px] font-[800] px-[6px] py-[2px] rounded border ${colorClass} shrink-0`}>
                  {code} {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* EP Rated Card */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm">
          <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">EP Rated Staff</div>
          <div className="flex items-baseline gap-[6px] mb-[8px]">
            <div className="text-[32px] font-[800] text-[#1E40AF] leading-none">{epCount}</div>
            <div className="text-[14px] font-[800] text-[#6b7280]">/ 9 max</div>
          </div>
          <div className="text-[12px] font-[600] text-[#6b7280]">Cap = 5% of {totalStaff} staff</div>
          <div className="mt-[12px] h-[7px] bg-[#DBEAFE] rounded-full overflow-hidden">
            <div className="h-full bg-[#1E40AF] rounded-full transition-all duration-500" style={{ width: Math.min(100, (epCount / 9) * 100) + '%' }}></div>
          </div>
        </div>

        {/* Pending Card */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm">
          <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">Pending CEO Approval</div>
          <div className="text-[32px] font-[800] text-[#D97706] leading-none mb-[8px]">{pendingCount}</div>
          <div className="text-[12px] font-[600] text-[#6b7280]">Submitted by HR &mdash; awaiting CEO</div>
          <div className="flex gap-[8px] mt-[12px]">
            <div className="flex-1 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] p-[8px] text-center">
              <div className="text-[16px] font-[800] text-[#059669]">{approvedCount}</div>
              <div className="text-[9px] font-[700] text-[#059669] uppercase tracking-wider">Approved</div>
            </div>
            <div className="flex-1 bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] p-[8px] text-center">
              <div className="text-[16px] font-[800] text-[#DC2626]">{rejectedCount}</div>
              <div className="text-[9px] font-[700] text-[#DC2626] uppercase tracking-wider">Not Approved</div>
            </div>
          </div>
        </div>

      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px] mb-[16px]">
        
        {/* Balanced Scorecard */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center">
            <div className="flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[14px]">&#128200;</div>
              <div>
                <div className="text-[14px] font-[800] text-[#0D2B55]">Balanced Scorecard &mdash; KPA Progress</div>
                <div className="text-[11px] text-[#6b7280]">Company performance vs targets &middot; CY2026</div>
              </div>
            </div>
            <button className="text-[11px] font-[800] bg-[#C9A84C] hover:bg-[#b59540] text-[#0D2B55] px-[12px] py-[6px] rounded-[6px] transition-colors" onClick={() => router.push('/dashboard/ceo/kpa')}>
              Edit Scores
            </button>
          </div>
          
          <div className="p-[20px] flex-1 flex flex-col">
            {!anyKpaEntered ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-[20px] text-[#6b7280]">
                <div className="text-[32px] mb-[10px] opacity-70">&#9999;</div>
                <div className="text-[14px] font-[700] text-[#0D2B55] mb-[4px]">No KPA scores entered yet</div>
                <div className="text-[12px] max-w-[250px]">Click <strong>Edit Scores</strong> to enter CY2026 actual performance metrics.</div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-[14px] mb-[16px]">
                  {[
                    { name: 'Financial Resilience', wt: 14, color: '#3B82F6', val: kpaActuals[0] },
                    { name: 'Operational Effectiveness', wt: 45, color: '#059669', val: kpaActuals[1] },
                    { name: 'Human Capital', wt: 26, color: '#F59E0B', val: kpaActuals[2] },
                    { name: 'Safety & Environment', wt: 12, color: '#10B981', val: kpaActuals[3] },
                    { name: 'Reputational Capital', wt: 3, color: '#8B5CF6', val: kpaActuals[4] }
                  ].map((k, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-end mb-[4px]">
                        <span className="text-[12px] font-[700] text-[#0f1923]">{k.name}</span>
                        <div className="flex items-baseline gap-[6px]">
                          <span className="text-[10px] font-[700] text-[#6b7280]">Wt:{k.wt}%</span>
                          <span className="text-[13px] font-[800]" style={{ color: k.color }}>{k.val !== null ? k.val + '%' : '—'}</span>
                        </div>
                      </div>
                      <div className="h-[6px] bg-[#FAF8F4] border border-[#E2DDD4] rounded-full overflow-hidden mb-[4px]">
                        <div className="h-full rounded-full" style={{ width: (k.val || 0) + '%', background: k.color }}></div>
                      </div>
                      <div className="text-[10px] font-[600] text-[#6b7280]">Contribution: {k.val !== null ? (k.val / 100 * k.wt).toFixed(2) + ' pts' : 'not entered'}</div>
                    </div>
                  ))}
                </div>
                {bscRaw !== null && (
                  <div className="bg-[#0D2B55] rounded-[10px] p-[12px_16px] flex justify-between items-center mt-auto">
                    <span className="text-[12px] font-[700] text-white/60">BSC Raw Score &rarr; CP%</span>
                    <span className="text-[16px] font-[800] text-[#e8c96a]">{bscRaw.toFixed(2)} / 100 &rarr; {cpPct?.toFixed(2)}%</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* STIP Award Preview */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FFFBEB] flex items-center justify-center text-[14px]">&#128176;</div>
            <div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">STIP Award Preview by Rating</div>
              <div className="text-[11px] text-[#6b7280]">Based on current CP% &middot; Pro-Rata = 1.000 (full year)</div>
            </div>
          </div>
          <div className="p-[20px] flex flex-col gap-[10px] flex-1 justify-center">
            
            <div className="flex justify-between items-center p-[12px_16px] rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]">
              <div>
                <div className="text-[13px] font-[800] mb-[2px]">0.0 &mdash; Less than Satisfactory</div>
                <div className="text-[10px] font-[600] opacity-80 font-mono">CP% × 0.0 × Pro-Rata × Salary</div>
              </div>
              <div className="text-[16px] font-[800]">0.00%</div>
            </div>
            
            <div className="flex justify-between items-center p-[12px_16px] rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]">
              <div>
                <div className="text-[13px] font-[800] mb-[2px]">0.7 &mdash; Needs Improvement</div>
                <div className="text-[10px] font-[600] opacity-80 font-mono">{awNIf}</div>
              </div>
              <div className="text-[16px] font-[800]">{cpPct !== null ? (cpPct * 0.7).toFixed(2) + '%' : '—'}</div>
            </div>
            
            <div className="flex justify-between items-center p-[12px_16px] rounded-[10px] border border-[#A7F3D0] bg-[#F0FDF4] text-[#065F46]">
              <div>
                <div className="text-[13px] font-[800] mb-[2px]">1.0 &mdash; Fully Effective</div>
                <div className="text-[10px] font-[600] opacity-80 font-mono">{awEf}</div>
              </div>
              <div className="text-[16px] font-[800]">{cpPct !== null ? (cpPct * 1.0).toFixed(2) + '%' : '—'}</div>
            </div>
            
            <div className="flex justify-between items-center p-[12px_16px] rounded-[10px] border border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]">
              <div>
                <div className="text-[13px] font-[800] mb-[2px]">1.3 &mdash; Exceeds Performance</div>
                <div className="text-[10px] font-[600] opacity-80 font-mono">{awEPf}</div>
              </div>
              <div className="text-[16px] font-[800]">{cpPct !== null ? (cpPct * 1.3).toFixed(2) + '%' : '—'}</div>
            </div>

            <div className="text-[11px] font-[600] text-[#6b7280] bg-[#FAF8F4] border border-[#E2DDD4] p-[10px_14px] rounded-[8px] mt-[6px] leading-[1.6]">
              &#8505; Enter KPA scores to see award preview. All figures are gross &mdash; subject to FSM income tax.
            </div>
          </div>
        </div>

      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
        
        {/* Deadlines */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FFF7ED] flex items-center justify-center text-[14px]">&#128197;</div>
            <div className="text-[14px] font-[800] text-[#0D2B55]">2026 Appraisal Deadlines</div>
          </div>
          <div className="p-[20px] flex-1 flex flex-col justify-between">
            <div className="w-full text-left border-collapse text-[13px] mb-[16px]">
              <div className="grid grid-cols-[1fr_2fr_2fr_1fr] font-[800] text-[10px] text-[#6b7280] uppercase tracking-widest border-b border-[#E2DDD4] pb-[8px] mb-[8px]">
                <div>Quarter</div>
                <div>Period</div>
                <div>Deadline</div>
                <div className="text-right">Status</div>
              </div>
              
              <div className="grid grid-cols-[1fr_2fr_2fr_1fr] items-center py-[8px] border-b border-[#E2DDD4]">
                <strong className="text-[#059669]">Q1</strong>
                <span className="text-[#0f1923] font-[500]">Jan &mdash; Mar 2026</span>
                <span className="font-[700] text-[#059669]">31 Mar 2026</span>
                <span className="text-right"><span className="text-[10px] font-[800] bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] px-[6px] py-[2px] rounded">✓ Done</span></span>
              </div>
              <div className="grid grid-cols-[1fr_2fr_2fr_1fr] items-center py-[8px] border-b border-[#E2DDD4]">
                <strong className="text-[#059669]">Q2</strong>
                <span className="text-[#0f1923] font-[500]">Apr &mdash; Jun 2026</span>
                <span className="font-[700] text-[#059669]">30 Jun 2026</span>
                <span className="text-right"><span className="text-[10px] font-[800] bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] px-[6px] py-[2px] rounded">✓ Done</span></span>
              </div>
              <div className="grid grid-cols-[1fr_2fr_2fr_1fr] items-center py-[8px] border-b border-[#E2DDD4] bg-[#FFFBEB] -mx-[8px] px-[8px] rounded-[6px]">
                <strong className="text-[#92400E]">Q3</strong>
                <span className="text-[#0f1923] font-[600]">Jul &mdash; Sep 2026</span>
                <span className="font-[800] text-[#92400E]">30 Sep 2026</span>
                <span className="text-right"><span className="text-[10px] font-[800] bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-[6px] py-[2px] rounded">⏳ Active</span></span>
              </div>
              <div className="grid grid-cols-[1fr_2fr_2fr_1fr] items-center py-[8px]">
                <strong className="text-[#6b7280]">Q4</strong>
                <span className="text-[#6b7280] font-[500]">Oct &mdash; Dec 2026</span>
                <span className="text-[#6b7280]">15 Dec 2026</span>
                <span className="text-right"><span className="text-[10px] font-[700] bg-[#FAF8F4] text-[#6b7280] border border-[#E2DDD4] px-[6px] py-[2px] rounded">Upcoming</span></span>
              </div>
            </div>
            
            <div className="bg-[#0D2B55] rounded-[10px] p-[12px_16px] flex justify-between items-center mt-auto">
              <span className="text-[12px] font-[600] text-white/60">Q3 closes in</span>
              <span className="text-[14px] font-[800] text-[#e8c96a]">136 days remaining</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-[#EDE9FE] flex items-center justify-center text-[14px]">&#9889;</div>
            <div className="text-[14px] font-[800] text-[#0D2B55]">CEO Quick Actions</div>
          </div>
          <div className="p-[20px] flex flex-col gap-[10px] flex-1">
            <button className="w-full bg-[#C9A84C] hover:bg-[#b59540] text-[#0D2B55] font-[800] text-[13px] py-[10px] rounded-[8px] transition-colors flex items-center justify-center gap-[6px]" onClick={() => router.push('/dashboard/ceo/kpa')}>
              &#9997; Enter / Update KPA Scores
            </button>
            <button className="w-full bg-[#0D2B55] hover:bg-[#1a3d6e] text-white font-[800] text-[13px] py-[10px] rounded-[8px] transition-colors flex items-center justify-center gap-[6px]" onClick={() => router.push('/dashboard/ceo/approve')}>
              &#10003; Review Pending Approvals 
              <span className="bg-white/20 px-[6px] py-[1px] rounded-full text-[11px] ml-[4px]">{pendingCount}</span>
            </button>
            <button className="w-full bg-white hover:bg-[#FAF8F4] border border-[#E2DDD4] hover:border-[#0D2B55] text-[#0f1923] font-[700] text-[13px] py-[10px] rounded-[8px] transition-colors" onClick={() => router.push('/dashboard/ceo/reports')}>
              &#128202; Download Reports
            </button>
            <button className="w-full bg-white hover:bg-[#FAF8F4] border border-[#E2DDD4] hover:border-[#0D2B55] text-[#0f1923] font-[700] text-[13px] py-[10px] rounded-[8px] transition-colors" onClick={() => router.push('/dashboard/ceo/appraisals')}>
              &#128196; View All Appraisals
            </button>
            <button className="w-full bg-white hover:bg-[#FAF8F4] border border-[#E2DDD4] hover:border-[#0D2B55] text-[#0f1923] font-[700] text-[13px] py-[10px] rounded-[8px] transition-colors" onClick={() => router.push('/dashboard/ceo/staff')}>
              &#128101; View All Staff ({totalStaff})
            </button>
            
            <div className="mt-auto pt-[14px]">
              <div className="bg-[#FAF8F4] border border-[#E2DDD4] rounded-[10px] p-[14px]">
                <div className="text-[11px] font-[800] text-[#0D2B55] mb-[6px] uppercase tracking-widest">Scorecard Status</div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-[600] text-[#6b7280]">
                    {locked ? `Locked — CP: ${cpPct?.toFixed(2)}% (${lockedAt})` : 'Unlocked — KPA scores editable'}
                  </span>
                  <span className={`text-[10px] font-[800] px-[8px] py-[3px] rounded border ${locked ? 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]' : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'}`}>
                    {locked ? '🔒 Locked' : '🔓 Unlocked'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}