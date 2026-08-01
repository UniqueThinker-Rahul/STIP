'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import StipCategoryChart from '../../../components/charts/StipCategoryChart';
import usePersistentFilter from '../../../hooks/usePersistentFilter';

// Fallback colors for dynamically generated company badges
const BADGE_COLORS = [
  'bg-blue-900/50 text-blue-300 border-blue-800',
  'bg-green-900/50 text-green-300 border-green-800',
  'bg-amber-900/50 text-amber-300 border-amber-800',
  'bg-purple-900/50 text-purple-300 border-purple-800',
  'bg-pink-900/50 text-pink-300 border-pink-800',
  'bg-teal-900/50 text-teal-300 border-teal-800'
];

// Universal Formatter (mm/dd/yy HH:mm 24h format)
const formatToMMDDYY24h = (dateInput) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  
  return `${mm}/${dd}/${yy} ${hh}:${min}`;
};

export default function HRDashboard() {
  const router = useRouter();
  
  const currentYearNum = new Date().getFullYear();
  const currentYearStr = currentYearNum.toString();

  const [selectedYear, setSelectedYear] = usePersistentFilter('hr_dash_year', currentYearStr);
  const [selectedQuarter, setSelectedQuarter] = usePersistentFilter('hr_dash_quarter', 'Q1');
  const [isManualYear, setIsManualYear] = useState(false);

  const [appraisals, setAppraisals] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [companyCodes, setCompanyCodes] = useState([]);
  
  const [dbQuarters, setDbQuarters] = useState([]);
  const [activeQuarter, setActiveQuarter] = useState(null);

  const [metrics, setMetrics] = useState({
    financialResilience: null, operationalEffectiveness: null, humanCapital: null,
    safetyEnvironment: null, reputationalCapital: null
  });

  const fetchDashboardData = async (isInitialLoad = true) => {
    try {
      if (isInitialLoad) setLoading(true);
      
      const [appraisalsRes, staffRes, configRes, quartersRes] = await Promise.all([
        api.get('/appraisals').catch(() => ({ data: [] })), 
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/config/dropdowns').catch(() => ({ data: { data: {} } })),
        // 🚨 FIXED: Removed "?all=true" so unpublished quarters are strictly hidden from the dashboard views
        api.get('/quarters').catch(() => ({ data: { data: [] } }))
      ]);
      
      setAppraisals(appraisalsRes.data?.data || appraisalsRes.data || []);
      setStaff(staffRes.data?.data || staffRes.data || []);
      
      if (configRes.data?.data?.companyCodes) {
        setCompanyCodes(configRes.data.data.companyCodes);
      } else {
        setCompanyCodes(['FSM', 'CDU', 'NAR', 'GUM']);
      }

      const allQuarters = quartersRes.data?.data || [];
      setDbQuarters(allQuarters);

      const now = new Date();
      let currentActive = allQuarters.find(q => {
        const start = new Date(q.startDate); start.setHours(0,0,0,0);
        const end = new Date(q.endDate); end.setHours(23,59,59,999);
        return now >= start && now <= end && !q.isLocked;
      });
      
      setActiveQuarter(currentActive || null);

    } catch (error) {
      console.error('Failed to load live data', error);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);

    const liveUpdateInterval = setInterval(() => {
      fetchDashboardData(false);
    }, 30000);

    return () => clearInterval(liveUpdateInterval);
  }, []);

  // Safely bind dropdown options to db availability
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

  // Fetch specific company metrics based on filters
  useEffect(() => {
    const fetchDynamicMetrics = async () => {
      if (!selectedYear || !selectedQuarter) {
         setMetrics({
           financialResilience: null, operationalEffectiveness: null, humanCapital: null,
           safetyEnvironment: null, reputationalCapital: null
         });
         return;
      }
      try {
        const targetMonth = parseInt(selectedQuarter.replace('Q', '')) * 3 || 3;
        const metricsRes = await api.get(`/company-metrics/${selectedYear}/${targetMonth}`).catch(() => ({ data: { data: null } }));
        const mData = metricsRes.data?.data;
        if (mData) {
          setMetrics(mData);
        } else {
          setMetrics({
            financialResilience: null, operationalEffectiveness: null, humanCapital: null,
            safetyEnvironment: null, reputationalCapital: null
          });
        }
      } catch (error) {
        console.error('Failed to fetch dynamic company metrics', error);
      }
    };
    fetchDynamicMetrics();
  }, [selectedYear, selectedQuarter]);

  const filteredAppraisals = appraisals.filter(a => {
    const appYear = a.reviewYear || a.appraisalQuarter?.year || a.period?.year;
    const appQtrRaw = a.appraisalQuarter?.name || a.period?.quarter || a.quarter?.name || '';
    const qMatch = String(appQtrRaw).match(/Q?([1-4])/i) || String(appQtrRaw).match(/([1-4])/);
    const appQtr = qMatch ? `Q${qMatch[1]}` : appQtrRaw;

    return appYear?.toString() === selectedYear.toString() && appQtr === selectedQuarter;
  });

  const atHR = filteredAppraisals.filter(a => ['SUBMITTED', 'UNDER_HR_REVIEW'].includes(a.workflow?.status)).length;
  const atCEO = filteredAppraisals.filter(a => ['WITH_CEO'].includes(a.workflow?.status)).length;
  const approved = filteredAppraisals.filter(a => ['APPROVED', 'ACKNOWLEDGED'].includes(a.workflow?.status)).length;
  const rejected = filteredAppraisals.filter(a => ['NOT_APPROVED', 'REOPENED'].includes(a.workflow?.status)).length;
  const ep = filteredAppraisals.filter(a => a.calculatedResults?.finalIprfScore >= 1.3).length;
  const total = filteredAppraisals.length;

  const total190 = staff.length > 0 ? staff.length : 190;
  
  const subPct = total190 > 0 ? Math.min(100, Math.round(total / total190 * 100)) : 0;
  const appPct = total190 > 0 ? Math.min(100, Math.round(approved / total190 * 100)) : 0;
  const pendPct = Math.max(0, 100 - subPct);
  
  const epPct = Math.round(ep / Math.max(1, Math.floor(total190 * 0.05)) * 100);
  const over = ep >= Math.floor(total190 * 0.05);

  const recent = [...filteredAppraisals]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 5);

  const { financialResilience, operationalEffectiveness, humanCapital, safetyEnvironment, reputationalCapital } = metrics;

  const kpaActuals = [financialResilience, operationalEffectiveness, humanCapital, safetyEnvironment, reputationalCapital];
  let calcBscRaw = null;
  let safeCpPct = null;
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

  const qtrsForSelectedYear = dbQuarters.filter(q => q.year.toString() === selectedYear.toString());
  const uniqueAvailableQuarters = [...new Set(qtrsForSelectedYear.map(q => {
    const qMatch = String(q.name).match(/Q?([1-4])/i);
    return qMatch ? `Q${qMatch[1]}` : q.name;
  }))].sort();

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-medium animate-pulse">Connecting to live HR database...</div>;
  }

  return (
    <div className="space-y-6 pb-[60px]">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">HR Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">STIP program management — {selectedQuarter || 'No Quarter'} {selectedYear}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-[10px]">
          <div className="flex items-center gap-[6px] bg-white border border-slate-200 p-[4px] rounded-[8px] shadow-sm">
            <select 
              value={selectedQuarter} 
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="bg-transparent text-[12px] font-[700] text-slate-900 outline-none cursor-pointer p-[6px_8px]"
              disabled={uniqueAvailableQuarters.length === 0}
            >
              {uniqueAvailableQuarters.length === 0 && <option value="">No Quarters Active</option>}
              {uniqueAvailableQuarters.map(q => (
                 <option key={q} value={q}>{q}</option>
              ))}
            </select>
            <span className="text-slate-200">|</span>
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
                className="bg-transparent text-[12px] font-[700] text-slate-900 outline-none p-[6px_8px] w-[80px]"
              />
            ) : (
              <select 
                value={selectedYear} 
                onChange={(e) => {
                  if (e.target.value === 'manual') setIsManualYear(true);
                  else setSelectedYear(e.target.value);
                }}
                className="bg-transparent text-[12px] font-[700] text-slate-900 outline-none cursor-pointer p-[6px_8px] pr-[12px]"
              >
                {[currentYearNum - 3, currentYearNum - 2, currentYearNum - 1, currentYearNum, currentYearNum + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
                <option value="manual" className="font-bold text-blue-600">Enter Manually...</option>
              </select>
            )}
          </div>
          <button onClick={() => router.push('/dashboard/hr/review')} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center">
            ✍️ Review Appraisals
          </button>
          <button onClick={() => router.push('/dashboard/hr/add-staff')} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors">
            + Add Staff
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Staff</div>
          <div className="text-3xl font-bold text-amber-200 my-2">{total190}</div>
          <div className="text-xs text-slate-400 mb-3">STIP-eligible employees</div>
          <div className="flex flex-wrap gap-2">
            {companyCodes.map((code, index) => {
              const count = staff.filter(s => s.companyCode === code).length || 0;
              const colorClass = BADGE_COLORS[index % BADGE_COLORS.length];
              return (
                <span key={code} className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${colorClass}`}>
                  {code} {count}
                </span>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending HR Review</div>
            <div className="text-3xl font-bold text-amber-500 my-2">{atHR}</div>
            <div className="text-xs text-slate-500">Submitted by managers</div>
          </div>
          <button onClick={() => router.push('/dashboard/hr/review')} className="mt-4 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold rounded w-max transition-colors">
            Review Now
          </button>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Awaiting CEO</div>
            <div className="text-3xl font-bold text-purple-500 my-2">{atCEO}</div>
            <div className="text-xs text-slate-500">Sent to CEO for approval</div>
          </div>
          <button onClick={() => router.push('/dashboard/hr/submit')} className="mt-4 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded w-max transition-colors">
            View Queue
          </button>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">CEO Approved</div>
            <div className="text-3xl font-bold text-green-500 my-2">{approved}</div>
            <div className="text-xs text-slate-500">Fully approved appraisals</div>
          </div>
          <div className="flex gap-2 mt-4">
            <div className="flex-1 bg-red-50 rounded-lg py-1.5 text-center border border-red-100">
              <div className="text-sm font-bold text-red-600">{rejected}</div>
              <div className="text-[9px] text-red-500 font-medium">Not Approved</div>
            </div>
            <div className="flex-1 bg-green-50 rounded-lg py-1.5 text-center border border-green-100">
              <div className="text-sm font-bold text-green-600">{ep}</div>
              <div className="text-[9px] text-green-600 font-medium">EP Rated</div>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">📅</div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {selectedQuarter} {selectedYear} — Appraisal Progress
              </h2>
              <p className="text-xs text-slate-500">Completion rate by status</p>
            </div>
          </div>
          
          <div className="p-5 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-1.5"><span className="font-semibold text-slate-700">Submitted by managers</span><span className="font-bold text-blue-600">{subPct}%</span></div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width: `${subPct}%`}}></div></div>
                <div className="text-[10px] text-slate-500 mt-1">{total} of {total190} employees</div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5"><span className="font-semibold text-slate-700">Approved by CEO</span><span className="font-bold text-green-600">{appPct}%</span></div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-green-400 rounded-full" style={{width: `${appPct}%`}}></div></div>
                <div className="text-[10px] text-slate-500 mt-1">{approved} of {total190} employees</div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5"><span className="font-semibold text-slate-700">Not yet started</span><span className="font-bold text-amber-500">{pendPct}%</span></div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{width: `${pendPct}%`}}></div></div>
                <div className="text-[10px] text-slate-500 mt-1">{Math.max(0, total190 - total)} of {total190} employees</div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 pt-4 mt-2 border-t border-slate-100">
              <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100"><div className="text-lg font-bold text-slate-800">{total}</div><div className="text-[9px] text-slate-500 font-medium">Total</div></div>
              <div className="bg-amber-50 rounded-lg p-2 text-center border border-amber-100"><div className="text-lg font-bold text-amber-600">{atHR}</div><div className="text-[9px] text-amber-600 font-medium">At HR</div></div>
              <div className="bg-purple-50 rounded-lg p-2 text-center border border-purple-100"><div className="text-lg font-bold text-purple-600">{atCEO}</div><div className="text-[9px] text-purple-600 font-medium">At CEO</div></div>
              <div className="bg-green-50 rounded-lg p-2 text-center border border-green-100"><div className="text-lg font-bold text-green-600">{approved}</div><div className="text-[9px] text-green-600 font-medium">Done</div></div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl text-indigo-600">📈</div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Balanced Scorecard — KPA Progress</h2>
              <p className="text-xs text-slate-500">Live Company performance vs targets for {selectedQuarter} {selectedYear}</p>
            </div>
          </div>
          
          <div className="p-5 flex flex-col justify-between flex-1 space-y-4">
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-800">Financial Resilience (13.5%)</span>
                  <span className="text-xs font-bold text-blue-600">{financialResilience !== null ? financialResilience.toFixed(2) + '%' : '—'}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${financialResilience || 0}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-800">Operational Effectiveness (45.1%)</span>
                  <span className="text-xs font-bold text-emerald-600">{operationalEffectiveness !== null ? operationalEffectiveness.toFixed(2) + '%' : '—'}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${operationalEffectiveness || 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-800">Human Capital (25.9%)</span>
                  <span className="text-xs font-bold text-amber-500">{humanCapital !== null ? humanCapital.toFixed(2) + '%' : '—'}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${humanCapital || 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-800">Safety & Environment (12.4%)</span>
                  <span className="text-xs font-bold text-teal-600">{safetyEnvironment !== null ? safetyEnvironment.toFixed(2) + '%' : '—'}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${safetyEnvironment || 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-800">Reputational Capital (3.0%)</span>
                  <span className="text-xs font-bold text-purple-600">{reputationalCapital !== null ? reputationalCapital.toFixed(2) + '%' : '—'}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${reputationalCapital || 0}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 flex justify-between items-center mt-2 shadow-sm border border-slate-800">
              <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                Company Performance <span className="text-slate-500 normal-case tracking-normal ml-1">| Achievement: <b className="text-slate-300">{safeCpPct !== null ? ((safeCpPct / 8.87) * 100).toFixed(1) + '%' : '—'}</b></span>
              </span>
              <span className="text-[16px] font-black text-amber-300">
                {safeCpPct !== null ? safeCpPct.toFixed(2) : '—'} <span className="text-[12px] text-slate-500 font-semibold">/ 8.87 max</span>
              </span>
            </div>

          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">⭐</div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">EP Rating Cap Monitor</h2>
                <p className="text-xs text-slate-500">Maximum {Math.max(1, Math.floor(total190 * 0.05))} EP-rated employees at any time</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${over ? 'bg-red-100 text-red-700 border border-red-200' : ep >= Math.floor(total190 * 0.05) - 2 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
              {ep} / {Math.max(1, Math.floor(total190 * 0.05))} slots used {over && '— CAP REACHED'}
            </span>
          </div>
          <div className="p-5 flex flex-col justify-center flex-1">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 w-full">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-medium text-slate-500">EP slots used</span>
                  <span className="font-bold text-blue-600">{ep} / {Math.max(1, Math.floor(total190 * 0.05))}</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : ep >= Math.floor(total190 * 0.05) - 2 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{width: `${epPct}%`}}></div>
                </div>
              </div>
              <div className="flex-1 w-full bg-slate-50 border border-slate-200 text-slate-600 text-xs p-4 rounded-lg flex items-start gap-3">
                <span className="text-lg leading-none">ℹ️</span>
                <p>If the EP cap ({Math.max(1, Math.floor(total190 * 0.05))}) is reached, the system will actively block any new EP rating submissions from Line Managers until an existing EP is changed or rejected.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-xl">⚡</div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
              <p className="text-xs text-slate-500">Latest live appraisal actions for {selectedQuarter} {selectedYear}</p>
            </div>
          </div>
          
          <div className="p-5 flex flex-col justify-between flex-1">
            <div className="space-y-4">
              {!recent.length ? (
                <div className="text-center p-8 text-slate-500 text-xs">
                  <div className="text-3xl mb-2 opacity-50">📄</div>
                  No active submissions found in the database for {selectedQuarter} {selectedYear}.
                </div>
              ) : recent.map((a, i) => {
                const status = a.workflow?.status || 'UNKNOWN';
                const icons = {'SUBMITTED':'📄', 'UNDER_HR_REVIEW':'📄', 'APPROVED_BY_HR':'✓', 'WITH_CEO':'📤', 'APPROVED':'✅', 'NOT_APPROVED':'✗', 'REOPENED':'↩', 'ACKNOWLEDGED':'✅'};
                const bgColors = {'SUBMITTED':'bg-amber-100', 'UNDER_HR_REVIEW':'bg-amber-100', 'APPROVED_BY_HR':'bg-green-100', 'WITH_CEO':'bg-purple-100', 'APPROVED':'bg-green-100', 'NOT_APPROVED':'bg-red-100', 'REOPENED':'bg-red-100', 'ACKNOWLEDGED':'bg-green-100'};
                
                const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`.trim() || 'Unknown';
                const appQtrRaw = a.appraisalQuarter?.name || a.period?.quarter || a.quarter?.name || '';
                const qMatch = String(appQtrRaw).match(/Q?([1-4])/i) || String(appQtrRaw).match(/([1-4])/);
                const qtr = qMatch ? `Q${qMatch[1]}` : appQtrRaw;

                return (
                  <div className="flex gap-3" key={i}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-black/5 ${bgColors[status] || 'bg-blue-100'}`}>
                      <span className="text-sm">{icons[status] || '📄'}</span>
                    </div>
                    <div>
                     <div className="text-sm font-semibold text-slate-800">{empName} — {status.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-slate-500">{qtr} {selectedYear} · {formatToMMDDYY24h(a.updatedAt || a.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-5 pt-4 border-t border-slate-100">
              <button onClick={() => fetchDashboardData(true)} className="w-full py-2.5 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-blue-600 border border-slate-200 rounded-lg transition-colors flex justify-center items-center gap-2">
                <span>↻</span> Refresh Live Data
              </button>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-6">
         <StipCategoryChart scope="org" />
      </div>

    </div>
  );
}