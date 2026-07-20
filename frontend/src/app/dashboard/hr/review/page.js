'use client';

import { useState, useEffect, useRef } from 'react';
import api from '../../../../lib/api';
import { useRouter } from 'next/navigation';
import { Check, AlertTriangle, Calculator, ChevronDown, Info, Clock, ChevronUp, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

const CRITERIA = [
  { id: 'deliveredResults', short: 'Results', name: "Delivered Expected Results", wt: 0.30, pct: "30%", desc: "Did the employee deliver the expected results of their position in 2025/2026?" },
  { id: 'behaviors', short: 'Initiative', name: "Behaviors & Initiative", wt: 0.20, pct: "20%", desc: "Does the employee take responsibility, plan tasks, and solve problems proactively?" },
  { id: 'safeWorking', short: 'Safety', name: "Safe Working", wt: 0.20, pct: "20%", desc: "Does the employee follow safety rules, wear PPE, and identify hazards?" },
  { id: 'jobCompetence', short: 'Competence', name: "Job Competence", wt: 0.10, pct: "10%", desc: "Does the employee have and apply the skills required for their role?" },
  { id: 'dependability', short: 'Dependability', name: "Dependability", wt: 0.10, pct: "10%", desc: "Is the employee reliable, punctual, and do they deliver quality work on time?" },
  { id: 'adaptability', short: 'Adaptability', name: "Adaptability", wt: 0.10, pct: "10%", desc: "Does the employee accept new tasks, change, and extra demands?" }
];

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

export default function ReviewAppraisals() {
  const router = useRouter();
  const [appraisals, setAppraisals] = useState([]);
  const [totalEPCount, setTotalEPCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [selectedReview, setSelectedReview] = useState(null);
  const [hrComment, setHrComment] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  
  const [showAllComments, setShowAllComments] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // 🚨 NEW: Filter & Pagination States
  const currentYearNum = new Date().getFullYear();
  const currentYearStr = currentYearNum.toString();
  const yearOptions = [currentYearNum - 3, currentYearNum - 2, currentYearNum - 1, currentYearNum, currentYearNum + 1];

  const [filterYear, setFilterYear] = useState(currentYearStr);
  const [isManualYear, setIsManualYear] = useState(false);
  const [qtr, setQtr] = useState('');
  
  const [search, setSearch] = useState('');
  const [co, setCo] = useState('');
  const [mgrFilter, setMgrFilter] = useState('');
  const [officeFilter, setOfficeFilter] = useState('');

  const [dbQuarters, setDbQuarters] = useState([]);
  const [staff, setStaff] = useState([]);
  const [companyCodes, setCompanyCodes] = useState([]);
  const [managerList, setManagerList] = useState([]);
  const [availableOffices, setAvailableOffices] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async () => {
    try {
      setLoading(true);

      const [appRes, qtrRes, configRes, usersRes] = await Promise.all([
        api.get('/appraisals').catch(() => ({ data: { data: [] } })),
        api.get('/quarters').catch(() => ({ data: { data: [] } })),
        api.get('/config/dropdowns').catch(() => ({ data: { data: {} } })),
        api.get('/users').catch(() => ({ data: { data: [] } }))
      ]);
      
      const allData = appRes.data?.data || appRes.data || [];
      const hrQueue = allData.filter(a => a.workflow?.status === 'SUBMITTED' || a.workflow?.status === 'UNDER_HR_REVIEW');
      setAppraisals(hrQueue);
      
      const currentEPs = allData.filter(a => a.calculatedResults?.finalIprfScore >= 1.3).length;
      setTotalEPCount(currentEPs);

      const fetchedQuarters = qtrRes.data?.data || [];
      setDbQuarters(fetchedQuarters);

      const allUsers = usersRes.data?.data || [];
      setStaff(allUsers);

      const extractedOffices = allUsers
          .map(u => u?.employmentDetails?.officeLocation)
          .filter(location => location && typeof location === 'string' && location.trim() !== '');
      const uniqueOffices = [...new Set(extractedOffices)].sort();
      setAvailableOffices(uniqueOffices);

      const uniqueManagers = new Map();
      allData.forEach(a => {
        if (a.managerId) {
          const mId = a.managerId._id || a.managerId;
          const fName = a.managerId.personalDetails?.firstName || '';
          const lName = a.managerId.personalDetails?.lastName || '';
          if (fName || lName) uniqueManagers.set(mId, `${fName} ${lName}`.trim());
        }
      });
      allUsers.forEach(u => {
        const mgr = u.employmentDetails?.reportingTo;
        if (mgr) {
          const mId = mgr._id || mgr;
          if (mgr.personalDetails) {
            uniqueManagers.set(mId, `${mgr.personalDetails.firstName} ${mgr.personalDetails.lastName}`.trim());
          }
        }
      });
      const mgrArray = Array.from(uniqueManagers, ([id, name]) => ({ id, name }));
      mgrArray.sort((a, b) => a.name.localeCompare(b.name));
      setManagerList(mgrArray);

      const configData = configRes.data?.data || {};
      setCompanyCodes(configData.companyCodes || ['FSM', 'CDU', 'NAR', 'GUM']);

    } catch (error) {
      console.error('Failed to fetch HR queue:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🚨 NEW: Automatically default Quarter to Q1 of the selected year
  useEffect(() => {
    const qtrsForSelectedYear = dbQuarters.filter(q => q.year.toString() === filterYear);
    if (qtrsForSelectedYear.length > 0) {
      const q1 = qtrsForSelectedYear.find(q => q.name.toUpperCase().includes('Q1'));
      setQtr(q1 ? q1._id : qtrsForSelectedYear[0]._id);
    } else {
      setQtr('');
    }
  }, [dbQuarters, filterYear]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterYear, qtr, co, mgrFilter, officeFilter]);

  const showNotification = (msg, type) => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const handleInspect = async (a) => {
    setSelectedReview(a);
    setShowReject(false);
    setHrComment('');
    setBreakdownOpen(false);
    setShowAllComments(false);
    
    if (a.workflow?.status === 'SUBMITTED') {
      try {
        await api.patch(`/appraisals/${a._id}/review`);
      } catch (err) {
        console.error("Failed to update status to UNDER_HR_REVIEW");
      }
    }
  };

  const processApproval = async (id) => {
    try {
      await api.patch(`/appraisals/${id}/approve`, { hrNotes: hrComment || 'Approved by HR' });
      showNotification('Appraisal successfully approved and removed from queue.', 'success');
      setSelectedReview(null);
      fetchData();
    } catch (error) {
      showNotification('Error processing approval.', 'error');
    }
  };

  const processRejection = async () => {
    if (!hrComment || hrComment.trim().length < 5) {
      showNotification('Please provide a specific reason for rejecting this appraisal back to the manager.', 'error');
      return;
    }
    
    try {
      await api.patch(`/appraisals/${selectedReview._id}/reopen`, { hrNotes: hrComment });
      showNotification('Appraisal rejected and returned to Line Manager.', 'success');
      setSelectedReview(null);
      fetchData();
    } catch (error) {
      showNotification('Error rejecting appraisal.', 'error');
    }
  };

  const getManagerInfo = (mgrRaw) => {
    if (!mgrRaw) return { id: null, name: 'Unassigned' };
    if (mgrRaw._id && mgrRaw.personalDetails) {
      return { id: mgrRaw._id, name: `${mgrRaw.personalDetails.firstName} ${mgrRaw.personalDetails.lastName}`.trim() };
    }
    const mId = mgrRaw._id || mgrRaw;
    const found = staff.find(s => s._id === mId);
    if (found) {
       return { id: mId, name: `${found.personalDetails?.firstName} ${found.personalDetails?.lastName}`.trim() };
    }
    return { id: mId, name: 'Unknown Manager' };
  };

  // 🚨 NEW: Advanced Queue Filtering Logic
  const filteredData = appraisals.filter(a => {
    const emp = a.employeeId?.personalDetails;
    const empName = `${emp?.firstName || ''} ${emp?.lastName || ''}`.toLowerCase();
    const empIdStr = (a.employeeId?.employeeId || '').toLowerCase();
    const appQuarterId = a.appraisalQuarter?._id || a.appraisalQuarter || a.period?.quarter;
    const mgrInfo = getManagerInfo(a.managerId);

    const matchesSearch = search === '' || empName.includes(search.toLowerCase()) || empIdStr.includes(search.toLowerCase());
    const matchesQtr = qtr === '' || appQuarterId === qtr;
    const appYear = a.reviewYear || a.appraisalQuarter?.year;
    const matchesYear = filterYear === '' || (appYear && appYear.toString() === filterYear) || matchesQtr;
    const matchesCo = co === '' || a.employeeId?.companyCode === co;
    const matchesMgr = mgrFilter === '' || mgrInfo.id === mgrFilter;
    const matchesOffice = officeFilter === '' || a.employeeId?.employmentDetails?.officeLocation === officeFilter;

    return matchesSearch && matchesYear && matchesQtr && matchesCo && matchesMgr && matchesOffice;
  });

  // 🚨 NEW: Queue Pagination Engine
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const getPageNumbers = () => {
    let pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) pages = [1, 2, 3, 4, '...', totalPages];
      else if (currentPage >= totalPages - 2) pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      else pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    }
    return pages;
  };

  const quartersForSelectedYear = dbQuarters.filter(q => q.year.toString() === filterYear);

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

  const isEpCapReached = totalEPCount >= 9 && (selectedReview?.calculatedResults?.finalIprfScore >= 1.3);

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse font-medium">Loading HR Queue...</div>;

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Toast Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-[200] p-[12px_20px] rounded-[8px] font-[600] text-[13px] shadow-lg transition-all flex items-center gap-[8px] ${notification.type === 'error' ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]' : 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]'}`}>
          <span>{notification.type === 'error' ? '⚠️' : '✅'}</span> {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-[20px] flex justify-between items-end">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
            &#9997; HR Appraisal Review
          </div>
          <div className="text-[13px] text-[#6b7280]">Review line manager submissions, approve, or reject for revision</div>
        </div>
        <button onClick={fetchData} className="text-[12px] font-[600] text-[#6b7280] bg-white border border-[#E2DDD4] p-[6px_12px] rounded-[8px] hover:text-[#0D2B55] hover:border-[#0D2B55] transition-colors shadow-sm">
          &#8635; Refresh Queue
        </button>
      </div>

      {/* 🚨 NEW: High-Level Dynamic Filter Bar */}
      <div className="bg-white rounded-[14px] border border-[#E2DDD4] shadow-sm p-[16px] mb-[20px] flex flex-wrap gap-[12px]">
        <div className="flex-1 min-w-[200px] relative">
          <input 
            type="text" 
            placeholder="Search staff name or ID..." 
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-[36px] pr-[16px] py-[10px] bg-[#FAF8F4] border border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
          />
          <span className="absolute left-[12px] top-[10px] text-[#6b7280] text-[16px] leading-none">&#128269;</span>
        </div>
        
        <div className="flex gap-[6px]">
          {isManualYear ? (
            <input 
              type="number" 
              autoFocus
              defaultValue={filterYear}
              onBlur={(e) => {
                if (e.target.value) setFilterYear(e.target.value);
                setIsManualYear(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.target.value) setFilterYear(e.target.value);
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
              className="py-[10px] px-[12px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] font-[700] text-[#0D2B55] outline-none cursor-pointer w-[105px]"
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
            className={`py-[10px] px-[12px] border rounded-[8px] text-[13px] outline-none transition-colors w-[130px] ${filterYear ? 'bg-white border-[#E2DDD4] text-[#0f1923] cursor-pointer' : 'bg-slate-50 border-[#E2DDD4] text-[#94a3b8] cursor-not-allowed'}`}
          >
            {quartersForSelectedYear.length === 0 && <option value="">No Quarters</option>}
            {quartersForSelectedYear.map(q => (
               <option key={q._id} value={q._id}>{q.name}</option>
            ))}
          </select>
        </div>

        <SearchableDropdown 
          value={officeFilter}
          onChange={setOfficeFilter}
          placeholder="All Office Locations"
          widthClass="w-[180px]"
          options={availableOffices.map(o => ({ value: o, label: o }))}
        />

        <SearchableDropdown 
          value={mgrFilter}
          onChange={setMgrFilter}
          placeholder="All Line Managers"
          widthClass="w-[190px]"
          options={managerList.map(m => ({ value: m.id, label: m.name }))}
        />
        
        <select value={co} onChange={e => setCo(e.target.value)} className="py-[10px] px-[12px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] text-[#0f1923] outline-none cursor-pointer w-[120px]">
          <option value="">All Company</option>
          {companyCodes.map(code => (
             <option key={`co-${code}`} value={code}>{code}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-[20px]">
        
        {/* Left Column: The Queue List */}
        <div className="flex flex-col gap-[12px]">
          
          <div className="bg-[#0D2B55] rounded-xl p-[16px] text-white shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[100px] h-[100px] bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
            <div className="text-[10px] font-[700] uppercase tracking-widest text-white/50 mb-[6px]">Review Queue</div>
            <div className="text-[32px] font-[800] leading-[1] text-[#e8c96a] mb-[2px]">{filteredData.length}</div>
            <div className="text-[12px] text-white/70">Submissions awaiting your action</div>
          </div>

          <div className="bg-white border border-[#E2DDD4] rounded-xl overflow-hidden flex flex-col shadow-sm" style={{ height: 'calc(100vh - 350px)', minHeight: '500px' }}>
            <div className="p-[12px_16px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center shrink-0">
              <span className="text-[11px] font-[700] text-[#6b7280] uppercase tracking-widest">Pending Appraisals</span>
              <span className="text-[10px] bg-[#E2DDD4] text-[#0f1923] font-[700] px-[8px] py-[2px] rounded-full">{filteredData.length}</span>
            </div>
            
            <div className="overflow-y-auto flex-1 p-[8px] custom-scrollbar">
              {filteredData.length === 0 ? (
                <div className="text-center p-[30px] text-[#6b7280]">
                  <div className="text-[24px] mb-[10px]">&#128194;</div>
                  <div className="text-[13px] font-[600]">Queue is empty</div>
                  <div className="text-[11px] mt-[4px]">Try adjusting your filters</div>
                </div>
              ) : (
                <div className="flex flex-col gap-[8px]">
                  {/* 🚨 NEW: Rendering paginated currentItems instead of all appraisals */}
                  {currentItems.map(a => {
                    const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`.trim() || 'Unknown';
                    const iprf = a.calculatedResults?.finalIprfScore || 0;
                    const isSelected = selectedReview?._id === a._id;
                    
                    return (
                      <div 
                        key={a._id} 
                        onClick={() => handleInspect(a)}
                        className={`p-[12px] rounded-[10px] border-[1.5px] cursor-pointer transition-all ${isSelected ? 'border-[#0D2B55] bg-[#EFF6FF]' : 'border-transparent hover:border-[#0D2B55]/20 hover:bg-[#FAF8F4]'}`}
                      >
                        <div className="flex justify-between items-start mb-[6px]">
                          <div className={`text-[13px] font-[700] ${isSelected ? 'text-[#0D2B55]' : 'text-[#0f1923]'}`}>{empName}</div>
                          {iprf >= 1.3 && <span className="text-[9px] font-[800] bg-[#FEF3C7] text-[#92400E] px-[6px] py-[1px] rounded-[4px] border border-[#FDE68A]">EP</span>}
                        </div>
                        <div className="text-[11px] text-[#6b7280] truncate mb-[8px]">
                          {a.employeeId?.employmentDetails?.jobTitle}
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-[600] text-[#0369A1]">{a.period?.quarter || 'Q3'} 2026</span>
                          <span className="text-[#6b7280]">IPRF: <span className="font-[800] text-[#0f1923]">{iprf.toFixed(1)}</span></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 🚨 NEW: Queue Pagination Controls */}
            {filteredData.length > itemsPerPage && (
              <div className="p-[10px] border-t border-[#E2DDD4] bg-[#FAF8F4] flex flex-col items-center gap-[6px] shrink-0">
                <div className="flex items-center gap-[4px]">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-[4px] rounded-[6px] border border-[#E2DDD4] text-[#6b7280] bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-[14px] h-[14px]" />
                  </button>
                  <div className="flex gap-[2px]">
                    {getPageNumbers().map((number, index) => (
                      <button
                        key={index}
                        onClick={() => number !== '...' && setCurrentPage(number)}
                        disabled={number === '...'}
                        className={`w-[24px] h-[24px] text-[11px] font-[700] rounded-[6px] transition-colors ${
                          number === currentPage 
                            ? 'bg-[#0D2B55] text-white border border-[#0D2B55]' 
                            : number === '...' 
                              ? 'bg-transparent text-[#6b7280] cursor-default'
                              : 'bg-white border border-[#E2DDD4] text-[#475569] hover:bg-slate-50'
                        }`}
                      >
                        {number}
                    </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-[4px] rounded-[6px] border border-[#E2DDD4] text-[#6b7280] bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-[14px] h-[14px]" />
                  </button>
                </div>
                <div className="text-[10px] text-[#6b7280] font-[600]">
                  {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: The Inspector */}
        <div>
          {!selectedReview ? (
            <div className="bg-white border border-[#E2DDD4] rounded-xl h-full min-h-[500px] flex flex-col items-center justify-center p-[40px] text-center shadow-sm">
              <div className="text-[48px] mb-[16px] text-slate-300">&#128269;</div>
              <div className="text-[16px] font-[700] text-[#0D2B55] mb-[8px]">Select an Appraisal to Review</div>
              <div className="text-[13px] text-[#6b7280] max-w-[300px]">Click on any appraisal in the queue on the left to inspect the ratings, read justifications, and make an approval decision.</div>
            </div>
          ) : (
            <div className="bg-white border border-[#E2DDD4] rounded-xl overflow-hidden flex flex-col h-full animate-in fade-in duration-200 shadow-sm">
              
              {/* Inspector Header */}
              <div className="p-[24px_24px_20px] border-b border-[#E2DDD4] flex justify-between items-start bg-white relative">
                <button onClick={() => setSelectedReview(null)} className="absolute top-[16px] right-[16px] w-[30px] h-[30px] rounded-full bg-slate-100 flex items-center justify-center text-[#6b7280] hover:bg-slate-200 hover:text-[#0D2B55] transition-colors">&times;</button>
                
                <div className="flex items-center gap-[16px]">
                  <div className="w-[56px] h-[56px] rounded-full bg-gradient-to-br from-[#1a3d6e] to-[#2a527f] flex items-center justify-center text-[20px] font-[800] text-white shadow-md shrink-0">
                    {selectedReview.employeeId?.personalDetails?.firstName?.[0]}{selectedReview.employeeId?.personalDetails?.lastName?.[0]}
                  </div>
                  <div>
                    <h2 className="text-[22px] font-[800] text-[#0D2B55] leading-tight">
                      {selectedReview.employeeId?.personalDetails?.firstName} {selectedReview.employeeId?.personalDetails?.lastName}
                    </h2>
                    <div className="text-[13px] text-[#6b7280] mt-[2px] font-[500]">
                      {selectedReview.employeeId?.employmentDetails?.jobTitle}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inspector Body */}
              <div className="p-[24px] flex-1 overflow-y-auto bg-[#FAF8F4] custom-scrollbar">
                
                {/* Timestamp Tracking Box */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-[16px] mb-[20px] shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-blue-400 shrink-0" />
                    <div>
                      <div className="text-[10px] font-[800] text-blue-600 uppercase tracking-widest mb-[2px]">Manager Submission Time</div>
                      <div className="text-[13px] font-[700] text-[#0D2B55]">
                        {new Date(selectedReview.updatedAt || selectedReview.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(selectedReview.updatedAt || selectedReview.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-blue-200 hidden md:block"></div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold shrink-0">HR</div>
                    <div>
                      <div className="text-[10px] font-[800] text-blue-600 uppercase tracking-widest mb-[2px]">Your Review Initiated</div>
                      <div className="text-[13px] font-[700] text-[#0D2B55]">
                        {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Employee Details Grid */}
                <div className="bg-white border border-[#E2DDD4] rounded-xl p-[20px] mb-[20px] shadow-sm">
                  <h3 className="text-[10px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[16px] border-b border-[#E2DDD4] pb-[8px]">
                    Evaluation Details
                  </h3>
                  <div className="grid grid-cols-2 gap-y-[16px] gap-x-[20px]">
                    <div>
                      <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">Employee ID</div>
                      <div className="text-[14px] font-[700] text-[#0f1923] font-mono">{selectedReview.employeeId?.employeeId}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">Company Code</div>
                      <div className="text-[14px] font-[700] text-[#0f1923]">{selectedReview.employeeId?.companyCode || 'FSM'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">Line Manager</div>
                      <div className="text-[14px] font-[700] text-[#0f1923] truncate">
                        {selectedReview.managerId?.personalDetails?.firstName} {selectedReview.managerId?.personalDetails?.lastName}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">Quarter</div>
                      <div className="text-[14px] font-[800] text-[#0369A1]">{selectedReview.period?.quarter || 'Q3'} 2026</div>
                    </div>
                  </div>
                </div>

                {/* IPRF Breakdown Card */}
                <div className="bg-white border border-[#E2DDD4] rounded-xl shadow-sm overflow-hidden mb-[20px]">
                  <div 
                    className="p-[16px] border-b border-[#E2DDD4] flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setBreakdownOpen(!breakdownOpen)}
                  >
                    <div className="flex items-center gap-[12px]">
                      <div className="w-[32px] h-[32px] rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Calculator className="w-[16px] h-[16px]" />
                      </div>
                      <div>
                        <div className="text-[14px] font-[800] text-[#0D2B55]">Calculated IPRF Breakdown</div>
                        <div className="text-[11px] text-[#6b7280]">Total Score: <strong className="text-[#0D2B55]">{selectedReview.calculatedResults?.finalIprfScore?.toFixed(1) || '0.0'}</strong></div>
                      </div>
                    </div>
                    <ChevronDown className={`w-[20px] h-[20px] text-[#6b7280] transition-transform duration-200 ${breakdownOpen ? 'rotate-180 text-[#0D2B55]' : ''}`} />
                  </div>
                  
                  {breakdownOpen && (
                    <div className="p-[16px] bg-[#FAF8F4]">
                      <div className="bg-white border border-[#E2DDD4] rounded-lg p-[12px] font-mono text-[11px] text-[#6b7280] shadow-inner">
                        <div className="text-gray-400 mb-[8px]">// Σ (Rating × Weight)</div>
                        {CRITERIA.map(c => {
                          const val = selectedReview.scores?.[c.id]?.rating;
                          if (val === undefined) return null;
                          const colorClass = val === 0.0 ? 'text-red-500' : val === 0.7 ? 'text-amber-500' : val === 1.0 ? 'text-green-500' : 'text-blue-500';
                          
                          return (
                            <div key={c.id} className="flex justify-between items-center py-[4px]">
                              <span>{c.short}: <span className="font-[800] text-[#0f1923]">{val.toFixed(1)}</span> × {c.pct} =</span>
                              <span className={`font-[800] ${colorClass}`}>{(val * c.wt).toFixed(3)}</span>
                            </div>
                          );
                        })}
                        <div className="mt-[8px] pt-[8px] border-t border-[#E2DDD4] flex justify-between items-center font-[800] text-[#0D2B55] text-[12px]">
                          <span>Final Rounded IPRF →</span>
                          <span>{selectedReview.calculatedResults?.finalIprfScore?.toFixed(1) || '0.0'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Narratives */}
                <h3 className="text-[12px] font-[800] text-[#0D2B55] uppercase tracking-widest mb-[12px]">Manager Narratives</h3>
                <div className="flex flex-col gap-[12px] mb-[24px]">
                  {selectedReview.calculatedResults?.finalIprfScore >= 1.3 && (
                    <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-[16px] shadow-sm">
                      <div className="text-[11px] font-[800] text-[#92400E] uppercase tracking-widest mb-[8px] flex items-center gap-[6px]">
                        <AlertTriangle className="w-[14px] h-[14px]" /> EP Justification
                      </div>
                      <div className="text-[13px] text-[#92400E] leading-relaxed font-[500]">
                        {selectedReview.narrative?.epJustification || 'No justification provided.'}
                      </div>
                    </div>
                  )}
                  
                  {selectedReview.narrative?.generalComments && (
                    <div className="bg-white border border-[#E2DDD4] rounded-xl shadow-sm overflow-hidden flex flex-col">
                      <div className="p-[16px] border-b border-[#E2DDD4] bg-[#FAF8F4]">
                        <div className="text-[11px] font-[800] text-[#0D2B55] uppercase tracking-widest flex items-center gap-[6px]">
                          <Info className="w-[14px] h-[14px]" /> Rating Justifications
                        </div>
                      </div>
                      
                      <div className="p-[16px] text-[13px] leading-relaxed custom-scrollbar max-h-[350px] overflow-y-auto">
                        <div className="border-l-[3px] border-[#0D2B55]/20 pl-[16px] space-y-[16px]">
                          {(() => {
                            const blocks = parseNarrativeBlocks(selectedReview.narrative.generalComments);
                            const displayBlocks = showAllComments ? blocks : blocks.slice(0, 3);
                            
                            return (
                              <>
                                {displayBlocks.map((block, idx) => (
                                  <div key={idx} className="animate-in fade-in">
                                    <h4 className="font-[800] text-[#0D2B55] mb-[4px]">{block.header}</h4>
                                    {block.content.map((p, j) => (
                                      <p key={j} className="text-[#475569]">{p}</p>
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
                  )}
                </div>

                {/* HR Action Area */}
                {isEpCapReached ? (
                  <div className="bg-[#FEF2F2] border-[1.5px] border-[#FECACA] rounded-xl p-[16px] mb-[20px] shadow-sm">
                    <div className="text-[13px] font-[800] text-[#991B1B] mb-[4px] flex items-center gap-[6px]"><AlertTriangle className="w-[16px] h-[16px]" /> EP Cap Exceeded</div>
                    <div className="text-[12px] text-[#991B1B] leading-relaxed mt-[8px]">
                      You cannot approve this appraisal. The company has reached its maximum limit of 9 EP-rated employees. You must reject this appraisal back to the manager, or wait until an existing EP rating is removed.
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-[8px]">
                  <label className="text-[12px] font-[800] text-[#0D2B55] flex items-center justify-between">
                    <span>HR Review Notes</span>
                    {showReject && <span className="text-[#DC2626]">* Required for rejection</span>}
                  </label>
                  <textarea 
                    className={`w-full resize-y min-h-[100px] p-[12px_16px] border-[1.5px] rounded-xl text-[13px] text-[#0f1923] bg-white outline-none transition-colors shadow-inner ${showReject ? 'border-[#FECACA] focus:border-[#DC2626]' : 'border-[#E2DDD4] focus:border-[#0D2B55]'}`}
                    placeholder="Add notes for the Line Manager if rejecting, or internal HR notes if approving..."
                    value={hrComment}
                    onChange={(e) => setHrComment(e.target.value)}
                  />
                </div>
              </div>

              {/* Inspector Footer / Actions */}
              <div className="p-[20px_24px] border-t border-[#E2DDD4] bg-white flex items-center justify-between">
                
                {showReject ? (
                  <div className="flex items-center gap-[12px] w-full">
                    <button 
                      onClick={() => setShowReject(false)} 
                      className="p-[12px_20px] text-[13px] font-[800] text-[#0f1923] bg-white border-[2px] border-[#E2DDD4] rounded-[10px] hover:border-[#0D2B55] transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={processRejection} 
                      className="p-[12px_20px] text-[13px] font-[800] text-white bg-[#DC2626] rounded-[10px] hover:bg-[#B91C1C] transition-colors flex-1 shadow-md flex justify-center items-center gap-[8px]"
                    >
                      <Check className="w-[16px] h-[16px]" /> Confirm Rejection to Manager
                    </button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => setShowReject(true)} 
                      className="p-[12px_20px] text-[13px] font-[800] text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] hover:bg-[#FEE2E2] transition-colors"
                    >
                      &#10005; Reject
                    </button>
                    
                    <button 
                      onClick={() => processApproval(selectedReview._id)} 
                      disabled={isEpCapReached}
                      className="p-[12px_24px] text-[13px] font-[800] text-white bg-[#059669] rounded-[10px] hover:bg-[#047857] disabled:bg-[#E2DDD4] disabled:text-[#6b7280] disabled:cursor-not-allowed transition-colors shadow-md flex items-center gap-[8px]"
                    >
                      <Check className="w-[16px] h-[16px]" /> Approve & Queue for CEO
                    </button>
                  </>
                )}

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}