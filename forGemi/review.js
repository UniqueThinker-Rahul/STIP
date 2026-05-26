'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';

const CRIT = [
  {id:1, key:'expectedResults', name:"Delivered Expected Results", wt:0.30, pct:"30%", desc:"Did the employee deliver the expected results of their position in 2025/2026?"},
  {id:2, key:'initiative', name:"Demonstrated Initiative", wt:0.20, pct:"20%", desc:"Does the employee take responsibility, plan tasks, and solve problems proactively?"},
  {id:3, key:'safeWorking', name:"Demonstrated Safe Working", wt:0.20, pct:"20%", desc:"Does the employee follow safety rules, wear PPE, and identify hazards?"},
  {id:4, key:'jobCompetence', name:"Demonstrated Job Competence", wt:0.10, pct:"10%", desc:"Does the employee have and apply the skills required for their role?"},
  {id:5, key:'dependability', name:"Demonstrated Dependability", wt:0.10, pct:"10%", desc:"Is the employee reliable, punctual, and do they deliver quality work on time?"},
  {id:6, key:'adaptability', name:"Demonstrated Adaptability", wt:0.10, pct:"10%", desc:"Does the employee accept new tasks, change, and extra demands?"}
];

const JOB_TITLES = [
  "2nd Egineer", "3rd Engineer", "Accountant II", "Accountant III", "Accounting Technician", 
  "Administration Manager", "Administrative Specialist", "Asset Integrity Manager", "Asset Integrity Officer", 
  "Asset Integrity Techincian II", "Aviation Refueler", "Aviation Supervisor", "Blaster - Team Leader", 
  "Boat Captain", "CIDU Supervisor", "Carpenter", "Chief Engineer", "Chief Executive Officer", 
  "Chief Financial Officer", "Chief Mate", "Chief Risk & Compliance Officer", "Communications Officer", 
  "Country Manager/Business Development Manager", "Customer Service Officer - Admin", "Customer Service Officer - OTC", 
  "Deck Hand", "Desktop Support Officer", "Driver/Sales", "Electrical Engineer", "Electrical Technician", 
  "Emergency Prepardness Officer", "Executive Manager - Governance", "General Laborer", 
  "Heavy Equipment Operator - Truck Driver", "Help Desk - CSO", "Human Resouce Manager", 
  "Human Resource Officer", "ICT Manager", "Key Accounts Manager", "Knowledge Manager", "Liason Officer", 
  "Mainenance Mechanic", "Maintenance Mechanic", "Maintenance Officer", "Maintenance Supervisor", 
  "Marine Operator", "Maritime & Logistics Manager", "Mechanical Technician", "OIC - Production", 
  "Office Attendant", "Officer In Charge", "Officer In Charge - CHK", "Officer In Charge - KOS", 
  "Officer In Charge - Nauru", "Officer In Charge - PNI", "Officer In Charge YAP", "On Site Supervisor", 
  "Operations & Logistics Manager", "Plant Mechanic", "Power Plant Operator", "Procurement Officer", 
  "Procurement Technician", "Production & Quality Manager", "Production Worker", 
  "Program Manager Comppliance & Audit", "Program Mgr-Monitor-Eval-Reporting", "Project Assitant", 
  "Project Engineer", "Project Manager", "Project Officer", "Project Scheduler", "Purser", 
  "Quality Control Manager", "Receptionist", "Records Management Techician", "Renewable Energy Technician", 
  "Safer", "Sales Clerk", "Senior Accountant", "Sharepoint Developer", "Stores Coordinator", 
  "Supply Chain Manager", "Supply Officer", "Technical Support Officer", "Terminal Operator", 
  "Terminal Supervisor", "Terminals Manager", "Travel Coordinator", "Truck Driver"
];

const CP = 0.1301;

