'use client';

import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import * as XLSX from "xlsx"; 

// --- EMBEDDED DATA ---
const QS = ['Q1', 'Q2', 'Q3', 'Q4'];
const TOTAL_MAX_DEFAULT = 887; 
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

const formatNum = (num, dec) => (num == null || isNaN(num)) ? '0' : Number(num).toFixed(dec);

const kpaMax = (qtr, kpa, qtrMaxObj) => kpa.inds.reduce((sum, ind) => {
    const customM = qtrMaxObj && qtrMaxObj[qtr] && qtrMaxObj[qtr][ind.c];
    return sum + (customM !== undefined && customM !== null ? customM : ind.max);
}, 0);

const getQtrTotalMax = (qtr, qtrMaxObj) => QKPAS.reduce((sum, kpa) => sum + kpaMax(qtr, kpa, qtrMaxObj), 0);

const kpaAct = (qtr, kpa, allAct) => kpa.inds.reduce((sum, ind) => sum + (allAct[qtr]?.[ind.c] || 0), 0);
const totAct = (qtr, allAct) => QKPAS.reduce((sum, kpa) => sum + kpaAct(qtr, kpa, allAct), 0);
const getQtrCp = (qtr, allAct) => totAct(qtr, allAct) / 100;
const hasQtrData = (qtr, allAct) => Object.keys(allAct[qtr] || {}).length > 0;

const getTierOf = (cp, maxCp) => {
  if (cp >= maxCp) return 0.15;
  if (cp >= maxCp * 0.8) return 0.10;
  if (cp >= maxCp * 0.8 * 0.6) return 0.05;
  return 0;
};
const getTierLabel = (cp, maxCp) => {
  if (cp >= maxCp) return 'Exceeds Target (15%)';
  if (cp >= maxCp * 0.8) return 'Meets Majority (10%)';
  if (cp >= maxCp * 0.8 * 0.6) return 'Improvement Areas (5%)';
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
  if (!qtr) return 3;
  const map = { 'Q1': 3, 'Q2': 6, 'Q3': 9, 'Q4': 12 };
  return map[String(qtr).toUpperCase()] || 3;
};

// --- BASE64 EXCEL TEMPLATE ---
const REPORT_B64 = "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";

