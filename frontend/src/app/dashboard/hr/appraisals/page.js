'use client';

import { useState, useEffect, useRef } from 'react';
import api from '../../../../lib/api';
import { Search, ChevronDown, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import usePersistentFilter from '../../../../hooks/usePersistentFilter';

const CRIT_NAMES = {
  deliveredResults: 'Delivered Expected Results',
  behaviors: 'Demonstrated Initiative',
  safeWorking: 'Demonstrated Safe Working',
  jobCompetence: 'Job Competence',
  dependability: 'Dependability',
  adaptability: 'Adaptability'
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

export default function CEOAllAppraisals() {
  const [appraisals, setAppraisals] = useState([]);
  const [staff, setStaff] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // 🚨 UPGRADE: Now holding a dictionary of LIVE CP scores for ALL quarters
  const [quarterCPs, setQuarterCPs] = useState({});
  
  const [dbQuarters, setDbQuarters] = useState([]);
  const [companyCodes, setCompanyCodes] = useState([]);
  const [managerList, setManagerList] = useState([]);
  const [availableOffices, setAvailableOffices] = useState([]);
  
  const currentYearStr = new Date().getFullYear().toString();
  
  const [search, setSearch] = usePersistentFilter('all_app_search', '');
  const [filterYear, setFilterYear] = usePersistentFilter('all_app_year', currentYearStr); 
  const [isManualYear, setIsManualYear] = useState(false);
  const [qtr, setQtr] = usePersistentFilter('all_app_qtr', '');
  const [co, setCo] = usePersistentFilter('all_app_co', '');
  const [statusFilter, setStatusFilter] = usePersistentFilter('all_app_status', '');
  const [mgrFilter, setMgrFilter] = usePersistentFilter('all_app_mgr', '');
  const [officeFilter, setOfficeFilter] = usePersistentFilter('all_app_office', '');
  
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);
  const [expandedComment, setExpandedComment] = useState(null);

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

      const allApps = appRes.data?.data || [];
      setAppraisals(allApps);

      const allUsers = usersRes.data?.data || [];
      setStaff(allUsers);

      const extractedOffices = allUsers
          .map(u => u?.employmentDetails?.officeLocation)
          .filter(location => location && typeof location === 'string' && location.trim() !== '');
      const uniqueOffices = [...new Set(extractedOffices)].sort();
      setAvailableOffices(uniqueOffices);

      const uniqueManagers = new Map();
      
      allApps.forEach(a => {
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
          } else {
            const foundMgr = allUsers.find(staffMember => staffMember._id === mId);
            if (foundMgr) {
              uniqueManagers.set(mId, `${foundMgr.personalDetails?.firstName} ${foundMgr.personalDetails?.lastName}`.trim());
            }
          }
        }
      });
      
      const mgrArray = Array.from(uniqueManagers, ([id, name]) => ({ id, name }));
      mgrArray.sort((a, b) => a.name.localeCompare(b.name));
      setManagerList(mgrArray);

      const fetchedQuarters = qtrRes.data?.data || [];
      setDbQuarters(fetchedQuarters);

      const configData = configRes.data?.data || {};
      setCompanyCodes(configData.companyCodes || []);

    } catch (error) {
      console.error('Failed to fetch appraisals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🚨 UPGRADE: Fetch ALL metrics for the selected year and calculate true CP dynamically
  useEffect(() => {
    const fetchAllYearMetrics = async () => {
      if (!filterYear) return;
      
      const newCps = {};
      const months = { Q1: 3, Q2: 6, Q3: 9, Q4: 12 };

      await Promise.all(Object.entries(months).map(async ([qName, month]) => {
        try {
          const res = await api.get(`/company-metrics/${filterYear}/${month}`);
          const mData = res.data?.data;
          
          if (mData) {
            const kpaActuals = [
              mData.financialResilience,
              mData.operationalEffectiveness,
              mData.humanCapital,
              mData.safetyEnvironment,
              mData.reputationalCapital
            ];
            
            const anyKpaEntered = kpaActuals.some(v => v !== null && v !== undefined);
            
            if (anyKpaEntered) {
              const calcBscRaw = kpaActuals.reduce((sum, val, idx) => {
                const maxPts = [120, 400, 230, 110, 27][idx];
                const pts = ((val || 0) / 100) * maxPts;
                return sum + Number(pts.toFixed(1)); 
              }, 0);
              const rawCp = calcBscRaw / 100;
              newCps[qName] = Math.round((rawCp + Number.EPSILON) * 100) / 100;
            } else if (mData.cpPct !== undefined && mData.cpPct !== null) {
              newCps[qName] = mData.cpPct;
            }
          }
        } catch (e) {
          // If a quarter isn't created yet, ignore
        }
      }));
      
      setQuarterCPs(newCps);
    };
    
    fetchAllYearMetrics();
  }, [filterYear]);

  useEffect(() => {
    // 🚨 UPGRADE: Guard clause prevents the system from wiping out the persistent qtr filter on initial mount
    if (dbQuarters.length === 0) return;

    const qtrsForSelectedYear = dbQuarters.filter(q => q.year.toString() === filterYear);
    if (qtrsForSelectedYear.length > 0) {
      const q1 = qtrsForSelectedYear.find(q => q.name.toUpperCase().includes('Q1'));
      const defaultQtr = q1 ? q1._id : qtrsForSelectedYear[0]._id;
      
      if (!qtr || !qtrsForSelectedYear.some(q => q._id === qtr)) {
        setQtr(defaultQtr);
      }
    } else {
      setQtr('');
    }
  }, [dbQuarters, filterYear]); 

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterYear, qtr, statusFilter, co, mgrFilter, officeFilter]);

  const handleYearChange = (e) => {
    setFilterYear(e.target.value);
    setQtr(''); 
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

  let dataToFilter = [...appraisals];

  if (qtr) {
    const qtrAppraisals = appraisals.filter(a => {
      const appQId = a.appraisalQuarter?._id || a.appraisalQuarter || a.period?.quarter;
      return appQId === qtr;
    });
    
    const submittedEmpIds = new Set(qtrAppraisals.map(a => a.employeeId?._id || a.employeeId));

    staff.forEach(emp => {
      if (!submittedEmpIds.has(emp._id)) {
        dataToFilter.push({
          _id: `missing-${emp._id}-${qtr}`,
          isMissing: true,
          employeeId: emp,
          managerId: emp.employmentDetails?.reportingTo,
          appraisalQuarter: qtr,
          workflow: { status: 'NOT_STARTED' },
          calculatedResults: null,
          updatedAt: null,
          createdAt: null
        });
      }
    });
  }

  const filteredData = dataToFilter.filter(a => {
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
    
    let matchesStatus = true;
    if (statusFilter !== '') {
      const st = a.workflow?.status;
      if (statusFilter === 'NOT_STARTED') {
        matchesStatus = a.isMissing || ['NOT_STARTED'].includes(st);
      } else if (statusFilter === 'DRAFT') {
        matchesStatus = ['DRAFT', 'REOPENED'].includes(st);
      } else if (statusFilter === 'SUBMITTED_TO_HR') {
        matchesStatus = ['SUBMITTED', 'UNDER_HR_REVIEW', 'APPROVED_BY_HR'].includes(st);
      } else if (statusFilter === 'WITH_CEO') {
        matchesStatus = ['WITH_CEO'].includes(st);
      } else if (statusFilter === 'APPROVED') {
        matchesStatus = ['APPROVED'].includes(st);
      } else if (statusFilter === 'NOT_APPROVED') {
        matchesStatus = ['NOT_APPROVED'].includes(st);
      } else if (statusFilter === 'ACKNOWLEDGED') {
        matchesStatus = ['ACKNOWLEDGED'].includes(st);
      }
    }
    
    return matchesSearch && matchesYear && matchesQtr && matchesStatus && matchesCo && matchesMgr && matchesOffice;
  }).sort((a, b) => {
    const ceoStatuses = ['WITH_CEO', 'APPROVED', 'ACKNOWLEDGED'];
    const isACeo = ceoStatuses.includes(a.workflow?.status) ? 1 : 0;
    const isBCeo = ceoStatuses.includes(b.workflow?.status) ? 1 : 0;

    if (isACeo !== isBCeo) {
      return isBCeo - isACeo; 
    }

    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return dateB - dateA; 
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const getQuarterName = (qId) => {
    if (!qId) return 'N/A';
    const match = dbQuarters.find(q => q._id === qId);
    return match ? `${match.name} (${match.year})` : (typeof qId === 'string' && qId.length <= 2 ? qId : 'Old Data');
  };

  const quartersForSelectedYear = dbQuarters.filter(q => q.year.toString() === filterYear);
  quartersForSelectedYear.sort((a, b) => a.name.localeCompare(b.name));

  const selectedYearNum = parseInt(filterYear) || new Date().getFullYear();
  const yearOptions = [
    selectedYearNum - 3,
    selectedYearNum - 2,
    selectedYearNum - 1,
    selectedYearNum,
    selectedYearNum + 1
  ];

  const iprfStyle = (f) => {
    if (f >= 1.3) return 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]';
    if (f >= 1.0) return 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]';
    if (f >= 0.7) return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
    return 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]';
  };

  const iprfLabel = (f) => {
    if (f >= 1.3) return 'EP'; 
    if (f >= 1.0) return 'E';
    if (f >= 0.7) return 'NI'; 
    return 'LS'; 
  };

  const StatusTag = ({ st }) => {
    if (!st) return <span className="bg-[#FAF8F4] text-[#6b7280] px-[8px] py-[3px] rounded-[6px] text-[11px] font-[700] border border-[#E2DDD4] whitespace-nowrap">UNKNOWN</span>;
    switch(st) {
      case 'NOT_STARTED': 
        return <span className="bg-[#FEF2F2] text-[#991B1B] px-[8px] py-[3px] rounded-[6px] text-[11px] font-[700] border border-[#FECACA] whitespace-nowrap">Not started</span>;
      case 'DRAFT':
      case 'REOPENED':
        return <span className="bg-[#FAF8F4] text-[#6b7280] px-[8px] py-[3px] rounded-[6px] text-[11px] font-[700] border border-[#E2DDD4] whitespace-nowrap">Saved in Draft</span>;
      case 'SUBMITTED':
      case 'APPROVED_BY_HR': 
      case 'UNDER_HR_REVIEW':
        return <span className="bg-[#DBEAFE] text-[#1E40AF] px-[8px] py-[3px] rounded-[6px] text-[11px] font-[700] border border-[#BFDBFE] whitespace-nowrap">Submitted to HR</span>;
      case 'WITH_CEO': 
        return <span className="bg-[#FEF3C7] text-[#92400E] px-[8px] py-[3px] rounded-[6px] text-[11px] font-[700] border border-[#FDE68A] whitespace-nowrap">With CEO</span>;
      case 'APPROVED': 
        return <span className="bg-[#D1FAE5] text-[#065F46] px-[8px] py-[3px] rounded-[6px] text-[11px] font-[700] border border-[#A7F3D0] whitespace-nowrap">CEO Approved</span>;
      case 'NOT_APPROVED': 
        return <span className="bg-[#FEF2F2] text-[#991B1B] px-[8px] py-[3px] rounded-[6px] text-[11px] font-[700] border border-[#FECACA] whitespace-nowrap">Rejected by CEO</span>;
      case 'ACKNOWLEDGED':
        return <span className="bg-[#F0FDF4] text-[#15803D] px-[8px] py-[3px] rounded-[6px] text-[11px] font-[800] border border-[#BBF7D0] whitespace-nowrap flex items-center gap-[4px]"><span className="text-[10px]">✓</span> Acknowledged</span>;
      default: 
        return <span className="bg-[#FAF8F4] text-[#6b7280] px-[8px] py-[3px] rounded-[6px] text-[11px] font-[700] border border-[#E2DDD4] whitespace-nowrap">UNKNOWN</span>;
    }
  };

  const handleDownloadReport = () => {
    let csvContent = "Employee Name,Employee ID,Job Title,Office Station,Company,Line Manager,Quarter,Score,Pro-Rata,Award %,Status,Last Updated Date & Time\n";
    
    filteredData.forEach(a => {
      const empName = `"${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}"`;
      const empId = `"${a.employeeId?.employeeId || ''}"`;
      const jobTitle = `"${a.employeeId?.employmentDetails?.jobTitle || ''}"`;
      const office = `"${a.employeeId?.employmentDetails?.officeLocation || 'Unassigned'}"`;
      const coCode = `"${a.employeeId?.companyCode || 'FSM'}"`;
      const mgrInfo = getManagerInfo(a.managerId);
      const mgrName = `"${mgrInfo.name}"`;
      
      const appQuarterId = a.appraisalQuarter?._id || a.appraisalQuarter || a.period?.quarter;
      const qtrNameFull = getQuarterName(appQuarterId);
      const qtrName = `"${qtrNameFull}"`;
      
      const iprf = a.calculatedResults?.finalIprfScore || 0;
      const score = `"${a.isMissing ? 'N/A' : iprf.toFixed(1)}"`;
      
      const prMonths = a.employeeId?.employmentDetails?.prorateValue || 12;
      const proRataValue = prMonths / 12;
      const proRataStr = `"${proRataValue.toFixed(3)}"`;

      // 🚨 UPGRADE: Fetch dynamic CP strictly for this row's quarter
      const qMatch = String(qtrNameFull).match(/Q[1-4]/i);
      const qKey = qMatch ? qMatch[0].toUpperCase() : null;
      const liveCp = qKey && quarterCPs[qKey] !== undefined ? quarterCPs[qKey] : null;

      let awardDisplay = '—';
      if (liveCp !== null && iprf > 0) {
        // Calculation: %Award = CP * IPRF rating
        const finalAw = liveCp * iprf;
        awardDisplay = `"${finalAw.toFixed(2)}"`;
      }
      
      let statusRaw = a.workflow?.status;
      let statusText = 'UNKNOWN';
      if (a.isMissing || ['NOT_STARTED'].includes(statusRaw)) statusText = 'Not started';
      else if (['DRAFT', 'REOPENED'].includes(statusRaw)) statusText = 'Saved in Draft';
      else if (['SUBMITTED', 'UNDER_HR_REVIEW', 'APPROVED_BY_HR'].includes(statusRaw)) statusText = 'Submitted to HR';
      else if (statusRaw === 'WITH_CEO') statusText = 'With CEO/ Pending to CEO';
      else if (statusRaw === 'APPROVED') statusText = 'CEO Approved';
      else if (statusRaw === 'NOT_APPROVED') statusText = 'Rejected by CEO/ Not Approve by CEO';
      else if (statusRaw === 'ACKNOWLEDGED') statusText = 'Emp. Acknowledged';
      const status = `"${statusText}"`;
      
      const updated = `"${a.updatedAt ? new Date(a.updatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}"`;

      csvContent += `${empName},${empId},${jobTitle},${office},${coCode},${mgrName},${qtrName},${score},${proRataStr},${awardDisplay},${status},${updated}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CEO_Appraisals_Report_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        content = content.replace(/\s*\d+\.\s*$/, ''); 
        comments[label.key] = content.trim();
      } else {
        comments[label.key] = combinedString.substring(start).trim();
      }
    });

    return comments;
  };

  return (
    <div className="max-w-6xl mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px] flex flex-col md:flex-row justify-between items-start md:items-end gap-[12px]">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
            &#128196; All Appraisals
          </div>
          <div className="text-[13px] text-[#6b7280]">Full read-only view of every appraisal — all staff, all quarters</div>
        </div>
        
        <div className="flex gap-[8px]">
          <button onClick={fetchData} className="text-[13px] font-[700] text-[#0D2B55] bg-white border border-[#E2DDD4] py-[10px] px-[16px] rounded-[8px] hover:bg-slate-50 transition-colors shadow-sm">
            &#8635; Refresh
          </button>
          <button 
            onClick={handleDownloadReport} 
            disabled={loading || filteredData.length === 0}
            className="py-[10px] px-[16px] bg-[#059669] hover:bg-[#047857] text-white rounded-[8px] text-[13px] font-[700] transition-colors flex items-center gap-[6px] shadow-sm disabled:opacity-50"
          >
            &#11015; Download Filtered Report
          </button>
        </div>
      </div>

      {/* Filter Bar */}
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
                if (e.target.value) {
                  setFilterYear(e.target.value);
                  setQtr(''); 
                }
                setIsManualYear(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.target.value) {
                    setFilterYear(e.target.value);
                    setQtr(''); 
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
                else handleYearChange(e);
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

        {/* Appraisal Status */}
        <SearchableDropdown 
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Appraisal Status"
          widthClass="w-[200px]"
          options={[
            { value: 'SUBMITTED_TO_HR', label: 'Submitted to HR' },
            { value: 'WITH_CEO', label: 'With CEO/ Pending to CEO' },
            { value: 'APPROVED', label: 'CEO Approved' },
            { value: 'ACKNOWLEDGED', label: 'Emp. Acknowledged' },
            { value: 'NOT_STARTED', label: 'Not started' },
            { value: 'NOT_APPROVED', label: 'Rejected by CEO/ Not Approve by CEO' },
            { value: 'DRAFT', label: 'Saved in Draft' },
          ]}
        />

        {/* All Office Locations */}
        <SearchableDropdown 
          value={officeFilter}
          onChange={setOfficeFilter}
          placeholder="All Office Locations"
          widthClass="w-[180px]"
          options={availableOffices.map(o => ({ value: o, label: o }))}
        />

        {/* All Line Managers */}
        <SearchableDropdown 
          value={mgrFilter}
          onChange={setMgrFilter}
          placeholder="All Line Managers"
          widthClass="w-[190px]"
          options={managerList.map(m => ({ value: m.id, label: m.name }))}
        />
        
        {/* All Company */}
        <select value={co} onChange={e => setCo(e.target.value)} className="py-[10px] px-[12px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] text-[#0f1923] outline-none cursor-pointer w-[120px]">
          <option value="">All Company</option>
          {companyCodes.map(code => (
             <option key={`co-${code}`} value={code}>{code}</option>
          ))}
        </select>
      </div>

      {/* Formula Info Banner */}
      <div className="bg-[#F8FAFC] border border-[#E0E7FF] rounded-[10px] p-[12px_16px] mb-[20px] flex items-start sm:items-center gap-[10px] shadow-sm">
        <div className="text-[16px] leading-none">&#8505;</div>
        <div className="text-[12px] text-[#475569]">
          <strong className="text-[#0D2B55] font-[800]">Award Calculation:</strong> The final award percentage is calculated using the formula: <span className="font-mono text-[#1E40AF] bg-[#EFF6FF] px-[6px] py-[2px] rounded-[4px] font-[700] border border-[#BFDBFE]">Award = Quarterly CP (Company Performance) × IPRF Rating Score</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-[#FAF8F4] border-b border-[#E2DDD4] text-[10px] font-[800] text-[#6b7280] uppercase tracking-[.06em]">
              <tr>
                <th className="p-[12px_16px]">Employee</th>
                <th className="p-[12px_16px] text-[#C9A84C]">Job Title</th>
                <th className="p-[12px_16px] text-center">Co.</th>
                <th className="p-[12px_16px] text-center">Quarter</th>
                <th className="p-[12px_16px] text-center">IPRF</th>
                <th className="p-[12px_16px] text-center">Pro-Rata</th>
                <th className="p-[12px_16px] text-center">Award %</th>
                <th className="p-[12px_16px] text-center">Status</th>
                <th className="p-[12px_16px] text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4] text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-[48px] text-center text-[#6b7280] font-[600] animate-pulse">
                    Loading Appraisals Database...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-[48px] text-center text-[#6b7280]">
                    <div className="text-[36px] mb-[12px] opacity-70">&#128269;</div>
                    <div className="text-[15px] font-[700] text-[#0D2B55] mb-[6px]">No matches found</div>
                    <div className="text-[13px]">Try adjusting your search or filters to find what you're looking for.</div>
                  </td>
                </tr>
              ) : (
                currentItems.map((a, i) => {
                  const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`.trim() || 'Unknown';
                  const init1 = a.employeeId?.personalDetails?.firstName?.[0] || '';
                  const init2 = a.employeeId?.personalDetails?.lastName?.[0] || '';
                  const coCode = a.employeeId?.companyCode || 'FSM';
                  const jobTitle = a.employeeId?.employmentDetails?.jobTitle || 'Staff';
                  
                  const appQuarterId = a.appraisalQuarter?._id || a.appraisalQuarter || a.period?.quarter;
                  const qtrNameFull = getQuarterName(appQuarterId);
                  
                  const iprf = a.calculatedResults?.finalIprfScore || 0;
                  const prMonths = a.employeeId?.employmentDetails?.prorateValue || 12;
                  const proRataValue = prMonths / 12;
                  
                  // 🚨 UPGRADE: Fetch dynamic CP strictly for this row's quarter
                  const qMatch = String(qtrNameFull).match(/Q[1-4]/i);
                  const qKey = qMatch ? qMatch[0].toUpperCase() : null;
                  const liveCp = qKey && quarterCPs[qKey] !== undefined ? quarterCPs[qKey] : null;

                  let awardDisplay = '—';
                  if (liveCp !== null && iprf > 0) {
                    // Calculation: %Award = CP * IPRF rating
                    const finalAw = liveCp * iprf;
                    awardDisplay = `${finalAw.toFixed(2)}`;
                  }

                  return (
                    <tr key={a._id} className={`${a.isMissing ? 'bg-red-50/30' : i % 2 === 1 ? 'bg-[#FAF8F4]/40' : 'bg-white'} hover:bg-[#FAF8F4] transition-colors`}>
                      <td className="p-[12px_16px] whitespace-nowrap">
                        <div className="flex items-center gap-[9px]">
                          <div className="w-[30px] h-[30px] rounded-[6px] bg-[#E2DDD4] text-[#0f1923] font-[800] flex items-center justify-center text-[11px]">
                            {init1}{init2}
                          </div>
                          <div>
                            <div className="font-[600] text-[#0D2B55]">{empName}</div>
                            {!a.isMissing && a.updatedAt && (
                               <div className="text-[10px] text-[#6b7280]">
                                 {new Date(a.updatedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                               </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-[12px] text-[#0f1923]">
                        {jobTitle}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <span className="bg-[#EFF6FF] text-[#0369A1] px-[8px] py-[3px] rounded-[4px] text-[10px] font-[800] border border-[#BFDBFE]">
                          {coCode}
                        </span>
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <span className="bg-[#FEF3C7] text-[#92400E] px-[8px] py-[3px] rounded-[4px] text-[10px] font-[800] border border-[#FDE68A]">
                          {qtrNameFull}
                        </span>
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        {a.isMissing ? (
                           <span className="text-[#6b7280] font-bold">—</span>
                        ) : iprf > 0 ? (
                          <span className={`px-[8px] py-[4px] rounded-[6px] text-[11px] font-[800] border ${iprfStyle(iprf)}`}>
                            {iprf.toFixed(1)} ({iprfLabel(iprf)})
                          </span>
                        ) : (
                          <span className="text-[11px] font-[800] text-[#6b7280">—</span>
                        )}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center font-[600] text-[#0D2B55]">
                        {proRataValue.toFixed(3)}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center font-[700] text-[#059669]">
                        {a.isMissing ? '—' : awardDisplay}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <StatusTag st={a.workflow?.status} />
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        {a.isMissing ? (
                           <span className="text-[10px] font-bold text-red-400 italic">No Data</span>
                        ) : (
                         <button 
                            onClick={() => {
                              setSelectedAppraisal(a);
                              setExpandedComment(null);
                            }}
                            className="bg-white hover:bg-[#FAF8F4] text-[#0f1923] border border-[#E2DDD4] px-[12px] py-[5px] text-[11px] font-[700] rounded-[6px] transition-colors shadow-sm"
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table Pagination Footer */}
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

      {/* Read-Only Audit View Modal */}
      {selectedAppraisal && !selectedAppraisal.isMissing && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 backdrop-blur-sm z-[200] flex items-center justify-center p-[20px] animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[700px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden slide-in-from-bottom-4">
            
            <div className="p-[20px_24px] border-b border-[#E2DDD4] flex justify-between items-center bg-[#FAF8F4] relative">
              <h2 className="text-[18px] font-[800] text-[#0D2B55]">&#128269; Appraisal Audit View</h2>
              <button onClick={() => setSelectedAppraisal(null)} className="absolute top-[16px] right-[16px] w-[30px] h-[30px] rounded-full bg-white border border-[#E2DDD4] flex items-center justify-center text-[#6b7280] hover:border-[#0D2B55] hover:text-[#0D2B55] transition-colors">&times;</button>
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
                    {selectedAppraisal.employeeId?.employmentDetails?.jobTitle} &middot; ID: {selectedAppraisal.employeeId?.employeeId}
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
                  <div className="text-[22px] font-[800] text-[#059669]">
                    {(() => {
                      const iprf = selectedAppraisal.calculatedResults?.finalIprfScore || 0;
                      
                      const appQuarterId = selectedAppraisal.appraisalQuarter?._id || selectedAppraisal.appraisalQuarter || selectedAppraisal.period?.quarter;
                      const qtrNameFull = getQuarterName(appQuarterId);
                      const qMatch = String(qtrNameFull).match(/Q[1-4]/i);
                      const qKey = qMatch ? qMatch[0].toUpperCase() : null;
                      const liveCp = qKey && quarterCPs[qKey] !== undefined ? quarterCPs[qKey] : null;

                      let displayAward = '—';
                      if (liveCp !== null && iprf > 0) {
                        // Calculation: %Award = CP * IPRF rating
                        const finalAw = liveCp * iprf;
                        displayAward = `${finalAw.toFixed(2)}`;
                      }
                      return displayAward;
                    })()}
                  </div>
                </div>
                <div className="bg-[#FAF8F4] p-[12px_16px] rounded-[10px] border border-[#E2DDD4]">
                  <div className="text-[10px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">Period</div>
                  <div className="text-[18px] font-[800] text-[#0f1923] truncate">
                    {getQuarterName(selectedAppraisal.appraisalQuarter?._id || selectedAppraisal.appraisalQuarter || selectedAppraisal.period?.quarter)}
                  </div>
                </div>
                <div className="bg-[#FAF8F4] p-[12px_16px] rounded-[10px] border border-[#E2DDD4]">
                  <div className="text-[10px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">Company</div>
                  <div className="text-[22px] font-[800] text-[#0f1923]">{selectedAppraisal.employeeId?.companyCode || 'FSM'}</div>
                </div>
              </div>

              <h4 className="text-[12px] font-[800] text-[#0D2B55] mb-[12px] uppercase tracking-widest">Criteria Breakdown</h4>
              
              {(() => {
                const parsedComments = parseComments(selectedAppraisal.narrative?.generalComments);
                const hasParsedComments = Object.keys(parsedComments).length > 0;
                
                return (
                  <>
                    <div className="bg-white border border-[#E2DDD4] rounded-[10px] overflow-hidden mb-[24px]">
                      {Object.entries(CRIT_NAMES).map(([key, name]) => {
                        const rating = selectedAppraisal.scores?.[key]?.rating;
                        const color = rating === 0.0 ? 'text-[#991B1B]' : rating === 0.7 ? 'text-[#92400E]' : rating === 1.0 ? 'text-[#065F46]' : rating === 1.3 ? 'text-[#1E40AF]' : 'text-[#6b7280]';
                        const comment = parsedComments[key];
                        const isExpanded = expandedComment === key;
                        
                        return (
                          <div key={key} className="border-b border-[#E2DDD4] last:border-0">
                            <div 
                              className="flex justify-between items-center p-[10px_16px] cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => setExpandedComment(isExpanded ? null : key)}
                            >
                              <div className="font-[500] text-[#0f1923] text-[13px] flex items-center gap-2">
                                {name}
                                {comment && <MessageSquare className="w-3.5 h-3.5 text-blue-500" />}
                              </div>
                              <div className="flex items-center gap-3 text-right">
                                <span className={`font-[800] ${color} text-[13px]`}>{rating !== undefined ? rating.toFixed(1) : '—'}</span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                            {isExpanded && comment && (
                              <div className="p-[0_16px_12px_16px] text-[12px] text-[#6b7280] italic leading-[1.6] animate-in fade-in slide-in-from-top-1">
                                <span className="font-[700] not-italic text-[#0D2B55] text-[10px] uppercase tracking-widest block mb-[2px]">Manager Justification:</span>
                                "{comment}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-col gap-[12px]">
                      {selectedAppraisal.narrative?.epJustification && (
                        <div className="bg-[#FFFBEB] border-[1.5px] border-[#FDE68A] rounded-[10px] p-[16px]">
                          <div className="text-[11px] font-[800] text-[#92400E] uppercase tracking-[.06em] mb-[6px] flex items-center gap-[6px]">
                            <span>⭐</span> EP Justification
                          </div>
                          <div className="text-[13px] text-[#92400E] leading-relaxed font-[500] whitespace-pre-wrap">
                            {selectedAppraisal.narrative.epJustification}
                          </div>
                        </div>
                      )}
                      
                      {selectedAppraisal.narrative?.generalComments && !hasParsedComments && (
                        <div className="bg-[#F8FAFC] border border-[#E0E7FF] rounded-[10px] p-[16px]">
                          <div className="text-[11px] font-[800] text-[#0369A1] uppercase tracking-[.06em] mb-[6px]">Manager Comments</div>
                          <div className="text-[13px] text-[#0f1923] leading-relaxed italic whitespace-pre-wrap">
                            "{selectedAppraisal.narrative.generalComments}"
                          </div>
                        </div>
                      )}

                      {selectedAppraisal.narrative?.hrComments && (
                        <div className="bg-[#FAF5FF] border border-[#E9D5FF] rounded-[10px] p-[16px]">
                          <div className="text-[11px] font-[800] text-[#6B21A8] uppercase tracking-[.06em] mb-[6px]">HR / Admin Notes</div>
                          <div className="text-[13px] text-[#0f1923] leading-relaxed italic whitespace-pre-wrap">
                            "{selectedAppraisal.narrative.hrComments}"
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
              
              <div className="mt-[24px] pt-[16px] border-t border-[#E2DDD4] flex items-center justify-between">
                <StatusTag st={selectedAppraisal.workflow?.status} />
                <div className="text-[11px] text-[#6b7280] font-mono font-[600]">REF: {selectedAppraisal.appraisalRef || selectedAppraisal._id}</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}