'use client';

import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';

// --- EMBEDDED DATA ---
const QS = ['Q1', 'Q2', 'Q3', 'Q4'];
const MAXCP = 8.87;
const TOTAL_MAX = 887; 
const FACTORS = [
  ['Needs Improvement', 0.7], 
  ['Fully Effective', 1.0], 
  ['Exceeds', 1.2], 
  ['Outstanding', 1.3]
];

const QKPAS = [
  {
    code: '1', name: 'FINANCIAL RESILIENCE', wt: 13.5,
    inds: [
      { c: '1.1', n: 'CY2025 Unqualified Audit / Annual Report by End Q2', max: 15 },
      { c: '1.2', n: 'Investment Fund Contributes >10% of NOP', max: 20 },
      { c: '1.3', n: 'Guam and Nauru contribute >20% of NOP', max: 20 },
      { c: '1.4', n: 'Business Plan EBITDA Targets for GUM MAR CDU IPP Achieved', max: 15 },
      { c: '1.5', n: '100% of Facilities have Risk Profile and a managed Treatment Plan', max: 50 }
    ]
  },
  {
    code: '2', name: 'OPERATIONAL EFFECTIVENESS', wt: 45.1,
    inds: [
      { c: '2.1', n: 'License-to-Operate operational inspections (OI) completed as Planned', max: 100 },
      { c: '2.2', n: 'OER in $/Unit < 5% of Prior Year', max: 50 },
      { c: '2.3', n: 'Asset Availability & Service Continuity', max: 25 },
      { c: '2.4', n: 'P3MO STOC-M Implementation INFOBAS', max: 75 },
      { c: '2.5', n: 'EI/JIG "Good Rating" for all five (5) Airports', max: 75 },
      { c: '2.6', n: '100% of Quarterly Performance Appraisals Completed', max: 75 }
    ]
  },
  {
    code: '3', name: 'HUMAN CAPITAL', wt: 25.9,
    inds: [
      { c: '3.1', n: '100% of PD, OCA and IND Issued by Q2-2026', max: 40 },
      { c: '3.2', n: 'Competency Assurance Coverage', max: 75 },
      { c: '3.3', n: 'Knowledge Map gap per Function are decreasing', max: 50 },
      { c: '3.4', n: 'SGBP / BGF / SAFER Rolled out and confirmed', max: 25 },
      { c: '3.5', n: '0% of Employment Contracts are expired', max: 40 }
    ]
  },
  {
    code: '4', name: 'SAFETY AND ENVIRONMENT', wt: 12.4,
    inds: [
      { c: '4.1', n: 'TRCF, LoC, LTI, NM, HiPO Reported and RCA Completed', max: 15 },
      { c: '4.2', n: 'Scope 1 Emissions + Primary LoC Reported and RCA Complete', max: 30 },
      { c: '4.3', n: 'Significant "RAP" Tasks are projects in STOC-M and Active', max: 10 },
      { c: '4.4', n: '100% Tanker Discharge Operations no Incident', max: 15 },
      { c: '4.5', n: 'Inspection and Audits completed and corrective actions planned', max: 20 },
      { c: '4.6', n: 'PTO Use, Sickness and Absenteeism Rate Reduction', max: 20 }
    ]
  },
  {
    code: '5', name: 'REPUTATIONAL', wt: 3.0,
    inds: [
      { c: '5.1', n: 'Stakeholder Engagement (Leadership)', max: 5 },
      { c: '5.2', n: 'Stakeholder Engagement (Public)', max: 2 },
      { c: '5.3', n: 'Stakeholder Engagement (Staff)', max: 10 },
      { c: '5.4', n: 'Stakeholder Engagement (Customer)', max: 10 }
    ]
  }
];