export default function QuarterlyScorecard() {
  const [curQ, setCurQ] = useState(''); 
  const [qtrAct, setQtrAct] = useState({});
  const [qtrNotes, setQtrNotes] = useState({});
  const [qtrImportant, setQtrImportant] = useState({}); 
  const [qtrLocks, setQtrLocks] = useState({}); 
  const [dirty, setDirty] = useState(false);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [locked, setLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState('');
  const [lockedAt, setLockedAt] = useState('');
  const [lastSaved, setLastSaved] = useState('');
  const [downloadMenu, setDownloadMenu] = useState(false); 
  const [saving, setSaving] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Unified Alert Modal replaces native window.alert
  const [alertModal, setAlertModal] = useState({ show: false, icon: '', title: '', detail: '', type: '' });
  const [confirmLockModal, setConfirmLockModal] = useState(false);

  const [availableQuarters, setAvailableQuarters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editMaxMode, setEditMaxMode] = useState(false);
  const [qtrMax, setQtrMax] = useState({});

  const showAlert = (title, detail, type = 'error') => {
    setAlertModal({
      show: true,
      icon: type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌',
      title,
      detail,
      type
    });
  };

  useEffect(() => {
    const fetchDynamicQuarters = async () => {
      setLoading(true);
      try {
        let data = [];
        try {
          const res1 = await api.get('/quarters');
          data = res1.data?.data || res1.data || [];
        } catch (err1) {
          const res2 = await api.get(`/quarterly-scorecards/${selectedYear}`);
          data = res2.data?.data || [];
        }
        
        const yearData = data.filter(q => q.year === selectedYear || q.quarter);

        if (yearData && yearData.length > 0) {
          const mapped = yearData.map(q => {
            const label = typeof q === 'string' ? q : (q.name || q.quarter || q.period || String(q));
            const valMatch = label.match(/Q([1-4])/i);
            const val = valMatch ? parseInt(valMatch[1]) : 1;
            return { val, label: `Q${val}` };
          });

          const uniqueQuarters = [];
          const map = new Map();
          for (const item of mapped) {
              if(!map.has(item.val)){
                  map.set(item.val, true);
                  uniqueQuarters.push(item);
              }
          }
          uniqueQuarters.sort((a, b) => a.val - b.val);
          
          setAvailableQuarters(uniqueQuarters);
          
          setCurQ((prevQ) => {
             if (!uniqueQuarters.some(m => m.label === prevQ)) {
               return uniqueQuarters[uniqueQuarters.length - 1].label;
             }
             return prevQ;
          });

        } else {
          setAvailableQuarters([]);
        }
      } catch (err) {
        console.error("Failed to fetch available quarters from DB", err);
        setAvailableQuarters([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDynamicQuarters();
  }, [selectedYear]);

  useEffect(() => {
    const fetchScorecards = async () => {
      if (availableQuarters.length === 0) return;
      
      try {
        const res = await api.get(`/quarterly-scorecards/${selectedYear}?_t=${new Date().getTime()}`);
        const data = res.data?.data || [];
        
        const newAct = {};
        const newNotes = {};
        const newImportant = {}; 
        const newLocks = {}; 
        const newMax = {};
        
        data.forEach((doc) => {
          let qKey = doc.quarter || (doc.period && doc.period.quarter) || '';
          if (typeof qKey === 'number' || (typeof qKey === 'string' && !qKey.toUpperCase().startsWith('Q'))) {
             qKey = `Q${qKey}`;
          }
          qKey = String(qKey).toUpperCase();

          const formattedActuals = {};
          if (doc.actuals && typeof doc.actuals === 'object') {
              Object.entries(doc.actuals).forEach(([k, val]) => {
                  if (val !== null && val !== '') {
                      const num = parseFloat(val);
                      formattedActuals[k] = isNaN(num) ? null : Number(num.toFixed(2));
                  }
              });
          }

          newAct[qKey] = fromDB(formattedActuals);
          newNotes[qKey] = fromDB(doc.notes);
          newImportant[qKey] = fromDB(doc.important); 
          
          newMax[qKey] = doc.maxes ? fromDB(doc.maxes) : {}; 
          
          newLocks[qKey] = {
            locked: doc.locked || false,
            lockedBy: doc.lockedBy ? 'System Admin' : '',
            lockedAt: doc.lockedAt ? new Date(doc.lockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
            lastSavedAt: doc.lastSavedAt ? new Date(doc.lastSavedAt).toLocaleDateString('en-GB', {day:'2-digit',month:'short'}) + ' ' + new Date(doc.lastSavedAt).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}) : ''
          };
        });
        
        setQtrAct(newAct);
        setQtrNotes(newNotes);
        setQtrImportant(newImportant);
        setQtrMax(newMax);
        setQtrLocks(newLocks); 
        setDirty(false);
      } catch (error) {
        console.error("Failed to load scorecards", error);
      }
    };
    fetchScorecards();
  }, [selectedYear, availableQuarters.length]); 

  useEffect(() => {
    const checkMetricLock = async () => {
       if (!curQ || availableQuarters.length === 0) return;
       try {
           const targetMonth = parseInt(curQ.replace('Q', '')) * 3;
           const [metricRes, qtrRes] = await Promise.all([
               api.get(`/company-metrics/${selectedYear}/${targetMonth}`).catch(()=>({ data: { data: null } })),
               api.get(`/quarterly-scorecards/${selectedYear}`).catch(()=>({ data: { data: [] } }))
           ]);
           
           const metrics = metricRes.data?.data;
           const qtrMatch = (qtrRes.data?.data || []).find(d => {
              const dQ = d.quarter || (d.period && d.period.quarter);
              return String(dQ).toUpperCase() === curQ || `Q${dQ}` === curQ;
           });
           
           const isMLocked = metrics?.locked || false;
           const isQLocked = qtrMatch?.locked || false;

           if (isMLocked || isQLocked) {
               setLocked(true);
               const lockSource = isMLocked ? metrics : qtrMatch;
               setLockedBy(lockSource.lockedBy ? (lockSource.lockedBy.personalDetails ? `${lockSource.lockedBy.personalDetails.firstName} ${lockSource.lockedBy.personalDetails.lastName}` : 'System Admin') : 'Board Admin');
               setLockedAt(lockSource.lockedAt ? new Date(lockSource.lockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleDateString());
           } else {
               setLocked(false);
               setLockedBy('');
               setLockedAt('');
               setLastSaved(qtrLocks[curQ]?.lastSavedAt || '');
           }
       } catch(err) {
           console.log("Silent metric fetch fallback");
       }
    };
    checkMetricLock();
  }, [curQ, qtrLocks, selectedYear, availableQuarters.length]);

  const currentTotalMax = getQtrTotalMax(curQ, qtrMax) || TOTAL_MAX_DEFAULT;
  const currentMaxCp = currentTotalMax / 100;

  const c = getQtrCp(curQ, qtrAct);
  const t = getTierOf(c, currentMaxCp);
  const tc = getTierColor(t);
  const ach = currentMaxCp ? c / currentMaxCp : 0;

  const handleActChange = (indCode, val) => {
    if (locked) return;
    let v = val === '' ? null : parseFloat(val);
    if (v !== null && v < 0) v = 0; 

    setQtrAct(prev => ({
      ...prev,
      [curQ]: { ...(prev[curQ] || {}), [indCode]: v }
    }));
    setDirty(true);
  };

  const handleMaxChange = (indCode, val) => {
    if (locked) return;
    let v = val === '' ? null : parseFloat(val);
    if (v !== null && v < 0) v = 0;

    setQtrMax(prev => {
      const cur = prev[curQ] || {};
      if (v === null) {
        const newCur = { ...cur };
        delete newCur[indCode]; 
        return { ...prev, [curQ]: newCur };
      }
      return { ...prev, [curQ]: { ...cur, [indCode]: v } };
    });
    setDirty(true);
  };

  const handleBlur = (indCode) => {
    if (locked) return;
    if (qtrAct[curQ] && qtrAct[curQ][indCode] !== null && qtrAct[curQ][indCode] !== undefined) {
       setQtrAct(prev => ({
          ...prev,
          [curQ]: {
             ...(prev[curQ] || {}),
             [indCode]: Number(parseFloat(prev[curQ][indCode]).toFixed(2))
          }
       }));
    }
  };

  const handleNoteChange = (indCode, val) => {
    if (locked) return;
    setQtrNotes(prev => ({
      ...prev,
      [curQ]: { ...(prev[curQ] || {}), [indCode]: val }
    }));
    setDirty(true);
  };

  const handleImportantChange = (indCode, val) => {
    if (locked) return;
    setQtrImportant(prev => ({
      ...prev,
      [curQ]: { ...(prev[curQ] || {}), [indCode]: val }
    }));
    setDirty(true);
  };

  const save = async () => {
    if (locked) return;
    
    // Check if the selected quarter belongs to the current year
    const currentY = new Date().getFullYear();
    if (selectedYear !== currentY) {
       showAlert("Save Blocked", "You can only save scores for quarters within the current active financial year.", "error");
       return;
    }

    try {
      setSaving(true);
      
      const kpaSyncData = [0, 0, 0, 0, 0];
      let rawSum = 0;
      let filled = 0;
      
      QKPAS.forEach((k, idx) => {
        const kMax = kpaMax(curQ, k, qtrMax);
        const kAct = kpaAct(curQ, k, qtrAct);
        kpaSyncData[idx] = kMax ? (kAct / kMax) * 100 : 0;
        rawSum += kAct;

        k.inds.forEach(i => {
          if (qtrAct[curQ] && qtrAct[curQ][i.c] !== null && qtrAct[curQ][i.c] !== undefined) filled++;
        });
      });

      const syncedCp = rawSum / 100;

      await api.post(`/quarterly-scorecards/${selectedYear}/${curQ}`, {
        actuals: toDB(qtrAct[curQ]),
        notes: toDB(qtrNotes[curQ]),
        important: toDB(qtrImportant[curQ]), 
        maxes: toDB(qtrMax[curQ]), 
        locked: false
      });

      const targetMonth = parseInt(curQ.replace('Q', '')) * 3;
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
      
      const totalInds = QKPAS.reduce((s,k) => s + k.inds.length, 0);
      
      showAlert(
        'KPA Scores Saved', 
        `${filled} of ${totalInds} indicators saved for ${availableQuarters.find(q=>q.label===curQ)?.label || curQ} ${selectedYear}.`, 
        'success'
      );

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
      showAlert("Save Failed", "Failed to save scorecard to database.", "error");
    } finally {
      setSaving(false);
    }
  };

  const attemptLock = () => {
    const currentY = new Date().getFullYear();
    if (selectedYear !== currentY) {
      showAlert("Action Blocked", "You can only lock scores for quarters within the current active financial year.", "error");
      return;
    }

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
      showAlert("Missing Data", `Cannot lock: Only ${filledIndicators} out of ${totalIndicators} indicators have been filled for ${curQ}. All indicators must have a score before locking.`, "warning");
      return;
    }

    setConfirmLockModal(true);
  };

  const confirmLock = async () => {
    try {
      setSaving(true);
      
      const kpaSyncData = [0, 0, 0, 0, 0];
      let rawSum = 0;
      
      QKPAS.forEach((k, idx) => {
        const kMax = kpaMax(curQ, k, qtrMax);
        const kAct = kpaAct(curQ, k, qtrAct);
        kpaSyncData[idx] = kMax ? (kAct / kMax) * 100 : 0;
        rawSum += kAct;
      });

      const syncedCp = rawSum / 100;

      await api.post(`/quarterly-scorecards/${selectedYear}/${curQ}`, {
        actuals: toDB(qtrAct[curQ]),
        notes: toDB(qtrNotes[curQ]),
        important: toDB(qtrImportant[curQ]),
        maxes: toDB(qtrMax[curQ]),
        locked: true
      });

      const targetMonth = parseInt(curQ.replace('Q', '')) * 3;
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

      setConfirmLockModal(false);
      setDirty(false);

      showAlert('Scorecard Locked', `${curQ} ${selectedYear} has been locked and securely synchronized to the High-Level KPA matrix.`, 'success');

    } catch (error) {
      console.error(error);
      showAlert("Lock Failed", "Failed to lock and synchronize the scorecard.", "error");
    } finally {
      setSaving(false);
    }
  };

  const hexToRgb = (hex) => {
      const h = hex.replace('#', '');
      return [parseInt(h.substring(0,2), 16), parseInt(h.substring(2,4), 16), parseInt(h.substring(4,6), 16)];
  };

  const downloadPDF = async () => {
    setDownloadMenu(false);
    setPdfBusy(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const W = 297; 
      const q = curQ;
      const actData = qtrAct[q] || {};
      const notesData = qtrNotes[q] || {};
      const impData = qtrImportant[q] || {};
      const val = (cCode) => actData[cCode] || 0;
      
      const reportTotalMax = getQtrTotalMax(q, qtrMax) || TOTAL_MAX_DEFAULT;
      const reportMaxCp = reportTotalMax / 100;
      const cp = getQtrCp(q, qtrAct);
      const tier = getTierOf(cp, reportMaxCp);
      
      const KPA_COLORS = ["#2E75B6", "#548235", "#C55A11", "#38A872", "#7030A0"];
      const KPA_TINT = ["#D9E1F2", "#E2EFDA", "#FCE4D6", "#E2F0D9", "#EBE0F4"];
      
      doc.setFillColor(13, 43, 85); doc.rect(0, 0, W, 27, "F");
      doc.setFillColor(201, 168, 76); doc.rect(0, 27, W, 1.6, "F");
      doc.setTextColor(201, 168, 76); doc.setFontSize(15); doc.setFont(undefined, "bold");
      doc.text("FSM Petroleum Corporation", 14, 12);
      doc.setTextColor(255, 255, 255); doc.setFontSize(10.5); doc.setFont(undefined, "normal");
      doc.text(`${selectedYear} STIP Balanced Scorecard - ${q}`, 14, 20);
      
      const nowStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      doc.setFontSize(8); doc.setTextColor(210, 214, 222);
      doc.text(`${locked ? "Locked | " : ""}${nowStr}`, W - 14, 20, { align: "right" });

      doc.setFontSize(7.6); doc.setTextColor(102, 112, 133);
      doc.text(`CP = total actual points / 100 (max ${reportMaxCp.toFixed(2)}) | bonus tier: >= ${reportMaxCp.toFixed(2)} -> 15% | >= ${(reportMaxCp * 0.8).toFixed(2)} -> 10% | >= ${(reportMaxCp * 0.48).toFixed(2)} -> 5% | else 0%`, 14, 35);

      const body = [];
      const bandRows = [];
      const subRows = [];

      QKPAS.forEach((k, gi) => {
        bandRows.push(body.length);
        body.push([{ content: `${k.code} - ${k.name}`, colSpan: 7, styles: { fillColor: hexToRgb(KPA_COLORS[gi]), textColor: [255, 255, 255], fontStyle: "bold", halign: "left" } }]);
        
        k.inds.forEach((ind) => {
          const v = val(ind.c);
          
          const currentIndMax = (qtrMax[q] && qtrMax[q][ind.c] !== undefined) ? qtrMax[q][ind.c] : ind.max;
          const pctNum = currentIndMax && v ? (v / currentIndMax) * 100 : 0;
          const pct = pctNum.toFixed(0) + '%';
          
          let pctColor = [0,0,0];
          if(pctNum > 100) pctColor = [217, 119, 6]; 
          else if(pctNum === 100) pctColor = [5, 150, 105]; 
          else if(pctNum > 0) pctColor = [202, 138, 4]; 
          else pctColor = [220, 38, 38]; 

          body.push([
            { content: ind.c, styles: { halign: 'center', fontStyle: 'bold', textColor: [13,43,85] } },
            ind.n,
            { content: currentIndMax, styles: { halign: 'center' } },
            { content: v, styles: { halign: 'center' } },
            { content: currentIndMax ? pct : "", styles: { halign: 'center', fontStyle: 'bold', textColor: pctColor } },
            { content: notesData[ind.c] || "", styles: { fontSize: 6.4, textColor: [100,100,100] } },
            { content: impData[ind.c] || "", styles: { fontSize: 6.4, textColor: [100,100,100] } }
          ]);
        });

        const m = kpaMax(q, k, qtrMax);
        const a = kpaAct(q, k, qtrAct);
        subRows.push(body.length);
        body.push([
          "", 
          { content: `Subtotal - ${k.name}`, styles: { fontStyle: 'bold' } }, 
          { content: m, styles: { halign: 'center', fontStyle: 'bold' } }, 
          { content: a.toFixed(1), styles: { halign: 'center', fontStyle: 'bold' } },
          { content: m ? `${((a / m) * 100).toFixed(2)}%` : "", styles: { halign: 'center', fontStyle: 'bold' } }, 
          { content: `Weight ${((m / reportTotalMax) * 100).toFixed(1)}%`, colSpan: 2, styles: { fontStyle: 'italic', textColor: [150,150,150] } }
        ]);
        body.push([{ content: "", colSpan: 7, styles: { cellPadding: 0.5, border: 0 } }]);
      });

      autoTable(doc, {
        head: [["#", "Supporting indicator", "Max", "Actual", "% of Max", "Notes", "Important"]],
        body, 
        startY: 39, 
        theme: "grid",
        margin: { left: 10, right: 10, bottom: 15 },
        styles: { fontSize: 7.2, cellPadding: 1.5, lineColor: [228, 224, 216], lineWidth: 0.15, valign: "middle" },
        headStyles: { fillColor: [13, 43, 85], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.6, halign: "center" },
        columnStyles: { 
          0: { cellWidth: 10 }, 
          1: { cellWidth: 80 }, 
          2: { cellWidth: 12 },
          3: { cellWidth: 12 }, 
          4: { cellWidth: 15 }, 
          5: { cellWidth: 74 }, 
          6: { cellWidth: 74 }
        },
        didParseCell: (h) => {
          if (h.section !== "body") return;
          const i = h.row.index;
          if (subRows.indexOf(i) >= 0) {
            let kpaIndex = 0;
            for (let bi = 0; bi < subRows.length; bi++) {
                if (i === subRows[bi]) kpaIndex = bi;
            }
            h.cell.styles.fillColor = hexToRgb(KPA_TINT[kpaIndex]);
            h.cell.styles.textColor = [13, 43, 85];
          } else if (bandRows.indexOf(i) < 0 && h.column.index === 4) {
            let kpaIndex = 0;
            for (let bi = 0; bi < bandRows.length; bi++) {
                if (i > bandRows[bi]) kpaIndex = bi;
            }
          } else if (h.row.raw[0] === "" && h.row.raw[1] === "") {
             h.cell.styles.fillColor = [255, 255, 255]; 
             h.cell.styles.lineColor = [255, 255, 255]; 
          }
        },
      });

      let y = doc.lastAutoTable.finalY + 2;
      const totActVal = QKPAS.reduce((sum, kpa) => sum + kpa.inds.reduce((s, i) => s + val(i.c), 0), 0);

      const cpBody = [
        [{ content: "COMPANY PERFORMANCE", colSpan: 7, styles: { fillColor: [13, 43, 85], textColor: [255,255,255], fontStyle: "bold" } }],
        ["", "Total points", reportTotalMax, totActVal.toFixed(1), "", "", ""],
        ["", "Company Performance (points / 100)", reportMaxCp.toFixed(2), (totActVal/100).toFixed(2), "", "", ""],
        [{ content: "", colSpan: 7, styles: { cellPadding: 0.5, border: 0 } }]
      ];

      autoTable(doc, {
        body: cpBody,
        startY: y,
        theme: "grid",
        margin: { left: 10, right: 10 },
        styles: { fontSize: 7.2, cellPadding: 1.5, lineColor: [228, 224, 216], lineWidth: 0.15, halign: "center", valign: "middle" },
        columnStyles: { 
          0: { cellWidth: 10 }, 
          1: { halign: "left", cellWidth: 80, fontStyle: "bold", fillColor: [245,245,245] }, 
          2: { cellWidth: 12, fontStyle: "bold", fillColor: [245,245,245] },
          3: { cellWidth: 12, fontStyle: "bold", fillColor: [245,245,245] }, 
          4: { cellWidth: 15, fontStyle: "bold", fillColor: [245,245,245] }, 
          5: { cellWidth: 74, fillColor: [245,245,245] },
          6: { cellWidth: 74, fillColor: [245,245,245] }
        },
        didParseCell: (h) => {
            if (h.row.raw[0] === "" && h.row.raw[1] === "") {
                h.cell.styles.fillColor = [255, 255, 255]; 
                h.cell.styles.lineColor = [255, 255, 255]; 
            }
        }
      });
      y = doc.lastAutoTable.finalY;

      const tiersBody = [
        [{ content: "BONUS TIERS (CP threshold -> award %)", colSpan: 7, styles: { fillColor: [229, 231, 235], fontStyle: "bold", halign: "left" } }],
        ["", "Exceeds target - 100%", reportMaxCp.toFixed(2), "15%", "", "", ""],
        ["", "Meets the majority - 80%", (reportMaxCp * 0.8).toFixed(2), "10%", "", "", ""],
        ["", "Improvement areas - 48%", (reportMaxCp * 0.48).toFixed(2), "5%", "", "", ""],
        ["", "Fails the majority", "below", "0%", "", "", ""],
        ["", `${q} bonus tier (from CP)`, "", `${(tier * 100).toFixed(0)}%`, "x individual factor ->", "", ""],
        [{ content: "", colSpan: 7, styles: { cellPadding: 0.5, border: 0 } }],
        [{ content: "INDIVIDUAL AWARD = tier x factor (% of annual salary)", colSpan: 7, styles: { fillColor: [229, 231, 235], fontStyle: "bold", halign: "left" } }]
      ];
      FACTORS.forEach(([lbl, f]) => {
          tiersBody.push(["", lbl, f.toFixed(1), `${(tier * f * 100).toFixed(1)}%`, "", "", ""]);
      });

      autoTable(doc, {
        body: tiersBody,
        startY: y,
        theme: "grid",
        margin: { left: 10, right: 10 },
        styles: { fontSize: 7.2, cellPadding: 1.5, lineColor: [228, 224, 216], lineWidth: 0.15, halign: "center", valign: "middle" },
        columnStyles: { 
          0: { cellWidth: 10 }, 
          1: { halign: "left", cellWidth: 80 }, 
          2: { cellWidth: 12 },
          3: { cellWidth: 12, fontStyle: "bold" }, 
          4: { cellWidth: 15, halign: "left", fontStyle: "italic", textColor: [100,100,100] }, 
          5: { cellWidth: 74 }, 
          6: { cellWidth: 74 }
        },
        didParseCell: (h) => {
            if (h.row.raw[0] === "" && h.row.raw[1] === "") {
                h.cell.styles.fillColor = [255, 255, 255]; 
                h.cell.styles.lineColor = [255, 255, 255]; 
            }
            if (h.row.raw[1] && h.row.raw[1].toString().includes("Exceeds target")) {
                h.cell.styles.fillColor = hexToRgb("#D1FAE5");
                if (h.column.index === 3) h.cell.styles.textColor = hexToRgb("#065F46");
            }
            if (h.row.raw[1] && h.row.raw[1].toString().includes("Meets the majority")) {
                h.cell.styles.fillColor = hexToRgb("#DBEAFE");
                if (h.column.index === 3) h.cell.styles.textColor = hexToRgb("#1E40AF");
            }
            if (h.row.raw[1] && h.row.raw[1].toString().includes("Improvement areas")) {
                h.cell.styles.fillColor = hexToRgb("#FEF3C7");
                if (h.column.index === 3) h.cell.styles.textColor = hexToRgb("#92400E");
            }
            if (h.row.raw[1] && h.row.raw[1].toString().includes("Fails the majority")) {
                h.cell.styles.fillColor = hexToRgb("#FEE2E2");
                if (h.column.index === 3) h.cell.styles.textColor = hexToRgb("#991B1B");
            }
            if (h.row.raw[1] && h.row.raw[1].toString().includes("bonus tier")) {
                h.cell.styles.fillColor = hexToRgb("#FEF08A");
                if (h.column.index === 1 || h.column.index === 3) {
                    h.cell.styles.textColor = hexToRgb("#92400E");
                    h.cell.styles.fontStyle = "bold";
                }
            }
            if (h.row.index >= 8) { 
                if (h.column.index === 3) h.cell.styles.textColor = [13, 43, 85];
            }
        }
      });

      // DRAW CHARTS ON PAGE 2
      doc.addPage();
      doc.setFillColor(13, 43, 85); doc.rect(0, 0, W, 18, "F");
      doc.setTextColor(201, 168, 76); doc.setFontSize(11); doc.setFont(undefined, "bold");
      doc.text(`${selectedYear} STIP Balanced Scorecard - ${q} | charts`, 14, 11);

      // Chart 1
      const chart1X = 20, chart1W = 120, chart1H = 85, chart1Y = 30;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(200, 200, 200);
      doc.rect(chart1X, chart1Y, chart1W, chart1H);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(`KPA Achievement — ${curQ} ${selectedYear} (%)`, chart1X + chart1W/2, chart1Y + 7, { align: 'center' });

      const plot1X = chart1X + 12, plot1Y = chart1Y + 15, plot1W = chart1W - 17, plot1H = chart1H - 30;

      doc.setFont('helvetica', 'normal');
      doc.line(plot1X, plot1Y, plot1X, plot1Y + plot1H); 
      doc.line(plot1X, plot1Y + plot1H, plot1X + plot1W, plot1Y + plot1H); 

      doc.setFontSize(7);
      for (let i = 0; i <= 5; i++) {
          const val = i * 20;
          const yt = plot1Y + plot1H - (val / 100) * plot1H;
          doc.text(`${val}.0`, plot1X - 2, yt + 2, { align: 'right' });
          doc.setDrawColor(230, 230, 230);
          doc.line(plot1X, yt, plot1X + plot1W, yt);
      }
      
      doc.text("% of max points", plot1X - 9, plot1Y + plot1H/2, { angle: 90, align: 'center' });

      const bar1Spacing = plot1W / 5;
      const bar1W = bar1Spacing * 0.6;
      const kpaLabels = ['Financial\nResilience', 'Operational\nEffectiveness', 'Human\nCapital', 'Safety And\nEnvironment', 'Reputational'];

      QKPAS.forEach((k, idx) => {
          const m = kpaMax(q, k, qtrMax);
          const a = kpaAct(q, k, qtrAct);
          const pct = m ? (a / m) * 100 : 0;
          const visualPct = Math.min(120, pct);
          const bH = (visualPct / 100) * plot1H;
          const bX = plot1X + (idx * bar1Spacing) + (bar1Spacing - bar1W) / 2;
          const bY = plot1Y + plot1H - bH;

          doc.setFillColor(...hexToRgb(KPA_COLORS[idx]));
          doc.rect(bX, bY, bar1W, bH, 'F');
          doc.setTextColor(0,0,0);
          doc.setFontSize(6);
          doc.text(pct.toFixed(1), bX + bar1W/2, bY - 2, { align: 'center' });

          const lblLines = kpaLabels[idx].split('\n');
          doc.text(lblLines[0], bX + bar1W/2, plot1Y + plot1H + 4, { align: 'center' });
          if(lblLines[1]) doc.text(lblLines[1], bX + bar1W/2, plot1Y + plot1H + 7, { align: 'center' });
      });

      // Chart 2
      const chart2X = 157, chart2W = 120, chart2H = 85, chart2Y = 30;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(200, 200, 200);
      doc.rect(chart2X, chart2Y, chart2W, chart2H);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(`Company Performance by quarter`, chart2X + chart2W/2, chart2Y + 7, { align: 'center' });
      doc.text(`(CP = points / 100)`, chart2X + chart2W/2, chart2Y + 12, { align: 'center' });

      const plot2X = chart2X + 12, plot2Y = chart2Y + 18, plot2W = chart2W - 35, plot2H = chart2H - 30;

      doc.setFont('helvetica', 'normal');
      doc.setDrawColor(0,0,0);
      doc.line(plot2X, plot2Y, plot2X, plot2Y + plot2H); 
      doc.line(plot2X, plot2Y + plot2H, plot2X + plot2W, plot2Y + plot2H);

      const dynamicYMax = Math.max(10, Math.ceil(reportMaxCp));
      doc.setFontSize(7);
      for (let i = 0; i <= dynamicYMax; i+=2) {
          const yt = plot2Y + plot2H - (i / dynamicYMax) * plot2H;
          doc.text(`${i}.00`, plot2X - 2, yt + 2, { align: 'right' });
          doc.setDrawColor(240, 240, 240);
          doc.line(plot2X, yt, plot2X + plot2W, yt);
      }
      doc.text("CP", plot2X - 9, plot2Y + plot2H/2, { angle: 90, align: 'center' });

      const drawTarget = (val, color, lbl) => {
          const yt = plot2Y + plot2H - (val / dynamicYMax) * plot2H;
          doc.setDrawColor(...color);
          doc.setLineDashPattern([2, 2], 0);
          doc.line(plot2X, yt, plot2X + plot2W, yt);
          doc.setLineDashPattern([], 0);
          doc.setTextColor(...color);
          doc.text(`-- ${lbl}`, plot2X + plot2W + 2, yt + 2);
      };
      drawTarget(reportMaxCp, [13, 43, 85], `15% (${reportMaxCp.toFixed(2)})`);
      drawTarget(reportMaxCp * 0.8, [197, 90, 17], `10% gate`);
      drawTarget(reportMaxCp * 0.48, [84, 130, 53], `5% gate`);

      doc.setTextColor(0,0,0);
      const bar2Spacing = plot2W / 4;
      const bar2W = bar2Spacing * 0.5;

      QS.forEach((qq, idx) => {
          const has = hasQtrData(qq, qtrAct);
          const cval = getQtrCp(qq, qtrAct);
          const bH = (cval / dynamicYMax) * plot2H;
          const bX = plot2X + (idx * bar2Spacing) + (bar2Spacing - bar2W) / 2;
          const bY = plot2Y + plot2H - bH;

          if (has && cval > 0) {
              doc.setFillColor(201, 168, 76); 
              doc.rect(bX, bY, bar2W, bH, 'F');
              doc.setFontSize(6);
              doc.text(cval.toFixed(2), bX + bar2W/2, bY - 2, { align: 'center' });
          } else if (!has) {
              doc.setFillColor(216, 211, 200); 
              doc.rect(bX, plot2Y + plot2H - 0.8, bar2W, 0.8, 'F');
              doc.setFontSize(5.6); doc.setTextColor(174, 182, 194);
              doc.text("not yet\nentered", bX + bar2W/2, plot2Y + plot2H - 4, { align: "center" });
          }
          doc.setFontSize(7);
          doc.setTextColor(0,0,0);
          doc.text(qq, bX + bar2W/2, plot2Y + plot2H + 4, { align: 'center' });
      });

      for (let pg = 1; pg <= doc.getNumberOfPages(); pg++) {
        doc.setPage(pg);
        doc.setDrawColor(228, 224, 216); doc.setLineWidth(0.3); doc.line(14, 200, W - 14, 200);
        doc.setFontSize(7); doc.setTextColor(150, 158, 170); doc.setFont(undefined, "normal");
        doc.text(`FSM Petroleum Corporation | ${selectedYear} STIP Balanced Scorecard | ${q} | ${nowStr}`, 14, 205);
        doc.text(`Page ${pg} of ${doc.getNumberOfPages()}`, W - 14, 205, { align: "right" });
      }

      const pdfBlob = doc.output('blob');
      const defaultFileName = `${selectedYear}_STIP_${q}_Report.pdf`;

      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(pdfBlob);
        await writable.close();
      } else {
        const fileName = prompt("Enter file name to save as:", defaultFileName);
        if (!fileName) return; 
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName.endsWith('.pdf') ? fileName : fileName + '.pdf';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
      }
    } catch (e) {
      console.error("PDF generation error:", e);
      showAlert("PDF Export Failed", "Please install required libraries in your terminal:\nnpm install jspdf jspdf-autotable", "error");
    } finally {
      setPdfBusy(false);
    }
  };

  const downloadExcel = async () => {
    setDownloadMenu(false);
    setPdfBusy(true);

    try {
      if (!window.XlsxPopulate) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = "https://unpkg.com/xlsx-populate@1.21.0/browser/xlsx-populate.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const bin = atob(REPORT_B64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      
      const workbook = await window.XlsxPopulate.fromDataAsync(arr);
      const sheet = workbook.sheet(0);
      const KPA_COLORS = ["2E75B6", "548235", "C55A11", "38A872", "7030A0"];
      const KPA_TINT = ["D9E1F2", "E2EFDA", "FCE4D6", "E2F0D9", "EBE0F4"];

      sheet.cell("A1").value(`FSM PETROLEUM CORPORATION — ${selectedYear} STIP BALANCED SCORECARD`);
      
      // 🚨 FIXED: Write "Actual" to D4 and hide the column D to preserve layout/formulas but omit "Q1"
      sheet.cell("D4").value("");
      sheet.column("D").hidden(true);
      
      sheet.cell("E4").value(curQ);
      sheet.cell("F4").value(`% of Max (${curQ})`);
      sheet.cell("G4").value(`Notes (${curQ})`);

      sheet.column("G").width(45).style("wrapText", true);
      sheet.column("H").width(45).style("wrapText", true);

      // Hide the chart data rendering tables visually so they don't overlap the output design
      sheet.range("J3:O20").style("fontColor", "ffffff");

      const q = curQ;
      const actData = qtrAct[q] || {};
      const notesData = qtrNotes[q] || {};
      const impData = qtrImportant[q] || {};
      
      const rowMap = {
        '1.1': 6, '1.2': 7, '1.3': 8, '1.4': 9, '1.5': 10,
        '2.1': 14, '2.2': 15, '2.3': 16, '2.4': 17, '2.5': 18, '2.6': 19,
        '3.1': 23, '3.2': 24, '3.3': 25, '3.4': 26, '3.5': 27,
        '4.1': 31, '4.2': 32, '4.3': 33, '4.4': 34, '4.5': 35, '4.6': 36,
        '5.1': 40, '5.2': 41, '5.3': 42, '5.4': 43
      };

      const headers = [5, 13, 22, 30, 39];
      const subs = [11, 20, 28, 37, 44];

      headers.forEach((r, i) => {
         sheet.range(`A${r}:H${r}`).style({ fill: KPA_COLORS[i], fontColor: "ffffff", bold: true });
      });

      subs.forEach((r, i) => {
         sheet.range(`B${r}:H${r}`).style({ fill: KPA_TINT[i], bold: true, fontColor: "0D2B55" });
      });

      sheet.range("A46:H46").style({ fill: "0D2B55", fontColor: "ffffff", bold: true });
      sheet.range("B50:H50").style({ fill: "E5E7EB", bold: true });
      sheet.range("B57:H57").style({ fill: "E5E7EB", bold: true });

      QKPAS.forEach((k, gi) => {
        k.inds.forEach((ind) => {
          const r = rowMap[ind.c];
          if (r) {
            const vCur = (actData[ind.c] != null) ? actData[ind.c] : 0;
            const currentIndMax = (qtrMax[q] && qtrMax[q][ind.c] !== undefined) ? qtrMax[q][ind.c] : ind.max;
            
            sheet.cell(`C${r}`).value(currentIndMax); 
            sheet.cell(`D${r}`).value(""); // Clear out any Q1 data
            sheet.cell(`E${r}`).value(vCur);
            sheet.cell(`F${r}`).style({ fontColor: KPA_COLORS[gi], bold: true });
            sheet.cell(`G${r}`).value(notesData[ind.c] || "");
            sheet.cell(`H${r}`).value(impData[ind.c] || "");
          }
        });

        // Chart 1 Data Hook
        const rKpa = 5 + gi;
        const m = kpaMax(curQ, k, qtrMax);
        const a = kpaAct(curQ, k, qtrAct);
        const pct = m ? (a / m) * 100 : 0;
        sheet.cell(`K${rKpa}`).value(pct);
      });
      
      sheet.cell("K4").value(`Ach % ${curQ}`);
      sheet.cell("B55").value(`${curQ} bonus tier (from CP)`);

      // 🚨 FIXED: Explicitly populating Chart 2 backend data mapping J, K, L, M
      const reportTotalMax = getQtrTotalMax(curQ, qtrMax) || TOTAL_MAX_DEFAULT;
      const maxCp = reportTotalMax / 100;
        
      QS.forEach((qItem, i) => {
        const rQs = 12 + i; // FIXED: Row offset for correct chart positioning
        const has = hasQtrData(qItem, qtrAct);
        const cpVal = getQtrCp(qItem, qtrAct);
          
        sheet.cell(`J${rQs}`).value(has ? cpVal : 0);      // CP Actual Data
        sheet.cell(`K${rQs}`).value(maxCp * 0.48);         // 5% gate line
        sheet.cell(`L${rQs}`).value(maxCp * 0.8);          // 10% gate line
        sheet.cell(`M${rQs}`).value(maxCp);                // 15% / max line
      });

      const blob = await workbook.outputAsync();

      // JSZip modification to physically shift the native drawing anchors (charts) to row 64+
      if (!window.JSZip) {
          await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = "https://unpkg.com/jszip@3.10.1/dist/jszip.min.js";
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
          });
      }

      const zip = await window.JSZip.loadAsync(blob);
      let drawingXml = await zip.file("xl/drawings/drawing1.xml").async("string");
      
      let c1 = 0;
      drawingXml = drawingXml.replace(/<xdr:from>[\s\S]*?<\/xdr:from>/g, (m) => {
          c1++;
          if (c1 === 1) return `<xdr:from><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>63</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>`;
          if (c1 === 2) return `<xdr:from><xdr:col>6</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>63</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>`;
          return m;
      });

      let c2 = 0;
      drawingXml = drawingXml.replace(/<xdr:to>[\s\S]*?<\/xdr:to>/g, (m) => {
          c2++;
          if (c2 === 1) return `<xdr:to><xdr:col>5</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>83</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>`;
          if (c2 === 2) return `<xdr:to><xdr:col>10</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>83</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>`;
          return m;
      });

      zip.file("xl/drawings/drawing1.xml", drawingXml);
      const finalBlob = await zip.generateAsync({ type: "blob" });
      const defaultFileName = `${selectedYear}_STIP_${curQ}_Report.xlsx`;

      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [{ description: 'Excel Document', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(finalBlob);
        await writable.close();
      } else {
        const url = URL.createObjectURL(finalBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = defaultFileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
      }
    } catch (e) {
      console.error("Excel generation error:", e);
      showAlert("Excel Export Failed", "Please ensure you have internet access for the required library.", "error");
    } finally {
      setPdfBusy(false);
    }
  };

  let statusMsg = '';
  if (t >= 0.15) {
    statusMsg = 'At the top tier — every payable indicator is being met.';
  } else {
    let gate, name;
    if (c < currentMaxCp * 0.8 * 0.6) { gate = currentMaxCp * 0.8 * 0.6; name = '5% tier'; }
    else if (c < currentMaxCp * 0.8) { gate = currentMaxCp * 0.8; name = '10% tier'; }
    else { gate = currentMaxCp; name = '15% tier'; }
    const need = Math.max(0, (gate - c) * 100);
    statusMsg = `Currently <b class="font-bold text-[#0D2B55]">${getTierLabel(c, currentMaxCp).toLowerCase()}</b>. Needs <b class="font-bold text-[#0D2B55]">${formatNum(need, 0)} more points</b> (CP ${formatNum(gate, 2)}) to reach the <b class="font-bold text-[#0D2B55]">${name}</b>.`;
  }

  const W = 940, H = 230, padL = 44, padR = 16, padT = 14, padB = 34, plotW = W - padL - padR, plotH = H - padT - padB;
  const dynamicYMaxForChart = Math.max(10, Math.ceil(currentMaxCp));
  const getY = (v) => padT + plotH - (v / dynamicYMaxForChart) * plotH;
  const gates = [
    { v: currentMaxCp * 0.8 * 0.6, l: `5% gate (${(currentMaxCp * 0.8 * 0.6).toFixed(2)})` },
    { v: currentMaxCp * 0.8, l: `10% gate (${(currentMaxCp * 0.8).toFixed(2)})` },
    { v: currentMaxCp, l: `15% / max (${currentMaxCp.toFixed(2)})` }
  ];
  const bw = plotW / QS.length;

  return (
    <div className="font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start gap-3.5 mb-4 print:hidden">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#0D2B55] m-0 pb-1">Quarterly Company Performance</h1>
          <p className="text-[13px] text-gray-500 max-w-2xl leading-relaxed">
            The full balanced scorecard at supporting-indicator level. Updated each quarter &mdash; switch quarter to record or review, and watch the trajectory build toward year-end.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          
          <button 
            onClick={() => !locked && setEditMaxMode(!editMaxMode)} 
            disabled={locked || availableQuarters.length === 0}
            className={`px-3.5 py-2 rounded-[9px] text-[13px] font-bold transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${editMaxMode ? 'bg-purple-100 text-purple-800 border-[1.5px] border-purple-300' : 'bg-white text-gray-600 border-[1.5px] border-gray-200 hover:bg-gray-50'}`}
          >
            {editMaxMode ? '🔓 Max Editable' : '🔒 Max Locked'}
          </button>

          <div className="flex items-center gap-2 bg-white border-[1.5px] border-gray-200 rounded-[9px] px-3 py-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.05em]">Period</span>
            <select 
              value={curQ} 
              onChange={e => setCurQ(e.target.value)}
              className="font-bold text-[13px] text-[#0D2B55] border-none bg-transparent outline-none cursor-pointer"
              disabled={availableQuarters.length === 0}
            >
              {availableQuarters.length === 0 && <option value={curQ}>No Quarters Created</option>}
              {availableQuarters.map((q) => (
                <option key={q.label} value={q.label}>{q.label}</option>
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
          <button disabled={locked || saving || availableQuarters.length === 0} onClick={save} className="bg-[#0D2B55] hover:bg-[#1a3d6e] disabled:opacity-50 disabled:cursor-not-allowed text-white border-[1.5px] border-[#0D2B55] px-3.5 py-2 rounded-[9px] text-[13px] font-bold transition-colors shadow-sm">
            💾 Save scores
          </button>
          <button 
            disabled={locked || saving || availableQuarters.length === 0} 
            onClick={attemptLock} 
            className={`px-3.5 py-2 rounded-[9px] text-[13px] font-bold transition-colors shadow-sm ${locked ? 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]' : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white border-none disabled:opacity-50'}`}
          >
            {locked ? '🔒 Locked' : '🔒 Lock Period'}
          </button>
          <button disabled={pdfBusy || availableQuarters.length === 0} onClick={() => setDownloadMenu(true)} className="bg-[#C9A84C] hover:bg-[#e8c96a] text-[#0D2B55] disabled:opacity-50 disabled:cursor-not-allowed px-3.5 py-2 rounded-[9px] text-[13px] font-bold cursor-pointer transition-colors shadow-sm">
            ⬇️ Download Report
          </button>
        </div>
      </div>

      <div id="qscSaveStatus" className={`text-xs font-bold -mt-1 mb-3 print:hidden ${dirty ? 'text-amber-500' : 'text-green-600'}`}>
        {dirty ? '● Unsaved changes — click Save scores' : lastSaved ? `✓ All changes saved · ${lastSaved}` : '✓ Saved'}
      </div>

      {availableQuarters.length === 0 && !loading && (
        <div className="bg-amber-50 border-[1.5px] border-amber-200 rounded-[10px] p-[14px_16px] mb-[20px] flex items-center gap-[12px] shadow-sm print:hidden">
          <div className="text-[18px] text-amber-700">&#9888;</div>
          <div className="text-[13px] text-amber-800">There are <strong>no active quarters</strong> created for <strong>{selectedYear}</strong>. HR must create a quarter before scores can be entered.</div>
        </div>
      )}

      {locked && (
        <div className="mb-[18px] animate-in fade-in slide-in-from-top-4 duration-300 print:hidden">
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

      <div className="hidden print:block mb-4 border-b-2 border-[#0D2B55] pb-2">
        <h1 className="text-[24px] font-extrabold text-[#0D2B55] m-0 uppercase">FSM Petroleum Corporation</h1>
        <h2 className="text-[16px] font-bold text-gray-700 m-0 uppercase">{selectedYear} STIP BALANCED SCORECARD - {curQ}</h2>
      </div>

      <div className="bg-[#F0F9FF] border border-[#BBD3F0] rounded-[12px] p-3.5 lg:p-4 mb-4 print:hidden">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.1fr_0.9fr_1.2fr_1.1fr] gap-3.5 mb-4 print:hidden">
        <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.05em] mb-1.5">Company Performance</div>
          <div className="text-[28px] font-extrabold text-[#0D2B55] leading-none">
            <span>{formatNum(c, 2)}</span> <small className="text-[12px] font-semibold text-gray-400">/ {currentMaxCp.toFixed(2)} max</small>
          </div>
          <div className="mt-2 text-[12px] text-gray-600">Achievement: <b className="text-gray-900">{(ach * 100).toFixed(1)}%</b></div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.05em] mb-1.5">Bonus tier (from CP)</div>
          <div className="text-[28px] font-extrabold text-[#0D2B55] leading-none">{(t * 100).toFixed(0)}%</div>
          <div className="mt-2">
            <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${tc.bg} ${tc.fg}`}>{getTierLabel(c, currentMaxCp)}</span>
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

        <div className="bg-white border border-gray-200 rounded-[14px] p-4 shadow-sm print:hidden">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.05em] mb-1.5">Where it's tracking</div>
          <div className="text-[13px] mt-0.5 text-gray-700" dangerouslySetInnerHTML={{ __html: statusMsg }}></div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-[14px] p-4 pb-2 mb-4 shadow-sm print:hidden">
        <h3 className="m-0 mb-0.5 text-[15px] text-[#0D2B55] font-bold">CP trajectory through {selectedYear}</h3>
        <div className="text-[12px] text-gray-500 mb-2">Each bar is that quarter's Company Performance; the dashed lines are the bonus-tier gates, so you can see if it is on track to clear the next tier by year-end.</div>
        <div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ fontFamily: 'inherit' }}>
            {Array.from({ length: Math.ceil(dynamicYMaxForChart / 2) + 1 }).map((_, i) => {
              const gg = i * 2;
              if (gg > dynamicYMaxForChart) return null;
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
                      <rect x={cx - 22} y={getY(qcp)} width="44" height={(qcp / dynamicYMaxForChart) * plotH} rx="5" fill={isCur ? '#C9A84C' : '#2E5894'} />
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

      <div className="flex flex-col gap-3.5 print:hidden">
        {QKPAS.map(k => {
          const km = kpaMax(curQ, k, qtrMax);
          const ka = kpaAct(curQ, k, qtrAct);
          const w = km / currentTotalMax;
          const achP = km ? ka / km : 0;

          return (
            <div key={k.code} className="bg-white border border-gray-200 rounded-[14px] overflow-hidden shadow-sm break-inside-avoid">
              <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-[#0D2B55] to-[#1a3d6e] text-white print:bg-[#0D2B55] print:text-black">
                <div className="w-[26px] h-[26px] rounded-md bg-[#C9A84C] text-[#0D2B55] font-extrabold text-[13px] flex items-center justify-center shrink-0">
                  {k.code}
                </div>
                <div className="font-bold text-[14px] flex-1 print:text-white">{k.name}</div>
                <div className="text-[11.5px] opacity-90 text-right whitespace-nowrap print:text-white">
                  Weight <b>{(w * 100).toFixed(1)}%</b> &nbsp;&middot;&nbsp; KPA score <b>{(achP * 100).toFixed(2)}%</b><br/>
                  <span className="opacity-80">points <span>{formatNum(ka, 1)}</span> / {km}</span>
                </div>
              </div>
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2.5 text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 bg-[#FAF8F4]">#</th>
                      <th className="text-left p-2.5 text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 bg-[#FAF8F4]">Supporting indicator</th>
                      <th className="text-center p-2.5 text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 bg-[#FAF8F4]">Max</th>
                      <th className="text-center p-2.5 text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 bg-[#FAF8F4]">Actual</th>
                      <th className="text-center p-2.5 text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 bg-[#FAF8F4]">% of Max</th>
                      <th className="text-left p-2.5 text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 bg-[#FAF8F4] w-[18%]">Notes</th>
                      <th className="text-left p-2.5 text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.04em] border-b border-gray-200 bg-[#FAF8F4] w-[18%]">Important (Optional)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {k.inds.map((i) => {
                      const v = qtrAct[curQ] && qtrAct[curQ][i.c] != null ? qtrAct[curQ][i.c] : null;
                      
                      const currentIndMax = (qtrMax[curQ] && qtrMax[curQ][i.c] !== undefined) ? qtrMax[curQ][i.c] : i.max;
                      const p = currentIndMax ? ((v || 0) / currentIndMax) : 0;
                      
                      return (
                        <tr key={i.c} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 text-[13px] border-b border-gray-100 font-bold text-[#0D2B55] w-[38px] align-middle">{i.c}</td>
                          <td className="p-2.5 text-[13px] border-b border-gray-100 text-gray-700 align-middle">{i.n}</td>
                          <td className="p-2.5 text-[13px] border-b border-gray-100 text-center text-gray-600 align-middle">
                            {editMaxMode ? (
                              <input 
                                disabled={locked || availableQuarters.length === 0}
                                className="w-[50px] font-inherit text-[12px] font-bold text-center text-purple-700 border-[1.5px] border-purple-300 rounded-md px-1 py-1 bg-purple-50 focus:outline-none focus:border-purple-500 disabled:opacity-50 transition-colors"
                                type="number" min="0" step="1" 
                                value={currentIndMax} 
                                onChange={(e) => handleMaxChange(i.c, e.target.value)}
                              />
                            ) : (
                              <span className="font-medium">{currentIndMax}</span>
                            )}
                          </td>
                          <td className="p-2.5 text-[13px] border-b border-gray-100 text-center align-middle">
                            <input 
                              disabled={locked || availableQuarters.length === 0}
                              className="w-[62px] font-inherit text-[13px] font-bold text-center text-[#1E40AF] border-[1.5px] border-gray-300 rounded-md px-1 py-1.5 bg-[#FFFDF2] focus:outline-none focus:border-[#C9A84C] disabled:opacity-50 disabled:cursor-not-allowed print:border-none print:bg-transparent print:p-0"
                              type="number" min="0" step="0.1" 
                              value={v !== null ? v : ''} 
                              onChange={(e) => handleActChange(i.c, e.target.value)}
                              onBlur={() => handleBlur(i.c)}
                            />
                          </td>
                          <td className="p-2.5 text-[13px] border-b border-gray-100 text-center font-bold text-gray-800 align-middle">
                             <div className="flex items-center justify-center gap-[4px]">
                               <span className={p > 1 ? "text-amber-600 font-extrabold" : ""}>
                                 {(p * 100).toFixed(0)}%
                               </span>
                               {p > 1 && (
                                 <span className="bg-[#e8c96a] text-[#0D2B55] px-[4px] py-[2px] rounded-[3px] text-[9px] font-[900] leading-none shadow-sm">EP</span>
                               )}
                             </div>
                          </td>
                          <td className="p-2.5 text-[13px] border-b border-gray-100 align-middle">
                            <div 
                              className={`text-[11.5px] text-gray-700 min-h-[32px] max-h-[72px] overflow-y-auto custom-scrollbar px-2.5 py-1.5 rounded-md border-[1.5px] transition-colors shadow-sm ${locked || availableQuarters.length === 0 ? 'cursor-not-allowed opacity-70 bg-gray-50 border-gray-200' : 'cursor-text bg-white border-gray-300 hover:border-gray-400 focus:outline-none focus:border-[#C9A84C] focus:bg-white empty:before:content-[\'📝_Add_a_note...\'] empty:before:text-gray-400 print:p-0 print:border-none print:bg-transparent print:shadow-none print:max-h-none print:overflow-visible'}`}
                              contentEditable={!locked && availableQuarters.length !== 0}
                              suppressContentEditableWarning
                              onBlur={(e) => handleNoteChange(i.c, e.currentTarget.textContent || '')}
                            >{(qtrNotes[curQ] && qtrNotes[curQ][i.c]) || ''}</div>
                          </td>
                          <td className="p-2.5 text-[13px] border-b border-gray-100 align-middle">
                            <div 
                              className={`text-[11.5px] text-amber-900 min-h-[32px] max-h-[72px] overflow-y-auto custom-scrollbar px-2.5 py-1.5 rounded-md border-[1.5px] transition-colors shadow-sm ${locked || availableQuarters.length === 0 ? 'cursor-not-allowed opacity-70 bg-amber-50/50 border-amber-100/50 text-amber-900/70' : 'cursor-text bg-amber-50 border-amber-300 hover:bg-amber-100 focus:outline-none focus:border-amber-500 focus:bg-white empty:before:content-[\'⚠️_Important_Note...\'] empty:before:text-amber-600/70 print:p-0 print:border-none print:bg-transparent print:shadow-none print:max-h-none print:overflow-visible'}`}
                              contentEditable={!locked && availableQuarters.length !== 0}
                              suppressContentEditableWarning
                              onBlur={(e) => handleImportantChange(i.c, e.currentTarget.textContent || '')}
                            >{(qtrImportant[curQ] && qtrImportant[curQ][i.c]) || ''}</div>
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

      <div className="text-[12px] text-gray-600 bg-white border border-gray-200 rounded-xl p-4 mt-2 shadow-sm print:hidden">
        <b className="text-[#0D2B55]">How the number works:</b> each supporting indicator earns points up to its <b>Max</b>; the five KPA totals give the official weights (45.1 / 25.9 / 13.5 / 12.4 / 3%). <b>Company Performance = all actual points &divide; 100</b> (max {currentMaxCp.toFixed(2)}), which sets the bonus tier (&ge;{currentMaxCp.toFixed(2)} &rarr; 15%, &ge;{(currentMaxCp * 0.8).toFixed(2)} &rarr; 10%, &ge;{(currentMaxCp * 0.48).toFixed(2)} &rarr; 5%, otherwise 0%), multiplied by each person&rsquo;s individual factor (0.7 / 1.0 / 1.2 / 1.3).
      </div>

      {downloadMenu && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[100] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-[16px] w-full max-w-[400px] shadow-2xl overflow-hidden slide-in-from-bottom-4">
            <div className="bg-[#0D2B55] p-[16px_22px] flex justify-between items-center">
              <div className="text-[15px] font-[800] text-white flex items-center gap-[8px]">
                <span className="text-[18px]">⬇️</span> Download Report Options
              </div>
              <button onClick={() => setDownloadMenu(false)} className="bg-white/10 text-white w-[30px] h-[30px] rounded-[8px] flex items-center justify-center hover:bg-white/20 transition-colors">&times;</button>
            </div>
            <div className="p-[30px_22px] text-center">
              <div className="text-[14px] text-[#6b7280] mb-[24px] leading-relaxed px-[10px]">
                Choose the format to export the {curQ} {selectedYear} Quarterly Scorecard.
              </div>
              <div className="flex flex-col gap-[12px] justify-center">
                <button 
                  onClick={downloadPDF} 
                  disabled={pdfBusy}
                  className="w-full p-[12px_20px] rounded-[10px] text-[14px] font-[800] bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-colors shadow-md flex items-center justify-center gap-[8px] disabled:opacity-50"
                >
                  {pdfBusy ? "Generating PDF..." : "📄 Download as PDF"}
                </button>
                <button 
                  onClick={downloadExcel} 
                  disabled={pdfBusy}
                  className="w-full p-[12px_20px] rounded-[10px] text-[14px] font-[800] bg-[#059669] text-white hover:bg-[#047857] transition-colors shadow-md flex items-center justify-center gap-[8px] disabled:opacity-50"
                >
                  {pdfBusy ? "Generating Excel..." : "📊 Download as Excel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Alert Modal replaces native window.alert */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[200] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-[16px] w-full max-w-[400px] shadow-2xl p-[32px] text-center slide-in-from-bottom-4">
            <div className="text-[54px] mb-[16px] leading-none">{alertModal.icon}</div>
            <h2 className={`text-[20px] font-[800] mb-[8px] ${alertModal.type === 'error' ? 'text-[#DC2626]' : alertModal.type === 'warning' ? 'text-[#D97706]' : 'text-[#0D2B55]'}`}>
              {alertModal.title}
            </h2>
            <div className="text-[13px] text-[#6b7280] mb-[24px] leading-relaxed">
              {alertModal.detail}
            </div>
            <button 
              className={`w-full text-white font-[800] text-[14px] py-[12px] rounded-[10px] shadow-sm transition-colors ${alertModal.type === 'error' ? 'bg-[#DC2626] hover:bg-[#B91C1C]' : alertModal.type === 'warning' ? 'bg-[#D97706] hover:bg-[#B45309]' : 'bg-[#0D2B55] hover:bg-[#1a3d6e]'}`}
              onClick={() => setAlertModal({ show: false, icon: '', title: '', detail: '', type: '' })}
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Lock Confirmation Modal */}
      {confirmLockModal && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[100] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-[16px] w-full max-w-[460px] shadow-2xl overflow-hidden slide-in-from-bottom-4">
            <div className="bg-[#DC2626] p-[16px_22px] flex justify-between items-center">
              <div className="text-[15px] font-[800] text-white flex items-center gap-[8px]">
                <span className="text-[18px]">⚠</span> Confirm Permanent Lock & Sync
              </div>
              <button onClick={() => setConfirmLockModal(false)} className="bg-white/10 text-white w-[30px] h-[30px] rounded-[8px] flex items-center justify-center hover:bg-white/20 transition-colors">&times;</button>
            </div>
            <div className="p-[30px_22px] text-center">
              <div className="text-[48px] mb-[16px] leading-none">🔒</div>
              <div className="text-[18px] font-[800] text-[#0D2B55] mb-[12px]">Lock and Sync {curQ} Scorecard?</div>
              <div className="text-[13px] text-[#6b7280] mb-[24px] leading-relaxed px-[10px]">
                This action is <strong>irreversible</strong> from the CEO panel. 
                This will lock the Quarterly Scorecard AND calculate and sync the 5 high-level KPA percentage scores to the official {selectedYear} reporting matrix.<br/><br/>
                Final calculated CP: <strong className="text-[#0D2B55]">{c.toFixed(2)}%</strong>
              </div>
              <div className="flex gap-[12px] justify-center">
                <button 
                  onClick={() => setConfirmLockModal(false)} 
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