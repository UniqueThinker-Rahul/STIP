'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { Loader2 } from 'lucide-react';

export default function EmployeeDeadlines() {
  const [quarters, setQuarters] = useState([]);
  const [activeQuarter, setActiveQuarter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuarters = async () => {
      try {
        setLoading(true);
        const res = await api.get('/quarters').catch(() => ({ data: { data: [] } }));
        const fetchedQuarters = res.data?.data || [];
        
        // Sort quarters chronologically by startDate
        fetchedQuarters.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        setQuarters(fetchedQuarters);

        // Find the active quarter based on today's date
        const now = new Date();
        const active = fetchedQuarters.find(q => {
            const start = new Date(q.startDate); start.setHours(0,0,0,0);
            const end = new Date(q.endDate); end.setHours(23,59,59,999);
            return now >= start && now <= end;
        });
        
        setActiveQuarter(active || (fetchedQuarters.length > 0 ? fetchedQuarters[0] : null));
        
      } catch (err) {
        console.error("Failed to load deadlines", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuarters();
  }, []);

  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  const formatPeriod = (startStr, endStr) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const startMonth = start.toLocaleDateString('en-GB', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-GB', { month: 'short' });
    const year = end.getFullYear();
    return `${startMonth} — ${endMonth} ${year}`;
  };

  const getStatusInfo = (quarter) => {
    const now = new Date();
    const start = new Date(quarter.startDate); start.setHours(0,0,0,0);
    const end = new Date(quarter.endDate); end.setHours(23,59,59,999);

    if (now > end) {
      return { 
        text: '✓ Done', 
        style: 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]',
        rowStyle: 'text-[#0f1923]',
        nameStyle: 'text-[#059669]'
      };
    } else if (now >= start && now <= end) {
      return { 
        text: '⏳ Active', 
        style: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
        rowStyle: 'bg-[#FFFBEB] -mx-[8px] px-[8px] rounded-[8px] border-0 text-[#0f1923]',
        nameStyle: 'text-[#D97706]'
      };
    } else {
      return { 
        text: 'Upcoming', 
        style: 'bg-[#FAF8F4] text-[#6b7280] border border-[#E2DDD4]',
        rowStyle: 'text-[#6b7280]',
        nameStyle: 'text-[#6b7280]'
      };
    }
  };

  let daysRemaining = null;
  if (activeQuarter) {
    const now = new Date();
    const end = new Date(activeQuarter.endDate); end.setHours(23,59,59,999);
    if (end > now) {
        const diffTime = Math.abs(end - now);
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  if (loading) {
    return <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 text-[#0D2B55] animate-spin" /></div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
          {/* 🚨 UPGRADED: Dynamic Year based on active quarter */}
          &#128197; {activeQuarter ? activeQuarter.year : new Date().getFullYear()} Appraisal Deadlines
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
            {quarters.length === 0 ? (
               <div className="text-center py-10 text-[#6b7280] font-medium text-sm border border-dashed border-[#E2DDD4] rounded-lg">
                 No appraisal timelines have been configured for this year yet.
               </div>
            ) : (
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
                  {/* 🚨 UPGRADED: Dynamically map over real database records */}
                  {quarters.map((q, idx) => {
                    const statusInfo = getStatusInfo(q);
                    return (
                      <tr key={q._id} className={statusInfo.rowStyle.includes('bg-') ? statusInfo.rowStyle : ''}>
                        <td className={`py-[12px] font-[800] pl-[8px] rounded-l-[8px] ${statusInfo.nameStyle}`}>{q.name}</td>
                        <td className={`py-[12px] ${!statusInfo.rowStyle.includes('bg-') ? statusInfo.rowStyle : ''}`}>{formatPeriod(q.startDate, q.endDate)}</td>
                        <td className={`py-[12px] font-[800] ${statusInfo.nameStyle}`}>{formatDate(q.endDate)}</td>
                        <td className="py-[12px] pr-[8px] rounded-r-[8px]">
                          <span className={`px-[8px] py-[3px] rounded-[4px] text-[10px] font-[800] ${statusInfo.style}`}>
                            {statusInfo.text}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            
            {activeQuarter && daysRemaining !== null && (
              <div className="bg-[#0D2B55] rounded-[9px] p-[12px_16px] flex justify-between items-center flex-wrap gap-[10px] shadow-inner">
                {/* 🚨 UPGRADED: Dynamic Countdown */}
                <span className="text-[12px] text-white/60 font-[600]">{activeQuarter.name} closes in</span>
                <span className="text-[16px] font-[800] text-[#e8c96a]">{daysRemaining} days remaining</span>
              </div>
            )}
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