'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';

export default function HRAllAppraisals() {
  const [appraisals, setAppraisals] = useState([]);
  const [staff, setStaff] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [dbQuarters, setDbQuarters] = useState([]);
  const [companyCodes, setCompanyCodes] = useState([]);
  const [managerList, setManagerList] = useState([]);

  const [search, setSearch] = useState('');
  
  // 🚨 UPGRADED: Added a separate state for the selected Year filter
  const [filterYear, setFilterYear] = useState(''); 
  const [qtr, setQtr] = useState(''); 
  
  const [statusFilter, setStatusFilter] = useState('');
  const [co, setCo] = useState('');
  const [mgrFilter, setMgrFilter] = useState('');
  
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);

  useEffect(() => {
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
        
        const activeQ = fetchedQuarters.find(q => new Date(q.endDate) >= new Date() && !q.isLocked);
        if (activeQ) {
          // 🚨 UPGRADED: Auto-select the year of the active quarter
          setFilterYear(activeQ.year.toString());
          setQtr(activeQ._id);
        }

        const configData = configRes.data?.data || {};
        setCompanyCodes(configData.companyCodes || ['FSM', 'CDU', 'NAR', 'GUM']); 

      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 🚨 UPGRADED: Handle Year Change - reset the quarter when the year changes
  const handleYearChange = (e) => {
    setFilterYear(e.target.value);
    setQtr(''); 
  };

  const StatusTag = ({ st }) => {
    if (!st) return <span className="bg-[#FAF8F4] text-[#6b7280] px-[8px] py-[3px] rounded-full text-[11px] font-[700] uppercase tracking-wider border border-[#E2DDD4]">UNKNOWN</span>;
    switch(st) {
      case 'NOT_STARTED': return <span className="bg-[#FEF2F2] text-[#991B1B] px-[8px] py-[3px] rounded-full text-[11px] font-[700] uppercase tracking-wider border border-[#FECACA]">NOT STARTED</span>;
      case 'DRAFT': return <span className="bg-[#FAF8F4] text-[#6b7280] px-[8px] py-[3px] rounded-full text-[11px] font-[700] uppercase tracking-wider border border-[#E2DDD4]">DRAFT</span>;
      case 'SUBMITTED': return <span className="bg-[#FEF3C7] text-[#92400E] px-[8px] py-[3px] rounded-full text-[11px] font-[700] uppercase tracking-wider border border-[#FDE68A]">AT HR</span>;
      case 'UNDER_HR_REVIEW': return <span className="bg-[#DBEAFE] text-[#1E40AF] px-[8px] py-[3px] rounded-full text-[11px] font-[700] uppercase tracking-wider border border-[#BFDBFE]">IN REVIEW</span>;
      case 'APPROVED_BY_HR': return <span className="bg-[#D1FAE5] text-[#065F46] px-[8px] py-[3px] rounded-full text-[11px] font-[700] uppercase tracking-wider border border-[#A7F3D0]">HR APPROVED</span>;
      case 'WITH_CEO': return <span className="bg-[#EDE9FE] text-[#4C1D95] px-[8px] py-[3px] rounded-full text-[11px] font-[700] uppercase tracking-wider border border-[#DDD6FE]">WITH CEO</span>;
      case 'APPROVED': return <span className="bg-[#D1FAE5] text-[#065F46] px-[8px] py-[3px] rounded-full text-[11px] font-[700] uppercase tracking-wider border border-[#A7F3D0]">CEO APPROVED</span>;
      case 'REOPENED': return <span className="bg-[#FEF2F2] text-[#991B1B] px-[8px] py-[3px] rounded-full text-[11px] font-[700] uppercase tracking-wider border border-[#FECACA]">REOPENED</span>;
      case 'NOT_APPROVED': return <span className="bg-[#FEF2F2] text-[#991B1B] px-[8px] py-[3px] rounded-full text-[11px] font-[700] uppercase tracking-wider border border-[#FECACA]">REJECTED</span>;
      default: return <span className="bg-[#FAF8F4] text-[#6b7280] px-[8px] py-[3px] rounded-full text-[11px] font-[700] uppercase tracking-wider border border-[#E2DDD4]">{st}</span>;
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

  const filtered = dataToFilter.filter(a => {
    const emp = a.employeeId?.personalDetails;
    const empName = `${emp?.firstName || ''} ${emp?.lastName || ''}`.toLowerCase();
    const empIdStr = (a.employeeId?.employeeId || '').toLowerCase();
    
    const appQuarterId = a.appraisalQuarter?._id || a.appraisalQuarter || a.period?.quarter;
    const mgrInfo = getManagerInfo(a.managerId);

    const matchesSearch = search === '' || empName.includes(search.toLowerCase()) || empIdStr.includes(search.toLowerCase());
    const matchesQtr = qtr === '' || appQuarterId === qtr;
    
    // 🚨 UPGRADED: Only show appraisals for the selected year if a quarter isn't specifically chosen
    const appYear = a.reviewYear || a.appraisalQuarter?.year;
    const matchesYear = filterYear === '' || (appYear && appYear.toString() === filterYear) || matchesQtr;

    const matchesCo = co === '' || a.employeeId?.companyCode === co;
    const matchesMgr = mgrFilter === '' || mgrInfo.id === mgrFilter;
    
    let matchesStatus = true;
    if (statusFilter !== '') {
      if (statusFilter === 'NOT_SUBMITTED') {
        matchesStatus = a.workflow?.status === 'DRAFT' || a.workflow?.status === 'NOT_STARTED';
      } else {
        matchesStatus = a.workflow?.status === statusFilter;
      }
    }
    
    return matchesSearch && matchesYear && matchesQtr && matchesStatus && matchesCo && matchesMgr;
  });

  const getQuarterName = (qId) => {
    if (!qId) return 'N/A';
    const match = dbQuarters.find(q => q._id === qId);
    return match ? `${match.name} (${match.year})` : (typeof qId === 'string' && qId.length <= 2 ? qId : 'Old Data');
  };

  // 🚨 UPGRADED: Dynamically extract unique years and currently available quarters for that year
  const availableYears = [...new Set(dbQuarters.map(q => q.year))].sort((a, b) => b - a);
  const quartersForSelectedYear = dbQuarters.filter(q => q.year.toString() === filterYear);

  return (
    <div className="max-w-6xl mx-auto pb-[60px] font-sans">
      
      <div className="mb-[20px] flex justify-between items-end">
        <div>
          <h1 className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">&#128203; HR Tracking & Master List</h1>
          <p className="text-[13px] text-[#6b7280]">View submitted appraisals or track missing submissions by Line Manager</p>
        </div>
      </div>

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
        
        <select value={mgrFilter} onChange={e => setMgrFilter(e.target.value)} className="py-[10px] px-[12px] bg-[#F8FAFC] border border-[#E2DDD4] rounded-[8px] text-[13px] font-[600] text-[#0f1923] outline-none cursor-pointer w-[180px]">
          <option value="">All Managers</option>
          {managerList.map(mgr => (
             <option key={`mgr-${mgr.id}`} value={mgr.id}>{mgr.name}</option>
          ))}
        </select>
        
        {/* 🚨 UPGRADED: Two-step Year & Quarter Filtering */}
        <div className="flex gap-[6px]">
          <select value={filterYear} onChange={handleYearChange} className="py-[10px] px-[12px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] font-[700] text-[#0D2B55] outline-none cursor-pointer w-[100px]">
            <option value="">All Years</option>
            {availableYears.map(y => (
               <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select 
            value={qtr} 
            onChange={e => setQtr(e.target.value)} 
            disabled={!filterYear}
            className={`py-[10px] px-[12px] border rounded-[8px] text-[13px] outline-none transition-colors w-[140px] ${filterYear ? 'bg-white border-[#E2DDD4] text-[#0f1923] cursor-pointer' : 'bg-slate-50 border-[#E2DDD4] text-[#94a3b8] cursor-not-allowed'}`}
          >
            <option value="">All Quarters</option>
            {quartersForSelectedYear.map(q => (
               <option key={q._id} value={q._id}>{q.name}</option>
            ))}
          </select>
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="py-[10px] px-[12px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] text-[#0f1923] outline-none cursor-pointer w-[160px]">
          <option value="">Appraisal Status</option>
          <option value="SUBMITTED">Submitted to HR</option>
          <option value="APPROVED_BY_HR">Approved by HR</option>
          <option value="WITH_CEO">With CEO</option>
          <option value="APPROVED">CEO Approved</option>
          <option value="NOT_SUBMITTED" className="font-bold text-red-700">Not Submitted (Missing)</option>
        </select>
        
        <select value={co} onChange={e => setCo(e.target.value)} className="py-[10px] px-[12px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] text-[#0f1923] outline-none cursor-pointer w-[120px]">
          <option value="">All Co.</option>
          {companyCodes.map(code => (
             <option key={`co-${code}`} value={code}>{code}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-[14px] border border-[#E2DDD4] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-[#FAF8F4] border-b border-[#E2DDD4] text-[10px] font-[800] text-[#6b7280] uppercase tracking-[.06em]">
              <tr>
                <th className="p-[12px_16px]">Employee</th>
                <th className="p-[12px_16px]">Line Manager</th>
                <th className="p-[12px_16px] text-center">Company</th>
                <th className="p-[12px_16px] text-center">Quarter</th>
                <th className="p-[12px_16px] text-center">Score</th>
                <th className="p-[12px_16px] text-center">Status</th>
                <th className="p-[12px_16px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4] text-[13px]">
              {loading ? (
                <tr><td colSpan="7" className="p-[32px] text-center text-[#6b7280] animate-pulse font-[600]">Processing database records...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="p-[32px] text-center text-[#6b7280] font-[600]">No records match your filters.</td></tr>
              ) : (
                filtered.map(a => {
                  const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`;
                  const mgrInfo = getManagerInfo(a.managerId);
                  const coCode = a.employeeId?.companyCode || 'FSM';
                  const appQuarterId = a.appraisalQuarter?._id || a.appraisalQuarter || a.period?.quarter;
                  
                  return (
                    <tr key={a._id} className={`${a.isMissing ? 'bg-red-50/30' : 'hover:bg-[#FAF8F4]'} transition-colors`}>
                      <td className="p-[12px_16px]">
                        <div className="font-[700] text-[#0D2B55]">{empName}</div>
                        <div className="text-[11px] text-[#6b7280]">
                          {a.employeeId?.employmentDetails?.jobTitle} 
                          {!a.isMissing && a.updatedAt && ` · ${new Date(a.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </div>
                      </td>
                      <td className="p-[12px_16px] text-[#0f1923] text-[12px] font-[600]">{mgrInfo.name}</td>
                      <td className="p-[12px_16px] text-center">
                        <span className={`text-[10px] font-[700] px-[8px] py-[3px] rounded-full uppercase tracking-wide
                          ${coCode === 'FSM' ? 'bg-[#DBEAFE] text-[#1E40AF]' : 
                            coCode === 'CDU' ? 'bg-[#D1FAE5] text-[#065F46]' : 
                            coCode === 'NAR' ? 'bg-[#FEF3C7] text-[#92400E]' : 
                            'bg-[#EDE9FE] text-[#4C1D95]'}`}>
                          {coCode}
                        </span>
                      </td>
                      <td className="p-[12px_16px] text-center font-[600] text-[#0f1923]">{getQuarterName(appQuarterId)}</td>
                      <td className="p-[12px_16px] text-center">
                        {a.isMissing ? (
                          <span className="text-[#6b7280] font-bold">—</span>
                        ) : (
                          <span className="font-[800] text-[#1E40AF] bg-[#DBEAFE] px-[8px] py-[3px] rounded-[6px] border border-[#BFDBFE]">
                            {a.calculatedResults?.finalIprfScore?.toFixed(1) || '0.0'}
                          </span>
                        )}
                      </td>
                      <td className="p-[12px_16px] text-center"><StatusTag st={a.workflow?.status} /></td>
                      <td className="p-[12px_16px] text-right">
                        {a.isMissing ? (
                           <span className="text-[10px] font-bold text-red-400 italic">No Data</span>
                        ) : (
                          <button onClick={() => setSelectedAppraisal(a)} className="text-[11px] font-[700] text-[#0f1923] bg-white border border-[#E2DDD4] px-[12px] py-[6px] rounded-[6px] hover:border-[#0D2B55] hover:text-[#0D2B55] transition-colors shadow-sm">
                            Inspect &rarr;
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAppraisal && !selectedAppraisal.isMissing && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 backdrop-blur-sm z-[200] flex items-center justify-center p-[20px] animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[700px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden slide-in-from-bottom-4">
            
            <div className="p-[20px_24px] border-b border-[#E2DDD4] flex justify-between items-center bg-[#FAF8F4] relative">
              <h2 className="text-[18px] font-[800] text-[#0D2B55]">&#128269; Appraisal Audit View</h2>
              <button onClick={() => setSelectedAppraisal(null)} className="absolute top-[16px] right-[16px] w-[30px] h-[30px] rounded-full bg-white border border-[#E2DDD4] flex items-center justify-center text-[#6b7280] hover:border-[#0D2B55] hover:text-[#0D2B55] transition-colors">&times;</button>
            </div>
            
            <div className="p-[24px] overflow-y-auto">
              
              <div className="flex items-center gap-[16px] mb-[24px] pb-[20px] border-b border-[#E2DDD4]">
                <div className="w-[56px] h-[56px] rounded-full bg-gradient-to-br from-[#1a3d6e] to-[#2a527f] text-white flex items-center justify-center text-[20px] font-[800] shadow-sm">
                  {selectedAppraisal.employeeId?.personalDetails?.firstName?.[0] || ''}{selectedAppraisal.employeeId?.personalDetails?.lastName?.[0] || ''}
                </div>
                <div>
                  <h3 className="text-[20px] font-[800] text-[#0D2B55] leading-tight">
                    {selectedAppraisal.employeeId?.personalDetails?.firstName} {selectedAppraisal.employeeId?.personalDetails?.lastName}
                  </h3>
                  <div className="text-[13px] text-[#6b7280] mt-[2px] font-[500]">
                    {selectedAppraisal.employeeId?.employmentDetails?.jobTitle} &middot; Last updated {new Date(selectedAppraisal.updatedAt || selectedAppraisal.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(selectedAppraisal.updatedAt || selectedAppraisal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  <div className="text-[18px] font-[800] text-[#0f1923] truncate">{getQuarterName(selectedAppraisal.appraisalQuarter?._id || selectedAppraisal.appraisalQuarter || selectedAppraisal.period?.quarter)}</div>
                </div>
                <div className="bg-[#FAF8F4] p-[12px_16px] rounded-[10px] border border-[#E2DDD4]">
                  <div className="text-[10px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">Company</div>
                  <div className="text-[22px] font-[800] text-[#0f1923]">{selectedAppraisal.employeeId?.companyCode || 'FSM'}</div>
                </div>
              </div>

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