// --- EMBEDDED FORMULAS ---
const formatNum = (num, dec) => (num == null || isNaN(num)) ? '0' : Number(num).toFixed(dec);
const kpaMax = (kpa) => kpa.inds.reduce((sum, ind) => sum + ind.max, 0);
const kpaAct = (qtr, kpa, allAct) => kpa.inds.reduce((sum, ind) => sum + (allAct[qtr]?.[ind.c] || 0), 0);
const totAct = (qtr, allAct) => QKPAS.reduce((sum, kpa) => sum + kpaAct(qtr, kpa, allAct), 0);
const getQtrCp = (qtr, allAct) => totAct(qtr, allAct) / 100;
const hasQtrData = (qtr, allAct) => Object.keys(allAct[qtr] || {}).length > 0;
const getTierOf = (cp) => {
  if (cp >= MAXCP) return 0.15;
  if (cp >= MAXCP * 0.8) return 0.10;
  if (cp >= MAXCP * 0.8 * 0.6) return 0.05;
  return 0;
};
const getTierLabel = (cp) => {
  if (cp >= MAXCP) return 'Exceeds Target (15%)';
  if (cp >= MAXCP * 0.8) return 'Meets Majority (10%)';
  if (cp >= MAXCP * 0.8 * 0.6) return 'Improvement Areas (5%)';
  return 'Fails Majority (0%)';
};
const getTierColor = (t) => {
  if (t >= 0.15) return { bg: 'bg-[#D1FAE5]', fg: 'text-[#065F46]' };
  if (t >= 0.10) return { bg: 'bg-[#DBEAFE]', fg: 'text-[#1E40AF]' };
  if (t >= 0.05) return { bg: 'bg-[#FEF3C7]', fg: 'text-[#92400E]' };
  return { bg: 'bg-[#FEE2E2]', fg: 'text-[#991B1B]' };
};

const toDB = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  const res = {};
  Object.keys(obj).forEach(k => { res[k.replace(/\./g, '_')] = obj[k]; });
  return res;
};

const fromDB = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  const res = {};
  Object.keys(obj).forEach(k => { res[k.replace(/_/g, '.')] = obj[k]; });
  return res;
};

