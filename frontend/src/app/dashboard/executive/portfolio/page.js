'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../lib/api';
import Cookies from 'js-cookie';

// --- Shared Utilities ---
const nm = (s) => `${s.fn} ${s.ln}`.trim();

// Disciplinary mock fallback (until connected to a future module)
// For visual testing of the "open cases" UI based on the image design.
const discCasesFor = (id) => [];

export default function PortfolioTree() {
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [execData, setExecData] = useState({ name: 'Loading...', title: '', area: '', staff: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const userCookie = Cookies.get('stip_user');
        const user = userCookie ? JSON.parse(userCookie) : {};
        const execName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Executive Member';
        
        const res = await api.get('/executive/dashboard');
        const { managerPortfolios = [], allAppraisals = [] } = res.data?.data || {};

        const staffMap = new Map();
        const mgrMap = new Map();
        
        managerPortfolios.forEach(m => mgrMap.set(String(m.managerId), m.managerName));

        // Use allAppraisals as the base for staff mapping (as per original logic)
        allAppraisals.forEach(a => {
          const emp = a.employeeId;
          if (!emp) return;
          
          if (!staffMap.has(emp._id)) {
            let first = emp.personalDetails?.firstName || '';
            const last = emp.personalDetails?.lastName || '';
            
            // Attempt to extract department safely, defaulting to 'Operations' 
            // or the user's area to match the grouped view in the new UI.
            let deptName = 'General';
            if (emp.employmentDetails?.department) {
              deptName = typeof emp.employmentDetails.department === 'string'
                ? emp.employmentDetails.department
                : emp.employmentDetails.department.name || 'General';
            }

            staffMap.set(emp._id, {
              id: emp._id,
              fn: first,
              ln: last,
              title: emp.employmentDetails?.jobTitle || '',
              department: deptName,
              parent: emp.employmentDetails?.reportingTo?._id || emp.employmentDetails?.reportingTo || null,
              mgr: 'Line Manager',
              cases: discCasesFor(emp._id) // Disciplinary cases binding
            });
          }
        });

        // Assign Manager Names
        const finalStaff = Array.from(staffMap.values()).map(s => {
          if (s.parent) s.mgr = mgrMap.get(String(s.parent)) || 'Line Manager';
          return s;
        });

        setExecData({
          name: execName,
          title: user.jobTitle || 'Executive',
          area: user.companyCode || 'Operations Group',
          staff: finalStaff
        });

      } catch (error) {
        console.error("Error fetching portfolio data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Group staff by Department for the new layout
  const { groupedStaff, metrics } = useMemo(() => {
    const groups = {};
    let totalOpen = 0;
    
    execData.staff.forEach(s => {
      const d = s.department || 'Operations';
      if (!groups[d]) groups[d] = [];
      groups[d].push(s);
      
      const openCount = s.cases.filter(c => c.status !== 'Closed').length;
      totalOpen += openCount;
    });

    return {
      groupedStaff: groups,
      metrics: {
        staffCount: execData.staff.length,
        deptCount: Object.keys(groups).length,
        totalCases: execData.staff.reduce((sum, s) => sum + s.cases.length, 0),
        openCases: totalOpen
      }
    };
  }, [execData]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">Loading Portfolio...</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto p-[24px_32px_80px] font-sans bg-[#F9F9F6] min-h-screen">
      
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-[26px] text-[#0D2B55] m-0 mb-1 font-extrabold flex items-center gap-2 tracking-tight">
          My Portfolio
          <svg className="w-5 h-5 text-[#0D2B55]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </h1>
        <div className="text-[14px] text-[#667085]">
          {execData.name} · {execData.title} {execData.area ? `— ${execData.area}` : ''}
        </div>
      </div>

      {/* Info Box */}
      {showInfo && (
        <div className="border border-[#E4E0D8] rounded-[10px] bg-white relative mb-6 overflow-hidden shadow-sm">
          <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#C9A84C]"></div>
          
          <div className="flex items-center justify-between p-[14px_20px] border-b border-[#E4E0D8]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 font-bold text-[#0D2B55] text-[15px]">
                <svg className="w-5 h-5 text-[#4375F1]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2a10 10 10 0 100 20 10 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                How My Portfolio works
              </div>
              <span className="bg-[#D1FAE5] text-[#065F46] text-[11px] font-bold px-[10px] py-[3px] rounded-full">
                Executive Member
              </span>
            </div>
            <button 
              onClick={() => setShowInfo(false)}
              className="text-[13px] text-[#667085] hover:text-[#0D2B55] font-semibold"
            >
              Hide
            </button>
          </div>
          
          <div className="p-[16px_20px_20px_20px]">
            <ul className="list-disc pl-5 text-[13.5px] text-[#4B5563] space-y-[6px] leading-relaxed">
              <li>Your portfolio is the set of departments under you. It lists the line managers and staff you oversee, from the HR structure.</li>
              <li>Structure: Staff → Line Manager → Executive Member (you). You see the disciplinary standing of everyone in your portfolio.</li>
              <li>This is a read-only oversight view — you monitor, HR and the CEO act.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        {[
          { label: 'STAFF IN PORTFOLIO', value: metrics.staffCount, color: '#065F46' },
          { label: 'DEPARTMENTS', value: metrics.deptCount, color: '#1E40AF' },
          { label: 'TOTAL CASES', value: metrics.totalCases, color: '#92400E' },
          { label: 'OPEN CASES', value: metrics.openCases, color: '#B91C1C' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white border border-[#E4E0D8] rounded-[10px] p-[20px] shadow-sm">
            <div className="text-[34px] font-extrabold text-[#0D2B55] leading-none mb-2" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-[11px] font-bold text-[#667085] tracking-wider uppercase">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Mint Alert Banner */}
      <div className="bg-[#D1FAE5] text-[#065F46] p-[12px_16px] rounded-[8px] text-[13.5px] mb-8 border border-[#A7F3D0]">
        Structure: Staff → Line Manager → Executive Member (you). You see the disciplinary standing of everyone below.
      </div>

      {/* Department Tables */}
      {Object.entries(groupedStaff).map(([dept, staffList]) => (
        <div key={dept} className="mb-10">
          <div className="mb-3 pl-1">
            <h2 className="text-[17px] font-extrabold text-[#0D2B55] m-0 leading-tight">{dept}</h2>
            <div className="text-[12.5px] text-[#667085]">{staffList.length} staff</div>
          </div>

          <div className="bg-white border border-[#E4E0D8] rounded-[10px] overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="bg-[#0D2B55] grid grid-cols-4 gap-4 px-[20px] py-[12px]">
              {['NAME', 'TITLE', 'SUPERVISOR', 'OPEN CASES'].map(col => (
                <div key={col} className="text-[#C9A84C] text-[10.5px] font-extrabold uppercase tracking-wider">
                  {col}
                </div>
              ))}
            </div>

            {/* Table Rows */}
            <div className="flex flex-col">
              {staffList.map((s, i) => {
                const openCasesCount = s.cases.length; // Uses mock length for now
                return (
                  <div 
                    key={s.id} 
                    className={`grid grid-cols-4 gap-4 px-[20px] py-[16px] items-center text-[13.5px] ${i !== staffList.length - 1 ? 'border-b border-[#F0EEE8]' : ''}`}
                  >
                    <div className="font-extrabold text-[#0D2B55]">
                      {nm(s)}
                    </div>
                    
                    <div className="text-[#4B5563]">
                      {s.title || '—'}
                    </div>
                    
                    <div className="text-[#4B5563]">
                      {s.mgr}
                    </div>
                    
                    <div>
                      {openCasesCount > 0 ? (
                        <span className="bg-[#FEF3C7] text-[#92400E] px-[12px] py-[3px] rounded-full text-[11.5px] font-bold inline-block border border-[#FDE68A]">
                          {openCasesCount} open
                        </span>
                      ) : (
                        <span className="text-[#6B7280]">Clear</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

    </div>
  );
}