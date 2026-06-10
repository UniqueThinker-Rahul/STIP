'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

// Fallback colors for dynamically generated company badges
const BADGE_COLORS = [
  'bg-blue-900/50 text-blue-300 border-blue-800',
  'bg-green-900/50 text-green-300 border-green-800',
  'bg-amber-900/50 text-amber-300 border-amber-800',
  'bg-purple-900/50 text-purple-300 border-purple-800',
  'bg-pink-900/50 text-pink-300 border-pink-800',
  'bg-teal-900/50 text-teal-300 border-teal-800'
];

export default function HRDashboard() {
  const router = useRouter();
  
  const [appraisals, setAppraisals] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🚨 UPGRADE: Dynamic Company Codes State
  const [companyCodes, setCompanyCodes] = useState([]);
  
  // 🚨 NEW: State for active quarter
  const [activeQuarter, setActiveQuarter] = useState(null);

  // State for the Balanced Scorecard
  const [metrics, setMetrics] = useState({
    financialResilience: 82, operationalEffectiveness: 91, humanCapital: 78,
    safetyEnvironment: 95, reputationalCapital: 88, cpPct: 13.01, bscRawScore: 86.75
  });

  const fetchDashboardData = async (isInitialLoad = true) => {
    try {
      if (isInitialLoad) setLoading(true);
      
      // 🚨 UPGRADE: Added fetch for quarters
      const [appraisalsRes, staffRes, metricsRes, configRes, quartersRes] = await Promise.all([
        api.get('/appraisals').catch(() => ({ data: [] })), 
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/company-metrics/2026').catch(() => ({ data: { data: null } })),
        api.get('/config/dropdowns').catch(() => ({ data: { data: {} } })),
        api.get('/quarters').catch(() => ({ data: { data: [] } }))
      ]);
      
      setAppraisals(appraisalsRes.data?.data || appraisalsRes.data || []);
      setStaff(staffRes.data?.data || staffRes.data || []);
      
      if (metricsRes.data?.data) {
        setMetrics(metricsRes.data.data);
      }

      if (configRes.data?.data?.companyCodes) {
        setCompanyCodes(configRes.data.data.companyCodes);
      } else {
        setCompanyCodes(['FSM', 'CDU', 'NAR', 'GUM']);
      }

      // 🚨 NEW: Logic to find the active quarter based on today's date
      const allQuarters = quartersRes.data?.data || [];
      const now = new Date();
      let currentActive = allQuarters.find(q => {
        const start = new Date(q.startDate); start.setHours(0,0,0,0);
        const end = new Date(q.endDate); end.setHours(23,59,59,999);
        return now >= start && now <= end;
      });
      
      // Fallback: If no quarter is currently active, grab the most recently ended one or the next upcoming one
      if (!currentActive && allQuarters.length > 0) {
          currentActive = allQuarters[0]; 
      }
      
      if (currentActive) {
          setActiveQuarter(currentActive);
      }

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

  const atHR = appraisals.filter(a => ['SUBMITTED', 'UNDER_HR_REVIEW'].includes(a.workflow?.status)).length;
  const atCEO = appraisals.filter(a => ['WITH_CEO'].includes(a.workflow?.status)).length;
  const approved = appraisals.filter(a => ['APPROVED', 'APPROVED_BY_HR'].includes(a.workflow?.status)).length;
  const rejected = appraisals.filter(a => ['NOT_APPROVED', 'REOPENED'].includes(a.workflow?.status)).length;
  const ep = appraisals.filter(a => a.calculatedResults?.finalIprfScore >= 1.3).length;
  const total = appraisals.length;

  const total190 = staff.length > 0 ? staff.length : 190;
  const subPct = Math.round(total / total190 * 100) || 0;
  const appPct = Math.round(approved / total190 * 100) || 0;
  const pendPct = Math.max(0, 100 - subPct);
  const epPct = Math.round(ep / 9 * 100);
  const over = ep >= 9;

  const recent = [...appraisals]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 5);

  const { cpPct, bscRawScore, financialResilience, operationalEffectiveness, humanCapital, safetyEnvironment, reputationalCapital } = metrics;

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-medium animate-pulse">Connecting to live HR database...</div>;
  }

  return (
    <div className="space-y-6 pb-[60px]">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">HR Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">STIP program management — CY{activeQuarter ? activeQuarter.year : '2026'}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/dashboard/hr/review')} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center">
            ✍️ Review Appraisals
          </button>
          <button onClick={() => router.push('/dashboard/hr/add-staff')} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors">
            + Add Staff
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Navy Card */}
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

        {/* Pending HR Card */}
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

        {/* Awaiting CEO Card */}
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

        {/* Approved Card */}
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

      {/* Main Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Progress Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">📅</div>
            <div>
              {/* 🚨 UPGRADED: Fully dynamic title based on the active database quarter */}
              <h2 className="text-base font-semibold text-slate-900">
                {activeQuarter ? `${activeQuarter.name} ${activeQuarter.year}` : 'Active Quarter'} — Appraisal Progress
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
                <div className="text-[10px] text-slate-500 mt-1">{total190 - total} of {total190} employees</div>
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

        {/* 2. Balanced Scorecard — KPA Progress */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl text-indigo-600">📈</div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Balanced Scorecard — KPA Progress</h2>
              <p className="text-xs text-slate-500">Live Company performance vs targets</p>
            </div>
          </div>
          
          <div className="p-5 flex flex-col justify-between flex-1 space-y-4">
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-800">Financial Resilience (14%)</span>
                  <span className="text-xs font-bold text-blue-600">{financialResilience}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${financialResilience}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-800">Operational Effectiveness (45%)</span>
                  <span className="text-xs font-bold text-emerald-600">{operationalEffectiveness}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${operationalEffectiveness}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-800">Human Capital (26%)</span>
                  <span className="text-xs font-bold text-amber-500">{humanCapital}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${humanCapital}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-800">Safety & Environment (12%)</span>
                  <span className="text-xs font-bold text-teal-600">{safetyEnvironment}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${safetyEnvironment}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-800">Reputational Capital (3%)</span>
                  <span className="text-xs font-bold text-purple-600">{reputationalCapital}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${reputationalCapital}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 flex justify-between items-center mt-2 shadow-sm border border-slate-800">
              <span className="text-sm font-bold text-slate-300">BSC Raw Score &rarr; CP%</span>
              <div>
                <span className="text-xl font-black text-amber-300">{bscRawScore.toFixed(2)}</span>
                <span className="text-xs text-slate-500 mx-2">/ 100 &rarr;</span>
                <span className="text-xl font-black text-amber-300">{cpPct.toFixed(2)}%</span>
              </div>
            </div>

          </div>
        </div>

        {/* 3. EP Rating Cap Monitor */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">⭐</div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">EP Rating Cap Monitor</h2>
                <p className="text-xs text-slate-500">Maximum 9 EP-rated employees at any time</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${over ? 'bg-red-100 text-red-700 border border-red-200' : ep >= 7 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
              {ep} / 9 slots used {over && '— CAP REACHED'}
            </span>
          </div>
          <div className="p-5 flex flex-col justify-center flex-1">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 w-full">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-medium text-slate-500">EP slots used</span>
                  <span className="font-bold text-blue-600">{ep} / 9</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : ep >= 7 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{width: `${epPct}%`}}></div>
                </div>
              </div>
              <div className="flex-1 w-full bg-slate-50 border border-slate-200 text-slate-600 text-xs p-4 rounded-lg flex items-start gap-3">
                <span className="text-lg leading-none">ℹ️</span>
                <p>If the EP cap (9) is reached, the system will actively block any new EP rating submissions from Line Managers until an existing EP is changed or rejected.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Recent Activity Timeline */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-xl">⚡</div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
              <p className="text-xs text-slate-500">Latest live appraisal actions</p>
            </div>
          </div>
          
          <div className="p-5 flex flex-col justify-between flex-1">
            <div className="space-y-4">
              {!recent.length ? (
                <div className="text-center p-8 text-slate-500 text-xs">
                  <div className="text-3xl mb-2 opacity-50">📄</div>
                  No active submissions found in the database yet.
                </div>
              ) : recent.map((a, i) => {
                const status = a.workflow?.status || 'UNKNOWN';
                const icons = {'SUBMITTED':'📄', 'UNDER_HR_REVIEW':'📄', 'APPROVED_BY_HR':'✓', 'WITH_CEO':'📤', 'APPROVED':'✅', 'NOT_APPROVED':'✗', 'REOPENED':'↩'};
                const bgColors = {'SUBMITTED':'bg-amber-100', 'UNDER_HR_REVIEW':'bg-amber-100', 'APPROVED_BY_HR':'bg-green-100', 'WITH_CEO':'bg-purple-100', 'APPROVED':'bg-green-100', 'NOT_APPROVED':'bg-red-100', 'REOPENED':'bg-red-100'};
                
                const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`.trim() || 'Unknown';
                const qtr = a.period?.quarter || 'Q3';

                return (
                  <div className="flex gap-3" key={i}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-black/5 ${bgColors[status] || 'bg-blue-100'}`}>
                      <span className="text-sm">{icons[status] || '📄'}</span>
                    </div>
                    <div>
                     <div className="text-sm font-semibold text-slate-800">{empName} — {status.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-slate-500">{qtr} {activeQuarter ? activeQuarter.year : '2026'} · {new Date(a.updatedAt || a.createdAt).toLocaleDateString()}</div>
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

    </div>
  );
}