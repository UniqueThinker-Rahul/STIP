'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { Server, Database, Mail, Shield, FileText } from 'lucide-react';
import usePersistentFilter from '../../../hooks/usePersistentFilter';

// Fallback colors for dynamically generated company badges
const BADGE_COLORS = [
  'bg-[#DBEAFE] text-[#1E40AF]', // Blue
  'bg-[#D1FAE5] text-[#065F46]', // Green
  'bg-[#FEF3C7] text-[#92400E]', // Amber
  'bg-[#EDE9FE] text-[#4C1D95]', // Purple
  'bg-[#FCE7F3] text-[#9D174D]', // Pink
  'bg-[#CCFBF1] text-[#115E59]'  // Teal
];

const QUARTERS = [
  { val: 'Q1', month: 3, label: 'Q1 (Jan-Mar)' },
  { val: 'Q2', month: 6, label: 'Q2 (Apr-Jun)' },
  { val: 'Q3', month: 9, label: 'Q3 (Jul-Sep)' },
  { val: 'Q4', month: 12, label: 'Q4 (Oct-Dec)' }
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
  const yearOptions = [
    realTimeCurrentYear - 3, 
    realTimeCurrentYear - 2, 
    realTimeCurrentYear - 1, 
    realTimeCurrentYear, 
    realTimeCurrentYear + 1
  ];

  const [selectedYear, setSelectedYear] = usePersistentFilter('ict_dash_year', realTimeCurrentYear.toString());
  const [selectedQuarter, setSelectedQuarter] = usePersistentFilter('ict_dash_qtr', defaultQuarter);
  const [isManualYear, setIsManualYear] = useState(false);
  
  const [quarterlyMetrics, setQuarterlyMetrics] = useState(null);
  const [quarterLoading, setQuarterLoading] = useState(false);

  // -------------------------------------------------------------
  // Fetch Dynamic Quarterly Scorecard Status (Matches Control Page)
  // -------------------------------------------------------------
  const fetchQuarterlyScorecardStatus = useCallback(async (year, quarter) => {
    try {
      setQuarterLoading(true);
      const targetMonth = QUARTERS.find(q => q.val === quarter)?.month || 3;
      
      const [qscRes, metricsRes] = await Promise.all([
        api.get(`/quarterly-scorecards/${year}`).catch(() => ({ data: { data: [] } })),
        api.get(`/company-metrics/${year}/${targetMonth}`).catch(() => ({ data: { data: null } }))
      ]);
      
      const list = qscRes.data?.data || [];
      const match = list.find(item => String(item.quarter).toUpperCase() === quarter) || {};
      const cMetrics = metricsRes.data?.data || {};

      setQuarterlyMetrics({
        ...match,
        ...cMetrics,
        locked: match.locked || cMetrics.locked || false,
        lockedBy: match.lockedBy || cMetrics.lockedBy || null
      });
      
    } catch (error) {
      console.error(`Failed to load scorecard status for ${quarter} ${year}`, error);
      setQuarterlyMetrics(null);
    } finally {
      setQuarterLoading(false);
    }
  }, []);

  // Fetch initial dashboard metrics (Staff, Logs, Configs)
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [usersRes, auditRes, configRes, quarterRes, formulaRes] = await Promise.all([
          api.get('/users').catch(() => ({ data: { data: [] } })),
          api.get('/audit?limit=500').catch(() => ({ data: { data: [] } })),
          api.get('/config/dropdowns').catch(() => ({ data: { data: {} } })), 
          api.get('/quarters').catch(() => ({ data: { data: [] } })),
          api.get('/settings/formula').catch(() => ({ data: { data: null } }))
        ]);

        const fetchedStaff = usersRes.data?.data || [];
        setStaff(fetchedStaff);
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
  const scorecardLocked = quarterlyMetrics?.locked || false;
  
  const lockedBy = quarterlyMetrics?.lockedBy 
    ? (typeof quarterlyMetrics.lockedBy === 'object' 
        ? `${quarterlyMetrics.lockedBy.personalDetails?.firstName || ''} ${quarterlyMetrics.lockedBy.personalDetails?.lastName || ''}`.trim() 
        : 'CEO') 
    : 'CEO';

  const epCapPercentage = formulaConfig?.epCapPercent || 5.0;
  const maxEpAllowed = Math.floor(activeUsers * (epCapPercentage / 100));

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-[600] animate-pulse">Loading ICT Dashboard...</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px] flex flex-col md:flex-row justify-between items-start md:items-end gap-[12px]">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
            &#128187; ICT Admin Dashboard
          </div>
          <div className="text-[13px] text-[#6b7280]">
            System administration & STIP platform monitoring — CY{realTimeCurrentYear}
          </div>
        </div>
        
        {/* 🚨 UPGRADED: Filters moved to the top header area next to buttons */}
        <div className="flex flex-wrap items-center gap-[10px]">
          <div className="flex items-center gap-[6px] bg-white border border-[#E2DDD4] p-[4px] rounded-[8px] shadow-sm">
            <select 
              value={selectedQuarter} 
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="bg-transparent text-[12px] font-[700] text-[#0D2B55] outline-none cursor-pointer p-[6px_8px]"
            >
              {QUARTERS.map(q => (
                 <option key={q.val} value={q.val}>{q.label}</option>
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
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
                <option value="manual" className="font-bold text-[#1E40AF]">Enter Manually...</option>
              </select>
            )}
          </div>
          
          <button 
            className="bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border border-[#FDE68A] px-[16px] py-[8px] rounded-[8px] text-[12px] font-[700] transition-colors shadow-sm whitespace-nowrap flex items-center gap-[6px]"
            onClick={() => router.push(`/dashboard/ict/scorecard?year=${selectedYear}&quarter=${selectedQuarter}`)}
          >
            &#128274; Scorecard Control
          </button>
          <button 
            className="bg-[#0D2B55] hover:bg-[#1a3d6e] text-white px-[16px] py-[8px] rounded-[8px] text-[12px] font-[700] transition-colors shadow-sm whitespace-nowrap flex items-center gap-[6px]"
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
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">
              Scorecard Status
            </div>

            {/* Scorecard Status Indicator */}
            {quarterLoading ? (
              <div className="text-[26px] font-[800] leading-none mb-[6px] text-slate-300 animate-pulse">
                Checking...
              </div>
            ) : (
              <>
                <div className={`text-[32px] font-[800] leading-none mb-[6px] ${scorecardLocked ? 'text-[#059669]' : 'text-[#D97706]'}`}>
                  {scorecardLocked ? 'Locked' : 'Unlocked'}
                </div>
                <div className="text-[12px] font-[600] text-[#6b7280] truncate">
                  {scorecardLocked ? `Locked by ${lockedBy}` : `Editable by CEO (${selectedQuarter} ${selectedYear})`}
                </div>
              </>
            )}
          </div>

          <div className="mt-[14px]">
            <button 
              className="bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border border-[#FDE68A] px-[12px] py-[6px] rounded-[6px] text-[11px] font-[700] transition-colors"
              onClick={() => router.push(`/dashboard/ict/scorecard?year=${selectedYear}&quarter=${selectedQuarter}`)}
            >
              &#128274; Manage {selectedQuarter}
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
                &#127919; <strong className="text-[#0D2B55] font-[800]">CP%:</strong> <span>{metrics?.cpPct ? `${(metrics.cpPct).toFixed(2)}%` : 'Not configured'}</span><br/>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}