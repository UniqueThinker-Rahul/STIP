'use client';

import React from 'react';

export default function HowItWorks() {
  return (
    <div className="max-w-[1120px] mx-auto p-[24px_22px_70px] font-sans">
      
      {/* Header */}
      <div className="mb-[16px]">
        <h2 className="text-[22px] text-[#0D2B55] m-0 mb-[3px] tracking-[-0.01em] font-bold">
          How it works
        </h2>
        <div className="text-[13px] text-[#667085]">
          The Executive Member Panel in plain language.
        </div>
      </div>
      
      {/* Example Box */}
      <div className="bg-[#EFF6FF] border border-[#BBD3F0] rounded-[11px] p-[11px_15px] text-[12.5px] text-[#33475b] mb-[16px]">
        <b className="text-[#0D2B55]">Example from your organisation:</b> Lesivou Bulabalavu (ICT Manager) reports to <b className="text-[#0D2B55]">Harbert Tom</b>, an executive manager. So Harbert sees Lesivou&rsquo;s own appraisal <b className="text-[#0D2B55]">and</b> the appraisals of all five ICT staff under Lesivou &mdash; his complete portfolio.
      </div>

      {/* Steps List */}
      <div className="bg-white border border-[#E4E0D8] rounded-[13px] overflow-hidden">
        <div className="p-[14px_17px]">
          
          {/* Step 1 */}
          <div className="flex gap-[12px] items-start p-[12px_0] border-b border-[#E4E0D8]">
            <div className="flex-shrink-0 w-[28px] h-[28px] rounded-full bg-[#0D2B55] text-white flex items-center justify-center font-extrabold text-[13px]">
              1
            </div>
            <div className="text-[13.5px] leading-[1.6] text-[#1f2733]">
              <b className="text-[#0D2B55]">Every staff member has a line manager.</b> The line manager completes their quarterly STIP appraisal, exactly as in the Line Manager panel.
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="flex gap-[12px] items-start p-[12px_0] border-b border-[#E4E0D8]">
            <div className="flex-shrink-0 w-[28px] h-[28px] rounded-full bg-[#0D2B55] text-white flex items-center justify-center font-extrabold text-[13px]">
              2
            </div>
            <div className="text-[13.5px] leading-[1.6] text-[#1f2733]">
              <b className="text-[#0D2B55]">Line managers report to an executive manager.</b> Each executive&rsquo;s portfolio is defined by the official HR listing &mdash; the same one used to build this panel.
            </div>
          </div>
          
          {/* Step 3 */}
          <div className="flex gap-[12px] items-start p-[12px_0] border-b border-[#E4E0D8]">
            <div className="flex-shrink-0 w-[28px] h-[28px] rounded-full bg-[#0D2B55] text-white flex items-center justify-center font-extrabold text-[13px]">
              3
            </div>
            <div className="text-[13.5px] leading-[1.6] text-[#1f2733]">
              <b className="text-[#0D2B55]">The executive sees everything under the portfolio.</b> All appraisals &mdash; for line managers and for their teams, at every level &mdash; appear in the Portfolio Appraisals view, with filters by quarter, line manager and status.
            </div>
          </div>
          
          {/* Step 4 */}
          <div className="flex gap-[12px] items-start p-[12px_0]">
            <div className="flex-shrink-0 w-[28px] h-[28px] rounded-full bg-[#0D2B55] text-white flex items-center justify-center font-extrabold text-[13px]">
              4
            </div>
            <div className="text-[13.5px] leading-[1.6] text-[#1f2733]">
              <b className="text-[#0D2B55]">One shared database.</b> The panel reads the same staff records as the other STIP panels, and disciplinary flags appear live from the shared Disciplinary data.
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}