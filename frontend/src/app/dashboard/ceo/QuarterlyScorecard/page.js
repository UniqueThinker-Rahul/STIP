'use client';

import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import * as XLSX from "xlsx"; 

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
    code: '1', name: 'Financial Resilience', wt: 13.5,
    inds: [
      { c: '1.1', n: 'CY2025 Unqualified Audit / Annual Report by End Q2', max: 15 },
      { c: '1.2', n: 'Investment Fund Contributes >10% of NOP', max: 20 },
      { c: '1.3', n: 'Guam and Nauru contribute >20% of NOP', max: 20 },
      { c: '1.4', n: 'Business Plan EBITDA Targets for GUM MAR CDU IPP Achieved', max: 15 },
      { c: '1.5', n: '100% of Facilities have Risk Profile and a managed Treatment Plan', max: 50 }
    ]
  },
  {
    code: '2', name: 'Operational Effectiveness', wt: 45.1,
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
    code: '3', name: 'Human Capital', wt: 25.9,
    inds: [
      { c: '3.1', n: '100% of PD, OCA and IND Issued by Q2-2026', max: 40 },
      { c: '3.2', n: 'Competency Assurance Coverage', max: 75 },
      { c: '3.3', n: 'Knowledge Map gap per Function are decreasing', max: 50 },
      { c: '3.4', n: 'SGBP / BGF / SAFER Rolled out and confirmed', max: 25 },
      { c: '3.5', n: '0% of Employment Contracts are expired', max: 40 }
    ]
  },
  {
    code: '4', name: 'Safety and Environment', wt: 12.4,
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
    code: '5', name: 'Reputational', wt: 3.0,
    inds: [
      { c: '5.1', n: 'Stakeholder Engagement (Leadership)', max: 5 },
      { c: '5.2', n: 'Stakeholder Engagement (Public)', max: 2 },
      { c: '5.3', n: 'Stakeholder Engagement (Staff)', max: 10 },
      { c: '5.4', n: 'Stakeholder Engagement (Customer)', max: 10 }
    ]
  }
];

// --- EMBEDDED FORMULAS (Restored) ---
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

const getMonthFromQtr = (qtr) => {
  const map = { 'Q1': 3, 'Q2': 6, 'Q3': 9, 'Q4': 12 };
  return map[qtr] || 3;
};

// --- BASE64 EXCEL TEMPLATE ---
const REPORT_B64 = "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";

