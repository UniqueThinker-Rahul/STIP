'use client';

import { useState, useEffect, useRef } from 'react';
import api from '../../../../lib/api';
import { Search, ChevronDown, ChevronLeft, ChevronRight, MessageSquare, Calendar, Eye, X, Download } from 'lucide-react';
import usePersistentFilter from '../../../../hooks/usePersistentFilter';

// Map backend API score keys to readable labels (Added for parsing comments)
const SCORE_LABELS = {
  jobCompetence: "Job Competence",
  dependability: "Dependability",
  deliveredResults: "Delivered Results",
  adaptability: "Adaptability/Flexibility",
  safeWorking: "Safe Working Environment",
  behaviors: "Behaviors & Initiative"
};

// --- CUSTOM SEARCHABLE DROPDOWN COMPONENT ---
const SearchableDropdown = ({ value, onChange, options, placeholder, widthClass }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(query.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={wrapperRef} className={`relative ${widthClass}`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full py-[10px] px-[12px] bg-white border rounded-[8px] text-[13px] text-[#0f1923] outline-none cursor-pointer flex justify-between items-center transition-colors ${isOpen ? 'border-[#0D2B55] ring-2 ring-[#0D2B55]/10' : 'border-[#E2DDD4]'}`}
      >
        <span className="truncate pr-2">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-[14px] h-[14px] text-[#6b7280] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 w-full bg-white border border-[#E2DDD4] rounded-[8px] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-[8px] border-b border-[#E2DDD4] bg-[#FAF8F4]">
            <div className="relative">
              <Search className="absolute left-[8px] top-1/2 -translate-y-1/2 w-[12px] h-[12px] text-[#6b7280]" />
              <input 
                type="text"
                autoFocus
                placeholder="Search..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-[26px] pr-[8px] py-[6px] text-[12px] border border-[#E2DDD4] rounded-[6px] outline-none focus:border-[#0D2B55]"
              />
            </div>
          </div>
          
          <div className="max-h-[170px] overflow-y-auto custom-scrollbar">
            <div 
              onClick={() => { onChange(''); setIsOpen(false); setQuery(''); }}
              className={`px-[12px] py-[10px] text-[12px] cursor-pointer transition-colors ${value === '' ? 'bg-[#EFF6FF] text-[#1E40AF] font-[700]' : 'text-[#6b7280] hover:bg-[#FAF8F4]'}`}
            >
              {placeholder}
            </div>
            
            {filteredOptions.length === 0 ? (
              <div className="px-[12px] py-[10px] text-[12px] text-[#6b7280] text-center italic">No matches found</div>
            ) : (
              filteredOptions.map((opt) => (
                <div 
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); setQuery(''); }}
                  className={`px-[12px] py-[10px] text-[12px] cursor-pointer transition-colors truncate ${value === opt.value ? 'bg-[#EFF6FF] text-[#1E40AF] font-[700]' : 'text-[#0f1923] hover:bg-[#FAF8F4]'}`}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
// ----------------------------------------------

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [team, setTeam] = useState([]);
  const [quarters, setQuarters] = useState([]);
  const [selectedQuarterId, setSelectedQuarterId] = usePersistentFilter('mysub_qtr_id', '');
  const [reportType, setReportType] = usePersistentFilter('mysub_report_type', 'ALL'); 

  const [selectedAppraisal, setSelectedAppraisal] = useState(null);
  const [expandedComment, setExpandedComment] = useState(null);

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
        
        // 🚨 UPGRADE: Stop filtering out DRAFTs so the system knows an appraisal is actually in progress!
        const myAppraisals = appRes.data?.data || [];
        myAppraisals.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        
        const myTeam = teamRes.data?.data || [];
        const activeQuarters = quarterRes.data?.data || [];
        
        setSubmissions(myAppraisals);
        setTeam(myTeam);
        setQuarters(activeQuarters);
        
        const now = new Date();
        const activeQ = activeQuarters.find(q => {
          const start = new Date(q.startDate); start.setHours(0,0,0,0);
          const end = new Date(q.endDate); end.setHours(23,59,59,999);
          return now >= start && now <= end;
        });
        
        setSelectedQuarterId((prev) => {
          if (!prev || !activeQuarters.some(q => q._id === prev)) {
            return activeQ ? activeQ._id : (activeQuarters.length > 0 ? activeQuarters[0]._id : '');
          }
          return prev;
        });

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
      case 'DRAFT': return { text: 'Saved in Draft', badgeClass: 'bg-[#FAF8F4] text-[#6b7280] border border-[#E2DDD4]' };
      case 'SUBMITTED': return { text: 'Submitted to HR', badgeClass: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]' };
      case 'UNDER_HR_REVIEW': return { text: 'Under HR Review', badgeClass: 'bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]' };
      case 'APPROVED_BY_HR': return { text: 'HR Approved', badgeClass: 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]' };
      case 'WITH_CEO': return { text: 'With CEO', badgeClass: 'bg-[#EDE9FE] text-[#4C1D95] border border-[#DDD6FE]' };
      case 'APPROVED': return { text: 'Fully Approved', badgeClass: 'bg-[#059669] text-white border border-[#065F46]' };
      case 'ACKNOWLEDGED': return { text: 'Emp. Acknowledged', badgeClass: 'bg-[#065F46] text-white border border-[#065F46]' };
      case 'NOT_APPROVED': return { text: 'CEO Rejected', badgeClass: 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]' };
      case 'REOPENED': return { text: 'HR Rejected', badgeClass: 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]' };
      case 'PENDING_SUBMISSION': return { text: 'Appraisal Not Yet Started', badgeClass: 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]' };
      default: return { text: status?.replace(/_/g, ' ') || 'Unknown', badgeClass: 'bg-[#E2DDD4] text-[#6b7280]' };
    }
  };

  const getDisplayedItems = () => {
    if (!selectedQuarterId) return [];

    const quarterAppraisals = submissions.filter(app => {
      const qId = app.appraisalQuarter?._id || app.appraisalQuarter || app.quarter?._id || app.quarterId;
      return qId === selectedQuarterId;
    });

    // Extract exactly as strings to ensure perfect filtering
    const appraisedStaffIds = quarterAppraisals.map(app => (app.employeeId?._id || app.employeeId).toString());
    let items = [];

    if (reportType === 'SUBMITTED') {
      items = quarterAppraisals.filter(a => a.workflow?.status !== 'DRAFT');
    } else if (reportType === 'ALL') {
      items = [...quarterAppraisals];
    } else if (reportType === 'MISSING') {
      items = quarterAppraisals.filter(a => a.workflow?.status === 'DRAFT');
    }

    if (reportType === 'MISSING' || reportType === 'ALL') {
      const missingStaff = team.filter(u => !appraisedStaffIds.includes(u._id.toString()));
      const missingItems = missingStaff.map(u => ({
        _id: `missing-${u._id}`,
        isMissing: true,
        employeeId: u,
        appraisalQuarter: quarters.find(q => q._id === selectedQuarterId),
        workflow: { status: 'PENDING_SUBMISSION' },
        calculatedResults: { finalIprfScore: 0 }
      }));
      items = [...items, ...missingItems];
    }

    items.sort((a, b) => {
      if (a.isMissing && !b.isMissing) return -1;
      if (!a.isMissing && b.isMissing) return 1;
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    });

    return items;
  };

  const displayedItems = getDisplayedItems();

  const handleDownloadTeamReport = () => {
    if (!selectedQuarterId) return alert('Please select a quarter first.');
    const targetQuarter = quarters.find(q => q._id === selectedQuarterId);
    if (!targetQuarter) return;

    let csvRows = [];
    const headers = ['Employee ID', 'Employee Name', 'Job Title', 'Company Code', 'Appraisal Reference', 'Final IPRF Score', 'Calculated Award %', 'Status', 'Last Action Date'];
    csvRows.push(headers.join(','));

    displayedItems.forEach(record => {
      const isMissing = record.isMissing;
      const u = record.employeeId;
      const empName = `${u?.personalDetails?.firstName || ''} ${u?.personalDetails?.lastName || ''}`.trim();
      const jobTitle = u?.employmentDetails?.jobTitle || 'Staff';
      const compCode = u?.companyCode || 'FSM';
      const empId = u?.employeeId || 'N/A';
      
      const iprf = record.calculatedResults?.finalIprfScore || 0;
      const prorate = (u?.employmentDetails?.prorateValue || 12) / 12;
      const awardPct = isMissing ? '—' : (cpPct * iprf * prorate).toFixed(2) + '%';
      
      const statusText = getStatusConfig(record.workflow?.status).text;
      const date = (record.updatedAt || record.createdAt) ? new Date(record.updatedAt || record.createdAt).toLocaleDateString('en-GB') : 'N/A';

      csvRows.push([
        empId,
        `"${empName}"`,
        `"${jobTitle}"`,
        compCode,
        record.appraisalRef || 'N/A',
        isMissing ? '—' : iprf.toFixed(2),
        awardPct,
        `"${statusText}"`,
        date
      ].join(','));
    });

    const filename = `My_Team_${reportType}_Report_${targetQuarter.name}.csv`;

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.replace(/\s+/g, '_'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseComments = (combinedString) => {
    if (!combinedString) return {};
    const comments = {};
    
    const labels = [
      { key: 'jobCompetence', matches: ['Job Competence:'] },
      { key: 'behaviors', matches: ['Behaviors & Initiative:', 'Demonstrated Initiative:'] },
      { key: 'dependability', matches: ['Dependability:'] },
      { key: 'adaptability', matches: ['Adaptability:'] },
      { key: 'safeWorking', matches: ['Safe Working:', 'Demonstrated Safe Working:'] },
      { key: 'deliveredResults', matches: ['Delivered Expected Results:', 'Delivered Results:'] }
    ];

    let foundLabels = [];
    labels.forEach(labelDef => {
      let bestIdx = -1;
      let bestMatch = '';
      for (const matchStr of labelDef.matches) {
        const idx = combinedString.indexOf(matchStr);
        if (idx !== -1) {
          bestIdx = idx;
          bestMatch = matchStr;
          break;
        }
      }
      if (bestIdx !== -1) {
        foundLabels.push({ key: labelDef.key, index: bestIdx, match: bestMatch });
      }
    });

    foundLabels.sort((a, b) => a.index - b.index);

    foundLabels.forEach((label, i) => {
      const start = label.index + label.match.length;
      if (i + 1 < foundLabels.length) {
        const nextLabelIdx = foundLabels[i + 1].index;
        let content = combinedString.substring(start, nextLabelIdx);
        content = content.replace(/\s*\d+\.\s*$/, ''); // Backtrack and remove proceeding list numbers
        comments[label.key] = content.trim();
      } else {
        comments[label.key] = combinedString.substring(start).trim();
      }
    });

    return comments;
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading submissions...</div>;

  return (
    <div className="w-full max-w-full pb-[60px] relative">
      
     <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DDD4] pb-4">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">
            &#128228; My {quarters.find(q => String(q._id) === String(selectedQuarterId))?.name ? `${quarters.find(q => String(q._id) === String(selectedQuarterId)).name} ` : ''}Submissions
          </div>
          <div className="text-[13px] text-[#6b7280]">Appraisals sent to HR for review and approval</div>
        </div>

        {team.length > 0 && quarters.length > 0 && (
          <div className="bg-white p-3 rounded-lg border border-[#E2DDD4] flex flex-col sm:flex-row items-center gap-2 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#0D2B55]">
              <Calendar className="w-4 h-4 text-[#C9A84C]" />
              Filter & Export:
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
      
      {displayedItems.length === 0 ? (
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[40px] text-center">
          <div className="text-[40px] mb-[10px]">&#128194;</div>
          <div className="text-[15px] font-[700] text-[#0D2B55] mb-[5px]">No Results Found</div>
          <div className="text-[13px] text-[#6b7280]">No data matches the selected filters for this quarter.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {displayedItems.map((a) => {
            const statusConfig = getStatusConfig(a.workflow?.status);
            
            const fName = a.employeeId?.personalDetails?.firstName || 'Unknown';
            const lName = a.employeeId?.personalDetails?.lastName || '';
            const jobTitle = a.employeeId?.employmentDetails?.jobTitle || 'Staff';
            const quarter = a.appraisalQuarter?.name || a.period?.quarter || quarters.find(q => q._id === selectedQuarterId)?.name || 'CY2026';
            
            const iprf = a.calculatedResults?.finalIprfScore || 0;
            const prorate = (a.employeeId?.employmentDetails?.prorateValue || 12) / 12;
            const awardPct = a.isMissing ? '—' : (cpPct * iprf * prorate).toFixed(2);

            return (
              <div key={a._id} className="bg-white border border-[#E2DDD4] rounded-[12px] p-[16px_20px] flex flex-col sm:flex-row sm:items-center justify-between gap-[14px] hover:border-[#0D2B55]/30 transition-colors shadow-sm">
                <div className="flex-1">
                  <div className="text-[14px] font-[700] text-[#0D2B55]">{fName} {lName}</div>
                  <div className="text-[11px] text-[#6b7280] mt-[3px]">
                    {jobTitle} &middot; {quarter} {a.isMissing ? '' : `· ${a.workflow?.status === 'DRAFT' ? 'Saved' : 'Submitted'} ${new Date(a.updatedAt || a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date(a.updatedAt || a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} &middot; IPRF: {a.isMissing ? '—' : iprf.toFixed(1)} &mdash; Award: {a.isMissing ? '—' : awardPct + (awardPct !== '—' ? '%' : '')}
                  </div>
                  
                  {!a.isMissing && a.narrative?.hrComments && a.workflow?.status === 'REOPENED' && (
                    <div className="mt-[8px] bg-[#FEE2E2] p-[8px_12px] rounded-[6px] text-[11px] text-[#991B1B] border border-[#FECACA]">
                      <strong>HR Feedback ({a.workflow?.rejectedAt ? new Date(a.workflow.rejectedAt).toLocaleDateString('en-GB') : 'Recently'}):</strong> "{a.narrative.hrComments}"
                    </div>
                  )}
                  
                  {!a.isMissing && a.narrative?.ceoComments && a.workflow?.status === 'NOT_APPROVED' && (
                    <div className="mt-[8px] bg-[#FEE2E2] p-[8px_12px] rounded-[6px] text-[11px] text-[#991B1B] border border-[#FECACA]">
                      <strong>CEO Feedback ({a.workflow?.rejectedAt ? new Date(a.workflow.rejectedAt).toLocaleDateString('en-GB') : 'Recently'}):</strong> "{a.narrative.ceoComments}"
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-[10px] flex-wrap shrink-0">
                  <span className={`text-[11px] font-[700] p-[4px_12px] rounded-full whitespace-nowrap ${statusConfig.badgeClass} hidden sm:block`}>
                    {statusConfig.text}
                  </span>
                  <div className="text-[11px] text-[#6b7280] bg-[#FAF8F4] border border-[#E2DDD4] px-[10px] py-[5px] rounded-full font-mono">
                    ID: {a.isMissing ? (a.employeeId?.employeeId || 'N/A') : (a.appraisalRef || a._id.toString().slice(-6).toUpperCase())}
                  </div>
                  
                  {!a.isMissing && (
                    <button 
                      onClick={() => {
                        setSelectedAppraisal(a);
                        setExpandedComment(null); 
                      }} 
                      className="px-[12px] py-[5px] bg-white border border-[#E2DDD4] hover:border-[#0D2B55] hover:text-[#0D2B55] text-[#0f1923] text-[11px] font-[700] rounded-[6px] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Details Modal with Score Breakdown */}
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
                    {selectedAppraisal.employeeId?.employmentDetails?.jobTitle} &middot; {selectedAppraisal.workflow?.status === 'DRAFT' ? 'Saved' : 'Submitted'} {new Date(selectedAppraisal.updatedAt || selectedAppraisal.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

              <div className="mb-[24px]">
                <h4 className="text-[12px] font-[800] text-[#0D2B55] uppercase tracking-wider mb-[12px] pb-[8px] border-b border-[#E2DDD4]">
                  {selectedAppraisal.workflow?.status === 'DRAFT' ? 'Drafted KPA Ratings & Comments' : 'Submitted KPA Ratings & Comments'}
                </h4>
                
                {(() => {
                  const parsedComments = parseComments(selectedAppraisal.narrative?.generalComments);
                  const hasParsedComments = Object.keys(parsedComments).length > 0;
                  
                  return (
                    <>
                      <div className="bg-white border border-[#E2DDD4] rounded-[10px] overflow-hidden mb-[24px]">
                        {Object.entries(SCORE_LABELS).map(([key, name]) => {
                          const rating = selectedAppraisal.scores?.[key]?.rating;
                          const color = rating === 0.0 ? 'text-[#991B1B]' : rating === 0.7 ? 'text-[#92400E]' : rating === 1.0 ? 'text-[#065F46]' : rating === 1.3 ? 'text-[#1E40AF]' : 'text-[#6b7280]';
                          const comment = parsedComments[key];
                          
                          return (
                            <div key={key} className="border-b border-[#E2DDD4] last:border-0">
                              <div className="flex justify-between items-center p-[10px_16px]">
                                <div className="font-[500] text-[#0f1923] text-[13px]">{name}</div>
                                <div className="text-right">
                                  <span className={`font-[800] ${color} text-[13px]`}>{rating !== undefined ? rating.toFixed(1) : '—'}</span>
                                </div>
                              </div>
                              {comment && (
                                <div className="p-[0_16px_12px_16px] text-[12px] text-[#6b7280] italic leading-[1.6]">
                                  <span className="font-[700] not-italic text-[#0D2B55] text-[10px] uppercase tracking-widest block mb-[2px]">Manager Justification:</span>
                                  "{comment}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {selectedAppraisal.narrative?.generalComments && !hasParsedComments && (
                        <div className="bg-[#F8FAFC] border border-[#E0E7FF] rounded-[10px] p-[16px] mb-[24px]">
                          <div className="text-[11px] font-[800] text-[#0369A1] uppercase tracking-[.06em] mb-[6px]">Manager Comments</div>
                          <div className="text-[13px] text-[#0f1923] leading-relaxed italic whitespace-pre-wrap">
                            "{selectedAppraisal.narrative.generalComments}"
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              
              {selectedAppraisal.narrative?.epJustification && (
                 <div className="mb-[24px]">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-[12px_16px] rounded-r-[8px]">
                       <div className="text-[11px] font-bold text-yellow-800 uppercase tracking-wider mb-1">EP Justification Provided</div>
                       <div className="text-[12px] text-yellow-900 italic">"{selectedAppraisal.narrative.epJustification}"</div>
                    </div>
                 </div>
              )}

              <div className="flex flex-col gap-[12px]">
                {selectedAppraisal.narrative?.hrComments && (
                  <div className="bg-[#FAF5FF] border border-[#E9D5FF] rounded-[10px] p-[16px]">
                    <div className="text-[11px] font-[800] text-[#6B21A8] uppercase tracking-[.06em] mb-[6px]">HR / Admin Notes</div>
                    <div className="text-[13px] text-[#0f1923] leading-relaxed italic whitespace-pre-wrap">
                      "{selectedAppraisal.narrative.hrComments}"
                    </div>
                  </div>
                )}
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