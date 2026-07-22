'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import StipCategoryChart from '../../../components/charts/StipCategoryChart';
import usePersistentFilter from '../../../hooks/usePersistentFilter';

// Fallback colors for dynamically generated company badges
const BADGE_COLORS = [
  'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]', // Blue
  'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]', // Green
  'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]', // Amber
  'bg-[#EDE9FE] text-[#4C1D95] border-[#DDD6FE]', // Purple
  'bg-[#FCE7F3] text-[#9D174D] border-[#FBCFE8]', // Pink
  'bg-[#CCFBF1] text-[#115E59] border-[#99F6E4]'  // Teal
];

// Robust Date/Time formatter to enforce mm/dd/yy and 24-hour time
const formatDateTime = (dateInput, includeTime = false) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  
  let result = `${mm}/${dd}/${yy}`;
  
  if (includeTime) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    result += ` at ${hh}:${mins}`;
  }
  
  return result;
};

export default function CEODashboard() {
  const router = useRouter();

  const currentYearNum = new Date().getFullYear();
  const currentYearStr = currentYearNum.toString();

  const [selectedYear, setSelectedYear] = usePersistentFilter('ceo_dash_year', currentYearStr);
  const [selectedQuarter, setSelectedQuarter] = usePersistentFilter('ceo_dash_quarter', 'Q1');
  const [isManualYear, setIsManualYear] = useState(false);

  // State
  const [appraisals, setAppraisals] = useState([]);
  const [staff, setStaff] = useState([]); 
  const [totalStaff, setTotalStaff] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [companyCodes, setCompanyCodes] = useState([]);
  
  // Dynamic Quarters State
  const [dbQuarters, setDbQuarters] = useState([]);
  const [activeQuarter, setActiveQuarter] = useState(null);
  
  // Real KPA actuals state (fetched from backend)
  const [kpaActuals, setKpaActuals] = useState([null, null, null, null, null]);
  const [locked, setLocked] = useState(false);
  const [lockedAt, setLockedAt] = useState('');

  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        setLoading(true);
        const [appRes, usersRes, configRes, qtrRes] = await Promise.all([
           api.get('/appraisals').catch(() => ({ data: { data: [] } })),
           api.get('/users').catch(() => ({ data: { data: [] } })),
           api.get('/config/dropdowns').catch(() => ({ data: { data: {} } })), 
           api.get('/quarters?all=true').catch(() => ({ data: { data: [] } }))
        ]);

        const allApps = appRes.data?.data || [];
        setAppraisals(allApps);

        const allUsers = usersRes.data?.data || [];
        setStaff(allUsers);
        setTotalStaff(allUsers.length || 190);

        if (configRes.data?.data?.companyCodes) {
          setCompanyCodes(configRes.data.data.companyCodes);
        } else {
          setCompanyCodes(['FSM', 'CDU', 'NAR', 'GUM']);
        }

        const fetchedQuarters = qtrRes.data?.data || [];
        fetchedQuarters.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        setDbQuarters(fetchedQuarters);

        const now = new Date();
        const active = fetchedQuarters.find(q => new Date(q.startDate) <= now && new Date(q.endDate) >= now && !q.isLocked);
        setActiveQuarter(active || null);

      } catch (error) {
        console.error('Failed to load base live data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBaseData();
  }, []);

  useEffect(() => {
    if (dbQuarters.length === 0) return;
    const qtrsForSelectedYear = dbQuarters.filter(q => q.year.toString() === selectedYear.toString());
    
    if (qtrsForSelectedYear.length > 0) {
      const availableQs = [...new Set(qtrsForSelectedYear.map(q => {
        const m = String(q.name).match(/Q?([1-4])/i);
        return m ? `Q${m[1]}` : q.name;
      }))].sort();
      
      if (!selectedQuarter || !availableQs.includes(selectedQuarter)) {
        setSelectedQuarter(availableQs[availableQs.length - 1]);
      }
    } else {
      setSelectedQuarter('');
    }
  }, [dbQuarters, selectedYear, selectedQuarter, setSelectedQuarter]);

  useEffect(() => {
    const fetchDynamicMetrics = async () => {
      if (!selectedYear || !selectedQuarter) {
         setKpaActuals([null, null, null, null, null]);
         setLocked(false);
         setLockedAt('');
         return;
      }
      try {
        const targetMonth = parseInt(selectedQuarter.replace('Q', '')) * 3 || 3;
        const metricsRes = await api.get(`/company-metrics/${selectedYear}/${targetMonth}`).catch(() => ({ data: { data: null } }));
        const metricsData = metricsRes.data?.data;

        if (metricsData) {
          setKpaActuals([
            metricsData.financialResilience,
            metricsData.operationalEffectiveness,
            metricsData.humanCapital,
            metricsData.safetyEnvironment,
            metricsData.reputationalCapital
          ]);
          setLocked(metricsData.locked);
          if (metricsData.lockedAt) {
            setLockedAt(formatDateTime(metricsData.lockedAt, true));
          }
        } else {
          setKpaActuals([null, null, null, null, null]);
          setLocked(false);
          setLockedAt('');
        }
      } catch (error) {
        console.error('Failed to fetch dynamic company metrics', error);
      }
    };
    fetchDynamicMetrics();
  }, [selectedYear, selectedQuarter]);

  // Extract unique dynamic quarters for the dropdown based on selected year
  const qtrsForSelectedYear = dbQuarters.filter(q => q.year.toString() === selectedYear.toString());
  const uniqueAvailableQuarters = [...new Set(qtrsForSelectedYear.map(q => {
    const qMatch = String(q.name).match(/Q?([1-4])/i);
    return qMatch ? `Q${qMatch[1]}` : q.name;
  }))].sort();

  const filteredAppraisals = appraisals.filter(a => {
    const appYear = a.reviewYear || a.appraisalQuarter?.year || a.period?.year;
    const appQtrRaw = a.appraisalQuarter?.name || a.period?.quarter || a.quarter?.name || '';
    const qMatch = String(appQtrRaw).match(/Q?([1-4])/i) || String(appQtrRaw).match(/([1-4])/);
    const appQtr = qMatch ? `Q${qMatch[1]}` : appQtrRaw;

    return appYear?.toString() === selectedYear.toString() && appQtr === selectedQuarter;
  });

  const epCount = filteredAppraisals.filter(a => a.calculatedResults?.finalIprfScore >= 1.3).length;
  
  const awaitingCeoCount = filteredAppraisals.filter(a => a.workflow?.status === 'WITH_CEO').length;
  const ceoApprovedCount = filteredAppraisals.filter(a => ['APPROVED', 'ACKNOWLEDGED'].includes(a.workflow?.status)).length;
  const pendingHrCount = filteredAppraisals.filter(a => ['SUBMITTED', 'UNDER_HR_REVIEW', 'APPROVED_BY_HR'].includes(a.workflow?.status)).length;

  // 🚨 UPGRADED: Dynamic 887-point calculation algorithm matching the KPA Scorecard
  let calcBscRaw = null;
  let safeCpPct = null;
  const anyKpaEntered = kpaActuals.some(v => v !== null);

  if (anyKpaEntered) {
    calcBscRaw = kpaActuals.reduce((sum, val, idx) => {
      const maxPts = [120, 400, 230, 110, 27][idx];
      const pts = ((val || 0) / 100) * maxPts;
      return sum + Number(pts.toFixed(1)); 
    }, 0);
    
    const rawCp = calcBscRaw / 100;
    safeCpPct = Math.round((rawCp + Number.EPSILON) * 100) / 100;
  }

  const awNIf = safeCpPct ? `CP × 0.7 × Pro-Rata` : 'CP × 0.7 × Pro-Rata';
  const awEf = safeCpPct ? `CP × 1.0 × Pro-Rata` : 'CP × 1.0 × Pro-Rata';
  const awEPf = safeCpPct ? `CP × 1.3 × Pro-Rata` : 'CP × 1.3 × Pro-Rata';

  let daysRemainingText = "No active deadlines";
  if (activeQuarter) {
    const end = new Date(activeQuarter.endDate);
    const now = new Date();
    const diffTime = Math.abs(end - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    daysRemainingText = `${diffDays} days remaining`;
  }

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-medium animate-pulse">Loading Executive Dashboard...</div>;
  }

  return (
    <div className="w-full max-w-full pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px] flex flex-col md:flex-row justify-between items-start md:items-end gap-[12px]">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">CEO Dashboard</div>
          <div className="text-[13px] text-[#6b7280]">Real-time STIP program overview &mdash; {selectedQuarter || 'No Quarter'} {selectedYear}</div>
        </div>
        
        <div className="flex flex-wrap items-center gap-[10px]">
          <div className="flex items-center gap-[6px] bg-white border border-[#E2DDD4] p-[4px] rounded-[8px] shadow-sm">
            <select 
              value={selectedQuarter} 
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="bg-transparent text-[12px] font-[700] text-[#0D2B55] outline-none cursor-pointer p-[6px_8px]"
              disabled={uniqueAvailableQuarters.length === 0}
            >
              {uniqueAvailableQuarters.length === 0 && <option value="">No Quarters Created</option>}
              {uniqueAvailableQuarters.map(q => (
                 <option key={q} value={q}>{q}</option>
              ))}
            </select>
            <span className="text-[#E2DDD4]">|</span>
            {isManualYear ? (
              <input 
                type="number" 
                autoFocus
                defaultValue={selectedYear}
                onBlur={(e) => {
                  if (e.target.value) setSelectedYear(e.target.value);
                  setIsManualYear(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.target.value) setSelectedYear(e.target.value);
                    setIsManualYear(false);
                  }
                }}
                className="bg-transparent text-[12px] font-[700] text-[#0D2B55] outline-none p-[6px_8px] w-[80px]"
              />
            ) : (
              <select 
                value={selectedYear} 
                onChange={(e) => {
                  if (e.target.value === 'manual') setIsManualYear(true);
                  else setSelectedYear(e.target.value);
                }}
                className="bg-transparent text-[12px] font-[700] text-[#0D2B55] outline-none cursor-pointer p-[6px_8px] pr-[12px]"
              >
                {[currentYearNum - 3, currentYearNum - 2, currentYearNum - 1, currentYearNum, currentYearNum + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
                <option value="manual" className="font-bold text-[#1E40AF]">Enter Manually...</option>
              </select>
            )}
          </div>
          <button className="bg-[#C9A84C] hover:bg-[#b59540] text-[#0D2B55] text-[12px] font-[800] px-[16px] py-[8px] rounded-[8px] transition-colors shadow-sm" onClick={() => router.push('/dashboard/ceo/kpa')}>
            &#9997; Enter KPA Scores
          </button>
        </div>
      </div>

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px] mb-[20px]">
        
        {/* CP Card (🚨 UPGRADED: Output out of 887 instead of 100) */}
        <div className="bg-[#0D2B55] rounded-[14px] p-[20px] shadow-sm relative overflow-hidden">
          <div className="text-[11px] font-[700] uppercase tracking-widest text-white/50 mb-[4px]">Company Performance (CP)</div>
          <div className="text-[32px] font-[800] text-[#e8c96a] leading-none mb-[8px]">{safeCpPct !== null ? safeCpPct.toFixed(2) : '—'}</div>
          <div className="text-[12px] font-[600] text-white/40">BSC Raw Score: <span className="text-white/80">{calcBscRaw !== null ? calcBscRaw.toFixed(1) : '—'}</span> / 887</div>
          <div className="mt-[12px] h-[5px] bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#C9A84C] rounded-full transition-all duration-[600ms]" style={{ width: calcBscRaw !== null ? Math.min(100, (calcBscRaw / 887) * 100) + '%' : '0%' }}></div>
          </div>
        </div>
        
        {/* Total Staff Card */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">Total Staff Covered</div>
            <div className="text-[32px] font-[800] text-[#0D2B55] leading-none mb-[8px]">{totalStaff}</div>
            <div className="text-[12px] font-[600] text-[#6b7280]">STIP-eligible employees</div>
          </div>
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
          <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">EP Rating Cap Monitor</div>
          <div className="flex items-baseline gap-[6px] mb-[8px]">
            <div className="text-[32px] font-[800] text-[#1E40AF] leading-none">{epCount}</div>
            <div className="text-[14px] font-[800] text-[#6b7280]">/ {Math.floor(totalStaff * 0.05)} max</div>
          </div>
          <div className="text-[12px] font-[600] text-[#6b7280]">Cap = 5% of {totalStaff} staff</div>
          <div className="mt-[12px] h-[7px] bg-[#DBEAFE] rounded-full overflow-hidden">
            <div className="h-full bg-[#1E40AF] rounded-full transition-all duration-500" style={{ width: Math.min(100, (epCount / Math.max(1, Math.floor(totalStaff * 0.05))) * 100) + '%' }}></div>
          </div>
        </div>

        {/* Appraisal Progress Card */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">Appraisal Progress</div>
            <div className="flex items-baseline gap-[8px] mb-[8px]">
              <div className="text-[32px] font-[800] text-[#D97706] leading-none">{awaitingCeoCount}</div>
              <div className="text-[12px] font-[600] text-[#6b7280]">Awaiting CEO</div>
            </div>
          </div>
          <div className="flex gap-[8px] mt-[12px]">
            <div className="flex-1 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] p-[8px] text-center">
              <div className="text-[16px] font-[800] text-[#059669]">{ceoApprovedCount}</div>
              <div className="text-[9px] font-[700] text-[#059669] uppercase tracking-wider">CEO Approved</div>
            </div>
            <div className="flex-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[8px] p-[8px] text-center">
              <div className="text-[16px] font-[800] text-[#1E40AF]">{pendingHrCount}</div>
              <div className="text-[9px] font-[700] text-[#1E40AF] uppercase tracking-wider">Pending HR</div>
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
                <div className="text-[11px] text-[#6b7280]">Company performance vs targets &middot; {selectedYear}</div>
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
                <div className="text-[12px] max-w-[250px]">Click <strong>Edit Scores</strong> to enter {selectedQuarter} {selectedYear} actual performance metrics.</div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-[14px] mb-[16px]">
                  {/* 🚨 UPGRADED: Math logic explicitly mapping max points directly to the KPA calculation */}
                  {[
                    { name: 'Financial Resilience', wt: 13.5, max: 120, color: '#3B82F6', val: kpaActuals[0] },
                    { name: 'Operational Effectiveness', wt: 45.1, max: 400, color: '#059669', val: kpaActuals[1] },
                    { name: 'Human Capital', wt: 25.9, max: 230, color: '#F59E0B', val: kpaActuals[2] },
                    { name: 'Safety & Environment', wt: 12.4, max: 110, color: '#10B981', val: kpaActuals[3] },
                    { name: 'Reputational Capital', wt: 3.0, max: 27, color: '#8B5CF6', val: kpaActuals[4] }
                  ].map((k, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-end mb-[6px]">
                        <span className="text-[13px] font-[800] text-[#0D2B55]">{k.name}</span>
                        <div className="flex items-baseline gap-[6px]">
                          <span className="text-[11px] font-[800] text-[#6b7280]">Wt: {k.wt.toFixed(1)}%</span>
                          <span className="text-[14px] font-[800]" style={{ color: k.color }}>{k.val !== null ? k.val.toFixed(2) + '%' : '—'}</span>
                        </div>
                      </div>
                      <div className="h-[6px] bg-[#FAF8F4] border border-[#E2DDD4] rounded-full overflow-hidden mb-[4px]">
                        <div className="h-full rounded-full" style={{ width: (k.val || 0) + '%', background: k.color }}></div>
                      </div>
                      <div className="text-[11px] font-[700] text-[#6b7280] mt-[4px]">
                        Contribution: <strong className="text-[#0D2B55]">{(k.val !== null ? ((k.val / 100) * k.max).toFixed(1) : '0.0')} pts</strong>
                      </div>
                    </div>
                  ))}
                </div>
                {calcBscRaw !== null && (
                  <div className="bg-[#0D2B55] rounded-[10px] p-[12px_16px] flex justify-between items-center mt-auto">
                    {/* 🚨 UPGRADED: Final CP synchronization */}
                    <span className="text-[12px] font-[700] text-white/60">BSC Raw Score &rarr; Final CP</span>
                    <span className="text-[16px] font-[800] text-[#e8c96a]">{calcBscRaw.toFixed(1)} / 887 &rarr; {safeCpPct?.toFixed(2)}</span>
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
              <div className="text-[11px] text-[#6b7280]">Based on current CP &middot; Pro-Rata = 1.000 (full year)</div>
            </div>
          </div>
          <div className="p-[20px] flex flex-col gap-[10px] flex-1 justify-center">
            
            <div className="flex justify-between items-center p-[12px_16px] rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]">
              <div>
                <div className="text-[13px] font-[800] mb-[2px]">0.0 &mdash; Less than Satisfactory</div>
                <div className="text-[10px] font-[600] opacity-80 font-mono">CP × 0.0 × Pro-Rata × Salary</div>
              </div>
              <div className="text-[16px] font-[800]">0.00%</div>
            </div>
            
            <div className="flex justify-between items-center p-[12px_16px] rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]">
              <div>
                <div className="text-[13px] font-[800] mb-[2px]">0.7 &mdash; Needs Improvement</div>
                <div className="text-[10px] font-[600] opacity-80 font-mono">{awNIf}</div>
              </div>
              <div className="text-[16px] font-[800]">{safeCpPct !== null ? (safeCpPct * 0.7).toFixed(2) + '%' : '—'}</div>
            </div>
            
            <div className="flex justify-between items-center p-[12px_16px] rounded-[10px] border border-[#A7F3D0] bg-[#F0FDF4] text-[#065F46]">
              <div>
                <div className="text-[13px] font-[800] mb-[2px]">1.0 &mdash; Fully Effective</div>
                <div className="text-[10px] font-[600] opacity-80 font-mono">{awEf}</div>
              </div>
              <div className="text-[16px] font-[800]">{safeCpPct !== null ? (safeCpPct * 1.0).toFixed(2) + '%' : '—'}</div>
            </div>
            
            <div className="flex justify-between items-center p-[12px_16px] rounded-[10px] border border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]">
              <div>
                <div className="text-[13px] font-[800] mb-[2px]">1.3 &mdash; Exceeds Performance</div>
                <div className="text-[10px] font-[600] opacity-80 font-mono">{awEPf}</div>
              </div>
              <div className="text-[16px] font-[800]">{safeCpPct !== null ? (safeCpPct * 1.3).toFixed(2) + '%' : '—'}</div>
            </div>

            <div className="text-[11px] font-[600] text-[#6b7280] bg-[#FAF8F4] border border-[#E2DDD4] p-[10px_14px] rounded-[8px] mt-[6px] leading-[1.6]">
              &#8505; Enter KPA scores to see award preview. All figures are gross &mdash; subject to FSM income tax.
            </div>
          </div>
        </div>

      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
        
        {/* Dynamic DB Deadlines */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FFF7ED] flex items-center justify-center text-[14px]">&#128197;</div>
            <div className="text-[14px] font-[800] text-[#0D2B55]">Live Appraisal Deadlines</div>
          </div>
          <div className="p-[20px] flex-1 flex flex-col justify-between">
            <div className="w-full text-left border-collapse text-[13px] mb-[16px]">
              <div className="grid grid-cols-[1fr_2fr_2fr_1fr] font-[800] text-[10px] text-[#6b7280] uppercase tracking-widest border-b border-[#E2DDD4] pb-[8px] mb-[8px]">
                <div>Quarter</div>
                <div>Year</div>
                <div>Deadline</div>
                <div className="text-right">Status</div>
              </div>
              
              {dbQuarters.length === 0 ? (
                <div className="text-center p-4 text-gray-500">No timeline data available.</div>
              ) : (
                dbQuarters.filter(q => q.year.toString() === selectedYear.toString()).map(q => {
                  const now = new Date();
                  const exp = now > new Date(q.endDate);
                  const isActive = q._id === activeQuarter?._id;
                  const isLocked = q.isLocked || (exp && !q.forceUnlock);
                  
                  let bgRow = '';
                  let textClass = 'text-[#6b7280]';
                  let statusBadge = <span className="text-[10px] font-[700] bg-[#FAF8F4] text-[#6b7280] border border-[#E2DDD4] px-[6px] py-[2px] rounded whitespace-nowrap">Upcoming</span>;
                  
                  if (isLocked) {
                    bgRow = 'bg-[#F0FDF4]';
                    textClass = 'text-[#065F46]';
                    statusBadge = <span className="text-[10px] font-[800] bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] px-[6px] py-[2px] rounded whitespace-nowrap">✓ Locked</span>;
                  } else if (isActive || q.forceUnlock) {
                    bgRow = 'bg-[#FFFBEB] outline outline-[1.5px] outline-[#FDE68A] outline-offset-[-1px] rounded-[6px]';
                    textClass = 'text-[#92400E]';
                    statusBadge = <span className="text-[10px] font-[800] bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-[6px] py-[2px] rounded whitespace-nowrap">⏳ {q.forceUnlock && exp ? 'Override' : 'Active'}</span>;
                  }

                  return (
                    <div key={q._id} className={`grid grid-cols-[1fr_2fr_2fr_1fr] items-center py-[8px] border-b border-[#E2DDD4] ${bgRow}`}>
                      <strong className={`${textClass} rounded-l-[6px] px-2`}>{q.name}</strong>
                      <span className="text-[#0f1923] font-[500]">{q.year}</span>
                      <span className={`font-[700] ${textClass}`}>{formatDateTime(q.endDate, true)}</span>
                      <span className="text-right px-2">{statusBadge}</span>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="bg-[#0D2B55] rounded-[10px] p-[12px_16px] flex justify-between items-center mt-auto">
              <span className="text-[12px] font-[600] text-white/60">{activeQuarter ? `${activeQuarter.name} closes in` : 'System Status'}</span>
              <span className="text-[14px] font-[800] text-[#e8c96a]">{daysRemainingText}</span>
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
              <span className="bg-white/20 px-[6px] py-[1px] rounded-full text-[11px] ml-[4px]">{awaitingCeoCount}</span>
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
                    {locked ? `Locked — CP: ${safeCpPct?.toFixed(2)} (${lockedAt})` : 'Unlocked — KPA scores editable'}
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

      <div className="mt-6">
         <StipCategoryChart scope="team" />
      </div>

    </div>
  );
}