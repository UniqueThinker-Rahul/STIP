'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';

const CRIT_NAMES = {
  deliveredResults: 'Delivered Expected Results',
  behaviors: 'Demonstrated Initiative',
  safeWorking: 'Demonstrated Safe Working',
  jobCompetence: 'Job Competence',
  dependability: 'Dependability',
  adaptability: 'Adaptability'
};

export default function AllAppraisals() {
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🚨 UPGRADE: Dynamic state for filters
  const [dbQuarters, setDbQuarters] = useState([]);
  const [companyCodes, setCompanyCodes] = useState([]);

  const [search, setSearch] = useState('');
  const [qtr, setQtr] = useState(''); // Default to empty (All) instead of hardcoded 'Q3'
  const [statusFilter, setStatusFilter] = useState('');
  const [co, setCo] = useState('');
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 🚨 UPGRADE: Fetch Appraisals AND dynamic configurations
        const [appRes, qtrRes, configRes] = await Promise.all([
          api.get('/appraisals').catch(() => ({ data: { data: [] } })),
          api.get('/quarters').catch(() => ({ data: { data: [] } })),
          api.get('/config/dropdowns').catch(() => ({ data: { data: {} } }))
        ]);
        
        setAppraisals(appRes.data?.data || []);
        
        const fetchedQuarters = qtrRes.data?.data || [];
        setDbQuarters(fetchedQuarters);
        
        // Find an active quarter to default the filter to, if none, leave blank
        const activeQ = fetchedQuarters.find(q => new Date(q.endDate) >= new Date() && !q.isLocked);
        if (activeQ) setQtr(activeQ._id);

        const configData = configRes.data?.data || {};
        setCompanyCodes(configData.companyCodes || ['FSM', 'CDU', 'NAR', 'GUM']); // Safe fallback

      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const StatusTag = ({ st }) => {
    if (!st) return <span className="bg-[#FAF8F4] text-[#6b7280] px-[8px] py-[3px] rounded-full text-[11px] font-[700] uppercase tracking-wider border border-[#E2DDD4]">UNKNOWN</span>;
    switch(st) {
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

  const filtered = appraisals.filter(a => {
    const emp = a.employeeId?.personalDetails;
    const empName = `${emp?.firstName || ''} ${emp?.lastName || ''}`.toLowerCase();
    const empIdStr = (a.employeeId?.employeeId || '').toLowerCase();
    
    // 🚨 UPGRADE: Filter matching based on DB Quarter ID instead of string 'Q3'
    const appQuarterId = a.appraisalQuarter?._id || a.appraisalQuarter || a.period?.quarter;

    const matchesSearch = search === '' || empName.includes(search.toLowerCase()) || empIdStr.includes(search.toLowerCase());
    const matchesQtr = qtr === '' || appQuarterId === qtr;
    const matchesStatus = statusFilter === '' || a.workflow?.status === statusFilter;
    const matchesCo = co === '' || a.employeeId?.companyCode === co;
    
    return matchesSearch && matchesQtr && matchesStatus && matchesCo;
  });

  // Helper to display Quarter name in table
  const getQuarterName = (qId) => {
    if (!qId) return 'N/A';
    const match = dbQuarters.find(q => q._id === qId);
    return match ? match.name : (typeof qId === 'string' && qId.length <= 2 ? qId : 'Old Data');
  };

  return (
    <div className="max-w-6xl mx-auto pb-[60px] font-sans">
      
      <div className="mb-[20px] flex justify-between items-end">
        <div>
          <h1 className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">&#128203; Appraisal Master List</h1>
          <p className="text-[13px] text-[#6b7280]">View, filter, and audit all STIP records</p>
        </div>
      </div>

      <div className="bg-white rounded-[14px] border border-[#E2DDD4] shadow-sm p-[16px] mb-[20px] flex flex-wrap gap-[12px]">
        <div className="flex-1 min-w-[200px] relative">
          <input 
            type="text" 
            placeholder="Search name or ID..." 
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-[36px] pr-[16px] py-[10px] bg-[#FAF8F4] border border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
          />
          <span className="absolute left-[12px] top-[10px] text-[#6b7280] text-[16px] leading-none">&#128269;</span>
        </div>
        
        {/* 🚨 UPGRADED: Dynamic Quarter Filter */}
        <select value={qtr} onChange={e => setQtr(e.target.value)} className="py-[10px] px-[12px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] text-[#0f1923] outline-none cursor-pointer w-[160px]">
          <option value="">All Quarters</option>
          {dbQuarters.map(q => (
             <option key={q._id} value={q._id}>{q.name} ({q.year})</option>
          ))}
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="py-[10px] px-[12px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] text-[#0f1923] outline-none cursor-pointer w-[160px]">
          <option value="">All Statuses</option>
          <option value="SUBMITTED">At HR</option>
          <option value="APPROVED_BY_HR">Approved by HR</option>
          <option value="WITH_CEO">With CEO</option>
          <option value="APPROVED">CEO Approved</option>
          <option value="DRAFT">Drafts</option>
        </select>
        
        {/* 🚨 UPGRADED: Dynamic Company Filter */}
        <select value={co} onChange={e => setCo(e.target.value)} className="py-[10px] px-[12px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] text-[#0f1923] outline-none cursor-pointer w-[140px]">
          <option value="">All Companies</option>
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
                <tr><td colSpan="7" className="p-[32px] text-center text-[#6b7280] animate-pulse font-[600]">Loading master list...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="p-[32px] text-center text-[#6b7280] font-[600]">No records match your filters.</td></tr>
              ) : (
                filtered.map(a => {
                  const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`;
                  const mgrName = `${a.managerId?.personalDetails?.firstName || ''} ${a.managerId?.personalDetails?.lastName || ''}`;
                  const coCode = a.employeeId?.companyCode || 'FSM';
                  const appQuarterId = a.appraisalQuarter?._id || a.appraisalQuarter || a.period?.quarter;
                  
                  return (
                    <tr key={a._id} className="hover:bg-[#FAF8F4] transition-colors">
                      <td className="p-[12px_16px]">
                        <div className="font-[700] text-[#0D2B55]">{empName}</div>
                        <div className="text-[11px] text-[#6b7280]">{a.employeeId?.employmentDetails?.jobTitle} &middot; {new Date(a.updatedAt || a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(a.updatedAt || a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="p-[12px_16px] text-[#0f1923] text-[12px]">{mgrName || 'Unknown'}</td>
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
                        <span className="font-[800] text-[#1E40AF] bg-[#DBEAFE] px-[8px] py-[3px] rounded-[6px] border border-[#BFDBFE]">
                          {a.calculatedResults?.finalIprfScore?.toFixed(1) || '0.0'}
                        </span>
                      </td>
                      <td className="p-[12px_16px] text-center"><StatusTag st={a.workflow?.status} /></td>
                      <td className="p-[12px_16px] text-right">
                        <button onClick={() => setSelectedAppraisal(a)} className="text-[11px] font-[700] text-[#0f1923] bg-white border border-[#E2DDD4] px-[12px] py-[6px] rounded-[6px] hover:border-[#0D2B55] hover:text-[#0D2B55] transition-colors shadow-sm">
                          Inspect &rarr;
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAppraisal && (
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

              <h4 className="text-[12px] font-[800] text-[#0D2B55] mb-[12px] uppercase tracking-widest">Criteria Breakdown</h4>
              <div className="bg-white border border-[#E2DDD4] rounded-[10px] overflow-hidden mb-[24px]">
                <table className="w-full text-left text-[13px]">
                  <tbody className="divide-y divide-[#E2DDD4]">
                    {Object.entries(CRIT_NAMES).map(([key, name]) => {
                      const rating = selectedAppraisal.scores?.[key]?.rating ?? selectedAppraisal.scores?.[key];
                      const color = rating === 0.0 ? 'text-[#991B1B]' : rating === 0.7 ? 'text-[#92400E]' : rating === 1.0 ? 'text-[#065F46]' : rating === 1.3 ? 'text-[#1E40AF]' : 'text-[#6b7280]';
                      return (
                        <tr key={key}>
                          <td className="p-[10px_16px] font-[500] text-[#0f1923]">{name}</td>
                          <td className="p-[10px_16px] text-right">
                            <span className={`font-[800] ${color}`}>{rating !== undefined && rating !== null ? Number(rating).toFixed(1) : '—'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                
                {selectedAppraisal.narrative?.generalComments && (
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