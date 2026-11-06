'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Info, Edit2, ArrowRight, Trash2, Flag, FlagOff, AlertTriangle, HelpCircle } from 'lucide-react';
import api from '../../../../lib/api';

export default function DirectReports() {
  const router = useRouter();
  
  // States for Existing Direct Reports Feature
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState(null);

  // States for New Disciplinary Features
  const [showInfoBox, setShowInfoBox] = useState(true);
  const [cases, setCases] = useState([]);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        // Fetch all required data dynamically from DB
        const [teamRes, casesRes, propRes] = await Promise.all([
          api.get('/users/my-team').catch(() => ({ data: { data: [] } })),
          api.get('/disciplinary/my-cases').catch(() => ({ data: { data: [] } })),
          api.get('/disciplinary/properties').catch(() => ({ data: { data: [] } }))
        ]);
        
        setTeam(teamRes.data?.data || []);
        setCases(casesRes.data?.data || []);
        setProperties(propRes.data?.data || []);
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchAllData();
  }, []);

  // --- NEW: Disciplinary Action Handlers --- //
  
  const submitToHR = async (caseId) => {
    try {
      await api.patch(`/disciplinary/${caseId}/submit`);
      setCases(cases.map(c => c._id === caseId ? { ...c, status: 'SUBMITTED_TO_HR' } : c));
    } catch (e) {
      console.error("Error submitting case", e);
    }
  };

  const deleteCase = async (caseId) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    try {
      await api.delete(`/disciplinary/${caseId}`);
      setCases(cases.filter(c => c._id !== caseId));
    } catch (e) {
      console.error("Error deleting case", e);
    }
  };

  const toggleFlag = async (caseId, currentSerious) => {
    try {
      await api.patch(`/disciplinary/${caseId}/toggle-serious`, { isSerious: !currentSerious });
      setCases(cases.map(c => c._id === caseId ? { ...c, isSerious: !currentSerious } : c));
    } catch (e) {
      console.error("Error toggling flag", e);
    }
  };

  // Helper to render action badges based on video UI
  const renderActionBadge = (actionStr) => {
    if (!actionStr) return <span className="text-gray-400">—</span>;
    const parts = actionStr.split(' — ');
    const code = parts[0] || actionStr;
    const text = parts[1] || actionStr;

    let bg = 'bg-gray-100', textCol = 'text-gray-800', borderCol = 'border-gray-200';
    if (code.startsWith('A')) { bg = 'bg-blue-50'; textCol = 'text-blue-700'; borderCol = 'border-blue-200'; }
    else if (code.startsWith('R')) { bg = 'bg-yellow-50'; textCol = 'text-yellow-700'; borderCol = 'border-yellow-200'; }
    else if (code.startsWith('S')) { bg = 'bg-gray-100'; textCol = 'text-gray-800'; borderCol = 'border-gray-300'; }
    else if (code.startsWith('D')) { bg = 'bg-red-50'; textCol = 'text-red-700'; borderCol = 'border-red-200'; }

    return (
      <div className="flex items-center gap-2">
        <span className={`${bg} ${textCol} border ${borderCol} font-bold px-2 py-0.5 rounded text-[11px] shadow-sm`}>{code}</span>
        <span className="text-[12px] text-gray-700 max-w-[150px] truncate" title={text}>{text}</span>
      </div>
    );
  };

  // Helper for existing logic
  const prC = (p) => p >= 1 ? '#065F46' : p >= 0.6 ? '#92400E' : '#991B1B';

  if (loading) return <div className="p-10 text-center text-slate-500">Loading team data & cases...</div>;

  return (
    <div className="w-full max-w-full pb-[60px] font-sans">
      
      {/* 1. DISCIPLINARY HEADER */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a] mb-1">My Team — Disciplinary</h1>
          <p className="text-sm text-gray-500">Counsel first — raise a formal case only if the problem continues</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard/manager/disciplinary/raise')}
          className="bg-[#0f172a] text-white px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm hover:bg-gray-800 transition-colors"
        >
          + Raise a case
        </button>
      </div>

      {/* 2. INFO BOX */}
      {showInfoBox && (
        <div className="bg-[#f8fafc] border border-gray-200 rounded-lg p-4 mb-8 relative shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-600 rounded-md p-1.5"><Info size={16} /></div>
              <h2 className="font-semibold text-gray-800">How My Team works</h2>
              <span className="bg-blue-100 text-blue-700 text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Line Manager</span>
            </div>
            <button onClick={() => setShowInfoBox(false)} className="text-sm text-gray-500 hover:text-gray-800 font-medium">Hide</button>
          </div>
          <ul className="text-sm text-gray-600 space-y-1.5 list-disc pl-5">
            <li>Shows the cases you have drafted or submitted. Counsel the employee first — a formal case is a last resort.</li>
            <li>Drafts can be edited, submitted to HR or deleted. Once submitted, the case moves to HR and you can track its status.</li>
          </ul>
        </div>
      )}

      {/* 3. YOUR CASES TABLE */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-[#0f172a] mb-1">Your cases</h2>
        <p className="text-sm text-gray-500 mb-4">Drafts and cases you've submitted to HR</p>
        
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Case</th>
                  <th className="px-4 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Offence</th>
                  <th className="px-4 py-3.5">Recommended</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cases.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 font-semibold text-[#0f172a]">{c.caseId || 'DC-XXXX'}</td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-[#0f172a] text-[13px]">{c.employee?.name || c.employeeName || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{c.employee?.jobTitle || c.jobTitle || 'Employee'}</div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600 max-w-[220px] truncate" title={c.offences?.[0]?.offence || c.offence}>
                      {c.offences?.[0]?.offence || c.offence || '—'}
                    </td>
                    <td className="px-4 py-4">
                      {renderActionBadge(c.offences?.[0]?.action || c.action)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        {c.status === 'DRAFT' ? (
                          <span className="text-gray-500 text-[12px] font-medium">Draft</span>
                        ) : (
                          <span className="bg-orange-50 text-orange-700 border border-orange-200 font-bold px-2 py-0.5 rounded text-[11px]">With HR</span>
                        )}
                        {c.isSerious && c.status !== 'DRAFT' && (
                          <span className="bg-red-50 text-red-700 border border-red-200 font-bold px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                            <AlertTriangle size={10} strokeWidth={3} /> Serious
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {c.status === 'DRAFT' ? (
                        <div className="flex flex-col items-end gap-2.5">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => router.push(`/dashboard/manager/disciplinary/raise?editId=${c._id}`)} 
                              className="text-[12px] font-bold text-gray-600 hover:text-[#0f172a] flex items-center gap-1 transition-colors"
                            >
                              <Edit2 size={12} strokeWidth={2.5} /> Edit
                            </button>
                            <button 
                              onClick={() => submitToHR(c._id)} 
                              className="text-[12px] font-bold bg-[#0f172a] text-white px-3 py-1.5 rounded flex items-center gap-1.5 hover:bg-gray-800 transition-colors shadow-sm"
                            >
                              Submit to HR <ArrowRight size={12} strokeWidth={2.5} />
                            </button>
                          </div>
                          <button 
                            onClick={() => deleteCase(c._id)} 
                            className="text-[12px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={12} strokeWidth={2.5} /> Delete
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2.5">
                          <button 
                            onClick={() => toggleFlag(c._id, c.isSerious)} 
                            className="text-[12px] font-bold text-gray-700 border border-gray-300 bg-white px-3 py-1.5 rounded hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition-colors"
                          >
                            {c.isSerious ? <FlagOff size={12} strokeWidth={2.5} /> : <Flag size={12} strokeWidth={2.5} />} 
                            {c.isSerious ? 'Unflag' : 'Flag serious'}
                          </button>
                          <HelpCircle size={15} className="text-gray-400 hover:text-gray-600 cursor-pointer" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {cases.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">No disciplinary cases found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. COMPANY PROPERTY TABLE */}
      <div className="mb-14">
        <h2 className="text-lg font-bold text-[#0f172a] mb-1">Company property to retrieve</h2>
        <p className="text-sm text-gray-500 mb-4">On dismissal, retrieve all company property from the employee</p>
        
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Case</th>
                  <th className="px-4 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Property Returned</th>
                  <th className="px-4 py-3.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {properties.map((p) => {
                  const percent = Math.min((p.returnedCount / p.totalCount) * 100, 100) || 0;
                  return (
                    <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 font-semibold text-[#0f172a]">{p.caseId}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-[#0f172a] text-[13px]">{p.employeeName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{p.jobTitle}</div>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-600 font-medium">{p.department}</td>
                      <td className="px-4 py-4 w-[200px]">
                        <div className="text-[11px] font-bold text-gray-600 mb-1.5 tracking-wide uppercase">{p.returnedCount}/{p.totalCount} returned</div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-yellow-400 h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button className="text-[12px] font-bold bg-[#0f172a] text-white px-4 py-1.5 rounded hover:bg-gray-800 transition-colors shadow-sm">
                          Retrieve property
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {properties.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">No properties pending retrieval.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <hr className="border-gray-200 mb-8" />

      {/* 5. EXISTING: DIRECT REPORTS (Fully Preserved) */}
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">&#128101; Direct Reports</div>
        <div className="text-[13px] text-[#6b7280]">Click on any team member to view their full HR profile</div>
      </div>
      
      <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#FAF8F4] border-b border-[#E2DDD4] text-[11px] font-[700] text-[#6b7280] uppercase tracking-[.06em]">
              <tr>
                <th className="p-[12px_16px]">Employee</th>
                <th className="p-[12px_16px]">Job Title</th>
                <th className="p-[12px_16px] text-center">Emp ID</th>
                <th className="p-[12px_16px] text-center">Company</th>
                <th className="p-[12px_16px] text-center">Pro-Rata</th>
                <th className="p-[12px_16px] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4]">
              {team.map((e) => {
                const pr = (e.employmentDetails?.prorateValue || 12) / 12;
                const fName = e.personalDetails?.firstName || 'Unknown';
                const lName = e.personalDetails?.lastName || '';
                
                return (
                  <tr 
                    key={e._id} 
                    onClick={() => setSelectedEmp(e)} 
                    className="hover:bg-[#EFF6FF] transition-colors cursor-pointer group"
                  >
                    <td className="p-[12px_16px] flex items-center gap-[10px]">
                      <div className="w-[28px] h-[28px] rounded-full bg-[#0D2B55]/10 text-[#0D2B55] flex items-center justify-center text-[10px] font-[800] group-hover:bg-[#0D2B55] group-hover:text-white transition-colors">
                        {fName[0]}{lName[0]}
                      </div>
                      <div className="text-[13px] font-[700] text-[#0D2B55]">{fName} {lName}</div>
                    </td>
                    <td className="p-[12px_16px] text-[12px] text-[#0f1923]">{e.employmentDetails?.jobTitle}</td>
                    <td className="p-[12px_16px] text-center font-mono text-[12px] text-[#6b7280]">
                      {e.employeeId}
                    </td>
                    <td className="p-[12px_16px] text-center">
                      <span className={`text-[10px] font-[700] px-[8px] py-[3px] rounded-full uppercase tracking-wide
                        ${e.companyCode === 'FSM' ? 'bg-[#DBEAFE] text-[#1E40AF]' : 
                          e.companyCode === 'CDU' ? 'bg-[#D1FAE5] text-[#065F46]' : 
                          e.companyCode === 'NAR' ? 'bg-[#FEF3C7] text-[#92400E]' : 
                          'bg-[#EDE9FE] text-[#4C1D95]'}`}>
                        {e.companyCode || 'FSM'}
                      </span>
                    </td>
                    <td className="p-[12px_16px] text-center font-[700] text-[13px]" style={{ color: prC(pr) }}>
                      {pr.toFixed(3)}
                    </td>
                    <td className="p-[12px_16px] text-center">
                      <span className="text-[10px] font-[700] px-[8px] py-[3px] rounded-full bg-[#D1FAE5] text-[#065F46]">Active</span>
                    </td>
                  </tr>
                );
              })}
              {team.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">No direct reports found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-[11px] text-[#6b7280] p-[12px_16px] text-right border-t border-[#E2DDD4] bg-[#FAF8F4]">
          {team.length} direct reports
        </div>
      </div>

      {/* EXISTING: EMPLOYEE PROFILE MODAL (Fully Preserved) */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[100] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[20px] w-full max-w-[500px] shadow-2xl overflow-hidden slide-in-from-bottom-4">
            
            <div className="bg-[#0D2B55] p-[24px_24px_30px] relative">
              <button 
                onClick={() => setSelectedEmp(null)} 
                className="absolute top-[16px] right-[16px] bg-white/10 text-white w-[30px] h-[30px] rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                &#215;
              </button>
              <div className="flex items-center gap-[16px]">
                <div className="w-[64px] h-[64px] rounded-full bg-gradient-to-br from-[#C9A84C] to-[#9a7a2e] flex items-center justify-center text-[22px] font-[800] text-[#0D2B55] shadow-lg border-[3px] border-[#0D2B55]">
                  {selectedEmp.personalDetails?.firstName?.[0]}{selectedEmp.personalDetails?.lastName?.[0]}
                </div>
                <div>
                  <h2 className="text-[22px] font-[800] text-white tracking-tight leading-tight">
                    {selectedEmp.personalDetails?.firstName} {selectedEmp.personalDetails?.lastName}
                  </h2>
                  <div className="text-[13px] text-white/70 mt-[2px] font-[500]">
                    {selectedEmp.employmentDetails?.jobTitle}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-[24px] bg-[#FAF8F4] relative">
              <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] mt-[-40px] relative z-10 shadow-sm">
                
                <h3 className="text-[11px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[16px] border-b border-[#E2DDD4] pb-[8px]">
                  Employment Details
                </h3>
                
                <div className="grid grid-cols-2 gap-y-[16px] gap-x-[20px]">
                  <div>
                    <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">Employee ID</div>
                    <div className="text-[14px] font-[700] text-[#0f1923] font-mono">{selectedEmp.employeeId}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">System Username</div>
                    <div className="text-[14px] font-[700] text-[#0f1923] font-mono">{selectedEmp.username}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">Company Code</div>
                    <div className="text-[14px] font-[700] text-[#0f1923]">{selectedEmp.companyCode || 'FSM'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">System Role</div>
                    <div className="text-[14px] font-[700] text-[#0f1923]">{selectedEmp.security?.role || 'EMPLOYEE'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">Date of Hire</div>
                    <div className="text-[14px] font-[700] text-[#0f1923]">
                      {new Date(selectedEmp.employmentDetails?.dateOfHire).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">STIP Pro-Rata</div>
                    <div className="text-[14px] font-[800] text-[#065F46]">
                      {((selectedEmp.employmentDetails?.prorateValue || 12) / 12).toFixed(3)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-[16px_24px] bg-white border-t border-[#E2DDD4] flex justify-end gap-[12px]">
              <button 
                onClick={() => setSelectedEmp(null)} 
                className="px-[16px] py-[10px] text-[13px] font-[700] text-[#0f1923] bg-white border-[2px] border-[#E2DDD4] rounded-[10px] hover:border-[#0D2B55] transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => router.push('/dashboard/manager/new')} 
                className="px-[16px] py-[10px] text-[13px] font-[700] text-white bg-[#0D2B55] rounded-[10px] hover:bg-[#1a3d6e] transition-colors flex items-center gap-[6px]"
              >
                &#9997; Start Appraisal
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}