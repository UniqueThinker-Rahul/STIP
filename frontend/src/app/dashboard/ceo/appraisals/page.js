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

export default function CEOAllAppraisals() {
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cpPct, setCpPct] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [qtr, setQtr] = useState('');
  const [co, setCo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch CP% for accurate award previews
      const metricsRes = await api.get('/company-metrics/2026').catch(() => ({ data: { data: null } }));
      if (metricsRes.data?.data?.cpPct) {
        setCpPct(metricsRes.data.data.cpPct);
      }

      // Fetch all appraisals
      const response = await api.get('/appraisals').catch(() => ({ data: { data: [] } }));
      const allData = response.data?.data || [];
      
      // Sort newest first
      allData.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
      
      setAppraisals(allData);
    } catch (error) {
      console.error('Failed to fetch appraisals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Logic
  const filteredData = appraisals.filter(a => {
    const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`.toLowerCase();
    const jobTitle = (a.employeeId?.employmentDetails?.jobTitle || '').toLowerCase();
    const searchString = search.toLowerCase();
    
    if (search && !empName.includes(searchString) && !jobTitle.includes(searchString)) return false;
    if (qtr && a.period?.quarter !== qtr) return false;
    if (co && a.employeeId?.companyCode !== co) return false;
    
    const wfStatus = a.workflow?.status;
    if (statusFilter === 'approved' && wfStatus !== 'APPROVED') return false;
    if (statusFilter === 'pending' && wfStatus !== 'WITH_CEO') return false;
    if (statusFilter === 'not_approved' && wfStatus !== 'NOT_APPROVED') return false;
    
    return true;
  });

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
    switch(st) {
      case 'APPROVED': 
        return <span className="bg-[#D1FAE5] text-[#065F46] px-[8px] py-[3px] rounded-[6px] text-[11px] font-[700] border border-[#A7F3D0] whitespace-nowrap">CEO Approved</span>;
      case 'WITH_CEO': 
        return <span className="bg-[#FEF3C7] text-[#92400E] px-[8px] py-[3px] rounded-[6px] text-[11px] font-[700] border border-[#FDE68A] whitespace-nowrap">Pending CEO</span>;
      case 'NOT_APPROVED': 
        return <span className="bg-[#FEF2F2] text-[#991B1B] px-[8px] py-[3px] rounded-[6px] text-[11px] font-[700] border border-[#FECACA] whitespace-nowrap">Not Approved</span>;
      case 'APPROVED_BY_HR': 
      case 'UNDER_HR_REVIEW':
      case 'SUBMITTED':
        return <span className="bg-[#FAF8F4] text-[#6b7280] px-[8px] py-[3px] rounded-[6px] text-[11px] font-[700] border border-[#E2DDD4] whitespace-nowrap">At HR</span>;
      default: 
        return <span className="bg-[#FAF8F4] text-[#6b7280] px-[8px] py-[3px] rounded-[6px] text-[11px] font-[700] border border-[#E2DDD4] whitespace-nowrap">Draft</span>;
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px] flex justify-between items-end">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
            &#128196; All Appraisals
          </div>
          <div className="text-[13px] text-[#6b7280]">Full read-only view of every appraisal — all staff, all quarters</div>
        </div>
        <button onClick={fetchData} className="text-[12px] font-[600] text-[#6b7280] bg-white border border-[#E2DDD4] p-[6px_12px] rounded-[8px] hover:text-[#0D2B55] hover:border-[#0D2B55] transition-colors shadow-sm">
          &#8635; Refresh Data
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-[12px] mb-[20px]">
        <input 
          type="text" 
          placeholder="Search by employee name or job title..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[250px] p-[10px_14px] bg-white border border-[#E2DDD4] rounded-[10px] text-[13px] text-[#0f1923] outline-none focus:border-[#0D2B55] transition-colors shadow-sm"
        />
        <select value={qtr} onChange={e => setQtr(e.target.value)} className="p-[10px_14px] bg-white border border-[#E2DDD4] rounded-[10px] text-[13px] text-[#0f1923] outline-none cursor-pointer shadow-sm">
          <option value="">All Quarters</option>
          <option value="Q1">Q1</option>
          <option value="Q2">Q2</option>
          <option value="Q3">Q3</option>
          <option value="Q4">Q4</option>
        </select>
        <select value={co} onChange={e => setCo(e.target.value)} className="p-[10px_14px] bg-white border border-[#E2DDD4] rounded-[10px] text-[13px] text-[#0f1923] outline-none cursor-pointer shadow-sm">
          <option value="">All Companies</option>
          <option value="FSM">FSM</option>
          <option value="CDU">CDU</option>
          <option value="NAR">NAR</option>
          <option value="GUM">GUM</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-[10px_14px] bg-white border border-[#E2DDD4] rounded-[10px] text-[13px] text-[#0f1923] outline-none cursor-pointer shadow-sm">
          <option value="">All Statuses</option>
          <option value="approved">CEO Approved</option>
          <option value="pending">Pending CEO</option>
          <option value="not_approved">Not Approved</option>
        </select>
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
                filteredData.map((a, i) => {
                  const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`.trim() || 'Unknown';
                  const init1 = a.employeeId?.personalDetails?.firstName?.[0] || '';
                  const init2 = a.employeeId?.personalDetails?.lastName?.[0] || '';
                  const coCode = a.employeeId?.companyCode || 'FSM';
                  const jobTitle = a.employeeId?.employmentDetails?.jobTitle || 'Staff';
                  
                  const iprf = a.calculatedResults?.finalIprfScore || 0;
                  const prMonths = a.employeeId?.employmentDetails?.prorateValue || 12;
                  const proRataValue = prMonths / 12;
                  
                  let awardDisplay = '—';
                  if (cpPct !== null && iprf > 0) {
                    const finalAw = (cpPct * iprf) * proRataValue;
                    awardDisplay = `${finalAw.toFixed(2)}%`;
                  } else if (a.stipAward) {
                     awardDisplay = `${a.stipAward}%`;
                  }

                  return (
                    <tr key={a._id} className={`hover:bg-[#FAF8F4] transition-colors ${i % 2 === 1 ? 'bg-[#FAF8F4]/40' : 'bg-white'}`}>
                      <td className="p-[12px_16px] whitespace-nowrap">
                        <div className="flex items-center gap-[9px]">
                          <div className="w-[30px] h-[30px] rounded-[6px] bg-[#E2DDD4] text-[#0f1923] font-[800] flex items-center justify-center text-[11px]">
                            {init1}{init2}
                          </div>
                          <div className="font-[600] text-[#0D2B55]">{empName}</div>
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
                          {a.period?.quarter || 'Q3'}
                        </span>
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        {iprf > 0 ? (
                          <span className={`px-[8px] py-[4px] rounded-[6px] text-[11px] font-[800] border ${iprfStyle(iprf)}`}>
                            {iprf.toFixed(1)} ({iprfLabel(iprf)})
                          </span>
                        ) : (
                          <span className="text-[11px] font-[800] text-[#6b7280]">—</span>
                        )}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center font-[600] text-[#0D2B55]">
                        {proRataValue.toFixed(3)}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center font-[700] text-[#059669]">
                        {awardDisplay}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <StatusTag st={a.workflow?.status} />
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <button 
                          onClick={() => setSelectedAppraisal(a)}
                          className="bg-white hover:bg-[#FAF8F4] text-[#0f1923] border border-[#E2DDD4] px-[12px] py-[5px] text-[11px] font-[700] rounded-[6px] transition-colors shadow-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer count */}
        <div className="p-[10px_16px] bg-[#FAF8F4] border-t border-[#E2DDD4] text-right text-[11px] font-[600] text-[#6b7280]">
          {filteredData.length > 0 ? `${filteredData.length} appraisal${filteredData.length > 1 ? 's' : ''}` : '0 appraisals'}
        </div>
      </div>

      {/* Read-Only Audit View Modal */}
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
                  <div className="text-[22px] font-[800] text-[#059669]">{selectedAppraisal.stipAward ? `${selectedAppraisal.stipAward}%` : '—'}</div>
                </div>
                <div className="bg-[#FAF8F4] p-[12px_16px] rounded-[10px] border border-[#E2DDD4]">
                  <div className="text-[10px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">Period</div>
                  <div className="text-[22px] font-[800] text-[#0f1923]">{selectedAppraisal.period?.quarter || 'Q3'}</div>
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
                      const rating = selectedAppraisal.scores?.[key]?.rating;
                      const color = rating === 0.0 ? 'text-[#991B1B]' : rating === 0.7 ? 'text-[#92400E]' : rating === 1.0 ? 'text-[#065F46]' : rating === 1.3 ? 'text-[#1E40AF]' : 'text-[#6b7280]';
                      return (
                        <tr key={key}>
                          <td className="p-[10px_16px] font-[500] text-[#0f1923]">{name}</td>
                          <td className="p-[10px_16px] text-right">
                            <span className={`font-[800] ${color}`}>{rating !== undefined ? rating.toFixed(1) : '—'}</span>
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
                    <div className="text-[13px] text-[#92400E] leading-relaxed font-[500]">
                      {selectedAppraisal.narrative.epJustification}
                    </div>
                  </div>
                )}
                
                {selectedAppraisal.narrative?.generalComments && (
                  <div className="bg-[#F8FAFC] border border-[#E0E7FF] rounded-[10px] p-[16px]">
                    <div className="text-[11px] font-[800] text-[#0369A1] uppercase tracking-[.06em] mb-[6px]">Manager Comments</div>
                    <div className="text-[13px] text-[#0f1923] leading-relaxed italic">
                      "{selectedAppraisal.narrative.generalComments}"
                    </div>
                  </div>
                )}

                {selectedAppraisal.narrative?.hrComments && (
                  <div className="bg-[#FAF5FF] border border-[#E9D5FF] rounded-[10px] p-[16px]">
                    <div className="text-[11px] font-[800] text-[#6B21A8] uppercase tracking-[.06em] mb-[6px]">HR / Admin Notes</div>
                    <div className="text-[13px] text-[#0f1923] leading-relaxed italic">
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