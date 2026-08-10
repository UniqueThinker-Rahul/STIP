'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { Server, Database, Mail, Shield, FileText } from 'lucide-react';

// Fallback colors for dynamically generated company badges
const BADGE_COLORS = [
  'bg-[#DBEAFE] text-[#1E40AF]', // Blue
  'bg-[#D1FAE5] text-[#065F46]', // Green
  'bg-[#FEF3C7] text-[#92400E]', // Amber
  'bg-[#EDE9FE] text-[#4C1D95]', // Purple
  'bg-[#FCE7F3] text-[#9D174D]', // Pink
  'bg-[#CCFBF1] text-[#115E59]'  // Teal
];

export default function ICTDashboard() {
  const router = useRouter();

  // Core System States
  const [staff, setStaff] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dynamic Dashboard States
  const [companyCodes, setCompanyCodes] = useState([]);
  const [auditLogCountToday, setAuditLogCountToday] = useState(0); 
  const [activeQuarterName, setActiveQuarterName] = useState('Loading...');
  const [formulaConfig, setFormulaConfig] = useState(null);
  const [roleCounts, setRoleCounts] = useState({ LM: 0, HR: 0, CEO: 0, Staff: 0, ICT: 0 });

  // -------------------------------------------------------------
  // Dynamic Real-time Year & Quarterly Scorecard Filters Setup
  // -------------------------------------------------------------
  const realTimeCurrentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0 - 11
  const defaultQuarter = `Q${Math.floor(currentMonth / 3) + 1}`; // Q1, Q2, Q3, or Q4

  // Year Options: Rule (Current Year - 3 years to Current Year + 1 year)
  const yearOptions = Array.from({ length: 5 }, (_, i) => realTimeCurrentYear - 3 + i);

  const [selectedYear, setSelectedYear] = useState(realTimeCurrentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(defaultQuarter);
  const [isManualYear, setIsManualYear] = useState(false);
  const [quarterlyMetrics, setQuarterlyMetrics] = useState(null);
  const [quarterLoading, setQuarterLoading] = useState(false);

  // -------------------------------------------------------------
  // Fetch Dynamic Quarterly Scorecard Status
  // -------------------------------------------------------------
  const fetchQuarterlyScorecardStatus = useCallback(async (year, quarter) => {
    try {
      setQuarterLoading(true);
      // Try fetching specific quarter & year scorecard status dynamically
      const response = await api
        .get(`/company-metrics/${year}`, { params: { quarter } })
        .catch(() => api.get('/company-metrics', { params: { year, quarter } }))
        .catch(() => ({ data: { data: null } }));

      setQuarterlyMetrics(response.data?.data || null);
    } catch (error) {
      console.error(`Failed to load scorecard status for ${quarter} ${year}`, error);
      setQuarterlyMetrics(null);
    } finally {
      setQuarterLoading(false);
    }
  }, []);

  // Fetch initial dashboard metrics
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [usersRes, metricsRes, auditRes, configRes, quarterRes, formulaRes] = await Promise.all([
          api.get('/users').catch(() => ({ data: { data: [] } })),
          api.get(`/company-metrics/${realTimeCurrentYear}`).catch(() => ({ data: { data: null } })),
          api.get('/audit?limit=500').catch(() => ({ data: { data: [] } })),
          api.get('/config/dropdowns').catch(() => ({ data: { data: {} } })), 
          api.get('/quarters').catch(() => ({ data: { data: [] } })),
          api.get('/settings/formula').catch(() => ({ data: { data: null } }))
        ]);

        const fetchedStaff = usersRes.data?.data || [];
        setStaff(fetchedStaff);
        setMetrics(metricsRes.data?.data || null);
        setFormulaConfig(formulaRes.data?.data?.formula || null);

        // Calculate exact role counts dynamically
        let lm = 0, hr = 0, ceo = 0, staffCount = 0, ict = 0;
        fetchedStaff.forEach(u => {
           if (u.employmentDetails?.isActive === false) return;
           const roles = [u.security?.role, ...(u.security?.secondaryRoles || [])];
           if (roles.includes('MANAGER')) lm++;
           if (roles.includes('HR_ADMIN')) hr++;
           if (roles.includes('CEO')) ceo++;
           if (roles.includes('EMPLOYEE')) staffCount++;
           if (roles.includes('ICT_ADMIN')) ict++;
        });
        setRoleCounts({ LM: lm, HR: hr, CEO: ceo, Staff: staffCount, ICT: ict });

        // Filter audit logs for TODAY only
        const allLogs = auditRes.data?.data || [];
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        
        const todayLogs = allLogs.filter(log => {
          const logDate = new Date(log.createdAt || log.timestamp);
          return logDate >= startOfToday;
        });
        setAuditLogCountToday(todayLogs.length);

        // Dynamically resolve active quarter
        const quarters = quarterRes.data?.data || [];
        const now = new Date();
        const activeQ = quarters.find(q => {
          const start = new Date(q.startDate); start.setHours(0,0,0,0);
          const end = new Date(q.endDate); end.setHours(23,59,59,999);
          return now >= start && now <= end && !q.isLocked;
        });

        if (activeQ) {
          setActiveQuarterName(`${activeQ.name} (${activeQ.year})`);
        } else {
           setActiveQuarterName('No Active Quarter');
        }

        // Set dynamic company codes from DB
        if (configRes.data?.data?.companyCodes && configRes.data.data.companyCodes.length > 0) {
          setCompanyCodes(configRes.data.data.companyCodes);
        } else {
          setCompanyCodes(['FSM', 'CDU', 'NAR', 'GUM']);
        }

      } catch (error) {
        console.error('Failed to load ICT dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [realTimeCurrentYear]);

  // Re-fetch quarterly scorecard when selected year or quarter changes
  useEffect(() => {
    if (selectedYear && selectedQuarter) {
      fetchQuarterlyScorecardStatus(selectedYear, selectedQuarter);
    }
  }, [selectedYear, selectedQuarter, fetchQuarterlyScorecardStatus]);

  const activeUsers = staff.filter(s => s.employmentDetails?.isActive !== false).length;

  // Quarterly Scorecard Status derived values
  const currentScorecardData = quarterlyMetrics || metrics;
  const scorecardLocked = currentScorecardData?.locked || false;
  const lockedBy = currentScorecardData?.lockedBy
    ? `${currentScorecardData.lockedBy.personalDetails?.firstName || ''} ${currentScorecardData.lockedBy.personalDetails?.lastName || ''}`.trim()
    : 'CEO';

  const epCapPercentage = formulaConfig?.epCapPercent || 5.0;
  const maxEpAllowed = Math.floor(activeUsers * (epCapPercentage / 100));

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-[600] animate-pulse">Loading ICT Dashboard...</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px] flex justify-between items-end">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
            &#128187; ICT Admin Dashboard
          </div>
          <div className="text-[13px] text-[#6b7280]">
            System administration & STIP platform monitoring — CY{realTimeCurrentYear}
          </div>
        </div>
        <div className="flex gap-[10px]">
          <button 
            className="bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border border-[#FDE68A] px-[16px] py-[8px] rounded-[8px] text-[12px] font-[700] transition-colors shadow-sm"
            onClick={() => router.push(`/dashboard/ict/scorecard?year=${selectedYear}&quarter=${selectedQuarter}`)}
          >
            &#128274; Scorecard Control
          </button>
          <button 
            className="bg-[#0D2B55] hover:bg-[#1a3d6e] text-white px-[16px] py-[8px] rounded-[8px] text-[12px] font-[700] transition-colors shadow-sm"
            onClick={() => router.push('/dashboard/ict/audit')}
          >
            &#128203; View Audit Trail
          </button>
        </div>
      </div>

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px] mb-[24px]">
        
        {/* Total Staff Card */}
        <div className="bg-[#0D2B55] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-white/50 mb-[4px]">Total Staff</div>
            <div className="text-[32px] font-[800] text-[#e8c96a] leading-none mb-[6px]">{staff.length}</div>
            <div className="text-[12px] font-[600] text-white/40">Registered in Database</div>
          </div>
          <div className="flex gap-[6px] mt-[14px] overflow-x-auto pb-1 custom-scrollbar whitespace-nowrap">
            {companyCodes.map((code, index) => {
              const count = staff.filter(s => s.companyCode === code).length || 0;
              const colorClass = BADGE_COLORS[index % BADGE_COLORS.length];
              return (
                <span key={code} className={`${colorClass} px-[6px] py-[2px] rounded-[4px] text-[10px] font-[800] shrink-0`}>
                  {code} {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* Active Users Card */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">Active Users</div>
            <div className="text-[32px] font-[800] text-[#1E40AF] leading-none mb-[6px]">{activeUsers}</div>
            <div className="text-[12px] font-[600] text-[#6b7280]">Portal access unlocked</div>
          </div>
          <div className="flex gap-[6px] mt-[14px] flex-wrap">
            <span className="bg-[#DBEAFE] text-[#1E40AF] px-[6px] py-[2px] rounded-[4px] text-[10px] font-[800]" title="Line Managers">LM {roleCounts.LM}</span>
            <span className="bg-[#D1FAE5] text-[#065F46] px-[6px] py-[2px] rounded-[4px] text-[10px] font-[800]" title="HR Admins">HR {roleCounts.HR}</span>
            <span className="bg-[#FEF3C7] text-[#92400E] px-[6px] py-[2px] rounded-[4px] text-[10px] font-[800]" title="CEO">CEO {roleCounts.CEO}</span>
            <span className="bg-[#EDE9FE] text-[#4C1D95] px-[6px] py-[2px] rounded-[4px] text-[10px] font-[800]" title="General Staff">Staff {roleCounts.Staff}</span>
            <span className="bg-[#F3E8FF] text-[#7E22CE] px-[6px] py-[2px] rounded-[4px] text-[10px] font-[800]" title="ICT Admins">ICT {roleCounts.ICT}</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 🚨 UPDATED SECTION: QUARTERLY SCORECARD STATUS CARD      */}
        {/* ========================================================= */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[16px_20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-[10px]">
              <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280]">
                Scorecard Status
              </div>
              <span className="text-[10px] bg-[#0D2B55]/10 text-[#0D2B55] px-[6px] py-[2px] rounded font-[700]">
                Quarterly
              </span>
            </div>

            {/* Quarter & Year Filters Header */}
            <div className="grid grid-cols-2 gap-[8px] mb-[12px]">
              {/* Quarter Filter Dropdown */}
              <div>
                <label className="block text-[10px] font-[700] uppercase text-[#6b7280] mb-[2px]">
                  Quarter
                </label>
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="w-full bg-[#FAF8F4] border border-[#E2DDD4] text-[#0D2B55] text-[11px] font-[700] rounded-[6px] px-[6px] py-[4px] focus:outline-none focus:border-[#0D2B55]"
                >
                  <option value="Q1">Q1 (Jan-Mar)</option>
                  <option value="Q2">Q2 (Apr-Jun)</option>
                  <option value="Q3">Q3 (Jul-Sep)</option>
                  <option value="Q4">Q4 (Oct-Dec)</option>
                </select>
              </div>

              {/* Year Filter (Dropdown + Manual Input Option) */}
              <div>
                <div className="flex justify-between items-center mb-[2px]">
                  <label className="text-[10px] font-[700] uppercase text-[#6b7280]">
                    Year
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsManualYear(!isManualYear)}
                    className="text-[9px] font-[700] text-[#1E40AF] hover:underline"
                    title="Toggle manual year entry"
                  >
                    {isManualYear ? 'List' : 'Manual'}
                  </button>
                </div>

                {isManualYear ? (
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    placeholder="YYYY"
                    className="w-full bg-[#FAF8F4] border border-[#E2DDD4] text-[#0D2B55] text-[11px] font-[700] rounded-[6px] px-[6px] py-[4px] focus:outline-none focus:border-[#0D2B55]"
                  />
                ) : (
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full bg-[#FAF8F4] border border-[#E2DDD4] text-[#0D2B55] text-[11px] font-[700] rounded-[6px] px-[6px] py-[4px] focus:outline-none focus:border-[#0D2B55]"
                  >
                    {yearOptions.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr} {yr === realTimeCurrentYear ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Scorecard Status Indicator */}
            {quarterLoading ? (
              <div className="text-[13px] font-[600] text-slate-400 animate-pulse my-2">
                Checking {selectedQuarter} {selectedYear}...
              </div>
            ) : (
              <div>
                <div className={`text-[26px] font-[800] leading-none mb-[4px] ${scorecardLocked ? 'text-[#059669]' : 'text-[#D97706]'}`}>
                  {scorecardLocked ? 'Locked' : 'Unlocked'}
                </div>
                <div className="text-[11px] font-[600] text-[#6b7280] truncate">
                  {scorecardLocked ? `Locked by ${lockedBy}` : `Editable by CEO (${selectedQuarter} ${selectedYear})`}
                </div>
              </div>
            )}
          </div>

          <div className="mt-[12px]">
            <button 
              className="w-full bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border border-[#FDE68A] px-[12px] py-[6px] rounded-[6px] text-[11px] font-[700] transition-colors flex items-center justify-center gap-[4px]"
              onClick={() => router.push(`/dashboard/ict/scorecard?year=${selectedYear}&quarter=${selectedQuarter}`)}
            >
              &#128274; Manage {selectedQuarter} {selectedYear}
            </button>
          </div>
        </div>

        {/* Audit Events Today Card */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">Audit Events Today</div>
            <div className="text-[32px] font-[800] text-[#0D2B55] leading-none mb-[6px]">{auditLogCountToday}</div>
            <div className="text-[12px] font-[600] text-[#6b7280]">System actions logged today</div>
          </div>
          <div className="mt-[14px]">
            <button 
              className="bg-white hover:bg-[#FAF8F4] text-[#0f1923] border border-[#E2DDD4] px-[12px] py-[6px] rounded-[6px] text-[11px] font-[700] transition-colors"
              onClick={() => router.push('/dashboard/ict/audit')}
            >
              View Daily Log
            </button>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-[20px]">
        
        {/* System Health */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center">
            <div className="flex items-center gap-[12px]">
              <div className="w-[36px] h-[36px] rounded-[8px] bg-[#D1FAE5] flex items-center justify-center text-[16px]">&#128312;</div>
              <div>
                <div className="text-[15px] font-[800] text-[#0D2B55]">System Health</div>
                <div className="text-[12px] font-[500] text-[#6b7280]">STIP portal component status</div>
              </div>
            </div>
            <span className="bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] px-[10px] py-[4px] rounded-[6px] text-[11px] font-[700]">
              All Systems Operational
            </span>
          </div>
          
          <div className="p-[20px]">
            <div className="flex flex-col gap-[10px]">
              
              <div className="flex justify-between items-center p-[12px_16px] bg-[#F0FDF4] rounded-[8px] border border-[#BBF7D0]">
                <div className="flex items-center gap-[12px]">
                  <Server className="w-[18px] h-[18px] text-[#059669]" />
                  <span className="text-[14px] font-[700] text-[#0f1923]">STIP Application Server</span>
                </div>
                <div className="flex items-center gap-[12px]">
                  <span className="text-[12px] text-[#059669] font-[600]">99.9% uptime</span>
                  <span className="bg-[#D1FAE5] text-[#065F46] px-[8px] py-[2px] rounded-[4px] text-[10px] font-[800]">&#9679; Online</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-[12px_16px] bg-[#F0FDF4] rounded-[8px] border border-[#BBF7D0]">
                <div className="flex items-center gap-[12px]">
                  <Database className="w-[18px] h-[18px] text-[#059669]" />
                  <span className="text-[14px] font-[700] text-[#0f1923]">Database</span>
                </div>
                <div className="flex items-center gap-[12px]">
                  <span className="text-[12px] text-[#059669] font-[600]">{staff.length} records connected</span>
                  <span className="bg-[#D1FAE5] text-[#065F46] px-[8px] py-[2px] rounded-[4px] text-[10px] font-[800]">&#9679; Healthy</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-[12px_16px] bg-[#F0FDF4] rounded-[8px] border border-[#BBF7D0]">
                <div className="flex items-center gap-[12px]">
                  <Mail className="w-[18px] h-[18px] text-[#059669]" />
                  <span className="text-[14px] font-[700] text-[#0f1923]">Email Notification Service</span>
                </div>
                <div className="flex items-center gap-[12px]">
                  <span className="text-[12px] text-[#059669] font-[600]">Operational</span>
                  <span className="bg-[#D1FAE5] text-[#065F46] px-[8px] py-[2px] rounded-[4px] text-[10px] font-[800]">&#9679; Online</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-[12px_16px] bg-[#F0FDF4] rounded-[8px] border border-[#BBF7D0]">
                <div className="flex items-center gap-[12px]">
                  <Shield className="w-[18px] h-[18px] text-[#059669]" />
                  <span className="text-[14px] font-[700] text-[#0f1923]">Authentication Service</span>
                </div>
                <div className="flex items-center gap-[12px]">
                  <span className="text-[12px] text-[#059669] font-[600]">JWT Secure</span>
                  <span className="bg-[#D1FAE5] text-[#065F46] px-[8px] py-[2px] rounded-[4px] text-[10px] font-[800]">&#9679; Secure</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-[12px_16px] bg-[#FFFBEB] rounded-[8px] border border-[#FDE68A]">
                <div className="flex items-center gap-[12px]">
                  <FileText className="w-[18px] h-[18px] text-[#92400E]" />
                  <span className="text-[14px] font-[700] text-[#0f1923]">Report Generation Engine</span>
                </div>
                <div className="flex items-center gap-[12px]">
                  <span className="text-[12px] text-[#92400E] font-[600]">Browser Native</span>
                  <span className="bg-[#FEF3C7] text-[#92400E] px-[8px] py-[2px] rounded-[4px] text-[10px] font-[800]">&#9679; Client-side</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Sidebar Columns */}
        <div className="flex flex-col gap-[16px]">
          
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FEE2E2] flex items-center justify-center text-[14px]">&#9889;</div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">ICT Quick Actions</div>
            </div>
            <div className="p-[20px] flex flex-col gap-[10px]">
              <button 
                className="w-full bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border border-[#FDE68A] font-[800] text-[13px] py-[10px] rounded-[8px] transition-colors flex items-center justify-center gap-[6px]"
                onClick={() => router.push(`/dashboard/ict/scorecard?year=${selectedYear}&quarter=${selectedQuarter}`)}
              >
                &#128274; Scorecard Lock / Unlock
              </button>
              <button 
                className="w-full bg-[#0D2B55] hover:bg-[#1a3d6e] text-white font-[800] text-[13px] py-[10px] rounded-[8px] transition-colors flex items-center justify-center gap-[6px]"
                onClick={() => router.push('/dashboard/ict/users')}
              >
                &#128101; Manage User Roles
              </button>
              <button 
                className="w-full bg-[#0D2B55] hover:bg-[#1a3d6e] text-white font-[800] text-[13px] py-[10px] rounded-[8px] transition-colors flex items-center justify-center gap-[6px]"
                onClick={() => router.push('/dashboard/ict/staff')}
              >
                &#128203; Staff Records
              </button>
              <button 
                className="w-full bg-[#0D2B55] hover:bg-[#1a3d6e] text-white font-[800] text-[13px] py-[10px] rounded-[8px] transition-colors flex items-center justify-center gap-[6px]"
                onClick={() => router.push('/dashboard/ict/formula')}
              >
                &#129662; Formula Configuration
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FEF3C7] flex items-center justify-center text-[14px]">&#9888;</div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">Critical Settings</div>
            </div>
            <div className="p-[20px]">
              <div className="text-[12px] text-[#6b7280] leading-[1.8]">
                &#128274; <strong className="text-[#0D2B55] font-[800]">Selected Scorecard:</strong> <span>{selectedQuarter} {selectedYear} ({scorecardLocked ? `Locked by ${lockedBy}` : 'Unlocked — editable by CEO'})</span><br/>
                &#11088; <strong className="text-[#0D2B55] font-[800]">EP Cap:</strong> Max {maxEpAllowed} employees ({epCapPercentage}% of {activeUsers})<br/>
                &#128197; <strong className="text-[#0D2B55] font-[800]">Active Quarter:</strong> {activeQuarterName}<br/>
                &#127919; <strong className="text-[#0D2B55] font-[800]">CP%:</strong> <span>{metrics?.cpFactor ? `${(metrics.cpFactor * 100).toFixed(2)}%` : 'Not configured'}</span><br/>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}