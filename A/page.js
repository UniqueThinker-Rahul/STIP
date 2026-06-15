'use client';

import { useState, useEffect } from 'react';
import { Download, Check, FileX, Calendar, Eye, X } from 'lucide-react';
import api from '../../../../lib/api';

const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Map backend API score keys to readable labels
const SCORE_LABELS = {
  jobCompetence: "Job Competence",
  dependability: "Dependability",
  deliveredResults: "Delivered Results",
  adaptability: "Adaptability/Flexibility",
  safeWorking: "Safe Working Environment",
  behaviors: "Behaviors & Initiative"
};

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [team, setTeam] = useState([]);
  const [quarters, setQuarters] = useState([]);
  const [selectedQuarterId, setSelectedQuarterId] = useState('');
  const [reportType, setReportType] = useState('ALL'); 

  const [selectedAppraisal, setSelectedAppraisal] = useState(null);

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
        
        const submitted = myAppraisals.filter(a => a.workflow?.status && a.workflow?.status !== 'DRAFT');
        submitted.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        
        setSubmissions(submitted);
        setTeam(myTeam);
        setQuarters(activeQuarters);
        
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

  const handleDownloadTeamReport = () => {
    if (!selectedQuarterId) return alert('Please select a quarter first.');
    
    const targetQuarter = quarters.find(q => q._id === selectedQuarterId);
    if (!targetQuarter) return;

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
      const missingStaff = team.filter(u => !submittedStaffIds.includes(u._id));
      
      if (reportType === 'ALL') {
        csvRows.push(''); 
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
    <div className="w-full max-w-full pb-[60px] relative">
      
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
            
            const fName = a.employeeId?.personalDetails?.firstName || 'Unknown';
            const lName = a.employeeId?.personalDetails?.lastName || '';
            const jobTitle = a.employeeId?.employmentDetails?.jobTitle || 'Staff';
            const quarter = a.appraisalQuarter?.name || a.period?.quarter || 'CY2026';
            
            const iprf = a.calculatedResults?.finalIprfScore || 0;
            const prorate = (a.employeeId?.employmentDetails?.prorateValue || 12) / 12;
            const awardPct = (cpPct * iprf * prorate).toFixed(2);

            return (
              <div key={a._id} className="bg-white border border-[#E2DDD4] rounded-[12px] p-[16px_20px] flex flex-col sm:flex-row sm:items-center justify-between gap-[14px] hover:border-[#0D2B55]/30 transition-colors shadow-sm">
                <div className="flex-1">
                  <div className="text-[14px] font-[700] text-[#0D2B55]">{fName} {lName}</div>
                  <div className="text-[11px] text-[#6b7280] mt-[3px]">
                    {jobTitle} &middot; {quarter} &middot; Submitted {new Date(a.updatedAt || a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(a.updatedAt || a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &middot; IPRF: {iprf.toFixed(1)} &mdash; Award: {awardPct}%
                  </div>
                  
                  {a.narrative?.generalComments && a.workflow?.status === 'REOPENED' && (
                    <div className="mt-[8px] bg-[#FEE2E2] p-[8px_12px] rounded-[6px] text-[11px] text-[#991B1B] border border-[#FECACA]">
                      <strong>HR Feedback:</strong> "{a.narrative.generalComments}"
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-[10px] flex-wrap shrink-0">
                  <span className={`text-[11px] font-[700] p-[4px_12px] rounded-full whitespace-nowrap ${statusConfig.badgeClass} hidden sm:block`}>
                    {statusConfig.text}
                  </span>
                  <div className="text-[11px] text-[#6b7280] bg-[#FAF8F4] border border-[#E2DDD4] px-[10px] py-[5px] rounded-full font-mono">
                    ID: {a.appraisalRef || a._id.toString().slice(-6).toUpperCase()}
                  </div>
                  
                  <button 
                    onClick={() => setSelectedAppraisal(a)} 
                    className="px-[12px] py-[5px] bg-white border border-[#E2DDD4] hover:border-[#0D2B55] hover:text-[#0D2B55] text-[#0f1923] text-[11px] font-[700] rounded-[6px] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🚨 UPGRADE: View Details Modal with Score Breakdown */}
      {selectedAppraisal && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 backdrop-blur-sm z-[200] flex items-center justify-center p-[20px] animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[700px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden slide-in-from-bottom-4">
            
            <div className="p-[20px_24px] border-b border-[#E2DDD4] flex justify-between items-center bg-[#FAF8F4] relative">
              <h2 className="text-[18px] font-[800] text-[#0D2B55]">&#128269; Submission Details</h2>
              <button onClick={() => setSelectedAppraisal(null)} className="absolute top-[16px] right-[16px] w-[30px] h-[30px] rounded-full bg-white border border-[#E2DDD4] flex items-center justify-center text-[#6b7280] hover:border-[#0D2B55] hover:text-[#0D2B55] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-[24px] overflow-y-auto custom-scrollbar">
              
              <div className="flex items-center gap-[16px] mb-[24px] pb-[20px] border-b border-[#E2DDD4]">
                <div className="w-[56px] h-[56px] rounded-full bg-gradient-to-br from-[#1a3d6e] to-[#2a527f] text-white flex items-center justify-center text-[20px] font-[800] shadow-sm">
                  {selectedAppraisal.employeeId?.personalDetails?.firstName?.[0] || ''}{selectedAppraisal.employeeId?.personalDetails?.lastName?.[0] || ''}
                </div>
                <div>
                  <h3 className="text-[20px] font-[800] text-[#0D2B55] leading-tight">
                    {selectedAppraisal.employeeId?.personalDetails?.firstName} {selectedAppraisal.employeeId?.personalDetails?.lastName}
                  </h3>
                  <div className="text-[13px] text-[#6b7280] mt-[2px] font-[500]">
                    {selectedAppraisal.employeeId?.employmentDetails?.jobTitle} &middot; Submitted {new Date(selectedAppraisal.updatedAt || selectedAppraisal.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px] mb-[24px]">
                <div className="bg-[#FAF8F4] p-[12px_16px] rounded-[10px] border border-[#E2DDD4]">
                  <div className="text-[10px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">Final IPRF</div>
                  <div className="text-[22px] font-[800] text-[#1E40AF]">{selectedAppraisal.calculatedResults?.finalIprfScore?.toFixed(1) || '0.0'}</div>
                </div>
                <div className="bg-[#FAF8F4] p-[12px_16px] rounded-[10px] border border-[#E2DDD4]">
                  <div className="text-[10px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">STIP Award</div>
                  <div className="text-[22px] font-[800] text-[#059669]">{selectedAppraisal.stipAward ? `${selectedAppraisal.stipAward.toFixed(2)}%` : '—'}</div>
                </div>
                <div className="bg-[#FAF8F4] p-[12px_16px] rounded-[10px] border border-[#E2DDD4]">
                  <div className="text-[10px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">Period</div>
                  <div className="text-[18px] font-[800] text-[#0f1923] truncate">{selectedAppraisal.appraisalQuarter?.name || selectedAppraisal.period?.quarter || 'N/A'}</div>
                </div>
                <div className="bg-[#FAF8F4] p-[12px_16px] rounded-[10px] border border-[#E2DDD4]">
                  <div className="text-[10px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">Company</div>
                  <div className="text-[22px] font-[800] text-[#0f1923]">{selectedAppraisal.employeeId?.companyCode || 'FSM'}</div>
                </div>
              </div>

              {/* 🚨 UPGRADE: Expanded KPA Rating Details */}
              <div className="mb-[24px]">
                <h4 className="text-[12px] font-[800] text-[#0D2B55] uppercase tracking-wider mb-[12px] pb-[8px] border-b border-[#E2DDD4]">Submitted KPA Ratings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
                  {Object.entries(SCORE_LABELS).map(([key, label]) => {
                    const rating = selectedAppraisal.scores?.[key]?.rating;
                    return (
                      <div key={key} className="flex justify-between items-center bg-white border border-[#E2DDD4] p-[10px_14px] rounded-[8px] shadow-sm">
                        <span className="text-[13px] font-[600] text-[#475569]">{label}</span>
                        <span className={`text-[14px] font-[800] ${!rating ? 'text-slate-300' : rating >= 3 ? 'text-[#059669]' : rating >= 2 ? 'text-[#D97706]' : 'text-[#DC2626]'}`}>
                          {rating ? rating.toFixed(1) : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-[24px] pt-[16px] border-t border-[#E2DDD4] flex items-center justify-between">
                <div className={`text-[11px] font-[700] p-[4px_12px] rounded-full whitespace-nowrap ${getStatusConfig(selectedAppraisal.workflow?.status).badgeClass}`}>
                  {getStatusConfig(selectedAppraisal.workflow?.status).text}
                </div>
                <div className="text-[11px] text-[#6b7280] font-mono font-[600]">REF: {selectedAppraisal.appraisalRef || selectedAppraisal._id}</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}