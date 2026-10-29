"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Info, Paperclip, Plus, ChevronDown, Loader2, X, AlertTriangle } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '../../../../../lib/api';

const ACTIONS = {
  A: "A — Admonishment (verbal warning)",
  R: "R — Written warning",
  S3: "S3 — 3-day suspension (unpaid)",
  S10: "S10 — 10-day suspension (unpaid)",
  S20: "S20 — 20-day suspension (unpaid)",
  D: "D — Dismissal"
};

const OFFENCES_DATA = [
  { text: "1. Unexcused tardiness (late without good reason)", actions: [ACTIONS.A], type: "Attendance" },
  { text: "2. Unexcused or unauthorised absence (AWOL)", actions: [ACTIONS.R, ACTIONS.S3], type: "Attendance" },
  { text: "3. Abandonment of position", actions: [ACTIONS.D], type: "Attendance" },
  { text: "4. Leaving assigned job during working hours without permission", actions: [ACTIONS.A, ACTIONS.R], type: "Attendance" },
  { text: "5. Loafing, idleness, wasting time", actions: [ACTIONS.A], type: "Performance" },
  { text: "6. Careless or negligent workmanship causing waste or delay", actions: [ACTIONS.A, ACTIONS.R], type: "Performance" },
  { text: "7. Traffic violation, reckless driving, improper vehicle operation", actions: [ACTIONS.A, ACTIONS.R, ACTIONS.S3, ACTIONS.S10], type: "Safety" },
  { text: "8. Ignoring safety precautions or not using safety clothing/equipment", actions: [ACTIONS.S10], type: "Safety" },
  { text: "9. Smoking in \"No Smoking\" areas; matches/lighters in explosive areas", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Safety" },
  { text: "10. Carrying explosives, firearms or lethal weapons without authorisation", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Safety" },
  { text: "11. Endangering the safety of, or injuring, other personnel", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Safety" },
  { text: "12. Failure to report a personal injury or accident at work", actions: [ACTIONS.A, ACTIONS.R], type: "Safety" },
  { text: "13. Deliberate failure/delay in carrying out instructions (e.g. monthly reports)", actions: [ACTIONS.R, ACTIONS.S3], type: "Performance" },
  { text: "14. Sleeping on duty (public safety NOT endangered)", actions: [ACTIONS.A, ACTIONS.R, ACTIONS.S3, ACTIONS.S10], type: "Performance" },
  { text: "15. Physical/verbal abuse, disrespect, gossip, insulting language, defamation", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Conduct" },
  { text: "16. Excessive/improper personal use of Company equipment (phone, PC, email, internet)", actions: [ACTIONS.A, ACTIONS.R], type: "Performance" },
  { text: "17. Outside employment or financial interest without CEO approval", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Conflict of Interest" },
  { text: "18. Outside activities/relationships creating a conflict of interest", actions: [ACTIONS.A, ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Conflict of Interest" },
  { text: "19. Unauthorised access/disclosure/misuse of confidential info or PII", actions: [ACTIONS.A, ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Conflict of Interest" },
  { text: "20. Inappropriate fraternisation (abuse of chain-of-command relationships)", actions: [ACTIONS.D], type: "Conduct" },
  { text: "21. Insubordination — refusing a proper order or abusive language to supervisors", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Conduct" },
  { text: "22. Reporting for / being on duty under the influence of intoxicants", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Conduct" },
  { text: "23. Giving or selling intoxicants to others on Company premises", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Conduct" },
  { text: "24. Gambling or unlawful betting on Company premises", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20], type: "Conduct" },
  { text: "25. Promotion of gambling on Company premises", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Conduct" },
  { text: "26. Indebtedness — not paying just financial obligations to the Company in good faith", actions: [ACTIONS.A], type: "Conduct" },
  { text: "27. Actual or attempted theft of Company or personal property", actions: [ACTIONS.D], type: "Integrity" },
  { text: "28. Falsifying attendance records (for self or another)", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Integrity" },
  { text: "29. Falsification/concealment of material facts; forging records; false info", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Integrity" },
  { text: "30. Loss, damage or unauthorised use of Company property", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Conduct" },
  { text: "31. Wilful unofficial use of Company vehicle", actions: [ACTIONS.S20, ACTIONS.D], type: "Conduct" },
  { text: "32. Borrowing from a subordinate; borrowing/lending over $20 on premises", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Conduct" },
  { text: "33. Soliciting contributions / promoting unendorsed campaigns on premises", actions: [ACTIONS.A, ACTIONS.R, ACTIONS.S3], type: "Conduct" },
  { text: "34. Selling tickets, goods, commodities or services on Company premises", actions: [ACTIONS.A, ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Conduct" },
  { text: "35. Accepting/soliciting gifts or gratuities from those doing business with Company", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Integrity" },
  { text: "36. Engaging in black-market activity (e.g. selling Company fuel privately)", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Integrity" },
  { text: "37. Accepting bribes or improper payments for favourable treatment", actions: [ACTIONS.D], type: "Integrity" },
  { text: "38. Misconduct off duty (where it creates risk to safety, operations or trust)", actions: [ACTIONS.A, ACTIONS.R], type: "Conduct" },
  { text: "39. Refusal to testify or furnish information in Company investigations", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Integrity" },
  { text: "40. Failure of security directives; failure to safeguard sensitive information", actions: [ACTIONS.R, ACTIONS.S3, ACTIONS.S10, ACTIONS.S20, ACTIONS.D], type: "Integrity" }
];

function RaiseCaseForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams ? searchParams.get('editId') : null;

  const [showInfoBox, setShowInfoBox] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeCases, setEmployeeCases] = useState({ open: [], closed: [] });
  const [offences, setOffences] = useState([{ id: 1, offence: '', action: '', occurrence: '1st occurrence' }]);
  const [dateRaised, setDateRaised] = useState(new Date().toISOString().split('T')[0]);
  const [statement, setStatement] = useState('');
  const [isSerious, setIsSerious] = useState(false);
  const [files, setFiles] = useState([]); // Newly added files
  const [existingFiles, setExistingFiles] = useState([]); // Files previously uploaded (in DB)

  // Modal State for "View History"
  const [viewingCase, setViewingCase] = useState(null);

  const dropdownRef = useRef(null);

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
          department: emp.employmentDetails?.department || 'ICT',
          openCasesCount: openCases.length,
          allCases: allCases
        };
      }));
      
      setEmployees(teamWithCases);
    } catch (error) {
      console.error("Failed to load team members", error);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  useEffect(() => {
    setIsLoadingEmployees(true);
    fetchTeamMembers();

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // AUTO-FILL LOGIC: Fetch Draft Data if `editId` is in the URL
  useEffect(() => {
    if (editId && employees.length > 0) {
      api.get(`/disciplinary/${editId}`).then(res => {
        const data = res.data?.data;
        if (data) {
          const emp = employees.find(e => e._id === (data.employeeId?._id || data.employeeId));
          if (emp) setSelectedEmployee(emp);
          setOffences(data.offences && data.offences.length > 0 ? data.offences : [{ id: 1, offence: '', action: '', occurrence: '1st occurrence' }]);
          setDateRaised(data.dateRaised ? new Date(data.dateRaised).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
          setStatement(data.statement || '');
          setIsSerious(data.isSerious || false);
          setExistingFiles(data.attachedFiles || []);
        }
      }).catch(err => console.error("Error fetching draft case for editing", err));
    }
  }, [editId, employees]);

  useEffect(() => {
    if (selectedEmployee) {
      api.get(`/disciplinary/employee/${selectedEmployee._id}`)
        .then(res => {
          const cases = res.data?.data || [];
          const open = cases.filter(c => c.status !== 'CLOSED' && c.status !== 'RESOLVED' && c.status !== 'WITHDRAWN');
          const closed = cases.filter(c => c.status === 'CLOSED' || c.status === 'RESOLVED');
          setEmployeeCases({ open, closed });
        })
        .catch(() => setEmployeeCases({ open: [], closed: [] }));
    } else {
      setEmployeeCases({ open: [], closed: [] });
    }
  }, [selectedEmployee]);

  const handleAddOffence = () => {
    setOffences([...offences, { id: offences.length + 1, offence: '', action: '', occurrence: '1st occurrence' }]);
  };

  const handleUpdateOffence = (id, field, value) => {
    setOffences(offences.map(off => {
      if (off.id === id || off._id === id) {
        const updatedOff = { ...off, [field]: value };
        
        if (field === 'offence') {
          if (value) {
             const allPast = [...employeeCases.open, ...employeeCases.closed];
             const previousCount = allPast.filter(c => c.offences?.some(o => o.offence === value)).length;
             const suffixes = ["1st", "2nd", "3rd", "4th", "5th"];
             updatedOff.occurrence = `${suffixes[Math.min(previousCount, 4)]} occurrence`;
          } else {
             updatedOff.occurrence = '1st occurrence';
          }

          const matchedOffence = OFFENCES_DATA.find(o => o.text === value);
          if (matchedOffence) {
            if (matchedOffence.actions.length === 1) {
              updatedOff.action = matchedOffence.actions[0];
            } else if (!matchedOffence.actions.includes(updatedOff.action)) {
              updatedOff.action = '';
            }
          } else {
            updatedOff.action = '';
          }
        }
        return updatedOff;
      }
      return off;
    }));
  };

  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    setFiles([...files, ...uploadedFiles]);
  };

  const removeExistingFile = (fileName) => {
    setExistingFiles(existingFiles.filter(f => f !== fileName));
  };

  const removeNewFile = (fileObj) => {
    setFiles(files.filter(f => f.name !== fileObj.name));
  };

  const handleSubmit = async (isDraft) => {
    if (!selectedEmployee) {
      alert("Please select an employee first.");
      return;
    }
    if (!statement.trim()) {
      alert("Please provide a statement of facts.");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const formData = new FormData();
      formData.append('employeeId', selectedEmployee._id);
      
      const cleanOffences = offences.map(o => ({ offence: o.offence, action: o.action, occurrence: o.occurrence }));
      formData.append('offences', JSON.stringify(cleanOffences));
      
      formData.append('dateRaised', dateRaised);
      formData.append('statement', statement);
      formData.append('isSerious', isSerious); 
      formData.append('status', isDraft ? 'DRAFT' : 'SUBMITTED_TO_HR');
      
      // Preserve older un-deleted files in edit mode
      formData.append('retainedFiles', JSON.stringify(existingFiles));

      // Append actual physical files to the payload under the key 'files'
      files.forEach((file) => {
        formData.append('files', file);
      });

      if (editId) {
        // PUT Request to Update Draft
        await api.put(`/disciplinary/${editId}`, formData);
        alert(isDraft ? "Draft successfully updated!" : "Case updated and submitted to HR!");
        router.push('/dashboard/manager/team');
      } else {
        // POST Request to Create New
        await api.post('/disciplinary', formData);
        alert(isDraft ? "Draft successfully saved to Database!" : "Case officially submitted to HR Database!");
        
        setSelectedEmployee(null);
        setOffences([{ id: 1, offence: '', action: '', occurrence: '1st occurrence' }]);
        setStatement('');
        setIsSerious(false);
        setFiles([]);
        setExistingFiles([]);
        setDateRaised(new Date().toISOString().split('T')[0]);
        await fetchTeamMembers();
      }

    } catch (error) {
      console.error("Database Save Error:", error);
      alert("Failed to save to Database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBadgeFromAction = (actionStr) => {
    if (!actionStr) return null;
    const match = actionStr.split(' — ')[0];
    return match || actionStr;
  };

  const formatDateString = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch (e) {
      return dateString;
    }
  };

  const getEvidenceUrl = (fileName) => {
    if (!fileName) return '#';
    if (fileName.startsWith('http')) return fileName;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const cleanBaseUrl = backendUrl.replace(/\/$/, ''); 
    return `${cleanBaseUrl}/uploads/${fileName}`;
  };

  const ModalSection = ({ number, title, children }) => (
    <div className="border border-[#e2e8f0] rounded-md overflow-hidden mb-4 shadow-sm">
      <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-4 py-2.5 flex items-center gap-2.5">
        <span className="w-5 h-5 rounded-full bg-[#1e293b] text-white text-[11px] flex items-center justify-center font-bold">{number}</span>
        <span className="text-[13px] font-bold text-[#1e293b]">{title}</span>
      </div>
      <div className="p-4 bg-white text-[13px] text-gray-700">
        {children}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-800">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {editId ? 'Edit Disciplinary Case' : 'Raise a Disciplinary Case'}
          <Info size={18} className="text-gray-400 cursor-pointer" />
        </h1>
        <p className="text-sm text-gray-500">Counsel first — raise a formal case only if the problem continues</p>
      </div>

      {/* Info Box */}
      {showInfoBox && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 relative shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-600 rounded-md p-1"><Info size={16} /></div>
              <h2 className="font-semibold text-gray-800">How Raise a Case works</h2>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">Line Manager</span>
            </div>
            <button onClick={() => setShowInfoBox(false)} className="text-sm text-gray-500 hover:text-gray-800 font-medium">Hide</button>
          </div>
          <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
            <li>Pick the employee and offence — the system checks history and shows the 1st/2nd/3rd occurrence and matching penalty range.</li>
            <li>Your recommended action must sit inside that range. Record the statement of facts, then submit to HR (or save as a draft).</li>
            <li>A single incident can involve several offences — use "+ Add offence" to add each one; every offence has its own range and recommended action. You can also attach supporting documents or evidence.</li>
            <li>Employees with an open case show a red flag in the dropdown. When selected, you see their open and past cases (with "View history") so you can avoid duplicates.</li>
            <li>If the employee has no counselling on file and the case isn't serious, a reminder suggests counselling first. For a serious offence, tick "Serious offence" and raise it directly.</li>
            <li>Warnings have an active window — a written warning counts for 3 months, a suspension/final warning for 6 months. After that with no new case, it expires and the slate is wiped clean (it no longer counts toward occurrence).</li>
          </ul>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        
        {/* Employee Dropdown */}
        <div className="mb-6 relative" ref={dropdownRef}>
          <label className="block text-sm font-semibold mb-2 flex items-center gap-1">
            Employee <Info size={14} className="text-gray-400" />
          </label>
          <div 
            className={`w-full border rounded-md p-2.5 flex items-center justify-between shadow-sm transition-colors ${editId ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'bg-white cursor-pointer hover:border-gray-400 border-gray-300'}`}
            onClick={() => !editId && !isLoadingEmployees && setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
          >
            <span className={selectedEmployee ? 'text-gray-800 font-medium' : 'text-gray-500'}>
              {isLoadingEmployees ? 'Loading your team members...' : (selectedEmployee ? `${selectedEmployee.name} — ${selectedEmployee.jobTitle}` : '— Select employee —')}
            </span>
            <ChevronDown size={16} className="text-gray-500" />
          </div>

          {/* Custom Dropdown Options */}
          {isEmployeeDropdownOpen && !isLoadingEmployees && !editId && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
              <div className="p-3 hover:bg-gray-50 cursor-pointer text-gray-500 border-b text-sm" onClick={() => { setSelectedEmployee(null); setIsEmployeeDropdownOpen(false); }}>
                — Select employee —
              </div>
              {employees.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No direct reports found.</div>
              ) : (
                employees.map((emp) => (
                  <div 
                    key={emp._id} 
                    className={`p-3 flex items-center cursor-pointer text-sm hover:bg-gray-100 ${selectedEmployee?._id === emp._id ? 'bg-[#0f172a] text-white hover:bg-gray-800' : 'text-gray-800'}`}
                    onClick={() => { setSelectedEmployee(emp); setIsEmployeeDropdownOpen(false); }}
                  >
                    {emp.openCasesCount > 0 ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 mr-3 flex-shrink-0 animate-pulse"></div>
                    ) : (
                      <div className="w-2.5 h-2.5 mr-3 flex-shrink-0"></div>
                    )}
                    <span>
                      {emp.name} <span className="opacity-75">— {emp.jobTitle}</span> {emp.openCasesCount > 0 && <span className="opacity-90 font-medium">({emp.openCasesCount} open case{emp.openCasesCount > 1 ? 's' : ''})</span>}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected Employee Running/Past Cases Status Card */}
        {selectedEmployee && (
          <div className="mb-6 space-y-3">
            {employeeCases.open.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm font-bold text-red-800 mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  This employee already has {employeeCases.open.length} open case{employeeCases.open.length > 1 ? 's' : ''} — check in 3. duplicates.
                </div>
                {employeeCases.open.map(c => (
                  <div key={c._id} className="flex items-center justify-between mt-2 pt-2 border-t border-red-100 text-xs">
                    <span className="font-semibold text-gray-800">{c.caseId || 'DC-1048'} — {c.offences?.[0]?.offence || 'Offence'} with <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">{c.offences?.[0]?.action || 'Warning'}</span></span>
                    <button 
                      onClick={() => setViewingCase(c)}
                      className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      View history
                    </button>
                  </div>
                ))}
              </div>
            )}

            {employeeCases.closed.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="text-sm font-semibold text-green-800 mb-1">
                  This employee has {employeeCases.closed.length} past (closed) case on record
                </div>
                {employeeCases.closed.map(c => (
                  <div key={c._id} className="flex items-center justify-between mt-2 pt-2 border-t border-green-100 text-xs">
                    <span className="text-gray-700">{c.caseId || 'DC-1044'} — {c.offences?.[0]?.offence || 'Offence'}</span>
                    <button 
                      onClick={() => setViewingCase(c)}
                      className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      View history
                    </button>
                  </div>
                ))}
              </div>
            )}

            {employeeCases.open.length === 0 && employeeCases.closed.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3.5 text-xs text-yellow-900 flex items-center gap-2 font-medium">
                <span>💬 No counselling on file — consider counselling first.</span>
                <span className="text-gray-500">Counselling is recommended first for a minor or first-time issue. For a serious offence, tick "Serious offence" below and raise the case directly.</span>
              </div>
            )}
          </div>
        )}

        {/* Offences Section */}
        <div className="mb-6 border border-gray-200 rounded-md p-4 bg-gray-50/50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold text-gray-700">Offences <span className="font-normal text-gray-500">(a single incident may involve more than one)</span></span>
            <button 
              onClick={handleAddOffence}
              className="flex items-center gap-1 text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 font-medium shadow-sm transition-colors"
            >
              <Plus size={16} /> Add offence <Info size={14} className="text-gray-400 ml-1" />
            </button>
          </div>

          {offences.map((off, index) => {
            const matchedOffence = OFFENCES_DATA.find(o => o.text === off.offence);
            const availableActions = matchedOffence ? matchedOffence.actions : [];

            return (
              <div key={off.id || off._id || index} className="mb-4 pb-4 border-b border-gray-200 last:border-0 last:mb-0 last:pb-0">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Offence {index + 1}</h3>
                
                {off.offence && (
                   <div className="mb-3 text-xs inline-flex items-center bg-[#e2e8f0] text-gray-800 px-2.5 py-1 rounded shadow-sm border border-gray-300">
                     {off.occurrence} <span className="text-red-600 font-bold ml-1 tracking-wide">AW</span>
                   </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Offence</label>
                    <select 
                      className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 truncate bg-white shadow-sm"
                      value={off.offence}
                      onChange={(e) => handleUpdateOffence(off.id || off._id, 'offence', e.target.value)}
                    >
                      <option value="">— Select offence —</option>
                      {OFFENCES_DATA.map((offenceItem, i) => (
                        <option key={i} value={offenceItem.text}>{offenceItem.text}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Recommended action</label>
                    <select 
                      className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                      value={off.action}
                      onChange={(e) => handleUpdateOffence(off.id || off._id, 'action', e.target.value)}
                      disabled={!off.offence}
                    >
                      <option value="">— Select action —</option>
                      {availableActions.map((action, i) => (
                        <option key={i} value={action}>{action}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Date Raised */}
        <div className="mb-6 w-1/3">
          <label className="block text-sm font-semibold mb-2">Date raised</label>
          <input 
            type="date" 
            className="w-full border border-gray-300 rounded-md p-2.5 text-sm pr-10 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            value={dateRaised}
            onChange={(e) => setDateRaised(e.target.value)}
          />
        </div>

        {/* Statement of Facts */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Statement of facts</label>
          <textarea 
            className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-blue-500 focus:border-blue-500 min-h-[120px] resize-y shadow-sm"
            placeholder="What happened, investigations, employee response so far..."
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
          ></textarea>
        </div>

        {/* Supporting Documents */}
        <div className="mb-8">
          <label className="block text-sm font-semibold mb-2 flex items-center gap-1">
            Supporting documents & evidence <Info size={14} className="text-gray-400" />
          </label>
          <div className="w-full border-2 border-dashed border-gray-300 rounded-md p-6 bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition relative">
            <input 
              type="file" 
              multiple 
              accept="image/*, video/*, audio/*, .pdf, .doc, .docx, .txt"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileUpload}
            />
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <Paperclip size={18} /> Click to upload documents, PDFs, images, videos or audio
            </div>
          </div>
          
          {(files.length > 0 || existingFiles.length > 0) && (
             <div className="mt-3 flex flex-wrap gap-2">
               {existingFiles.map((file, i) => (
                 <span key={`ex-${i}`} className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded border border-blue-200">
                   <Paperclip size={12} className="text-blue-500" />
                   {file}
                   <X size={12} className="cursor-pointer text-red-500 ml-1 hover:bg-red-100 rounded-full" onClick={() => removeExistingFile(file)} title="Remove file" />
                 </span>
               ))}
               {files.map((file, i) => (
                 <span key={`new-${i}`} className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded border border-gray-200">
                   <Paperclip size={12} className="text-gray-500" />
                   {file.name}
                   <X size={12} className="cursor-pointer text-red-500 ml-1 hover:bg-red-100 rounded-full" onClick={() => removeNewFile(file)} title="Remove file" />
                 </span>
               ))}
             </div>
          )}
        </div>

        {/* Serious Offence HR Alert Bar */}
        <div className={`border rounded-md p-4 mb-6 flex items-center gap-3 transition-colors ${isSerious ? 'bg-[#fef2f2] border-[#fecaca]' : 'bg-gray-50 border-gray-200'}`}>
          <input 
            type="checkbox" 
            id="seriousOffence"
            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
            checked={isSerious}
            onChange={(e) => setIsSerious(e.target.checked)}
          />
          <label htmlFor="seriousOffence" className={`text-sm cursor-pointer ${isSerious ? 'font-medium text-[#991b1b]' : 'text-gray-600'}`}>
            Serious offence <span className="font-normal">— report to HR immediately. HR is alerted now, while the investigation continues.</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-200">
          <button 
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="px-5 py-2.5 border border-gray-300 rounded-md text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin text-gray-500" /> : null}
            {editId ? 'Update draft' : 'Save as draft'} <Info size={14} className="text-gray-400" />
          </button>
          <button 
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-md text-sm font-semibold text-white bg-[#0f172a] hover:bg-gray-800 flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
            Submit to HR <Info size={14} className="text-gray-400" />
          </button>
        </div>

      </div>

      {/* 9-Step Full Case History Modal */}
      {viewingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[650px] max-h-[90vh] flex flex-col font-sans">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-lg z-10">
              <h3 className="font-bold text-[#1e293b] text-base">Full case history — {viewingCase.caseId || 'DC-1067'}</h3>
              <button onClick={() => setViewingCase(null)} className="text-gray-400 hover:text-gray-700">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            
            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto flex-1 bg-white">
              
              {/* 1. Employee & charge */}
              <ModalSection number="1" title="Employee & charge">
                <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-3 mb-3 items-center">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">EMPLOYEE</span>
                  <span className="text-[13px]">{selectedEmployee?.name || 'Lesivou Bulabalavu'} — {selectedEmployee?.jobTitle || 'ICT Manager, ICT'}</span>
                  
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">SUPERVISOR</span>
                  <span className="text-[13px]">{viewingCase.supervisorName || 'Harbert Tom'}</span>
                </div>
                
                <div className="border border-[#e2e8f0] rounded p-3 bg-white mt-4">
                  <h4 className="font-bold text-[#1e293b] text-[13px] mb-2 leading-tight">
                    {viewingCase.offences?.[0]?.offence || '16. Excessive/improper personal use of Company equipment (phone, PC, email, internet)'}
                  </h4>
                  <div className="text-[11px] text-gray-500 flex items-center gap-1.5 flex-wrap">
                    {OFFENCES_DATA.find(o => o.text === viewingCase.offences?.[0]?.offence)?.type || 'Performance'} · {viewingCase.offences?.[0]?.occurrence || '1st occurrence'} · range
                    <span className="bg-[#eff6ff] text-[#3b82f6] font-bold px-1.5 py-0.5 rounded ml-0.5 text-[10px]">A</span>
                    <span className="text-gray-400">→</span>
                    <span className="bg-[#fefce8] text-[#eab308] font-bold px-1.5 py-0.5 rounded text-[10px]">R</span>
                    · LM recommended
                    <span className="bg-[#eff6ff] text-[#3b82f6] font-bold px-1.5 py-0.5 rounded ml-0.5 text-[10px]">
                      {getBadgeFromAction(viewingCase.offences?.[0]?.action) || 'A'}
                    </span>
                  </div>
                </div>
              </ModalSection>

              {/* 2. Counselling before the case */}
              <ModalSection number="2" title="Counselling before the case">
                <span className="text-gray-500">{viewingCase.counselling || 'No counselling recorded for this employee.'}</span>
              </ModalSection>

              {/* 3. Case raised by the line manager */}
              <ModalSection number="3" title="Case raised by the line manager">
                <div className="grid grid-cols-[130px_1fr] gap-x-2 gap-y-3 mb-4 items-center">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">DATE RAISED</span>
                  <span className="text-[13px] font-medium">{formatDateString(viewingCase.dateRaised)}</span>
                  
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">LM RECOMMENDED</span>
                  <span className="text-[13px] flex items-center gap-2 font-medium">
                    <span className="bg-[#eff6ff] text-[#3b82f6] font-bold px-1.5 py-0.5 rounded text-[10px]">
                      {getBadgeFromAction(viewingCase.offences?.[0]?.action) || 'A'}
                    </span>
                    {viewingCase.offences?.[0]?.action || 'Admonishment (verbal warning)'}
                  </span>
                </div>

                {viewingCase.isSerious === true && (
                  <div className="bg-[#fef2f2] text-[#b91c1c] text-[12px] font-semibold p-2.5 rounded border border-[#fecaca] mb-4 flex items-center gap-2">
                    <AlertTriangle size={14} strokeWidth={2.5} /> Flagged as a serious offence — reported to HR immediately.
                  </div>
                )}
                
                <div className="border border-[#e2e8f0] rounded-md p-3 text-[13px] bg-[#f8fafc] min-h-[60px]">
                  {viewingCase.statement || 'No statement provided.'}
                </div>
              </ModalSection>

              {/* 4. HR investigation */}
              <ModalSection number="4" title="HR investigation">
                <span className="text-gray-500">{viewingCase.hrInvestigation || 'No investigation recorded yet.'}</span>
              </ModalSection>

              {/* 5. Witness statements */}
              <ModalSection number="5" title="Witness statements">
                <span className="text-gray-500">{viewingCase.witnesses || 'No witnesses recorded.'}</span>
              </ModalSection>

              {/* 6. Evidence - Points to backend API URL */}
              <ModalSection number="6" title="Evidence">
                {viewingCase.attachedFiles && viewingCase.attachedFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {viewingCase.attachedFiles.map((file, idx) => {
                       const fileName = typeof file === 'string' ? file : file.name;
                       return (
                         <a 
                           key={idx} 
                           href={getEvidenceUrl(fileName)} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors px-2.5 py-1.5 rounded-md border border-blue-200 text-xs font-medium w-fit cursor-pointer"
                           title="Click to preview or download"
                         >
                           <Paperclip size={14} />
                           {fileName}
                         </a>
                       )
                    })}
                  </div>
                ) : (
                  <span className="text-gray-500">No documents or images uploaded.</span>
                )}
              </ModalSection>

              {/* 7. Escalation & recommendations */}
              <ModalSection number="7" title="Escalation & recommendations">
                <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-3 mb-2 items-center">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">ROUTE</span>
                  <span className="text-[13px] font-medium">{viewingCase.route || 'Handled at HR level'}</span>
                </div>
                <div className="text-gray-500 mt-2">
                  {viewingCase.escalation || 'No escalation recorded.'}
                </div>
              </ModalSection>

              {/* 8. Employee response & decision */}
              <ModalSection number="8" title="Employee response & decision">
                <div className="text-gray-500 mb-4">{viewingCase.employeeResponse || 'No response recorded.'}</div>
                <div className="grid grid-cols-[130px_1fr] gap-x-2 items-center">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">CURRENT STATUS</span>
                  <span className="bg-[#fef3c7] text-[#92400e] font-bold px-2 py-0.5 rounded text-[11px] w-fit">
                    {viewingCase.status || 'With HR'}
                  </span>
                </div>
              </ModalSection>

              {/* 9. Audit trail */}
              <ModalSection number="9" title="Audit trail">
                <div className="text-gray-600 text-[12px]">
                  {viewingCase.auditTrail || `${formatDateString(viewingCase.createdAt || viewingCase.dateRaised)} · Line Manager — Raised case`}
                </div>
              </ModalSection>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end bg-white rounded-b-lg">
              <button 
                onClick={() => setViewingCase(null)}
                className="px-5 py-2 bg-[#1e293b] text-white text-[13px] font-bold rounded-md hover:bg-gray-800 transition-colors"
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

// Wrap in Suspense to prevent Next.js static de-opt build warnings when using useSearchParams
export default function RaiseCase() {
  return (
    <Suspense fallback={<div className="p-10 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>}>
      <RaiseCaseForm />
    </Suspense>
  );
}