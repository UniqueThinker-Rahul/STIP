'use client';

import React, { useState, useEffect } from 'react';
import { Download, Loader2, Info, Lock } from 'lucide-react';
import api from '../../../../lib/api';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reports() {
  const [quarters, setQuarters] = useState([]);
  const [selectedQuarterId, setSelectedQuarterId] = useState('');
  const [activeQuarterData, setActiveQuarterData] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [exportingState, setExportingState] = useState({ key: null, format: null }); 
  const [success, setSuccess] = useState({show: false, icon: '', title: '', detail: ''});

  useEffect(() => {
    const initData = async () => {
      try {
        const res = await api.get('/quarters').catch(() => ({ data: { data: [] } }));
        const fetchedQuarters = res.data?.data || [];
        setQuarters(fetchedQuarters);
        if (fetchedQuarters.length > 0) {
          setSelectedQuarterId(fetchedQuarters[0]._id);
          setActiveQuarterData(fetchedQuarters[0]);
        }
      } catch (err) {
        console.error("Failed to load quarters", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Update active quarter data when dropdown changes
  useEffect(() => {
    if (selectedQuarterId) {
      const q = quarters.find(q => q._id === selectedQuarterId);
      setActiveQuarterData(q);
    }
  }, [selectedQuarterId, quarters]);

  const handleDownload = async (reportType, format) => {
    if (!selectedQuarterId) {
        return setSuccess({ show: true, icon: '⚠️', title: 'Action Required', detail: 'Please select a reporting quarter first.' });
    }

    const qLockStatus = activeQuarterData?.isLocked;

    // Security Check
    if ((reportType === 'awards' || reportType === 'board') && !qLockStatus) {
      return setSuccess({
        show: true,
        icon: '🔒',
        title: 'Scorecard Not Locked',
        detail: `This report is highly sensitive. It is only available after the CEO locks the KPA scorecard for the ${activeQuarterData?.name} quarter.`
      });
    }
    
    setExportingState({ key: reportType, format });

    try {
      const [appRes, usersRes] = await Promise.all([
        api.get('/appraisals').catch(() => ({ data: { data: [] } })),
        api.get('/users').catch(() => ({ data: { data: [] } }))
      ]);

      const allAppraisals = appRes.data?.data || [];
      const allUsers = usersRes.data?.data || [];
      
      const quarterAppraisals = allAppraisals.filter(app => (app.appraisalQuarter?._id || app.appraisalQuarter) === selectedQuarterId);
      const submittedUserIds = quarterAppraisals.map(app => app.employeeId?._id || app.employeeId);

      // --- Data Aggregation Logic ---
      let columns = [];
      let rows = [];
      let title = "";

      if (reportType === 'completion') {
        title = `Appraisal Completion Report - ${activeQuarterData?.name}`;
        columns = ['Employee ID', 'Employee Name', 'Job Title', 'Company', 'Status'];
        allUsers.forEach(u => {
          if (!u.employmentDetails?.isActive || u.security?.role === 'CEO') return;
          const empName = `${u.personalDetails?.firstName || ''} ${u.personalDetails?.lastName || ''}`;
          const isSubmitted = submittedUserIds.includes(u._id);
          const appRecord = quarterAppraisals.find(a => (a.employeeId?._id || a.employeeId) === u._id);
          const status = isSubmitted ? (appRecord?.workflow?.status || 'SUBMITTED') : 'PENDING / NOT STARTED';
          rows.push([u.employeeId || 'N/A', empName, u.employmentDetails?.jobTitle || '', u.companyCode || 'FSM', status]);
        });
      }

      if (reportType === 'awards') {
        title = `Full STIP Award Report - ${activeQuarterData?.name}`;
        columns = ['Employee ID', 'Employee Name', 'Job Title', 'IPRF Score', 'Pro-Rata', 'Base CP%', 'Final Award (%)'];
        quarterAppraisals.forEach(app => {
          const empId = app.employeeId?.employeeId || 'N/A';
          const empName = `${app.employeeId?.personalDetails?.firstName || ''} ${app.employeeId?.personalDetails?.lastName || ''}`;
          const prorate = app.employeeId?.employmentDetails?.prorateValue || 12;
          rows.push([empId, empName, app.employeeId?.employmentDetails?.jobTitle || '', (app.calculatedResults?.finalIprfScore || 0).toString(), prorate.toString(), '13.01%', `${app.stipAward || 0}%`]);
        });
      }

      if (reportType === 'board') {
        title = `Board of Directors Summary - ${activeQuarterData?.name}`;
        columns = ['Category', 'Total Count', 'Percentage'];
        rows.push(['Total Active Staff', allUsers.length, '100%']);
        rows.push(['Appraisals Processed', quarterAppraisals.length, `${((quarterAppraisals.length/allUsers.length)*100).toFixed(1)}%`]);
        const exceeds = quarterAppraisals.filter(a => a.calculatedResults?.finalIprfScore >= 1.3).length;
        rows.push(['Exceeds Performance Ratings', exceeds, `${((exceeds/quarterAppraisals.length)*100).toFixed(1)}%`]);
      }

      if (reportType === 'office') {
        title = `Performance by Office Location - ${activeQuarterData?.name}`;
        columns = ['Company Code', 'Total Headcount', 'Appraisals Submitted', 'Completion Rate', 'Average IPRF Score'];
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
        Object.keys(officeStats).forEach(code => {
           const stats = officeStats[code];
           const rate = stats.head > 0 ? ((stats.sub / stats.head) * 100).toFixed(1) : 0;
           const avgIprf = stats.sub > 0 ? (stats.iprfTotal / stats.sub).toFixed(2) : 0;
           rows.push([code, stats.head.toString(), stats.sub.toString(), `${rate}%`, avgIprf]);
        });
      }

      if (reportType === 'criteria') {
        title = `Evaluated Criteria (NI/LS Tracking) - ${activeQuarterData?.name}`;
        columns = ['Department', 'Manager Name', 'Total Appraisals', 'Avg Score (IPRF)', 'NI Count (<1.0)', 'NI Concentration %'];
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

        Object.values(criteriaStats).forEach(stat => {
           const avgScore = stat.total > 0 ? (stat.iprfSum / stat.total).toFixed(2) : 0;
           const niConcentration = stat.total > 0 ? ((stat.niCount / stat.total) * 100).toFixed(1) : 0;
           rows.push([stat.company, stat.manager, stat.total.toString(), avgScore, stat.niCount.toString(), `${niConcentration}%`]);
        });
      }

      if (rows.length === 0) {
        return setSuccess({ show: true, icon: '📉', title: 'No Data', detail: 'There is no data available for this report in the selected quarter.' });
      }

      // --- EXPORT TO CSV ---
      if (format === 'CSV') {
        let csvString = columns.join(',') + '\n';
        rows.forEach(row => {
          // Quote strings to prevent comma splitting issues
          const cleanRow = row.map(cell => typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell);
          csvString += cleanRow.join(',') + '\n';
        });

        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${title.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // --- EXPORT TO PDF ---
      if (format === 'PDF') {
        const doc = new jsPDF('landscape');
        doc.setFontSize(16);
        doc.setTextColor(13, 43, 85); 
        doc.text(title, 14, 15);
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

        autoTable(doc, {
          startY: 28,
          head: [columns],
          body: rows,
          theme: 'striped',
          headStyles: { fillColor: [13, 43, 85], textColor: 255, fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8, textColor: 50 },
          alternateRowStyles: { fillColor: [245, 248, 250] },
        });

        doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
      }

    } catch (err) {
      console.error("Export Error:", err);
      setSuccess({ show: true, icon: '❌', title: 'Export Failed', detail: 'An error occurred while generating the report.' });
    } finally {
      setExportingState({ key: null, format: null });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-500 font-semibold animate-pulse">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#0D2B55]" /> Loading HR Reporting Suite...
      </div>
    );
  }

  const isLocked = activeQuarterData?.isLocked || false;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-20 font-sans animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">📊 Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Download and view real-time STIP program metrics.</p>
      </div>

      {/* Global Quarter Selector Bar */}
      <div className="bg-[#EBF5FF] border border-[#BFDBFE] p-4 rounded-xl mb-6 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
         <Info className="w-5 h-5 text-blue-600 shrink-0" />
         <div className="flex-grow">
           <span className="text-[13px] text-blue-900 font-medium block">
             Select a tracking quarter to generate reports. Note: CEO-level reports are disabled until the quarter scorecard is formally locked.
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
        
        {/* Card 1: Completion */}
        <div className="bg-white border border-slate-200 rounded-[16px] flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="p-6 flex-grow">
            <div className="text-4xl mb-4">✅</div>
            <div className="text-[16px] font-bold text-slate-900 mb-2">Appraisal Completion Report</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-6">
              Per-employee status across all 4 quarters — submitted, approved, pending, not started.
            </div>
            <div className="mt-auto">
               <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wide bg-green-50 text-green-700">✓ Available any time</span>
            </div>
          </div>
          <div className="flex bg-slate-50/50 border-t border-slate-100 p-4 gap-3">
             <button onClick={() => handleDownload('completion', 'PDF')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
               {exportingState.key === 'completion' && exportingState.format === 'PDF' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'PDF'} Download
             </button>
             <button onClick={() => handleDownload('completion', 'CSV')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
               {exportingState.key === 'completion' && exportingState.format === 'CSV' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /> : 'CSV'} Download
             </button>
          </div>
        </div>
        
        {/* Card 2: Full Award */}
        <div className="bg-white border border-slate-200 rounded-[16px] flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="p-6 flex-grow">
            <div className="text-4xl mb-4">💰</div>
            <div className="text-[16px] font-bold text-slate-900 mb-2">Full Award Report</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-6">
              All approved employees — IPRF, pro-rata, base award%, final award%, STIP pay ($) — payroll-ready.
            </div>
            <div className="mt-auto">
               <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wide ${isLocked ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                 {!isLocked && <Lock className="w-3 h-3" />}
                 {isLocked ? '✓ Unlocked' : 'After scorecard lock'}
               </span>
            </div>
          </div>
          <div className="flex bg-slate-50/50 border-t border-slate-100 p-4 gap-3">
             <button onClick={() => handleDownload('awards', 'PDF')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
               {exportingState.key === 'awards' && exportingState.format === 'PDF' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'PDF'} Download
             </button>
             <button onClick={() => handleDownload('awards', 'CSV')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
               {exportingState.key === 'awards' && exportingState.format === 'CSV' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /> : 'CSV'} Download
             </button>
          </div>
        </div>
        
        {/* Card 3: Board Summary */}
        <div className="bg-white border border-slate-200 rounded-[16px] flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="p-6 flex-grow">
            <div className="text-4xl mb-4">📄</div>
            <div className="text-[16px] font-bold text-slate-900 mb-2">Board Summary Report</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-6">
              High-level summary — CP%, KPA breakdown, EP count, total payout for Board presentation.
            </div>
            <div className="mt-auto">
               <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wide ${isLocked ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                 {!isLocked && <Lock className="w-3 h-3" />}
                 {isLocked ? '✓ Unlocked' : 'After scorecard lock'}
               </span>
            </div>
          </div>
          <div className="flex bg-slate-50/50 border-t border-slate-100 p-4 gap-3">
             <button onClick={() => handleDownload('board', 'PDF')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
               {exportingState.key === 'board' && exportingState.format === 'PDF' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'PDF'} Download
             </button>
             <button onClick={() => handleDownload('board', 'CSV')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
               {exportingState.key === 'board' && exportingState.format === 'CSV' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /> : 'CSV'} Download
             </button>
          </div>
        </div>
        
        {/* Card 4: Report by Office */}
        <div className="bg-white border border-slate-200 rounded-[16px] flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="p-6 flex-grow">
            <div className="text-4xl mb-4">🏢</div>
            <div className="text-[16px] font-bold text-slate-900 mb-2">Report by Office</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-6">
              Statistics grouped by FSM, CDU, NAR, GUM — headcount, completion rate, average IPRF.
            </div>
            <div className="mt-auto">
               <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wide bg-green-50 text-green-700">✓ Available any time</span>
            </div>
          </div>
          <div className="flex bg-slate-50/50 border-t border-slate-100 p-4 gap-3">
             <button onClick={() => handleDownload('office', 'PDF')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
               {exportingState.key === 'office' && exportingState.format === 'PDF' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'PDF'} Download
             </button>
             <button onClick={() => handleDownload('office', 'CSV')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
               {exportingState.key === 'office' && exportingState.format === 'CSV' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /> : 'CSV'} Download
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
               {exportingState.key === 'criteria' && exportingState.format === 'PDF' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'PDF'} Download
             </button>
             <button onClick={() => handleDownload('criteria', 'CSV')} disabled={exportingState.key !== null} className="flex-1 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
               {exportingState.key === 'criteria' && exportingState.format === 'CSV' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /> : 'CSV'} Download
             </button>
          </div>
        </div>

      </div>
      
      {/* Dynamic Modal */}
      {success.show && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="text-5xl mb-4">{success.icon}</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{success.title}</h2>
            <p className="text-sm text-slate-500 mb-6">{success.detail}</p>
            <button 
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-sm transition-colors" 
              onClick={() => setSuccess({...success, show: false})}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}