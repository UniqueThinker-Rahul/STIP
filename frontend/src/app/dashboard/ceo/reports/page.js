'use client';

import React, { useState, useEffect } from 'react';
import { Download, Loader2, Info, Lock } from 'lucide-react';
import api from '../../../../lib/api';
import usePersistentFilter from '../../../../hooks/usePersistentFilter';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Rating definitions and description mappings
const RATING_DEFINITIONS = {
  ALL: {
    code: 'ALL',
    scoreLabel: '0.0 - 1.3+',
    title: 'All Performance Ratings',
    fullLabel: 'All Performance Ratings (LS, NI, E, EP)',
    description: 'Consolidated report including all evaluated staff across all performance levels.'
  },
  NI: {
    code: 'NI',
    scoreLabel: '0.7',
    title: 'Needs Improvement',
    fullLabel: '0.7 — NI (Needs Improvement)',
    description: 'Possesses basic understanding but hits technical gaps when working through non-standard system dependencies.'
  },
  LS: {
    code: 'LS',
    scoreLabel: '0.0',
    title: 'Less Than Satisfactory',
    fullLabel: '0.0 — LS (Less Than Satisfactory)',
    description: 'Lacks core technical competencies required for execution. Causes high frequency of errors requiring operational rebuilds.'
  },
  E: {
    code: 'E',
    scoreLabel: '1.0',
    title: 'Fully Effective',
    fullLabel: '1.0 — E (Fully Effective)',
    description: 'Demonstrates total mastery over the required domain logic, completing technical tasks cleanly without design bugs.'
  },
  EP: {
    code: 'EP',
    scoreLabel: '1.3',
    title: 'Exceeds Performance',
    fullLabel: '1.3 — EP (Exceeds Performance)',
    description: 'Serves as an organizational subject matter expert, resolving complex architecture problems and designing framework workarounds.'
  }
};

