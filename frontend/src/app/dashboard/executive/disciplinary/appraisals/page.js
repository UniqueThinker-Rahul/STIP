'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../../lib/api';
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
  
  const [dbQuarters, setDbQuarters] = useState([]);
  const [filterYear, setFilterYear] = useState('');
  const [filterQ, setFilterQ] = useState('');
  const [filterLM, setFilterLM] = useState('');
  const [filterSt, setFilterSt] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  
  // Replaced selectedAppraisal with a state tracking the currently expanded row ID
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const userCookie = Cookies.get('stip_user');
        const user = userCookie ? JSON.parse(userCookie) : {};
        const execName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Executive Member';
        
        const [res, qtrRes] = await Promise.all([
          api.get('/executive/dashboard'),
          api.get('/quarters').catch(() => ({ data: { data: [] } }))
        ]);

        const fetchedQuarters = qtrRes.data?.data || [];
        setDbQuarters(fetchedQuarters);

        const { managerPortfolios = [], allAppraisals = [], portfolioStaff = [] } = res.data?.data || {};
        const staffMap = new Map();
        
        const processStaffMember = (emp) => {
          if (!emp || !emp._id) return;
          if (emp.employmentDetails?.isDeleted) return; 
          
          const empIdStr = String(emp._id);
          if (staffMap.has(empIdStr)) return;

          const first = emp.personalDetails?.firstName?.trim() || '';
          const last = emp.personalDetails?.lastName?.trim() || '';
          const middle = emp.personalDetails?.middleName?.trim() || '';
          const fullFirstName = middle ? `${first} ${middle}` : first;
          
          let mgrName = 'Line Manager';
          let parentId = null;
          
          if (emp.employmentDetails?.reportingTo) {
             const rt = emp.employmentDetails.reportingTo;
             parentId = String(rt._id || rt);
             if (rt.personalDetails) {
                 mgrName = `${rt.personalDetails.firstName || ''} ${rt.personalDetails.lastName || ''}`.trim();
             }
          }

          staffMap.set(empIdStr, {
            id: empIdStr,
            fn: fullFirstName,
            ln: last,
            title: emp.employmentDetails?.jobTitle || 'Staff',
            station: emp.employmentDetails?.officeLocation || '',
            parent: parentId,
            mgr: mgrName,
            appr: {}
          });
        };

        portfolioStaff.forEach(processStaffMember);

        allAppraisals.forEach(a => {
          if (a.employeeId && typeof a.employeeId === 'object') {
            processStaffMember(a.employeeId);
          }
        });

        let latestPeriodKey = '';

        allAppraisals.forEach(a => {
          const emp = a.employeeId;
          const empIdStr = String(emp?._id || emp);
          if (!empIdStr || !staffMap.has(empIdStr)) return;
          
          const rawQ = a.period?.quarter || (typeof a.appraisalQuarter === 'object' ? a.appraisalQuarter?.name : a.appraisalQuarter) || a.quarter || 'Q3';
          const matchQ = String(rawQ).match(/Q[1-4]/i);
          const qName = matchQ ? matchQ[0].toUpperCase() : 'Q3';
          
          const qYear = a.appraisalQuarter?.year || a.reviewYear || a.period?.year || new Date().getFullYear();
          
          const periodKey = `${qYear}-${qName}`;
          if (!latestPeriodKey) latestPeriodKey = periodKey;
          
          const s = staffMap.get(empIdStr);
          
          let st = 'Pending';
          const wfStatus = a.workflow?.status;
          
          if (['APPROVED', 'APPROVED_BY_CEO', 'COMPLETED', 'ACKNOWLEDGED'].includes(wfStatus)) st = 'CEO Approved';
          else if (['SUBMITTED', 'UNDER_HR_REVIEW', 'APPROVED_BY_HR', 'SUBMITTED_TO_HR'].includes(wfStatus)) st = 'With HR';
          else if (['SUBMITTED_TO_CEO', 'WITH_CEO'].includes(wfStatus)) st = 'Submitted to CEO';

          const finalIprf = a.calculatedResults?.finalIprfScore;
          const stipAward = a.stipAward !== undefined ? a.stipAward : a.calculatedResults?.stipAwardPercentage;
          const proRata = a.calculatedResults?.proRataFactor || (emp.employmentDetails?.prorateValue ? emp.employmentDetails.prorateValue / 12 : 1.0);

          const deliveredResults = a.scores?.deliveredResults?.rating ?? a.kpiRatings?.kpi1 ?? 0;
          const behaviors = a.scores?.behaviors?.rating ?? a.kpiRatings?.kpi2 ?? 0;
          const safeWorking = a.scores?.safeWorking?.rating ?? a.kpiRatings?.kpi3 ?? 0;
          const jobCompetence = a.scores?.jobCompetence?.rating ?? a.kpiRatings?.kpi4 ?? 0;
          const dependability = a.scores?.dependability?.rating ?? a.kpiRatings?.kpi5 ?? 0;
          const adaptability = a.scores?.adaptability?.rating ?? 0;

          s.appr[periodKey] = { 
            status: st,
            iprf: finalIprf,
            pro: proRata,
            award: stipAward,
            ratings: [deliveredResults, behaviors, safeWorking, jobCompetence, dependability, adaptability]
          };
        });

        if (fetchedQuarters.length > 0) {
           const activeQ = fetchedQuarters.find(q => !q.isLocked);
           if (activeQ) {
             setFilterYear(String(activeQ.year));
             setFilterQ(activeQ.name);
           } else {
             setFilterYear(String(fetchedQuarters[0].year));
             setFilterQ(fetchedQuarters[0].name);
           }
        } else if (latestPeriodKey) {
           const [y, q] = latestPeriodKey.split('-');
           setFilterYear(y);
           setFilterQ(q);
        } else {
           setFilterYear(String(new Date().getFullYear()));
           setFilterQ('Q3');
        }

        const finalStaff = Array.from(staffMap.values());
        setExecData({ name: execName, title: user.jobTitle, area: user.companyCode, staff: finalStaff });
      } catch (error) {
        console.error("Error fetching appraisals:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Dynamically extract available years from DB
  const yearOptions = useMemo(() => {
    if (dbQuarters.length === 0) return [filterYear || new Date().getFullYear()];
    return [...new Set(dbQuarters.map(q => String(q.year)))].sort((a, b) => b - a);
  }, [dbQuarters, filterYear]);

  // Dynamically extract available quarters based on the selected year
  const quarterOptions = useMemo(() => {
    if (dbQuarters.length === 0) return ['Q1', 'Q2', 'Q3', 'Q4'];
    const qsForYear = dbQuarters.filter(q => String(q.year) === String(filterYear));
    if (qsForYear.length > 0) {
      return [...new Set(qsForYear.map(q => q.name))].sort();
    }
    return ['Q1', 'Q2', 'Q3', 'Q4'];
  }, [dbQuarters, filterYear]);

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

  const currentPeriodKey = `${filterYear}-${filterQ}`;

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
      
      const a = s.appr[currentPeriodKey];
      if (!a && filterSt !== 'Pending' && filterSt !== '') return false;
      
      const status = a ? a.status : 'Pending';
      if (filterSt && status !== filterSt) return false;
      
      if (filterSearch && !(nm(s).toLowerCase().includes(filterSearch.toLowerCase()) || s.title.toLowerCase().includes(filterSearch.toLowerCase()))) return false;
      
      return true;
    }).sort((a, b) => teamName(execData.staff, execData.name, a).localeCompare(teamName(execData.staff, execData.name, b)) || nm(a).localeCompare(nm(b)));
  }, [execData, currentPeriodKey, filterLM, filterSt, filterSearch]);

  const doneCount = execData.staff.filter(s => s.appr[currentPeriodKey]?.status && s.appr[currentPeriodKey]?.status !== 'Pending').length;

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
      
      <div className="bg-white border border-[#E4E0D8] rounded-[13px] mb-[14px] overflow-hidden shadow-sm">
        <div className="flex justify-between items-center gap-[10px] p-[13px_17px] border-b border-[#E4E0D8] flex-wrap">
          <div className="flex gap-[9px] flex-wrap items-center">
            
            {/* Split Dynamic Year Filter */}
            <select 
              value={filterYear} onChange={e => { setFilterYear(e.target.value); setExpandedRow(null); }}
              className="font-inherit text-[12.5px] font-semibold text-[#0D2B55] border-[1.5px] border-[#E4E0D8] rounded-[8px] p-[7px_10px] bg-white outline-none cursor-pointer"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            
            {/* Split Dynamic Quarter Filter */}
            <select 
              value={filterQ} onChange={e => { setFilterQ(e.target.value); setExpandedRow(null); }}
              className="font-inherit text-[12.5px] font-semibold text-[#0D2B55] border-[1.5px] border-[#E4E0D8] rounded-[8px] p-[7px_10px] bg-white outline-none cursor-pointer"
            >
              {quarterOptions.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
            
            <select 
              value={filterLM} onChange={e => { setFilterLM(e.target.value); setExpandedRow(null); }}
              className="font-inherit text-[12.5px] font-semibold text-[#0D2B55] border-[1.5px] border-[#E4E0D8] rounded-[8px] p-[7px_10px] bg-white outline-none cursor-pointer"
            >
              {lmOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            
            <select 
              value={filterSt} onChange={e => { setFilterSt(e.target.value); setExpandedRow(null); }}
              className="font-inherit text-[12.5px] font-semibold text-[#0D2B55] border-[1.5px] border-[#E4E0D8] rounded-[8px] p-[7px_10px] bg-white outline-none cursor-pointer"
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
          <div className="text-[11.5px] text-[#667085]">
            Showing {list.length} · {doneCount} of {execData.staff.length} staff appraised in {filterQ} {filterYear}
          </div>
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
                <tr><td colSpan="7" className="p-[30px] text-center text-[#667085] text-[13px]">No staff assigned to your portfolio matching current filters.</td></tr>
              ) : list.map(s => {
                const a = s.appr[currentPeriodKey];
                const pen = !a || a.status === 'Pending';
                const isExpanded = expandedRow === s.id;
                
                return (
                  <React.Fragment key={s.id}>
                    <tr 
                      className={`cursor-pointer transition-colors ${isExpanded ? 'bg-[#F9F8F5]' : 'hover:bg-[#FBFAF7]'}`} 
                      onClick={() => setExpandedRow(isExpanded ? null : s.id)}
                    >
                      <td className={`p-[9px_12px] text-[13px] border-b ${isExpanded ? 'border-transparent' : 'border-[#F0EEE8]'} align-middle`}>
                        <div className="flex items-center gap-[9px]">
                          <span className="w-[28px] h-[28px] rounded-full bg-[#0D2B55] text-white inline-flex items-center justify-center font-bold text-[11px] flex-shrink-0 shadow-sm">
                            {ini(s)}
                          </span>
                          <b className="text-[#0D2B55]">{nm(s)}</b>
                          {isLM(execData.staff, s) && <span className="inline-block text-[10.5px] font-bold px-[9px] py-[2px] rounded-full whitespace-nowrap bg-[#EDE9FE] text-[#4C1D95]">LM</span>}
                        </div>
                      </td>
                      <td className={`p-[9px_12px] text-[12px] border-b ${isExpanded ? 'border-transparent' : 'border-[#F0EEE8]'} align-middle`}>{s.title}</td>
                      <td className={`p-[9px_12px] text-[12px] border-b ${isExpanded ? 'border-transparent' : 'border-[#F0EEE8]'} align-middle`}>{teamName(execData.staff, execData.name, s)}</td>
                      <td className={`p-[9px_12px] text-[13px] border-b ${isExpanded ? 'border-transparent' : 'border-[#F0EEE8]'} align-middle text-center`} dangerouslySetInnerHTML={{ __html: pen || a.iprf === undefined || a.iprf === null ? '—' : rTag(a.iprf) }} />
                      <td className={`p-[9px_12px] text-[13px] border-b ${isExpanded ? 'border-transparent' : 'border-[#F0EEE8]'} align-middle text-center font-extrabold ${pen ? 'text-[#667085]' : 'text-[#0F7A52]'}`}>
                        {pen || a.award === undefined || a.award === null ? '—' : `${Number(a.award).toFixed(2)}%`}
                      </td>
                      <td className={`p-[9px_12px] text-[13px] border-b ${isExpanded ? 'border-transparent' : 'border-[#F0EEE8]'} align-middle text-center`} dangerouslySetInnerHTML={{ __html: stChip(pen ? 'Pending' : a.status) }} />
                      <td className={`p-[9px_12px] text-[13px] border-b ${isExpanded ? 'border-transparent' : 'border-[#F0EEE8]'} align-middle`} dangerouslySetInnerHTML={{ __html: discCellFull(s.id) }} />
                    </tr>
                    
                    {/* Inline Accordion Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan="7" className="p-0 border-b border-[#E4E0D8] bg-[#F9F8F5]">
                          <div className="p-[20px_24px] shadow-[inset_0_4px_6px_-6px_rgba(0,0,0,0.05)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            
                            <div className="grid grid-cols-2 gap-[16px] mb-[24px]">
                              <div className="bg-white border border-[#E4E0D8] rounded-[10px] p-[12px_16px] shadow-sm">
                                <div className="text-[10px] font-bold text-[#667085] uppercase tracking-[0.05em] mb-[4px]">Line Manager</div>
                                <div className="font-bold text-[#0D2B55] text-[13px]">{teamName(execData.staff, execData.name, s)}</div>
                              </div>
                              <div className="bg-white border border-[#E4E0D8] rounded-[10px] p-[12px_16px] shadow-sm">
                                <div className="text-[10px] font-bold text-[#667085] uppercase tracking-[0.05em] mb-[4px]">Status</div>
                                <div dangerouslySetInnerHTML={{ __html: a ? stChip(a.status) : stChip('Pending') }} />
                              </div>
                            </div>

                            {a && a.status !== 'Pending' ? (
                              <React.Fragment>
                                <h3 className="text-[13px] font-extrabold text-[#0D2B55] uppercase tracking-[0.05em] mb-[12px] pb-[8px] border-b border-[#E4E0D8]">Performance Breakdown</h3>
                                
                                <div className="bg-white border border-[#E4E0D8] rounded-[10px] p-[16px] mb-[24px] shadow-sm">
                                  <div className="flex justify-between items-center mb-[16px] pb-[16px] border-b border-[#E4E0D8]/60">
                                    <div className="text-[12.5px] font-bold text-[#0D2B55]">Individual Performance Rating Factor (IPRF)</div>
                                    <div className="text-[20px] font-extrabold text-[#0D2B55]">{a.iprf !== undefined && a.iprf !== null ? Number(a.iprf).toFixed(2) : '—'}</div>
                                  </div>
                                  
                                  {a.ratings && (
                                    <div className="grid grid-cols-3 gap-[8px] mb-[16px]">
                                      {[
                                        { l: 'Expected Results', v: a.ratings[0] },
                                        { l: 'Initiative/Behaviors', v: a.ratings[1] },
                                        { l: 'Safe Working', v: a.ratings[2] },
                                        { l: 'Job Competence', v: a.ratings[3] },
                                        { l: 'Dependability', v: a.ratings[4] },
                                        { l: 'Adaptability', v: a.ratings[5] }
                                      ].map((item, i) => (
                                        <div key={i} className="text-center bg-[#FBFAF7] border border-[#E4E0D8] rounded-[6px] p-[10px]">
                                          <div className="text-[10px] font-bold text-[#667085] uppercase mb-[4px] truncate">{item.l}</div>
                                          <div className={`text-[14px] font-extrabold ${item.v === 0 ? 'text-[#991B1B]' : 'text-[#0D2B55]'}`}>{item.v !== undefined ? Number(item.v).toFixed(1) : '—'}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  <div className="grid grid-cols-2 gap-[16px] border-t border-[#E4E0D8]/60 pt-[16px]">
                                    <div>
                                      <div className="text-[11px] font-bold text-[#667085] uppercase mb-[4px]">Pro-Rata Factor</div>
                                      <div className="font-bold text-[#0D2B55] text-[14px]">{a.pro !== undefined && a.pro !== null ? Number(a.pro).toFixed(3) : '—'}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-[11px] font-bold text-[#667085] uppercase mb-[4px]">STIP Award</div>
                                      <div className="font-extrabold text-[#0F7A52] text-[18px]">{a.award !== undefined && a.award !== null ? `${Number(a.award).toFixed(2)}%` : '—'}</div>
                                    </div>
                                  </div>
                                </div>
                              </React.Fragment>
                            ) : (
                              <div className="p-[20px] bg-white border border-dashed border-[#E4E0D8] rounded-[10px] text-center text-[13px] text-[#667085] mb-[24px]">
                                No appraisal data has been submitted for this quarter yet.
                              </div>
                            )}

                            <h3 className="text-[13px] font-extrabold text-[#0D2B55] uppercase tracking-[0.05em] mb-[12px] pb-[8px] border-b border-[#E4E0D8]">Disciplinary Records</h3>
                            <div className="text-[12.5px] text-[#065F46] font-bold flex items-center gap-[6px]">
                              <span className="w-[18px] h-[18px] rounded-full bg-[#D1FAE5] inline-flex justify-center items-center">✓</span> No disciplinary records found.
                            </div>
                            
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}