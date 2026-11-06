"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Info, AlertTriangle, Printer, FileText, Loader2, X, Plus, Save } from 'lucide-react';
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

const getResponseStatus = (noticeDateStr) => {
  if (!noticeDateStr) return { isOverdue: false, daysLeft: 5, overdueBy: 0 };
  
  const startDate = new Date(noticeDateStr);
  const today = new Date();
  startDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  let daysPassed = 0;
  let curDate = new Date(startDate);
  
  while (curDate < today) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
      daysPassed++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  
  if (daysPassed > 5) {
     return { isOverdue: true, daysLeft: 0, overdueBy: daysPassed - 5 };
  } else {
     return { isOverdue: false, daysLeft: 5 - daysPassed, overdueBy: 0 };
  }
};

export default function HRQueue() {
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [showInfo, setShowInfo] = useState(true);
  const [seriousAlerts, setSeriousAlerts] = useState([]);
  
  const [activeModal, setActiveModal] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [modalFormData, setModalFormData] = useState({});
  const [witnesses, setWitnesses] = useState([{ name: '', statement: '' }]);
  const [juryMembers, setJuryMembers] = useState([{ name: '', role: '' }]);
  const [isJuryActive, setIsJuryActive] = useState(false);

  const printRef = useRef();

  useEffect(() => {
    fetchQueueData();
  }, []);

  const fetchQueueData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hr-queue'); 
      const allCases = res.data?.data || [];
      const activeHrCases = allCases.filter(c => !['WITH_SMT', 'WITH_CEO', 'CLOSED'].includes(c.hrWorkflowStatus));
      setCases(activeHrCases);
      setSeriousAlerts(activeHrCases.filter(c => c.isSerious && !c.hrAcknowledged));
    } catch (error) {
      console.error("Failed to fetch HR Queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action, caseItem) => {
    setSelectedCase(caseItem);
    setActiveModal(action);
    setModalFormData({}); 
    setWitnesses([{ name: '', statement: '' }]);
    setJuryMembers([{ name: '', role: '' }]);
    setIsJuryActive(false);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedCase(null);
  };

  const submitWorkflowAction = async (endpoint, payload, specificCaseId = null) => {
    const targetId = specificCaseId || selectedCase?._id;
    if (!targetId) return;

    try {
      let finalPayload = { ...payload };

      if (endpoint === 'investigate') {
        finalPayload = {
          findings: modalFormData.findings || '',
          discussionManager: modalFormData.discussionManager || '',
          discussionEmployee: modalFormData.discussionEmployee || '',
          witnesses: witnesses.filter(w => w.name.trim() !== '')
        };
      }

      await api.post(`/hr-queue/${targetId}/${endpoint}`, finalPayload);
      if (activeModal) closeModal();
      fetchQueueData(); 
    } catch (error) {
      console.error(`Error saving ${endpoint}:`, error);
      alert("Failed to save action. Please try again.");
    }
  };

  const getRangeDisplay = (caseItem) => {
    const offenceText = caseItem.offences?.[0]?.offence;
    if (!offenceText) return { min: 'W', max: 'WW' };

    const matchedOffence = OFFENCES_DATA.find(o => o.text === offenceText);
    
    if (matchedOffence && matchedOffence.actions && matchedOffence.actions.length > 0) {
      const firstAction = matchedOffence.actions[0];
      const lastAction = matchedOffence.actions[matchedOffence.actions.length - 1];
      
      const extractCode = (str) => {
          if (typeof str !== 'string') return 'W';
          return str.includes('—') ? str.split('—')[0].trim() : str.split('-')[0].trim();
      };
      return { min: extractCode(firstAction), max: extractCode(lastAction) };
    }
    return { min: 'W', max: 'WW' };
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    const windowPrint = window.open('', '', 'width=900,height=650');
    windowPrint.document.write(`
      <html>
        <head>
          <title>Notice of Disciplinary Charge</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            h1 { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
            .row { margin-bottom: 15px; }
            .label { font-weight: bold; width: 150px; display: inline-block; }
            .section-title { font-weight: bold; text-transform: uppercase; margin-top: 30px; margin-bottom: 10px; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    windowPrint.document.close();
    windowPrint.focus();
    windowPrint.print();
    windowPrint.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4]">
        <Loader2 className="w-10 h-10 animate-spin text-[#0f172a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] p-6 font-sans text-gray-800">
      
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold flex items-center gap-2 text-[#0f172a]">
            HR Queue <Info size={18} className="text-[#0f172a] cursor-pointer" />
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">Cases awaiting HR action, in workflow order</p>
        </div>
      </div>

      {showInfo ? (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-5 mb-6 relative shadow-sm transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 text-blue-600 rounded p-1"><Info size={16} /></div>
              <h2 className="font-bold text-[#0f172a] text-sm">How the HR Queue works</h2>
              <span className="bg-[#fef08a] text-[#854d0e] text-[11px] px-2 py-0.5 rounded font-bold">HR Manager</span>
            </div>
            <button onClick={() => setShowInfo(false)} className="text-sm text-gray-500 hover:text-gray-800 font-medium">Hide</button>
          </div>
          <ul className="text-[13px] text-gray-600 space-y-2 list-disc pl-5 ml-1 leading-relaxed">
            <li>Cases needing HR action, in order: review &amp; save the official notice &rarr; record the employee's response &rarr; record the decision.</li>
            <li>If an employee has been given a notice but fails to respond, if the 5 days pass with no response, use &quot;Proceed without response&quot; to move to decision.</li>
            <li>Issuing the notice starts the 5 working days response window. The final decision must stay within the offence range.</li>
            <li>For a serious case, you can activate a Jury of Peers (impartial panel) to give an independent finding and recommendation.</li>
          </ul>
        </div>
      ) : (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-3 mb-6 flex items-center justify-between shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-600 rounded p-1"><Info size={16} /></div>
            <h2 className="font-bold text-[#0f172a] text-sm">How the HR Queue works</h2>
            <span className="bg-[#fef08a] text-[#854d0e] text-[11px] px-2 py-0.5 rounded font-bold">HR Manager</span>
          </div>
          <button onClick={() => setShowInfo(true)} className="text-sm text-gray-500 hover:text-gray-800 font-medium">Show</button>
        </div>
      )}

      {seriousAlerts.map(alert => (
        <div key={alert._id} className="bg-[#fef2f2] border border-[#fca5a5] rounded-lg p-4 mb-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600" size={20} />
            <div>
              <div className="font-bold text-red-800 text-sm">1 serious offence reported &mdash; action required while investigation is ongoing</div>
              <div className="text-[13px] text-red-700 mt-0.5">
                <span className="font-bold">DC-{alert._id.slice(-4).toUpperCase()}</span> - {alert.employeeId?.personalDetails?.firstName} {alert.employeeId?.personalDetails?.lastName} &mdash; {alert.offences?.[0]?.offence || 'Offence details hidden'}
              </div>
            </div>
          </div>
          <button 
            onClick={() => submitWorkflowAction('acknowledge', { acknowledged: true }, alert._id)}
            className="bg-[#0f172a] text-white text-xs font-bold px-4 py-2 rounded shadow hover:bg-gray-800 transition-colors"
          >
            Acknowledge
          </button>
        </div>
      ))}

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden pb-32">
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0f172a] text-white text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-tl-sm">CASE</th>
                <th className="px-4 py-3">EMPLOYEE</th>
                <th className="px-4 py-3">OFFENCE</th>
                <th className="px-4 py-3">OCC.</th>
                <th className="px-4 py-3 text-center">RANGE</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3 rounded-tr-sm text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cases.map((c) => {
                const caseId = `DC-${c._id.slice(-4).toUpperCase()}`;
                const isSerious = c.isSerious;
                
                const currentStatus = c.hrWorkflowStatus || (c.status === 'SUBMITTED_TO_HR' ? 'WITH_HR' : 'WITH_HR');
                const { min: rangeMin, max: rangeMax } = getRangeDisplay(c);
                const offenceDetails = c.offences?.[0]?.offence || "Offence details pending";

                return (
                  <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 align-top">
                      <div className="font-bold text-[#0f172a]">{caseId}</div>
                      {isSerious && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 mt-1 uppercase">
                          <AlertTriangle size={12} /> Serious
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-bold text-[#0f172a]">{c.employeeId?.personalDetails?.firstName || 'Unknown'} {c.employeeId?.personalDetails?.lastName || 'Employee'}</div>
                      <div className="text-[12px] text-gray-500 mt-0.5">{c.employeeId?.employmentDetails?.jobTitle || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-4 align-top text-[13px] text-gray-700 max-w-[300px] whitespace-normal">
                      {offenceDetails}
                    </td>
                    <td className="px-4 py-4 align-top text-[13px] text-gray-600">{c.offences?.[0]?.occurrence || '1st occurrence'}</td>
                    
                    <td className="px-4 py-4 align-top text-center">
                      <div className="flex items-center justify-center gap-2 text-[11px] font-bold">
                        <span className="text-gray-500">{rangeMin}</span>
                        <span className="text-gray-300">&rarr;</span>
                        <span className={rangeMax === 'D' || rangeMax === 'Dismissal' ? 'text-red-500' : 'text-orange-500'}>
                          {rangeMax}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      {currentStatus === 'WITH_HR' && <span className="px-3 py-1 rounded-full text-[11px] font-bold border border-yellow-400 text-yellow-700 bg-yellow-50">With HR</span>}
                      
                      {currentStatus === 'INVESTIGATION_COMPLETE' && <span className="px-3 py-1 rounded-full text-[11px] font-bold border border-gray-300 text-gray-700 bg-gray-50">Investigation</span>}

                      {currentStatus === 'DECISION_READY' && <span className="px-3 py-1 rounded-full text-[11px] font-bold border border-green-300 text-green-700 bg-green-50">Awaiting Decision</span>}

                      {currentStatus === 'AWAITING_RESPONSE' && (
                        <div>
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold border border-yellow-400 text-yellow-700 bg-yellow-50">Awaiting Response</span>
                          {(() => {
                            const { isOverdue, daysLeft, overdueBy } = getResponseStatus(c.noticeDate);
                            if (isOverdue) {
                              return (
                                <div className="text-[10px] font-bold text-red-600 mt-1.5 flex items-center gap-1">
                                  <AlertTriangle size={10} /> ⚠ Response overdue by {overdueBy} working {overdueBy === 1 ? 'day' : 'days'}
                                </div>
                              );
                            } else {
                              return (
                                <div className="text-[10px] font-bold text-orange-600 mt-1.5 flex items-center gap-1">
                                  ⏳ {daysLeft} working {daysLeft === 1 ? 'day' : 'days'} left to respond
                                </div>
                              );
                            }
                          })()}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-4 py-4 align-top text-right">
                      {currentStatus === 'WITH_HR' && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleAction('investigate', c)} className="bg-[#0f172a] text-white text-[11px] font-bold px-4 py-1.5 rounded hover:bg-gray-800 transition-colors">
                            Investigate
                          </button>
                        </div>
                      )}

                      {currentStatus === 'INVESTIGATION_COMPLETE' && (
                         <div className="flex flex-col items-end gap-2">
                           <div className="flex items-center gap-1">
                             <button onClick={() => handleAction('investigate', c)} className="bg-white text-gray-800 border border-gray-300 text-[11px] font-bold px-3 py-1.5 rounded hover:bg-gray-50">
                               Investigation
                             </button>
                             <button onClick={() => handleAction('issue-notice', c)} className="bg-[#0f172a] text-white text-[11px] font-bold px-4 py-1.5 rounded flex items-center gap-1 hover:bg-gray-800">
                               Issue notice
                             </button>
                           </div>
                           <div className="flex items-center gap-1">
                            <button onClick={() => handleAction('jury', c)} className="bg-white text-gray-800 border border-gray-300 text-[11px] font-bold px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
                              Jury of Peers
                            </button>
                           </div>
                         </div>
                      )}

                      {currentStatus === 'AWAITING_RESPONSE' && (() => {
                        const { isOverdue } = getResponseStatus(c.noticeDate);
                        return (
                          <div className="flex flex-col items-end gap-2">
                            {isOverdue && (
                              <div className="mb-1">
                                <button onClick={() => handleAction('proceed-no-response', c)} className="text-[11px] font-bold text-gray-600 border border-gray-300 bg-white px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
                                  Proceed without response
                                </button>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleAction('record-response', c)} className="bg-[#0f172a] text-white text-[11px] font-bold px-4 py-1.5 rounded hover:bg-gray-800 transition-colors flex items-center gap-1">
                                Record response
                              </button>
                              <button onClick={() => handleAction('letter', c)} className="bg-white text-gray-800 border border-gray-300 text-[11px] font-bold px-3 py-1.5 rounded hover:bg-gray-50 flex items-center gap-1">
                                Letter
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {currentStatus === 'DECISION_READY' && (
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleAction('jury', c)} className="bg-white text-gray-800 border border-gray-300 text-[11px] font-bold px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
                              Jury of Peers
                            </button>
                            <button onClick={() => handleAction('forward-smt', c)} className="bg-[#0f172a] text-white text-[11px] font-bold px-4 py-1.5 rounded hover:bg-gray-800 transition-colors">
                              Forward to SMT
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleAction('forward-ceo', c)} className="bg-[#0f172a] text-white text-[11px] font-bold px-4 py-1.5 rounded hover:bg-gray-800 transition-colors">
                              Forward to CEO
                            </button>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">
                            The CEO makes the final decision on every case.
                          </div>
                          <div className="mt-1">
                            <button onClick={() => handleAction('letter', c)} className="bg-white text-gray-800 border border-gray-300 text-[11px] font-bold px-3 py-1.5 rounded hover:bg-gray-50 flex items-center gap-1">
                              Letter
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {activeModal && selectedCase && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Generic Dark Header for older modals only */}
            {!['jury', 'forward-smt', 'forward-ceo'].includes(activeModal) && (
              <div className="bg-[#0f172a] px-6 py-4 flex items-center justify-between text-white">
                <h3 className="font-bold text-lg">
                  {activeModal === 'investigate' && `Investigation — DC-${selectedCase._id.slice(-4).toUpperCase()}`}
                  {activeModal === 'issue-notice' && `Issue Notice — DC-${selectedCase._id.slice(-4).toUpperCase()}`}
                  {activeModal === 'letter' && `Disciplinary Notice — DC-${selectedCase._id.slice(-4).toUpperCase()}`}
                  {activeModal === 'record-response' && `Record response — DC-${selectedCase._id.slice(-4).toUpperCase()}`}
                  {activeModal === 'proceed-no-response' && `Proceed without response — DC-${selectedCase._id.slice(-4).toUpperCase()}`}
                </h3>
                <button onClick={closeModal} className="text-gray-300 hover:text-white"><X size={20} /></button>
              </div>
            )}

            <div className="p-6 overflow-y-auto">
              
              {/* White embedded header for target modals */}
              {['jury', 'forward-smt', 'forward-ceo'].includes(activeModal) && (
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-[18px] text-[#0f172a]">
                    {activeModal === 'jury' && `Jury of Peers — DC-${selectedCase._id.slice(-4).toUpperCase()}`}
                    {activeModal === 'forward-smt' && `Forward DC-${selectedCase._id.slice(-4).toUpperCase()} to the SMT`}
                    {activeModal === 'forward-ceo' && `Forward DC-${selectedCase._id.slice(-4).toUpperCase()} to the CEO`}
                  </h3>
                  <button onClick={closeModal} className="text-gray-500 hover:text-gray-800"><X size={20} /></button>
                </div>
              )}

              {activeModal === 'investigate' && (
                <div className="space-y-6">
                  <div className="font-bold text-[#0f172a]">
                    {selectedCase.employeeId?.personalDetails?.firstName} {selectedCase.employeeId?.personalDetails?.lastName} &mdash; {selectedCase.offences?.[0]?.offence}
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-gray-700 mb-2">Investigation findings</label>
                    <textarea 
                      className="w-full border border-gray-300 rounded p-3 text-sm min-h-[100px] outline-none focus:border-blue-500" 
                      defaultValue={selectedCase.investigationDetails?.findings || ''}
                      placeholder="What the investigation established about the incident..."
                      onChange={(e) => setModalFormData({...modalFormData, findings: e.target.value})}
                    ></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-2">Discussion with line manager</label>
                      <textarea 
                        className="w-full border border-gray-300 rounded p-3 text-sm min-h-[80px]" 
                        defaultValue={selectedCase.investigationDetails?.discussionManager || ''}
                        onChange={(e) => setModalFormData({...modalFormData, discussionManager: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-2">Discussion with employee</label>
                      <textarea 
                        className="w-full border border-gray-300 rounded p-3 text-sm min-h-[80px]" 
                        defaultValue={selectedCase.investigationDetails?.discussionEmployee || ''}
                        onChange={(e) => setModalFormData({...modalFormData, discussionEmployee: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div>
                     <label className="block text-[13px] font-bold text-gray-700 mb-2">Witnesses <span className="font-normal text-gray-500">(staff on site during the incident)</span></label>
                     {witnesses.map((w, idx) => (
                       <div key={idx} className="flex gap-2 mb-2">
                         <input 
                           type="text" 
                           placeholder="Witness name" 
                           className="flex-1 border border-gray-300 rounded p-2 text-sm" 
                           value={w.name}
                           onChange={(e) => { const newW = [...witnesses]; newW[idx].name = e.target.value; setWitnesses(newW); }} 
                         />
                         <input 
                           type="text" 
                           placeholder="What they said (optional)" 
                           className="flex-2 border border-gray-300 rounded p-2 text-sm w-1/2" 
                           value={w.statement}
                           onChange={(e) => { const newW = [...witnesses]; newW[idx].statement = e.target.value; setWitnesses(newW); }} 
                         />
                         {idx === witnesses.length - 1 && (
                           <button 
                             type="button" 
                             onClick={() => setWitnesses([...witnesses, { name: '', statement: '' }])} 
                             className="bg-gray-100 text-gray-700 px-3 rounded border border-gray-300 hover:bg-gray-200 text-sm font-bold flex items-center gap-1 shrink-0"
                           >
                             <Plus size={16}/> Add witness
                           </button>
                         )}
                       </div>
                     ))}
                  </div>
                  
                  <div>
                    <label className="block text-[13px] font-bold text-gray-700 mb-2">Evidence &mdash; documents &amp; images</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer transition-colors relative">
                       <input 
                         type="file" 
                         multiple 
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                         onChange={(e) => setModalFormData({...modalFormData, files: e.target.files})}
                       />
                       <span className="text-blue-600 font-bold text-sm">Click to upload documents or images</span>
                    </div>
                  </div>
                </div>
              )}

              {activeModal === 'issue-notice' && (
                <div className="space-y-6">
                  <div className="bg-[#fef2f2] border border-[#fca5a5] rounded p-4 text-sm text-gray-700">
                    {selectedCase.offences?.[0]?.offence} — {selectedCase.offences?.[0]?.occurrence || '1st'} occurrence — range:
                    <div className="mt-2 flex items-center gap-2 font-bold text-[12px]">
                      <span className="bg-[#fef08a] text-[#854d0e] px-2 py-0.5 rounded">{getRangeDisplay(selectedCase).min}</span> 
                      <span className="text-gray-400">&rarr;</span> 
                      <span className="bg-[#fef2f2] text-red-700 px-2 py-0.5 rounded">{getRangeDisplay(selectedCase).max}</span>
                    </div>
                  </div>
                  
                  <div className="border border-blue-200 rounded-lg overflow-hidden bg-blue-50/30">
                    <div className="bg-blue-50 px-4 py-2 font-bold text-sm text-[#0f172a] border-b border-blue-100">
                      Investigation on file
                    </div>
                    <div className="p-4 text-sm text-gray-600">
                      {selectedCase.investigationDetails?.findings || 'No findings recorded.'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[#0f172a] mb-2">Notice date</label>
                    <input 
                      type="date" 
                      className="border border-gray-300 rounded-lg p-2.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                      onChange={(e) => setModalFormData({...modalFormData, noticeDate: e.target.value})}
                    />
                  </div>
                  <p className="text-[13px] text-gray-500">Issuing the notice starts the 5 working-day response window.</p>
                </div>
              )}

              {activeModal === 'letter' && (
                <div>
                  <div ref={printRef} className="border border-gray-200 rounded p-8 bg-white text-sm shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="font-bold text-lg">FSMPC</h2>
                        <p className="text-gray-600">Human Resources Office</p>
                      </div>
                      <div className="text-right text-gray-500 text-xs">
                        Ref: DC-{selectedCase._id.slice(-4).toUpperCase()}<br/>
                        Date: {selectedCase.noticeDate ? new Date(selectedCase.noticeDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    <h1 className="text-center font-bold text-xl border-b-2 border-[#0f172a] pb-2 mb-6">Notice of Disciplinary Charge</h1>
                    
                    <div className="grid grid-cols-[150px_1fr] gap-y-2 mb-8">
                      <div className="font-bold">TO:</div>
                      <div>{selectedCase.employeeId?.personalDetails?.firstName} {selectedCase.employeeId?.personalDetails?.lastName}, {selectedCase.employeeId?.employmentDetails?.jobTitle}</div>
                      <div className="font-bold">DEPARTMENT:</div>
                      <div>{selectedCase.employeeId?.employmentDetails?.department}</div>
                    </div>

                    <h3 className="font-bold text-[15px] uppercase mb-2">The Charge</h3>
                    <div className="grid grid-cols-[150px_1fr] gap-y-2 mb-6">
                      <div className="font-bold text-gray-600">Offence:</div>
                      <div>{selectedCase.offences?.[0]?.offence}</div>
                      <div className="font-bold text-gray-600">Category / occ:</div>
                      <div>Attendance - {selectedCase.offences?.[0]?.occurrence || '1st'}</div>
                    </div>

                    <h3 className="font-bold text-[15px] uppercase mb-2 mt-6">Proposed Action</h3>
                    <div className="mb-6 font-bold text-red-700">{selectedCase.offences?.[0]?.action || 'Written Warning'}</div>

                    <h3 className="font-bold text-[15px] uppercase mb-2 mt-6">Your Right To Respond</h3>
                    <p className="text-gray-700 leading-relaxed mb-10">
                      You have <span className="font-bold">5 working days</span> from the date of this notice to submit a written response. You may also appeal any decision within 10 working days. If you have a genuine reason you cannot respond in time, a reasonable extension may be granted.
                    </p>

                    <div className="grid grid-cols-2 gap-10 mt-10">
                      <div>
                        <div className="border-t border-gray-400 pt-2 font-bold">HR Manager</div>
                        <div className="text-xs text-gray-500">FSMPC Human Resources</div>
                      </div>
                      <div>
                        <div className="border-t border-gray-400 pt-2 font-bold">Employee acknowledgement</div>
                        <div className="text-xs text-gray-500">Signature &amp; Date</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

               {activeModal === 'record-response' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded text-sm mb-4">
                    <span className="font-bold text-gray-700">Investigation on file:</span><br/>
                    <span className="text-gray-600">{selectedCase.investigationDetails?.findings || 'No findings recorded.'}</span>
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-gray-700 mb-2">Your response</label>
                    <textarea 
                      className="w-full border border-gray-300 rounded p-3 text-sm min-h-[150px] outline-none focus:border-blue-500"
                      onChange={(e) => setModalFormData({ response: e.target.value })}
                    ></textarea>
                  </div>
                </div>
              )}

               {activeModal === 'proceed-no-response' && (
                <div className="space-y-4 text-center py-6">
                  <AlertTriangle size={40} className="mx-auto text-yellow-500 mb-4" />
                  <p className="text-gray-700 font-medium">No response received within 5 working days.</p>
                  <p className="text-sm text-gray-500">This action will move the case forward to the Decision stage without an employee response on file.</p>
                </div>
              )}

              {/* Exact Redesign for Forward SMT */}
              {activeModal === 'forward-smt' && (
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-bold text-[#0f172a] text-[15px] mb-1">
                      {selectedCase.employeeId?.personalDetails?.firstName} {selectedCase.employeeId?.personalDetails?.lastName}
                    </h4>
                    <p className="text-[13px] text-gray-700 mb-3">
                      {selectedCase.offences?.[0]?.offence} — {selectedCase.offences?.[0]?.occurrence || '1st'} occ, range
                      <span className="text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-[11px] font-bold mx-1">{getRangeDisplay(selectedCase).min}</span> 
                      <span className="text-gray-400">&rarr;</span> 
                      <span className="text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-[11px] font-bold mx-1">{getRangeDisplay(selectedCase).max}</span>
                    </p>
                    <p className="text-[13px] text-gray-500">
                      The Senior Management Team will review this case and recommend an action to the CEO. It then goes to the CEO with their recommendation.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[#0f172a] mb-2">Forward to which SMT member (required)</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onChange={(e) => setModalFormData({...modalFormData, smtMember: e.target.value})}
                    >
                      <option>— Select SMT member —</option>
                      <option>Bled Ropika - GM Operations</option>
                      <option>Anna Vatu - GM Corporate Services</option>
                      <option>Daniel Wisppy - GM Finance</option>
                      <option>Tania Mak - GM People & Safety</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <label className="block text-[13px] font-bold text-[#0f172a]">HR overall recommendation to the CEO (required)</label>
                    <p className="text-[13px] text-[#0f172a] font-bold mb-2">One recommendation covering the case as a whole.</p>
                    <select 
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 mb-5"
                      onChange={(e) => setModalFormData({...modalFormData, hrRecommendedAction: e.target.value})}
                    >
                      <option>— Select recommended action —</option>
                      <option>Admonishment (verbal warning)</option>
                      <option>Written warning</option>
                      <option>3-day suspension (unpaid)</option>
                      <option>10-day suspension (unpaid)</option>
                      <option>20-day suspension (unpaid)</option>
                      <option>Dismissal</option>
                    </select>

                    <label className="block text-[13px] font-bold text-[#0f172a] mb-2">Reason / rationale for the recommendation (required)</label>
                    <textarea 
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-blue-500" 
                      placeholder="Why HR recommends this action..."
                      onChange={(e) => setModalFormData({...modalFormData, hrRationale: e.target.value})}
                    />
                  </div>

                  <p className="text-[13px] text-gray-500">
                    HR must give a recommendation before a case can be escalated. It travels with the case and is shown to the SMT and the CEO.
                  </p>
                </div>
              )}

              {/* Exact Redesign for Forward CEO */}
              {activeModal === 'forward-ceo' && (
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-bold text-[#0f172a] text-[15px] mb-1">
                      {selectedCase.employeeId?.personalDetails?.firstName} {selectedCase.employeeId?.personalDetails?.lastName}
                    </h4>
                    <p className="text-[13px] text-gray-700 mb-3">
                      {selectedCase.offences?.[0]?.offence} — {selectedCase.offences?.[0]?.occurrence || '1st'} occ, range
                      <span className="text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-[11px] font-bold mx-1">{getRangeDisplay(selectedCase).min}</span> 
                      <span className="text-gray-400">&rarr;</span> 
                      <span className="text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-[11px] font-bold mx-1">{getRangeDisplay(selectedCase).max}</span>
                    </p>
                    <p className="text-[13px] text-gray-500">
                      This case goes directly to the CEO for a final decision, skipping the notice/response stage.
                    </p>
                  </div>

                  <div className="pt-2">
                    <label className="block text-[13px] font-bold text-[#0f172a]">HR overall recommendation to the CEO (required)</label>
                    <p className="text-[13px] text-[#0f172a] font-bold mb-2">One recommendation covering the case as a whole.</p>
                    <select 
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 mb-5"
                      onChange={(e) => setModalFormData({...modalFormData, hrRecommendedAction: e.target.value})}
                    >
                      <option>— Select recommended action —</option>
                      <option>Admonishment (verbal warning)</option>
                      <option>Written warning</option>
                      <option>3-day suspension (unpaid)</option>
                      <option>10-day suspension (unpaid)</option>
                      <option>20-day suspension (unpaid)</option>
                      <option>Dismissal</option>
                    </select>

                    <label className="block text-[13px] font-bold text-[#0f172a] mb-2">Reason / rationale for the recommendation (required)</label>
                    <textarea 
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-blue-500" 
                      placeholder="Why HR recommends this action..."
                      onChange={(e) => setModalFormData({...modalFormData, hrRationale: e.target.value})}
                    />
                  </div>

                  <p className="text-[13px] text-gray-500">
                    HR must give a recommendation before a case can be escalated. It travels with the case and is shown to the CEO.
                  </p>
                </div>
              )}

              {/* Exact Redesign for Jury of Peers */}
              {activeModal === 'jury' && (
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-bold text-[#0f172a] text-[15px] mb-1">
                      {selectedCase.employeeId?.personalDetails?.firstName} {selectedCase.employeeId?.personalDetails?.lastName} — {selectedCase.offences?.[0]?.offence}
                    </h4>
                    <p className="text-[13px] text-gray-600 mt-2">
                      For a serious case, HR may activate a Jury of Peers — an impartial panel of fellow employees who review the case and give an independent finding and recommendation to inform the decision.
                    </p>
                  </div>
                  
                  <div className={`flex items-center gap-2 p-4 rounded-lg border transition-colors ${isJuryActive ? 'bg-[#fef2f2] border-[#fca5a5] text-red-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <input 
                      type="checkbox" 
                      id="juryActivate" 
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-gray-300" 
                      checked={isJuryActive}
                      onChange={(e) => setIsJuryActive(e.target.checked)}
                    />
                    <label htmlFor="juryActivate" className="text-[14px] cursor-pointer flex items-center gap-1">
                      <span className="font-bold">Activate a Jury of Peers</span> for this case
                      <Info size={16} className="ml-1" />
                    </label>
                  </div>

                  {isJuryActive && (
                    <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div>
                        <label className="block text-[13px] font-bold text-[#0f172a] mb-2">Panel members <span className="font-normal text-gray-500">(impartial peers)</span></label>
                        {juryMembers.map((member, idx) => (
                          <div key={idx} className="flex gap-2 mb-2">
                            <input 
                              type="text" 
                              placeholder="Member name" 
                              className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                              value={member.name}
                              onChange={(e) => { const newM = [...juryMembers]; newM[idx].name = e.target.value; setJuryMembers(newM); }} 
                            />
                            <input 
                              type="text" 
                              placeholder="Department / role (optional)" 
                              className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                              value={member.role}
                              onChange={(e) => { const newM = [...juryMembers]; newM[idx].role = e.target.value; setJuryMembers(newM); }} 
                            />
                            {idx === juryMembers.length - 1 && (
                              <button 
                                type="button" 
                                onClick={() => setJuryMembers([...juryMembers, { name: '', role: '' }])} 
                                className="bg-[#94a3b8] text-white px-4 rounded-lg hover:bg-slate-500 text-sm font-bold flex items-center gap-1 shrink-0 transition-colors"
                              >
                                <Plus size={16}/> Add member
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="block text-[14px] font-bold text-[#0f172a] mb-3">Panel finding</label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[13px] font-bold text-gray-700 mb-1">Finding</label>
                            <select 
                              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              onChange={(e) => setModalFormData({...modalFormData, finding: e.target.value})}
                            >
                              <option>— Select —</option>
                              <option>Fully substantiated</option>
                              <option>Partly substantiated</option>
                              <option>Not substantiated</option>
                              <option>Inconclusive</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[13px] font-bold text-gray-700 mb-1">Recommended action (within range)</label>
                            <select 
                              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              onChange={(e) => setModalFormData({...modalFormData, recommendedAction: e.target.value})}
                            >
                              <option>— Select —</option>
                              <option>Admonishment (verbal warning)</option>
                              <option>Written warning</option>
                              <option>3-day suspension (unpaid)</option>
                              <option>10-day suspension (unpaid)</option>
                              <option>20-day suspension (unpaid)</option>
                              <option>Dismissal</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[13px] font-bold text-[#0f172a] mb-2">Panel notes</label>
                        <textarea 
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-blue-500" 
                          placeholder="The panel's reasoning and any conditions..."
                          onChange={(e) => setModalFormData({...modalFormData, panelNotes: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-[13px] text-gray-500 leading-relaxed">
                    The jury's finding and recommendation are advisory — HR, the SMT and the CEO still make the formal decision. The panel is recorded on the case and appears in the audit log.
                  </p>
                </div>
              )}

            </div>

            {/* Dynamic Footer Background depending on active modal */}
            <div className={['jury', 'forward-smt', 'forward-ceo'].includes(activeModal) ? "px-6 pb-6 pt-4 bg-white flex justify-end gap-3 rounded-b-lg" : "border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg"}>
              <button onClick={closeModal} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                Cancel
              </button>
              
              {activeModal === 'investigate' && (
                <button 
                  onClick={() => submitWorkflowAction('investigate', { ...modalFormData, witnesses })} 
                  className="bg-[#0f172a] text-white text-sm font-bold px-6 py-2 rounded hover:bg-gray-800 transition-colors"
                >
                  Save investigation
                </button>
              )}

              {activeModal === 'issue-notice' && (
                <button onClick={() => submitWorkflowAction('issue-notice', modalFormData)} className="bg-[#0f172a] text-white text-sm font-bold px-6 py-2 rounded hover:bg-gray-800 transition-colors">
                  Issue notice
                </button>
              )}
              
              {activeModal === 'letter' && (
                <button onClick={handlePrint} className="bg-gray-100 border border-gray-300 text-gray-700 text-sm font-bold px-4 py-2 rounded hover:bg-gray-200 transition-colors flex items-center gap-2">
                  <Printer size={16} /> Print / Save PDF
                </button>
              )}

              {activeModal === 'record-response' && (
                <button onClick={() => submitWorkflowAction('record-response', modalFormData)} className="bg-[#0f172a] text-white text-sm font-bold px-6 py-2 rounded hover:bg-gray-800 transition-colors">
                  Record response
                </button>
              )}

               {activeModal === 'proceed-no-response' && (
                <button onClick={() => submitWorkflowAction('proceed-no-response', { noResponse: true })} className="bg-[#0f172a] text-white text-sm font-bold px-6 py-2 rounded hover:bg-gray-800 transition-colors">
                  Proceed without response
                </button>
              )}

              {activeModal === 'jury' && (
                <button onClick={() => submitWorkflowAction('jury', { ...modalFormData, juryMembers })} className="bg-[#0f172a] text-white text-sm font-bold px-6 py-2 rounded hover:bg-gray-800 transition-colors flex items-center gap-2">
                  <Save size={16}/> Save jury
                </button>
              )}
              
              {activeModal === 'forward-smt' && (
                <button onClick={() => submitWorkflowAction('forward-smt', modalFormData)} className="bg-[#0f172a] text-white text-sm font-bold px-6 py-2 rounded hover:bg-gray-800 transition-colors">
                  Forward to SMT
                </button>
              )}

              {activeModal === 'forward-ceo' && (
                <button onClick={() => submitWorkflowAction('forward-ceo', modalFormData)} className="bg-[#0f172a] text-white text-sm font-bold px-6 py-2 rounded hover:bg-gray-800 transition-colors">
                  Forward to CEO
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}