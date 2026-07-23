'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, X, MessageSquare, ChevronDown } from 'lucide-react';
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

export default function Drafts() {
  const router = useRouter();
  
  const currentYearNum = new Date().getFullYear();
  const currentYearStr = currentYearNum.toString();
  const yearOptions = [currentYearNum - 3, currentYearNum - 2, currentYearNum - 1, currentYearNum, currentYearNum + 1];

  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedQuarterName, setSelectedQuarterName] = useState('');
  const [isManualYear, setIsManualYear] = useState(false);
  const [dbQuarters, setDbQuarters] = useState([]);

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);
  const [expandedComment, setExpandedComment] = useState(null);

  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        setLoading(true);
        const [appsRes, qtrsRes] = await Promise.all([
          api.get('/appraisals').catch(() => ({ data: { data: [] } })),
          api.get('/quarters').catch(() => ({ data: { data: [] } }))
        ]);

        const fetchedQuarters = qtrsRes.data?.data || [];
        fetchedQuarters.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        setDbQuarters(fetchedQuarters);

        const allApps = appsRes.data?.data || [];
        
        // 🚨 UPGRADED: Smart Auto-Cleanup & Garbage Collection fixed to include YEAR
        const submittedApps = allApps.filter(a => a.workflow?.status !== 'DRAFT');
        
        const submittedSignatures = new Set(
          submittedApps.map(a => {
            const empId = a.employeeId?._id || a.employeeId || 'unknown';
            const rawQtr = a.appraisalQuarter?.name || a.period?.quarter || a.quarter?.name || 'unknown';
            const qMatch = String(rawQtr).match(/Q?([1-4])/i);
            const qtr = qMatch ? `Q${qMatch[1]}` : rawQtr;
            const yr = a.reviewYear || a.appraisalQuarter?.year || a.period?.year || 'unknown';
            return `${empId}-${qtr}-${yr}`;
          })
        );

        const rawDrafts = allApps.filter(a => a.workflow?.status === 'DRAFT');
        rawDrafts.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        const validDrafts = [];
        const seenDraftSignatures = new Set();

        for (const draft of rawDrafts) {
          const empId = draft.employeeId?._id || draft.employeeId || 'unknown';
          const rawQtr = draft.appraisalQuarter?.name || draft.period?.quarter || draft.quarter?.name || 'unknown';
          const qMatch = String(rawQtr).match(/Q?([1-4])/i);
          const qtr = qMatch ? `Q${qMatch[1]}` : rawQtr;
          const yr = draft.reviewYear || draft.appraisalQuarter?.year || draft.period?.year || 'unknown';
          
          const signature = `${empId}-${qtr}-${yr}`;

          if (submittedSignatures.has(signature)) {
            api.delete(`/appraisals/${draft._id}`).catch(e => console.error('Auto-cleanup failed', e));
          } 
          else if (seenDraftSignatures.has(signature)) {
            api.delete(`/appraisals/${draft._id}`).catch(e => console.error('Auto-cleanup duplicate failed', e));
          } 
          else {
            seenDraftSignatures.add(signature);
            validDrafts.push(draft);
          }
        }

        setDrafts(validDrafts);
      } catch (e) { 
        console.error('Error fetching drafts:', e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchDrafts();
  }, []);

  // 🚨 UPGRADED: Safely bind dropdown options to DB availability AND existing drafts
  useEffect(() => {
    const qtrsForSelectedYear = dbQuarters.filter(q => q.year.toString() === selectedYear.toString());
    const dbQs = qtrsForSelectedYear.map(q => {
      const m = String(q.name).match(/Q?([1-4])/i);
      return m ? `Q${m[1]}` : q.name;
    });

    const draftQs = drafts
      .filter(d => (d.reviewYear || d.appraisalQuarter?.year || d.period?.year)?.toString() === selectedYear.toString())
      .map(d => {
        const raw = d.appraisalQuarter?.name || d.period?.quarter || d.quarter?.name || '';
        const m = String(raw).match(/Q?([1-4])/i);
        return m ? `Q${m[1]}` : raw;
      });

    // Merge published DB quarters AND any quarters that actually have drafts
    const availableQs = [...new Set([...dbQs, ...draftQs])].sort();

    if (availableQs.length > 0) {
      if (!selectedQuarterName || !availableQs.includes(selectedQuarterName)) {
        // Find active quarter in DB
        const now = new Date();
        let active = qtrsForSelectedYear.find(q => {
          const start = new Date(q.startDate); start.setHours(0,0,0,0);
          const end = new Date(q.endDate); end.setHours(23,59,59,999);
          return now >= start && now <= end && !q.isLocked;
        });
        
        const activeNameMatch = active ? String(active.name).match(/Q?([1-4])/i) : null;
        const mappedActiveName = activeNameMatch ? `Q${activeNameMatch[1]}` : (active ? active.name : null);

        setSelectedQuarterName(mappedActiveName || availableQs[availableQs.length - 1]);
      }
    } else {
      setSelectedQuarterName('');
    }
  }, [dbQuarters, drafts, selectedYear, selectedQuarterName]);

  const deleteDraft = async (id) => {
    if (confirm('Are you sure you want to delete this draft?')) {
      try {
        await api.delete(`/appraisals/${id}`);
        setDrafts(drafts.filter(d => d._id !== id));
      } catch (e) {
        console.error('Failed to delete', e);
      }
    }
  };

  const extractComment = (generalComments, currentLabel, nextLabel) => {
    if (!generalComments) return '';
    const startIdx = generalComments.indexOf(currentLabel);
    if (startIdx === -1) return '';
    const startOfContent = startIdx + currentLabel.length;
    const endIdx = nextLabel ? generalComments.indexOf(nextLabel) : generalComments.length;
    if (endIdx === -1) return generalComments.substring(startOfContent).trim();
    return generalComments.substring(startOfContent, endIdx).trim();
  };

  const parseComments = (combinedString) => {
    if (!combinedString) return {};
    
    if (combinedString.includes('1. Delivered Expected Results:')) {
      return {
        deliveredResults: extractComment(combinedString, '1. Delivered Expected Results:', '2. Behaviors & Initiative:'),
        behaviors: extractComment(combinedString, '2. Behaviors & Initiative:', '3. Safe Working:'),
        safeWorking: extractComment(combinedString, '3. Safe Working:', '4. Job Competence:'),
        jobCompetence: extractComment(combinedString, '4. Job Competence:', '5. Dependability:'),
        dependability: extractComment(combinedString, '5. Dependability:', '6. Adaptability:'),
        adaptability: extractComment(combinedString, '6. Adaptability:', null)
      };
    }
    return {};
  };

  const filteredDrafts = drafts.filter(d => {
    if (!selectedYear || !selectedQuarterName) return false;
    
    const appYear = d.reviewYear || d.appraisalQuarter?.year || d.period?.year;
    const appQtrRaw = d.appraisalQuarter?.name || d.period?.quarter || d.quarter?.name || '';
    const qMatch = String(appQtrRaw).match(/Q?([1-4])/i) || String(appQtrRaw).match(/([1-4])/);
    const appQtr = qMatch ? `Q${qMatch[1]}` : appQtrRaw;

    return appYear?.toString() === selectedYear.toString() && appQtr === selectedQuarterName;
  });

  // 🚨 UPGRADED: Ensuring unique Available Quarters merges dbQuarters and Draft Quarters for the dropdown
  const qtrsForSelectedYearDB = dbQuarters.filter(q => q.year.toString() === selectedYear.toString());
  const dbQsDropdown = qtrsForSelectedYearDB.map(q => {
    const qMatch = String(q.name).match(/Q?([1-4])/i);
    return qMatch ? `Q${qMatch[1]}` : q.name;
  });

  const draftQsDropdown = drafts
    .filter(d => (d.reviewYear || d.appraisalQuarter?.year || d.period?.year)?.toString() === selectedYear.toString())
    .map(d => {
      const raw = d.appraisalQuarter?.name || d.period?.quarter || d.quarter?.name || '';
      const m = String(raw).match(/Q?([1-4])/i);
      return m ? `Q${m[1]}` : raw;
    });

  const uniqueAvailableQuarters = [...new Set([...dbQsDropdown, ...draftQsDropdown])].sort();

  if (loading) return <div className="p-10 text-center text-slate-500">Loading drafts...</div>;

  return (
    <div className="w-full max-w-full pb-[60px] relative">
      
      <div className="mb-[20px] flex flex-col md:flex-row justify-between items-start md:items-end gap-[12px]">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">&#128190; Saved Drafts</div>
          <div className="text-[13px] text-[#6b7280]">Appraisals in progress, not yet sent to HR</div>
        </div>

        <div className="flex flex-wrap items-center gap-[10px]">
          <div className="flex items-center gap-[6px] bg-white border border-[#E2DDD4] p-[4px] rounded-[8px] shadow-sm">
            <select 
              value={selectedQuarterName} 
              onChange={(e) => setSelectedQuarterName(e.target.value)}
              className="bg-transparent text-[12px] font-[700] text-[#0D2B55] outline-none cursor-pointer p-[6px_8px]"
              disabled={uniqueAvailableQuarters.length === 0}
            >
              {uniqueAvailableQuarters.length === 0 && <option value="">No Quarters Active</option>}
              {uniqueAvailableQuarters.map(q => (
                 <option key={q} value={q}>{q}</option>
              ))}
            </select>
            <span className="text-[#E2DDD4]">|</span>
            {isManualYear ? (
              <input 
                type="number" 
                autoFocus
                defaultValue={selectedYear}
                onBlur={(e) => {
                  if (e.target.value) setSelectedYear(e.target.value);
                  setIsManualYear(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.target.value) setSelectedYear(e.target.value);
                    setIsManualYear(false);
                  }
                }}
                className="bg-transparent text-[12px] font-[700] text-[#0D2B55] outline-none p-[6px_8px] w-[80px]"
              />
            ) : (
              <select 
                value={selectedYear} 
                onChange={(e) => {
                  if (e.target.value === 'manual') setIsManualYear(true);
                  else setSelectedYear(e.target.value);
                }}
                className="bg-transparent text-[12px] font-[700] text-[#0D2B55] outline-none cursor-pointer p-[6px_8px] pr-[12px]"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
                <option value="manual" className="font-bold text-[#1E40AF]">Enter Manually...</option>
              </select>
            )}
          </div>
        </div>
      </div>
      
      {filteredDrafts.length === 0 ? (
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[40px] text-center">
          <div className="text-[40px] mb-[10px]">&#128221;</div>
          <div className="text-[15px] font-[700] text-[#0D2B55] mb-[5px]">No Drafts</div>
          <div className="text-[13px] text-[#6b7280]">You do not have any saved appraisal drafts for this period.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {filteredDrafts.map((d) => {
            const fName = d.employeeId?.personalDetails?.firstName || 'Unknown';
            const lName = d.employeeId?.personalDetails?.lastName || '';
            const jobTitle = d.employeeId?.employmentDetails?.jobTitle || 'Staff';
            const quarter = d.period?.quarter || 'Q3';

            return (
              <div key={d._id} className="bg-white border border-[#E2DDD4] rounded-[12px] p-[16px_20px] flex flex-col sm:flex-row sm:items-center justify-between gap-[14px] hover:border-[#0D2B55]/30 transition-colors shadow-sm">
                <div className="flex-1">
                  <div className="text-[14px] font-[700] text-[#0D2B55]">{fName} {lName}</div>
                  <div className="text-[11px] text-[#6b7280] mt-[3px]">
                    {jobTitle} &middot; {quarter} {selectedYear} &middot; Last saved {new Date(d.updatedAt || d.createdAt).toLocaleDateString()} at {new Date(d.updatedAt || d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <div className="flex items-center gap-[10px] flex-wrap justify-end">
                  <span className="text-[11px] font-[700] p-[3px_10px] rounded-full whitespace-nowrap bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] hidden sm:block">
                    &#128190; Draft
                  </span>
                  <div className="flex gap-[8px]">
                    <button 
                      onClick={() => {
                        setSelectedAppraisal(d);
                        setExpandedComment(null); 
                      }} 
                      className="px-[14px] py-[7px] bg-white border border-[#E2DDD4] hover:border-[#0D2B55] hover:text-[#0D2B55] text-[#0f1923] text-[12px] font-[700] rounded-[9px] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>

                    <button 
                      className="px-[14px] py-[7px] bg-[#0D2B55] hover:bg-[#1a3d6e] text-white text-[12px] font-[700] rounded-[9px] transition-colors" 
                     onClick={() => router.push(`/dashboard/manager/new?draft=${d._id}`)}
                    >
                      Continue &rarr;
                    </button>
                    <button 
                      className="px-[14px] py-[7px] bg-[#FEE2E2] hover:bg-[#FECACA] text-[#991B1B] text-[12px] font-[700] rounded-[9px] transition-colors"
                      onClick={() => deleteDraft(d._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedAppraisal && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 backdrop-blur-sm z-[200] flex items-center justify-center p-[20px] animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[700px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden slide-in-from-bottom-4">
            
            <div className="p-[20px_24px] border-b border-[#E2DDD4] flex justify-between items-center bg-[#FAF8F4] relative">
              <h2 className="text-[18px] font-[800] text-[#0D2B55]">&#128269; Draft Preview</h2>
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
                    {selectedAppraisal.employeeId?.employmentDetails?.jobTitle} &middot; Last saved {new Date(selectedAppraisal.updatedAt || selectedAppraisal.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px] mb-[24px]">
                <div className="bg-[#FAF8F4] p-[12px_16px] rounded-[10px] border border-[#E2DDD4]">
                  <div className="text-[10px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">Current IPRF</div>
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
                <h4 className="text-[12px] font-[800] text-[#0D2B55] uppercase tracking-wider mb-[12px] pb-[8px] border-b border-[#E2DDD4]">Drafted KPA Ratings & Comments</h4>
                <div className="flex flex-col gap-[10px]">
                  {Object.entries(SCORE_LABELS).map(([key, label]) => {
                    const rating = selectedAppraisal.scores?.[key]?.rating;
                    const commentsObj = parseComments(selectedAppraisal.narrative?.generalComments);
                    const comment = commentsObj[key] || "No justification provided yet.";
                    const isExpanded = expandedComment === key;
                    const hasRating = rating !== null && rating !== undefined;

                    return (
                      <div key={key} className="bg-white border border-[#E2DDD4] rounded-[8px] overflow-hidden shadow-sm transition-all duration-200">
                        <div 
                          className="flex justify-between items-center p-[10px_14px] cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => setExpandedComment(isExpanded ? null : key)}
                        >
                          <div className="flex items-center gap-2">
                             <span className="text-[13px] font-[600] text-[#475569]">{label}</span>
                             {hasRating && rating !== 1.0 && <MessageSquare className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`text-[14px] font-[800] ${!hasRating ? 'text-slate-300' : rating >= 3 ? 'text-[#059669]' : rating >= 2 ? 'text-[#D97706]' : 'text-[#DC2626]'}`}>
                              {hasRating ? rating.toFixed(1) : '-'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-[10px_14px] bg-slate-50 border-t border-[#E2DDD4] text-[12px] text-slate-700 animate-in fade-in slide-in-from-top-1">
                            <div className="font-semibold text-slate-500 mb-1 text-[10px] uppercase tracking-wider">Manager Justification:</div>
                            <div className="italic leading-relaxed">{comment}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedAppraisal.narrative?.epJustification && (
                 <div className="mb-[24px]">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-[12px_16px] rounded-r-[8px]">
                       <div className="text-[11px] font-bold text-yellow-800 uppercase tracking-wider mb-1">EP Justification Provided</div>
                       <div className="text-[12px] text-yellow-900 italic">"{selectedAppraisal.narrative.epJustification}"</div>
                    </div>
                 </div>
              )}

              <div className="mt-[24px] pt-[16px] border-t border-[#E2DDD4] flex items-center justify-between">
                <div className="text-[11px] font-[700] p-[4px_12px] rounded-full whitespace-nowrap bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                  DRAFT
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