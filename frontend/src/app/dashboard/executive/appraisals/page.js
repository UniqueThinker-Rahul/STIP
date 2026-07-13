'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../lib/api';
import Cookies from 'js-cookie';

const ini = (s) => (s.fn?.charAt(0) || '') + (s.ln?.charAt(0) || '');
const nm = (s) => `${s.fn} ${s.ln}`.trim();
const isLM = (all, s) => all.some(x => x.parent === s.id);
const kids = (all, pid) => all.filter(s => s.parent === pid);
const lms = (all) => all.filter(s => isLM(all, s));
const teamName = (all, eName, s) => {
  if (!s.parent) return `${eName} (direct)`;
  const p = all.find(x => x.id === s.parent);
  return p ? nm(p) : (s.mgr || '—');
};

const stChip = (st) => {
  const m = {
    'CEO Approved': 'bg-[#D1FAE5] text-[#065F46]',
    'With HR': 'bg-[#FEF3C7] text-[#92400E]',
    'Submitted to CEO': 'bg-[#DBEAFE] text-[#1E40AF]',
    'Pending': 'bg-[#EEF2F7] text-[#64748B]'
  };
  return `<span class="inline-block text-[10.5px] font-bold px-[9px] py-[2px] rounded-full whitespace-nowrap ${m[st] || m['Pending']}">${st}</span>`;
};

const discCasesFor = (id) => [];

