"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Info, X, ChevronDown, Loader2 } from 'lucide-react';
import api from '../../../../../lib/api'; 

export default function Counselling() {
  const [showInfoBox, setShowInfoBox] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dynamic Data State
  const [employees, setEmployees] = useState([]);
  const [counsellings, setCounsellings] = useState([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingCounsellings, setIsLoadingCounsellings] = useState(true);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState(null); // For viewing full text
  
  // Form State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [issue, setIssue] = useState('');
  const [discussed, setDiscussed] = useState('');
  const [outcome, setOutcome] = useState('Resolved');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const dropdownRef = useRef(null);

  // Fetch Team Members
  const fetchTeamMembers = async () => {
    try {
      const res = await api.get('/users/my-team').catch(() => ({ data: { data: [] } }));
      const myTeam = res.data?.data || [];
      
      const teamWithCases = await Promise.all(myTeam.map(async (emp) => {
        const caseRes = await api.get(`/disciplinary/employee/${emp._id}`).catch(() => ({ data: { data: [] } }));
        const allCases = caseRes.data?.data || [];
        const openCases = allCases.filter(c => c.status !== 'CLOSED' && c.status !== 'RESOLVED' && c.status !== 'WITHDRAWN');
        
        return {
          _id: emp._id,
          name: `${emp.personalDetails?.firstName || ''} ${emp.personalDetails?.lastName || ''}`.trim(),
          jobTitle: emp.employmentDetails?.jobTitle || 'Employee',
          openCasesCount: openCases.length,
        };
      }));
      setEmployees(teamWithCases);
    } catch (error) {
      console.error("Failed to load team members", error);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // Fetch Logged Counselling Records from DB
  const fetchCounsellings = async () => {
    try {
      const res = await api.get('/disciplinary/counselling');
      setCounsellings(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load counselling records", error);
    } finally {
      setIsLoadingCounsellings(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
    fetchCounsellings();

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save to Database
  const handleSave = async () => {
    if (!selectedEmployee) return alert("Please select an employee.");
    if (!issue.trim() || !discussed.trim()) return alert("Please fill out the issue and discussion details.");
    
    try {
      setIsSubmitting(true);
      
      const payload = {
        employeeId: selectedEmployee._id,
        issue,
        discussed,
        outcome,
        date
      };

      await api.post('/disciplinary/counselling', payload);
      
      // Reset form and close
      setIsModalOpen(false);
      setSelectedEmployee(null);
      setIssue('');
      setDiscussed('');
      setOutcome('Resolved');
      setDate(new Date().toISOString().split('T')[0]);
      
      // Refresh dynamic list
      await fetchCounsellings();
      
    } catch (error) {
      console.error("Error saving counselling:", error);
      alert("Failed to save counselling to the database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-800">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-[#0f172a]">
            Counselling
            <Info size={18} className="text-gray-400 cursor-pointer" />
          </h1>
          <p className="text-sm text-gray-500">The informal first step — counsel and record before any formal case</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0f172a] text-white px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-sm"
        >
          + Log counselling
        </button>
      </div>

      {/* Info Box */}
      {showInfoBox && (
        <div className="bg-[#f8fafc] border border-gray-200 rounded-lg p-4 mb-8 relative shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-600 rounded-md p-1.5"><Info size={16} /></div>
              <h2 className="font-semibold text-gray-800 text-sm">How Counselling works</h2>
              <span className="bg-blue-100 text-blue-700 text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Line Manager</span>
            </div>
            <button onClick={() => setShowInfoBox(false)} className="text-sm text-gray-500 hover:text-gray-800 font-medium">Hide</button>
          </div>
          <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
            <li>The first, informal step — before any formal case. When a performance or conduct problem first appears, counsel the employee and log it here.</li>
            <li>Record what the issue was, what was discussed, and the outcome: Resolved (no further action), Verbal admonishment (oral warning kept on file), or Escalate to a formal case.</li>
            <li>Escalating carries the counselling notes into the new case, and can include more than one offence — each with its own range and recommendation. HR, Executives and the CEO can see this log.</li>
            <li>The record is kept on the employee's file. If the same employee reoffends, the earlier counselling is flagged when you raise a new case, supporting escalation.</li>
          </ul>
        </div>
      )}

      {/* Dynamic Data Rendering */}
      {isLoadingCounsellings ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="animate-spin text-gray-400 mb-2" size={24} />
          <p className="text-sm text-gray-500">Loading records...</p>
        </div>
      ) : counsellings.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-gray-500">No counselling recorded yet. Log the informal step here before raising a case.</p>
        </div>
      ) : (
        /* Populated Table */
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Issue / Concern</th>
                  <th className="px-4 py-3.5">Outcome</th>
                  <th className="px-4 py-3.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {counsellings.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-4 font-medium text-gray-700">
                      {new Date(c.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-[#0f172a]">{c.employeeId?.personalDetails?.firstName} {c.employeeId?.personalDetails?.lastName}</div>
                      <div className="text-xs text-gray-500">{c.employeeId?.employmentDetails?.jobTitle}</div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600 max-w-[200px] truncate" title={c.issue}>
                      {c.issue}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm border ${
                        c.outcome === 'Resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                        c.outcome === 'Verbal admonishment' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        c.outcome === 'Referred to EAP' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {c.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button 
                        onClick={() => setViewingRecord(c)}
                        className="text-[12px] font-bold text-gray-600 border border-gray-300 bg-white px-3 py-1.5 rounded hover:bg-gray-50 shadow-sm transition-colors"
                      >
                        View log
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Counselling Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[600px] flex flex-col font-sans">
            
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#0f172a] text-lg">Log Counselling</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Employee Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Employee <span className="text-red-500">*</span></label>
                <div 
                  className="w-full border border-gray-300 rounded-md p-2.5 flex items-center justify-between cursor-pointer hover:border-gray-400 bg-white transition-colors shadow-sm"
                  onClick={() => !isLoadingEmployees && setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                >
                  <span className={selectedEmployee ? 'text-gray-800 font-medium text-sm' : 'text-gray-500 text-sm'}>
                    {isLoadingEmployees ? 'Loading...' : (selectedEmployee ? selectedEmployee.name : '— Select employee —')}
                  </span>
                  <ChevronDown size={16} className="text-gray-500" />
                </div>

                {isEmployeeDropdownOpen && !isLoadingEmployees && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-56 overflow-y-auto">
                    <div className="p-2.5 hover:bg-gray-50 cursor-pointer text-gray-500 border-b text-sm" onClick={() => { setSelectedEmployee(null); setIsEmployeeDropdownOpen(false); }}>
                      — Select employee —
                    </div>
                    {employees.map((emp) => (
                      <div 
                        key={emp._id} 
                        className={`p-2.5 flex items-center cursor-pointer text-sm hover:bg-gray-100 ${selectedEmployee?._id === emp._id ? 'bg-[#f8fafc] font-medium text-[#0f172a]' : 'text-gray-700'}`}
                        onClick={() => { setSelectedEmployee(emp); setIsEmployeeDropdownOpen(false); }}
                      >
                        {emp.openCasesCount > 0 ? (
                          <div className="w-2 h-2 rounded-full bg-red-500 mr-2.5 flex-shrink-0"></div>
                        ) : (
                          <div className="w-2 h-2 mr-2.5 flex-shrink-0"></div>
                        )}
                        <span>
                          {emp.name} <span className="text-gray-500">— {emp.jobTitle}</span> {emp.openCasesCount > 0 && <span className="font-medium">({emp.openCasesCount} open case{emp.openCasesCount > 1 ? 's' : ''})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Issue / concern</label>
                <input 
                  type="text" 
                  placeholder="What performance or conduct problem occurred..."
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">What was discussed</label>
                <textarea 
                  placeholder="The counselling conversation, and any agreement reached..."
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 min-h-[100px] resize-y shadow-sm"
                  value={discussed}
                  onChange={(e) => setDiscussed(e.target.value)}
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Outcome</label>
                  <select 
                    className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm cursor-pointer"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                  >
                    <option value="Resolved">Resolved</option>
                    <option value="Verbal admonishment">Verbal admonishment</option>
                    <option value="Referred to EAP">Referred to EAP</option>
                    <option value="No further action">No further action</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm cursor-pointer"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 pt-2">
                To take this further, save it and use "Escalate" to raise a formal case — the notes carry forward.
              </p>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSubmitting}
                className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-[#0f172a] hover:bg-gray-800 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only View Record Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[500px] flex flex-col font-sans">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#0f172a] text-lg">Counselling Log</h3>
              <button onClick={() => setViewingRecord(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Employee</span>
                  <div className="text-sm font-semibold text-[#0f172a] mt-1">{viewingRecord.employeeId?.personalDetails?.firstName} {viewingRecord.employeeId?.personalDetails?.lastName}</div>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Date</span>
                  <div className="text-sm font-medium text-gray-800 mt-1">{new Date(viewingRecord.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
              
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Issue / Concern</span>
                <div className="text-sm font-medium text-[#0f172a] mt-1">{viewingRecord.issue}</div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">What was discussed</span>
                <div className="text-sm text-gray-700 mt-1 bg-gray-50 p-3 rounded-md border border-gray-100 whitespace-pre-wrap">
                  {viewingRecord.discussed}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">Outcome</span>
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm border w-fit ${
                  viewingRecord.outcome === 'Resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                  viewingRecord.outcome === 'Verbal admonishment' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  viewingRecord.outcome === 'Referred to EAP' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-gray-100 text-gray-700 border-gray-200'
                }`}>
                  {viewingRecord.outcome}
                </span>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end bg-gray-50 rounded-b-lg">
              <button 
                onClick={() => setViewingRecord(null)}
                className="px-5 py-2 rounded-md text-sm font-semibold text-white bg-[#0f172a] hover:bg-gray-800 shadow-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}