export default function CEOReports() {
  const [quarters, setQuarters] = useState([]);
  const [scorecards, setScorecards] = useState([]);
  const [selectedQuarterId, setSelectedQuarterId] = usePersistentFilter('ceo_reports_qtr_id', '');
  const [selectedPerformanceFilter, setSelectedPerformanceFilter] = useState('NI');
  const [selectedPerformanceYear, setSelectedPerformanceYear] = useState('');
  const [selectedPerformanceQuarter, setSelectedPerformanceQuarter] = useState('ALL');
  const [activeQuarterData, setActiveQuarterData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [exportingState, setExportingState] = useState({ key: null, format: null }); 
  const [modal, setModal] = useState({ show: false, icon: '', title: '', detail: '' });
  
  const [isManualYear, setIsManualYear] = useState(false);

  const availableYears = Array.from(new Set(quarters.map(q => q.year).filter(Boolean))).sort((a, b) => String(b).localeCompare(String(a)));
  const activePerformanceYear = selectedPerformanceYear || (availableYears.length > 0 ? availableYears[0] : new Date().getFullYear().toString());

  // Dynamic multi-field scorecard lock inspector
  const checkIsQuarterLocked = (qData, scorecardsList = []) => {
    if (!qData) return false;

    if (
      qData.isLocked === true ||
      qData.isLocked === 'true' ||
      qData.isScorecardLocked === true ||
      qData.isScorecardLocked === 'true' ||
      qData.isKpaLocked === true ||
      qData.isKpaLocked === 'true' ||
      qData.scorecardLocked === true ||
      qData.kpaLocked === true ||
      qData.locked === true ||
      qData.locked === 'true'
    ) {
      return true;
    }

    const statusStr = String(qData.status || qData.state || '').toUpperCase();
    if (['LOCKED', 'LOCKED_BY_CEO', 'COMPLETED', 'APPROVED', 'CLOSED', 'FINALIZED'].includes(statusStr)) {
      return true;
    }

    if (scorecardsList && scorecardsList.length > 0) {
      const matchingScorecard = scorecardsList.find(s => 
        (s.quarterId?._id || s.quarterId || s.quarter?._id || s.quarter) === qData._id
      );
      if (matchingScorecard) {
        if (
          matchingScorecard.isLocked === true ||
          matchingScorecard.isLocked === 'true' ||
          matchingScorecard.locked === true ||
          ['LOCKED', 'LOCKED_BY_CEO', 'COMPLETED', 'APPROVED', 'FINALIZED'].includes(String(matchingScorecard.status).toUpperCase())
        ) {
          return true;
        }
      }
    }

    const jsonStr = JSON.stringify(qData).toLowerCase();
    if (
      jsonStr.includes('"islocked":true') ||
      jsonStr.includes('"islocked":"true"') ||
      jsonStr.includes('"isscorecardlocked":true') ||
      jsonStr.includes('"iskpalocked":true') ||
      jsonStr.includes('"scorecardlocked":true') ||
      jsonStr.includes('"status":"locked"')
    ) {
      return true;
    }

    return false;
  };

  // Helper to categorize dynamic DB performance rating code
  const getAppraisalRatingCode = (app) => {
    const ratingStr = String(
      app.calculatedResults?.ratingCode || 
      app.calculatedResults?.rating || 
      app.overallRating || 
      app.rating || 
      ''
    ).toUpperCase();

    if (ratingStr.includes('LS') || ratingStr.includes('LESS THAN SATISFACTORY')) return 'LS';
    if (ratingStr.includes('NI') || ratingStr.includes('NEEDS IMPROVEMENT')) return 'NI';
    if (ratingStr.includes('EP') || ratingStr.includes('EXCEEDS')) return 'EP';
    if (ratingStr === 'E' || ratingStr.includes('EFFECTIVE')) return 'E';

    const score = typeof app.calculatedResults?.finalIprfScore === 'number'
      ? app.calculatedResults.finalIprfScore
      : parseFloat(app.calculatedResults?.finalIprfScore || 0);

    if (score >= 1.3) return 'EP';
    if (score >= 1.0) return 'E';
    if (score >= 0.35 || score === 0.7) return 'NI';
    return 'LS';
  };

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [qRes, scRes] = await Promise.all([
          api.get('/quarters').catch(() => ({ data: { data: [] } })),
          api.get('/scorecards').catch(() => api.get('/kpa/scorecard').catch(() => ({ data: { data: [] } })))
        ]);

        const fetchedQuarters = qRes.data?.data || [];
        const fetchedScorecards = scRes.data?.data || [];

        setQuarters(fetchedQuarters);
        setScorecards(fetchedScorecards);

        if (fetchedQuarters.length > 0) {
          setSelectedQuarterId((prev) => {
            if (!prev || !fetchedQuarters.some(q => q._id === prev)) {
              return fetchedQuarters[0]._id;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Failed to initialize CEO report filters", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (selectedQuarterId && quarters.length > 0) {
      const q = quarters.find(q => q._id === selectedQuarterId);
      setActiveQuarterData(q || null);
    }
  }, [selectedQuarterId, quarters]);

  const handleDownload = async (reportType, format) => {
    if (!selectedQuarterId && reportType !== 'performance') {
      return setModal({
        show: true,
        icon: '⚠️',
        title: 'Action Required',
        detail: 'Please select a tracking quarter first.'
      });
    }

    let currentQuarter = activeQuarterData;
    let currentScorecards = scorecards;

    try {
      const [freshQRes, freshScRes] = await Promise.all([
        api.get('/quarters').catch(() => null),
        api.get('/scorecards').catch(() => api.get('/kpa/scorecard').catch(() => null))
      ]);
      if (freshQRes?.data?.data) {
        const found = freshQRes.data.data.find(q => q._id === selectedQuarterId);
        if (found) currentQuarter = found;
      }
      if (freshScRes?.data?.data) {
        currentScorecards = freshScRes.data.data;
      }
    } catch (err) {
      console.warn("Could not re-verify lock status from server", err);
    }

    const isActuallyLocked = checkIsQuarterLocked(currentQuarter, currentScorecards);

    if ((reportType === 'board' || reportType === 'awards') && !isActuallyLocked) {
      return setModal({
        show: true,
        icon: '🔒',
        title: 'Scorecard Not Locked',
        detail: `This report is executive-restricted and only available after the KPA scorecard for ${currentQuarter?.name || 'this quarter'} is locked.`
      });
    }

    setExportingState({ key: reportType, format });

    try {
      const [appRes, usersRes, metricsRes] = await Promise.all([
        api.get('/appraisals').catch(() => ({ data: { data: [] } })),
        api.get('/users').catch(() => ({ data: { data: [] } })),
        api.get(`/company-metrics/${currentQuarter?.year || '2026'}`).catch(() => ({ data: { data: null } }))
      ]);

      const allAppraisals = appRes.data?.data || [];
      const allUsers = usersRes.data?.data || [];
      const metrics = metricsRes.data?.data || null;

      const quarterAppraisals = allAppraisals.filter(app => 
        (app.appraisalQuarter?._id || app.appraisalQuarter) === selectedQuarterId
      );
      const submittedUserIds = quarterAppraisals.map(app => app.employeeId?._id || app.employeeId);

      let columns = [];
      let rows = [];
      let title = "";

      // 1. Board Summary Report
      if (reportType === 'board') {
        title = `Board of Directors Summary — ${currentQuarter?.name || ''}`;
        columns = ['Metric', 'Value', 'Notes'];

        const cpPct = metrics?.cpPct || 13.01;
        const bscRaw = metrics?.bscRawScore || 86.7;
        const totalStaff = allUsers.filter(u => u.employmentDetails?.isActive && u.security?.role !== 'CEO').length || 1;
        const epCount = quarterAppraisals.filter(a => (a.calculatedResults?.finalIprfScore || 0) >= 1.3).length;

        const estPayout = quarterAppraisals.reduce((sum, a) => {
          const sal = a.employeeBaseSalary || 30000;
          const iprf = a.calculatedResults?.finalIprfScore || 0;
          const proRata = (a.employeeId?.employmentDetails?.prorateValue || 12) / 12;
          const finalAw = (cpPct * iprf) * proRata;
          return sum + (sal * (finalAw / 100));
        }, 0);

        rows = [
          ['Final CP%', `${cpPct.toFixed(2)}%`, 'Board-approved KPA Scorecard result'],
          ['BSC Raw Score', `${bscRaw.toFixed(2)} / 100`, 'Sum of KPA weighted contributions'],
          ['Total Staff Covered', totalStaff.toString(), `STIP-eligible employees ${currentQuarter?.year || ''}`],
          ['EP-Rated Staff', `${epCount} Staff`, 'Exceeds Performance rating count'],
          ['CEO Approved Appraisals', quarterAppraisals.length.toString(), 'Completed appraisals for quarter'],
          ['Estimated Gross Payout', `$${estPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Subject to FSM income tax']
        ];
      }

      // 2. Appraisal Completion Report
      if (reportType === 'completion') {
        title = `Appraisal Completion Report — ${currentQuarter?.name || ''}`;
        columns = ['S.No.', 'Employee ID', 'Employee Name', 'Job Title', 'Company', 'Status', 'IPRF Score'];
        
        let index = 1;
        allUsers.forEach(u => {
          if (!u.employmentDetails?.isActive || u.security?.role === 'CEO') return;
          const empName = `${u.personalDetails?.firstName || ''} ${u.personalDetails?.lastName || ''}`.trim();
          const isSubmitted = submittedUserIds.includes(u._id);
          const appRecord = quarterAppraisals.find(a => (a.employeeId?._id || a.employeeId) === u._id);
          const status = isSubmitted ? (appRecord?.workflow?.status || 'SUBMITTED') : 'PENDING / NOT STARTED';
          const iprf = appRecord?.calculatedResults?.finalIprfScore ? appRecord.calculatedResults.finalIprfScore.toFixed(2) : '—';
          
          rows.push([index++, u.employeeId || 'N/A', empName, u.employmentDetails?.jobTitle || '', u.companyCode || 'FSM', status, iprf]);
        });
      }

      // 3. Full STIP Award Report
      if (reportType === 'awards') {
        title = `Full STIP Award Report — ${currentQuarter?.name || ''}`;
        columns = ['S.No.', 'Employee ID', 'Employee Name', 'Company', 'Base Salary', 'IPRF Score', 'Pro-Rata', 'Final Award (%)', 'STIP Pay ($)'];
        
        const cpPct = metrics?.cpPct || 13.01;
        let index = 1;
        quarterAppraisals.forEach(a => {
          const empId = a.employeeId?.employeeId || 'N/A';
          const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`.trim();
          const sal = a.employeeBaseSalary || 30000;
          const iprf = a.calculatedResults?.finalIprfScore || 0;
          const proRata = (a.employeeId?.employmentDetails?.prorateValue || 12) / 12;
          const finalAward = (cpPct * iprf) * proRata;
          const pay = sal * (finalAward / 100);

          rows.push([
            index++,
            empId,
            empName,
            a.employeeId?.companyCode || 'FSM',
            `$${sal.toLocaleString()}`,
            iprf.toFixed(2),
            proRata.toFixed(3),
            `${finalAward.toFixed(2)}%`,
            `$${pay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ]);
        });
      }

      // 4. Report by Office
      if (reportType === 'office') {
        title = `Performance by Company Code — ${currentQuarter?.name || ''}`;
        columns = ['S.No.', 'Company Code', 'Total Headcount', 'Appraisals Submitted', 'Completion Rate', 'Average IPRF Score'];
        
        const officeStats = {};
        allUsers.forEach(u => {
          if (!u.employmentDetails?.isActive || u.security?.role === 'CEO') return;
          const code = u.companyCode || 'FSM';
          if (!officeStats[code]) officeStats[code] = { head: 0, sub: 0, iprfTotal: 0 };
          officeStats[code].head += 1;
          const appRecord = quarterAppraisals.find(a => (a.employeeId?._id || a.employeeId) === u._id);
          if (appRecord) {
            officeStats[code].sub += 1;
            officeStats[code].iprfTotal += (appRecord.calculatedResults?.finalIprfScore || 0);
          }
        });

        let index = 1;
        Object.keys(officeStats).forEach(code => {
          const stats = officeStats[code];
          const rate = stats.head > 0 ? ((stats.sub / stats.head) * 100).toFixed(1) : 0;
          const avgIprf = stats.sub > 0 ? (stats.iprfTotal / stats.sub).toFixed(2) : 0;
          rows.push([index++, code, stats.head.toString(), stats.sub.toString(), `${rate}%`, avgIprf]);
        });
      }

      // 5. Evaluated Criteria
      if (reportType === 'criteria') {
        title = `Evaluated Criteria (NI/LS Tracking) — ${currentQuarter?.name || ''}`;
        columns = ['S.No.', 'Department / Company', 'Manager Name', 'Total Appraisals', 'Avg Score (IPRF)', 'NI Count (<1.0)', 'NI Concentration %'];
        
        const criteriaStats = {};
        quarterAppraisals.forEach(app => {
          const company = app.employeeId?.companyCode || 'FSM';
          const mgrName = `${app.managerId?.personalDetails?.firstName || ''} ${app.managerId?.personalDetails?.lastName || ''}`.trim() || 'Unassigned';
          const key = `${company}_${mgrName}`;

          if (!criteriaStats[key]) {
            criteriaStats[key] = { company, manager: mgrName, total: 0, iprfSum: 0, niCount: 0 };
          }
          criteriaStats[key].total += 1;
          const score = app.calculatedResults?.finalIprfScore || 0;
          criteriaStats[key].iprfSum += score;
          if (score < 1.0) criteriaStats[key].niCount += 1;
        });

        let index = 1;
        Object.values(criteriaStats).forEach(stat => {
          const avgScore = stat.total > 0 ? (stat.iprfSum / stat.total).toFixed(2) : 0;
          const niConcentration = stat.total > 0 ? ((stat.niCount / stat.total) * 100).toFixed(1) : 0;
          rows.push([index++, stat.company, stat.manager, stat.total.toString(), avgScore, stat.niCount.toString(), `${niConcentration}%`]);
        });
      }

      // 6. Audit Trail Report
      if (reportType === 'audit') {
        title = `System Audit Trail Report — ${currentQuarter?.name || ''}`;
        columns = ['S.No.', 'Appraisal Ref', 'Employee Name', 'Action Date', 'Workflow Status', 'Last Action By'];
        
        let index = 1;
        quarterAppraisals.forEach(a => {
          const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`.trim();
          const dateStr = new Date(a.updatedAt || a.createdAt).toLocaleString('en-GB');
          rows.push([
            index++,
            a.appraisalRef || a._id,
            empName,
            dateStr,
            a.workflow?.status || 'UNKNOWN',
            a.workflow?.lastUpdatedBy || 'System'
          ]);
        });
      }

      // 7. Staff Performance Rating Report (ALL / Specific Quarter Matrix Analysis)
      if (reportType === 'performance') {
        const yearQuarters = quarters.filter(q => String(q.year) === String(activePerformanceYear)).map(q => q._id);

        const yearlyAppraisals = allAppraisals.filter(app => {
          const qId = app.appraisalQuarter?._id || app.appraisalQuarter;
          return yearQuarters.includes(qId);
        });

        const ratingDef = RATING_DEFINITIONS[selectedPerformanceFilter] || RATING_DEFINITIONS['NI'];

        if (selectedPerformanceQuarter === 'ALL') {
          // Matrix Report Format: S.No., Employee ID, Employee Name, Company / Dept, Job Title, Manager Name, Q1, Q2, Q3, Q4
          columns = ['S.No.', 'Employee ID', 'Employee Name', 'Company / Dept', 'Job Title', 'Manager Name', 'Q1', 'Q2', 'Q3', 'Q4'];
          title = selectedPerformanceFilter === 'ALL'
            ? `All Staff Performance Ratings Report Matrix — ${activePerformanceYear}`
            : `Staff Performance Report Matrix (${ratingDef.fullLabel}) — ${activePerformanceYear}`;

          const qIdToName = {};
          quarters.forEach(q => {
            if (q._id) qIdToName[q._id] = q.name;
          });

          const employeeMap = {};
          yearlyAppraisals.forEach(app => {
            const empObj = app.employeeId;
            const empIdKey = empObj?._id || empObj;
            if (!empIdKey) return;

            if (!employeeMap[empIdKey]) {
              employeeMap[empIdKey] = {
                employeeIdStr: empObj?.employeeId || 'N/A',
                employeeName: `${empObj?.personalDetails?.firstName || ''} ${empObj?.personalDetails?.lastName || ''}`.trim() || 'N/A',
                companyDept: `${empObj?.companyCode || 'FSM'} - ${empObj?.employmentDetails?.department || 'N/A'}`,
                jobTitle: empObj?.employmentDetails?.jobTitle || 'N/A',
                managerName: `${app.managerId?.personalDetails?.firstName || ''} ${app.managerId?.personalDetails?.lastName || ''}`.trim() || 'Unassigned',
                quartersData: {}
              };
            }

            const qId = app.appraisalQuarter?._id || app.appraisalQuarter;
            const qName = qIdToName[qId] || 'Q1';
            employeeMap[empIdKey].quartersData[qName] = app;
          });

          let index = 1;
          Object.values(employeeMap).forEach(emp => {
            let matchesFilter = false;
            const qColumns = ['Q1', 'Q2', 'Q3', 'Q4'];
            const rowQuarters = {};

            qColumns.forEach(qName => {
              const app = emp.quartersData[qName];
              if (app) {
                const ratingCode = getAppraisalRatingCode(app);
                const scoreVal = app.calculatedResults?.finalIprfScore !== undefined ? app.calculatedResults.finalIprfScore.toFixed(2) : '—';
                const label = `${scoreVal} — ${RATING_DEFINITIONS[ratingCode]?.title || ratingCode}`;

                if (selectedPerformanceFilter === 'ALL') {
                  matchesFilter = true;
                  rowQuarters[qName] = label;
                } else {
                  if (ratingCode === selectedPerformanceFilter) {
                    matchesFilter = true;
                    rowQuarters[qName] = label;
                  } else {
                    rowQuarters[qName] = '--';
                  }
                }
              } else {
                rowQuarters[qName] = '--';
              }
            });

            if (matchesFilter) {
              rows.push([
                index++,
                emp.employeeIdStr,
                emp.employeeName,
                emp.companyDept,
                emp.jobTitle,
                emp.managerName,
                rowQuarters['Q1'] || '--',
                rowQuarters['Q2'] || '--',
                rowQuarters['Q3'] || '--',
                rowQuarters['Q4'] || '--'
              ]);
            }
          });

        } else {
          // Specific Quarter Report Format
          const specificQuarters = quarters.filter(q => String(q.year) === String(activePerformanceYear) && q.name === selectedPerformanceQuarter).map(q => q._id);

          const specificAppraisals = yearlyAppraisals.filter(app => {
            const qId = app.appraisalQuarter?._id || app.appraisalQuarter;
            return specificQuarters.includes(qId);
          });

          title = selectedPerformanceFilter === 'ALL'
            ? `Staff Performance Ratings Report (${selectedPerformanceQuarter}) — ${activePerformanceYear}`
            : `Staff Performance Report (${ratingDef.fullLabel} - ${selectedPerformanceQuarter}) — ${activePerformanceYear}`;

          columns = ['S.No.', 'Quarter', 'Employee ID', 'Employee Name', 'Company / Dept', 'Job Title', 'Manager Name', 'IPRF Score', 'Performance Rating', 'Status'];

          let index = 1;
          specificAppraisals.forEach(a => {
            const ratingCode = getAppraisalRatingCode(a);
            if (selectedPerformanceFilter && selectedPerformanceFilter !== 'ALL' && ratingCode !== selectedPerformanceFilter) {
              return;
            }

            const qId = a.appraisalQuarter?._id || a.appraisalQuarter;
            const qObj = quarters.find(q => q._id === qId);
            const qName = qObj ? qObj.name : selectedPerformanceQuarter;

            const empId = a.employeeId?.employeeId || 'N/A';
            const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`.trim() || 'N/A';
            const companyDept = `${a.employeeId?.companyCode || 'FSM'} - ${a.employeeId?.employmentDetails?.department || 'N/A'}`;
            const jobTitle = a.employeeId?.employmentDetails?.jobTitle || 'N/A';
            const mgrName = `${a.managerId?.personalDetails?.firstName || ''} ${a.managerId?.personalDetails?.lastName || ''}`.trim() || 'Unassigned';
            const iprfScore = a.calculatedResults?.finalIprfScore ? a.calculatedResults.finalIprfScore.toFixed(2) : '—';
            const ratingLabel = RATING_DEFINITIONS[ratingCode]?.fullLabel || ratingCode;
            const status = a.workflow?.status || 'SUBMITTED';

            rows.push([
              index++,
              qName,
              empId,
              empName,
              companyDept,
              jobTitle,
              mgrName,
              iprfScore,
              ratingLabel,
              status
            ]);
          });
        }
      }

      if (rows.length === 0) {
        return setModal({
          show: true,
          icon: '📉',
          title: 'No Data Available',
          detail: reportType === 'performance' 
            ? `No employee appraisal records found with rating level (${RATING_DEFINITIONS[selectedPerformanceFilter]?.fullLabel || 'selected rating'}) for the year ${activePerformanceYear} (${selectedPerformanceQuarter}).`
            : 'No records were found for the selected quarter.'
        });
      }

      // CSV EXPORT GENERATOR
      if (format === 'CSV') {
        let csvContent = columns.join(',') + '\n';
        rows.forEach(row => {
          const cleanRow = row.map(cell => (typeof cell === 'string' && cell.includes(',')) ? `"${cell}"` : cell);
          csvContent += cleanRow.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${title.replace(/[\s—]+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // PDF EXPORT GENERATOR
      if (format === 'PDF') {
        const doc = new jsPDF('landscape');
        doc.setFontSize(16);
        doc.setTextColor(13, 43, 85); 
        doc.text(title, 14, 15);
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleString()} | Executive CEO Copy`, 14, 22);

        autoTable(doc, {
          startY: 28,
          head: [columns],
          body: rows,
          theme: 'striped',
          headStyles: { fillColor: [13, 43, 85], textColor: 255, fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8, textColor: 50 },
          alternateRowStyles: { fillColor: [245, 248, 250] },
        });

        doc.save(`${title.replace(/[\s—]+/g, '_')}.pdf`);
      }

    } catch (err) {
      console.error("Failed to generate CEO report", err);
      setModal({
        show: true,
        icon: '❌',
        title: 'Export Failed',
        detail: 'An error occurred while compiling report data.'
      });
    } finally {
      setExportingState({ key: null, format: null });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-500 font-semibold animate-pulse">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#0D2B55]"/> Loading CEO Reporting Suite...
      </div>
    );
  }

  const isLocked = checkIsQuarterLocked(activeQuarterData, scorecards);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-20 font-sans animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">📊 Executive Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Download and inspect real-time STIP performance metrics across quarters.</p>
      </div>

      {/* Global Quarterly Filter Bar */}
      <div className="bg-[#EBF5FF] border border-[#BFDBFE] p-4 rounded-xl mb-6 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
        <Info className="w-5 h-5 text-blue-600 shrink-0"/>
        <div className="flex-grow">
          <span className="text-[13px] text-blue-900 font-medium block">
            Select a reporting quarter to calculate metrics. Note: Board Summary and Award reports require the quarter scorecard to be locked first.
          </span>
        </div>
        <select 
          value={selectedQuarterId}
          onChange={(e) => setSelectedQuarterId(e.target.value)}
          className="w-full sm:w-auto p-2.5 px-4 border border-blue-200 rounded-[8px] text-[13px] font-bold outline-none bg-white text-blue-900 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
        >
          {quarters.length === 0 ? <option value="">No Quarters Found</option> : quarters.map(q => (
            <option key={q._id} value={q._id}>{q.name} ({q.year})</option>
          ))}
        </select>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Board Summary */}
        <div className="bg-white border border-slate-200 rounded-[16px] flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="p-6 flex-grow">
            <div className="text-4xl mb-4">📄</div>
            <div className="text-[16px] font-bold text-slate-900 mb-2">Board Summary Report</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-6">
              Final CP%, BSC raw breakdown, KPA contributions, max award values, total staff, and EP count for Board presentation.
            </div>
            <div className="mt-auto">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wide ${isLocked ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {!isLocked && <Lock className="w-3 h-3"/>}
                {isLocked ? '✓ Unlocked' : 'After scorecard lock'}
              </span>
            </div>
          </div>
          <div className="flex bg-slate-50/50 border-t border-slate-100 p-4 gap-3">
            <button onClick={() => handleDownload('board', 'PDF')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
              {exportingState.key === 'board' && exportingState.format === 'PDF' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : 'PDF'} Download
            </button>
            <button onClick={() => handleDownload('board', 'CSV')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
              {exportingState.key === 'board' && exportingState.format === 'CSV' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500"/> : 'CSV'} Download
            </button>
          </div>
        </div>

        {/* Card 2: Appraisal Completion */}
        <div className="bg-white border border-slate-200 rounded-[16px] flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="p-6 flex-grow">
            <div className="text-4xl mb-4">✅</div>
            <div className="text-[16px] font-bold text-slate-900 mb-2">Appraisal Completion Report</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-6">
              Per-employee status for the selected quarter — submitted, approved, pending, not started.
            </div>
            <div className="mt-auto">
              <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wide bg-green-50 text-green-700">✓ Available any time</span>
            </div>
          </div>
          <div className="flex bg-slate-50/50 border-t border-slate-100 p-4 gap-3">
            <button onClick={() => handleDownload('completion', 'PDF')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
              {exportingState.key === 'completion' && exportingState.format === 'PDF' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : 'PDF'} Download
            </button>
            <button onClick={() => handleDownload('completion', 'CSV')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
              {exportingState.key === 'completion' && exportingState.format === 'CSV' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500"/> : 'CSV'} Download
            </button>
          </div>
        </div>

        {/* Card 3: Full STIP Award */}
        <div className="bg-white border border-slate-200 rounded-[16px] flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="p-6 flex-grow">
            <div className="text-4xl mb-4">💰</div>
            <div className="text-[16px] font-bold text-slate-900 mb-2">Full STIP Award Report</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-6">
              All approved staff — IPRF score, pro-rata, base award%, final award%, STIP pay ($) — payroll-ready.
            </div>
            <div className="mt-auto">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wide ${isLocked ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {!isLocked && <Lock className="w-3 h-3"/>}
                {isLocked ? '✓ Unlocked' : 'After scorecard lock'}
              </span>
            </div>
          </div>
          <div className="flex bg-slate-50/50 border-t border-slate-100 p-4 gap-3">
            <button onClick={() => handleDownload('awards', 'PDF')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
              {exportingState.key === 'awards' && exportingState.format === 'PDF' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : 'PDF'} Download
            </button>
            <button onClick={() => handleDownload('awards', 'CSV')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
              {exportingState.key === 'awards' && exportingState.format === 'CSV' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500"/> : 'CSV'} Download
            </button>
          </div>
        </div>

        {/* Card 4: Report by Office Code */}
        <div className="bg-white border border-slate-200 rounded-[16px] flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="p-6 flex-grow">
            <div className="text-4xl mb-4">🏢</div>
            <div className="text-[16px] font-bold text-slate-900 mb-2">Report by Company Code</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-6">
              Statistics grouped by FSM, CDU, NAR, GUM — headcount, completion rate, average IPRF.
            </div>
            <div className="mt-auto">
              <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wide bg-green-50 text-green-700">✓ Available any time</span>
            </div>
          </div>
          <div className="flex bg-slate-50/50 border-t border-slate-100 p-4 gap-3">
            <button onClick={() => handleDownload('office', 'PDF')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
              {exportingState.key === 'office' && exportingState.format === 'PDF' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : 'PDF'} Download
            </button>
            <button onClick={() => handleDownload('office', 'CSV')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
              {exportingState.key === 'office' && exportingState.format === 'CSV' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500"/> : 'CSV'} Download
            </button>
          </div>
        </div>

        {/* Card 5: Evaluated Criteria */}
        <div className="bg-white border border-slate-200 rounded-[16px] flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="p-6 flex-grow">
            <div className="text-4xl mb-4">⭐</div>
            <div className="text-[16px] font-bold text-slate-900 mb-2">Report on Evaluated Criteria</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-6">
              Average scores per criterion — identifies NI/LS concentrations by department and manager.
            </div>
            <div className="mt-auto">
              <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wide bg-green-50 text-green-700">✓ Available any time</span>
            </div>
          </div>
          <div className="flex bg-slate-50/50 border-t border-slate-100 p-4 gap-3">
            <button onClick={() => handleDownload('criteria', 'PDF')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
              {exportingState.key === 'criteria' && exportingState.format === 'PDF' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : 'PDF'} Download
            </button>
            <button onClick={() => handleDownload('criteria', 'CSV')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
              {exportingState.key === 'criteria' && exportingState.format === 'CSV' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500"/> : 'CSV'} Download
            </button>
          </div>
        </div>

        {/* Card 6: Audit Trail */}
        <div className="bg-white border border-slate-200 rounded-[16px] flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="p-6 flex-grow">
            <div className="text-4xl mb-4">📋</div>
            <div className="text-[16px] font-bold text-slate-900 mb-2">System Audit Trail Report</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-6">
              Full system log — every submit, approve, reject, and lock action with timestamps and user IDs.
            </div>
            <div className="mt-auto">
              <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wide bg-purple-50 text-purple-700">CEO & Admin Only</span>
            </div>
          </div>
          <div className="flex bg-slate-50/50 border-t border-slate-100 p-4 gap-3">
            <button onClick={() => handleDownload('audit', 'PDF')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
              {exportingState.key === 'audit' && exportingState.format === 'PDF' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : 'PDF'} Download
            </button>
            <button onClick={() => handleDownload('audit', 'CSV')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
              {exportingState.key === 'audit' && exportingState.format === 'CSV' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500"/> : 'CSV'} Download
            </button>
          </div>
        </div>

        {/* Card 7: Staff Performance Rating Report (ALL / Quarter Matrix / Filter) */}
        <div className="bg-white border border-slate-200 rounded-[16px] flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="p-6 flex-grow">
            <div className="text-4xl mb-4">🎯</div>
            <div className="text-[16px] font-bold text-slate-900 mb-2">Staff Performance Rating Report</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-4">
              Filter and download staff appraisal details across quarters for a selected year based on performance levels and quarter.
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3 mb-2">
              {/* Year Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider mb-1">
                  Select Year:
                </label>
                <select
                  value={isManualYear ? "Manual Entry" : activePerformanceYear}
                  onChange={(e) => {
                    if (e.target.value === "Manual Entry") {
                      setIsManualYear(true);
                      setSelectedPerformanceYear("");
                    } else {
                      setIsManualYear(false);
                      setSelectedPerformanceYear(e.target.value);
                    }
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {(() => {
                    const currentYear = new Date().getFullYear();
                    const dynamicYears = [
                      currentYear - 2,
                      currentYear - 1,
                      currentYear,
                      currentYear + 1,
                    ];
                    
                    return (
                      <>
                        {dynamicYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                        <option value="Manual Entry">Manual Entry</option>
                      </>
                    );
                  })()}
                </select>

                {isManualYear && (
                  <input
                    type="number"
                    placeholder={`e.g. ${new Date().getFullYear()}`}
                    value={selectedPerformanceYear}
                    onChange={(e) => setSelectedPerformanceYear(e.target.value)}
                    className="w-full mt-2 p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                )}
              </div>

              {/* Quarter Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider mb-1">
                  Select Quarter:
                </label>
                <select
                  value={selectedPerformanceQuarter}
                  onChange={(e) => setSelectedPerformanceQuarter(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="ALL">All Quarters (Q1 - Q4 Matrix)</option>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>

              {/* Performance Level Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider mb-1">
                  Filter by Performance Level:
                </label>
                <select
                  value={selectedPerformanceFilter}
                  onChange={(e) => setSelectedPerformanceFilter(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="ALL">All Performance Ratings (Consolidated)</option>
                  <option value="NI">0.7 — NI (Needs Improvement)</option>
                  <option value="LS">0.0 — LS (Less Than Satisfactory)</option>
                  <option value="E">1.0 — E (Fully Effective)</option>
                  <option value="EP">1.3 — EP (Exceeds Performance)</option>
                </select>
                <p className="text-[10px] text-slate-500 leading-normal pt-1">
                  {RATING_DEFINITIONS[selectedPerformanceFilter]?.description}
                </p>
              </div>
            </div>

            <div className="mt-auto pt-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wide bg-amber-50 text-amber-800">
                ⚠️ Performance Filter Active
              </span>
            </div>
          </div>
          <div className="flex bg-slate-50/50 border-t border-slate-100 p-4 gap-3">
            <button 
              onClick={() => handleDownload('performance', 'PDF')} 
              disabled={exportingState.key !== null} 
              className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
            >
              {exportingState.key === 'performance' && exportingState.format === 'PDF' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : 'PDF'} Download
            </button>
            <button 
              onClick={() => handleDownload('performance', 'CSV')} 
              disabled={exportingState.key !== null} 
              className="flex-1 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
            >
              {exportingState.key === 'performance' && exportingState.format === 'CSV' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500"/> : 'CSV'} Download
            </button>
          </div>
        </div>

      </div>

      {/* Alert / Notification Modal */}
      {modal.show && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="text-5xl mb-4">{modal.icon}</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{modal.title}</h2>
            <p className="text-sm text-slate-500 mb-6">{modal.detail}</p>
            <button 
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-sm transition-colors" 
              onClick={() => setModal({ ...modal, show: false })}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}