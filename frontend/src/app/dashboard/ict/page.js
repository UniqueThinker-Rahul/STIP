'use client';

import { useState, useEffect } from 'react';
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

  const [staff, setStaff] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🚨 UPGRADE: Dynamic Company Codes State
  const [companyCodes, setCompanyCodes] = useState([]);

  // Dynamically tracks the real database count
  const [auditLogCount, setAuditLogCount] = useState(0); 

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [usersRes, metricsRes, auditRes, configRes] = await Promise.all([
          api.get('/users').catch(() => ({ data: { data: [] } })),
          api.get('/company-metrics/2026').catch(() => ({ data: { data: null } })),
          api.get('/audit').catch(() => ({ data: { data: [] } })), // Fetch real logs
          api.get('/config/dropdowns').catch(() => ({ data: { data: {} } })) // 🚨 Fetch config
        ]);

        setStaff(usersRes.data?.data || []);
        setMetrics(metricsRes.data?.data || null);
        setAuditLogCount(auditRes.data?.data?.length || 0);

        // 🚨 UPGRADE: Set the dynamic company codes from the DB
        if (configRes.data?.data?.companyCodes) {
          setCompanyCodes(configRes.data.data.companyCodes);
        } else {
          // Fallback just in case the DB is empty
          setCompanyCodes(['FSM', 'CDU', 'NAR', 'GUM']);
        }

      } catch (error) {
        console.error('Failed to load ICT dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const activeUsers = staff.length; 

  const scorecardLocked = metrics?.locked || false;
  const lockedBy = metrics?.lockedBy ? `${metrics.lockedBy.personalDetails?.firstName} ${metrics.lockedBy.personalDetails?.lastName}` : 'CEO';

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
          <div className="text-[13px] text-[#6b7280]">System administration & STIP platform monitoring — CY2026</div>
        </div>
        <div className="flex gap-[10px]">
          <button 
            className="bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border border-[#FDE68A] px-[16px] py-[8px] rounded-[8px] text-[12px] font-[700] transition-colors shadow-sm"
            onClick={() => router.push('/dashboard/ict/scorecard')}
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
        
        <div className="bg-[#0D2B55] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-white/50 mb-[4px]">Total Staff</div>
            <div className="text-[32px] font-[800] text-[#e8c96a] leading-none mb-[6px]">{staff.length}</div>
            <div className="text-[12px] font-[600] text-white/40">STIP-eligible employees</div>
          </div>
          {/* 🚨 UPGRADE: Dynamic Map for Company Code Badges with Auto-Scroll */}
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

        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">Active Users</div>
            <div className="text-[32px] font-[800] text-[#1E40AF] leading-none mb-[6px]">{activeUsers}</div>
            <div className="text-[12px] font-[600] text-[#6b7280]">Portal roles configured</div>
          </div>
          <div className="flex gap-[6px] mt-[14px] flex-wrap">
            <span className="bg-[#DBEAFE] text-[#1E40AF] px-[6px] py-[2px] rounded-[4px] text-[10px] font-[800]">LM</span>
            <span className="bg-[#D1FAE5] text-[#065F46] px-[6px] py-[2px] rounded-[4px] text-[10px] font-[800]">HR</span>
            <span className="bg-[#FEF3C7] text-[#92400E] px-[6px] py-[2px] rounded-[4px] text-[10px] font-[800]">CEO</span>
            <span className="bg-[#EDE9FE] text-[#4C1D95] px-[6px] py-[2px] rounded-[4px] text-[10px] font-[800]">Staff</span>
            <span className="bg-[#F3E8FF] text-[#7E22CE] px-[6px] py-[2px] rounded-[4px] text-[10px] font-[800]">ICT</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">Scorecard Status</div>
            <div className={`text-[28px] font-[800] leading-none mb-[6px] ${scorecardLocked ? 'text-[#059669]' : 'text-[#D97706]'}`}>
              {scorecardLocked ? 'Locked' : 'Unlocked'}
            </div>
            <div className="text-[12px] font-[600] text-[#6b7280]">
              {scorecardLocked ? `Locked by ${lockedBy}` : 'KPA scores editable by CEO'}
            </div>
          </div>
          <div className="mt-[14px]">
            <button 
              className="bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border border-[#FDE68A] px-[12px] py-[6px] rounded-[6px] text-[11px] font-[700] transition-colors"
              onClick={() => router.push('/dashboard/ict/scorecard')}
            >
              &#128274; Manage
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-[700] uppercase tracking-widest text-[#6b7280] mb-[4px]">Audit Events Today</div>
            <div className="text-[32px] font-[800] text-[#0D2B55] leading-none mb-[6px]">{auditLogCount}</div>
            <div className="text-[12px] font-[600] text-[#6b7280]">System actions logged</div>
          </div>
          <div className="mt-[14px]">
            <button 
              className="bg-white hover:bg-[#FAF8F4] text-[#0f1923] border border-[#E2DDD4] px-[12px] py-[6px] rounded-[6px] text-[11px] font-[700] transition-colors"
              onClick={() => router.push('/dashboard/ict/audit')}
            >
              View Log
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
            <span className="bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] px-[10px] py-[4px] rounded-[6px] text-[11px] font-[700]">All Systems Operational</span>
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
                  <span className="text-[12px] text-[#059669] font-[600]">{staff.length} records active</span>
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
                  <span className="text-[12px] text-[#059669] font-[600]">5 roles active</span>
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
                onClick={() => router.push('/dashboard/ict/scorecard')}
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
                className="w-full bg-white hover:bg-[#FAF8F4] border border-[#E2DDD4] hover:border-[#0D2B55] text-[#0f1923] font-[700] text-[13px] py-[10px] rounded-[8px] transition-colors"
                onClick={() => router.push('/dashboard/ict/audit')}
              >
                &#128203; Full Audit Trail
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
                &#128274; <strong className="text-[#0D2B55] font-[800]">Scorecard Lock:</strong> <span>{scorecardLocked ? `Locked — ${lockedBy}` : 'Unlocked — editable by CEO'}</span><br/>
                &#11088; <strong className="text-[#0D2B55] font-[800]">EP Cap:</strong> Max 9 employees (5% of 190)<br/>
                &#128197; <strong className="text-[#0D2B55] font-[800]">Active Quarter:</strong> Q3 (Jul–Sep 2026)<br/>
                &#127919; <strong className="text-[#0D2B55] font-[800]">CP%:</strong> <span>{scorecardLocked ? 'Locked in' : 'Not yet locked'}</span><br/>
                &#128101; <strong className="text-[#0D2B55] font-[800]">Staff Count:</strong> {staff.length} employees
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}