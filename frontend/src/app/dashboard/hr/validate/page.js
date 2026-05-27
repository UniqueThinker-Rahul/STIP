'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { AlertCircle, Download, FileText, Check, Eye, X } from 'lucide-react';

export default function ValidateAwards() {
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState({show: false, icon: '', title: '', detail: ''});
  const [viewCalc, setViewCalc] = useState(null);
  
  // Real-time Metrics State replacing the static CP_PCT and SCORECARD_LOCKED
  const [metrics, setMetrics] = useState({ cpPct: null, locked: false });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch both appraisals and company metrics concurrently
        const [appraisalsRes, metricsRes] = await Promise.all([
          api.get('/appraisals').catch(() => ({ data: { data: [] } })),
          api.get('/company-metrics/2026').catch(() => ({ data: { data: null } }))
        ]);

        // Handle Appraisals
        const allData = appraisalsRes.data?.data || appraisalsRes.data || [];
        const approvedData = allData.filter(a => a.workflow?.status === 'APPROVED');
        setAppraisals(approvedData);

        // Handle Metrics
        if (metricsRes.data?.data) {
          setMetrics({
            cpPct: metricsRes.data.data.cpPct,
            locked: metricsRes.data.data.locked
          });
        }
        
      } catch (error) {
        console.error('Failed to fetch awards data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // REAL CSV GENERATION
  const downloadCSV = () => {
    if (appraisals.length === 0 || metrics.cpPct === null) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Employee ID,First Name,Last Name,Company,Job Title,IPRF Score,Pro-Rata,Base Award %,Final Award %,Gross STIP Payout ($),Status\r\n";

    appraisals.forEach(a => {
      const emp = a.employeeId?.personalDetails || {};
      const empIdStr = a.employeeId?.employeeId || 'Unknown';
      const coCode = a.employeeId?.companyCode || 'FSM';
      const jobTitle = a.employeeId?.employmentDetails?.jobTitle || 'Staff';
      
      const sal = a.employeeBaseSalary || 30000;
      const iprf = a.calculatedResults?.finalIprfScore || 0;
      const prMonths = a.employeeId?.employmentDetails?.prorateValue || 12;
      const proRataValue = prMonths / 12;
      
      const baseAw = metrics.cpPct * iprf;
      const finalAw = baseAw * proRataValue;
      const pay = sal * (finalAw / 100);

      const row = `"${empIdStr}","${emp.firstName || ''}","${emp.lastName || ''}","${coCode}","${jobTitle}","${iprf.toFixed(1)}","${proRataValue.toFixed(3)}","${baseAw.toFixed(2)}%","${finalAw.toFixed(2)}%","${pay.toFixed(2)}","Validated"`;
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `STIP_Validation_Report_CY2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccess({
      show: true, icon: '📊', title: 'CSV Downloaded', 
      detail: 'The STIP validation report has been saved to your computer as a .csv file.'
    });
  };

  // REAL PDF GENERATION (Using browser print window for clean output)
  const downloadPDF = () => {
    if (appraisals.length === 0 || metrics.cpPct === null) return;

    let htmlContent = `
      <html>
        <head>
          <title>STIP Payroll Validation Report CY2026</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
            h1 { color: #0D2B55; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f4f4f4; color: #0D2B55; }
            .right { text-align: right; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>STIP Payroll Validation Report — CY2026</h1>
          <p><strong>Company Performance (CP):</strong> ${metrics.cpPct.toFixed(2)}%</p>
          <p><strong>Total Approved Appraisals:</strong> ${appraisals.length}</p>
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Company</th>
                <th>IPRF</th>
                <th>Pro-Rata</th>
                <th>Final Award %</th>
                <th>Gross Payout ($)</th>
              </tr>
            </thead>
            <tbody>
    `;

    let grandTotal = 0;

    appraisals.forEach(a => {
      const emp = a.employeeId?.personalDetails || {};
      const empIdStr = a.employeeId?.employeeId || 'Unknown';
      const coCode = a.employeeId?.companyCode || 'FSM';
      
      const sal = a.employeeBaseSalary || 30000;
      const iprf = a.calculatedResults?.finalIprfScore || 0;
      const prMonths = a.employeeId?.employmentDetails?.prorateValue || 12;
      const proRataValue = prMonths / 12;
      
      const baseAw = metrics.cpPct * iprf;
      const finalAw = baseAw * proRataValue;
      const pay = sal * (finalAw / 100);
      
      grandTotal += pay;

      htmlContent += `
        <tr>
          <td>${empIdStr}</td>
          <td>${emp.firstName} ${emp.lastName}</td>
          <td>${coCode}</td>
          <td>${iprf.toFixed(1)}</td>
          <td>${proRataValue.toFixed(3)}</td>
          <td>${finalAw.toFixed(2)}%</td>
          <td class="right">$${pay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
          <h3 style="text-align: right; margin-top: 20px; color: #0D2B55;">Grand Total Payout: $${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Slight delay to allow CSS to load before opening print dialog
    setTimeout(() => {
      printWindow.print();
    }, 250);

    setSuccess({
      show: true, icon: '📄', title: 'PDF Report Generated', 
      detail: 'The PDF print window has been opened. You can save it as a PDF or print it directly.'
    });
  };

  const exportAwards = (fmt) => {
    if (fmt === 'csv') downloadCSV();
    if (fmt === 'pdf') downloadPDF();
  };

  const iprfStyle = (f) => {
    const score = parseFloat(f) || 1.0;
    return score >= 1.3 ? 'bg-blue-50 text-blue-700 border-blue-200' :
           score === 1.0 ? 'bg-green-50 text-green-700 border-green-200' :
           score === 0.7 ? 'bg-amber-50 text-amber-700 border-amber-200' :
           'bg-red-50 text-red-700 border-red-200';
  };

  const total = appraisals.reduce((s, a) => {
    if (metrics.cpPct === null) return s;
    const sal = a.employeeBaseSalary || 30000;
    const iprf = a.calculatedResults?.finalIprfScore || 0;
    const prMonths = a.employeeId?.employmentDetails?.prorateValue || 12;
    const proRataValue = prMonths / 12;
    
    const finalAw = (metrics.cpPct * iprf) * proRataValue;
    return s + (sal * (finalAw / 100));
  }, 0);

  return (
    <div className="space-y-6 max-w-full font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">🏆 Validate Awards</h1>
          <p className="text-sm text-slate-500 mt-1">Validate STIP award calculations and export for payroll</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            onClick={() => exportAwards('pdf')} 
            disabled={!metrics.locked || metrics.cpPct === null || appraisals.length === 0}
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
          <button 
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            onClick={() => exportAwards('csv')} 
            disabled={!metrics.locked || metrics.cpPct === null || appraisals.length === 0}
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>
      
      {(!metrics.locked || metrics.cpPct === null) ? (
        <div className="flex gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 shadow-sm text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <strong>Scorecard not yet locked by CEO.</strong> Award calculations require the CP% to be locked. Awaiting CEO to enter KPA scores and lock the scorecard.
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-800">
            <div>
              <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider mb-1">Final CP%</div>
              <div className="text-2xl font-bold text-amber-300">{metrics.cpPct.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Staff</div>
              <div className="text-2xl font-bold text-white">190</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Approved Appraisals</div>
              <div className="text-2xl font-bold text-white">{appraisals.length}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Gross Payout</div>
              <div className="text-2xl font-bold text-white">${total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs p-3 rounded-lg flex items-center gap-2 shadow-sm font-medium">
            <span className="text-base leading-none">ℹ️</span> All amounts are <strong>gross</strong> — subject to FSM income tax. Tax deduction handled by payroll, not this system.
          </div>
          
          {/* Main Table Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-amber-50/50">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-xl">💰</div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Award Validation Table</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">All CEO-approved appraisals with full STIP calculations</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold text-slate-600">Employee</th>
                    <th className="px-6 py-4 font-bold text-amber-600">Job Title</th>
                    <th className="px-6 py-4 font-bold text-center text-slate-600">IPRF</th>
                    <th className="px-6 py-4 font-bold text-center text-slate-600">Pro-Rata</th>
                    <th className="px-6 py-4 font-bold text-center text-slate-600">CP%</th>
                    <th className="px-6 py-4 font-bold text-center text-slate-600">Base Award%</th>
                    <th className="px-6 py-4 font-bold text-center text-slate-600">Final Award%</th>
                    <th className="px-6 py-4 font-bold text-center text-slate-600">STIP Pay ($)</th>
                    <th className="px-6 py-4 font-bold text-center text-slate-600">Status</th>
                    <th className="px-6 py-4 font-bold text-center text-slate-600">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="text-center py-12 text-slate-500 text-sm font-medium animate-pulse">
                        Loading live awards data...
                      </td>
                    </tr>
                  ) : !appraisals.length ? (
                    <tr>
                      <td colSpan="10" className="text-center py-16 text-slate-500 text-sm">
                        <div className="text-4xl mb-3">💰</div>
                        <h3 className="text-base font-bold text-slate-900 mb-1">Queue is empty</h3>
                        <p className="text-sm text-slate-500">No CEO-approved appraisals yet.</p>
                      </td>
                    </tr>
                  ) : appraisals.map((a, i) => {
                    const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`.trim() || 'Unknown';
                    const init1 = a.employeeId?.personalDetails?.firstName?.[0] || '';
                    const init2 = a.employeeId?.personalDetails?.lastName?.[0] || '';
                    const jobTitle = a.employeeId?.employmentDetails?.jobTitle || 'Staff';
                    
                    const sal = a.employeeBaseSalary || 30000;
                    const iprf = a.calculatedResults?.finalIprfScore || 0;
                    const prMonths = a.employeeId?.employmentDetails?.prorateValue || 12;
                    const proRataValue = prMonths / 12;
                    
                    const baseAw = metrics.cpPct * iprf;
                    const finalAw = baseAw * proRataValue;
                    const pay = sal * (finalAw / 100);
                    
                    return (
                      <tr key={a._id} className={`hover:bg-slate-50 transition-colors ${i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                              {init1}{init2}
                            </div>
                            <div className="font-bold text-slate-900 text-sm">{empName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-[11px] font-medium text-slate-700">{jobTitle}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <span className={`px-2.5 py-1 rounded text-xs font-bold border ${iprfStyle(iprf)}`}>
                            {iprf.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center text-sm font-bold text-slate-700">
                          {proRataValue.toFixed(3)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center text-xs font-bold text-slate-500">
                          {metrics.cpPct.toFixed(2)}%
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center text-sm font-black text-amber-600">
                          {baseAw.toFixed(2)}%
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center text-sm font-black text-green-600">
                          {finalAw.toFixed(2)}%
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center text-sm font-black text-slate-900">
                          ${pay.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <span className="px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200 shadow-sm flex items-center justify-center gap-1 w-max mx-auto">
                            <Check className="w-3 h-3" /> Validated
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <button 
                            onClick={() => setViewCalc(a)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors mx-auto block"
                            title="View Calculation"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {appraisals.length > 0 && (
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-right text-xs font-medium text-slate-500">
                {appraisals.length} approved appraisals
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Modal */}
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
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Calculation Details Modal */}
      {viewCalc && metrics.cpPct !== null && (() => {
        const empName = `${viewCalc.employeeId?.personalDetails?.firstName || ''} ${viewCalc.employeeId?.personalDetails?.lastName || ''}`.trim() || 'Unknown';
        const jobTitle = viewCalc.employeeId?.employmentDetails?.jobTitle || 'Staff';
        const sal = viewCalc.employeeBaseSalary || 30000;
        const iprf = viewCalc.calculatedResults?.finalIprfScore || 0;
        const prMonths = viewCalc.employeeId?.employmentDetails?.prorateValue || 12;
        const proRataValue = prMonths / 12;
        
        const baseAw = metrics.cpPct * iprf;
        const finalAw = baseAw * proRataValue;
        const pay = sal * (finalAw / 100);

        return (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Award Calculation</h2>
                <button onClick={() => setViewCalc(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-900">{empName}</div>
                  <div className="text-slate-500">{jobTitle}</div>
                </div>

                <div className="space-y-3 px-1">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Base Salary</span>
                    <span className="font-semibold text-slate-900">${sal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Company Performance (CP%)</span>
                    <span className="font-semibold text-slate-900">{metrics.cpPct.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Individual Score (IPRF)</span>
                    <span className="font-semibold text-slate-900">{iprf.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Pro-Rata ({prMonths} / 12 months)</span>
                    <span className="font-semibold text-slate-900">{proRataValue.toFixed(3)}</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-blue-900">
                    <span><strong>Step 1:</strong> Base Award (CP% × IPRF)</span>
                    <span className="font-bold">{baseAw.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-blue-900">
                    <span><strong>Step 2:</strong> Final Award (Base × Pro-Rata)</span>
                    <span className="font-bold">{finalAw.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-blue-200 text-base">
                    <span className="font-bold text-slate-900">Gross STIP Payout</span>
                    <span className="font-black text-green-600">${pay.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>

              <button 
                className="w-full mt-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-lg transition-colors" 
                onClick={() => setViewCalc(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}