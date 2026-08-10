'use client';

import React, { useState, useEffect } from 'react';
import { BarChart2, CheckSquare, DollarSign, Building, Star, ClipboardList, Users, Network, Lock, Info, Loader2, FileText, Download } from 'lucide-react';
import api from '../../../../lib/api';

// Import PDF Libraries
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ICTReportsPage() {
  const [quarters, setQuarters] = useState([]);
  const [selectedQuarterId, setSelectedQuarterId] = useState('');
  
  // Track exactly which button is loading
  const [exportingState, setExportingState] = useState({ key: null, format: null }); 
  const [loading, setLoading] = useState(true);

  // Fetch active quarters for the global selector
  useEffect(() => {
    const initData = async () => {
      try {
        const res = await api.get('/quarters').catch(() => ({ data: { data: [] } }));
        const fetchedQuarters = res.data?.data || [];
        setQuarters(fetchedQuarters);
        if (fetchedQuarters.length > 0) {
          setSelectedQuarterId(fetchedQuarters[0]._id);
        }
      } catch (err) {
        console.error("Failed to load quarters", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // ---------------------------------------------------------
  // 1. CSV EXPORT ENGINE
  // ---------------------------------------------------------
  const handleCSVExport = async (reportType) => {
    if (!reportType.startsWith('SYSTEM_') && !selectedQuarterId) {
        return alert("Please select a tracking quarter for this specific report.");
    }
    setExportingState({ key: reportType, format: 'CSV' });

    try {
      const [appRes, usersRes] = await Promise.all([
        api.get('/appraisals').catch(() => ({ data: { data: [] } })),
        api.get('/users').catch(() => ({ data: { data: [] } }))
      ]);

      const allAppraisals = appRes.data?.data || [];
      const allUsers = usersRes.data?.data || [];
      
      const targetQuarter = quarters.find(q => q._id === selectedQuarterId);
      const quarterAppraisals = allAppraisals.filter(app => (app.appraisalQuarter?._id || app.appraisalQuarter) === selectedQuarterId);
      const submittedUserIds = quarterAppraisals.map(app => app.employeeId?._id || app.employeeId);

      let csvRows = [];
      let filename = reportType.startsWith('SYSTEM_') 
        ? `ICT_Export_${reportType}.csv` 
        : `ICT_Export_${targetQuarter?.name}_${reportType}.csv`;

      // 1. BOARD SUMMARY REPORT
      if (reportType === 'BOARD_SUMMARY') {
        csvRows.push('Category,Total Count,Percentage');
        csvRows.push(`Total Staff,${allUsers.length},100%`);
        csvRows.push(`Appraisals Submitted,${quarterAppraisals.length},${((quarterAppraisals.length/allUsers.length)*100).toFixed(1)}%`);
        const exceeds = quarterAppraisals.filter(a => a.calculatedResults?.finalIprfScore >= 1.3).length;
        csvRows.push(`Exceeds Performance (EP),${exceeds},${((exceeds/quarterAppraisals.length)*100).toFixed(1)}%`);
      }

      // 2. APPRAISAL COMPLETION REPORT
      if (reportType === 'COMPLETION') {
        csvRows.push('Employee ID,Employee Name,Job Title,Company,Status');
        allUsers.forEach(u => {
          if (!u.employmentDetails?.isActive || u.security?.role === 'CEO') return;
          const empName = `${u.personalDetails?.firstName || ''} ${u.personalDetails?.lastName || ''}`;
          const isSubmitted = submittedUserIds.includes(u._id);
          const appRecord = quarterAppraisals.find(a => (a.employeeId?._id || a.employeeId) === u._id);
          const status = isSubmitted ? (appRecord?.workflow?.status || 'SUBMITTED') : 'PENDING / NOT STARTED';
          
          csvRows.push([
            u.employeeId || 'N/A', `"${empName}"`, `"${u.employmentDetails?.jobTitle || ''}"`, u.companyCode || 'FSM', status
          ].join(','));
        });
      }

      // 3. FULL AWARD REPORT
      if (reportType === 'FULL_AWARD') {
        csvRows.push('Employee ID,Employee Name,Job Title,IPRF Score,Pro-Rata Months,Base CP%,Final STIP Award (%),Status');
        quarterAppraisals.forEach(app => {
          const empId = app.employeeId?.employeeId || 'N/A';
          const empName = `${app.employeeId?.personalDetails?.firstName || ''} ${app.employeeId?.personalDetails?.lastName || ''}`;
          const prorate = app.employeeId?.employmentDetails?.prorateValue || 12;
          csvRows.push([
            empId, `"${empName}"`, `"${app.employeeId?.employmentDetails?.jobTitle || ''}"`,
            app.calculatedResults?.finalIprfScore || 0, prorate, '13.01%', `${app.stipAward || 0}%`, app.workflow?.status || 'PENDING'
          ].join(','));
        });
      }

      // 4. REPORT BY OFFICE
      if (reportType === 'BY_OFFICE') {
        csvRows.push('Company Code,Headcount,Submitted,Completion Rate,Avg IPRF');
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
           csvRows.push([code, stats.head, stats.sub, `${rate}%`, avgIprf].join(','));
        });
      }

      // 🚨 NEW: 5. REPORT ON EVALUATED CRITERIA (NI/LS Concentrations)
      if (reportType === 'CRITERIA') {
        csvRows.push('Department (Company),Manager Name,Total Appraisals,Average Score (IPRF),Needs Improvement Count (Score < 1.0),NI Concentration %');
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

          // Identify NI/LS (Needs Improvement / Low Score) - Assuming standard < 1.0 threshold
          if (score < 1.0) {
             criteriaStats[key].niCount += 1;
          }
        });

        Object.values(criteriaStats).forEach(stat => {
           const avgScore = stat.total > 0 ? (stat.iprfSum / stat.total).toFixed(2) : 0;
           const niConcentration = stat.total > 0 ? ((stat.niCount / stat.total) * 100).toFixed(1) : 0;
           csvRows.push([
             stat.company, 
             `"${stat.manager}"`, 
             stat.total, 
             avgScore, 
             stat.niCount, 
             `${niConcentration}%`
           ].join(','));
        });
      }

      // 6. SYSTEM: ALL STAFF DATABASE
      if (reportType === 'SYSTEM_ALL_STAFF') {
        csvRows.push('Employee ID,Company,First Name,Last Name,Email,Job Title,System Role,Account Status,Manager Name');
        allUsers.forEach(u => {
          const mgr = u.employmentDetails?.reportingTo?.personalDetails;
          const mgrName = mgr ? `${mgr.firstName} ${mgr.lastName}` : (u.employmentDetails?.rawManagerName || 'Unassigned');
          csvRows.push([
            u.employeeId || 'N/A', u.companyCode || 'FSM', `"${u.personalDetails?.firstName || ''}"`, `"${u.personalDetails?.lastName || ''}"`,
            `"${u.email || ''}"`, `"${u.employmentDetails?.jobTitle || ''}"`, u.security?.role || 'EMPLOYEE', u.employmentDetails?.isActive ? 'Active' : 'Inactive', `"${mgrName}"`
          ].join(','));
        });
      }

      // 7. SYSTEM: MANAGER HIERARCHY
      if (reportType === 'SYSTEM_HIERARCHY') {
        csvRows.push('Manager Name,Total Direct Reports,Staff ID,Staff Name,Staff Job Title,Staff Status');
        const managerGroups = {};
        allUsers.forEach(u => {
           if (!u.employmentDetails?.isActive || u.security?.role === 'CEO') return;
           const mgrObj = u.employmentDetails?.reportingTo;
           const mgrName = mgrObj ? `${mgrObj.personalDetails?.firstName || ''} ${mgrObj.personalDetails?.lastName || ''}` : (u.employmentDetails?.rawManagerName || 'Unassigned');
           if (!managerGroups[mgrName]) managerGroups[mgrName] = [];
           managerGroups[mgrName].push(u);
        });
        Object.keys(managerGroups).sort().forEach(mgr => {
           const count = managerGroups[mgr].length;
           managerGroups[mgr].forEach(staff => {
              const staffName = `${staff.personalDetails?.firstName || ''} ${staff.personalDetails?.lastName || ''}`;
              csvRows.push([
                `"${mgr}"`, count, staff.employeeId || 'N/A', `"${staffName}"`, `"${staff.employmentDetails?.jobTitle || ''}"`, staff.employmentDetails?.isActive ? 'Active' : 'Inactive'
              ].join(','));
           });
        });
      }

      if (csvRows.length === 1) return alert('No data available for the selected filters.');
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename.replace(/\s+/g, '_'));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error("Export Error:", err);
      alert('Error generating report.');
    } finally {
      setExportingState({ key: null, format: null });
    }
  };


  // ---------------------------------------------------------
  // 2. UPGRADED PDF EXPORT ENGINE (jsPDF + autoTable)
  // ---------------------------------------------------------
  const handlePDFExport = async (reportType) => {
    if (!reportType.startsWith('SYSTEM_') && !selectedQuarterId) {
        return alert("Please select a tracking quarter for this specific report.");
    }
    setExportingState({ key: reportType, format: 'PDF' });

    try {
      const [appRes, usersRes] = await Promise.all([
        api.get('/appraisals').catch(() => ({ data: { data: [] } })),
        api.get('/users').catch(() => ({ data: { data: [] } }))
      ]);

      const allAppraisals = appRes.data?.data || [];
      const allUsers = usersRes.data?.data || [];
      
      const targetQuarter = quarters.find(q => q._id === selectedQuarterId);
      const quarterAppraisals = allAppraisals.filter(app => (app.appraisalQuarter?._id || app.appraisalQuarter) === selectedQuarterId);
      const submittedUserIds = quarterAppraisals.map(app => app.employeeId?._id || app.employeeId);

      // Initialize PDF Document (Landscape mode for tables)
      const doc = new jsPDF('landscape');
      let title = "System Report";
      let columns = [];
      let rows = [];

      // 1. BOARD SUMMARY REPORT
      if (reportType === 'BOARD_SUMMARY') {
        title = `Board Summary Report - ${targetQuarter?.name || ''}`;
        columns = ['Category', 'Total Count', 'Percentage'];
        rows.push(['Total Staff', allUsers.length, '100%']);
        rows.push(['Appraisals Submitted', quarterAppraisals.length, `${((quarterAppraisals.length/allUsers.length)*100).toFixed(1)}%`]);
        const exceeds = quarterAppraisals.filter(a => a.calculatedResults?.finalIprfScore >= 1.3).length;
        rows.push(['Exceeds Performance (EP)', exceeds, `${((exceeds/quarterAppraisals.length)*100).toFixed(1)}%`]);
      }

      // 2. APPRAISAL COMPLETION REPORT
      if (reportType === 'COMPLETION') {
        title = `Appraisal Completion Report - ${targetQuarter?.name || ''}`;
        columns = ['Employee ID', 'Employee Name', 'Job Title', 'Company Code', 'Status'];
        allUsers.forEach(u => {
          if (!u.employmentDetails?.isActive || u.security?.role === 'CEO') return;
          const empName = `${u.personalDetails?.firstName || ''} ${u.personalDetails?.lastName || ''}`;
          const isSubmitted = submittedUserIds.includes(u._id);
          const appRecord = quarterAppraisals.find(a => (a.employeeId?._id || a.employeeId) === u._id);
          const status = isSubmitted ? (appRecord?.workflow?.status || 'SUBMITTED') : 'PENDING / NOT STARTED';
          rows.push([u.employeeId || 'N/A', empName, u.employmentDetails?.jobTitle || '', u.companyCode || 'FSM', status]);
        });
      }

      // 3. FULL AWARD REPORT
      if (reportType === 'FULL_AWARD') {
        title = `Full Award Report - ${targetQuarter?.name || ''}`;
        columns = ['Employee ID', 'Employee Name', 'IPRF Score', 'Pro-Rata', 'Base CP%', 'Final Award (%)', 'Status'];
        quarterAppraisals.forEach(app => {
          const empId = app.employeeId?.employeeId || 'N/A';
          const empName = `${app.employeeId?.personalDetails?.firstName || ''} ${app.employeeId?.personalDetails?.lastName || ''}`;
          const prorate = app.employeeId?.employmentDetails?.prorateValue || 12;
          rows.push([
            empId, empName, (app.calculatedResults?.finalIprfScore || 0).toString(), 
            prorate.toString(), '13.01%', `${app.stipAward || 0}%`, app.workflow?.status || 'PENDING'
          ]);
        });
      }

      // 4. REPORT BY OFFICE
      if (reportType === 'BY_OFFICE') {
        title = `Appraisal Report by Office - ${targetQuarter?.name || ''}`;
        columns = ['Company Code', 'Headcount', 'Submitted', 'Completion Rate', 'Avg IPRF'];
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

      // 🚨 NEW: 5. REPORT ON EVALUATED CRITERIA
      if (reportType === 'CRITERIA') {
        title = `Report on Evaluated Criteria (NI/LS) - ${targetQuarter?.name || ''}`;
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
           rows.push([
             stat.company, stat.manager, stat.total.toString(), avgScore, stat.niCount.toString(), `${niConcentration}%`
           ]);
        });
      }

      // 6. SYSTEM: ALL STAFF DATABASE
      if (reportType === 'SYSTEM_ALL_STAFF') {
        title = "Global Staff Database Export";
        columns = ['Employee ID', 'Company', 'Name', 'Email', 'Role', 'Status'];
        allUsers.forEach(u => {
          rows.push([
            u.employeeId || 'N/A', u.companyCode || 'FSM', `${u.personalDetails?.firstName || ''} ${u.personalDetails?.lastName || ''}`,
            u.email || '', u.security?.role || 'EMPLOYEE', u.employmentDetails?.isActive ? 'Active' : 'Inactive'
          ]);
        });
      }

      // 7. SYSTEM: MANAGER HIERARCHY
      if (reportType === 'SYSTEM_HIERARCHY') {
        title = "Manager Hierarchy Mapping";
        columns = ['Manager Name', 'Total Direct Reports', 'Staff ID', 'Staff Name', 'Staff Job Title'];
        const managerGroups = {};
        allUsers.forEach(u => {
           if (!u.employmentDetails?.isActive || u.security?.role === 'CEO') return;
           const mgrObj = u.employmentDetails?.reportingTo;
           const mgrName = mgrObj ? `${mgrObj.personalDetails?.firstName || ''} ${mgrObj.personalDetails?.lastName || ''}` : (u.employmentDetails?.rawManagerName || 'Unassigned');
           if (!managerGroups[mgrName]) managerGroups[mgrName] = [];
           managerGroups[mgrName].push(u);
        });
        Object.keys(managerGroups).sort().forEach(mgr => {
           const count = managerGroups[mgr].length;
           managerGroups[mgr].forEach(staff => {
              const staffName = `${staff.personalDetails?.firstName || ''} ${staff.personalDetails?.lastName || ''}`;
              rows.push([mgr, count.toString(), staff.employeeId || 'N/A', staffName, staff.employmentDetails?.jobTitle || '']);
           });
        });
      }

      if (rows.length === 0) return alert('No data available for the selected filters.');

      // --- Draw the PDF ---
      doc.setFontSize(16);
      doc.setTextColor(13, 43, 85); // #0D2B55
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

      const filename = reportType.startsWith('SYSTEM_') 
        ? `ICT_Export_${reportType}.pdf` 
        : `ICT_Export_${targetQuarter?.name}_${reportType}.pdf`;

      doc.save(filename.replace(/\s+/g, '_'));

    } catch (err) {
      console.error("PDF Export Error:", err);
      alert('Error generating PDF report.');
    } finally {
      setExportingState({ key: null, format: null });
    }
  };


  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-500 font-semibold animate-pulse">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#0D2B55]" /> Initializing Reports Center...
      </div>
    );
  }

  // --- UI COMPONENT: REPORT CARD ---
  const ReportCard = ({ icon: Icon, title, description, badgeText, badgeClass, iconColor, reportKey }) => (
    <div className="bg-white rounded-[16px] border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden hover:border-[#0D2B55]/30 transition-all">
      <div className="p-5 flex-grow">
        <div className="mb-3"><Icon className={`w-7 h-7 ${iconColor}`} strokeWidth={1.5} /></div>
        <h3 className="text-[15px] font-bold text-[#0D2B55] mb-1.5 leading-tight">{title}</h3>
        <p className="text-[12px] text-gray-500 leading-relaxed mb-4">{description}</p>
        <div className="mt-auto">
          {badgeText && (
             <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[10px] font-bold tracking-wide ${badgeClass}`}>
                {badgeText.includes('lock') ? <Lock className="w-3 h-3" /> : null}
                {badgeText}
             </span>
          )}
        </div>
      </div>
      
      {/* Action Buttons Footer */}
      <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50/30">
        <button 
          onClick={() => handlePDFExport(reportKey)}
          disabled={exportingState.key !== null}
          className="flex-1 bg-[#0D2B55] hover:bg-[#1a3d6e] text-white py-2.5 rounded-[8px] flex items-center justify-center gap-2 text-[11px] font-bold transition-colors shadow-sm disabled:opacity-50"
        >
          {exportingState.key === reportKey && exportingState.format === 'PDF' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} 
          Download PDF
        </button>
        <button 
          onClick={() => handleCSVExport(reportKey)}
          disabled={exportingState.key !== null}
          className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-2.5 rounded-[8px] flex items-center justify-center gap-2 text-[11px] font-bold transition-colors shadow-sm disabled:opacity-50"
        >
          {exportingState.key === reportKey && exportingState.format === 'CSV' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /> : <Download className="w-3.5 h-3.5 text-blue-500" />} 
          Download CSV
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto pb-20 font-sans text-[#0F172A] px-4 xl:px-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Area */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1 text-[#0D2B55]">
          <BarChart2 className="w-7 h-7" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        </div>
        <p className="text-sm text-gray-500 font-medium">
          Download and view STIP program reports — CEO, HR Manager, and Admin access only.
        </p>
      </div>

      {/* Global Quarter Selector Bar */}
      <div className="bg-[#EBF5FF] border border-[#BFDBFE] p-3 rounded-[10px] mb-6 flex flex-col sm:flex-row items-center gap-3">
         <Info className="w-5 h-5 text-blue-600 shrink-0" />
         <span className="text-[12px] text-blue-900 font-medium flex-grow">
           Click <strong>PDF</strong> for a formatted printable report or <strong>CSV</strong> for Excel/payroll import.
         </span>
         <select 
            value={selectedQuarterId}
            onChange={(e) => setSelectedQuarterId(e.target.value)}
            className="w-full sm:w-auto p-2 border border-blue-200 rounded-[8px] text-[12px] font-bold outline-none bg-white text-blue-900 focus:ring-2 focus:ring-blue-500/20"
          >
            {quarters.length === 0 ? <option value="">No Quarters Found</option> : quarters.map(q => (
              <option key={q._id} value={q._id}>{q.name} ({q.year})</option>
            ))}
          </select>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <ReportCard 
          icon={ClipboardList} iconColor="text-[#D97706]" // Amber
          title="Board Summary Report"
          description="High-level summary — total headcount, CP%, EP count, and total estimated payout for Board presentation."
          badgeText="After scorecard lock" badgeClass="bg-[#FEF3C7] text-[#92400E]"
          reportKey="BOARD_SUMMARY"
        />

        <ReportCard 
          icon={CheckSquare} iconColor="text-[#059669]" // Emerald
          title="Appraisal Completion Report"
          description="Per-employee appraisal status across the selected quarter — submitted, approved, pending, not started."
          badgeText="✓ Available any time" badgeClass="bg-[#D1FAE5] text-[#065F46]"
          reportKey="COMPLETION"
        />

        <ReportCard 
          icon={DollarSign} iconColor="text-[#D97706]" // Amber
          title="Full Award Report"
          description="All employees — IPRF, pro-rata, base award%, final award%, STIP pay ($) — payroll-ready."
          badgeText="After scorecard lock" badgeClass="bg-[#FEF3C7] text-[#92400E]"
          reportKey="FULL_AWARD"
        />

        <ReportCard 
          icon={Building} iconColor="text-[#64748B]" // Slate
          title="Report by Office"
          description="Statistics grouped by Company Code (FSM, CDU, NAR, GUM) — headcount, completion rate, average IPRF."
          badgeText="✓ Available any time" badgeClass="bg-[#D1FAE5] text-[#065F46]"
          reportKey="BY_OFFICE"
        />

        {/* 🚨 NEW: Criteria Report */}
        <ReportCard 
          icon={Star} iconColor="text-[#EAB308]" // Yellow/Gold
          title="Report on Evaluated Criteria"
          description="Average scores per criterion — identifies NI/LS concentrations by department and manager."
          badgeText="✓ Available any time" badgeClass="bg-[#D1FAE5] text-[#065F46]"
          reportKey="CRITERIA"
        />

        {/* ICT Specific God-Mode Reports */}
        <ReportCard 
          icon={Users} iconColor="text-[#4C1D95]" // Purple
          title="Global Staff Database"
          description="Full system architecture dump. Extracts all registered employee records, IDs, company codes, and account statuses."
          badgeText="Admin only" badgeClass="bg-[#F3E8FF] text-[#6B21A8]"
          reportKey="SYSTEM_ALL_STAFF"
        />

        <ReportCard 
          icon={Network} iconColor="text-[#4C1D95]" // Purple
          title="Manager Hierarchy Mapping"
          description="Extracts the complete reporting structure. Lists every manager alongside their assigned direct reports."
          badgeText="Admin only" badgeClass="bg-[#F3E8FF] text-[#6B21A8]"
          reportKey="SYSTEM_HIERARCHY"
        />

      </div>
    </div>
  );
}