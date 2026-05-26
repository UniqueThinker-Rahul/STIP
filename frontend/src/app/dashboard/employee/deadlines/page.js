'use client';

export default function EmployeeDeadlines() {
  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
          &#128197; 2026 Appraisal Deadlines
        </div>
        <div className="text-[13px] text-[#6b7280]">
          All quarters &mdash; submit before deadline date
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-[20px]">
        
        {/* Left Column: Deadlines Table */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FFF7ED] flex items-center justify-center text-[14px]">&#128197;</div>
            <div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">Quarterly Deadlines</div>
              <div className="text-[11px] text-[#6b7280]">Line Manager must submit before each date</div>
            </div>
          </div>
          
          <div className="p-[20px]">
            <table className="w-full text-left border-collapse text-[13px] mb-[20px]">
              <thead className="border-b border-[#E2DDD4] text-[#6b7280] font-[800] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="pb-[10px]">Quarter</th>
                  <th className="pb-[10px]">Period</th>
                  <th className="pb-[10px]">Deadline</th>
                  <th className="pb-[10px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                <tr>
                  <td className="py-[12px] font-[800] text-[#059669]">Q1</td>
                  <td className="py-[12px] text-[#0f1923]">Jan &mdash; Mar 2026</td>
                  <td className="py-[12px] font-[800] text-[#059669]">31 Mar 2026</td>
                  <td className="py-[12px]"><span className="bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] px-[8px] py-[3px] rounded-[4px] text-[10px] font-[800]">&#10003; Done</span></td>
                </tr>
                <tr>
                  <td className="py-[12px] font-[800] text-[#059669]">Q2</td>
                  <td className="py-[12px] text-[#0f1923]">Apr &mdash; Jun 2026</td>
                  <td className="py-[12px] font-[800] text-[#059669]">30 Jun 2026</td>
                  <td className="py-[12px]"><span className="bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] px-[8px] py-[3px] rounded-[4px] text-[10px] font-[800]">&#10003; Done</span></td>
                </tr>
                <tr className="bg-[#FFFBEB] -mx-[8px] px-[8px] rounded-[8px] border-0">
                  <td className="py-[12px] font-[800] text-[#D97706] pl-[8px] rounded-l-[8px]">Q3</td>
                  <td className="py-[12px] text-[#0f1923]">Jul &mdash; Sep 2026</td>
                  <td className="py-[12px] font-[800] text-[#D97706]">30 Sep 2026</td>
                  <td className="py-[12px] pr-[8px] rounded-r-[8px]"><span className="bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-[8px] py-[3px] rounded-[4px] text-[10px] font-[800]">&#9200; Active</span></td>
                </tr>
                <tr>
                  <td className="py-[12px] font-[800] text-[#6b7280]">Q4</td>
                  <td className="py-[12px] text-[#6b7280]">Oct &mdash; Dec 2026</td>
                  <td className="py-[12px] text-[#6b7280]">15 Dec 2026</td>
                  <td className="py-[12px]"><span className="bg-[#FAF8F4] text-[#6b7280] border border-[#E2DDD4] px-[8px] py-[3px] rounded-[4px] text-[10px] font-[800]">Upcoming</span></td>
                </tr>
              </tbody>
            </table>
            
            <div className="bg-[#0D2B55] rounded-[9px] p-[12px_16px] flex justify-between items-center flex-wrap gap-[10px] shadow-inner">
              <span className="text-[12px] text-white/60 font-[600]">Q3 closes in</span>
              <span className="text-[16px] font-[800] text-[#e8c96a]">136 days remaining</span>
            </div>
          </div>
        </div>

        {/* Right Column: Process Guide */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[14px]">&#127937;</div>
            <div className="text-[14px] font-[800] text-[#0D2B55]">What Happens After Submission</div>
          </div>
          
          <div className="p-[20px] flex flex-col gap-[12px]">
            <div className="flex gap-[12px] items-start p-[12px] bg-[#FAF8F4] rounded-[8px] border border-[#E2DDD4]">
              <span className="text-[20px] leading-none shrink-0">1&#65039;&#8419;</span>
              <div>
                <div className="text-[13px] font-[800] text-[#0D2B55] mb-[3px]">Manager submits appraisal</div>
                <div className="text-[12px] text-[#6b7280] leading-[1.5]">Your Line Manager fills in all 6 criteria and submits before the deadline</div>
              </div>
            </div>
            
            <div className="flex gap-[12px] items-start p-[12px] bg-[#FAF8F4] rounded-[8px] border border-[#E2DDD4]">
              <span className="text-[20px] leading-none shrink-0">2&#65039;&#8419;</span>
              <div>
                <div className="text-[13px] font-[800] text-[#0D2B55] mb-[3px]">HR reviews</div>
                <div className="text-[12px] text-[#6b7280] leading-[1.5]">HR Manager reviews and approves, then submits to CEO</div>
              </div>
            </div>
            
            <div className="flex gap-[12px] items-start p-[12px] bg-[#FAF8F4] rounded-[8px] border border-[#E2DDD4]">
              <span className="text-[20px] leading-none shrink-0">3&#65039;&#8419;</span>
              <div>
                <div className="text-[13px] font-[800] text-[#0D2B55] mb-[3px]">CEO approves</div>
                <div className="text-[12px] text-[#6b7280] leading-[1.5]">CEO gives final approval. Your result is confirmed.</div>
              </div>
            </div>
            
            <div className="flex gap-[12px] items-start p-[12px] bg-[#D1FAE5] rounded-[8px] border-[1.5px] border-[#A7F3D0] shadow-sm">
              <span className="text-[20px] leading-none shrink-0">4&#65039;&#8419;</span>
              <div>
                <div className="text-[13px] font-[800] text-[#065F46] mb-[3px]">You acknowledge</div>
                <div className="text-[12px] text-[#065F46]/80 font-[600] leading-[1.5]">You acknowledge your result in this portal, completing the process</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}