export default function NewAppraisal() {
  const router = useRouter();
  
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [cur, setCur] = useState(null);
  const [openCrit, setOpenCrit] = useState(null);
  
  const [ratings, setRatings] = useState({
    expectedResults: null, initiative: null, safeWorking: null, 
    jobCompetence: null, dependability: null, adaptability: null
  });
  
  const [formData, setFormData] = useState({
    title: '', co: 'FSM', qtr: 'Q3', epText: '', comments: ''
  });
  
  const [submitModal, setSubmitModal] = useState(false);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        // Fetch ONLY the staff assigned to this specific logged-in Line Manager
        const res = await api.get('/users/my-team');
        setTeam(res.data?.data || []);
      } catch (error) {
        console.error('Failed to load team', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  const clearEmp = () => {
    setCur(null);
    setRatings({
      expectedResults: null, initiative: null, safeWorking: null, 
      jobCompetence: null, dependability: null, adaptability: null
    });
    setFormData({title: '', co: 'FSM', qtr: 'Q3', epText: '', comments: ''});
    setOpenCrit(null);
  };

  const handleEmpSelect = (id) => {
    if (!id) { clearEmp(); return; }
    const emp = team.find(e => e._id === id);
    if (emp) {
      setCur(emp);
      setRatings({
        expectedResults: null, initiative: null, safeWorking: null, 
        jobCompetence: null, dependability: null, adaptability: null
      });
      setFormData(prev => ({
        ...prev, 
        title: emp.employmentDetails?.jobTitle || '',
        co: emp.companyCode || 'FSM'
      }));
    }
  };

  const toggleCrit = (id) => setOpenCrit(openCrit === id ? null : id);
  const selRating = (key, val) => setRatings(prev => ({...prev, [key]: val}));

  // Calculations
  const prMonths = cur?.employmentDetails?.prorateValue || 12;
  const prValue = prMonths / 12;
  const ratedCount = Object.values(ratings).filter(v => v !== null).length;
  
  let rawScore = 0;
  let finalScore = 0;
  let finalLabel = '';
  let finalClass = '';

  if (ratedCount === 6) {
    rawScore = CRIT.reduce((s, c) => s + (ratings[c.key] * c.wt), 0);
    if (rawScore < 0.35) { finalScore = 0.0; finalLabel = 'LS'; finalClass = 'ls'; }
    else if (rawScore < 0.85) { finalScore = 0.7; finalLabel = 'NI'; finalClass = 'ni'; }
    else if (rawScore < 1.15) { finalScore = 1.0; finalLabel = 'E'; finalClass = 'e'; }
    else { finalScore = 1.3; finalLabel = 'EP'; finalClass = 'ep'; }
  }

  const stipAwardPct = (CP * finalScore * prValue * 100).toFixed(2);

  const saveToDatabase = async (status) => {
    if (!cur) return;
    
    try {
      const payload = {
        employeeId: cur._id,
        reviewYear: 2026,
        metrics: ratings,
        individualAssessment: finalScore,
        stipAward: stipAwardPct,
        comments: `${formData.comments} ${formData.epText ? '| EP Justification: ' + formData.epText : ''}`.trim(),
        status: status
      };

      // Clean API Call (No static managerId logic here)
      await api.post('/appraisals', payload);
      return true;
    } catch (error) {
      alert("Failed to save appraisal to database.");
      console.error(error);
      return false;
    }
  };

  const handleDraft = async () => {
    const success = await saveToDatabase('DRAFT');
    if (success) {
      alert("Draft saved successfully!");
      router.push('/dashboard/manager/drafts');
    }
  };

  const confirmSubmit = async () => {
    const success = await saveToDatabase('SUBMITTED');
    if (success) {
      alert("Appraisal Submitted! Sent to HR Database.");
      setSubmitModal(false);
      router.push('/dashboard/manager/submissions');
    }
  };

  return (
    <div className="w-full max-w-full pb-[60px]">
      
      {/* Header */}
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">New Staff Appraisal</div>
        <div className="text-[13px] text-[#6b7280]">Select a staff member &middot; rate 6 criteria &middot; save draft or submit to HR Manager</div>
      </div>

      {cur && (
        <div className="flex items-center gap-[8px] p-[10px_14px] bg-[#D1FAE5] border border-[#A7F3D0] text-[#065F46] rounded-[9px] text-[12px] font-[500] mb-[16px]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          Submitting will automatically send an email notification to the HR Manager.
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-[16px] items-start">
        
        {/* Left Column (Forms) */}
        <div className="flex flex-col gap-[12px]">
          
          {/* Step 1: Employee Select */}
          <div className="bg-[#0D2B55] rounded-[14px] p-[18px]">
            <div className="text-[10px] font-[700] text-white/50 uppercase tracking-[.08em] mb-[8px]">Step 1 &mdash; Select Staff Member</div>
            <div className="flex flex-col sm:flex-row gap-[10px] items-end">
              <div className="flex-1 flex flex-col gap-[4px] w-full">
                <label className="text-[11px] font-[700] text-white/90">Search &amp; select employee <span className="text-[#991B1B]">*</span></label>
                <select 
                  className="w-full p-[9px_11px] border border-white/30 rounded-[8px] text-[12.5px] font-[600] text-[#0D2B55] bg-white outline-none cursor-pointer"
                  value={cur?._id || ''}
                  onChange={(e) => handleEmpSelect(e.target.value)}
                >
                  <option value="">-- Select a staff member --</option>
                  {team.map(e => (
                    <option key={e._id} value={e._id}>{e.personalDetails?.firstName} {e.personalDetails?.lastName} — {e.employmentDetails?.jobTitle}</option>
                  ))}
                </select>
              </div>
              <button 
                className="p-[9px_14px] bg-white/10 border border-white/20 rounded-[8px] text-white/80 text-[12px] font-[600] cursor-pointer hover:bg-white/20 transition-colors h-[38px] w-full sm:w-auto"
                onClick={clearEmp}
              >
                &#10005; Clear
              </button>
            </div>

            {cur && (
              <div className="flex items-center gap-[12px] bg-white/10 border border-white/15 rounded-[9px] p-[10px_14px] mt-[10px]">
                <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-[#C9A84C] to-[#9a7a2e] flex items-center justify-center text-[13px] font-[700] text-[#0D2B55] shrink-0">
                  {cur.personalDetails?.firstName?.[0]}{cur.personalDetails?.lastName?.[0]}
                </div>
                <div>
                  <div className="text-[14px] font-[700] text-white">{cur.personalDetails?.firstName} {cur.personalDetails?.lastName}</div>
                  <div className="text-[11px] text-white/55 mt-[1px]">{cur.employmentDetails?.jobTitle}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[11px] text-white/45">ID: {cur.employeeId}</div>
                  <div className="text-[12px] font-[700] text-[#e8c96a]">{(prMonths/12).toFixed(3)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Details Form */}
          {cur && (
            <div className="bg-white rounded-[14px] border border-[#E2DDD4] overflow-hidden">
              <div className="p-[13px_18px] border-b border-[#E2DDD4] flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-[10px]">
                  <div className="w-[30px] h-[30px] rounded-[7px] bg-[#EFF6FF] flex items-center justify-center text-[14px] shrink-0">&#128100;</div>
                  <div>
                    <div className="text-[13px] font-[700] text-[#0D2B55]">Employee Details</div>
                    <div className="text-[11px] text-[#6b7280]">Edit title and quarter before rating</div>
                  </div>
                </div>
              </div>
              <div className="p-[16px_18px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] mb-[12px]">
                  <div className="flex flex-col gap-[4px]">
                    <label className="text-[11px] font-[600] text-[#0D2B55]">Company Code <span className="text-[9px] font-[700] bg-[#E2DDD4] text-[#6b7280] p-[1px_5px] rounded-[3px] ml-[5px] uppercase">Auto</span></label>
                    <input readOnly value={cur.companyCode || 'FSM'} className="p-[9px_11px] border border-dashed border-[#E2DDD4] rounded-[8px] text-[13px] text-[#6b7280] bg-[#FAF8F4] cursor-default" />
                  </div>
                  <div className="flex flex-col gap-[4px]">
                    <label className="text-[11px] font-[600] text-[#0D2B55]">Employee ID <span className="text-[9px] font-[700] bg-[#E2DDD4] text-[#6b7280] p-[1px_5px] rounded-[3px] ml-[5px] uppercase">Auto</span></label>
                    <input readOnly value={cur.employeeId} className="p-[9px_11px] border border-dashed border-[#E2DDD4] rounded-[8px] text-[13px] text-[#6b7280] bg-[#FAF8F4] cursor-default" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] mb-[12px]">
                  <div className="flex flex-col gap-[4px]">
                    <label className="text-[11px] font-[600] text-[#0D2B55]">First Name <span className="text-[9px] font-[700] bg-[#E2DDD4] text-[#6b7280] p-[1px_5px] rounded-[3px] ml-[5px] uppercase">Auto</span></label>
                    <input readOnly value={cur.personalDetails?.firstName} className="p-[9px_11px] border border-dashed border-[#E2DDD4] rounded-[8px] text-[13px] text-[#6b7280] bg-[#FAF8F4] cursor-default" />
                  </div>
                  <div className="flex flex-col gap-[4px]">
                    <label className="text-[11px] font-[600] text-[#0D2B55]">Last Name <span className="text-[9px] font-[700] bg-[#E2DDD4] text-[#6b7280] p-[1px_5px] rounded-[3px] ml-[5px] uppercase">Auto</span></label>
                    <input readOnly value={cur.personalDetails?.lastName} className="p-[9px_11px] border border-dashed border-[#E2DDD4] rounded-[8px] text-[13px] text-[#6b7280] bg-[#FAF8F4] cursor-default" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] mb-[12px]">
                  <div className="flex flex-col gap-[4px]">
                    <label className="text-[11px] font-[600] text-[#0D2B55]">Job Title <span className="text-[#991B1B]">*</span></label>
                    <select 
                      value={formData.title} 
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="p-[9px_11px] border border-[#E2DDD4] rounded-[8px] text-[13px] text-[#0f1923] bg-white outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010l5%205%205-5H7z%22%20fill%3D%22%2364748B%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_11px_center]"
                    >
                      <option value="">-- Select Job Title --</option>
                      {JOB_TITLES.map(title => <option key={title} value={title}>{title}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-[4px]">
                    <label className="text-[11px] font-[600] text-[#0D2B55]">Reporting Manager <span className="text-[9px] font-[700] bg-[#E2DDD4] text-[#6b7280] p-[1px_5px] rounded-[3px] ml-[5px] uppercase">Auto</span></label>
                    <input readOnly value="Assigned Line Manager" className="p-[9px_11px] border border-dashed border-[#E2DDD4] rounded-[8px] text-[13px] text-[#6b7280] bg-[#FAF8F4] cursor-default" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px]">
                  <div className="flex flex-col gap-[4px] sm:col-span-2">
                    <label className="text-[11px] font-[600] text-[#0D2B55]">Pro-Rata Value <span className="text-[9px] font-[700] bg-[#E2DDD4] text-[#6b7280] p-[1px_5px] rounded-[3px] ml-[5px] uppercase">Calculated</span></label>
                    <input readOnly value={`${(prMonths/12).toFixed(3)} (${prMonths} months)`} className="p-[9px_11px] border border-dashed border-[#E2DDD4] rounded-[8px] text-[13px] font-[700] text-[#0D2B55] bg-[#FAF8F4] cursor-default" />
                  </div>
                  <div className="flex flex-col gap-[4px]">
                    <label className="text-[11px] font-[600] text-[#0D2B55]">Quarter <span className="text-[#991B1B]">*</span></label>
                    <select 
                      value={formData.qtr} 
                      onChange={e => setFormData({...formData, qtr: e.target.value})}
                      className="p-[9px_11px] border border-[#E2DDD4] rounded-[8px] text-[13px] text-[#0f1923] bg-white outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010l5%205%205-5H7z%22%20fill%3D%22%2364748B%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_11px_center]"
                    >
                      <option value="Q1">Q1 — 31 Mar</option>
                      <option value="Q2">Q2 — 30 Jun</option>
                      <option value="Q3">Q3 — 30 Sep</option>
                      <option value="Q4">Q4 — 15 Dec</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Criteria Card */}
          {cur && (
            <div className="bg-white rounded-[14px] border border-[#E2DDD4] overflow-hidden">
              <div className="p-[13px_18px] border-b border-[#E2DDD4] flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-[10px]">
                  <div className="w-[30px] h-[30px] rounded-[7px] bg-[#EDE9FE] flex items-center justify-center text-[14px] shrink-0">&#11088;</div>
                  <div>
                    <div className="text-[13px] font-[700] text-[#0D2B55]">Performance Criteria &mdash; CY2026 Weighted Scoring</div>
                    <div className="text-[11px] text-[#6b7280]">Rate each criterion &middot; IPRF calculates live</div>
                  </div>
                </div>
                <span className={`text-[11px] font-[700] px-[10px] py-[3px] rounded-full whitespace-nowrap ${ratedCount === 6 ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#DBEAFE] text-[#1E40AF]'}`}>
                  {ratedCount} / 6 rated
                </span>
              </div>
              <div className="p-[16px_18px]">
                
                {/* Accordion List */}
                <div className="flex flex-col gap-[10px] mb-[14px]">
                  {CRIT.map(c => {
                    const isOpen = openCrit === c.id;
                    const val = ratings[c.key];
                    const rated = val !== null;
                    const lbl = val === 0.0 ? '0.0 — LS' : val === 0.7 ? '0.7 — NI' : val === 1.0 ? '1.0 — E' : val === 1.3 ? '1.3 — EP' : 'Not rated';
                    const bg = val === 0.0 ? 'bg-[#FEE2E2] text-[#991B1B]' : val === 0.7 ? 'bg-[#FEF3C7] text-[#92400E]' : val === 1.0 ? 'bg-[#D1FAE5] text-[#065F46]' : val === 1.3 ? 'bg-[#DBEAFE] text-[#1E40AF]' : 'bg-[#E2DDD4] text-[#6b7280]';
                    
                    return (
                      <div key={c.id} className={`border-[1.5px] rounded-[10px] overflow-hidden transition-all ${isOpen ? 'border-[#0D2B55]' : rated ? 'border-[#0D2B55]/20' : 'border-[#E2DDD4]'}`}>
                        <div 
                          className="flex justify-between items-center p-[11px_14px] bg-[#FAF8F4] cursor-pointer select-none hover:bg-[#f0ede6] transition-colors"
                          onClick={() => toggleCrit(c.id)}
                        >
                          <div className="flex items-center gap-[10px]">
                            <div className="w-[22px] h-[22px] rounded-full bg-[#0D2B55] text-white text-[10px] font-[700] flex items-center justify-center shrink-0">{c.id}</div>
                            <div>
                              <div className="text-[13px] font-[600] text-[#0f1923]">{c.name}</div>
                              <div className="text-[11px] text-[#6b7280] mt-[1px]">Weight: {c.pct}</div>
                            </div>
                          </div>
                          <span className={`text-[11px] font-[700] px-[10px] py-[3px] rounded-full whitespace-nowrap ${bg}`}>{lbl}</span>
                        </div>
                        
                        {isOpen && (
                          <div className="p-[12px_14px_14px] border-t border-[#E2DDD4] bg-white">
                            <div className="text-[11px] text-[#6b7280] mb-[10px] leading-[1.5]">{c.desc}</div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-[8px]">
                              <div 
                                onClick={() => selRating(c.key, 0.0)}
                                className={`border-[2px] rounded-[9px] p-[10px_6px] text-center cursor-pointer transition-all ${val === 0.0 ? 'border-[#991B1B] bg-[#FEE2E2]' : 'border-[#E2DDD4] bg-white hover:border-[#991B1B]'}`}
                              >
                                <span className="text-[20px] font-[800] block mb-[2px] text-[#991B1B]">0.0</span>
                                <span className="text-[9px] font-[700] uppercase tracking-[.04em] block leading-[1.3] text-[#991B1B]">Less than<br/>Satisfactory</span>
                              </div>
                              <div 
                                onClick={() => selRating(c.key, 0.7)}
                                className={`border-[2px] rounded-[9px] p-[10px_6px] text-center cursor-pointer transition-all ${val === 0.7 ? 'border-[#D97706] bg-[#FEF3C7]' : 'border-[#E2DDD4] bg-white hover:border-[#D97706]'}`}
                              >
                                <span className="text-[20px] font-[800] block mb-[2px] text-[#92400E]">0.7</span>
                                <span className="text-[9px] font-[700] uppercase tracking-[.04em] block leading-[1.3] text-[#92400E]">Needs<br/>Improvement</span>
                              </div>
                              <div 
                                onClick={() => selRating(c.key, 1.0)}
                                className={`border-[2px] rounded-[9px] p-[10px_6px] text-center cursor-pointer transition-all ${val === 1.0 ? 'border-[#059669] bg-[#D1FAE5]' : 'border-[#E2DDD4] bg-white hover:border-[#059669]'}`}
                              >
                                <span className="text-[20px] font-[800] block mb-[2px] text-[#065F46]">1.0</span>
                                <span className="text-[9px] font-[700] uppercase tracking-[.04em] block leading-[1.3] text-[#065F46]">Fully<br/>Effective</span>
                              </div>
                              <div 
                                onClick={() => selRating(c.key, 1.3)}
                                className={`border-[2px] rounded-[9px] p-[10px_6px] text-center cursor-pointer transition-all ${val === 1.3 ? 'border-[#1E40AF] bg-[#DBEAFE]' : 'border-[#E2DDD4] bg-white hover:border-[#1E40AF]'}`}
                              >
                                <span className="text-[20px] font-[800] block mb-[2px] text-[#1E40AF]">1.3</span>
                                <span className="text-[9px] font-[700] uppercase tracking-[.04em] block leading-[1.3] text-[#1E40AF]">Exceeds<br/>Performance</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* IPRF Calculation Strip */}
                <div className="bg-[#0D2B55] rounded-[10px] p-[14px_16px] flex flex-col sm:flex-row sm:items-center justify-between gap-[12px]">
                  <div>
                    <div className="text-[10px] text-white/60 font-[600] uppercase tracking-[.06em]">IPRF Score (Auto-Calculated)</div>
                    <div className="text-[26px] font-[800] text-[#e8c96a] leading-[1] mt-[3px]">{ratedCount === 6 ? rawScore.toFixed(3) : '—'}</div>
                    <div className="text-[11px] text-white/55 mt-[3px]">{ratedCount === 6 ? `→ Rounds to ${finalScore.toFixed(1)}` : 'Rate all 6 criteria to see result'}</div>
                  </div>
                  <div className="flex gap-[5px]">
                    <div className={`text-center bg-white/10 rounded-[6px] p-[6px_8px] min-w-[50px] border ${finalClass === 'ls' ? 'bg-[#C9A84C]/25 border-[#C9A84C]/50' : 'border-transparent'}`}>
                      <div className={`text-[14px] font-[800] ${finalClass === 'ls' ? 'text-[#e8c96a]' : 'text-[#F87171]'}`}>0.0</div><div className="text-[9px] text-white/50 mt-[2px]">LS</div>
                    </div>
                    <div className={`text-center bg-white/10 rounded-[6px] p-[6px_8px] min-w-[50px] border ${finalClass === 'ni' ? 'bg-[#C9A84C]/25 border-[#C9A84C]/50' : 'border-transparent'}`}>
                      <div className={`text-[14px] font-[800] ${finalClass === 'ni' ? 'text-[#e8c96a]' : 'text-[#FCD34D]'}`}>0.7</div><div className="text-[9px] text-white/50 mt-[2px]">NI</div>
                    </div>
                    <div className={`text-center bg-white/10 rounded-[6px] p-[6px_8px] min-w-[50px] border ${finalClass === 'e' ? 'bg-[#C9A84C]/25 border-[#C9A84C]/50' : 'border-transparent'}`}>
                      <div className={`text-[14px] font-[800] ${finalClass === 'e' ? 'text-[#e8c96a]' : 'text-[#6EE7B7]'}`}>1.0</div><div className="text-[9px] text-white/50 mt-[2px]">E</div>
                    </div>
                    <div className={`text-center bg-white/10 rounded-[6px] p-[6px_8px] min-w-[50px] border ${finalClass === 'ep' ? 'bg-[#C9A84C]/25 border-[#C9A84C]/50' : 'border-transparent'}`}>
                      <div className={`text-[14px] font-[800] ${finalClass === 'ep' ? 'text-[#e8c96a]' : 'text-[#93C5FD]'}`}>1.3</div><div className="text-[9px] text-white/50 mt-[2px]">EP</div>
                    </div>
                  </div>
                </div>

                {/* EP Justification Box */}
                {finalClass === 'ep' && (
                  <div className="bg-[#FFFBEB] border-[1.5px] border-[#FCD34D] rounded-[10px] p-[14px] mt-[12px]">
                    <div className="text-[11px] font-[700] text-[#92400E] mb-[8px]">&#9888; EP Justification Required &mdash; must complete before submitting</div>
                    <textarea 
                      className="w-full resize-y min-h-[70px] p-[9px_11px] border-[1.5px] border-[#E2DDD4] rounded-[8px] text-[13px] text-[#0f1923] bg-white outline-none"
                      placeholder="Describe specific evidence of EP-level performance with real examples from this quarter..."
                      value={formData.epText}
                      onChange={e => setFormData({...formData, epText: e.target.value})}
                    />
                    <div className="text-[11px] text-[#6b7280] mt-[6px]">&#128274; EP staff capped at 5% of 190 employees = max 9 EP-rated at any time. System will block if cap is reached.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments Card */}
          {cur && (
            <div className="bg-white rounded-[14px] border border-[#E2DDD4] overflow-hidden">
              <div className="p-[13px_18px] border-b border-[#E2DDD4] flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-[10px]">
                  <div className="w-[30px] h-[30px] rounded-[7px] bg-[#F0FDF4] flex items-center justify-center text-[14px] shrink-0">&#128172;</div>
                  <div>
                    <div className="text-[13px] font-[700] text-[#0D2B55]">Manager Comments</div>
                    <div className="text-[11px] text-[#6b7280]">Optional &mdash; recommended especially for LS and NI ratings</div>
                  </div>
                </div>
              </div>
              <div className="p-[16px_18px]">
                <textarea 
                  className="w-full resize-y min-h-[70px] p-[9px_11px] border-[1.5px] border-[#E2DDD4] rounded-[8px] text-[13px] text-[#0f1923] bg-white outline-none"
                  placeholder="Add overall observations about this employee's performance this quarter..."
                  value={formData.comments}
                  onChange={e => setFormData({...formData, comments: e.target.value})}
                />
              </div>
            </div>
          )}

          {/* Action Bar */}
          {cur && (
            <div className="flex flex-col sm:flex-row gap-[10px] mt-[6px]">
              <button onClick={clearEmp} className="p-[10px_18px] rounded-[9px] text-[13px] font-[700] bg-white text-[#0f1923] border-[1.5px] border-[#E2DDD4] hover:border-[#0D2B55] transition-colors justify-center sm:justify-start">&#8592; Start Over</button>
              <button onClick={handleDraft} className="p-[10px_18px] rounded-[9px] text-[13px] font-[700] bg-[#EFF6FF] text-[#0369A1] border-[1.5px] border-[#BFDBFE] hover:bg-[#DBEAFE] transition-colors justify-center sm:justify-start">&#128190; Save as Draft</button>
              
              <div className="sm:ml-auto">
                <button 
                  onClick={() => setSubmitModal(true)} 
                  disabled={ratedCount < 6 || (finalClass === 'ep' && !formData.epText)}
                  className="w-full p-[10px_18px] rounded-[9px] text-[13px] font-[700] bg-[#C9A84C] text-[#0D2B55] disabled:bg-[#E2DDD4] disabled:text-[#6b7280] disabled:cursor-not-allowed hover:bg-[#e8c96a] transition-colors justify-center"
                >
                  Submit to HR Manager &#8594;
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column (Aside Info) */}
        <div className="flex flex-col gap-[12px] lg:order-last order-first">
          
          <div className="bg-white rounded-[14px] border border-[#E2DDD4] overflow-hidden">
            <div className="p-[13px_18px] border-b border-[#E2DDD4] flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-[10px]">
                <div className="w-[30px] h-[30px] rounded-[7px] bg-[#F0F9FF] flex items-center justify-center text-[14px] shrink-0">&#128218;</div>
                <div className="text-[13px] font-[700] text-[#0D2B55]">Selected Employee</div>
              </div>
            </div>
            <div className="p-[12px_16px]">
              {!cur ? (
                <div className="text-center p-[20px] text-[#6b7280]">
                  <div className="text-[32px] mb-[10px]">&#128100;</div>
                  <div className="text-[12px]">No employee selected</div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-[11px] mb-[12px] pb-[12px] border-b border-[#E2DDD4]">
                    <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#1a3d6e] to-[#2a527f] flex items-center justify-center text-[13px] font-[700] text-white shrink-0">
                      {cur.personalDetails?.firstName?.[0]}{cur.personalDetails?.lastName?.[0]}
                    </div>
                    <div>
                      <div className="text-[14px] font-[700] text-[#0D2B55]">{cur.personalDetails?.firstName} {cur.personalDetails?.lastName}</div>
                      <div className="text-[11px] text-[#6b7280]">{formData.title || cur.employmentDetails?.jobTitle}</div>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center py-[6px] border-b border-[#E2DDD4] text-[12px]">
                      <span className="text-[#6b7280]">ID</span><span className="font-[600] text-[#0f1923]">{cur.employeeId}</span>
                    </div>
                    <div className="flex justify-between items-center py-[6px] border-b border-[#E2DDD4] text-[12px]">
                      <span className="text-[#6b7280]">Company</span><span className="font-[600] text-[#0f1923]">{cur.companyCode || 'FSM'}</span>
                    </div>
                    <div className="flex justify-between items-center py-[6px] border-b border-[#E2DDD4] text-[12px]">
                      <span className="text-[#6b7280]">Manager</span><span className="font-[600] text-[#0f1923] text-right text-[11px] max-w-[130px] truncate">Assigned Line Manager</span>
                    </div>
                    <div className="flex justify-between items-center py-[6px] border-b border-[#E2DDD4] text-[12px]">
                      <span className="text-[#6b7280]">Pro-Rata</span><span className="font-[700] text-[#0D2B55] text-[13px]">{prValue.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between items-center py-[6px] border-b border-[#E2DDD4] text-[12px]">
                      <span className="text-[#6b7280]">Months</span><span className="font-[700] text-[#0D2B55] text-[13px]">{prMonths}/12</span>
                    </div>
                  </div>
                  <div className="mt-[12px]">
                    <div className="flex justify-between text-[11px] mb-[5px]">
                      <span className="text-[#6b7280]">Year coverage</span><span className="font-[700] text-[#065F46]">{Math.round(prValue*100)}%</span>
                    </div>
                    <div className="h-[7px] bg-[#E2DDD4] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#059669] to-[#C9A84C] rounded-full transition-all duration-500" style={{width: `${prValue*100}%`}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-[#E2DDD4] overflow-hidden">
            <div className="p-[13px_18px] border-b border-[#E2DDD4] flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-[10px]">
                <div className="w-[30px] h-[30px] rounded-[7px] bg-[#FFFBEB] flex items-center justify-center text-[14px] shrink-0">&#128176;</div>
                <div>
                  <div className="text-[13px] font-[700] text-[#0D2B55]">STIP Award Preview</div>
                  <div className="text-[11px] text-[#6b7280]">CP=13.01% &middot; Updates live</div>
                </div>
              </div>
            </div>
            <div className="p-[12px_16px]">
              <div className="flex flex-col gap-[5px]">
                <div className={`flex justify-between items-center p-[8px_11px] rounded-[8px] border bg-[#FEE2E2] text-[#991B1B] ${finalClass === 'ls' ? 'border-[2px] border-[#FECACA] shadow-sm' : 'border-[#FECACA]/50'}`}>
                  <span className="text-[12px] font-[600]">0.0 &mdash; Less than Sat.</span><span className="text-[14px] font-[800]">0.00%</span>
                </div>
                <div className={`flex justify-between items-center p-[8px_11px] rounded-[8px] border bg-[#FEF3C7] text-[#92400E] ${finalClass === 'ni' ? 'border-[2px] border-[#FDE68A] shadow-sm' : 'border-[#FDE68A]/50'}`}>
                  <span className="text-[12px] font-[600]">0.7 &mdash; Needs Improv.</span><span className="text-[14px] font-[800]">{(CP*0.7*prValue*100).toFixed(2)}%</span>
                </div>
                <div className={`flex justify-between items-center p-[8px_11px] rounded-[8px] border bg-[#D1FAE5] text-[#065F46] ${finalClass === 'e' ? 'border-[2px] border-[#A7F3D0] shadow-sm' : 'border-[#A7F3D0]/50'}`}>
                  <span className="text-[12px] font-[600]">1.0 &mdash; Effective</span><span className="text-[14px] font-[800]">{(CP*1.0*prValue*100).toFixed(2)}%</span>
                </div>
                <div className={`flex justify-between items-center p-[8px_11px] rounded-[8px] border bg-[#DBEAFE] text-[#1E40AF] ${finalClass === 'ep' ? 'border-[2px] border-[#BFDBFE] shadow-sm' : 'border-[#BFDBFE]/50'}`}>
                  <span className="text-[12px] font-[600]">1.3 &mdash; Exceeds</span><span className="text-[14px] font-[800]">{(CP*1.3*prValue*100).toFixed(2)}%</span>
                </div>
              </div>
              <div className="bg-[#0D2B55] rounded-[8px] p-[11px_13px] font-mono text-[11px] text-[#e8c96a] leading-[1.8] mt-[8px]">
                CP% &times; IPRF &times; Pro-Rata = Award %
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-[#E2DDD4] overflow-hidden">
            <div className="p-[13px_18px] border-b border-[#E2DDD4] flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-[10px]">
                <div className="w-[30px] h-[30px] rounded-[7px] bg-[#FFF7ED] flex items-center justify-center text-[14px] shrink-0">&#128197;</div>
                <div className="text-[13px] font-[700] text-[#0D2B55]">CY2026 Deadlines</div>
              </div>
            </div>
            <div className="p-[12px_16px]">
              <div className="flex flex-col gap-[5px]">
                <div className="flex justify-between items-center text-[12px] p-[6px_10px] rounded-[7px] bg-[#D1FAE5] text-[#065F46]">
                  <span>Q1</span><span className="text-[11px]">&#10003; Submitted</span>
                </div>
                <div className="flex justify-between items-center text-[12px] p-[6px_10px] rounded-[7px] bg-[#D1FAE5] text-[#065F46]">
                  <span>Q2</span><span className="text-[11px]">&#10003; Submitted</span>
                </div>
                <div className="flex justify-between items-center text-[12px] p-[6px_10px] rounded-[7px] bg-[#FEF3C7] text-[#92400E] font-[700]">
                  <span>Q3 &larr; Now</span><span className="text-[11px]">30 Sep 2026</span>
                </div>
                <div className="flex justify-between items-center text-[12px] p-[6px_10px] rounded-[7px]">
                  <span className="text-[#0f1923]">Q4</span><span className="text-[11px] text-[#6b7280]">15 Dec 2026</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Submission Confirmation Modal */}
      {submitModal && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[100] flex items-center justify-center p-[20px]">
          <div className="bg-white rounded-[14px] w-full max-w-[460px] shadow-2xl overflow-hidden">
            <div className="bg-[#0D2B55] p-[16px_22px] flex justify-between items-center">
              <div className="text-[15px] font-[700] text-white">Confirm Submission</div>
              <button onClick={() => setSubmitModal(false)} className="bg-white/10 border-none text-white w-[30px] h-[30px] rounded-[7px] cursor-pointer text-[18px] flex items-center justify-center hover:bg-white/20">&#215;</button>
            </div>
            <div className="p-[30px_22px] text-center">
              <div className="text-[36px] mb-[14px]">&#128228;</div>
              <div className="text-[16px] font-[700] text-[#0D2B55] mb-[10px]">Submit to HR Manager?</div>
              <div className="text-[13px] text-[#6b7280] mb-[20px]">Once submitted, you cannot edit this appraisal unless HR returns it.</div>
              <div className="flex gap-[10px] justify-center">
                <button onClick={() => setSubmitModal(false)} className="p-[10px_18px] rounded-[9px] text-[13px] font-[700] bg-white text-[#0f1923] border-[1.5px] border-[#E2DDD4] hover:border-[#0D2B55]">Cancel</button>
                <button onClick={confirmSubmit} className="p-[10px_18px] rounded-[9px] text-[13px] font-[700] bg-[#059669] text-white border-none hover:bg-[#065F46] flex items-center gap-[5px]">
                  &#10003; Confirm Submission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}