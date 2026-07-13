'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../lib/api';
import Cookies from 'js-cookie';

// --- Shared Utilities for Real-Time UI ---
const ini = (s) => (s.fn?.charAt(0) || '') + (s.ln?.charAt(0) || '');
const nm = (s) => `${s.fn} ${s.ln}`.trim();
const isLM = (all, s) => all.some(x => x.parent === s.id);
const kids = (all, pid) => all.filter(s => s.parent === pid);
const stChip = (st) => {
  const m = {
    'CEO Approved': 'bg-[#D1FAE5] text-[#065F46]',
    'With HR': 'bg-[#FEF3C7] text-[#92400E]',
    'Submitted to CEO': 'bg-[#DBEAFE] text-[#1E40AF]',
    'Pending': 'bg-[#EEF2F7] text-[#64748B]'
  };
  return `<span class="inline-block text-[10.5px] font-bold px-[9px] py-[2px] rounded-full whitespace-nowrap ${m[st] || m['Pending']}">${st}</span>`;
};

// Disciplinary mock fallback (until connected to a future module)
const discCasesFor = (id) => [];

export default function PortfolioTree() {
  const [loading, setLoading] = useState(true);
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

        // Parse Backend Appraisals into UI Staff structure
        const staffMap = new Map();
        const mgrMap = new Map();
        managerPortfolios.forEach(m => mgrMap.set(String(m.managerId), m.managerName));

        allAppraisals.forEach(a => {
          const emp = a.employeeId;
          if (!emp) return;
          
          if (!staffMap.has(emp._id)) {
            let first = emp.personalDetails?.firstName || '';
            const last = emp.personalDetails?.lastName || '';
            const mName = emp.personalDetails?.middleName || '';
            if (!mName && first.trim().includes(' ')) {
              first = first.trim().split(/\s+/)[0];
            }
            
            staffMap.set(emp._id, {
              id: emp._id,
              fn: first,
              ln: last,
              title: emp.employmentDetails?.jobTitle || '',
              station: emp.employmentDetails?.officeLocation || '',
              parent: emp.employmentDetails?.reportingTo?._id || emp.employmentDetails?.reportingTo || null,
              mgr: 'Line Manager',
              appr: {}
            });
          }

          const q = a.quarter || 'Q2';
          const s = staffMap.get(emp._id);
          
          let st = 'Pending';
          if (a.workflow?.status === 'APPROVED_BY_CEO') st = 'CEO Approved';
          else if (a.workflow?.status === 'SUBMITTED_TO_HR') st = 'With HR';
          else if (a.workflow?.status === 'SUBMITTED_TO_CEO') st = 'Submitted to CEO';

          s.appr[q] = { status: st };
        });

        // Assign Manager Names
        const finalStaff = Array.from(staffMap.values()).map(s => {
          if (s.parent) s.mgr = mgrMap.get(String(s.parent)) || 'Line Manager';
          return s;
        });

        setExecData({
          name: execName,
          title: user.jobTitle || 'Executive Management',
          area: user.companyCode || 'Portfolio',
          staff: finalStaff
        });

      } catch (error) {
        console.error("Error fetching portfolio tree:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const { all, direct, solo, un } = useMemo(() => {
    const all = execData.staff;
    const direct = kids(all, null); // Reports directly to Exec
    const solo = direct.filter(s => !isLM(all, s));
    const un = {};
    all.filter(s => s.parent !== null && !all.find(x => x.id === s.parent)).forEach(s => {
      (un[s.mgr] = un[s.mgr] || []).push(s);
    });
    return { all, direct, solo, un };
  }, [execData]);

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading Portfolio Hierarchy...</div>;

  const discFlag = (id) => {
    const cs = discCasesFor(id);
    if (!cs.length) return null;
    return <span className="inline-block text-[10.5px] font-bold px-[9px] py-[2px] rounded-full whitespace-nowrap bg-[#EEF2F7] text-[#64748B] ml-2">⚖ History ({cs.length})</span>;
  };

  const memRow = (s) => (
    <div key={s.id} className="flex items-center gap-[9px] p-[8px_15px] border-b border-dashed border-[#F0EEE8] text-[12.5px] flex-wrap last:border-0">
      <span className="w-[28px] h-[28px] rounded-full bg-[#0D2B55] text-white inline-flex items-center justify-center font-bold text-[11px] flex-shrink-0">
        {ini(s)}
      </span>
      <b>{nm(s)}</b>
      {discFlag(s.id)}
      <span className="text-[#667085] text-[11.5px]">{s.title}{s.station ? ` · ${s.station}` : ''}</span>
      <span className="ml-auto text-[10.5px] text-[#667085]" dangerouslySetInnerHTML={{ __html: `Q2: ${stChip(s.appr.Q2?.status || 'Pending')}` }} />
    </div>
  );

  const lmCard = (s, depth) => {
    const team = kids(all, s.id);
    return (
      <div key={`lm-${s.id}`} className="border border-[#E4E0D8] rounded-[12px] m-[0_0_12px_26px] bg-white overflow-hidden relative before:content-[''] before:absolute before:-left-[14px] before:top-[22px] before:w-[14px] before:h-[2px] before:bg-[#C9A84C]" style={{ marginLeft: `${26 * depth}px` }}>
        <div className="flex items-center gap-[10px] p-[11px_15px] bg-[#FBFAF7] border-b border-[#E4E0D8] flex-wrap">
          <span className="w-[28px] h-[28px] rounded-full bg-[#1E40AF] text-white inline-flex items-center justify-center font-bold text-[11px] flex-shrink-0">
            {ini(s)}
          </span>
          <div>
            <div className="font-extrabold text-[#0D2B55] text-[13.5px] flex items-center">
              {nm(s)} {discFlag(s.id)}
            </div>
            <div className="text-[11.5px] text-[#667085]">{s.title}{s.station ? ` · ${s.station}` : ''} · Line Manager</div>
          </div>
          <span className="ml-auto text-[11px] font-bold text-[#667085]">{team.length} report{team.length === 1 ? '' : 's'}</span>
        </div>
        {team.map(c => isLM(all, c) ? lmCard(c, depth + 1) : memRow(c))}
      </div>
    );
  };

  return (
    <div className="max-w-[1120px] mx-auto p-[24px_22px_70px] font-sans">
      <div className="mb-[16px]">
        <h2 className="text-[22px] text-[#0D2B55] m-0 mb-[3px] tracking-[-0.01em] font-bold">My Portfolio</h2>
        <div className="text-[13px] text-[#667085]">The reporting structure under you — line managers and their teams, generated live from the database.</div>
      </div>
      
      <div className="flex items-center gap-[12px] bg-gradient-to-r from-[#0D2B55] to-[#16386b] text-white rounded-[13px] p-[15px_18px] mb-[12px]">
        <span className="w-[38px] h-[38px] rounded-full bg-[#C9A84C] text-[#0D2B55] inline-flex items-center justify-center font-bold text-[14px] flex-shrink-0">
          {execData.name.split(' ').map(w => w[0]).join('').toUpperCase()}
        </span>
        <div>
          <div className="font-extrabold text-[15px]">{execData.name}</div>
          <div className="text-[12px] opacity-85">{execData.title} · {execData.area} · portfolio of {all.length}</div>
        </div>
      </div>

      {direct.filter(s => isLM(all, s)).map(s => lmCard(s, 1))}

      {solo.length > 0 && (
        <div className="border border-[#E4E0D8] rounded-[12px] m-[0_0_12px_26px] bg-white overflow-hidden relative before:content-[''] before:absolute before:-left-[14px] before:top-[22px] before:w-[14px] before:h-[2px] before:bg-[#C9A84C]">
          <div className="flex items-center gap-[10px] p-[11px_15px] bg-[#FBFAF7] border-b border-[#E4E0D8] flex-wrap">
            <span className="w-[28px] h-[28px] rounded-full bg-[#C9A84C] text-[#0D2B55] inline-flex items-center justify-center font-bold text-[11px] flex-shrink-0">
              {execData.name.split(' ').map(w => w[0]).join('').toUpperCase()}
            </span>
            <div>
              <div className="font-extrabold text-[#0D2B55] text-[13.5px]">Direct reports to {execData.name}</div>
              <div className="text-[11.5px] text-[#667085]">no line manager in between</div>
            </div>
            <span className="ml-auto text-[11px] font-bold text-[#667085]">{solo.length}</span>
          </div>
          {solo.map(memRow)}
        </div>
      )}

      {Object.keys(un).map(m => {
        const t = un[m];
        return (
          <div key={`un-${m}`} className="border border-[#E4E0D8] rounded-[12px] m-[0_0_12px_26px] bg-white overflow-hidden relative before:content-[''] before:absolute before:-left-[14px] before:top-[22px] before:w-[14px] before:h-[2px] before:bg-[#C9A84C]">
            <div className="flex items-center gap-[10px] p-[11px_15px] bg-[#FBFAF7] border-b border-[#E4E0D8] flex-wrap">
              <span className="w-[28px] h-[28px] rounded-full bg-[#64748B] text-white inline-flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                {m.split(/[ ,]+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div className="font-extrabold text-[#0D2B55] text-[13.5px]">{m}</div>
                <div className="text-[11.5px] text-[#667085]">Line Manager (record held outside this portfolio)</div>
              </div>
              <span className="ml-auto text-[11px] font-bold text-[#667085]">{t.length} report{t.length === 1 ? '' : 's'}</span>
            </div>
            {t.map(memRow)}
          </div>
        );
      })}
    </div>
  );
}