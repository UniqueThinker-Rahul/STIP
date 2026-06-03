'use client';

import { useState, useEffect } from 'react';
import { Download, Check, FileX, Calendar } from 'lucide-react';
import api from '../../../../lib/api';

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🚨 UPGRADED: Dynamic Report Generator States
  const [team, setTeam] = useState([]);
  const [quarters, setQuarters] = useState([]);
  const [selectedQuarterId, setSelectedQuarterId] = useState('');
  const [reportType, setReportType] = useState('ALL'); // 'ALL', 'SUBMITTED', 'MISSING'

  const cpPct = 13.01;

  useEffect(() => {
    const fetchSubmissionsAndContext = async () => {
      try {
        setLoading(true);
        const [appRes, teamRes, quarterRes] = await Promise.all([
          api.get('/appraisals').catch(() => ({ data: { data: [] } })),
          api.get('/users/my-team').catch(() => ({ data: { data: [] } })),
          api.get('/quarters').catch(() => ({ data: { data: [] } }))
        ]);
        
        const myAppraisals = appRes.data?.data || [];
        const myTeam = teamRes.data?.data || [];
        const activeQuarters = quarterRes.data?.data || [];
        
        // Filter out the DRAFTS using the correct nested workflow status.
        const submitted = myAppraisals.filter(a => a.workflow?.status && a.workflow?.status !== 'DRAFT');
        
        // Sort newest first
        submitted.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        
        setSubmissions(submitted);
        setTeam(myTeam);
        setQuarters(activeQuarters);
        
        // Find current active quarter to default the dropdown
        const now = new Date();
        const activeQ = activeQuarters.find(q => {
          const start = new Date(q.startDate); start.setHours(0,0,0,0);
          const end = new Date(q.endDate); end.setHours(23,59,59,999);
          return now >= start && now <= end;
        });
        
        if (activeQ) setSelectedQuarterId(activeQ._id);
        else if (activeQuarters.length > 0) setSelectedQuarterId(activeQuarters[0]._id);

      } catch (error) {
        console.error('Failed to load submissions context', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissionsAndContext();
  }, []);

  const getStatusConfig = (status) => {
    switch(status) {
      case 'SUBMITTED': return { text: 'Submitted to HR', badgeClass: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]' };
      case 'UNDER_HR_REVIEW': return { text: 'Under HR Review', badgeClass: 'bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]' };
      case 'APPROVED_BY_HR': return { text: 'HR Approved', badgeClass: 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]' };
      case 'WITH_CEO': return { text: 'With CEO', badgeClass: 'bg-[#EDE9FE] text-[#4C1D95] border border-[#DDD6FE]' };
      case 'APPROVED': return { text: 'Fully Approved', badgeClass: 'bg-[#059669] text-white border border-[#065F46]' };
      case 'NOT_APPROVED': return { text: 'CEO Rejected', badgeClass: 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]' };
      default: return { text: status?.replace(/_/g, ' ') || 'Unknown', badgeClass: 'bg-[#E2DDD4] text-[#6b7280]' };
    }
  };

  // 🚨 UPGRADED: Dynamic Line Manager Report Downloader
  const handleDownloadTeamReport = () => {
    if (!selectedQuarterId) return alert('Please select a quarter first.');
    
    const targetQuarter = quarters.find(q => q._id === selectedQuarterId);
    if (!targetQuarter) return;

    // Isolate appraisals that match the selected quarter
    const quarterAppraisals = submissions.filter(app => (app.appraisalQuarter?._id || app.appraisalQuarter) === selectedQuarterId);
    const submittedStaffIds = quarterAppraisals.map(app => app.employeeId?._id || app.employeeId);

    let csvRows = [];
    let filename = '';

    if (reportType === 'SUBMITTED' || reportType === 'ALL') {
      const headers = ['Employee Name', 'Job Title', 'Appraisal Reference', 'Final IPRF Score', 'Calculated Award %', 'Status', 'Submission Date'];
      if (reportType === 'ALL') csvRows.push('--- STAFF WHO HAVE SUBMITTED ---');
      csvRows.push(headers.join(','));

      quarterAppraisals.forEach(record => {
        const empName = `${record.employeeId?.personalDetails?.firstName || ''} ${record.employeeId?.personalDetails?.lastName || ''}`;
        const jobTitle = record.employeeId?.employmentDetails?.jobTitle || 'Staff';
        const iprf = record.calculatedResults?.finalIprfScore || 0;
        const prorate = (record.employeeId?.employmentDetails?.prorateValue || 12) / 12;
        const awardPct = (cpPct * iprf * prorate).toFixed(2);
        
        csvRows.push([
          `"${empName}"`,
          `"${jobTitle}"`,
          record.appraisalRef || 'N/A',
          iprf.toFixed(2),
          `${awardPct}%`,
          record.workflow?.status || 'UNKNOWN',
          record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'N/A'
        ].join(','));
      });
      filename = `My_Team_Submitted_Report_${targetQuarter.name}.csv`;
    }

    if (reportType === 'MISSING' || reportType === 'ALL') {
      // Find team members missing from the submitted list
      const missingStaff = team.filter(u => !submittedStaffIds.includes(u._id));
      
      if (reportType === 'ALL') {
        csvRows.push(''); // blank line
        csvRows.push('--- STAFF WITH PENDING SUBMISSIONS ---');
      }
      
      const missingHeaders = ['Employee ID', 'Employee Name', 'Job Title', 'Company Code', 'Action Required'];
      csvRows.push(missingHeaders.join(','));

      missingStaff.forEach(u => {
        const empName = `${u.personalDetails?.firstName || ''} ${u.personalDetails?.lastName || ''}`;
        csvRows.push([
           u.employeeId || 'N/A',
           `"${empName}"`,
           `"${u.employmentDetails?.jobTitle || 'N/A'}"`,
           u.companyCode || 'FSM',
           'Awaiting Manager Rating'
        ].join(','));
      });
      
      if (reportType === 'MISSING') filename = `My_Team_Pending_Report_${targetQuarter.name}.csv`;
      else filename = `My_Team_Complete_Status_Report_${targetQuarter.name}.csv`;
    }

    // Generate blob & download
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.replace(/\s+/g, '_'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading submissions...</div>;

  return (
    <div className="w-full max-w-full pb-[60px]">
      
      {/* 🚨 UPGRADED: Header layout with Export Tool */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DDD4] pb-4">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">&#128228; My Submissions</div>
          <div className="text-[13px] text-[#6b7280]">Appraisals sent to HR for review and approval</div>
        </div>

        {team.length > 0 && quarters.length > 0 && (
          <div className="bg-white p-3 rounded-lg border border-[#E2DDD4] flex flex-col sm:flex-row items-center gap-2 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#0D2B55]">
              <Calendar className="w-4 h-4 text-[#C9A84C]" />
              Download Team Report:
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select 
                value={selectedQuarterId}
                onChange={(e) => setSelectedQuarterId(e.target.value)}
                className="p-1.5 border border-gray-200 rounded text-xs font-medium outline-none bg-slate-50 min-w-[120px]"
              >
                {quarters.map(q => <option key={q._id} value={q._id}>{q.name}</option>)}
              </select>

              <select 
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="p-1.5 border border-gray-200 rounded text-xs font-medium outline-none bg-slate-50"
              >
                <option value="ALL">All Team Status</option>
                <option value="SUBMITTED">Submitted Only</option>
                <option value="MISSING">Pending Only</option>
              </select>

              <button 
                onClick={handleDownloadTeamReport}
                className="p-1.5 bg-[#0D2B55] hover:bg-[#1a3d6e] text-white rounded text-xs font-bold transition-colors flex items-center justify-center min-w-[32px]"
                title="Download CSV Report"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {submissions.length === 0 ? (
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[40px] text-center">
          <div className="text-[40px] mb-[10px]">&#128194;</div>
          <div className="text-[15px] font-[700] text-[#0D2B55] mb-[5px]">No Submissions Yet</div>
          <div className="text-[13px] text-[#6b7280]">You haven't submitted any appraisals to HR.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {submissions.map((a) => {
            const statusConfig = getStatusConfig(a.workflow?.status);
            
            // Extract complex schema mapping securely
            const fName = a.employeeId?.personalDetails?.firstName || 'Unknown';
            const lName = a.employeeId?.personalDetails?.lastName || '';
            const jobTitle = a.employeeId?.employmentDetails?.jobTitle || 'Staff';
            const quarter = a.appraisalQuarter?.name || a.period?.quarter || 'CY2026';
            
            // Calculate actuals
            const iprf = a.calculatedResults?.finalIprfScore || 0;
            const prorate = (a.employeeId?.employmentDetails?.prorateValue || 12) / 12;
            const awardPct = (cpPct * iprf * prorate).toFixed(2);

            return (
              <div key={a._id} className="bg-white border border-[#E2DDD4] rounded-[12px] p-[16px_20px] flex flex-col sm:flex-row sm:items-center justify-between gap-[14px] hover:border-[#0D2B55]/30 transition-colors shadow-sm">
                <div className="flex-1">
                  <div className="text-[14px] font-[700] text-[#0D2B55]">{fName} {lName}</div>
                  <div className="text-[11px] text-[#6b7280] mt-[3px]">
                    {/* 🚨 UPGRADED: Added exact local time to the submission timestamp string */}
                    {jobTitle} &middot; {quarter} &middot; Submitted {new Date(a.updatedAt || a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(a.updatedAt || a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &middot; IPRF: {iprf.toFixed(1)} &mdash; Award: {awardPct}%
                  </div>
                  
                  {a.narrative?.generalComments && a.workflow?.status === 'REOPENED' && (
                    <div className="mt-[8px] bg-[#FEE2E2] p-[8px_12px] rounded-[6px] text-[11px] text-[#991B1B] border border-[#FECACA]">
                      <strong>HR Feedback:</strong> "{a.narrative.generalComments}"
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-[10px] flex-wrap shrink-0">
                  <span className={`text-[11px] font-[700] p-[4px_12px] rounded-full whitespace-nowrap ${statusConfig.badgeClass}`}>
                    {statusConfig.text}
                  </span>
                  <div className="text-[11px] text-[#6b7280] bg-[#FAF8F4] border border-[#E2DDD4] px-[10px] py-[4px] rounded-full font-mono">
                    ID: {a.appraisalRef || a._id.toString().slice(-6).toUpperCase()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}