'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Info, Edit2, ArrowRight, Trash2, Flag, FlagOff, AlertTriangle, HelpCircle } from 'lucide-react';
import api from '../../../../../lib/api';

export default function MyTeamDisciplinary() {
  const router = useRouter();
  
  const [showInfoBox, setShowInfoBox] = useState(true);
  const [cases, setCases] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCasesData = async () => {
      try {
        setLoading(true);
        const [casesRes, propRes] = await Promise.all([
          api.get('/disciplinary/my-cases').catch(() => ({ data: { data: [] } })),
          api.get('/disciplinary/properties').catch(() => ({ data: { data: [] } }))
        ]);
        
        setCases(casesRes.data?.data || []);
        setProperties(propRes.data?.data || []);
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchCasesData();
  }, []);
  
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

  // Safe data extractors 
  const safeExtractName = (c) => {
    if (c.employeeId?.personalDetails) return `${c.employeeId.personalDetails.firstName} ${c.employeeId.personalDetails.lastName}`;
    return c.employee?.name || c.employeeName || 'Unknown';
  };
  const safeExtractJobTitle = (c) => {
    return c.employeeId?.employmentDetails?.jobTitle || c.jobTitle || 'Employee';
  };

  // Status Badge Renderer 
  const renderStatusBadge = (c) => {
    if (c.status === 'DRAFT') {
      return <span className="text-gray-500 text-[12px] font-medium">Draft</span>;
    }
    if (c.status === 'CLOSED' || c.hrWorkflowStatus === 'CLOSED') {
      return <span className="bg-green-50 text-green-700 border border-green-200 font-bold px-2 py-0.5 rounded text-[11px]">Closed</span>;
    }
    if (c.status === 'WITH_CEO' || c.hrWorkflowStatus === 'WITH_CEO') {
      return <span className="bg-purple-50 text-purple-700 border border-purple-200 font-bold px-2 py-0.5 rounded text-[11px]">With CEO</span>;
    }
    if (c.status === 'WITH_SMT' || c.hrWorkflowStatus === 'WITH_SMT') {
      return <span className="bg-red-50 text-red-700 border border-red-200 font-bold px-2 py-0.5 rounded text-[11px]">With SMT</span>;
    }
    if (c.hrWorkflowStatus === 'AWAITING_RESPONSE' || c.hrWorkflowStatus === 'DECISION_READY') {
      return <span className="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2 py-0.5 rounded text-[11px]">HR Processing</span>;
    }
    return <span className="bg-orange-50 text-orange-700 border border-orange-200 font-bold px-2 py-0.5 rounded text-[11px]">With HR</span>;
  };

  const renderActionBadge = (actionStr) => {
    if (!actionStr) return <span className="text-gray-400">—</span>;
    const parts = actionStr.split(' — ');
    const code = parts[0] || actionStr;
    const text = parts[1] || actionStr;

    let bg = 'bg-gray-100', textCol = 'text-gray-800', borderCol = 'border-gray-200';
    if (code.startsWith('A')) { bg = 'bg-blue-50'; textCol = 'text-blue-700'; borderCol = 'border-blue-200'; }
    else if (code.startsWith('R')) { bg = 'bg-yellow-50'; textCol = 'text-yellow-700'; borderCol = 'border-yellow-200'; }
    else if (code.startsWith('S')) { bg = 'bg-gray-100'; textCol = 'text-gray-800'; borderCol = 'border-gray-300'; }
    else if (code.startsWith('D') || code.toLowerCase().includes('dismissal')) { bg = 'bg-red-50'; textCol = 'text-red-700'; borderCol = 'border-red-200'; }

    return (
      <div className="flex items-center gap-2">
        <span className={`${bg} ${textCol} border ${borderCol} font-bold px-2 py-0.5 rounded text-[11px] shadow-sm`}>{code}</span>
        <span className="text-[12px] text-gray-700 max-w-[150px] truncate" title={text}>{text}</span>
      </div>
    );
  };

  // Derive Dismissed Employees dynamically into the properties array
  const derivedProperties = cases
    .filter(c => c.status === 'CLOSED' && (c.ceoDecision?.finalAction === 'Dismissal' || c.ceoDecision?.finalAction?.includes('Dismissal')))
    .map(c => ({
      _id: `derived-${c._id}`,
      caseId: c.caseId || (c._id ? `DC-${c._id.slice(-4).toUpperCase()}` : 'DC-XXXX'),
      employeeId: c.employeeId,
      employeeName: safeExtractName(c),
      jobTitle: safeExtractJobTitle(c),
      department: c.employeeId?.employmentDetails?.department || '—',
      returnedCount: 0,
      totalCount: 5, // Expected standard items (Laptop, ID Card, Keys, Monitor, etc.)
    }));

  // Merge derived closed cases with any existing property records (filtering out duplicates)
  const existingCaseIds = new Set(properties.map(p => p.caseId));
  const uniqueDerivedProperties = derivedProperties.filter(dp => !existingCaseIds.has(dp.caseId));
  const displayProperties = [...properties, ...uniqueDerivedProperties];

  if (loading) return <div className="p-10 text-center text-slate-500">Loading cases...</div>;

  return (
    <div className="w-full max-w-full pb-[60px] font-sans p-6">
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
                  <th className="px-4 py-3.5">Final Action / Rec.</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cases.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-4 font-semibold text-[#0f172a]">
                      {c.caseId || (c._id ? `DC-${c._id.slice(-4).toUpperCase()}` : 'DC-XXXX')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-[#0f172a] text-[13px]">{safeExtractName(c)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{safeExtractJobTitle(c)}</div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600 max-w-[220px] truncate" title={c.offences?.[0]?.offence || c.offence}>
                      {c.offences?.[0]?.offence || c.offence || '—'}
                    </td>
                    <td className="px-4 py-4">
                      {/* Priority rendering: Show final CEO decision if closed, else fallback to recommended */}
                      {renderActionBadge(c.ceoDecision?.finalAction || c.offences?.[0]?.action || c.action || c.recommendedAction)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        {renderStatusBadge(c)}
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
                          {c.status !== 'CLOSED' && (
                            <button 
                              onClick={() => toggleFlag(c._id, c.isSerious)} 
                              className="text-[12px] font-bold text-gray-700 border border-gray-300 bg-white px-3 py-1.5 rounded hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                              {c.isSerious ? <FlagOff size={12} strokeWidth={2.5} /> : <Flag size={12} strokeWidth={2.5} />} 
                              {c.isSerious ? 'Unflag' : 'Flag serious'}
                            </button>
                          )}
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
                {displayProperties.map((p) => {
                  const percent = Math.min((p.returnedCount / p.totalCount) * 100, 100) || 0;
                  return (
                    <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 font-semibold text-[#0f172a]">{p.caseId}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-[#0f172a] text-[13px]">{p.employeeName || safeExtractName(p)}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{p.jobTitle || safeExtractJobTitle(p)}</div>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-600 font-medium">{p.department || p.employeeId?.employmentDetails?.department || '—'}</td>
                      <td className="px-4 py-4 w-[200px]">
                        <div className="text-[11px] font-bold text-gray-600 mb-1.5 tracking-wide uppercase">{p.returnedCount}/{p.totalCount} returned</div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-green-500' : 'bg-yellow-400'}`} style={{ width: `${percent}%` }}></div>
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
                {displayProperties.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">No dismissed employees pending property retrieval.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}