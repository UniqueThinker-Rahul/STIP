'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Send, AlertTriangle, ChevronDown, Check, Loader2, User, Info, Calendar, Calculator, Search } from 'lucide-react';
import api from '../../../../lib/api'; 

const CRITERIA = [
  { 
    id: 'expectedResults', 
    short: 'Results',
    name: "Delivered Expected Results", 
    wt: 0.30, 
    pct: "30%", 
    desc: "Did the employee deliver the expected results of their position in 2025/2026?",
    rubric: [
      { score: "0.0", label: "LS", title: "Less Than Satisfactory", details: "Performance failed to achieve the expectations of the position. Key operational outputs missed entirely." },
      { score: "0.7", label: "NI", title: "Needs Improvement", details: "Performance fell below the expectations set for the role. Required significant guidance or support to attempt core outcomes." },
      { score: "1.0", label: "E", title: "Fully Effective", details: "Delivered the expected results of the position. Met targets and objectives accurately in line with expectations." },
      { score: "1.3", label: "EP", title: "Exceeds Performance", details: "Performance is noticeably above requirements. Reflects a wide range of outcomes beyond default targets (Must be supported by written examples)." }
    ]
  },
  { 
    id: 'initiative', 
    short: 'Initiative', 
    name: "Behaviors & Initiative", 
    wt: 0.20, 
    pct: "20%", 
    desc: "Does the employee take responsibility, plan tasks, and solve problems proactively?",
    rubric: [
      { score: "0.0", label: "LS", title: "Less Than Satisfactory", details: "Fails to take ownership of tasks. Requires constant operational prompting or shows counter-productive workflow habits." },
      { score: "0.7", label: "NI", title: "Needs Improvement", details: "Displays baseline accountability occasionally but lacks active initiative to address unassigned workload blocks." },
      { score: "1.0", label: "E", title: "Fully Effective", details: "Takes structured responsibility, coordinates duties efficiently, and handles daily issues independently without intervention." },
      { score: "1.3", label: "EP", title: "Exceeds Performance", details: "Proactively champions efficiency improvements, takes on additional unassigned mandates, and assists peers systematically." }
    ]
  },
  { 
    id: 'safeWorking', 
    short: 'Safety', 
    name: "Safe Working", 
    wt: 0.20, 
    pct: "20%", 
    desc: "Does the employee follow safety rules, wear PPE, and identify hazards?",
    rubric: [
      { score: "0.0", label: "LS", title: "Less Than Satisfactory", details: "Takes active shortcuts on protocols, runs processes without assigned PPE, or ignores clear hazardous environmental states." },
      { score: "0.7", label: "NI", title: "Needs Improvement", details: "Follows general guidelines but occasionally neglects checking hazard updates or requires safety supervisor warnings." },
      { score: "1.0", label: "E", title: "Fully Effective", details: "Identifies risks proactively before starting tasks, wears all required PPE, monitors co-workers, and logs alerts accurately." },
      { score: "1.3", label: "EP", title: "Exceeds Performance", details: "Takes a leading cultural role in organizing safety risk frameworks, implements protective upgrades, and acts to stop unsafe work proactively." }
    ]
  },
  { 
    id: 'jobCompetence', 
    short: 'Competence',
    name: "Job Competence", 
    wt: 0.10, 
    pct: "10%", 
    desc: "Does the employee have and apply the skills required for their role?",
    rubric: [
      { score: "0.0", label: "LS", title: "Less Than Satisfactory", details: "Lacks core technical competencies required for execution. Causes high frequency of errors requiring operational rebuilds." },
      { score: "0.7", label: "NI", title: "Needs Improvement", details: "Possesses basic understanding but hits technical gaps when working through non-standard system dependencies." },
      { score: "1.0", label: "E", title: "Fully Effective", details: "Demonstrates total mastery over the required domain logic, completing technical tasks cleanly without design bugs." },
      { score: "1.3", label: "EP", title: "Exceeds Performance", details: "Serves as an organizational subject matter expert, resolving complex architecture problems and designing framework workarounds." }
    ]
  },
  { 
    id: 'dependability', 
    short: 'Dependability',
    name: "Dependability", 
    wt: 0.10, 
    pct: "10%", 
    desc: "Is the employee reliable, punctual, and do they deliver quality work on time?",
    rubric: [
      { score: "0.0", label: "LS", title: "Less Than Satisfactory", details: "Unreliable task completion timeline history. Shows recurring unexcused absences or low fidelity data reporting inputs." },
      { score: "0.7", label: "NI", title: "Needs Improvement", details: "Generally steady but timing swings or target delays cause resource planning friction across associated teams." },
      { score: "1.0", label: "E", title: "Fully Effective", details: "Highly punctual and stable asset who consistently packages high-quality, verified deliverable packages within deadlines." },
      { score: "1.3", label: "EP", title: "Exceeds Performance", details: "Flawless reliability log under pressure conditions, handles critical escalations seamlessly, and acts as a standard backup anchor." }
    ]
  },
  { 
    id: 'adaptability', 
    short: 'Adaptability',
    name: "Adaptability", 
    wt: 0.10, 
    pct: "10%", 
    desc: "Does the employee accept new tasks, change, and extra demands?",
    rubric: [
      { score: "0.0", label: "LS", title: "Less Than Satisfactory", details: "Resists structural alterations, technical system updates, or role assignment changes rigidly or negatively." },
      { score: "0.7", label: "NI", title: "Needs Improvement", details: "Accepts assignments eventually but requires extended transition timelines or experiences velocity drops during workflow adjustments." },
      { score: "1.0", label: "E", title: "Fully Effective", details: "Adapts smoothly to processing variations, tool changes, or balanced internal team re-structures without friction." },
      { score: "1.3", label: "EP", title: "Exceeds Performance", details: "Thrives during fast pivot conditions, masters new paradigms instantly, and actively constructs onboarding workflows for others." }
    ]
  }
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

function NewAppraisalForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft'); 

  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [dbQuarters, setDbQuarters] = useState([]);
  const [activeQuarterId, setActiveQuarterId] = useState('');

  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [formData, setFormData] = useState({ title: '', quarter: '', comments: '', epJustification: '' });
  const [scores, setScores] = useState({ expectedResults: null, initiative: null, safeWorking: null, jobCompetence: null, dependability: null, adaptability: null });
  const [expandedCrit, setExpandedCrit] = useState('expectedResults'); 
  const [rejectionReason, setRejectionReason] = useState('');

  const [quarterStatuses, setQuarterStatuses] = useState({});

  // 🚨 Custom Dropdown UI States
  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchQueries, setSearchQueries] = useState({ emp: '', title: '' });
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchFormContext = async () => {
      try {
        const [teamRes, quarterRes] = await Promise.all([
          api.get('/users/my-team'),
          api.get('/quarters') 
        ]);
        
        const myTeam = teamRes.data?.data || [];
        setTeam(myTeam);
        
        const fetchedQuarters = quarterRes.data?.data || [];
        setDbQuarters(fetchedQuarters);
        
        const currentDate = new Date();
        const defaultQ = fetchedQuarters.find(q => new Date(q.endDate) >= currentDate && !q.isLocked) || fetchedQuarters[0];
        
        if (defaultQ) {
          setActiveQuarterId(defaultQ._id);
          setFormData(prev => ({ ...prev, quarter: defaultQ._id }));
        }

        if (draftId) {
          const appRes = await api.get('/appraisals');
          const allApps = appRes.data?.data || [];
          const draftData = allApps.find(a => a._id === draftId);
          
          if (draftData) {
            const empId = draftData.employeeId?._id || draftData.employeeId;
            setSelectedStaffId(empId);
            const emp = myTeam.find(e => e._id === empId);
            
            setFormData({
              title: emp?.employmentDetails?.jobTitle || '',
              quarter: draftData.appraisalQuarter?._id || draftData.appraisalQuarter || (defaultQ?._id || ''),
              epJustification: draftData.narrative?.epJustification || '',
              comments: draftData.narrative?.generalComments || ''
            });

            setScores({
              expectedResults: draftData.scores?.deliveredResults?.rating ?? null,
              initiative: draftData.scores?.behaviors?.rating ?? null,
              safeWorking: draftData.scores?.safeWorking?.rating ?? null,
              jobCompetence: draftData.scores?.jobCompetence?.rating ?? null,
              dependability: draftData.scores?.dependability?.rating ?? null,
              adaptability: draftData.scores?.adaptability?.rating ?? null
            });
          }
        }
      } catch (err) {
        console.error("Context build error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFormContext();
  }, [draftId]);

  useEffect(() => {
    if (!selectedStaffId || draftId || dbQuarters.length === 0) return;

    const fetchAppraisalStatus = async () => {
      try {
        const { data } = await api.get(`/appraisals`);
        const allApps = data?.data || [];
        const empHistory = allApps.filter(a => (a.employeeId?._id || a.employeeId) === selectedStaffId);
        
        let newStatuses = {};
        dbQuarters.forEach(q => newStatuses[q._id] = 'missing');
        
        if (empHistory.length > 0) {
          empHistory.forEach(app => {
            const qId = app.appraisalQuarter?._id || app.appraisalQuarter;
            if (qId) {
              if (app.workflow?.status === 'DRAFT') {
                newStatuses[qId] = 'draft';
              } else if (app.workflow?.status === 'NOT_APPROVED' || app.workflow?.status === 'REOPENED') {
                newStatuses[qId] = 'reopened'; 
                setRejectionReason(app.narrative?.ceoComments || app.narrative?.hrComments || app.narrative?.generalComments || 'Please revise your submission.');
              } else {
                newStatuses[qId] = 'submitted'; 
              }
            }
          });
          
          setScores({ expectedResults: null, initiative: null, safeWorking: null, jobCompetence: null, dependability: null, adaptability: null });
          const emp = team.find(s => s._id === selectedStaffId);
          setFormData(prev => ({ ...prev, title: emp?.employmentDetails?.jobTitle || '', comments: '', epJustification: '' }));
          setRejectionReason('');
        } else {
           setScores({ expectedResults: null, initiative: null, safeWorking: null, jobCompetence: null, dependability: null, adaptability: null });
           const emp = team.find(s => s._id === selectedStaffId);
           setFormData(prev => ({ ...prev, title: emp?.employmentDetails?.jobTitle || '', comments: '', epJustification: '' }));
           setRejectionReason('');
        }

        setQuarterStatuses(newStatuses);
      } catch (e) {
        console.error("Failed to load historical appraisals:", e);
      }
    };
    fetchAppraisalStatus();
  }, [selectedStaffId, draftId, team, dbQuarters]);

  // Click outside listener for custom dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedStaff = team.find(s => s._id === selectedStaffId);
  const ratedCount = Object.values(scores).filter(v => v !== null).length;
  
  let rawIPRF = CRITERIA.reduce((sum, c) => sum + ((scores[c.id] || 0) * c.wt), 0);
  let calculatedIPRF = 0;
  
  let scoreBucket = 'ls';
  let scoreTarget = '0.0';
  
  if (ratedCount === 6) {
    if (rawIPRF < 0.35) { calculatedIPRF = 0.0; scoreBucket = 'ls'; scoreTarget = '0.0'; }
    else if (rawIPRF < 0.85) { calculatedIPRF = 0.7; scoreBucket = 'ni'; scoreTarget = '0.7'; }
    else if (rawIPRF < 1.15) { calculatedIPRF = 1.0; scoreBucket = 'e'; scoreTarget = '1.0'; }
    else { calculatedIPRF = 1.3; scoreBucket = 'ep'; scoreTarget = '1.3'; }
  }

  const requiresEPJustification = calculatedIPRF >= 1.3;
  const isAlreadySubmitted = quarterStatuses[formData.quarter] === 'submitted';
  
  const currentQObj = dbQuarters.find(q => q._id === formData.quarter);
  const isExpired = currentQObj ? new Date() > new Date(currentQObj.endDate) : false;
  const isCurrentQuarterLocked = isAlreadySubmitted || (currentQObj && (currentQObj.isLocked || (isExpired && !currentQObj.forceUnlock)));

  let proRata = 1.0;
  let prMonths = 12;
  if (selectedStaff?.employmentDetails?.prorateValue) {
    prMonths = selectedStaff.employmentDetails.prorateValue;
    proRata = prMonths / 12;
  }

  const stipAwardPct = (CP * calculatedIPRF * proRata * 100).toFixed(2);

  const handleScore = (critId, val) => {
    if (isCurrentQuarterLocked) return;
    setScores(prev => ({ ...prev, [critId]: val }));
    
    const currentIndex = CRITERIA.findIndex(c => c.id === critId);
    if (currentIndex < CRITERIA.length - 1) {
      setTimeout(() => setExpandedCrit(CRITERIA[currentIndex + 1].id), 250);
    } else {
      setTimeout(() => setExpandedCrit(null), 250);
    }
  };

  const handleClear = () => {
    setSelectedStaffId('');
    setScores({ expectedResults: null, initiative: null, safeWorking: null, jobCompetence: null, dependability: null, adaptability: null });
    setFormData({ title: '', quarter: activeQuarterId, comments: '', epJustification: '' });
    setRejectionReason('');
    if (draftId) router.replace('/dashboard/manager/new'); 
  };

  const handleEmpSelect = (id) => {
    if (!id) { handleClear(); return; }
    setSelectedStaffId(id);
    const emp = team.find(e => e._id === id);
    if (emp) {
      setFormData(prev => ({
        ...prev, 
        title: emp.employmentDetails?.jobTitle || ''
      }));
    }
    setOpenDropdown(null);
    setSearchQueries(prev => ({ ...prev, emp: '' }));
  };

  const handleTitleSelect = (title) => {
    setFormData(prev => ({ ...prev, title }));
    setOpenDropdown(null);
    setSearchQueries(prev => ({ ...prev, title: '' }));
  };

  const handleSubmit = async (isDraft) => {
    if (!selectedStaffId) return alert("Please select an employee.");
    if (isCurrentQuarterLocked) return alert("This appraisal timeline is locked or has already been submitted to HR.");
    if (!isDraft && ratedCount < 6) return alert("Please rate all 6 criteria before submitting.");
    if (!isDraft && requiresEPJustification && formData.epJustification.trim().length < 10) {
      return alert("A comprehensive EP Justification is mandatory.");
    }

    setIsSubmitting(true);
    try {
      const payload = {
        employeeId: selectedStaffId,
        reviewYear: currentQObj?.year || new Date().getFullYear(),
        appraisalQuarter: formData.quarter, 
        period: { 
          year: currentQObj?.year || new Date().getFullYear(), 
          quarter: currentQObj?.name ? (currentQObj.name.substring(0, 2).toUpperCase() || 'Q1') : 'Q1' 
        },
        scores: scores,
        calculatedResults: { finalIprfScore: calculatedIPRF },
        stipAward: parseFloat(stipAwardPct),
        narrative: {
          generalComments: formData.comments.trim(),
          epJustification: formData.epJustification.trim()
        },
        status: isDraft ? 'DRAFT' : 'SUBMITTED' 
      };

      await api.post('/appraisals', payload);
      
      const submissionDate = new Date().toLocaleDateString();
      const submissionTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (isDraft) {
        alert(`Draft saved successfully on ${submissionDate} at ${submissionTime}!`);
        router.push('/dashboard/manager/drafts');
      } else {
        alert(`Appraisal successfully submitted to HR Manager on ${submissionDate} at ${submissionTime}!`);
        router.push('/dashboard/manager/submissions'); 
      }
    } catch (err) {
      alert(err.response?.data?.message || "An error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚨 UPGRADE: Searchable Dropdown Helper Function
  const renderSearchableDropdown = (fieldKey, options, currentValue, onSelect, placeholder, displayKey) => {
    const isOpen = openDropdown === fieldKey;
    const query = searchQueries[fieldKey] || '';
    
    const filteredOptions = options.filter(opt => {
      const rawText = typeof opt === 'string' ? opt : (displayKey ? displayKey(opt) : '');
      const text = String(rawText || ''); 
      return text.toLowerCase().includes(query.toLowerCase());
    });

    const selectedText = currentValue 
      ? (typeof options[0] === 'string' ? currentValue : displayKey(options.find(o => o._id === currentValue)) || placeholder)
      : placeholder;

    return (
      <div className="relative w-full" ref={isOpen ? dropdownRef : null}>
        <div 
          onClick={() => {
             if (draftId && fieldKey === 'emp') return; // Lock employee select if editing a draft
             if (isCurrentQuarterLocked && fieldKey === 'title') return; // Lock title edit if locked
             setOpenDropdown(isOpen ? null : fieldKey);
          }}
          className={`w-full px-[12px] py-[9px] border-[1.5px] rounded-[8px] text-[13px] bg-white transition-colors flex justify-between items-center ${
             (draftId && fieldKey === 'emp') || (isCurrentQuarterLocked && fieldKey === 'title') 
                 ? 'border-gray-200 bg-gray-50 opacity-80 cursor-not-allowed' 
                 : isOpen ? 'border-[#0D2B55] ring-2 ring-[#0D2B55]/10 cursor-pointer' : 'border-[#E2DDD4] cursor-pointer'
          }`}
        >
          <span className={currentValue ? "text-[#0f1923] truncate" : "text-gray-400 truncate"}>{selectedText}</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {isOpen && (
          <div className="absolute z-[100] mt-1 w-full bg-white border border-[#E2DDD4] rounded-[8px] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-gray-100 bg-slate-50 sticky top-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text" autoFocus placeholder="Search..."
                  value={searchQueries[fieldKey] || ''}
                  onChange={(e) => setSearchQueries(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md outline-none focus:border-[#0D2B55]"
                />
              </div>
            </div>
            
            <div className="max-h-[180px] overflow-y-auto overflow-x-hidden custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-xs text-center text-gray-500">No results found</div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const val = typeof opt === 'string' ? opt : opt._id;
                  const display = typeof opt === 'string' ? opt : displayKey(opt);
                  const isSelected = currentValue === val;
                  
                  return (
                    <div
                      key={val || idx}
                      onClick={() => onSelect(val)}
                      className={`px-3 py-2 text-[12px] cursor-pointer hover:bg-[#0D2B55] hover:text-white transition-colors truncate ${isSelected ? 'bg-blue-50 font-bold text-[#0D2B55]' : 'text-[#0f1923]'}`}
                    >
                      {display}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#0D2B55] w-10 h-10" /></div>;

  return (
    <div className="max-w-6xl mx-auto pb-20 font-sans">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0D2B55]">
          {draftId ? 'Resume Appraisal Draft' : 'New Staff Appraisal'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">Select a staff member • rate 6 criteria • save draft or submit to HR</p>
      </div>

      {selectedStaff && (
        <div className="flex items-center gap-[8px] p-[10px_14px] bg-[#D1FAE5] border border-[#A7F3D0] text-[#065F46] rounded-[9px] text-[12px] font-[500] mb-[16px]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          Submitting will automatically send an email notification to the HR Manager.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* MAIN APPRAISAL FORM PIPELINE */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* STEP 1: EMPLOYEE SELECTOR CARD */}
          <div className="bg-[#0D2B55] rounded-xl p-5 shadow-sm">
            <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3">Step 1 — Select Staff Member</div>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-white/90 text-xs font-bold mb-1">Search & select employee <span className="text-red-400">*</span></label>
                
                {/* 🚨 UPGRADED: Employee Select Dropdown */}
                {renderSearchableDropdown(
                  'emp', 
                  team, 
                  selectedStaffId, 
                  handleEmpSelect, 
                  '-- Select a staff member --', 
                  (staff) => `${staff.personalDetails?.firstName} ${staff.personalDetails?.lastName} — ${staff.employmentDetails?.jobTitle}`
                )}

              </div>
              {selectedStaffId && (
                <button onClick={handleClear} className="bg-white/10 border border-white/20 text-white/80 px-4 py-2 rounded-lg text-xs font-bold hover:bg-white/20 transition-all h-[38px] shrink-0">
                  ✕ Clear
                </button>
              )}
            </div>

            {selectedStaff && (
              <div className="mt-4 p-3 bg-white/10 border border-white/10 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#9a7a2e] flex items-center justify-center text-[#0D2B55] font-bold text-sm">
                    {selectedStaff.personalDetails?.firstName.charAt(0)}{selectedStaff.personalDetails?.lastName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{selectedStaff.personalDetails?.firstName} {selectedStaff.personalDetails?.lastName}</div>
                    <div className="text-white/50 text-xs">{selectedStaff.employmentDetails?.jobTitle}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white/40 text-[10px]">ID: {selectedStaff.employeeId}</div>
                  <div className="text-[#e8c96a] font-bold text-xs">{proRata.toFixed(3)} PR</div>
                </div>
              </div>
            )}
          </div>

          {selectedStaffId && (
            <>
              {/* Rejection Notification Alert Box */}
              {quarterStatuses[formData.quarter] === 'reopened' && rejectionReason && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-[12px] font-black text-red-800 uppercase tracking-wider">Appraisal Rejected — Revision Required</span>
                  </div>
                  <div className="text-sm text-red-700 font-medium ml-7 bg-white p-3 rounded-lg border border-red-100 shadow-inner">
                    {rejectionReason}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[14px] shrink-0">&#128100;</div>
                  <div>
                    <div className="text-sm font-bold text-[#0D2B55]">Employee Details</div>
                    <div className="text-[11px] text-[#6b7280]">Edit title and quarter before rating</div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-[600] text-[#0D2B55]">Company Code <span className="text-[9px] font-[700] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded ml-1 uppercase">Auto</span></label>
                      <input readOnly value={selectedStaff?.companyCode || 'FSM'} className="p-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-500 bg-gray-50 cursor-default" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-[600] text-[#0D2B55]">Employee ID <span className="text-[9px] font-[700] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded ml-1 uppercase">Auto</span></label>
                      <input readOnly value={selectedStaff?.employeeId || ''} className="p-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-500 bg-gray-50 cursor-default" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-[600] text-[#0D2B55]">First Name <span className="text-[9px] font-[700] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded ml-1 uppercase">Auto</span></label>
                      <input readOnly value={selectedStaff?.personalDetails?.firstName || ''} className="p-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-500 bg-gray-50 cursor-default" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-[600] text-[#0D2B55]">Last Name <span className="text-[9px] font-[700] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded ml-1 uppercase">Auto</span></label>
                      <input readOnly value={selectedStaff?.personalDetails?.lastName || ''} className="p-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-500 bg-gray-50 cursor-default" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[11px] font-[600] text-[#0D2B55]">
                        Job Title {selectedStaff?.employmentDetails?.jobTitle ? <span className="text-[9px] font-[700] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded ml-1 uppercase">Auto</span> : <span className="text-red-500">*</span>}
                      </label>
                      {selectedStaff?.employmentDetails?.jobTitle ? (
                        <input 
                          readOnly 
                          value={selectedStaff.employmentDetails.jobTitle} 
                          className="p-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-500 bg-gray-50 cursor-default" 
                        />
                      ) : (
                        /* 🚨 UPGRADED: Job Title Select Dropdown */
                        renderSearchableDropdown('title', JOB_TITLES, formData.title, handleTitleSelect, '-- Select Job Title --', null)
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-[600] text-[#0D2B55]">Reporting Manager <span className="text-[9px] font-[700] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded ml-1 uppercase">Auto</span></label>
                      <input 
                        readOnly 
                        value={
                          selectedStaff?.employmentDetails?.reportingTo?.personalDetails 
                            ? `${selectedStaff.employmentDetails.reportingTo.personalDetails.firstName} ${selectedStaff.employmentDetails.reportingTo.personalDetails.lastName}`
                            : selectedStaff?.employmentDetails?.rawManagerName || "Assigned Line Manager"
                        } 
                        className="p-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-500 bg-gray-50 cursor-default" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[11px] font-[600] text-[#0D2B55]">Pro-Rata Value <span className="text-[9px] font-[700] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded ml-1 uppercase">Calculated</span></label>
                      <input readOnly value={`${proRata.toFixed(3)} (${prMonths} months)`} className="p-2 border border-dashed border-gray-200 rounded-lg text-xs font-bold text-[#0D2B55] bg-gray-50 cursor-default" />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-[600] text-[#0D2B55]">Appraisal Quarter <span className="text-red-500">*</span></label>
                      <select 
                        value={formData.quarter} 
                        onChange={e => setFormData({...formData, quarter: e.target.value})}
                        className={`p-[10px] border rounded-lg text-xs font-semibold outline-none cursor-pointer transition-all ${isCurrentQuarterLocked ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-gray-300 text-gray-900 bg-white'}`}
                      >
                        {dbQuarters.length === 0 ? <option value="">No Quarters Configured</option> : dbQuarters.map(q => {
                           const exp = new Date() > new Date(q.endDate);
                           const lockStatus = (q.isLocked || (exp && !q.forceUnlock)) ? 'Locked' : q.forceUnlock ? 'Open (Override)' : 'Active';
                           return (
                             <option key={q._id} value={q._id}>
                               {q.name} — {quarterStatuses[q._id] === 'submitted' ? 'Already Submitted' : lockStatus}
                             </option>
                           );
                        })}
                      </select>
                    </div>
                  </div>
                  
                  {isCurrentQuarterLocked && (
                    <div className="flex items-start gap-1.5 text-[10px] text-amber-700 font-bold mt-3 bg-amber-50/50 p-2 rounded border border-amber-100">
                      <Calendar className="w-3.5 h-3.5 shrink-0 mt-0.5" /> 
                      <div>
                        {isAlreadySubmitted 
                          ? "LOCKED: An active appraisal for this quarter is already in the system. You cannot edit it." 
                          : `LOCKED: Submissions for this tracking period closed on ${new Date(currentQObj?.endDate).toLocaleDateString()}. Please contact HR Administration if you need to request an ICT Late Override.`}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 3: PERFORMANCE CRITERIA COMPLIANCE INTERFACE */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-4">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-[14px] shrink-0">&#11088;</div>
                    <div>
                      <div className="text-sm font-bold text-[#0D2B55]">Performance Criteria — CY2026 Weighted Scoring</div>
                      <div className="text-[11px] text-gray-500">Rate each criterion • IPRF calculates live</div>
                    </div>
                  </div>
                  <div className={`text-[11px] font-bold px-3 py-1 rounded-full ${ratedCount === 6 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {ratedCount} / 6 Rated
                  </div>
                </div>
                
                {/* Scoring Guide Strip */}
                <div className="bg-[#FAF8F4] border-b border-gray-200 px-4 py-2 flex gap-2 items-center overflow-x-auto text-[10px] font-bold whitespace-nowrap">
                   <span className="text-gray-500 uppercase tracking-widest mr-1">Guide:</span>
                   <span className="bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200">0.0 Less than Satisfactory</span>
                   <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200">0.7 Needs Improvement</span>
                   <span className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">1.0 Fully Effective</span>
                   <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">1.3 Exceeds Performance</span>
                </div>

                <div className="p-4 space-y-3">
                  {CRITERIA.map((crit, idx) => {
                    const isExpanded = expandedCrit === crit.id;
                    const val = scores[crit.id];
                    const isRated = val !== null;

                    return (
                      <div key={crit.id} className={`border rounded-xl overflow-hidden transition-all ${isRated ? 'border-[#0D2B55]/20 bg-white' : isExpanded ? 'border-[#0D2B55] bg-[#FAF8F4]/30' : 'border-gray-200 bg-white'}`}>
                        {/* Header Box Controller */}
                        <div 
                          onClick={() => setExpandedCrit(isExpanded ? null : crit.id)} 
                          className="px-4 py-3 bg-[#FAF8F4] flex items-center justify-between cursor-pointer hover:bg-gray-100/80 transition-colors border-b border-transparent"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-6 h-6 rounded-full bg-[#0D2B55] text-white flex items-center justify-center text-[10px] font-bold">{idx + 1}</div>
                            <div>
                              <div className="text-xs font-bold text-gray-900">{crit.name}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">Weight Modifier Factor: <span className="font-bold text-[#0D2B55]">{crit.pct}</span></div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {isRated ? (
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0D2B55]">
                                  {val.toFixed(1)} — {val === 0.0 ? 'LS' : val === 0.7 ? 'NI' : val === 1.0 ? 'E' : 'EP'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-500">Pending Rating</span>
                              )}
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-[#0D2B55]' : ''}`} />
                            </div>
                          </div>
                        </div>

                        {/* 📊 INLINE ASSESSMENT RUBRIC EXPANSION PANEL */}
                        {isExpanded && (
                          <div className="p-4 bg-white space-y-4 border-t border-gray-100 animate-fade-in">
                            <div className="p-3 bg-slate-50 border border-gray-100 rounded-lg flex items-start gap-2">
                              <Info className="w-3.5 h-3.5 text-[#0D2B55] mt-0.5 shrink-0" />
                              <p className="text-[11px] text-gray-600 leading-relaxed font-medium">{crit.desc}</p>
                            </div>

                            {/* Direct Evaluation Option Buttons Selector Section */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {[
                                { v: 0.0, l: 'Less than Satisfactory', bg: 'bg-red-50 text-red-700 border-red-300' },
                                { v: 0.7, l: 'Needs Improvement', bg: 'bg-amber-50 text-amber-700 border-amber-300' },
                                { v: 1.0, l: 'Fully Effective', bg: 'bg-green-50 text-green-700 border-green-300' },
                                { v: 1.3, l: 'Exceeds Performance', bg: 'bg-blue-50 text-blue-700 border-blue-300' }
                              ].map(opt => (
                                <button 
                                  key={opt.v} type="button" disabled={isCurrentQuarterLocked}
                                  onClick={() => handleScore(crit.id, opt.v)}
                                  className={`p-2.5 rounded-xl border-2 text-center transition-all ${isCurrentQuarterLocked ? 'opacity-40 cursor-not-allowed' : ''} ${
                                    val === opt.v ? `${opt.bg} shadow-md scale-[1.02] border-current font-black` : 'border-gray-200 bg-white hover:bg-slate-50 text-gray-500'
                                  }`}
                                >
                                  <div className="text-xl font-black">{opt.v.toFixed(1)}</div>
                                  <div className="text-[9px] font-bold uppercase tracking-wider mt-1 leading-tight">{opt.l}</div>
                                </button>
                              ))}
                            </div>

                            <div className="mt-2 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                              <div className="bg-slate-100/70 px-3 py-1.5 border-b border-slate-200 text-[10px] font-bold text-[#0D2B55] uppercase tracking-wider">
                                System Assessment Guide Reference Matrix
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                                {crit.rubric.map(item => (
                                  <div 
                                    key={item.score} 
                                    className={`p-3 space-y-1 transition-all ${val === parseFloat(item.score) ? 'bg-slate-100 font-medium' : ''}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-black text-slate-800">{item.score} — {item.label}</span>
                                      {val === parseFloat(item.score) && <Check className="w-3 h-3 text-[#0D2B55]" />}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold leading-tight">{item.title}</p>
                                    <p className="text-[10px] text-slate-500 leading-normal pt-1">{item.details}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* LIVE REAL-TIME Summary Metric Score Tracking Strip */}
                <div className="mt-4 bg-[#0D2B55] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner m-4">
                  <div>
                    <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Calculated IPRF Total Modifier</div>
                    <div className="text-3xl font-black text-[#e8c96a] mt-1">{calculatedIPRF > 0 ? calculatedIPRF.toFixed(3) : '—'}</div>
                    <div className="text-[11px] text-white/50 mt-1">{ratedCount > 0 ? `→ Target Category Horizon: ${scoreBucket.toUpperCase()}` : 'Rate criteria to compile score'}</div>
                  </div>
                  <div className="flex gap-1">
                    {[{ id: 'ls', val: '0.0', l: 'LS' }, { id: 'ni', val: '0.7', l: 'NI' }, { id: 'e', val: '1.0', l: 'E' }, { id: 'ep', val: '1.3', l: 'EP' }].map(b => (
                      <div key={b.id} className={`text-center p-2 rounded-lg min-w-[52px] border transition-all ${ratedCount > 0 && scoreBucket === b.id ? 'bg-[#C9A84C]/20 border-[#C9A84C]/50 text-[#e8c96a] font-bold scale-105' : 'bg-white/10 border-transparent text-white/30'}`}>
                        <div className="text-sm font-black">{b.val}</div>
                        <div className="text-[9px] mt-1 font-bold">{b.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {requiresEPJustification && (
                  <div className="mx-4 mb-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="text-[11px] font-bold text-yellow-800 uppercase tracking-wider">EP Justification Required</span>
                    </div>
                    <textarea 
                      disabled={isCurrentQuarterLocked}
                      className="w-full p-3 text-xs bg-white border border-yellow-300 rounded-lg outline-none focus:border-yellow-500 resize-none h-20 shadow-inner"
                      placeholder="Describe specific evidence of Exceeds Performance with real examples from this quarter (mandatory)..."
                      value={formData.epJustification}
                      onChange={(e) => setFormData({...formData, epJustification: e.target.value})}
                    />
                  </div>
                )}
                
                {/* General Comments Box */}
                <div className="mx-4 mb-4 bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-[30px] h-[30px] rounded-[7px] bg-[#F0FDF4] flex items-center justify-center text-[14px] shrink-0 mr-1">&#128172;</div>
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Manager General Comments</span>
                    </div>
                    <textarea 
                      disabled={isCurrentQuarterLocked}
                      className="w-full p-3 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-400 resize-none h-20 shadow-inner"
                      placeholder="Add overall observations about this employee's performance this quarter (optional but recommended)..."
                      value={formData.comments}
                      onChange={(e) => setFormData({...formData, comments: e.target.value})}
                    />
                </div>
              </div>

              {/* ACTION PIPELINE ROW CONTROLS */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 mt-4">
                <button type="button" onClick={handleClear} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all">← Start Over</button>
                
                <button 
                  type="button" 
                  disabled={isSubmitting || isCurrentQuarterLocked} 
                  onClick={() => handleSubmit(true)} 
                  className="px-5 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💾 Save as Draft
                </button>
                
                <button 
                  type="button"
                  disabled={isSubmitting || ratedCount < 6 || isCurrentQuarterLocked} 
                  onClick={() => handleSubmit(false)} 
                  className="sm:ml-auto px-6 py-2.5 bg-[#C9A84C] text-[#0D2B55] rounded-lg text-sm font-black hover:bg-[#e8c96a] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                >
                  {isSubmitting ? 'Processing Submission...' : 'Submit to HR Manager →'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN - SIDE SUMMARY PANELS */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-slate-50">
              <div className="w-[30px] h-[30px] rounded-[7px] bg-[#F0F9FF] flex items-center justify-center text-[14px] shrink-0">&#128218;</div>
              <div className="text-sm font-bold text-[#0D2B55]">Selected Employee</div>
            </div>
            <div className="p-4">
              {!selectedStaff ? (
                <div className="text-center py-6 text-gray-400">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div className="text-xs">No employee selected</div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a3d6e] to-[#2a527f] text-white flex items-center justify-center font-bold text-sm">
                      {selectedStaff.personalDetails?.firstName.charAt(0)}{selectedStaff.personalDetails?.lastName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#0D2B55]">{selectedStaff.personalDetails?.firstName} {selectedStaff.personalDetails?.lastName}</div>
                      <div className="text-[10px] text-gray-500">{formData.title || selectedStaff.employmentDetails?.jobTitle}</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-gray-500">ID</span><span className="font-bold text-gray-800">{selectedStaff.employeeId}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Company</span><span className="font-bold text-gray-800">{selectedStaff.companyCode || 'FSM'}</span></div>
                   <div className="flex justify-between">
                      <span className="text-gray-500">Manager</span>
                      <span className="font-bold text-gray-800 text-right text-[10px] max-w-[130px] truncate">
                        {selectedStaff?.employmentDetails?.reportingTo?.personalDetails 
                          ? `${selectedStaff.employmentDetails.reportingTo.personalDetails.firstName} ${selectedStaff.employmentDetails.reportingTo.personalDetails.lastName}`
                          : selectedStaff?.employmentDetails?.rawManagerName || "Assigned Line Manager"}
                      </span>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-50"><span className="text-gray-500">Pro-Rata</span><span className="font-bold text-[#0D2B55]">{proRata.toFixed(3)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Months</span><span className="font-bold text-[#0D2B55]">{prMonths}/12</span></div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-500">Year coverage</span><span className="font-bold text-green-600">{Math.round(proRata * 100)}%</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-gradient-to-r from-green-500 to-[#C9A84C] h-1.5 rounded-full" style={{ width: `${Math.round(proRata * 100)}%` }}></div></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedStaff && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-slate-50">
                <div className="w-[30px] h-[30px] rounded-[7px] bg-[#FFFBEB] flex items-center justify-center text-[14px] shrink-0">&#128176;</div>
                <div>
                  <div className="text-sm font-bold text-[#0D2B55]">Award Preview</div>
                  <div className="text-[10px] text-gray-500">Live Forecast • Target CP={Math.round(CP*100)}%</div>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className={`flex justify-between items-center p-2 rounded-md border transition-all ${ratedCount > 0 && scoreBucket === 'ls' ? 'bg-red-50 border-red-300 text-red-700 font-black shadow-sm scale-[1.02]' : 'border-gray-100 text-gray-600'}`}>
                  <span className="text-[11px]">0.0 — LS</span><span className="text-xs font-bold">0.00%</span>
                </div>
                <div className={`flex justify-between items-center p-2 rounded-md border transition-all ${ratedCount > 0 && scoreBucket === 'ni' ? 'bg-yellow-50 border-yellow-400 text-yellow-800 font-black shadow-sm scale-[1.02]' : 'border-gray-100 text-gray-600'}`}>
                  <span className="text-[11px]">0.7 — NI</span><span className="text-xs font-bold">{(CP * 0.7 * proRata * 100).toFixed(2)}%</span>
                </div>
                <div className={`flex justify-between items-center p-2 rounded-md border transition-all ${ratedCount > 0 && scoreBucket === 'e' ? 'bg-green-50 border-green-400 text-green-800 font-black shadow-sm scale-[1.02]' : 'border-gray-100 text-gray-600'}`}>
                  <span className="text-[11px]">1.0 — E</span><span className="text-xs font-bold">{(CP * 1.0 * proRata * 100).toFixed(2)}%</span>
                </div>
                <div className={`flex justify-between items-center p-2 rounded-md border transition-all ${ratedCount > 0 && scoreBucket === 'ep' ? 'bg-blue-50 border-blue-300 text-blue-800 font-black shadow-sm scale-[1.02]' : 'border-gray-100 text-gray-600'}`}>
                  <span className="text-[11px]">1.3 — EP</span><span className="text-xs font-bold">{(CP * 1.3 * proRata * 100).toFixed(2)}%</span>
                </div>
                <div className="mt-3 p-2 bg-blue-50/50 rounded-md text-[#0D2B55] font-mono text-[9px] text-center border border-blue-100">
                  CP% × IPRF × Pro-Rata = Award %
                </div>
              </div>
            </div>
          )}

          {selectedStaff && dbQuarters.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-slate-50">
                <div className="w-[30px] h-[30px] rounded-[7px] bg-[#FFF7ED] flex items-center justify-center text-[14px] shrink-0">&#128197;</div>
                <div className="text-sm font-bold text-[#0D2B55]">Submission Deadlines</div>
              </div>
              <div className="p-4 space-y-1">
                {dbQuarters.map(q => {
                  const status = quarterStatuses[q._id];
                  const exp = new Date() > new Date(q.endDate);
                  
                  if (status === 'submitted') {
                    return (
                      <div key={q._id} className="flex justify-between items-center p-2 bg-green-50 rounded-md text-green-700">
                        <span className="text-[11px] font-bold">{q.name}</span>
                        <span className="text-[10px] flex items-center"><Check className="w-3 h-3 mr-1"/> Submitted</span>
                      </div>
                    );
                  } else if (status === 'draft') {
                    return (
                      <div key={q._id} className="flex justify-between items-center p-2 bg-blue-50 rounded-md text-blue-700 border border-blue-200">
                        <span className="text-[11px] font-bold">{q.name}</span>
                        <span className="text-[10px] flex items-center">Draft Saved</span>
                      </div>
                    );
                  } else if (status === 'missing' && (q.isLocked || (exp && !q.forceUnlock))) {
                    return (
                      <div key={q._id} className="flex justify-between items-center p-2 bg-red-50 rounded-md text-red-700 border border-red-200">
                        <span className="text-[11px] font-bold">{q.name}</span>
                        <span className="text-[10px] flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Locked</span>
                      </div>
                    );
                  } else if (q._id === activeQuarterId) {
                    return (
                      <div key={q._id} className="flex justify-between items-center p-2 bg-yellow-50 rounded-md text-yellow-800 font-bold border border-yellow-300 shadow-sm">
                        <span className="text-[11px]">{q.name} ← Active</span>
                        <span className="text-[10px]">{new Date(q.endDate).toLocaleDateString()}</span>
                      </div>
                    );
                  } else {
                    return (
                      <div key={q._id} className="flex justify-between items-center p-2 text-gray-500">
                        <span className="text-[11px]">{q.name}</span>
                        <span className="text-[10px]">{new Date(q.endDate).toLocaleDateString()}</span>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}

          {selectedStaff && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-slate-50">
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center text-sm">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0D2B55]">IPRF Breakdown</div>
                  <div className="text-[10px] text-gray-500">Live • updates as you rate</div>
                </div>
              </div>
              <div className="p-4">
                <div className="bg-[#FAF8F4] border border-gray-200 rounded-lg p-3 font-mono text-[11px] text-gray-700 leading-relaxed shadow-inner">
                  <div className="text-gray-400 mb-2">// Σ (Rating × Weight)</div>
                  
                  {CRITERIA.map(c => {
                    const val = scores[c.id];
                    if (val === null) return (
                      <div key={c.id} className="flex justify-between items-center py-0.5 text-gray-400 opacity-60">
                        <span>{c.short}: <span className="font-bold">—</span> × {c.pct} =</span>
                        <span className="font-bold">0.000</span>
                      </div>
                    );

                    const colorClass = val === 0.0 ? 'text-red-500' : val === 0.7 ? 'text-amber-500' : val === 1.0 ? 'text-green-500' : 'text-blue-500';
                    
                    return (
                      <div key={c.id} className="flex justify-between items-center py-0.5">
                        <span>{c.short}: <span className="font-bold">{val}</span> × {c.pct} =</span>
                        <span className={`font-bold ${colorClass}`}>{(val * c.wt).toFixed(3)}</span>
                      </div>
                    );
                  })}
                  
                  <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center font-bold text-[#0D2B55] text-xs">
                    <span>Total: {ratedCount > 0 ? calculatedIPRF.toFixed(3) : '0.000'} →</span>
                    <span>{ratedCount > 0 ? `${scoreTarget} (${scoreBucket.toUpperCase()})` : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function NewAppraisal() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">Loading form...</div>}>
      <NewAppraisalForm />
    </Suspense>
  );
}