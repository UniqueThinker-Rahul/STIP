'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../../../../lib/api';

const CRIT_NAMES = {
  deliveredResults: 'Delivered Expected Results',
  behaviors: 'Demonstrated Initiative',
  safeWorking: 'Demonstrated Safe Working',
  jobCompetence: 'Job Competence',
  dependability: 'Dependability',
  adaptability: 'Adaptability'
};

export default function EmployeeAcknowledge() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [appraisal, setAppraisal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);
  
  // Checkboxes state
  const [checks, setChecks] = useState({ c1: false, c2: false, c3: false });

  // Constants
  const CP = 13.01;

  useEffect(() => {
    const fetchAcknowledgeData = async () => {
      try {
        setLoading(true);
        const userCookie = Cookies.get('stip_user');
        if (!userCookie) {
          router.push('/login');
          return;
        }
        const sessionUser = JSON.parse(userCookie);

        const [usersRes, appraisalsRes] = await Promise.all([
          api.get('/users').catch(() => ({ data: { data: [] } })),
          api.get('/appraisals').catch(() => ({ data: { data: [] } }))
        ]);

        const allUsers = usersRes.data?.data || [];
        const myUser = allUsers.find(u => u._id === sessionUser.id || u.employeeId === sessionUser.employeeId) || sessionUser;
        setUser(myUser);

        const allApps = appraisalsRes.data?.data || [];
        const myApp = allApps.find(a => (a.employeeId?._id || a.employeeId) === myUser._id || a.employeeId?.employeeId === myUser.employeeId);
        setAppraisal(myApp || null);

      } catch (error) {
        console.error('Failed to load acknowledge data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAcknowledgeData();
  }, [router]);

  const handleSubmit = () => {
    setAcknowledged(true);
    // You would typically make an API call here to record the acknowledgment
    // e.g., await api.post(`/appraisals/${appraisal._id}/acknowledge`)
  };

  const iprfLabel = (score) => {
    if (score >= 1.3) return 'Exceeds Performance';
    if (score >= 1.0) return 'Fully Effective';
    if (score >= 0.7) return 'Needs Improvement';
    if (score > 0) return 'Less than Satisfactory';
    return 'Not yet submitted';
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-[600] animate-pulse">Loading Acknowledgment Form...</div>;
  }

  if (!user) return null;

  const prMonths = user?.employmentDetails?.prorateValue || 12;
  const pr = prMonths / 12;

  const iprf = appraisal?.calculatedResults?.finalIprfScore || 0;
  const status = appraisal?.workflow?.status;
  const isApproved = status === 'APPROVED';
  
  const awardPct = isApproved ? (CP * iprf * pr).toFixed(2) : '0.00';
  const allChecked = checks.c1 && checks.c2 && checks.c3;

  const fName = user?.personalDetails?.firstName || user?.firstName || '';
  const lName = user?.personalDetails?.lastName || user?.lastName || '';
  const fullName = `${fName} ${lName}`.trim() || 'Employee';

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
          &#9989; Acknowledge My Appraisal
        </div>
        <div className="text-[13px] text-[#6b7280]">
          Formally acknowledge your CY2026 Q3 appraisal result
        </div>
      </div>

      {!isApproved && !acknowledged && (
        <div className="bg-[#FFFBEB] border-[1.5px] border-[#FDE68A] text-[#92400E] rounded-[10px] p-[12px_16px] text-[13px] mb-[20px] shadow-sm flex items-start gap-[10px]">
          <span className="text-[16px] leading-none mt-[2px]">&#9200;</span> 
          <div className="leading-[1.5]">
            You cannot acknowledge yet &mdash; your appraisal has not been submitted and approved. Please check back after your Line Manager submits your appraisal and it is approved by the CEO.
          </div>
        </div>
      )}

      {isApproved && !acknowledged && (
        <>
          <div className="bg-[#FFFBEB] border-[1.5px] border-[#FDE68A] text-[#92400E] rounded-[10px] p-[12px_16px] text-[13px] mb-[20px] shadow-sm flex items-start gap-[10px]">
            <span className="text-[16px] leading-none mt-[2px]">&#9888;</span> 
            <div className="leading-[1.5]">
              <strong className="font-[800]">Action Required:</strong> Your appraisal result has been approved. Please read and formally acknowledge your STIP outcome below.
            </div>
          </div>
          
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-lg overflow-hidden">
            <div className="p-[24px] border-b border-[#E2DDD4] bg-[#0D2B55] text-white">
              <div className="text-[18px] font-[800] mb-[4px]">Formal Acknowledgement of STIP Appraisal Result</div>
              <div className="text-[12px] text-white/70 font-[500] leading-[1.5]">
                Please read the following appraisal summary carefully. By acknowledging, you confirm that you have reviewed your CY2026 Q3 appraisal result and understand your STIP award entitlement.
              </div>
            </div>
            
            <div className="p-[24px]">
              {/* Appraisal Summary Text */}
              <div className="bg-[#FAF8F4] border border-[#E2DDD4] rounded-[10px] p-[20px] text-[13px] text-[#0f1923] leading-[1.8] mb-[24px]">
                <strong className="text-[#0D2B55]">Employee:</strong> {fullName}<br/>
                <strong className="text-[#0D2B55]">Employee ID:</strong> {user.employeeId}<br/>
                <strong className="text-[#0D2B55]">Job Title:</strong> {user.employmentDetails?.jobTitle}<br/>
                <strong className="text-[#0D2B55]">Company:</strong> {user.companyCode}<br/>
                <strong className="text-[#0D2B55]">Quarter:</strong> Q3 2026 (July &mdash; September 2026)<br/><br/>
                
                <strong className="text-[#0D2B55]">IPRF Rating:</strong> {iprf.toFixed(1)} &mdash; {iprfLabel(iprf)}<br/>
                <strong className="text-[#0D2B55]">Pro-Rata:</strong> {pr.toFixed(3)} ({prMonths.toFixed(2)} / 12 months)<br/>
                <strong className="text-[#0D2B55]">Company Performance (CP%):</strong> {CP}%<br/>
                <strong className="text-[#0D2B55]">STIP Award %:</strong> {awardPct}% (Gross &mdash; before FSM income tax)<br/><br/>
                
                <strong className="text-[#0D2B55]">Performance Criteria Breakdown:</strong><br/>
                <ul className="list-disc pl-[20px] mt-[4px] mb-[12px]">
                  {Object.entries(appraisal?.scores || {}).map(([k, scoreObj]) => {
                    const v = scoreObj.rating || 0;
                    const lbl = {0:'Less than Satisfactory (LS)',0.7:'Needs Improvement (NI)',1:'Fully Effective (E)',1.3:'Exceeds Performance (EP)'}[v] || v;
                    return (
                      <li key={k}>{CRIT_NAMES[k]}: {v.toFixed(1)} &mdash; {lbl}</li>
                    );
                  })}
                </ul>
                <strong className="text-[#0D2B55]">Manager Comments:</strong> {appraisal?.narrative?.generalComments || 'None'}<br/><br/>
                
                <em className="text-[#6b7280]">This appraisal has been reviewed and approved by: Line Manager &rarr; HR Manager (Tracy Helgenberger) &rarr; CEO (Jared Morris).</em>
              </div>
              
              {/* Checkboxes */}
              <div className="flex flex-col gap-[12px] mb-[24px]">
                <label className={`flex items-start gap-[12px] p-[16px] rounded-[10px] cursor-pointer transition-colors border ${checks.c1 ? 'bg-[#EFF6FF] border-[#BFDBFE]' : 'bg-white border-[#E2DDD4] hover:bg-[#FAF8F4]'}`}>
                  <input 
                    type="checkbox" 
                    className="w-[18px] h-[18px] mt-[2px] cursor-pointer"
                    checked={checks.c1} 
                    onChange={() => setChecks(c => ({...c, c1: !c.c1}))} 
                  />
                  <span className={`text-[13px] leading-[1.5] ${checks.c1 ? 'text-[#1E40AF] font-[600]' : 'text-[#0f1923]'}`}>
                    I confirm that I have read and understood my Q3 2026 appraisal result, including my IPRF rating and the 6 performance criteria assessments provided by my Line Manager.
                  </span>
                </label>
                
                <label className={`flex items-start gap-[12px] p-[16px] rounded-[10px] cursor-pointer transition-colors border ${checks.c2 ? 'bg-[#EFF6FF] border-[#BFDBFE]' : 'bg-white border-[#E2DDD4] hover:bg-[#FAF8F4]'}`}>
                  <input 
                    type="checkbox" 
                    className="w-[18px] h-[18px] mt-[2px] cursor-pointer"
                    checked={checks.c2} 
                    onChange={() => setChecks(c => ({...c, c2: !c.c2}))} 
                  />
                  <span className={`text-[13px] leading-[1.5] ${checks.c2 ? 'text-[#1E40AF] font-[600]' : 'text-[#0f1923]'}`}>
                    I understand my STIP Award % calculation: CP% &times; IPRF Factor &times; Pro-Rata, and that this is a gross amount subject to FSM income tax.
                  </span>
                </label>
                
                <label className={`flex items-start gap-[12px] p-[16px] rounded-[10px] cursor-pointer transition-colors border ${checks.c3 ? 'bg-[#EFF6FF] border-[#BFDBFE]' : 'bg-white border-[#E2DDD4] hover:bg-[#FAF8F4]'}`}>
                  <input 
                    type="checkbox" 
                    className="w-[18px] h-[18px] mt-[2px] cursor-pointer"
                    checked={checks.c3} 
                    onChange={() => setChecks(c => ({...c, c3: !c.c3}))} 
                  />
                  <span className={`text-[13px] leading-[1.5] ${checks.c3 ? 'text-[#1E40AF] font-[600]' : 'text-[#0f1923]'}`}>
                    I understand that if I disagree with any aspect of this appraisal, I should raise a formal grievance with HR Manager (Tracy Helgenberger, Ext. 201) within <strong className="font-[800]">14 days</strong> of this acknowledgement.
                  </span>
                </label>
              </div>
              
              <button 
                className={`w-full py-[14px] rounded-[10px] text-[14px] font-[800] transition-all shadow-md flex justify-center items-center gap-[8px] ${
                  allChecked ? 'bg-[#C9A84C] hover:bg-[#b59540] text-[#0D2B55] translate-y-0' : 'bg-[#E2DDD4] text-[#6b7280] cursor-not-allowed opacity-70'
                }`}
                disabled={!allChecked} 
                onClick={handleSubmit}
              >
                &#9989; Formally Acknowledge My Appraisal
              </button>
            </div>
          </div>
        </>
      )}

      {acknowledged && (
        <div className="bg-[#D1FAE5] border border-[#A7F3D0] rounded-[14px] p-[30px] flex items-center gap-[20px] shadow-sm animate-in zoom-in-95 duration-300">
          <div className="w-[60px] h-[60px] rounded-full bg-[#059669] flex items-center justify-center text-white text-[28px] shrink-0 shadow-md">
            &#10003;
          </div>
          <div>
            <div className="text-[20px] font-[800] text-[#065F46] mb-[6px]">Appraisal Acknowledged</div>
            <div className="text-[13px] text-[#065F46]/80 font-[600] leading-[1.5]">
              Acknowledged by {fullName} (ID: {user.employeeId}) on {new Date().toLocaleString('en-GB',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}
            </div>
            <div className="mt-[10px] text-[13px] text-[#065F46]">
              Thank you {fName}. Your Q3 2026 appraisal has been formally acknowledged. A record of this acknowledgement has been saved.
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}