export default function PortfolioAppraisals() {
  const [loading, setLoading] = useState(true);
  const [execData, setExecData] = useState({ name: '', title: '', area: '', staff: [] });
  
  const [filterQ, setFilterQ] = useState('Q2');
  const [filterLM, setFilterLM] = useState('');
  const [filterSt, setFilterSt] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);

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

          s.appr[q] = { 
            status: st,
            iprf: a.calculatedResults?.finalIprfScore,
            pro: a.calculatedResults?.proRataFactor,
            award: a.calculatedResults?.stipAwardPercentage,
            ratings: [
              a.kpiRatings?.kpi1 || 0,
              a.kpiRatings?.kpi2 || 0,
              a.kpiRatings?.kpi3 || 0,
              a.kpiRatings?.kpi4 || 0,
              a.kpiRatings?.kpi5 || 0
            ]
          };
        });

        const finalStaff = Array.from(staffMap.values()).map(s => {
          if (s.parent) s.mgr = mgrMap.get(String(s.parent)) || 'Line Manager';
          return s;
        });

        setExecData({ name: execName, title: user.jobTitle, area: user.companyCode, staff: finalStaff });
      } catch (error) {
        console.error("Error fetching appraisals:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const lmOptions = useMemo(() => {
    const opts = [{ value: '', label: 'All line managers' }];
    lms(execData.staff).forEach(g => {
      opts.push({ value: String(g.id), label: nm(g) });
    });
    if (kids(execData.staff, null).some(s => !isLM(execData.staff, s))) {
      opts.push({ value: 'null', label: `${execData.name} (direct)` });
    }
    const un = [...new Set(execData.staff.filter(s => s.parent !== null && !execData.staff.find(x => x.id === s.parent)).map(s => s.mgr))];
    un.forEach(m => {
      opts.push({ value: `m:${m}`, label: m });
    });
    return opts;
  }, [execData]);

  const list = useMemo(() => {
    return execData.staff.filter(s => {
      if (filterLM !== '') {
        if (filterLM.startsWith('m:')) {
          if (s.mgr !== filterLM.slice(2)) return false;
        } else if (filterLM === 'null') {
          if (s.parent !== null) return false;
        } else if (String(s.parent) !== filterLM) {
          return false;
        }
      }
      const a = s.appr[filterQ];
      if (!a && filterSt !== 'Pending' && filterSt !== '') return false;
      const status = a ? a.status : 'Pending';
      if (filterSt && status !== filterSt) return false;
      if (filterSearch && !(nm(s).toLowerCase().includes(filterSearch.toLowerCase()) || s.title.toLowerCase().includes(filterSearch.toLowerCase()))) return false;
      return true;
    }).sort((a, b) => teamName(execData.staff, execData.name, a).localeCompare(teamName(execData.staff, execData.name, b)) || nm(a).localeCompare(nm(b)));
  }, [execData, filterQ, filterLM, filterSt, filterSearch]);

  const doneCount = execData.staff.filter(s => s.appr[filterQ]?.status && s.appr[filterQ]?.status !== 'Pending').length;

  const rTag = (i) => {
    const b = i >= 1.2 ? 'EP' : i >= 0.9 ? 'E' : 'NI';
    const bg = b === 'EP' ? 'bg-[#DBEAFE] text-[#1E40AF]' : b === 'E' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEF3C7] text-[#92400E]';
    return `<span class="inline-block text-[10.5px] font-bold px-[9px] py-[2px] rounded-full whitespace-nowrap ${bg}">${b} · ${i.toFixed(2)}</span>`;
  };

  const discCellFull = (id) => {
    const cs = discCasesFor(id);
    if (!cs.length) return '<span class="inline-block text-[10.5px] font-bold px-[9px] py-[2px] rounded-full whitespace-nowrap bg-[#D1FAE5] text-[#065F46]">✓ Clear</span>';
    return cs.map(c => `<div style="white-space:nowrap;padding:1px 0"><b style="font-size:11px;color:#0D2B55">${c.id}</b></div>`).join('');
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading Appraisals...</div>;

  return (
    <div className="max-w-[1120px] mx-auto p-[24px_22px_70px] font-sans">
      <div className="mb-[16px]">
        <h2 className="text-[22px] text-[#0D2B55] m-0 mb-[3px] tracking-[-0.01em] font-bold">Portfolio Appraisals</h2>
        <div className="text-[13px] text-[#667085]">Every appraisal under {execData.name}&rsquo;s portfolio — including line managers&rsquo; own appraisals.</div>
      </div>
      
      <div className="bg-white border border-[#E4E0D8] rounded-[13px] mb-[14px] overflow-hidden">
        <div className="flex justify-between items-center gap-[10px] p-[13px_17px] border-b border-[#E4E0D8] flex-wrap">
          <div className="flex gap-[9px] flex-wrap items-center">
            <select 
              value={filterQ} onChange={e => setFilterQ(e.target.value)}
              className="font-inherit text-[12.5px] font-semibold text-[#0D2B55] border-[1.5px] border-[#E4E0D8] rounded-[8px] p-[7px_10px] bg-white outline-none"
            >
              <option value="Q2">Q2 2026</option>
              <option value="Q1">Q1 2026</option>
            </select>
            <select 
              value={filterLM} onChange={e => setFilterLM(e.target.value)}
              className="font-inherit text-[12.5px] font-semibold text-[#0D2B55] border-[1.5px] border-[#E4E0D8] rounded-[8px] p-[7px_10px] bg-white outline-none"
            >
              {lmOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <select 
              value={filterSt} onChange={e => setFilterSt(e.target.value)}
              className="font-inherit text-[12.5px] font-semibold text-[#0D2B55] border-[1.5px] border-[#E4E0D8] rounded-[8px] p-[7px_10px] bg-white outline-none"
            >
              <option value="">All statuses</option>
              <option>CEO Approved</option>
              <option>With HR</option>
              <option>Submitted to CEO</option>
              <option>Pending</option>
            </select>
            <input 
              value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Search name or title…"
              className="font-inherit text-[12.5px] font-semibold text-[#0D2B55] border-[1.5px] border-[#E4E0D8] rounded-[8px] p-[7px_10px] bg-white outline-none w-[170px]"
            />
          </div>
          <div className="text-[11.5px] text-[#667085]">Showing {list.length} · {doneCount} of {execData.staff.length} staff appraised in {filterQ}</div>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-left p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Employee</th>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-left p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Title</th>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-left p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Line manager</th>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-center p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Rating</th>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-center p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Award %</th>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-center p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Status</th>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-left p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Discipline</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan="7" className="p-[20px] text-center text-[#667085] text-[13px]">No appraisals match your filters.</td></tr>
              ) : list.map(s => {
                const a = s.appr[filterQ];
                const pen = !a || a.status === 'Pending';
                
                return (
                  <tr key={s.id} className="cursor-pointer hover:bg-[#FBFAF7]" onClick={() => setSelectedAppraisal({ s, q: filterQ, a })}>
                    <td className="p-[9px_12px] text-[13px] border-b border-[#F0EEE8] align-middle">
                      <div className="flex items-center gap-[9px]">
                        <span className="w-[28px] h-[28px] rounded-full bg-[#0D2B55] text-white inline-flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                          {ini(s)}
                        </span>
                        <b className="text-[#0D2B55]">{nm(s)}</b>
                        {isLM(execData.staff, s) && <span className="inline-block text-[10.5px] font-bold px-[9px] py-[2px] rounded-full whitespace-nowrap bg-[#EDE9FE] text-[#4C1D95]">LM</span>}
                      </div>
                    </td>
                    <td className="p-[9px_12px] text-[12px] border-b border-[#F0EEE8] align-middle">{s.title}</td>
                    <td className="p-[9px_12px] text-[12px] border-b border-[#F0EEE8] align-middle">{teamName(execData.staff, execData.name, s)}</td>
                    <td className="p-[9px_12px] text-[13px] border-b border-[#F0EEE8] align-middle text-center" dangerouslySetInnerHTML={{ __html: pen || !a.iprf ? '—' : rTag(a.iprf) }} />
                    <td className={`p-[9px_12px] text-[13px] border-b border-[#F0EEE8] align-middle text-center font-extrabold ${pen ? 'text-[#667085]' : 'text-[#0F7A52]'}`}>
                      {pen || a.award === undefined ? '—' : `${a.award.toFixed(2)}%`}
                    </td>
                    <td className="p-[9px_12px] text-[13px] border-b border-[#F0EEE8] align-middle text-center" dangerouslySetInnerHTML={{ __html: stChip(pen ? 'Pending' : a.status) }} />
                    <td className="p-[9px_12px] text-[13px] border-b border-[#F0EEE8] align-middle" dangerouslySetInnerHTML={{ __html: discCellFull(s.id) }} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Built-in Modal */}
      {selectedAppraisal && (
        <div className="fixed inset-0 bg-[#0D2B55]/40 flex items-center justify-center p-[20px] z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-[600px] max-w-full shadow-2xl flex flex-col max-h-[90vh] zoom-in-95 animate-in">
            <div className="p-[18px_24px] border-b border-[#E4E0D8] flex justify-between items-center bg-[#FBFAF7] rounded-t-[16px]">
              <h2 className="text-[16px] font-extrabold text-[#0D2B55] m-0">Appraisal Review</h2>
              <button className="bg-transparent border-0 text-[20px] cursor-pointer text-[#667085] hover:text-[#0D2B55] leading-none p-0 m-0" onClick={() => setSelectedAppraisal(null)}>×</button>
            </div>
            
            <div className="p-[24px] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-[12px] mb-[24px]">
                <span className="w-[48px] h-[48px] rounded-full bg-[#0D2B55] text-white flex items-center justify-center font-bold text-[16px] flex-shrink-0">
                  {ini(selectedAppraisal.s)}
                </span>
                <div>
                  <div className="font-extrabold text-[#0D2B55] text-[18px]">{nm(selectedAppraisal.s)}</div>
                  <div className="text-[13px] text-[#667085]">{selectedAppraisal.s.title} {selectedAppraisal.s.station ? `· ${selectedAppraisal.s.station}` : ''}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[11px] font-bold text-[#667085] uppercase tracking-[0.05em] mb-[4px]">Appraisal Period</div>
                  <div className="font-extrabold text-[#0D2B55] text-[14px]">{selectedAppraisal.q}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[16px] mb-[24px]">
                <div className="bg-[#FBFAF7] border border-[#E4E0D8] rounded-[10px] p-[12px_16px]">
                  <div className="text-[10px] font-bold text-[#667085] uppercase tracking-[0.05em] mb-[4px]">Line Manager</div>
                  <div className="font-bold text-[#0D2B55] text-[13px]">{teamName(execData.staff, execData.name, selectedAppraisal.s)}</div>
                </div>
                <div className="bg-[#FBFAF7] border border-[#E4E0D8] rounded-[10px] p-[12px_16px]">
                  <div className="text-[10px] font-bold text-[#667085] uppercase tracking-[0.05em] mb-[4px]">Status</div>
                  <div dangerouslySetInnerHTML={{ __html: selectedAppraisal.a ? stChip(selectedAppraisal.a.status) : stChip('Pending') }} />
                </div>
              </div>

              {selectedAppraisal.a && selectedAppraisal.a.status !== 'Pending' ? (
                <React.Fragment>
                  <h3 className="text-[13px] font-extrabold text-[#0D2B55] uppercase tracking-[0.05em] mb-[12px] pb-[8px] border-b border-[#E4E0D8]">Performance Breakdown</h3>
                  
                  <div className="bg-[#FBFAF7] border border-[#E4E0D8] rounded-[10px] p-[16px] mb-[24px]">
                    <div className="flex justify-between items-center mb-[12px]">
                      <div className="text-[12.5px] font-bold text-[#0D2B55]">Individual Performance Rating Factor (IPRF)</div>
                      <div className="text-[18px] font-extrabold text-[#0D2B55]">{selectedAppraisal.a.iprf?.toFixed(2) || '—'}</div>
                    </div>
                    
                    {selectedAppraisal.a.ratings && (
                      <div className="grid grid-cols-5 gap-[6px] mb-[16px]">
                        {['KPI 1', 'KPI 2', 'KPI 3', 'KPI 4', 'KPI 5'].map((l, i) => (
                          <div key={i} className="text-center">
                            <div className="text-[10px] font-bold text-[#667085] uppercase mb-[4px]">{l}</div>
                            <div className="bg-white border border-[#E4E0D8] rounded-[6px] p-[6px] text-[12px] font-bold text-[#0D2B55]">{selectedAppraisal.a.ratings[i]}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-[16px] border-t border-[#E4E0D8] pt-[16px]">
                      <div>
                        <div className="text-[11px] font-bold text-[#667085] uppercase mb-[2px]">Pro-Rata Factor</div>
                        <div className="font-bold text-[#0D2B55] text-[13.5px]">{selectedAppraisal.a.pro?.toFixed(2) || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-bold text-[#667085] uppercase mb-[2px]">STIP Award</div>
                        <div className="font-extrabold text-[#0F7A52] text-[16px]">{selectedAppraisal.a.award?.toFixed(2) || '—'}%</div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              ) : (
                <div className="p-[20px] bg-[#FBFAF7] border border-dashed border-[#E4E0D8] rounded-[10px] text-center text-[13px] text-[#667085] mb-[24px]">
                  No appraisal data has been submitted for this quarter yet.
                </div>
              )}

              <h3 className="text-[13px] font-extrabold text-[#0D2B55] uppercase tracking-[0.05em] mb-[12px] pb-[8px] border-b border-[#E4E0D8]">Disciplinary Records</h3>
              <div className="text-[12.5px] text-[#065F46] font-bold flex items-center gap-[6px]">
                <span className="w-[18px] h-[18px] rounded-full bg-[#D1FAE5] inline-flex justify-center items-center">✓</span> No disciplinary records found.
              </div>

            </div>
            <div className="p-[16px_24px] border-t border-[#E4E0D8] bg-[#FBFAF7] rounded-b-[16px] text-right">
              <button className="bg-white border border-[#E4E0D8] rounded-[6px] p-[8px_16px] text-[12.5px] font-bold text-[#0D2B55] cursor-pointer hover:bg-[#F3F1EC]" onClick={() => setSelectedAppraisal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}