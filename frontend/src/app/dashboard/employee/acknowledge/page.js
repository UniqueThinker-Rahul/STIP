'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../../../../lib/api';

const CRIT_NAMES = {
  c1: "Quality/Accuracy of Work",
  c2: "Efficiency/Speed",
  c3: "Job Knowledge & Skills",
  c4: "Teamwork & Collaboration",
  c5: "Safety & Compliance",
  c6: "Attendance & Punctuality"
};

export default function EmployeeAcknowledge() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [appraisal, setAppraisal] = useState(null);
  const [activeQuarter, setActiveQuarter] = useState(null);
  const [cpPct, setCpPct] = useState(0); // 🚨 FIX: Replaced static CP with dynamic state
  const [loading, setLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);
  
  const [checks, setChecks] = useState({ c1: false, c2: false, c3: false });

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

        // 🚨 FIX: Dynamically fetch all required context including quarters and metrics
        const [usersRes, appraisalsRes, quartersRes] = await Promise.all([
          api.get('/users').catch(() => ({ data: { data: [] } })),
          api.get('/appraisals').catch(() => ({ data: { data: [] } })),
          api.get('/quarters').catch(() => ({ data: { data: [] } }))
        ]);

        const allUsers = usersRes.data?.data || [];
        const myUser = allUsers.find(u => u._id === sessionUser.id || u.employeeId === sessionUser.employeeId) || sessionUser;
        setUser(myUser);

        const allApps = appraisalsRes.data?.data || [];
        const myApp = allApps.find(a => (a.employeeId?._id || a.employeeId) === myUser._id || a.employeeId?.employeeId === myUser.employeeId);
        setAppraisal(myApp || null);
        
        // 🚨 FIX: If they already acknowledged it in the DB, set it here
        if (myApp?.workflow?.status === 'ACKNOWLEDGED' || myApp?.acknowledgedAt) {
            setAcknowledged(true);
        }

        const fetchedQuarters = quartersRes.data?.data || [];
        const now = new Date();
        let targetQuarter = fetchedQuarters.find(q => {
          const start = new Date(q.startDate); start.setHours(0,0,0,0);
          const end = new Date(q.endDate); end.setHours(23,59,59,999);
          return now >= start && now <= end;
        });
        
        if (!targetQuarter && fetchedQuarters.length > 0) {
            targetQuarter = fetchedQuarters[fetchedQuarters.length - 1]; 
        }
        setActiveQuarter(targetQuarter);

        // 🚨 FIX: Fetch dynamic CP metric for the target year
        if (targetQuarter) {
            const metricsRes = await api.get(`/company-metrics/${targetQuarter.year}`).catch(() => ({ data: { data: null } }));
            setCpPct(metricsRes.data?.data?.cpPct || 0);
        }

      } catch (error) {
        console.error('Failed to load acknowledge data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAcknowledgeData();
  }, [router]);

  // 🚨 FIX: Actually submit the acknowledgement to the backend database
  const handleSubmit = async () => {
    if (!appraisal) return;
    try {
        setLoading(true);
        // Assuming your backend supports updating the status to ACKNOWLEDGED or logging the timestamp
        await api.patch(`/appraisals/${appraisal._id}/acknowledge`);
        setAcknowledged(true);
    } catch (error) {
        console.error('Failed to acknowledge appraisal:', error);
        alert('Failed to acknowledge the appraisal. Please try again or contact HR.');
    } finally {
        setLoading(false);
    }
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

  const iprf = appraisal?.calculatedResults?.finalIprfScore || appraisal?.finalIprfScore || appraisal?.iprfScore || 0;
  const status = appraisal?.workflow?.status || appraisal?.status;
  const isApproved = status === 'APPROVED' || status === 'CEO_APPROVED' || status === 'ACKNOWLEDGED'; // Allow if already acknowledged
  
  // 🚨 FIX: Use the dynamic cpPct
  const awardPct = isApproved ? (cpPct * iprf * pr).toFixed(2) : '0.00';
  const allChecked = checks.c1 && checks.c2 && checks.c3;

  const fName = user?.personalDetails?.firstName || user?.firstName || '';
  const mName = user?.personalDetails?.middleName ? ` ${user.personalDetails.middleName}` : '';
  const lName = user?.personalDetails?.lastName || user?.lastName || '';
  const fullName = `${fName}${mName} ${lName}`.trim() || user?.email?.split('@')[0] || 'Unknown Employee';
  
  const jobTitle = user?.employmentDetails?.jobTitle 
    || user?.jobTitle 
    || user?.title 
    || appraisal?.employeeId?.employmentDetails?.jobTitle 
    || 'Employee';
    
  const companyCode = user?.companyCode || user?.employmentDetails?.companyCode || 'FSM';

  // 🚨 FIX: Extract dynamic quarter data
  const quarterName = appraisal?.appraisalQuarter?.name || appraisal?.period?.quarter || appraisal?.quarter?.name || activeQuarter?.name || 'Current Quarter';
  const quarterYear = appraisal?.appraisalQuarter?.year || appraisal?.period?.year || appraisal?.year || activeQuarter?.year || new Date().getFullYear();
  
  let quarterMonths = '';
  if (appraisal?.appraisalQuarter?.startDate && appraisal?.appraisalQuarter?.endDate) {
      const startMonth = new Date(appraisal.appraisalQuarter.startDate).toLocaleDateString('en-GB', { month: 'long' });
      const endMonth = new Date(appraisal.appraisalQuarter.endDate).toLocaleDateString('en-GB', { month: 'long' });
      quarterMonths = `(${startMonth} — ${endMonth} ${quarterYear})`;
  } else if (activeQuarter?.startDate && activeQuarter?.endDate) {
      const startMonth = new Date(activeQuarter.startDate).toLocaleDateString('en-GB', { month: 'long' });
      const endMonth = new Date(activeQuarter.endDate).toLocaleDateString('en-GB', { month: 'long' });
      quarterMonths = `(${startMonth} — ${endMonth} ${quarterYear})`;
  }

  // 🚨 FIX: Extract dynamic names for the bottom summary text
  let hrNameText = "HR Manager";
  if (appraisal?.evaluations?.hr?.userId?.personalDetails) {
      hrNameText = `${appraisal.evaluations.hr.userId.personalDetails.firstName} ${appraisal.evaluations.hr.userId.personalDetails.lastName}`;
  } else if (appraisal?.narrative?.hrComments) {
      hrNameText = "HR Administrator"; // Fallback if name is stripped but comments exist
  }

  let ceoNameText = "CEO";
  if (appraisal?.evaluations?.ceo?.userId?.personalDetails) {
      ceoNameText = `${appraisal.evaluations.ceo.userId.personalDetails.firstName} ${appraisal.evaluations.ceo.userId.personalDetails.lastName}`;
  } else if (appraisal?.narrative?.ceoComments) {
      ceoNameText = "Chief Executive Officer";
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
          &#9989; Acknowledge My Appraisal
        </div>
        <div className="text-[13px] text-[#6b7280]">
          Formally acknowledge your CY{quarterYear} {quarterName} appraisal result
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
                Please read the following appraisal summary carefully. By acknowledging, you confirm that you have reviewed your CY{quarterYear} {quarterName} appraisal result and understand your STIP award entitlement.
              </div>
            </div>
            
            <div className="p-[24px]">
              <div className="bg-[#FAF8F4] border border-[#E2DDD4] rounded-[10px] p-[20px] text-[13px] text-[#0f1923] leading-[1.8] mb-[24px]">
                <strong className="text-[#0D2B55]">Employee:</strong> {fullName}<br/>
                <strong className="text-[#0D2B55]">Employee ID:</strong> {user.employeeId}<br/>
                <strong className="text-[#0D2B55]">Job Title:</strong> {jobTitle}<br/>
                <strong className="text-[#0D2B55]">Company:</strong> {companyCode}<br/>
                <strong className="text-[#0D2B55]">Quarter:</strong> {quarterName} {quarterYear} {quarterMonths}<br/><br/>
                
                <strong className="text-[#0D2B55]">IPRF Rating:</strong> {iprf.toFixed(1)} &mdash; {iprfLabel(iprf)}<br/>
                <strong className="text-[#0D2B55]">Pro-Rata:</strong> {pr.toFixed(3)} ({prMonths.toFixed(2)} / 12 months)<br/>
                <strong className="text-[#0D2B55]">Company Performance (CP%):</strong> {cpPct}%<br/>
                <strong className="text-[#0D2B55]">STIP Award %:</strong> {awardPct}% (Gross &mdash; before FSM income tax)<br/><br/>
                
                <strong className="text-[#0D2B55]">Performance Criteria Breakdown:</strong><br/>
                <ul className="list-disc pl-[20px] mt-[4px] mb-[12px]">
                  {Object.entries(appraisal?.scores || {}).map(([k, scoreObj]) => {
                    const v = scoreObj.rating || 0;
                    const lbl = {0:'Less than Satisfactory (LS)',0.7:'Needs Improvement (NI)',1:'Fully Effective (E)',1.3:'Exceeds Performance (EP)'}[v] || v;
                    return (
                      <li key={k}>{CRIT_NAMES[k] || k}: {v.toFixed(1)} &mdash; {lbl}</li>
                    );
                  })}
                </ul>
                <strong className="text-[#0D2B55]">Manager Comments:</strong> {appraisal?.narrative?.generalComments || appraisal?.evaluations?.manager?.comments || 'None'}<br/><br/>
                
                {/* 🚨 FIX: Dynamic routing chain names */}
                <em className="text-[#6b7280]">This appraisal has been reviewed and approved by: Line Manager &rarr; {hrNameText} &rarr; {ceoNameText}.</em>
              </div>
              
              <div className="flex flex-col gap-[12px] mb-[24px]">
                <label className={`flex items-start gap-[12px] p-[16px] rounded-[10px] cursor-pointer transition-colors border ${checks.c1 ? 'bg-[#EFF6FF] border-[#BFDBFE]' : 'bg-white border-[#E2DDD4] hover:bg-[#FAF8F4]'}`}>
                  <input 
                    type="checkbox" 
                    className="w-[18px] h-[18px] mt-[2px] cursor-pointer"
                    checked={checks.c1} 
                    onChange={() => setChecks(c => ({...c, c1: !c.c1}))} 
                  />
                  <span className={`text-[13px] leading-[1.5] ${checks.c1 ? 'text-[#1E40AF] font-[600]' : 'text-[#0f1923]'}`}>
                    I confirm that I have read and understood my {quarterName} {quarterYear} appraisal result, including my IPRF rating and the performance criteria assessments provided by my Line Manager.
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
                    I understand that if I disagree with any aspect of this appraisal, I should raise a formal grievance with the HR Department within <strong className="font-[800]">14 days</strong> of this acknowledgement.
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
              {/* 🚨 FIX: Real-time acknowledged date from DB if available, else fallback to current time */}
              Acknowledged by {fullName} (ID: {user.employeeId}) on {appraisal?.acknowledgedAt ? new Date(appraisal.acknowledgedAt).toLocaleString('en-GB',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : new Date().toLocaleString('en-GB',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}
            </div>
            <div className="mt-[10px] text-[13px] text-[#065F46]">
              Thank you {fName}. Your {quarterName} {quarterYear} appraisal has been formally acknowledged. A record of this acknowledgement has been permanently saved.
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}