'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../lib/api';
import Cookies from 'js-cookie';

export default function ExecutiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [execName, setExecName] = useState('');
  const [execArea, setExecArea] = useState('Executive Management');
  const [execTitle, setExecTitle] = useState('Executive Member');
  
  // Dynamic Data States
  const [allAppraisals, setAllAppraisals] = useState([]);
  const [managerGroups, setManagerGroups] = useState([]);

  // Fetch the live data from the new backend route
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const userCookie = Cookies.get('stip_user');
        if (userCookie) {
          const user = JSON.parse(userCookie);
          setExecName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
          setExecTitle(user.jobTitle || 'Executive Member');
          // In a fully integrated system, execArea might be mapped from department
          if (user.department) setExecArea(user.department);
        }

        const res = await api.get('/executive/dashboard');
        const data = res.data?.data;
        
        if (data) {
          setManagerGroups(data.managerPortfolios || []);
          setAllAppraisals(data.allAppraisals || []); 
        }
      } catch (error) {
        console.error("Error fetching executive dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Compute the live statistics securely from the backend payloads
  const { totalStaffCount, doneAppraisals, approvedAppraisals, averageIprf, openDisciplinaryCount, pendingStaffObjects } = useMemo(() => {
    if (!allAppraisals.length && !managerGroups.length) {
      return { totalStaffCount: 0, doneAppraisals: 0, approvedAppraisals: 0, averageIprf: 0, openDisciplinaryCount: 0, pendingStaffObjects: [] };
    }

    let totalStaff = 0;
    let done = 0;
    let approved = 0;
    let totalIprfSum = 0;
    let validIprfCount = 0;
    
    // 🚨 UPGRADED: Extracting FULL objects, not just IDs, for the UI rendering
    let pendingObjects = []; 

    managerGroups.forEach(group => {
      totalStaff += group.totalStaff;
      done += group.submittedAppraisals;
    });

    allAppraisals.forEach(app => {
      if (app.workflow?.status === 'APPROVED_BY_CEO') {
        approved++;
      }
      
      // 🚨 UPGRADED: Properly identifying pending records and grabbing the populated employee data
      if (app.workflow?.status === 'PENDING_MANAGER' || app.workflow?.status === 'DRAFT') {
        if (app.employeeId && typeof app.employeeId === 'object') {
           pendingObjects.push(app.employeeId);
        }
      }
      
      if (app.calculatedResults?.finalIprfScore) {
        totalIprfSum += app.calculatedResults.finalIprfScore;
        validIprfCount++;
      }
    });

    const avg = validIprfCount > 0 ? (totalIprfSum / validIprfCount) : 0;
    
    const openDisc = 0; // Requires integration with disciplinary module

    return { 
      totalStaffCount: totalStaff, 
      doneAppraisals: done, 
      approvedAppraisals: approved, 
      averageIprf: avg, 
      openDisciplinaryCount: openDisc, 
      pendingStaffObjects: pendingObjects 
    };
  }, [allAppraisals, managerGroups]);

  // Utility to get initials from a name safely
  const getInitials = (firstName, lastName) => {
    const f = firstName ? firstName.charAt(0) : '';
    const l = lastName ? lastName.charAt(0) : '';
    return (f + l).toUpperCase();
  };

  const renderStatusChip = (status) => {
    switch(status) {
      case 'APPROVED_BY_CEO': return '<span class="inline-block text-[10.5px] font-bold px-[9px] py-[2px] rounded-full whitespace-nowrap bg-[#D1FAE5] text-[#065F46]">CEO Approved</span>';
      case 'PENDING_MANAGER': return '<span class="inline-block text-[10.5px] font-bold px-[9px] py-[2px] rounded-full whitespace-nowrap bg-[#EEF2F7] text-[#64748B]">Pending</span>';
      case 'SUBMITTED_TO_HR': return '<span class="inline-block text-[10.5px] font-bold px-[9px] py-[2px] rounded-full whitespace-nowrap bg-[#FEF3C7] text-[#92400E]">With HR</span>';
      case 'SUBMITTED_TO_CEO': return '<span class="inline-block text-[10.5px] font-bold px-[9px] py-[2px] rounded-full whitespace-nowrap bg-[#DBEAFE] text-[#1E40AF]">Submitted to CEO</span>';
      default: return `<span class="inline-block text-[10.5px] font-bold px-[9px] py-[2px] rounded-full whitespace-nowrap bg-[#EEF2F7] text-[#64748B]">${status || 'Pending'}</span>`;
    }
  };

  // Safe name extractor
  const extractName = (details) => {
     if (!details) return { first: '', last: '' };
     let first = details.firstName || '';
     let last = details.lastName || '';
     
     // Handle backend merges
     if (!details.middleName && first.trim().includes(' ')) {
        const parts = first.trim().split(/\s+/);
        first = parts[0];
     }
     return { first, last };
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">Syncing live dashboard metrics...</div>;
  }

  return (
    <div className="max-w-[1120px] mx-auto p-[24px_22px_70px] font-sans">
      <div className="mb-[16px]">
        <h2 className="text-[22px] text-[#0D2B55] m-0 mb-[3px] tracking-[-0.01em] font-bold">Portfolio Dashboard — {execName}</h2>
        <div className="text-[13px] text-[#667085]">Everything under your portfolio — your line managers, their teams, and every appraisal, in one place.</div>
      </div>
      
      <div className="flex items-center gap-[10px] flex-wrap bg-[#EFF6FF] border border-[#BBD3F0] rounded-[12px] p-[12px_16px] mb-[16px] text-[13px]">
        <span className="w-[24px] h-[24px] rounded-full bg-[#0D2B55] text-white flex items-center justify-center font-extrabold text-[12px] flex-shrink-0">1</span> Staff member 
        <span className="text-[#C9A84C] font-extrabold">→</span> 
        <span className="w-[24px] h-[24px] rounded-full bg-[#0D2B55] text-white flex items-center justify-center font-extrabold text-[12px] flex-shrink-0">2</span> Line Manager 
        <span className="text-[#C9A84C] font-extrabold">→</span> 
        <span className="w-[24px] h-[24px] rounded-full bg-[#0D2B55] text-white flex items-center justify-center font-extrabold text-[12px] flex-shrink-0">3</span> <b>Executive Manager (you)</b> 
        &nbsp;·&nbsp; you see every appraisal in your portfolio, including your line managers&rsquo; own.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-[12px] mb-[16px]">
        <div className="bg-white border border-[#E4E0D8] rounded-[13px] p-[14px_16px]">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#667085] mb-[5px]">Portfolio staff</div>
          <div className="text-[24px] font-extrabold text-[#0D2B55] leading-[1.1]">{totalStaffCount}</div>
          <div className="text-[11px] text-[#667085] mt-[3px]">{execArea}</div>
        </div>
        <div className="bg-white border border-[#E4E0D8] rounded-[13px] p-[14px_16px]">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#667085] mb-[5px]">Line managers</div>
          <div className="text-[24px] font-extrabold text-[#0D2B55] leading-[1.1]">{managerGroups.length}</div>
          <div className="text-[11px] text-[#667085] mt-[3px]">reporting to you</div>
        </div>
        <div className="bg-white border border-[#E4E0D8] rounded-[13px] p-[14px_16px]">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#667085] mb-[5px]">Q2 appraisals</div>
          <div className="text-[24px] font-extrabold text-[#0D2B55] leading-[1.1]">
            {doneAppraisals}<span className="text-[13px] text-[#667085]"> / {totalStaffCount}</span>
          </div>
          <div className="h-[8px] rounded-full bg-[#EDEAE3] overflow-hidden mt-[7px]">
            <div className="h-full bg-[#C9A84C]" style={{ width: `${totalStaffCount ? Math.round((doneAppraisals / totalStaffCount) * 100) : 0}%` }}></div>
          </div>
        </div>
        <div className="bg-white border border-[#E4E0D8] rounded-[13px] p-[14px_16px]">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#667085] mb-[5px]">Average IPRF (Q2)</div>
          <div className="text-[24px] font-extrabold text-[#0D2B55] leading-[1.1]">{averageIprf.toFixed(2)}</div>
          <div className="text-[11px] text-[#667085] mt-[3px]">{approvedAppraisals} CEO-approved</div>
        </div>
        <div className="bg-white border border-[#E4E0D8] rounded-[13px] p-[14px_16px] cursor-pointer hover:bg-gray-50">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#667085] mb-[5px]">Open disciplinary</div>
          <div className={`text-[24px] font-extrabold leading-[1.1] ${openDisciplinaryCount ? 'text-[#92400E]' : 'text-[#0D2B55]'}`}>{openDisciplinaryCount}</div>
          <div className="text-[11px] text-[#667085] mt-[3px]">live from shared data · view →</div>
        </div>
      </div>

      <div className="bg-white border border-[#E4E0D8] rounded-[13px] mb-[14px] overflow-hidden">
        <div className="flex justify-between items-center gap-[10px] p-[13px_17px] border-b border-[#E4E0D8] flex-wrap">
          <div>
            <div className="font-extrabold text-[#0D2B55] text-[14.5px]">Line managers in this portfolio</div>
            <div className="text-[11.5px] text-[#667085]">team size · current appraisals · average rating</div>
          </div>
        </div>
        <div className="p-0">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-left p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Line manager</th>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-left p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Title</th>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-center p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Team</th>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-center p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Appraised</th>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-center p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Avg IPRF</th>
              </tr>
            </thead>
            <tbody>
              {managerGroups.length === 0 ? (
                <tr>
                   <td colSpan="5" className="p-4 text-center text-[12px] text-gray-500">No Line Managers assigned to this portfolio.</td>
                </tr>
              ) : (
                managerGroups.map((mgr) => {
                  const { first, last } = extractName({ firstName: mgr.managerName });
                  return (
                    <tr key={mgr.managerId}>
                      <td className="p-[9px_12px] text-[13px] border-b border-[#F0EEE8] align-middle">
                        <div className="flex items-center gap-[9px]">
                          <span className="w-[28px] h-[28px] rounded-full bg-[#1E40AF] text-white inline-flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                            {getInitials(first, last)}
                          </span>
                          <b className="text-[#0D2B55]">{mgr.managerName}</b>
                        </div>
                      </td>
                      <td className="p-[9px_12px] text-[12px] border-b border-[#F0EEE8] align-middle">{mgr.jobTitle || 'Line Manager'}</td>
                      <td className="p-[9px_12px] text-[13px] border-b border-[#F0EEE8] align-middle text-center font-bold">{mgr.totalStaff}</td>
                      <td className="p-[9px_12px] text-[13px] border-b border-[#F0EEE8] align-middle text-center">{mgr.submittedAppraisals} / {mgr.totalStaff}</td>
                      <td className="p-[9px_12px] text-[13px] border-b border-[#F0EEE8] align-middle text-center font-bold">{mgr.averageTeamIprf}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-[#E4E0D8] rounded-[13px] mb-[14px] overflow-hidden">
        <div className="flex justify-between items-center gap-[10px] p-[13px_17px] border-b border-[#E4E0D8] flex-wrap">
          <div>
            <div className="font-extrabold text-[#0D2B55] text-[14.5px]">Awaiting appraisal</div>
            <div className="text-[11.5px] text-[#667085]">staff without a completed appraisal this quarter</div>
          </div>
        </div>
        <div className="p-[14px_17px]">
          {pendingStaffObjects.length ? pendingStaffObjects.map(emp => {
             const { first, last } = extractName(emp.personalDetails);
             const fullName = `${first} ${last}`.trim() || 'Unknown Employee';
             const title = emp.employmentDetails?.jobTitle || 'Staff Member';

             return (
              <div key={emp._id || Math.random()} className="flex items-center gap-[9px] p-[8px_0] border-b border-dashed border-[#F0EEE8] text-[12.5px] flex-wrap last:border-0">
                <span className="w-[28px] h-[28px] rounded-full bg-[#0D2B55] text-white inline-flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                  {getInitials(first, last)}
                </span>
                <b>{fullName}</b>
                <span className="text-[#667085] text-[11.5px]">{title}</span>
                <span className="ml-auto text-[10.5px] text-[#667085]" dangerouslySetInnerHTML={{ __html: renderStatusChip('PENDING_MANAGER') }} />
              </div>
            );
          }) : (
            <div className="text-[13px] text-[#667085]">Everyone in the portfolio has an active appraisal. ✓</div>
          )}
        </div>
      </div>
    </div>
  );
}