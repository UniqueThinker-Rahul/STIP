'use client';

import React, { useState } from 'react';
import { 
  Settings, 
  MessageSquare, 
  Hand, 
  Search, 
  UserCheck, 
  Reply, 
  FastForward, 
  Scale, 
  User,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function HowItWorks() {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { id: 1, label: 'Setup', icon: Settings },
    { id: 2, label: 'Counsel', icon: MessageSquare },
    { id: 3, label: 'Raise case', icon: Hand },
    { id: 4, label: 'Investigate', icon: Search },
    { id: 5, label: 'HR review', icon: UserCheck },
    { id: 6, label: 'Respond', icon: Reply },
    { id: 7, label: 'Forward', icon: FastForward },
    { id: 8, label: 'Decision', icon: Scale },
    { id: 9, label: 'CEO', icon: User },
  ];

  const handleNext = () => {
    if (currentStep < 9) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const stepContent = {
    1: {
      role: 'ICT Admin',
      title: 'Set up the disciplinary module',
      description: 'Before anyone can use the system, the ICT Admin sets it up — loads the Table of Charges, decides who is allowed to raise cases (supervisors) and who reviews them (HR and the CEO), and switches on audit logging to record every action. This is a one-time setup.',
      mockup: (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm mt-6">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wider">
            ICT ADMIN - SYSTEM SETUP
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Table of Charges</p>
                <p className="text-xs text-gray-500">Loaded 124 offences, 4 penalty ranges.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Roles & permissions</p>
                <p className="text-xs text-gray-500">Assigned 48 line managers, 3 HR reviewers, 1 CEO approver.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Working days threshold</p>
                <p className="text-xs text-gray-500">Set SLA for responses - 3 days to respond.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Audit logging</p>
                <p className="text-xs text-gray-500">Active. System logging all changes.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    2: {
      role: 'Line Manager',
      title: 'Counsel the employee first',
      description: "When a problem first happens, the supervisor (line manager) does NOT jump to punishment. The first step is a private chat to understand and fix the issue. The supervisor notes this in their own records. The supervisor records the counselling in the system (issue, discussion and outcome) so it is kept on the employee's file, not just in personal notes. If the same employee reoffends later, that earlier counselling is automatically flagged when a new case is raised — and the supervisor can escalate the counselling straight into a formal case, with the notes carried forward. A formal case only follows if counselling does not resolve the problem.",
      mockup: (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm mt-6">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wider">
            LINE MANAGER - COUNSELLING NOTE
          </div>
          <div className="p-4 sm:p-6">
            <p className="text-sm text-gray-700 leading-relaxed mb-6">
              Spoke privately with the employee about repeated late arrivals. Agreed on a plan to improve punctuality. No formal action at this stage.
            </p>
            <p className="text-xs text-gray-500 flex items-start sm:items-center gap-2">
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full border border-gray-400 text-gray-500 text-[10px] shrink-0 mt-0.5 sm:mt-0">!</span>
              <span>Discipline is a process to correct behaviour, not just punish. Start with counselling first.</span>
            </p>
          </div>
        </div>
      )
    },
    3: {
      role: 'Line Manager',
      title: 'Raise a disciplinary case',
      description: "If counselling fails, the supervisor opens the system and selects the offence. The system automatically checks the employee's history and shows whether this is the 1st, 2nd or 3rd time — and the matching penalty range. The supervisor writes up the facts, recommends an action within that range, and submits it to HR. For a serious offence, the supervisor ticks 'Serious offence — case will bypass standard process' and HR is alerted. A single incident can involve more than one offence, and each is checked for its own occurrence and penalty range and gets its own recommended action. The line manager uploads any supporting document or evidence (reports, photos, emails) when raising the case, which HR sees during the investigation. When the line manager opens a staff file, the system flags anyone who already has an open case (and lists their open and past cases with a 'View History' link) to avoid duplicates, and — for a non-serious case left as counselling — the record gently reminds the supervisor to counsel them.",
      mockup: (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm mt-6">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wider">
            LINE MANAGER - RAISE CASE FORM
          </div>
          <div className="p-4 sm:p-6 space-y-5">
            <div className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center">
              <div className="sm:col-span-3 text-xs sm:text-sm text-gray-500 mb-1 sm:mb-0">Employee</div>
              <div className="sm:col-span-9 text-sm text-gray-900">Tony Blue — Help Desk Officer</div>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center">
              <div className="sm:col-span-3 text-xs sm:text-sm text-gray-500 mb-1 sm:mb-0">Offence</div>
              <div className="sm:col-span-9 text-sm text-gray-900">#1 Unexcused tardiness</div>
            </div>
            <div className="bg-orange-50/50 border border-orange-100 rounded p-3 my-4">
              <p className="text-xs text-orange-800 mb-2 sm:mb-1">System check automatically:</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="text-sm font-semibold text-orange-900">3rd occurrence → penalty range :</p>
                <div className="bg-white border border-gray-200 rounded px-3 py-1 text-sm text-gray-700 w-full sm:w-48 shadow-sm text-center sm:text-left">Written warning</div>
              </div>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center">
              <div className="sm:col-span-4 text-xs sm:text-sm text-gray-500 mb-2 sm:mb-0">Recommended action</div>
              <div className="sm:col-span-8 flex sm:justify-end">
                 <div className="bg-white border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 w-full sm:w-48 flex justify-between items-center shadow-sm cursor-pointer">
                   Written warning
                   <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                 </div>
              </div>
            </div>
            <div className="mt-4 inline-flex items-center justify-center bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded w-fit">
              Submitted to HR
            </div>
          </div>
        </div>
      )
    },
    4: {
      role: 'HR',
      title: 'HR investigates the case',
      description: "Before issuing any notice, HR investigates. HR establishes the facts of the incident, discusses it with the line manager and the employee, and may question other staff who were on site as witnesses. Witness names and statements are recorded, and any supporting documents or images (reports, photos, CCTV clips) are uploaded as evidence. Only once this investigation is saved does HR issue the official notice. For a serious case, HR can also decide to call a 'Jury of Peers', an impartial panel of fellow employees who review the case and give an independent finding (substantiated / partly / not substantiated). HR records the recommendation. The jury's view is advisory and travels with the case to HR, the SMT and the CEO.",
      mockup: (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm mt-6">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wider">
            HR MANAGER - INVESTIGATION
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">FINDINGS</p>
              <p className="text-sm text-gray-800">CCTV confirms they left unescorted at 14:00. Discussed with the line manager and the employee.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">WITNESS</p>
              <p className="text-sm text-gray-800">Sikeli Soqalu &nbsp; Wayne Naisorisori</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">FILES</p>
              <div className="text-sm text-gray-800 flex flex-wrap items-center gap-3 sm:gap-4">
                <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                  <span className="w-3 h-3 bg-red-100 rounded-sm inline-block shrink-0"></span> 
                  <span className="truncate">incident_report.pdf</span>
                </span>
                <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                  <span className="w-3 h-3 bg-blue-100 rounded-sm inline-block shrink-0"></span> 
                  <span className="truncate">cctv_01.mp4</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    5: {
      role: 'HR',
      title: 'HR reviews and issues official notice',
      description: "HR reviews the official notice of the charge and the proposed action. In line with the Table of Charges, HR can generate a formal disciplinary advice letter (auto filled from the case) to print or save as PDF and hand to the employee. The notice goes to both the employee and the line manager, and starts the employee's 3-working-day response window.",
      mockup: (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm mt-6">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wider">
            HR MANAGER - OFFICIAL NOTICE
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <p className="text-sm text-gray-800 leading-relaxed">
              Official Notice of Charge issued to the employee. Charge: Offence #1 (unexcused tardiness), 3rd occurrence. Proposed action: Written warning (B).
            </p>
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3 rounded flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-semibold">Awaiting employee response</span>
              <span className="hidden sm:inline-block text-gray-400">•</span>
              <span className="text-gray-600 text-xs sm:text-sm">3 working days to respond</span>
            </div>
          </div>
        </div>
      )
    },
    6: {
      role: 'Employee',
      title: 'Employee responds — HR records it',
      description: "The employee receives the notice and has 3 working days to give their side of the story. They submit a written response in the system. If they have a genuine reason they cannot respond in time, an extension can be granted.",
      mockup: (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm mt-6">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wider">
            STAFF - RESPONSE BOX
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm text-gray-700 leading-relaxed">
              I was late on those days due to a family medical emergency. I have since arranged earlier transport and it will not happen again. Supporting note from the clinic is attached.
            </div>
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3 rounded flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-semibold">Response submitted</span>
              <span className="hidden sm:inline-block text-gray-400">•</span>
              <span className="text-gray-600 text-xs sm:text-sm">0 working days left</span>
            </div>
          </div>
        </div>
      )
    },
    7: {
      role: 'HR',
      title: 'HR may forward to the CEO or SMT',
      description: (
        <>
          Once the case has been investigated the employee has responded, HR forwards every case for the final decision - either directly to the CEO (with HR's recommendation) or to the SMT (who recommends to the CEO). HR does not close cases itself. <br/><br/>
          <strong>Case 1 — HR → CEO:</strong> HR forwards the case directly to the CEO, and the CEO takes the final decision and closes the case.<br/>
          <strong>Case 2 — HR → SMT → CEO:</strong> For senior staff, or if HR or the Senior Management Team, recommends dismissal (or a demotion / fine / withholding), the system automatically flags the case to go to the SMT, who takes the recommendation forward to the CEO. The SMT can have more than one member, so when forwarding to SMT, HR selects which SMT member to send the case (from a dropdown) — that member is shown an alert and manages it through to the CEO.<br/><br/>
          Both the SMT and the CEO can open "View full case record" on a case — showing prior counselling, the line manager's statement, the initial investigation, witness statements, uploaded evidence, any Jury of Peers finding, all recommendations and the audit trail — so they decide with the complete picture. The CEO also has the Table of Charges at their fingertips while reviewing cases.<br/><br/>
          HR, SMT Head record a recommended action (within the offence range), and the reason for it — this is a mandatory field, and the recommendation travels with the case so the SMT and the CEO can see what HR advised. Where a case has several offences, HR gives one overall recommendation to the CEO covering the case as a whole. Where the case goes to the SMT, the SMT Head records a recommended action and rationale before it moves on — like HR's, this recommendation is mandatory and is shown to the CEO alongside HR's. In both cases the CEO is the final decision maker.
        </>
      ),
      mockup: (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm mt-6">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wider">
            HR → SMT → CEO
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="bg-red-50/50 border border-red-100 p-4 rounded-md">
              <p className="text-xs font-semibold text-red-800 mb-2">SMT RECOMMENDATION</p>
              <p className="text-sm font-semibold text-gray-900">SMT: 10 day suspension</p>
              <p className="text-sm text-gray-700 mt-1">Given the severity, the SMT recommends this action to the CEO.</p>
            </div>
            <div className="text-sm p-3 rounded flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 border border-gray-100 bg-gray-50 text-gray-800">
              <span className="font-semibold text-blue-700">With CEO</span>
              <span className="hidden sm:inline-block text-gray-300">•</span>
              <span className="text-gray-500 text-xs sm:text-sm">CEO makes the final decision.</span>
            </div>
          </div>
        </div>
      )
    },
    8: {
      role: 'HR',
      title: 'HR records the decision',
      description: "The CEO makes the final decision on every case. HR forwards the case directly, or via the SMT (who add their recommendations). The CEO chooses the final action for each offence, within the offence range. For serious conduct the CEO may proceed directly to termination. Once decided, HR can generate the Personnel Action Form (PAF) for payroll and, on a dismissal, the line manager removes company property.",
      mockup: (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm mt-6">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wider">
            HR MANAGER - DECISION
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-4">
              <div className="sm:col-span-3 text-xs sm:text-sm text-gray-500 mb-1 sm:mb-0">Charge</div>
              <div className="sm:col-span-9 text-sm text-gray-900">#1 Unexcused tardiness (3rd)</div>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-4">
              <div className="sm:col-span-3 text-xs sm:text-sm text-gray-500 mb-1 sm:mb-0">Decision</div>
              <div className="sm:col-span-9 text-sm font-semibold text-gray-900">Written warning</div>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-4">
              <div className="sm:col-span-3 text-xs sm:text-sm text-gray-500 mb-1 sm:mb-0">Recorded in</div>
              <div className="sm:col-span-9 text-sm text-gray-900">Employee personnel file</div>
            </div>
            <div className="mt-4 sm:mt-6 bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded font-semibold inline-block">
              Case closed - upheld
            </div>
          </div>
        </div>
      )
    },
    9: {
      role: 'CEO',
      title: 'CEO — final decision & weekly oversight',
      description: "The CEO is the final decision-maker on cases forwarded to them directly by HR, or via the SMT. The CEO also receives a weekly report of all cases to confirm conduct is being managed fairly and consistently across every department, and the outcome falls within the allowed range for that offence. The CEO is the only role that can re-establish a previously terminated employee back into the payroll system — for example on new evidence — by reversing a decision and effective date.",
      mockup: (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm mt-6">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wider">
            CEO - FINAL DECISION
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-4">
                <div className="sm:col-span-3 text-xs sm:text-sm text-gray-500 mb-1 sm:mb-0">Route</div>
                <div className="sm:col-span-9 text-sm text-gray-900">HR → SMT → CEO</div>
              </div>
              <div className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center">
                <div className="sm:col-span-3 text-xs sm:text-sm text-gray-500 mb-1 sm:mb-0">Final decision</div>
                <div className="sm:col-span-9 flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-sm font-semibold text-gray-900">Upheld</span>
                  <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded font-medium">
                    (Warning stands)
                  </span>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-6">
              <p className="text-xs font-semibold text-gray-500 tracking-wider mb-3">WEEKLY REPORT TO CEO</p>
              <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
                <span className="text-gray-900"><span className="font-bold">6</span> active</span>
                <span className="text-gray-900"><span className="font-bold">1</span> awaiting response</span>
                <span className="text-gray-900"><span className="font-bold">3</span> closed</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  };

  const activeContent = stepContent[currentStep];

  return (
    <div className="min-h-screen bg-[#FAF9F6] p-4 sm:p-6 md:p-12 font-sans flex justify-center items-start">
      <div className="w-full max-w-5xl bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[calc(100vh-2rem)] md:min-h-[85vh] md:h-[85vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-8 border-b border-gray-100 shrink-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0D1B2A] mb-1">How it works</h1>
          <p className="text-gray-500 text-sm">The disciplinary process, step by step.</p>
        </div>

        {/* Stepper Navigation */}
        <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-gray-100 bg-gray-50/50 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex items-center justify-between relative min-w-[700px]">
            {/* Connecting Background Line */}
            <div className="absolute left-[3%] right-[3%] top-5 h-[2px] bg-gray-200 -z-0"></div>
            
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isPassed = currentStep > step.id;
              
              return (
                <div 
                  key={step.id} 
                  className="flex flex-col items-center relative z-10 cursor-pointer group"
                  onClick={() => setCurrentStep(step.id)}
                >
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 shadow-sm
                      ${isActive ? 'bg-[#0D2B55] text-white ring-4 ring-blue-50' 
                        : isPassed ? 'bg-white border-2 border-gray-300 text-gray-500 group-hover:border-gray-400' 
                        : 'bg-white border-2 border-gray-200 text-gray-400 group-hover:border-gray-300'}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[11px] mt-2 font-medium tracking-wide
                    ${isActive ? 'text-[#0D2B55] font-bold' : 'text-gray-500'}
                  `}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="p-5 sm:p-8 flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto pb-4">
            
            {/* Title & Role Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
              <span className="bg-[#E5F0FF] text-[#0D2B55] text-xs font-bold px-3 py-1 rounded shadow-sm uppercase tracking-wide w-fit">
                {activeContent.role}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">{activeContent.title}</h2>
            </div>
            
            {/* Description Text */}
            <div className="text-sm sm:text-[15px] text-gray-600 leading-relaxed mb-6">
              {activeContent.description}
            </div>

            {/* Simulated UI Mockup */}
            {activeContent.mockup}
            
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-t border-gray-200 bg-white flex items-center justify-between shrink-0">
          <button 
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors
              ${currentStep === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900'}
            `}
          >
            <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
          </button>
          
          <span className="text-xs sm:text-sm font-medium text-gray-500">
            {currentStep} of 9
          </span>
          
          <button 
            onClick={handleNext}
            disabled={currentStep === 9}
            className={`flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all shadow-sm
              ${currentStep === 9 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-[#0D2B55] text-white hover:bg-[#1a3d6e]'}
            `}
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}