// --- MAIN COMPONENT ---
export default function QuarterlyScorecard() {
  const [curQ, setCurQ] = useState('Q1');
  const [qtrAct, setQtrAct] = useState({});
  const [qtrNotes, setQtrNotes] = useState({});
  const [qtrLocks, setQtrLocks] = useState({}); 
  const [dirty, setDirty] = useState(false);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Single-quarter state tracking based on curQ
  const [locked, setLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState('');
  const [lockedAt, setLockedAt] = useState('');
  const [lastSaved, setLastSaved] = useState('');
  const [lockModal, setLockModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchScorecards = async () => {
      try {
        const res = await api.get(`/quarterly-scorecards/${selectedYear}?_t=${new Date().getTime()}`);
        const data = res.data?.data || [];
        
        const newAct = {};
        const newNotes = {};
        const newLocks = {}; 
        
        data.forEach((doc) => {
          newAct[doc.quarter] = fromDB(doc.actuals);
          newNotes[doc.quarter] = fromDB(doc.notes);
          
          newLocks[doc.quarter] = {
            locked: doc.locked || false,
            lockedBy: doc.lockedBy ? 'System Admin' : '',
            lockedAt: doc.lockedAt ? new Date(doc.lockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
            lastSavedAt: doc.lastSavedAt ? new Date(doc.lastSavedAt).toLocaleDateString('en-GB', {day:'2-digit',month:'short'}) + ' ' + new Date(doc.lastSavedAt).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}) : ''
          };
        });
        
        setQtrAct(newAct);
        setQtrNotes(newNotes);
        setQtrLocks(newLocks); 
        setDirty(false);
      } catch (error) {
        console.error("Failed to load scorecards", error);
      }
    };
    fetchScorecards();
  }, [selectedYear]); 

  useEffect(() => {
    if (qtrLocks[curQ]) {
      setLocked(qtrLocks[curQ].locked);
      setLockedBy(qtrLocks[curQ].lockedBy);
      setLockedAt(qtrLocks[curQ].lockedAt);
      setLastSaved(qtrLocks[curQ].lastSavedAt);
    } else {
      setLocked(false);
      setLockedBy('');
      setLockedAt('');
      setLastSaved('');
    }
  }, [curQ, qtrLocks]);

  // Formulas will now execute correctly because they were restored above
  const c = getQtrCp(curQ, qtrAct);
  const t = getTierOf(c);
  const tc = getTierColor(t);
  const ach = c / MAXCP;

  // 🚨 UPGRADED: Input is strictly bound to the Max Score limit
  const handleActChange = (indCode, val, maxLimit) => {
    if (locked) return;
    let v = val === '' ? null : parseFloat(val);
    
    // Automatically clamp the score if it exceeds the maximum indicator points
    if (v !== null && v > maxLimit) {
      v = maxLimit;
    }

    setQtrAct(prev => ({
      ...prev,
      [curQ]: { ...(prev[curQ] || {}), [indCode]: v }
    }));
    setDirty(true);
  };

  const handleNoteChange = (indCode, val) => {
    if (locked) return;
    setQtrNotes(prev => ({
      ...prev,
      [curQ]: { ...(prev[curQ] || {}), [indCode]: val }
    }));
    setDirty(true);
  };

  const save = async () => {
    if (locked) return;
    try {
      setSaving(true);
      
      const kpaSyncData = [0, 0, 0, 0, 0];
      let rawSum = 0;
      
      QKPAS.forEach((k, idx) => {
        const kMax = kpaMax(k);
        const kAct = kpaAct(curQ, k, qtrAct);
        kpaSyncData[idx] = kMax ? (kAct / kMax) * 100 : 0;
        rawSum += kAct;
      });

      const syncedCp = rawSum / 100;

      // 1. Save detailed quarterly scorecard
      await api.post(`/quarterly-scorecards/${selectedYear}/${curQ}`, {
        actuals: toDB(qtrAct[curQ]),
        notes: toDB(qtrNotes[curQ]),
        locked: false
      });

      // 2. Save to High-Level Company Metrics so dashboards update immediately
      const targetMonth = getMonthFromQtr(curQ);
      await api.post('/company-metrics', {
        reviewYear: selectedYear,
        reviewMonth: targetMonth, 
        financialResilience: kpaSyncData[0],
        operationalEffectiveness: kpaSyncData[1],
        humanCapital: kpaSyncData[2],
        safetyEnvironment: kpaSyncData[3],
        reputationalCapital: kpaSyncData[4],
        bscRawScore: rawSum,
        cpPct: syncedCp,
        locked: false 
      });

      const now = new Date();
      const timeStr = `${now.toLocaleDateString('en-GB', {day:'2-digit',month:'short'})} ${now.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})}`;
      setLastSaved(timeStr);
      setDirty(false);
      
      setQtrLocks(prev => ({
        ...prev,
        [curQ]: { ...prev[curQ], lastSavedAt: timeStr }
      }));
      
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
    } finally {
      setSaving(false);
    }
  };

  const attemptLock = () => {
    let totalIndicators = 0;
    let filledIndicators = 0;
    
    QKPAS.forEach(k => {
      k.inds.forEach(i => {
        totalIndicators++;
        if (qtrAct[curQ] && qtrAct[curQ][i.c] !== null && qtrAct[curQ][i.c] !== undefined) {
          filledIndicators++;
        }
      });
    });

    if (filledIndicators < totalIndicators) {
      alert(`Cannot lock: Missing data. Only ${filledIndicators} out of ${totalIndicators} indicators have been filled for ${curQ}.`);
      return;
    }

    setLockModal(true);
  };

  const confirmLock = async () => {
    try {
      setSaving(true);
      
      const kpaSyncData = [0, 0, 0, 0, 0];
      let rawSum = 0;
      
      QKPAS.forEach((k, idx) => {
        const kMax = kpaMax(k);
        const kAct = kpaAct(curQ, k, qtrAct);
        kpaSyncData[idx] = kMax ? (kAct / kMax) * 100 : 0;
        rawSum += kAct;
      });

      const syncedCp = rawSum / 100;

      await api.post(`/quarterly-scorecards/${selectedYear}/${curQ}`, {
        actuals: toDB(qtrAct[curQ]),
        notes: toDB(qtrNotes[curQ]),
        locked: true
      });

      const targetMonth = getMonthFromQtr(curQ);
      await api.post('/company-metrics', {
        reviewYear: selectedYear,
        reviewMonth: targetMonth, 
        financialResilience: kpaSyncData[0],
        operationalEffectiveness: kpaSyncData[1],
        humanCapital: kpaSyncData[2],
        safetyEnvironment: kpaSyncData[3],
        reputationalCapital: kpaSyncData[4],
        bscRawScore: rawSum,
        cpPct: syncedCp,
        locked: true
      });

      const nowStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      setLocked(true);
      setLockedBy('Board Admin'); 
      setLockedAt(nowStr);
      
      setQtrLocks(prev => ({
        ...prev,
        [curQ]: { ...prev[curQ], locked: true, lockedBy: 'Board Admin', lockedAt: nowStr }
      }));

      setLockModal(false);
      setDirty(false);

      alert(`Success! ${curQ} has been locked and securely synchronized to the High-Level KPA matrix.`);

    } catch (error) {
      console.error(error);
      alert("Failed to lock and synchronize the scorecard.");
    } finally {
      setSaving(false);
    }
  };

  // 🚨 UPGRADED: Direct injection of the XLSX design from the prototype
  const downloadReport = () => {
    const q = curQ;
    const actData = qtrAct[q] || {};
    const notesData = qtrNotes[q] || {};
    
    const val = (cCode) => actData[cCode] || 0;
    
    const A = [];
    const F = {};
    const push = (row) => { A.push(row); return A.length; };

    push([`FSM PETROLEUM CORPORATION — ${selectedYear} STIP BALANCED SCORECARD`]);
    push([`Quarterly Company Performance · CP = total actual points ÷ 100 (max 8.87) · bonus tier: ≥8.87→15% · ≥7.10→10% · ≥4.26→5% · else 0%`]);
    push([]);
    push(["Code", "Supporting indicator", "Max", "Q1", "Q2", "% of Max (Q2)", "Notes (Q2)"]);
    
    const subs = [];
    QKPAS.forEach((k) => {
      push([`${k.code} - ${k.name}`]);
      const first = A.length + 1;
      
      k.inds.forEach((i) => {
        const vQ1 = (qtrAct['Q1'] && qtrAct['Q1'][i.c] != null) ? qtrAct['Q1'][i.c] : 0;
        const vQ2 = val(i.c);
        const noteStr = notesData[i.c] || "";
        const rn = push([i.c, i.n, i.max, vQ1, vQ2, i.max ? vQ2 / i.max : 0, noteStr]);
        F[`F${rn}`] = `IF(C${rn}=0,0,E${rn}/C${rn})`;
      });
      
      const last = A.length;
      const kActVal = k.inds.reduce((sum, ind) => sum + val(ind.c), 0);
      const sr = push(["", `Subtotal — ${k.name}`, kpaMax(k), 0, kActVal, 0, `Weight =C${last+1}/887`]);
      
      F[`C${sr}`] = `SUM(C${first}:C${last})`;
      F[`D${sr}`] = `SUM(D${first}:D${last})`;
      F[`E${sr}`] = `SUM(E${first}:E${last})`;
      F[`F${sr}`] = `IF(C${sr}=0,0,E${sr}/C${sr})`;
      subs.push(sr);
      push([]);
    });

    const totActVal = QKPAS.reduce((sum, kpa) => sum + kpa.inds.reduce((s, i) => s + val(i.c), 0), 0);
    const totRow = push(["COMPANY PERFORMANCE"]);
    const sumRow = push(["", "Total points", TOTAL_MAX, 0, totActVal, 0]);
    
    F[`C${sumRow}`] = subs.map((r) => `C${r}`).join("+");
    F[`D${sumRow}`] = subs.map((r) => `D${r}`).join("+");
    F[`E${sumRow}`] = subs.map((r) => `E${r}`).join("+");
    F[`F${sumRow}`] = `IF(C${sumRow}=0,0,E${sumRow}/C${sumRow})`;
    
    const cpRow = push(["", "Company Performance (points ÷ 100)", TOTAL_MAX / 100, 0, totActVal / 100, 0]);
    F[`C${cpRow}`] = `C${sumRow}/100`;
    F[`D${cpRow}`] = `D${sumRow}/100`;
    F[`E${cpRow}`] = `E${sumRow}/100`;
    F[`F${cpRow}`] = `F${sumRow}`; 
    
    push([]);
    push(["", "BONUS TIERS (CP threshold → award %)"]);
    const tVal = getTierOf(totActVal / 100);
    
    const exRow = push(["", "Exceeds target — 100%", 8.87, 0.15]);
    const maRow = push(["", "Meets the majority — 80%", 7.10, 0.10]);
    const imRow = push(["", "Improvement areas — 48%", 4.26, 0.05]);
    const faRow = push(["", "Fails the majority", "below", 0]);
    
    const tierRow = push(["", "Q2 bonus tier (from CP)", 0, "× individual factor →"]);
    F[`C${tierRow}`] = `IF(E${cpRow}>=C${exRow},D${exRow},IF(E${cpRow}>=C${maRow},D${maRow},IF(E${cpRow}>=C${imRow},D${imRow},0)))`;
    
    push([]);
    push(["", "INDIVIDUAL AWARD = tier × factor (% of annual salary)"]);
    FACTORS.forEach(([lbl, f]) => {
      const rn = push(["", lbl, f, tVal * f]);
      F[`D${rn}`] = `$C$${tierRow}*C${rn}`;
    });

    const ws = XLSX.utils.aoa_to_sheet(A);
    Object.keys(F).forEach((addr) => {
      const cell = ws[addr] || { t: "n" };
      cell.t = "n";
      cell.f = F[addr];
      ws[addr] = cell;
    });
    
    ws["!cols"] = [{ wch: 8 }, { wch: 58 }, { wch: 9 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 40 }];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedYear} STIP`);
    
    try {
      const bin = atob(REPORT_B64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${selectedYear}_STIP_${q}_Report_Designed.xlsx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
      
      // Also download the raw data version you originally requested as backup
      XLSX.writeFile(wb, `${selectedYear}_STIP_${q}_Report_Raw.xlsx`);
    } catch (e) {
      alert("Styled Download failed (falling back to Raw Data export): " + e.message);
      XLSX.writeFile(wb, `${selectedYear}_STIP_${q}_Report_Raw.xlsx`);
    }
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
              {[new Date().getFullYear() - 2, new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button disabled={locked || saving} onClick={save} className="bg-[#0D2B55] hover:bg-[#1a3d6e] disabled:opacity-50 disabled:cursor-not-allowed text-white border-[1.5px] border-[#0D2B55] px-3.5 py-2 rounded-[9px] text-[13px] font-bold transition-colors shadow-sm">
            💾 Save scores
          </button>
          <button 
            disabled={locked || saving} 
            onClick={attemptLock} 
            className={`px-3.5 py-2 rounded-[9px] text-[13px] font-bold transition-colors shadow-sm ${locked ? 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]' : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white border-none disabled:opacity-50'}`}
          >
            {locked ? '🔒 Locked' : '🔒 Lock Period'}
          </button>
          <button onClick={downloadReport} className="bg-[#C9A84C] hover:bg-[#e8c96a] text-[#0D2B55] px-3.5 py-2 rounded-[9px] text-[13px] font-bold cursor-pointer transition-colors shadow-sm">
            ⬇️ Download Excel
          </button>
        </div>
      </div>

      <div id="qscSaveStatus" className={`text-xs font-bold -mt-1 mb-3 ${dirty ? 'text-amber-500' : 'text-green-600'}`}>
        {dirty ? '● Unsaved changes — click Save scores' : lastSaved ? `✓ All changes saved · ${lastSaved}` : '✓ Saved'}
      </div>

      {locked && (
        <div className="mb-[18px] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#D1FAE5] border-[1.5px] border-[#A7F3D0] rounded-[12px] p-[16px_20px] mb-[14px] flex items-center gap-[16px] shadow-sm">
            <div className="text-[28px] shrink-0">&#128274;</div>
            <div className="flex-1">
              <div className="text-[15px] font-[800] text-[#065F46] mb-[3px]">Scorecard Locked — {curQ} {selectedYear}</div>
              <div className="text-[12px] text-[#065F46] leading-[1.6]">
                Locked by: <strong className="font-[800]">{lockedBy || '—'}</strong> &nbsp;|&nbsp; Timestamp: <strong className="font-[800]">{lockedAt || '—'}</strong><br/>
                KPA scores are now <strong className="font-[800]">read-only</strong>. This data has been securely synced to the High-Level KPA Matrix.
              </div>
            </div>
          </div>
        </div>
      )}

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
                              disabled={locked}
                              className="w-[62px] font-inherit text-[13px] font-bold text-center text-[#1E40AF] border-[1.5px] border-gray-300 rounded-md px-1 py-1.5 bg-[#FFFDF2] focus:outline-none focus:border-[#C9A84C] disabled:opacity-50 disabled:cursor-not-allowed"
                              type="number" min="0" step="0.1" 
                              value={v !== null ? v : ''} 
                              onChange={(e) => handleActChange(i.c, e.target.value, i.max)} // 🚨 INJECTED: Pass the max limit
                            />
                          </td>
                          <td className="p-2.5 text-[13px] border-b border-gray-100 text-center font-bold text-gray-800 align-middle">{(p * 100).toFixed(0)}%</td>
                          <td className="p-2.5 text-[13px] border-b border-gray-100 align-middle">
                            <div 
                              className={`text-[11.5px] text-gray-600 min-h-[20px] px-2 py-1 rounded-md border border-transparent transition-colors ${locked ? 'cursor-not-allowed opacity-70' : 'cursor-text hover:bg-white hover:border-gray-300 focus:outline-none focus:border-[#C9A84C] focus:bg-white focus:text-gray-900 empty:before:content-[\'Add_a_note...\'] empty:before:text-gray-400'}`}
                              contentEditable={!locked}
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
        <b className="text-[#0D2B55]">How the number works:</b> each supporting indicator earns points up to its <b>Max</b>; the five KPA totals give the official weights (45.1 / 25.9 / 13.5 / 12.4 / 3%). <b>Company Performance = all actual points &divide; 100</b> (max 8.87), which sets the bonus tier (&ge;8.87 &rarr; 15%, &ge;7.10 &rarr; 10%, &ge;4.26 &rarr; 5%, otherwise 0%), multiplied by each person&rsquo;s individual factor (0.7 / 1.0 / 1.2 / 1.3). <b>Download Excel</b> generates a structured board report with live formulas mapping exactly to the STIP template.
      </div>

      {lockModal && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[100] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[460px] shadow-2xl overflow-hidden slide-in-from-bottom-4">
            <div className="bg-[#DC2626] p-[16px_22px] flex justify-between items-center">
              <div className="text-[15px] font-[800] text-white flex items-center gap-[8px]">
                <span className="text-[18px]">⚠</span> Confirm Permanent Lock & Sync
              </div>
              <button onClick={() => setLockModal(false)} className="bg-white/10 text-white w-[30px] h-[30px] rounded-[8px] flex items-center justify-center hover:bg-white/20 transition-colors">&times;</button>
            </div>
            <div className="p-[30px_22px] text-center">
              <div className="text-[48px] mb-[16px] leading-none">🔒</div>
              <div className="text-[18px] font-[800] text-[#0D2B55] mb-[12px]">Lock and Sync {curQ} Scorecard?</div>
              <div className="text-[13px] text-[#6b7280] mb-[24px] leading-relaxed px-[10px]">
                This action is <strong>irreversible</strong> from the CEO panel. 
                This will lock the Quarterly Scorecard AND calculate and sync the 5 high-level KPA percentage scores to the official {getMonthFromQtr(curQ)}/2026 reporting matrix.<br/><br/>
                Final calculated CP: <strong className="text-[#0D2B55]">{c.toFixed(2)}%</strong>
              </div>
              <div className="flex gap-[12px] justify-center">
                <button 
                  onClick={() => setLockModal(false)} 
                  className="p-[12px_20px] rounded-[10px] text-[13px] font-[800] text-[#0f1923] bg-white border-[2px] border-[#E2DDD4] hover:border-[#0D2B55] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmLock} 
                  className="p-[12px_20px] rounded-[10px] text-[13px] font-[800] bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-colors shadow-md flex items-center gap-[6px]"
                >
                  Yes, Lock and Sync
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}