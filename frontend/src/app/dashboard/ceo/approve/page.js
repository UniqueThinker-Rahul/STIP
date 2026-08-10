'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, ChevronDown, ChevronUp, Info, AlertTriangle, Clock, Check, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';
import api from '../../../../lib/api';
import usePersistentFilter from '../../../../hooks/usePersistentFilter';

// 🚨 BUG FIX: Mapped IDs perfectly to match the backend DB schema ('deliveredResults' and 'behaviors')
const CRITERIA = [
  { id: 'deliveredResults', short: 'Results', name: "Delivered Expected Results", wt: 0.30, pct: "30%" },
  { id: 'behaviors', short: 'Initiative', name: "Behaviors & Initiative", wt: 0.20, pct: "20%" },
  { id: 'safeWorking', short: 'Safety', name: "Safe Working", wt: 0.20, pct: "20%" },
  { id: 'jobCompetence', short: 'Competence', name: "Job Competence", wt: 0.10, pct: "10%" },
  { id: 'dependability', short: 'Dependability', name: "Dependability", wt: 0.10, pct: "10%" },
  { id: 'adaptability', short: 'Adaptability', name: "Adaptability", wt: 0.10, pct: "10%" }
];

export default function CEOApproveAppraisals() {
  const router = useRouter();
  
  const [appraisals, setAppraisals] = useState([]);
  const [dbQuarters, setDbQuarters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cpPct, setCpPct] = useState(null);
  
  const [actionModal, setActionModal] = useState({ show: false, type: '', id: null, name: '' });
  const [ceoComment, setCeoComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [detailsModal, setDetailsModal] = useState({ show: false, data: null });
  const [showAllComments, setShowAllComments] = useState(false);

  // 🚨 NEW: Filter & Pagination States
  const currentYearNum = new Date().getFullYear();
  const currentYearStr = currentYearNum.toString();
  const yearOptions = [currentYearNum - 3, currentYearNum - 2, currentYearNum - 1, currentYearNum, currentYearNum + 1];

  const [filterYear, setFilterYear] = usePersistentFilter('ceo_approve_year', currentYearStr);
  const [isManualYear, setIsManualYear] = useState(false);
  const [qtr, setQtr] = usePersistentFilter('ceo_approve_qtr', '');

  // 🚨 UPGRADE: Keyboard shortcuts for View First (R), Approve (A), and Reject (D)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 🚨 FIX: Ignore shortcuts if user is typing in a textarea or input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Ensure modifier keys are not pressed to prevent blocking browser defaults (like Ctrl+R)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const isKeyR = e.code === 'KeyR' || e.key.toLowerCase() === 'r';
      const isKeyA = e.code === 'KeyA' || e.key.toLowerCase() === 'a';
      const isKeyD = e.code === 'KeyD' || e.key.toLowerCase() === 'd';

      if (isKeyR) {
        const viewBtn = document.getElementById('view-btn-0');
        if (viewBtn) {
          e.preventDefault();
          e.stopPropagation();
          viewBtn.click();
        }
      }

      if (isKeyA || isKeyD) {
        let btn = null;
        if (isKeyA) {
          const actionBtn = document.getElementById('action-approve-btn');
          const modalBtn = document.getElementById('modal-approve-btn');
          btn = (actionBtn && !actionBtn.disabled) ? actionBtn : ((modalBtn && !modalBtn.disabled) ? modalBtn : null);
        } else if (isKeyD) {
          const actionBtn = document.getElementById('action-reject-btn');
          const modalBtn = document.getElementById('modal-reject-btn');
          btn = (actionBtn && !actionBtn.disabled) ? actionBtn : ((modalBtn && !modalBtn.disabled) ? modalBtn : null);
        }

        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          // Dispatch clean MouseEvent
          btn.dispatchEvent(new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [metricsRes, appRes, qtrRes] = await Promise.all([
        api.get(`/company-metrics/${currentYearStr}`).catch(() => ({ data: { data: null } })),
        api.get('/appraisals').catch(() => ({ data: { data: [] } })),
        api.get('/quarters').catch(() => ({ data: { data: [] } }))
      ]);

      if (metricsRes.data?.data?.cpPct) {
        setCpPct(metricsRes.data.data.cpPct);
      }

      const fetchedQuarters = qtrRes.data?.data || [];
      setDbQuarters(fetchedQuarters);

      const allApps = appRes.data?.data || [];
      const pendingCeo = allApps.filter(a => a.workflow?.status === 'WITH_CEO');
      
      pendingCeo.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
      
      setAppraisals(pendingCeo);
    } catch (error) {
      console.error('Failed to load CEO queue', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🚨 NEW: Automatically sync and default to Q1 of the selected year
  useEffect(() => {
    // Guard clause to prevent persistent filter from resetting on initial mount
    if (dbQuarters.length === 0) return;

    const qtrsForSelectedYear = dbQuarters.filter(q => q.year.toString() === filterYear);
    if (qtrsForSelectedYear.length > 0) {
      const q1 = qtrsForSelectedYear.find(q => q.name.toUpperCase().includes('Q1'));
      
      // Only overwrite if no quarter is set, or if the saved quarter doesn't belong to this year
      setQtr((prev) => {
        if (!prev || !qtrsForSelectedYear.some(q => q._id === prev)) {
          return q1 ? q1._id : qtrsForSelectedYear[0]._id;
        }
        return prev;
      });
    } else {
      setQtr('');
    }
  }, [dbQuarters, filterYear]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterYear, qtr]);

  const openActionModal = (e, type, id, name) => {
    e.stopPropagation(); 
    setActionModal({ show: true, type, id, name });
    setCeoComment('');
    setSuccessMsg('');
  };

  const openDetailsModal = (e, appraisal) => {
    e.stopPropagation();
    setDetailsModal({ show: true, data: appraisal });
    setShowAllComments(false); 
  };

  const closeDetailsModal = () => {
    setDetailsModal({ show: false, data: null });
  };

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      await api.patch(`/appraisals/${actionModal.id}/ceo-approve`, { 
        notes: 'Final Approval by CEO'
      });
      
      setSuccessMsg('Appraisal has been successfully approved.');
      setTimeout(() => {
        setActionModal({ show: false, type: '', id: null, name: '' });
        window.location.reload(); 
      }, 2000);
      
    } catch (error) {
      alert("Failed to approve the appraisal.");
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (ceoComment.trim().length < 5) {
      alert("Please provide a detailed reason for not approving this appraisal.");
      return;
    }
    
    try {
      setIsProcessing(true);
      await api.patch(`/appraisals/${actionModal.id}/reopen`, { 
        hrNotes: ceoComment 
      });
      
      setSuccessMsg('Appraisal rejected and returned to the Manager.');
      setTimeout(() => {
        setActionModal({ show: false, type: '', id: null, name: '' });
        window.location.reload(); 
      }, 2000);
      
    } catch (error) {
      alert("Failed to reject the appraisal.");
      setIsProcessing(false);
    }
  };

  const iprfStyle = (f) => {
    if (f >= 1.3) return 'bg-[#DBEAFE] text-[#1E40AF]';
    if (f >= 1.0) return 'bg-[#D1FAE5] text-[#065F46]';
    if (f >= 0.7) return 'bg-[#FEF3C7] text-[#92400E]';
    return 'bg-[#FEE2E2] text-[#991B1B]';
  };

  const iprfLabel = (f) => {
    if (f >= 1.3) return 'E'; 
    if (f >= 1.0) return 'E';
    if (f >= 0.7) return 'N'; 
    return 'L'; 
  };

  const parseNarrativeBlocks = (text) => {
    if (!text) return [];
    
    const blocks = [];
    const lines = text.split('\n');
    let currentBlock = null;

    lines.forEach(line => {
      if (/^(1\.|2\.|3\.|4\.|5\.|6\.)/.test(line.trim())) {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { header: line.trim(), content: [] };
      } else if (currentBlock && line.trim() !== '') {
        currentBlock.content.push(line.trim());
      }
    });

    if (currentBlock) blocks.push(currentBlock);
    
    if (blocks.length === 0 && text.trim().length > 0) {
      return [{ header: 'General Feedback', content: [text.trim()] }];
    }
    
    return blocks;
  };

  // 🚨 NEW: Filter Data Logic
  const filteredData = appraisals.filter(a => {
    const appQuarterId = a.appraisalQuarter?._id || a.appraisalQuarter || a.period?.quarter;
    const appYear = a.reviewYear || a.appraisalQuarter?.year;
    
    const matchesQtr = qtr === '' || appQuarterId === qtr;
    const matchesYear = filterYear === '' || (appYear && appYear.toString() === filterYear) || matchesQtr;
    
    return matchesYear && matchesQtr;
  });

  // 🚨 NEW: Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const getPageNumbers = () => {
    let pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages = [1, 2, 3, 4, '...', totalPages];
      } else if (currentPage >= totalPages - 2) {
        pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }
    }
    return pages;
  };

  const quartersForSelectedYear = dbQuarters.filter(q => q.year.toString() === filterYear);

  return (
    <div className="w-full max-w-full pb-[60px] font-sans">
      
      <div className="mb-[20px] flex flex-col md:flex-row justify-between items-start md:items-end gap-[12px]">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">
            &#10003; Approve Appraisals
          </div>
          <div className="text-[13px] text-[#6b7280]">
            Appraisals submitted by HR Manager &mdash; awaiting CEO decision. Click the eye icon or profile to view full details.
          </div>
        </div>

        {/* 🚨 NEW: Filter Controls (Year and Quarter) */}
        <div className="flex gap-[8px]">
          {/* 1. Year Filter with Manual Custom Entry Mode */}
          {isManualYear ? (
            <input 
              type="number" 
              autoFocus
              defaultValue={filterYear}
              onBlur={(e) => {
                if (e.target.value) {
                  setFilterYear(e.target.value);
                }
                setIsManualYear(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.target.value) {
                    setFilterYear(e.target.value);
                  }
                  setIsManualYear(false);
                }
              }}
              className="py-[10px] px-[12px] bg-white border border-[#0D2B55] rounded-[8px] text-[13px] font-[700] text-[#0D2B55] outline-none w-[105px] shadow-sm"
            />
          ) : (
            <select 
              value={filterYear} 
              onChange={(e) => {
                if (e.target.value === 'manual') setIsManualYear(true);
                else setFilterYear(e.target.value);
              }} 
              className="py-[10px] px-[12px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] font-[700] text-[#0D2B55] outline-none cursor-pointer w-[105px] shadow-sm"
            >
              {yearOptions.map(y => (
                 <option key={y} value={y}>{y}</option>
              ))}
              <option value="manual" className="font-bold text-[#1E40AF]">Enter Manually...</option>
            </select>
          )}

          <select 
            value={qtr} 
            onChange={e => setQtr(e.target.value)} 
            disabled={!filterYear || quartersForSelectedYear.length === 0}
            className={`py-[10px] px-[12px] border rounded-[8px] text-[13px] outline-none transition-colors w-[140px] shadow-sm ${filterYear ? 'bg-white border-[#E2DDD4] text-[#0f1923] cursor-pointer' : 'bg-slate-50 border-[#E2DDD4] text-[#94a3b8] cursor-not-allowed'}`}
          >
            {quartersForSelectedYear.length === 0 && <option value="">No Quarters</option>}
            {quartersForSelectedYear.map(q => (
               <option key={q._id} value={q._id}>{q.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-[#FAF8F4] border-b border-[#E2DDD4] text-[10px] font-[800] text-[#6b7280] uppercase tracking-[.06em]">
              <tr>
                <th className="p-[12px_16px]">Employee</th>
                <th className="p-[12px_16px] text-[#C9A84C]">Job Title</th>
                <th className="p-[12px_16px] text-center">View</th>
                <th className="p-[12px_16px] text-center">IPRF</th>
                <th className="p-[12px_16px] text-center">Award %</th>
                <th className="p-[12px_16px] text-center">Pro-Rata</th>
                <th className="p-[12px_16px] text-center">Status</th>
                <th className="p-[12px_16px] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4] text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-[40px] text-center text-[#6b7280] font-[600] animate-pulse">
                    Loading CEO Queue...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-[48px] text-center text-[#6b7280]">
                    <div className="text-[36px] mb-[12px] opacity-70">&#128203;</div>
                    <div className="text-[15px] font-[700] text-[#0D2B55] mb-[6px]">No appraisals pending CEO approval</div>
                    <div className="text-[13px]">When HR submits appraisals to CEO, they will appear here for your review.</div>
                  </td>
                </tr>
              ) : (
                currentItems.map((a, i) => {
                  const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`.trim();
                  const init1 = a.employeeId?.personalDetails?.firstName?.[0] || '';
                  const init2 = a.employeeId?.personalDetails?.lastName?.[0] || '';
                  const coCode = a.employeeId?.companyCode || 'FSM';
                  const jobTitle = a.employeeId?.employmentDetails?.jobTitle || 'Staff';
                  
                  const iprf = a.calculatedResults?.finalIprfScore || 0;
                  const prMonths = a.employeeId?.employmentDetails?.prorateValue || 12;
                  const proRataValue = prMonths / 12;
                  
                  let awardDisplay = '—';
                  if (cpPct !== null) {
                    const finalAw = (cpPct * iprf) * proRataValue;
                    awardDisplay = `${finalAw.toFixed(2)}%`;
                  } else if (a.stipAward) {
                     awardDisplay = `${a.stipAward}%`;
                  }

                  return (
                    <tr key={a._id} className={`transition-colors ${i % 2 === 1 ? 'bg-[#FAF8F4]/40 hover:bg-[#FAF8F4]' : 'bg-white hover:bg-[#FAF8F4]'}`}>
                      {/* Clicking the profile area triggers the popup */}
                      <td 
                        className="p-[12px_16px] whitespace-nowrap cursor-pointer group" 
                        onClick={(e) => openDetailsModal(e, a)}
                      >
                        <div className="flex items-center gap-[9px]">
                          <div className="w-[30px] h-[30px] rounded-[6px] bg-[#E2DDD4] text-[#0f1923] font-[800] flex items-center justify-center text-[11px] group-hover:bg-[#0D2B55] group-hover:text-white transition-colors">
                            {init1}{init2}
                          </div>
                          <div>
                            <div className="font-[600] text-[#0D2B55] group-hover:underline">{empName}</div>
                            <div className="text-[10px] text-[#6b7280]">
                              {coCode} &middot; {a.period?.quarter || 'Q3'} &middot; {new Date(a.updatedAt || a.createdAt).toLocaleDateString('en-GB')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-[12px] text-[#0f1923]">
                        {jobTitle}
                      </td>
                      
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <button 
                          id={i === 0 ? 'view-btn-0' : undefined}
                          onClick={(e) => openDetailsModal(e, a)}
                          className="p-[6px] rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors inline-flex items-center justify-center"
                          title={i === 0 ? "View Details (Shortcut: R)" : "View Details"}
                        >
                          <Eye className="w-[16px] h-[16px]" />
                        </button>
                      </td>

                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <span className={`px-[8px] py-[4px] rounded-[6px] text-[11px] font-[800] ${iprfStyle(iprf)}`}>
                          {iprf.toFixed(1)} — {iprfLabel(iprf)}
                        </span>
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center font-[700] text-[#059669]">
                        {awardDisplay}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center font-[600] text-[#0D2B55]">
                        {proRataValue.toFixed(3)}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <span className="bg-[#FEF3C7] text-[#92400E] px-[8px] py-[4px] rounded-full text-[10px] font-[700] border border-[#FDE68A] whitespace-nowrap">
                          &#9200; Pending CEO
                        </span>
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <div className="flex gap-[6px] justify-center items-center">
                          <button 
                            onClick={(e) => openActionModal(e, 'approve', a._id, empName)}
                            className="bg-[#059669] hover:bg-[#047857] text-white px-[12px] py-[5px] text-[11px] font-[700] rounded-[6px] transition-colors shadow-sm"
                          >
                            &#10003; Approve
                          </button>
                          <button 
                            onClick={(e) => openActionModal(e, 'reject', a._id, empName)}
                            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-[12px] py-[5px] text-[11px] font-[700] rounded-[6px] transition-colors shadow-sm"
                          >
                            &#10007; Not Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* 🚨 NEW: Table Pagination Footer */}
        {filteredData.length > itemsPerPage && (
          <div className="p-[12px_16px] border-t border-[#E2DDD4] bg-[#FAF8F4] flex items-center justify-between mt-auto">
            <div className="text-[12px] text-[#6b7280] font-[600]">
              Showing <span className="text-[#0f1923]">{indexOfFirstItem + 1}</span> to <span className="text-[#0f1923]">{Math.min(indexOfLastItem, filteredData.length)}</span> of <span className="text-[#0f1923]">{filteredData.length}</span> entries
            </div>
            
            <div className="flex items-center gap-[4px]">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-[6px] rounded-[6px] border border-[#E2DDD4] text-[#6b7280] bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-[14px] h-[14px]" />
              </button>
              
              <div className="flex gap-[4px] px-[4px]">
                {getPageNumbers().map((number, index) => (
                  <button
                    key={index}
                    onClick={() => number !== '...' && setCurrentPage(number)}
                    disabled={number === '...'}
                    className={`w-[28px] h-[28px] text-[12px] font-[700] rounded-[6px] transition-colors ${
                      number === currentPage 
                        ? 'bg-[#0D2B55] text-white border border-[#0D2B55]' 
                        : number === '...' 
                          ? 'bg-transparent text-[#6b7280] cursor-default'
                          : 'bg-white border border-[#E2DDD4] text-[#475569] hover:bg-slate-50 hover:text-[#0D2B55]'
                    }`}
                  >
                    {number}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-[6px] rounded-[6px] border border-[#E2DDD4] text-[#6b7280] bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-[14px] h-[14px]" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-[16px] p-[14px_16px] bg-[#DBEAFE] border border-[#BFDBFE] rounded-[14px] text-[12px] text-[#1E40AF] leading-[1.6]">
        &#8505; <strong>How it works:</strong> HR Manager submits appraisals to CEO &rarr; They appear here &rarr; CEO clicks Approve or Not Approve &rarr; If Not Approved, mandatory comment required &rarr; HR notified by email with CEO comments.<br/>
        <strong>Keyboard Shortcuts:</strong> Press <kbd className="bg-white/50 px-[4px] py-[1px] rounded-[4px] border border-[#BFDBFE] font-mono text-[11px]">R</kbd> to view the first appraisal on the page. In modals, press <kbd className="bg-white/50 px-[4px] py-[1px] rounded-[4px] border border-[#BFDBFE] font-mono text-[11px]">A</kbd> to Approve, or <kbd className="bg-white/50 px-[4px] py-[1px] rounded-[4px] border border-[#BFDBFE] font-mono text-[11px]">D</kbd> to Reject.
      </div>

      {/* 🚨 NEW: Dedicated Appraisal Details Popup Modal */}
      {detailsModal.show && detailsModal.data && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[100] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[900px] max-h-[90vh] shadow-2xl flex flex-col slide-in-from-bottom-4">
            
            {/* Modal Header */}
            <div className="p-[16px_24px] border-b border-[#E2DDD4] flex justify-between items-center bg-[#FAF8F4] rounded-t-[16px]">
              <div>
                <h3 className="text-[18px] font-[800] text-[#0D2B55]">
                  {detailsModal.data.employeeId?.personalDetails?.firstName} {detailsModal.data.employeeId?.personalDetails?.lastName}
                </h3>
                <div className="text-[12px] text-[#6b7280] font-[500]">
                  {detailsModal.data.employeeId?.employmentDetails?.jobTitle} &middot; {detailsModal.data.employeeId?.companyCode || 'FSM'}
                </div>
              </div>
              <button 
                onClick={closeDetailsModal}
                className="w-[32px] h-[32px] rounded-full bg-white border border-[#E2DDD4] flex items-center justify-center text-[#6b7280] hover:bg-slate-100 hover:text-[#0D2B55] transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-[24px] overflow-y-auto custom-scrollbar flex-1 bg-white">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
                
                {/* Left Column */}
                <div>
                  {/* Timestamps */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-[16px] mb-[16px] shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-6 h-6 text-blue-400 shrink-0" />
                      <div>
                        <div className="text-[9px] font-[800] text-blue-600 uppercase tracking-widest mb-[2px]">Manager Submitted</div>
                        <div className="text-[11px] font-[700] text-[#0D2B55]">
                          {new Date(detailsModal.data.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(detailsModal.data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="w-px h-6 bg-blue-200 hidden sm:block"></div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold shrink-0 text-[9px]">HR</div>
                      <div>
                        <div className="text-[9px] font-[800] text-blue-600 uppercase tracking-widest mb-[2px]">HR Approved</div>
                        <div className="text-[11px] font-[700] text-[#0D2B55]">
                          {new Date(detailsModal.data.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(detailsModal.data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 🚨 BUG FIXED: Correctly Maps Score Data Using Matched Criteria IDs */}
                  <div className="bg-white border border-[#E2DDD4] rounded-xl shadow-sm p-[16px] mb-[16px]">
                    <div className="flex items-center gap-[12px] mb-[12px] border-b border-[#E2DDD4] pb-[12px]">
                      <div className="w-[28px] h-[28px] rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Calculator className="w-[14px] h-[14px]" />
                      </div>
                      <div>
                        <div className="text-[13px] font-[800] text-[#0D2B55]">IPRF Breakdown</div>
                        <div className="text-[10px] text-[#6b7280]">// Σ (Rating × Weight)</div>
                      </div>
                    </div>
                    <div className="font-mono text-[11px] text-[#6b7280]">
                      {CRITERIA.map(c => {
                        // Securely extract the value whether it's nested object or flat number
                        let val = detailsModal.data.scores?.[c.id];
                        if (typeof val === 'object' && val !== null) {
                          val = val.rating;
                        }
                        
                        if (val === undefined || val === null) return null;
                        
                        const numVal = Number(val);
                        const calculatedScore = numVal * c.wt;
                        const colorClass = numVal === 0.0 ? 'text-red-500' : numVal === 0.7 ? 'text-amber-500' : numVal === 1.0 ? 'text-green-500' : 'text-blue-500';
                        
                        return (
                          <div key={c.id} className="flex justify-between items-center py-[4px]">
                            <span>{c.short}: <span className="font-[800] text-[#0f1923]">{numVal.toFixed(1)}</span> × {c.pct} =</span>
                            <span className={`font-[800] ${colorClass}`}>{calculatedScore.toFixed(3)}</span>
                          </div>
                        );
                      })}
                      <div className="mt-[8px] pt-[8px] border-t border-[#E2DDD4] flex justify-between items-center font-[800] text-[#0D2B55] text-[12px]">
                        <span>Final Rounded IPRF →</span>
                        <span>{detailsModal.data.calculatedResults?.finalIprfScore?.toFixed(1) || '0.0'}</span>
                      </div>
                    </div>
                  </div>

                  {/* HR Notes */}
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-[16px] shadow-sm">
                    <div className="text-[11px] font-[800] text-[#065F46] uppercase tracking-widest mb-[8px] flex items-center gap-[6px]">
                      <Check className="w-[14px] h-[14px]" /> HR Review Notes
                    </div>
                    <div className="text-[13px] text-[#065F46] leading-relaxed italic border-l-[3px] border-[#065F46]/20 pl-[12px]">
                      "{detailsModal.data.narrative?.hrComments || 'Approved by HR Administrator.'}"
                    </div>
                  </div>
                </div>

                {/* Right Column: Manager Narratives */}
                <div className="bg-white border border-[#E2DDD4] rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                  <div className="p-[16px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center">
                    <div className="text-[11px] font-[800] text-[#0D2B55] uppercase tracking-widest flex items-center gap-[6px]">
                      <Info className="w-[14px] h-[14px]" /> Manager Rating Justifications
                    </div>
                  </div>
                  
                  <div className="p-[16px] text-[13px] leading-relaxed custom-scrollbar overflow-y-auto" style={{ maxHeight: '400px' }}>
                    {detailsModal.data.calculatedResults?.finalIprfScore >= 1.3 && (
                      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-[16px] mb-[16px]">
                        <div className="text-[10px] font-[800] text-[#92400E] uppercase tracking-widest mb-[6px] flex items-center gap-[4px]">
                          <AlertTriangle className="w-[12px] h-[12px]" /> Exceeds Performance Justification
                        </div>
                        <div className="text-[12px] text-[#92400E] font-[500]">
                          {detailsModal.data.narrative?.epJustification || 'No justification provided.'}
                        </div>
                      </div>
                    )}

                    <div className="border-l-[3px] border-[#0D2B55]/20 pl-[16px] space-y-[16px]">
                      {(() => {
                        const text = detailsModal.data.narrative?.generalComments || 'No general comments provided.';
                        const blocks = parseNarrativeBlocks(text);
                        const displayBlocks = showAllComments ? blocks : blocks.slice(0, 3);
                        
                        return (
                          <>
                            {displayBlocks.map((block, idx) => (
                              <div key={idx} className="animate-in fade-in">
                                <h4 className="font-[800] text-[#0D2B55] mb-[4px]">{block.header}</h4>
                                {block.content.map((p, j) => (
                                  <p key={j} className="text-[#475569] text-[12px]">{p}</p>
                                ))}
                              </div>
                            ))}
                            
                            {blocks.length > 3 && (
                              <button 
                                onClick={() => setShowAllComments(!showAllComments)}
                                className="mt-[12px] flex items-center gap-[6px] text-[11px] font-[800] text-[#0D2B55] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-[12px] py-[6px] rounded-full transition-colors"
                              >
                                {showAllComments ? (
                                  <><ChevronUp className="w-[14px] h-[14px]" /> Collapse View</>
                                ) : (
                                  <><ChevronDown className="w-[14px] h-[14px]" /> Show {blocks.length - 3} More Justifications</>
                                )}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal Footer (Action Shortcuts) */}
            <div className="p-[16px_24px] border-t border-[#E2DDD4] bg-[#FAF8F4] flex justify-end gap-[12px] rounded-b-[16px]">
               <button 
                  id="modal-reject-btn"
                  onClick={() => {
                    closeDetailsModal();
                    openActionModal(
                      { stopPropagation: () => {} }, 
                      'reject', 
                      detailsModal.data._id, 
                      `${detailsModal.data.employeeId?.personalDetails?.firstName} ${detailsModal.data.employeeId?.personalDetails?.lastName}`
                    );
                  }}
                  className="px-[16px] py-[8px] bg-white border border-[#DC2626] text-[#DC2626] font-[800] text-[12px] rounded-[8px] hover:bg-[#FEF2F2] transition-colors"
                  title="Shortcut: D"
               >
                 Reject Appraisal
               </button>
               <button 
                  id="modal-approve-btn"
                  onClick={() => {
                    closeDetailsModal();
                    openActionModal(
                      { stopPropagation: () => {} }, 
                      'approve', 
                      detailsModal.data._id, 
                      `${detailsModal.data.employeeId?.personalDetails?.firstName} ${detailsModal.data.employeeId?.personalDetails?.lastName}`
                    );
                  }}
                  className="px-[16px] py-[8px] bg-[#059669] text-white font-[800] text-[12px] rounded-[8px] hover:bg-[#047857] shadow-sm transition-colors"
                  title="Shortcut: A"
               >
                 Approve Appraisal
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Approval / Rejection Modal */}
      {actionModal.show && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[200] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[460px] shadow-2xl overflow-hidden slide-in-from-bottom-4">
            
            <div className={`p-[16px_22px] flex justify-between items-center ${actionModal.type === 'approve' ? 'bg-[#059669]' : 'bg-[#DC2626]'}`}>
              <div className="text-[15px] font-[800] text-white flex items-center gap-[8px]">
                {actionModal.type === 'approve' ? '&#10003; Confirm Approval' : '&#10007; Reject Appraisal'}
              </div>
              <button 
                onClick={() => !isProcessing && setActionModal({ show: false, type: '', id: null, name: '' })} 
                className="bg-white/10 text-white w-[30px] h-[30px] rounded-[8px] flex items-center justify-center hover:bg-white/20 transition-colors"
                disabled={isProcessing}
              >
                &times;
              </button>
            </div>

            <div className="p-[24px]">
              {successMsg ? (
                <div className="text-center py-[20px]">
                  <div className="text-[48px] mb-[12px] leading-none">{actionModal.type === 'approve' ? '✅' : '📤'}</div>
                  <div className={`text-[16px] font-[800] ${actionModal.type === 'approve' ? 'text-[#059669]' : 'text-[#D97706]'}`}>
                    {successMsg}
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-[20px]">
                    <div className="text-[15px] font-[700] text-[#0D2B55]">
                      {actionModal.type === 'approve' ? 'Finalize CEO Approval for' : 'Do Not Approve Appraisal for'}
                    </div>
                    <div className={`text-[18px] font-[800] mt-[4px] ${actionModal.type === 'approve' ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                      {actionModal.name}
                    </div>
                  </div>

                  {actionModal.type === 'reject' && (
                    <div className="mb-[20px]">
                      <label className="block text-[12px] font-[700] text-[#0D2B55] mb-[6px]">
                        Reason for Non-Approval <span className="text-[#DC2626]">*</span>
                      </label>
                      <textarea 
                        className="w-full resize-y min-h-[100px] p-[10px_14px] border-[1.5px] border-[#FECACA] rounded-[8px] text-[13px] text-[#0f1923] bg-[#FEF2F2] outline-none focus:border-[#DC2626] transition-colors shadow-inner"
                        placeholder="Please detail why this appraisal is not approved. This will be sent back to the HR Manager."
                        value={ceoComment}
                        onChange={(e) => setCeoComment(e.target.value)}
                        disabled={isProcessing}
                      />
                    </div>
                  )}

                  {actionModal.type === 'approve' && (
                    <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px] p-[16px] mb-[20px] text-center shadow-sm">
                      <div className="text-[13px] text-[#065F46] font-[600]">
                        By clicking confirm, you authorize the final payout calculation for this employee based on the locked CP%.
                      </div>
                    </div>
                  )}

                  <div className="flex gap-[12px] justify-center">
                    <button 
                      onClick={() => setActionModal({ show: false, type: '', id: null, name: '' })} 
                      className="p-[12px_20px] rounded-[10px] text-[13px] font-[800] text-[#0f1923] bg-white border-[2px] border-[#E2DDD4] hover:border-[#0D2B55] transition-colors"
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>
                    <button 
                      id={actionModal.type === 'approve' ? 'action-approve-btn' : 'action-reject-btn'}
                      onClick={actionModal.type === 'approve' ? handleApprove : handleReject} 
                      className={`p-[12px_20px] rounded-[10px] text-[13px] font-[800] text-white shadow-md flex items-center justify-center min-w-[140px] transition-colors ${
                        actionModal.type === 'approve' 
                          ? 'bg-[#059669] hover:bg-[#047857]' 
                          : 'bg-[#DC2626] hover:bg-[#B91C1C]'
                      }`}
                      disabled={isProcessing}
                      title={actionModal.type === 'approve' ? 'Shortcut: A' : 'Shortcut: D'}
                    >
                      {isProcessing ? 'Processing...' : actionModal.type === 'approve' ? 'Yes, Approve' : 'Submit Rejection'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}