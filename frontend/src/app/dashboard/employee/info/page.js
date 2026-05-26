'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../../../../lib/api';

export default function STIPInfo() {
  const router = useRouter();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openItems, setOpenItems] = useState([]);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const userCookie = Cookies.get('stip_user');
        if (!userCookie) {
          router.push('/login');
          return;
        }
        const sessionUser = JSON.parse(userCookie);

        const usersRes = await api.get('/users').catch(() => ({ data: { data: [] } }));
        const allUsers = usersRes.data?.data || [];
        
        const fullUser = allUsers.find(u => u._id === sessionUser.id || u.employeeId === sessionUser.employeeId) || sessionUser;
        setUser(fullUser);
      } catch (error) {
        console.error('Failed to load profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [router]);

  const toggleFAQ = (index) => {
    if (openItems.includes(index)) {
      setOpenItems(openItems.filter(i => i !== index));
    } else {
      setOpenItems([...openItems, index]);
    }
  };

  const FAQS = [
    {
      q: 'What is Pro-Rata and how does it affect my award?',
      a: 'Pro-Rata accounts for the portion of the year you worked. If you joined on 1 July 2026, you worked approximately half the year, so your Pro-Rata is 0.5 (6/12). Your STIP award is multiplied by this fraction. Employees who worked the full year (or who joined before 1 January 2026) have a Pro-Rata of 1.000.'
    },
    {
      q: 'What are the 4 IPRF rating levels?',
      a: '<strong>0.0 — Less than Satisfactory (LS):</strong> Performance did not meet minimum expectations. Award = 0%.<br/><br/><strong>0.7 — Needs Improvement (NI):</strong> Performance was below the required standard. Award = 70% of CP%.<br/><br/><strong>1.0 — Fully Effective (E):</strong> Performance fully met role requirements. Award = 100% of CP%. This is the expected standard.<br/><br/><strong>1.3 — Exceeds Performance (EP):</strong> Performance was noticeably above expectations with evidence. Award = 130% of CP%. Capped at 5% of all staff (max 9 employees).'
    },
    {
      q: 'What are the 6 performance criteria?',
      a: '<strong>1. Delivered Expected Results (30%)</strong> — Did you achieve the expected results of your position?<br/><strong>2. Demonstrated Initiative (20%)</strong> — Did you take responsibility, plan tasks, and solve problems proactively?<br/><strong>3. Demonstrated Safe Working (20%)</strong> — Did you follow safety rules and wear PPE?<br/><strong>4. Job Competence (10%)</strong> — Do you have and apply the skills required for your role?<br/><strong>5. Dependability (10%)</strong> — Are you reliable, punctual, and do you deliver quality work on time?<br/><strong>6. Adaptability (10%)</strong> — Do you accept new tasks, change, and extra demands?'
    },
    {
      q: 'When will I receive my STIP payment?',
      a: 'STIP payments are processed by payroll after all quarterly appraisals are approved and acknowledged. The annual STIP is paid in full once the full-year process is complete (typically Q4 + 30 days processing). The exact date is communicated by HR and Payroll.'
    },
    {
      q: 'What if I disagree with my appraisal rating?',
      a: 'You have the right to raise a formal grievance within <strong>14 calendar days</strong> of acknowledging your result. Contact HR Manager Tracy Helgenberger (Ext. 201) in writing. The grievance will be reviewed by HR and the relevant Line Manager. Acknowledge your result even if you intend to raise a grievance — this does not waive your right to dispute.'
    },
    {
      q: 'Is the STIP award subject to tax?',
      a: 'Yes. All STIP award amounts shown in this portal are <strong>gross (before tax)</strong>. Income tax will be deducted by payroll in accordance with FSM income tax regulations. The net amount deposited will be less than the gross award shown.'
    },
    {
      q: 'What happens if my appraisal is "Not Approved" by the CEO?',
      a: 'If the CEO does not approve your appraisal, it is returned to HR with CEO comments. HR will notify your Line Manager, who must review and resubmit. You will be informed once the revised appraisal is resubmitted and approved. Your STIP award will reflect the approved rating.'
    }
  ];

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-[600] animate-pulse">Loading Guide...</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
          &#128218; STIP Guide &amp; FAQ
        </div>
        <div className="text-[13px] text-[#6b7280]">
          Everything you need to know about the Short-Term Incentive Program
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-[20px]">
        
        {/* Left Column */}
        <div className="flex flex-col gap-[16px]">
          
          {/* How STIP Works */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#DBEAFE] flex items-center justify-center text-[14px]">&#128200;</div>
              <div>
                <div className="text-[14px] font-[800] text-[#0D2B55]">How STIP Works</div>
                <div className="text-[11px] text-[#6b7280]">The complete process explained</div>
              </div>
            </div>
            <div className="p-[20px] flex flex-col gap-[14px]">
              
              {/* Step 1 */}
              <div className="flex gap-[12px]">
                <div className="w-[28px] h-[28px] rounded-full bg-[#0D2B55] text-[#e8c96a] flex items-center justify-center text-[12px] font-[800] shrink-0">1</div>
                <div>
                  <div className="text-[13px] font-[800] text-[#0D2B55] mb-[3px]">Board sets Company Performance (CP%)</div>
                  <div className="text-[12px] text-[#6b7280] leading-[1.5]">The Board approves KPA targets. At year end, actual performance is measured against targets. The result (BSC score) determines the CP% &mdash; the maximum possible award for fully effective staff.</div>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex gap-[12px]">
                <div className="w-[28px] h-[28px] rounded-full bg-[#0D2B55] text-[#e8c96a] flex items-center justify-center text-[12px] font-[800] shrink-0">2</div>
                <div>
                  <div className="text-[13px] font-[800] text-[#0D2B55] mb-[3px]">Your Manager rates your performance (IPRF)</div>
                  <div className="text-[12px] text-[#6b7280] leading-[1.5]">Your Line Manager assesses you on 6 weighted criteria each quarter. The weighted average gives your IPRF Factor (0.0, 0.7, 1.0, or 1.3).</div>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="flex gap-[12px]">
                <div className="w-[28px] h-[28px] rounded-full bg-[#0D2B55] text-[#e8c96a] flex items-center justify-center text-[12px] font-[800] shrink-0">3</div>
                <div>
                  <div className="text-[13px] font-[800] text-[#0D2B55] mb-[3px]">HR reviews and submits to CEO</div>
                  <div className="text-[12px] text-[#6b7280] leading-[1.5]">HR Manager reviews all appraisals, checks for accuracy and EP cap compliance, then submits to CEO for final approval.</div>
                </div>
              </div>
              
              {/* Step 4 */}
              <div className="flex gap-[12px]">
                <div className="w-[28px] h-[28px] rounded-full bg-[#0D2B55] text-[#e8c96a] flex items-center justify-center text-[12px] font-[800] shrink-0">4</div>
                <div>
                  <div className="text-[13px] font-[800] text-[#0D2B55] mb-[3px]">CEO approves your appraisal</div>
                  <div className="text-[12px] text-[#6b7280] leading-[1.5]">The CEO reviews and approves or returns for revision. Once approved, your result is final.</div>
                </div>
              </div>
              
              {/* Step 5 */}
              <div className="flex gap-[12px]">
                <div className="w-[28px] h-[28px] rounded-full bg-[#0D2B55] text-[#e8c96a] flex items-center justify-center text-[12px] font-[800] shrink-0">5</div>
                <div>
                  <div className="text-[13px] font-[800] text-[#0D2B55] mb-[3px]">You acknowledge and receive payment</div>
                  <div className="text-[12px] text-[#6b7280] leading-[1.5]">You formally acknowledge your result in this portal. Payment is processed by payroll at the end of the performance year.</div>
                </div>
              </div>

            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FEF3C7] flex items-center justify-center text-[14px]">&#10067;</div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">Frequently Asked Questions</div>
            </div>
            <div>
              {FAQS.map((faq, idx) => {
                const isOpen = openItems.includes(idx);
                return (
                  <div key={idx} className="border-b border-[#E2DDD4] last:border-b-0 cursor-pointer transition-colors" onClick={() => toggleFAQ(idx)}>
                    <div className={`p-[16px_20px] flex justify-between items-center text-[14px] font-[700] select-none ${isOpen ? 'text-[#0D2B55]' : 'text-[#0f1923] hover:text-[#0D2B55] hover:bg-[#FAF8F4]'}`}>
                      {faq.q}
                      <span className={`text-[10px] text-[#6b7280] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>&#9660;</span>
                    </div>
                    {isOpen && (
                      <div 
                        className="p-[0_20px_20px] text-[13px] text-[#6b7280] leading-[1.6]" 
                        dangerouslySetInnerHTML={{__html: faq.a}} 
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-[16px]">
          
          {/* STIP Formula */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#0D2B55] flex items-center justify-center text-[14px]">&#128200;</div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">STIP Formula</div>
            </div>
            <div className="p-[20px] flex flex-col">
              <div className="bg-[#0D2B55] rounded-[9px] p-[14px] font-mono text-[12px] text-[#e8c96a] leading-[1.9] mb-[12px] shadow-inner">
                STIP Award % =<br/>
                &nbsp;&nbsp;CP% &times; IPRF &times; Pro-Rata<br/>
                <span className="text-white/35">──────────────────</span><br/>
                CP% = BSC &times; 15%<br/>
                IPRF = &Sigma;(Rating &times; Weight)
              </div>
              <div className="text-[12px] text-[#6b7280] leading-[1.6]">
                CY2026 values:<br/>
                &bull; BSC Score: <strong className="text-[#0D2B55] font-[800]">86.75 / 100</strong><br/>
                &bull; Final CP%: <strong className="text-[#0D2B55] font-[800]">13.01%</strong><br/>
                &bull; Max CP Cap: <strong className="text-[#0D2B55] font-[800]">15%</strong><br/>
                &bull; EP cap: <strong className="text-[#0D2B55] font-[800]">9 employees (5%)</strong>
              </div>
            </div>
          </div>
          
          {/* IPRF Reference */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#DBEAFE] flex items-center justify-center text-[14px]">&#127919;</div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">IPRF Reference</div>
            </div>
            <div className="p-[20px] flex flex-col gap-[7px]">
              <div className="bg-[#FEE2E2] rounded-[8px] p-[10px_12px] flex justify-between items-center border border-transparent">
                <div>
                  <div className="text-[12px] font-[800] text-[#991B1B]">0.0 &mdash; LS</div>
                  <div className="text-[10px] text-[#991B1B]/80 font-[600]">Less than Satisfactory</div>
                </div>
                <div className="text-[18px] font-[800] text-[#991B1B]">0%</div>
              </div>
              <div className="bg-[#FEF3C7] rounded-[8px] p-[10px_12px] flex justify-between items-center border border-transparent">
                <div>
                  <div className="text-[12px] font-[800] text-[#92400E]">0.7 &mdash; NI</div>
                  <div className="text-[10px] text-[#92400E]/80 font-[600]">Needs Improvement</div>
                </div>
                <div className="text-[18px] font-[800] text-[#92400E]">70%</div>
              </div>
              <div className="bg-[#D1FAE5] rounded-[8px] p-[10px_12px] flex justify-between items-center border-[1.5px] border-[#A7F3D0] shadow-sm">
                <div>
                  <div className="text-[12px] font-[800] text-[#065F46]">1.0 &mdash; E</div>
                  <div className="text-[10px] text-[#065F46]/80 font-[600]">Fully Effective (standard)</div>
                </div>
                <div className="text-[18px] font-[800] text-[#065F46]">100%</div>
              </div>
              <div className="bg-[#DBEAFE] rounded-[8px] p-[10px_12px] flex justify-between items-center border border-transparent">
                <div>
                  <div className="text-[12px] font-[800] text-[#1E40AF]">1.3 &mdash; EP</div>
                  <div className="text-[10px] text-[#1E40AF]/80 font-[600]">Exceeds Performance</div>
                </div>
                <div className="text-[18px] font-[800] text-[#1E40AF]">130%</div>
              </div>
            </div>
          </div>

          {/* Need Help? */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#D1FAE5] flex items-center justify-center text-[14px]">&#128222;</div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">Need Help?</div>
            </div>
            <div className="p-[20px] flex flex-col">
              <div className="text-[12px] text-[#6b7280] leading-[1.8]">
                <strong className="text-[#0D2B55] font-[800]">HR Manager</strong><br/>
                Tracy Helgenberger<br/>
                Extension: 201<br/>
                Email: <a href="mailto:hr@fsmpc.fm" className="text-[#1E40AF] font-[700] hover:underline">hr@fsmpc.fm</a><br/><br/>
                <strong className="text-[#0D2B55] font-[800]">Your Line Manager</strong><br/>
                <span>{user?.employmentDetails?.rawManagerName || 'Assigned Manager'}</span><br/><br/>
                <div className="p-[8px_10px] bg-[#DBEAFE] rounded-[7px] text-[#1E40AF] font-[600] border border-[#BFDBFE]">
                  For technical portal issues, contact ICT Manager (Ext. 301)
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}