// --- MAIN COMPONENT ---
export default function QuarterlyScorecard() {
  const [curQ, setCurQ] = useState('Q1');
  const [qtrAct, setQtrAct] = useState({});
  const [qtrNotes, setQtrNotes] = useState({});
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState('');
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchScorecards = async () => {
      try {
        // 🚨 FIX: Cache-Busting applied here. Adding the exact timestamp forces the browser 
        // to retrieve fresh data from MongoDB instead of loading the old empty state from memory.
        const res = await api.get(`/quarterly-scorecards/${selectedYear}?_t=${new Date().getTime()}`);
        const data = res.data?.data || [];
        
        const newAct = {};
        const newNotes = {};
        
        data.forEach((doc) => {
          newAct[doc.quarter] = fromDB(doc.actuals);
          newNotes[doc.quarter] = fromDB(doc.notes);
          
          if (doc.quarter === curQ && doc.lastSavedAt) {
            const d = new Date(doc.lastSavedAt);
            setLastSaved(`${d.toLocaleDateString('en-GB', {day:'2-digit',month:'short'})} ${d.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})}`);
          }
        });
        
        setQtrAct(newAct);
        setQtrNotes(newNotes);
        setDirty(false);
      } catch (error) {
        console.error("Failed to load scorecards", error);
      }
    };
    fetchScorecards();
  }, [selectedYear, curQ]);

  const c = getQtrCp(curQ, qtrAct);
  const t = getTierOf(c);
  const tc = getTierColor(t);
  const ach = c / MAXCP;

  const handleActChange = (indCode, val) => {
    const v = val === '' ? null : parseFloat(val);
    setQtrAct(prev => ({
      ...prev,
      [curQ]: { ...(prev[curQ] || {}), [indCode]: v }
    }));
    setDirty(true);
  };

  const handleNoteChange = (indCode, val) => {
    setQtrNotes(prev => ({
      ...prev,
      [curQ]: { ...(prev[curQ] || {}), [indCode]: val }
    }));
    setDirty(true);
  };

  const save = async () => {
    try {
      await api.post(`/quarterly-scorecards/${selectedYear}/${curQ}`, {
        actuals: toDB(qtrAct[curQ]),
        notes: toDB(qtrNotes[curQ])
      });

      const now = new Date();
      setLastSaved(`${now.toLocaleDateString('en-GB', {day:'2-digit',month:'short'})} ${now.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})}`);
      setDirty(false);
      
      const statusEl = document.getElementById('qscSaveStatus');
      if (statusEl) {
        statusEl.style.transition = 'none';
        statusEl.style.opacity = '0.25';
        setTimeout(() => {
          statusEl.style.transition = 'opacity 0.45s';
          statusEl.style.opacity = '1';
        }, 30);
      }
    } catch (error) {
      alert("Failed to save scorecard to database.");
    }
  };

  const download = () => {
    const q = curQ;
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    
    csvContent += `${selectedYear} SHORT-TERM INCENTIVE PLAN  —  BALANCED SCORECARD,,,,,\r\n`;
    csvContent += `CEO Scorecard   ·   Reporting period: ${q} ${selectedYear}   ·   Company Performance (CP) updated each quarter,,,,,\r\n`;
    csvContent += `,,,,,\r\n`;
    
    csvContent += `Code,Supporting Indicator,Max,Actual @ ${q},% of Max,Notes\r\n`;
    
    let totalMaxPoints = 0;
    let totalActPoints = 0;

    QKPAS.forEach((k) => {
      csvContent += `${k.code}   ${k.name},,,,,\r\n`;
      let subMax = 0;
      let subAct = 0;

      k.inds.forEach((i) => {
        const v = (qtrAct[q] && qtrAct[q][i.c] != null) ? qtrAct[q][i.c] : 0;
        const note = (qtrNotes[q] && qtrNotes[q][i.c]) ? `"${qtrNotes[q][i.c].replace(/"/g, '""')}"` : '';
        const pct = i.max ? (v / i.max) : 0;
        
        subMax += i.max;
        subAct += v;
        
        csvContent += `${i.c},"${i.n}",${i.max},${v},${pct},${note}\r\n`;
      });
      
      const subPct = subMax ? (subAct / subMax) : 0;
      csvContent += `,Subtotal — ${k.name},${subMax},${subAct},${subPct},Weight =${k.code}\r\n`;
      csvContent += `,,,,,\r\n`;
      
      totalMaxPoints += subMax;
      totalActPoints += subAct;
    });
    
    csvContent += `,,,,,\r\n`;
    csvContent += `,COMPANY PERFORMANCE (CP),,,,\r\n`;
    csvContent += `,Total points,${totalMaxPoints},${totalActPoints},Max / Actual,\r\n`;
    
    const cpMax = totalMaxPoints / 100;
    const cpAct = totalActPoints / 100;
    const cpPctString = cpMax ? (cpAct / cpMax) : 0;
    
    csvContent += `,Company Performance  (points ÷ 100),${cpMax},${cpAct},${cpPctString},Achievement %\r\n`;
    csvContent += `,,,,,\r\n`;
    
    csvContent += `,BONUS TIERS,,,,\r\n`;
    csvContent += `,Exceeds target (100%),${cpMax},0.15,,\r\n`;
    csvContent += `,Meets majority (80%),${cpMax * 0.8},0.1,,\r\n`;
    csvContent += `,Improvement areas (48%),${cpMax * 0.8 * 0.6},0.05,,\r\n`;
    csvContent += `,Fails majority,< above,0,,\r\n`;
    csvContent += `,,,,,\r\n`;
    
    const cVal = getQtrCp(q, qtrAct);
    const tVal = getTierOf(cVal);
    
    csvContent += `,Current bonus tier (from CP),,${tVal},× individual factor →,\r\n`;
    csvContent += `,,,,,\r\n`;
    
    csvContent += `,INDIVIDUAL AWARD = tier × factor,,,,\r\n`;
    
    FACTORS.forEach(f => {
      csvContent += `,${f[0]},${f[1]},${(tVal * f[1])},of annual salary,\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedYear}_STIP_Report_${q}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  let statusMsg = '';
  if (t >= 0.15) {
    statusMsg = 'At the top tier — every payable indicator is being met.';
  } else {
    let gate, name;
    if (c < MAXCP * 0.8 * 0.6) { gate = MAXCP * 0.8 * 0.6; name = '5% tier'; }
    else if (c < MAXCP * 0.8) { gate = MAXCP * 0.8; name = '10% tier'; }
    else { gate = MAXCP; name = '15% tier'; }
    const need = Math.max(0, (gate - c) * 100);
    statusMsg = `Currently <b class="font-bold text-[#0D2B55]">${getTierLabel(c).toLowerCase()}</b>. Needs <b class="font-bold text-[#0D2B55]">${formatNum(need, 0)} more points</b> (CP ${formatNum(gate, 2)}) to reach the <b class="font-bold text-[#0D2B55]">${name}</b>.`;
  }

  const W = 940, H = 230, padL = 44, padR = 16, padT = 14, padB = 34, plotW = W - padL - padR, plotH = H - padT - padB, yMax = MAXCP;
  const getY = (v) => padT + plotH - (v / yMax) * plotH;
  const gates = [
    { v: MAXCP * 0.8 * 0.6, l: '5% gate (4.26)' },
    { v: MAXCP * 0.8, l: '10% gate (7.10)' },
    { v: MAXCP, l: '15% / max (8.87)' }
  ];
  const bw = plotW / QS.length;
  
  const currentY = new Date().getFullYear();
  const yearOptions = [currentY - 2, currentY - 1, currentY, currentY + 1];

  return (
    <div className="font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start gap-3.5 mb-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#0D2B55] m-0 pb-1">Quarterly Company Performance</h1>
          <p className="text-[13px] text-gray-500 max-w-2xl leading-relaxed">
            The full balanced scorecard at supporting-indicator level. Updated each quarter &mdash; switch quarter to record or review, and watch the trajectory build toward year-end.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-white border-[1.5px] border-gray-200 rounded-[9px] px-3 py-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.05em]">Period</span>
            <select 
              value={curQ} 
              onChange={e => setCurQ(e.target.value)}
              className="font-bold text-[13px] text-[#0D2B55] border-none bg-transparent outline-none cursor-pointer"
            >
              {QS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
            <span className="text-gray-300">|</span>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="font-bold text-[13px] text-[#0D2B55] border-none bg-transparent outline-none cursor-pointer"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button onClick={save} className="bg-[#0D2B55] hover:bg-[#1a3d6e] text-white border-[1.5px] border-[#0D2B55] px-3.5 py-2 rounded-[9px] text-[13px] font-bold cursor-pointer transition-colors shadow-sm">
            💾 Save scores
          </button>
          <button onClick={download} className="bg-[#C9A84C] hover:bg-[#e8c96a] text-[#0D2B55] px-3.5 py-2 rounded-[9px] text-[13px] font-bold cursor-pointer transition-colors shadow-sm">
            ⬇️ Download CSV
          </button>
        </div>
      </div>

      <div id="qscSaveStatus" className={`text-xs font-bold -mt-1 mb-3 ${dirty ? 'text-amber-500' : 'text-green-600'}`}>
        {dirty ? '● Unsaved changes — click Save scores' : lastSaved ? `✓ All changes saved · ${lastSaved}` : '✓ Saved'}
      </div>

      <div className="bg-[#F0F9FF] border border-[#BBD3F0] rounded-[12px] p-3.5 lg:p-4 mb-4">
        <div className="font-extrabold text-[13.5px] text-[#0D2B55] mb-1.5">🔗 How this works with the monthly KPA Scorecard</div>
        <div className="text-[12.5px] text-slate-700 leading-relaxed">
          Both track the same Company Performance against the same five KPAs, at two levels of detail:
          <ul className="list-disc pl-5 my-1.5 space-y-1">
            <li><b>Monthly KPA Scorecard</b> is the quick monthly pulse &mdash; one figure per KPA, giving an at-a-glance CP% and a month-by-month trend.</li>
            <li><b>Quarterly Scorecard</b> (this page) is the detailed, evidence-based calculation &mdash; every supporting indicator scored in points, rolling up to the same five KPAs and the official bonus tier, matching the STIP Board template. This is the authoritative quarterly position that determines the award.</li>
          </ul>
          Use the monthly view to watch momentum between quarters; update and <b>save</b> this quarterly view at each quarter-end for the official number.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.1fr_0.9fr_1.2fr_1.1fr] gap-3.5 mb-4">
        <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.05em] mb-1.5">Company Performance</div>
          <div className="text-[28px] font-extrabold text-[#0D2B55] leading-none">
            <span>{formatNum(c, 2)}</span> <small className="text-[12px] font-semibold text-gray-400">/ 8.87 max</small>
          </div>
          <div className="mt-2 text-[12px] text-gray-600">Achievement: <b className="text-gray-900">{(ach * 100).toFixed(1)}%</b></div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.05em] mb-1.5">Bonus tier (from CP)</div>
          <div className="text-[28px] font-extrabold text-[#0D2B55] leading-none">{(t * 100).toFixed(0)}%</div>
          <div className="mt-2">
            <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${tc.bg} ${tc.fg}`}>{getTierLabel(c)}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.05em] mb-1.5">Award = tier × factor</div>
          <div>
            {FACTORS.map((f, i) => (
              <div key={i} className="flex justify-between text-[12.5px] py-1 border-b border-dashed border-gray-200 last:border-none">
                <span className="text-gray-600">{f[0]} ({f[1].toFixed(1)})</span>
                <b className="text-[#0D2B55]">{(t * f[1] * 100).toFixed(1)}%</b>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.05em] mb-1.5">Where it's tracking</div>
          <div className="text-[13px] mt-0.5 text-gray-700" dangerouslySetInnerHTML={{ __html: statusMsg }}></div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-[14px] p-4 pb-2 mb-4 shadow-sm">
        <h3 className="m-0 mb-0.5 text-[15px] text-[#0D2B55] font-bold">CP trajectory through {selectedYear}</h3>
        <div className="text-[12px] text-gray-500 mb-2">Each bar is that quarter's Company Performance; the dashed lines are the bonus-tier gates, so you can see if it is on track to clear the next tier by year-end.</div>
        <div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ fontFamily: 'inherit' }}>
            {Array.from({ length: Math.ceil(yMax / 2) + 1 }).map((_, i) => {
              const gg = i * 2;
              if (gg > yMax) return null;
              return (
                <g key={`grid-${gg}`}>
                  <line x1={padL} y1={getY(gg)} x2={W - padR} y2={getY(gg)} stroke="#F0EEE8" />
                  <text x={padL - 6} y={getY(gg) + 3} textAnchor="end" fontSize="10" fill="#9aa3b0">{gg}</text>
                </g>
              );
            })}
            
            {gates.map((gt, i) => (
              <g key={`gate-${i}`}>
                <line x1={padL} y1={getY(gt.v)} x2={W - padR} y2={getY(gt.v)} stroke="#C9A84C" strokeWidth="1.4" strokeDasharray="5 4" />
                <text x={W - padR} y={getY(gt.v) - 4} textAnchor="end" fontSize="10" fontWeight="700" fill="#92400E">{gt.l}</text>
              </g>
            ))}

            {QS.map((q, i) => {
              const cx = padL + bw * i + bw / 2;
              const has = hasQtrData(q, qtrAct);
              const qcp = getQtrCp(q, qtrAct);
              const isCur = q === curQ;
              
              return (
                <g key={`bar-${q}`}>
                  {has ? (
                    <>
                      <rect x={cx - 22} y={getY(qcp)} width="44" height={(qcp / yMax) * plotH} rx="5" fill={isCur ? '#C9A84C' : '#2E5894'} />
                      <text x={cx} y={getY(qcp) - 6} textAnchor="middle" fontSize="12" fontWeight="800" fill="#0D2B55">{formatNum(qcp, 2)}</text>
                    </>
                  ) : (
                    <>
                      <rect x={cx - 22} y={getY(0.06)} width="44" height="3" rx="1.5" fill="#D8D3C8" />
                      <text x={cx} y={padT + plotH / 2} textAnchor="middle" fontSize="10" fill="#aeb6c2">not yet<tspan x={cx} dy="12">entered</tspan></text>
                    </>
                  )}
                  <text x={cx} y={H - 12} textAnchor="middle" fontSize="12" fontWeight={isCur ? '800' : '600'} fill={isCur ? '#0D2B55' : '#667085'}>{q} {selectedYear}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {QKPAS.map(k => {
          const km = kpaMax(k);
          const ka = kpaAct(curQ, k, qtrAct);
          const w = km / TOTAL_MAX;
          const achP = km ? ka / km : 0;

          return (
            <div key={k.code} className="bg-white border border-gray-200 rounded-[14px] overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-[#0D2B55] to-[#1a3d6e] text-white">
                <div className="w-[26px] h-[26px] rounded-md bg-[#C9A84C] text-[#0D2B55] font-extrabold text-[13px] flex items-center justify-center shrink-0">
                  {k.code}
                </div>
                <div className="font-bold text-[14px] flex-1">{k.name}</div>
                <div className="text-[11.5px] opacity-90 text-right whitespace-nowrap">
                  Weight <b>{(w * 100).toFixed(1)}%</b> &nbsp;&middot;&nbsp; KPA score <b>{(achP * 100).toFixed(0)}%</b><br/>
                  <span className="opacity-80">points <span>{formatNum(ka, 1)}</span> / {km}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2.5 text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 bg-[#FAF8F4]">#</th>
                      <th className="text-left p-2.5 text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 bg-[#FAF8F4]">Supporting indicator</th>
                      <th className="text-center p-2.5 text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 bg-[#FAF8F4]">Max</th>
                      <th className="text-center p-2.5 text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 bg-[#FAF8F4]">Actual</th>
                      <th className="text-center p-2.5 text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 bg-[#FAF8F4]">% of Max</th>
                      <th className="text-left p-2.5 text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 bg-[#FAF8F4]">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {k.inds.map((i) => {
                      const v = qtrAct[curQ] && qtrAct[curQ][i.c] != null ? qtrAct[curQ][i.c] : null;
                      const p = i.max ? ((v || 0) / i.max) : 0;
                      return (
                        <tr key={i.c} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 text-[13px] border-b border-gray-100 font-bold text-[#0D2B55] w-[38px] align-middle">{i.c}</td>
                          <td className="p-2.5 text-[13px] border-b border-gray-100 text-gray-700 align-middle">{i.n}</td>
                          <td className="p-2.5 text-[13px] border-b border-gray-100 text-center text-gray-600 align-middle">{i.max}</td>
                          <td className="p-2.5 text-[13px] border-b border-gray-100 text-center align-middle">
                            <input 
                              className="w-[62px] font-inherit text-[13px] font-bold text-center text-[#1E40AF] border-[1.5px] border-gray-300 rounded-md px-1 py-1.5 bg-[#FFFDF2] focus:outline-none focus:border-[#C9A84C]"
                              type="number" min="0" step="0.1" 
                              value={v !== null ? v : ''} 
                              onChange={(e) => handleActChange(i.c, e.target.value)} 
                            />
                          </td>
                          <td className="p-2.5 text-[13px] border-b border-gray-100 text-center font-bold text-gray-800 align-middle">{(p * 100).toFixed(0)}%</td>
                          <td className="p-2.5 text-[13px] border-b border-gray-100 align-middle">
                            <div 
                              className="text-[11.5px] text-gray-600 min-h-[20px] px-2 py-1 rounded-md border border-transparent cursor-text transition-colors hover:bg-white hover:border-gray-300 focus:outline-none focus:border-[#C9A84C] focus:bg-white focus:text-gray-900 empty:before:content-['Add_a_note...'] empty:before:text-gray-400"
                              contentEditable 
                              suppressContentEditableWarning
                              onBlur={(e) => handleNoteChange(i.c, e.currentTarget.textContent || '')}
                            >{(qtrNotes[curQ] && qtrNotes[curQ][i.c]) || ''}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[12px] text-gray-600 bg-white border border-gray-200 rounded-xl p-4 mt-2 shadow-sm">
        <b className="text-[#0D2B55]">How the number works:</b> each supporting indicator earns points up to its <b>Max</b>; the five KPA totals give the official weights (45.1 / 25.9 / 13.5 / 12.4 / 3%). <b>Company Performance = all actual points &divide; 100</b> (max 8.87), which sets the bonus tier (&ge;8.87 &rarr; 15%, &ge;7.10 &rarr; 10%, &ge;4.26 &rarr; 5%, otherwise 0%), multiplied by each person&rsquo;s individual factor (0.7 / 1.0 / 1.2 / 1.3). <b>Download CSV</b> exports this scorecard, populated with the selected quarter, in the STIP template format.
      </div>
    </div>
  );
}