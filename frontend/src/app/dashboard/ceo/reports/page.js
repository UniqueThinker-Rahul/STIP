'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';

export default function CEOReports() {
  const [appraisals, setAppraisals] = useState([]);
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [toast, setToast] = useState({ show: false, name: '', fmt: '' });

  const reportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [appRes, userRes, metricsRes] = await Promise.all([
          api.get('/appraisals').catch(() => ({ data: { data: [] } })),
          api.get('/users').catch(() => ({ data: { data: [] } })),
          api.get('/company-metrics/2026').catch(() => ({ data: { data: null } }))
        ]);
        
        setAppraisals(appRes.data?.data || []);
        setUsers(userRes.data?.data || []);
        setMetrics(metricsRes.data?.data || null);
      } catch (error) {
        console.error('Failed to fetch report data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const cpPct = metrics?.cpPct || null;
  const bscRaw = metrics?.bscRawScore || null;
  const locked = metrics?.locked || false;
  const lockedBy = metrics?.lockedBy || 'Jared Morris';
  const lockedAt = metrics?.lockedAt ? new Date(metrics.lockedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

  const ep = appraisals.filter(a => a.calculatedResults?.finalIprfScore >= 1.3).length;
  const approvedApps = appraisals.filter(a => a.workflow?.status === 'APPROVED');
  const totalStaffCount = users.length || 190;

  // Calculate estimated payout dynamically
  const estimatedPayout = approvedApps.reduce((sum, a) => {
    const sal = a.employeeBaseSalary || 30000;
    const iprf = a.calculatedResults?.finalIprfScore || 0;
    const proRata = (a.employeeId?.employmentDetails?.prorateValue || 12) / 12;
    if (cpPct === null) return sum;
    const finalAw = (cpPct * iprf) * proRata;
    return sum + (sal * (finalAw / 100));
  }, 0);

  const showToast = (name, fmt) => {
    setToast({ show: true, name, fmt });
    setTimeout(() => setToast({ show: false, name: '', fmt: '' }), 4000);
  };

  // --- REPORT GENERATORS ---

  const triggerCSV = (csvContent, filename) => {
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerPDF = (title, tableHtml, summaryHtml = '') => {
    const htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 40px; }
            h1 { color: #0D2B55; text-align: center; border-bottom: 2px solid #0D2B55; padding-bottom: 10px; }
            .meta { text-align: center; color: #666; margin-bottom: 30px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 10px 8px; text-align: left; }
            th { background-color: #0D2B55; color: white; font-weight: bold; }
            .right { text-align: right; }
            .center { text-align: center; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .total-row { font-size: 16px; font-weight: bold; color: #0D2B55; text-align: right; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">Generated: ${reportDate} | Financial Year: CY2026 | FSM Petroleum Corporation</div>
          ${summaryHtml}
          ${tableHtml}
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
  };

  // 1. Board Summary
  const generateBoardSummary = (fmt) => {
    if (!locked) return alert("Scorecard Not Yet Locked: This report is only available after the CEO locks the KPA scorecard.");
    if (fmt === 'csv') {
      let csv = "Metric,Value,Notes\r\n";
      csv += `"Final CP%","${cpPct.toFixed(2)}%","Board-approved KPA Scorecard result"\r\n`;
      csv += `"BSC Raw Score","${bscRaw.toFixed(2)} / 100","Sum of KPA weighted contributions"\r\n`;
      csv += `"Max CP Cap","15%","Fixed by Board policy"\r\n`;
      csv += `"Total Staff Covered","${totalStaffCount}","STIP-eligible employees CY2026"\r\n`;
      csv += `"EP-Rated Staff","${ep} / 9 max","5% cap of employees"\r\n`;
      csv += `"Max Award (EP)","${(cpPct * 1.3).toFixed(2)}%","For Exceeds Performance rating"\r\n`;
      csv += `"Standard Award (E)","${(cpPct * 1.0).toFixed(2)}%","For Fully Effective rating"\r\n`;
      csv += `"CEO Approved Appraisals","${approvedApps.length}","Final approvals completed"\r\n`;
      csv += `"Estimated Gross Payout","$${estimatedPayout.toFixed(2)}","Subject to FSM income tax"\r\n`;
      csv += `"Locked By","${lockedBy}","CEO who locked the scorecard"\r\n`;
      csv += `"Locked At","${lockedAt}","Date of lock"\r\n`;
      triggerCSV(csv, `STIP_Board_Summary_CY2026.csv`);
    } else {
      const tableHtml = `
        <table>
          <thead><tr><th>Metric</th><th>Value</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td>Final CP%</td><td class="center" style="font-weight:bold; color:#059669;">${cpPct.toFixed(2)}%</td><td>Board-approved KPA Scorecard result</td></tr>
            <tr><td>BSC Raw Score</td><td class="center">${bscRaw.toFixed(2)} / 100</td><td>Sum of KPA weighted contributions</td></tr>
            <tr><td>Total Staff Covered</td><td class="center">${totalStaffCount}</td><td>STIP-eligible employees CY2026</td></tr>
            <tr><td>EP-Rated Staff</td><td class="center">${ep} / 9 max</td><td>5% cap</td></tr>
            <tr><td>Max Award (EP)</td><td class="center">${(cpPct * 1.3).toFixed(2)}%</td><td>For Exceeds Performance rating</td></tr>
            <tr><td>Standard Award (E)</td><td class="center">${(cpPct * 1.0).toFixed(2)}%</td><td>For Fully Effective rating</td></tr>
            <tr><td>CEO Approved Appraisals</td><td class="center">${approvedApps.length}</td><td>Final approvals completed</td></tr>
            <tr><td>Estimated Gross Payout</td><td class="center" style="font-weight:bold;">$${estimatedPayout.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td><td>Subject to FSM income tax</td></tr>
            <tr><td>Locked By</td><td class="center">${lockedBy}</td><td>Executive authorization</td></tr>
            <tr><td>Locked At</td><td class="center">${lockedAt}</td><td>Timestamp of execution</td></tr>
          </tbody>
        </table>
      `;
      triggerPDF('STIP Program — Board Summary Report', tableHtml);
    }
    showToast('Board Summary Report', fmt);
  };

  // 2. Appraisal Completion
  const generateCompletion = (fmt) => {
    if (fmt === 'csv') {
      let csv = "Employee ID,Name,Job Title,Company,Status,IPRF Score\r\n";
      users.forEach(u => {
        const app = appraisals.find(a => (a.employeeId?._id || a.employeeId) === u._id);
        const name = `${u.personalDetails?.firstName || ''} ${u.personalDetails?.lastName || ''}`;
        const status = app ? app.workflow?.status : 'NOT_STARTED';
        const iprf = app && app.calculatedResults?.finalIprfScore ? app.calculatedResults.finalIprfScore.toFixed(1) : '—';
        csv += `"${u.employeeId}","${name}","${u.employmentDetails?.jobTitle}","${u.companyCode}","${status}","${iprf}"\r\n`;
      });
      triggerCSV(csv, `STIP_Completion_Report_CY2026.csv`);
    } else {
      let rows = '';
      users.forEach(u => {
        const app = appraisals.find(a => (a.employeeId?._id || a.employeeId) === u._id);
        const name = `${u.personalDetails?.firstName || ''} ${u.personalDetails?.lastName || ''}`;
        const status = app ? app.workflow?.status.replace(/_/g, ' ') : 'NOT STARTED';
        const iprf = app && app.calculatedResults?.finalIprfScore ? app.calculatedResults.finalIprfScore.toFixed(1) : '—';
        rows += `<tr><td>${u.employeeId}</td><td>${name}</td><td class="center">${u.companyCode}</td><td class="center">${status}</td><td class="center font-bold">${iprf}</td></tr>`;
      });
      const tableHtml = `<table><thead><tr><th>Emp ID</th><th>Name</th><th>Company</th><th>Workflow Status</th><th>IPRF</th></tr></thead><tbody>${rows}</tbody></table>`;
      triggerPDF('Appraisal Completion Report', tableHtml);
    }
    showToast('Appraisal Completion Report', fmt);
  };

  // 3. Full Award
  const generateAwards = (fmt) => {
    if (!locked) return alert("Scorecard Not Yet Locked: Awards cannot be calculated until CP% is locked.");
    if (approvedApps.length === 0) return alert("No approved appraisals exist yet.");
    if (fmt === 'csv') {
      let csv = "Employee ID,Name,Company,Base Salary,IPRF,Pro-Rata,Base Award %,Final Award %,STIP Pay ($)\r\n";
      approvedApps.forEach(a => {
        const emp = a.employeeId?.personalDetails || {};
        const sal = a.employeeBaseSalary || 30000;
        const iprf = a.calculatedResults?.finalIprfScore || 0;
        const proRata = (a.employeeId?.employmentDetails?.prorateValue || 12) / 12;
        const finalAw = (cpPct * iprf) * proRata;
        const pay = sal * (finalAw / 100);
        csv += `"${a.employeeId?.employeeId}","${emp.firstName} ${emp.lastName}","${a.employeeId?.companyCode}","${sal}","${iprf.toFixed(1)}","${proRata.toFixed(3)}","${(cpPct * iprf).toFixed(2)}%","${finalAw.toFixed(2)}%","${pay.toFixed(2)}"\r\n`;
      });
      triggerCSV(csv, `STIP_Final_Awards_CY2026.csv`);
    } else {
      let rows = '';
      approvedApps.forEach(a => {
        const emp = a.employeeId?.personalDetails || {};
        const sal = a.employeeBaseSalary || 30000;
        const iprf = a.calculatedResults?.finalIprfScore || 0;
        const proRata = (a.employeeId?.employmentDetails?.prorateValue || 12) / 12;
        const finalAw = (cpPct * iprf) * proRata;
        const pay = sal * (finalAw / 100);
        rows += `<tr><td>${a.employeeId?.employeeId}</td><td>${emp.firstName} ${emp.lastName}</td><td class="center">${iprf.toFixed(1)}</td><td class="center">${proRata.toFixed(3)}</td><td class="center">${finalAw.toFixed(2)}%</td><td class="right">$${pay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>`;
      });
      const tableHtml = `<table><thead><tr><th>Emp ID</th><th>Name</th><th>IPRF</th><th>Pro-Rata</th><th>Final Award %</th><th class="right">Gross Payout ($)</th></tr></thead><tbody>${rows}</tbody></table><div class="total-row">Grand Total Payout: $${estimatedPayout.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>`;
      triggerPDF('Full STIP Award Validation Report', tableHtml);
    }
    showToast('Full Award Report', fmt);
  };

  // 4. Report By Office
  const generateOffice = (fmt) => {
    const offices = ['FSM', 'CDU', 'NAR', 'GUM'];
    const data = offices.map(off => {
      const staff = users.filter(u => u.companyCode === off);
      const apps = appraisals.filter(a => a.employeeId?.companyCode === off);
      const apprs = apps.filter(a => a.workflow?.status === 'APPROVED');
      const eps = apps.filter(a => a.calculatedResults?.finalIprfScore >= 1.3).length;
      let payout = 0;
      if (cpPct) {
        payout = apprs.reduce((s, a) => s + ((a.employeeBaseSalary || 30000) * (((cpPct * (a.calculatedResults?.finalIprfScore || 0)) * ((a.employeeId?.employmentDetails?.prorateValue || 12)/12)) / 100)), 0);
      }
      return { off, staff: staff.length, apps: apps.length, apprs: apprs.length, eps, payout };
    });

    if (fmt === 'csv') {
      let csv = "Company,Headcount,Submitted Appraisals,Approved Appraisals,EP Ratings,Est Payout ($)\r\n";
      data.forEach(d => { csv += `"${d.off}","${d.staff}","${d.apps}","${d.apprs}","${d.eps}","${d.payout.toFixed(2)}"\r\n`; });
      triggerCSV(csv, 'STIP_Office_Report_CY2026.csv');
    } else {
      let rows = '';
      data.forEach(d => { rows += `<tr><td class="center font-bold">${d.off}</td><td class="center">${d.staff}</td><td class="center">${d.apps}</td><td class="center">${d.apprs}</td><td class="center">${d.eps}</td><td class="right">$${d.payout.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td></tr>`; });
      const tableHtml = `<table><thead><tr><th>Company</th><th>Headcount</th><th>Submitted</th><th>Approved</th><th>EP Ratings</th><th class="right">Est Payout ($)</th></tr></thead><tbody>${rows}</tbody></table>`;
      triggerPDF('Report by Office', tableHtml);
    }
    showToast('Report by Office', fmt);
  };

  // 5. Evaluated Criteria
  const generateCriteria = (fmt) => {
    const validApps = appraisals.filter(a => a.scores);
    if(validApps.length === 0) return alert("No scored appraisals available.");
    
    let totals = { deliveredResults: 0, behaviors: 0, safeWorking: 0, jobCompetence: 0, dependability: 0, adaptability: 0 };
    validApps.forEach(a => {
      totals.deliveredResults += a.scores.deliveredResults?.rating || 0;
      totals.behaviors += a.scores.behaviors?.rating || 0;
      totals.safeWorking += a.scores.safeWorking?.rating || 0;
      totals.jobCompetence += a.scores.jobCompetence?.rating || 0;
      totals.dependability += a.scores.dependability?.rating || 0;
      totals.adaptability += a.scores.adaptability?.rating || 0;
    });

    const count = validApps.length;
    const averages = Object.keys(totals).map(k => ({ name: k, avg: (totals[k] / count).toFixed(2) }));

    if (fmt === 'csv') {
      let csv = "Criterion,Average Score\r\n";
      averages.forEach(a => { csv += `"${a.name}","${a.avg}"\r\n`; });
      triggerCSV(csv, 'STIP_Criteria_Averages_CY2026.csv');
    } else {
      let rows = '';
      averages.forEach(a => { rows += `<tr><td>${a.name}</td><td class="center font-bold">${a.avg}</td></tr>`; });
      const tableHtml = `<table><thead><tr><th>Performance Criterion</th><th>Average Company Score</th></tr></thead><tbody>${rows}</tbody></table>`;
      triggerPDF('Evaluated Criteria Averages', tableHtml, `<p>Based on ${count} evaluated appraisals.</p>`);
    }
    showToast('Report on Evaluated Criteria', fmt);
  };

  // 6. Audit Trail
  const generateAudit = (fmt) => {
    if (fmt === 'csv') {
      let csv = "Appraisal Ref,Employee,Action Date,Status,Action By\r\n";
      appraisals.forEach(a => {
        const name = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`;
        const date = new Date(a.updatedAt || a.createdAt).toLocaleString('en-GB');
        csv += `"${a.appraisalRef || a._id}","${name}","${date}","${a.workflow?.status || 'UNKNOWN'}","${a.workflow?.lastUpdatedBy || 'System'}"\r\n`;
      });
      triggerCSV(csv, 'STIP_Audit_Trail_CY2026.csv');
    } else {
      let rows = '';
      appraisals.forEach(a => {
        const name = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`;
        const date = new Date(a.updatedAt || a.createdAt).toLocaleString('en-GB');
        rows += `<tr><td>${a.appraisalRef || a._id}</td><td>${name}</td><td>${date}</td><td>${a.workflow?.status || 'UNKNOWN'}</td></tr>`;
      });
      const tableHtml = `<table><thead><tr><th>Appraisal Ref</th><th>Employee</th><th>Action Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
      triggerPDF('System Audit Trail', tableHtml);
    }
    showToast('Audit Trail Report', fmt);
  };

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse font-[600]">Loading Reports Engine...</div>;

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
          &#128202; Reports
        </div>
        <div className="text-[13px] text-[#6b7280]">
          Download and view STIP program reports &mdash; CEO, HR Manager, and Admin access only
        </div>
      </div>
      
      <div className="bg-[#DBEAFE] border border-[#BFDBFE] text-[#1E40AF] rounded-[9px] p-[10px_14px] text-[12px] font-[500] flex items-center gap-[9px] mb-[20px] shadow-sm">
        <span className="text-[16px] leading-none">&#8505;</span> 
        <span>Click <strong>&#128196;&nbsp;PDF</strong> for a formatted printable report or <strong>&#128200;&nbsp;CSV</strong> for Excel/payroll import. Board Summary and Full Award require scorecard to be locked first.</span>
      </div>

      {/* Grid containing all 6 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px] mb-[20px]">
        
        {/* Card 1: Board Summary */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm flex flex-col">
          <div className="p-[16px_18px] border-b border-[#E2DDD4] flex-1">
            <div className="text-[24px] mb-[7px]">&#128203;</div>
            <div className="text-[14px] font-[700] text-[#0D2B55] mb-[5px]">Board Summary Report</div>
            <div className="text-[12px] text-[#6b7280] leading-[1.5] mb-[12px]">Final CP%, BSC breakdown, KPA contributions, max award values, total staff, EP count vs cap &mdash; for Board of Directors.</div>
            <span className="text-[10px] font-[700] bg-[#FEF3C7] text-[#92400E] p-[3px_9px] rounded-full border border-[#FDE68A]">
              &#128274; After scorecard lock
            </span>
          </div>
          <div className="p-[12px_18px] bg-[#FAF8F4] flex gap-[10px]">
            <button onClick={() => generateBoardSummary('pdf')} className="flex-1 justify-center text-[12px] font-[700] bg-[#0D2B55] hover:bg-[#1a3d6e] text-white rounded-[8px] p-[9px] transition-colors shadow-sm">
              &#128196; Download PDF
            </button>
            <button onClick={() => generateBoardSummary('csv')} className="flex-1 justify-center text-[12px] font-[700] bg-white hover:bg-slate-50 text-[#0D2B55] border-[1.5px] border-[#E2DDD4] hover:border-[#0D2B55] rounded-[8px] p-[9px] transition-colors shadow-sm">
              &#128200; Download CSV
            </button>
          </div>
        </div>

        {/* Card 2: Appraisal Completion */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm flex flex-col">
          <div className="p-[16px_18px] border-b border-[#E2DDD4] flex-1">
            <div className="text-[24px] mb-[7px]">&#9989;</div>
            <div className="text-[14px] font-[700] text-[#0D2B55] mb-[5px]">Appraisal Completion Report</div>
            <div className="text-[12px] text-[#6b7280] leading-[1.5] mb-[12px]">Per-employee appraisal status across all 4 quarters &mdash; submitted, approved, pending, not started.</div>
            <span className="text-[10px] font-[700] bg-[#D1FAE5] text-[#065F46] p-[3px_9px] rounded-full border border-[#A7F3D0]">
              &#10003; Available any time
            </span>
          </div>
          <div className="p-[12px_18px] bg-[#FAF8F4] flex gap-[10px]">
            <button onClick={() => generateCompletion('pdf')} className="flex-1 justify-center text-[12px] font-[700] bg-[#0D2B55] hover:bg-[#1a3d6e] text-white rounded-[8px] p-[9px] transition-colors shadow-sm">
              &#128196; Download PDF
            </button>
            <button onClick={() => generateCompletion('csv')} className="flex-1 justify-center text-[12px] font-[700] bg-white hover:bg-slate-50 text-[#0D2B55] border-[1.5px] border-[#E2DDD4] hover:border-[#0D2B55] rounded-[8px] p-[9px] transition-colors shadow-sm">
              &#128200; Download CSV
            </button>
          </div>
        </div>

        {/* Card 3: Full Award */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm flex flex-col">
          <div className="p-[16px_18px] border-b border-[#E2DDD4] flex-1">
            <div className="text-[24px] mb-[7px]">&#128176;</div>
            <div className="text-[14px] font-[700] text-[#0D2B55] mb-[5px]">Full Award Report</div>
            <div className="text-[12px] text-[#6b7280] leading-[1.5] mb-[12px]">All approved employees &mdash; IPRF, pro-rata, CP%, base award%, final award%, STIP pay ($). Payroll-ready.</div>
            <span className="text-[10px] font-[700] bg-[#FEF3C7] text-[#92400E] p-[3px_9px] rounded-full border border-[#FDE68A]">
              &#128274; After scorecard lock
            </span>
          </div>
          <div className="p-[12px_18px] bg-[#FAF8F4] flex gap-[10px]">
            <button onClick={() => generateAwards('pdf')} className="flex-1 justify-center text-[12px] font-[700] bg-[#0D2B55] hover:bg-[#1a3d6e] text-white rounded-[8px] p-[9px] transition-colors shadow-sm">
              &#128196; Download PDF
            </button>
            <button onClick={() => generateAwards('csv')} className="flex-1 justify-center text-[12px] font-[700] bg-white hover:bg-slate-50 text-[#0D2B55] border-[1.5px] border-[#E2DDD4] hover:border-[#0D2B55] rounded-[8px] p-[9px] transition-colors shadow-sm">
              &#128200; Download CSV
            </button>
          </div>
        </div>

        {/* Card 4: Report by Office */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm flex flex-col">
          <div className="p-[16px_18px] border-b border-[#E2DDD4] flex-1">
            <div className="text-[24px] mb-[7px]">🏢</div>
            <div className="text-[14px] font-[700] text-[#0D2B55] mb-[5px]">Report by Office</div>
            <div className="text-[12px] text-[#6b7280] leading-[1.5] mb-[12px]">FSM, CDU, NAR, GUM &mdash; headcount, completion rate, average IPRF, EP count, estimated total payout per company.</div>
            <span className="text-[10px] font-[700] bg-[#D1FAE5] text-[#065F46] p-[3px_9px] rounded-full border border-[#A7F3D0]">
              &#10003; Available any time
            </span>
          </div>
          <div className="p-[12px_18px] bg-[#FAF8F4] flex gap-[10px]">
            <button onClick={() => generateOffice('pdf')} className="flex-1 justify-center text-[12px] font-[700] bg-[#0D2B55] hover:bg-[#1a3d6e] text-white rounded-[8px] p-[9px] transition-colors shadow-sm">
              📄 Download PDF
            </button>
            <button onClick={() => generateOffice('csv')} className="flex-1 justify-center text-[12px] font-[700] bg-white hover:bg-slate-50 text-[#0D2B55] border-[1.5px] border-[#E2DDD4] hover:border-[#0D2B55] rounded-[8px] p-[9px] transition-colors shadow-sm">
              📈 Download CSV
            </button>
          </div>
        </div>

        {/* Card 5: Evaluated Criteria */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm flex flex-col">
          <div className="p-[16px_18px] border-b border-[#E2DDD4] flex-1">
            <div className="text-[24px] mb-[7px]">⭐</div>
            <div className="text-[14px] font-[700] text-[#0D2B55] mb-[5px]">Report on Evaluated Criteria</div>
            <div className="text-[12px] text-[#6b7280] leading-[1.5] mb-[12px]">Average score per criterion &mdash; identifies where NI/LS ratings concentrate across departments and managers.</div>
            <span className="text-[10px] font-[700] bg-[#D1FAE5] text-[#065F46] p-[3px_9px] rounded-full border border-[#A7F3D0]">
              &#10003; Available any time
            </span>
          </div>
          <div className="p-[12px_18px] bg-[#FAF8F4] flex gap-[10px]">
            <button onClick={() => generateCriteria('pdf')} className="flex-1 justify-center text-[12px] font-[700] bg-[#0D2B55] hover:bg-[#1a3d6e] text-white rounded-[8px] p-[9px] transition-colors shadow-sm">
              📄 Download PDF
            </button>
            <button onClick={() => generateCriteria('csv')} className="flex-1 justify-center text-[12px] font-[700] bg-white hover:bg-slate-50 text-[#0D2B55] border-[1.5px] border-[#E2DDD4] hover:border-[#0D2B55] rounded-[8px] p-[9px] transition-colors shadow-sm">
              📈 Download CSV
            </button>
          </div>
        </div>

        {/* Card 6: Audit Trail */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm flex flex-col">
          <div className="p-[16px_18px] border-b border-[#E2DDD4] flex-1">
            <div className="text-[24px] mb-[7px]">📋</div>
            <div className="text-[14px] font-[700] text-[#0D2B55] mb-[5px]">Audit Trail Report</div>
            <div className="text-[12px] text-[#6b7280] leading-[1.5] mb-[12px]">Full system log &mdash; every submit, approve, reject, and lock action with timestamps and user IDs. Tamper-proof.</div>
            <span className="text-[10px] font-[700] bg-[#F3E8FF] text-[#7E22CE] p-[3px_9px] rounded-full border border-[#E9D5FF]">
              CEO & Admin only
            </span>
          </div>
          <div className="p-[12px_18px] bg-[#FAF8F4] flex gap-[10px]">
            <button onClick={() => generateAudit('pdf')} className="flex-1 justify-center text-[12px] font-[700] bg-[#0D2B55] hover:bg-[#1a3d6e] text-white rounded-[8px] p-[9px] transition-colors shadow-sm">
              📄 Download PDF
            </button>
            <button onClick={() => generateAudit('csv')} className="flex-1 justify-center text-[12px] font-[700] bg-white hover:bg-slate-50 text-[#0D2B55] border-[1.5px] border-[#E2DDD4] hover:border-[#0D2B55] rounded-[8px] p-[9px] transition-colors shadow-sm">
              📈 Download CSV
            </button>
          </div>
        </div>

      </div>

      {/* Live Preview */}
      <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm">
        <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center">
          <div className="flex items-center gap-[10px]">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[14px]">&#128202;</div>
            <div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">Live KPA Breakdown Preview</div>
              <div className="text-[11px] text-[#6b7280]">Board Summary format &mdash; what the PDF report contains</div>
            </div>
          </div>
          <span className={`text-[10px] font-[800] px-[10px] py-[3px] rounded-full border ${locked ? 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]' : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'}`}>
            {locked ? '🔒 Locked' : '🔓 Unlocked'}
          </span>
        </div>
        
        <div className="p-[20px]">
          <div className="bg-[#0D2B55] rounded-[14px] p-[20px_24px] text-white shadow-inner">
            <div className="text-[18px] font-[800] text-[#e8c96a] mb-[4px]">STIP Program &mdash; Board Summary</div>
            <div className="text-[11px] text-white/50 mb-[20px]">Financial Year CY2026 &middot; Generated: <span>{reportDate}</span></div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px] mb-[18px]">
              <div className="bg-white/10 rounded-[9px] p-[12px_14px]">
                <div className="text-[10px] font-[700] text-white/50 uppercase tracking-widest mb-[4px]">Final CP%</div>
                <div className="text-[18px] font-[800] text-[#e8c96a]">{cpPct !== null ? cpPct.toFixed(2) + '%' : 'Not entered'}</div>
              </div>
              <div className="bg-white/10 rounded-[9px] p-[12px_14px]">
                <div className="text-[10px] font-[700] text-white/50 uppercase tracking-widest mb-[4px]">BSC Raw Score</div>
                <div className="text-[18px] font-[800] text-white">{bscRaw !== null ? bscRaw.toFixed(2) : '—'}</div>
              </div>
              <div className="bg-white/10 rounded-[9px] p-[12px_14px]">
                <div className="text-[10px] font-[700] text-white/50 uppercase tracking-widest mb-[4px]">Total Staff</div>
                <div className="text-[18px] font-[800] text-white">{totalStaffCount}</div>
              </div>
              <div className="bg-white/10 rounded-[9px] p-[12px_14px]">
                <div className="text-[10px] font-[700] text-white/50 uppercase tracking-widest mb-[4px]">EP Rated Staff</div>
                <div className="text-[18px] font-[800] text-white">{ep} <span className="text-[12px] font-[500] text-white/50">/ 9 max</span></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
              <div className="bg-white/10 rounded-[9px] p-[12px_14px]">
                <div className="text-[10px] font-[700] text-white/50 uppercase tracking-widest mb-[4px]">Estimated Gross Payout</div>
                <div className="text-[22px] font-[800] text-[#10B981]">${estimatedPayout.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              </div>
              <div className="bg-white/10 rounded-[9px] p-[12px_14px] flex flex-col justify-center">
                <div className="flex justify-between text-[12px] mb-[6px] border-b border-white/10 pb-[4px]">
                  <span className="text-white/60">Locked By:</span>
                  <span className="font-[700] text-white">{locked ? lockedBy : '—'}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-white/60">Locked At:</span>
                  <span className="font-[700] text-white">{locked ? lockedAt : '—'}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-[24px] right-[24px] z-[9999] bg-[#D1FAE5] border border-[#A7F3D0] text-[#065F46] rounded-[9px] p-[12px_16px] text-[13px] font-[700] shadow-xl flex items-center gap-[10px] animate-in slide-in-from-bottom-5">
          <span className="text-[18px] leading-none">&#128229;</span> 
          <span><strong>{toast.name}</strong> downloaded as {toast.fmt.toUpperCase()}</span>
        </div>
      )}

    </div>
  );
}