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
  const [allMyAppraisals, setAllMyAppraisals] = useState([]);
  const [appraisal, setAppraisal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);
  
  const [checks, setChecks] = useState({ c1: false, c2: false, c3: false });

  const currentYearNum = new Date().getFullYear();
  const currentYearStr = currentYearNum.toString();
  const yearOptions = [currentYearNum - 3, currentYearNum - 2, currentYearNum - 1, currentYearNum, currentYearNum + 1];

  const [filterYear, setFilterYear] = useState(currentYearStr);
  const [isManualYear, setIsManualYear] = useState(false); 
  const [qtr, setQtr] = useState('');
  const [dbQuarters, setDbQuarters] = useState([]);

  const [cpPct, setCpPct] = useState(0); 
  const [requireAck, setRequireAck] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const userCookie = Cookies.get('stip_user');
        if (!userCookie) {
          router.push('/login');
          return;
        }
        const sessionUser = JSON.parse(userCookie);

        // 🚨 FIXED 403 ERROR: Replaced /users with /auth/me to pass role guards securely
        const [meRes, appraisalsRes, qtrRes] = await Promise.all([
          api.get('/auth/me').catch(() => ({ data: { data: sessionUser } })),
          api.get('/appraisals').catch(() => ({ data: { data: [] } })),
          api.get('/quarters').catch(() => ({ data: { data: [] } }))
        ]);

        const myUser = meRes.data?.data || sessionUser;
        setUser(myUser);

        const fetchedQuarters = qtrRes.data?.data || [];
        setDbQuarters(fetchedQuarters);

        const allApps = appraisalsRes.data?.data || [];
        const myApps = allApps.filter(a => (a.employeeId?._id || a.employeeId) === myUser._id || a.employeeId?.employeeId === myUser.employeeId);
        setAllMyAppraisals(myApps);

      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [router]);

  useEffect(() => {
    const qtrsForSelectedYear = dbQuarters.filter(q => q.year.toString() === filterYear);
    if (qtrsForSelectedYear.length > 0) {
      const q1 = qtrsForSelectedYear.find(q => q.name.toUpperCase().includes('Q1'));
      setQtr(q1 ? q1._id : qtrsForSelectedYear[0]._id);
    } else {
      setQtr('');
    }
  }, [dbQuarters, filterYear]);

  useEffect(() => {
    const updateSelection = async () => {
      if (!qtr || allMyAppraisals.length === 0) {
        setAppraisal(null);
        setCpPct(0);
        setAcknowledged(false);
        return;
      }
      const targetQtrObj = dbQuarters.find(q => q._id === qtr);
      const targetQtrName = targetQtrObj ? targetQtrObj.name : qtr;

      const matchedAppraisal = allMyAppraisals.find(a => {
          const appYear = a.reviewYear || a.appraisalQuarter?.year;
          const appQtrId = a.appraisalQuarter?._id || a.appraisalQuarter || a.period?.quarter;
          return (appYear && appYear.toString() === filterYear) && (appQtrId === qtr || a.period?.quarter === targetQtrName);
      });
      setAppraisal(matchedAppraisal || null);

      if (matchedAppraisal?.workflow?.status === 'ACKNOWLEDGED' || matchedAppraisal?.acknowledgedAt) {
          setAcknowledged(true);
      } else {
          setAcknowledged(false);
      }

      if (targetQtrName) {
          const qMatch = targetQtrName.match(/Q?([1-4])/i) || String(targetQtrName).match(/([1-4])/);
          const qNum = qMatch ? parseInt(qMatch[1]) : 1;
          const normalizedQtr = `Q${qNum}`; 
          const targetMonth = qNum * 3;
          
          const [metricsRes, qscRes] = await Promise.all([
              api.get(`/company-metrics/${filterYear}/${targetMonth}`).catch(() => ({ data: { data: null } })),
              api.get(`/quarterly-scorecards/${filterYear}`).catch(() => ({ data: { data: [] } }))
          ]);
          
          const metrics = metricsRes.data?.data;
          const qscList = qscRes.data?.data || [];
          
          const qscMatch = qscList.find(q => 
              q.quarter === normalizedQtr || 
              `Q${q.quarter}` === normalizedQtr ||
              q.quarter?.toUpperCase() === targetQtrName?.toUpperCase()
          );
          
          setCpPct(metrics?.cpPct || qscMatch?.cpPct || 0);
          
          const qscReq = qscMatch?.requireAcknowledgment;
          const metReq = metrics?.requireAcknowledgment;

          const isExplicitlyDisabled = 
              qscReq === false || String(qscReq).toLowerCase() === 'false' || 
              metReq === false || String(metReq).toLowerCase() === 'false';

          setRequireAck(!isExplicitlyDisabled);
      }
    };
    
    updateSelection();
  }, [qtr, filterYear, allMyAppraisals, dbQuarters]);

  const handleSubmit = async () => {
    if (!appraisal) return;
    try {
        setLoading(true);
        // 🚨 FIXED 404 ERROR: Uses standard PUT request to update the status directly, bypassing the missing /acknowledge route
        await api.put(`/appraisals/${appraisal._id}`, {
          ...appraisal,
          status: 'ACKNOWLEDGED',
          workflow: {
            ...(appraisal.workflow || {}),
            status: 'ACKNOWLEDGED'
          },
          acknowledgedAt: new Date().toISOString()
        });
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
  const isApproved = status === 'APPROVED' || status === 'CEO_APPROVED' || status === 'ACKNOWLEDGED'; 
  
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

  const quartersForSelectedYear = dbQuarters.filter(q => q.year.toString() === filterYear);
  const activeQObj = quartersForSelectedYear.find(q => q._id === qtr);
  const activeQName = activeQObj?.name || '';
  
  let quarterMonths = '';
  if (activeQObj?.startDate && activeQObj?.endDate) {
      const startMonth = new Date(activeQObj.startDate).toLocaleDateString('en-GB', { month: 'long' });
      const endMonth = new Date(activeQObj.endDate).toLocaleDateString('en-GB', { month: 'long' });
      quarterMonths = `(${startMonth} — ${endMonth} ${filterYear})`;
  }

  let hrNameText = "HR Manager";
  if (appraisal?.evaluations?.hr?.userId?.personalDetails) {
      hrNameText = `${appraisal.evaluations.hr.userId.personalDetails.firstName} ${appraisal.evaluations.hr.userId.personalDetails.lastName}`;
  } else if (appraisal?.narrative?.hrComments) {
      hrNameText = "HR Administrator"; 
  }

  let ceoNameText = "CEO";
  if (appraisal?.evaluations?.ceo?.userId?.personalDetails) {
      ceoNameText = `${appraisal.evaluations.ceo.userId.personalDetails.firstName} ${appraisal.evaluations.ceo.userId.personalDetails.lastName}`;
  } else if (appraisal?.narrative?.ceoComments) {
      ceoNameText = "Chief Executive Officer";
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      <div className="mb-[20px] flex flex-col md:flex-row justify-between items-start md:items-end gap-[12px]">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
            &#9989; Acknowledge My Appraisal
          </div>
          <div className="text-[13px] text-[#6b7280]">
            Formally acknowledge your {activeQName} {filterYear} appraisal result
          </div>
        </div>

        <div className="flex gap-[8px]">
          {isManualYear ? (
            <input 
              type="number" 
              autoFocus
              defaultValue={filterYear}
              onBlur={(e) => {
                if (e.target.value) {
                  setFilterYear(e.target.value);
                }
                setIsManualYear(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.target.value) {
                    setFilterYear(e.target.value);
                  }
                  setIsManualYear(false);
                }
              }}
              className="py-[10px] px-[12px] bg-white border border-[#0D2B55] rounded-[8px] text-[13px] font-[700] text-[#0D2B55] outline-none w-[105px] shadow-sm"
            />
          ) : (
            <select 
              value={filterYear} 
              onChange={(e) => {
                if (e.target.value === 'manual') setIsManualYear(true);
                else setFilterYear(e.target.value);
              }} 
              className="py-[10px] px-[12px] bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] font-[700] text-[#0D2B55] outline-none cursor-pointer w-[105px] shadow-sm"
            >
              {yearOptions.map(y => (
                 <option key={y} value={y}>{y}</option>
              ))}
              <option value="manual" className="font-bold text-[#1E40AF]">Enter Manually...</option>
            </select>
          )}

          <select 
            value={qtr} 
            onChange={e => setQtr(e.target.value)} 
            disabled={!filterYear || quartersForSelectedYear.length === 0}
            className={`py-[10px] px-[12px] border rounded-[8px] text-[13px] outline-none transition-colors w-[140px] shadow-sm ${filterYear ? 'bg-white border-[#E2DDD4] text-[#0f1923] cursor-pointer' : 'bg-slate-50 border-[#E2DDD4] text-[#94a3b8] cursor-not-allowed'}`}
          >
            {quartersForSelectedYear.length === 0 && <option value="">No Quarters</option>}
            {quartersForSelectedYear.map(q => (
               <option key={q._id} value={q._id}>{q.name}</option>
            ))}
          </select>
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

      {isApproved && !acknowledged && !requireAck && (
        <div className="bg-[#EFF6FF] border-[1.5px] border-[#BFDBFE] text-[#1E40AF] rounded-[10px] p-[16px] text-[13px] mb-[20px] shadow-sm flex items-start gap-[10px]">
          <span className="text-[18px] leading-none mt-[2px]">&#8505;</span> 
          <div className="leading-[1.5]">
            <strong className="font-[800]">Acknowledgment Not Required:</strong> The ICT Administrator has disabled the requirement for employee acknowledgment for the {activeQName} {filterYear} appraisal cycle. No further action is needed from you.
          </div>
        </div>
      )}

      {isApproved && !acknowledged && requireAck && (
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
                Please read the following appraisal summary carefully. By acknowledging, you confirm that you have reviewed your CY{filterYear} {activeQName} appraisal result and understand your STIP award entitlement.
              </div>
            </div>
            
            <div className="p-[24px]">
              <div className="bg-[#FAF8F4] border border-[#E2DDD4] rounded-[10px] p-[20px] text-[13px] text-[#0f1923] leading-[1.8] mb-[24px]">
                <strong className="text-[#0D2B55]">Employee:</strong> {fullName}<br/>
                <strong className="text-[#0D2B55]">Employee ID:</strong> {user.employeeId}<br/>
                <strong className="text-[#0D2B55]">Job Title:</strong> {jobTitle}<br/>
                <strong className="text-[#0D2B55]">Company:</strong> {companyCode}<br/>
                <strong className="text-[#0D2B55]">Quarter:</strong> {activeQName} {filterYear} {quarterMonths}<br/><br/>
                
                <strong className="text-[#0D2B55]">IPRF Rating:</strong> {iprf.toFixed(1)} &mdash; {iprfLabel(iprf)}<br/>
                <strong className="text-[#0D2B55]">Pro-Rata:</strong> {pr.toFixed(3)} ({prMonths.toFixed(2)} / 12 months)<br/>
                <strong className="text-[#0D2B55]">Company Performance (CP%):</strong> {Number(cpPct).toFixed(2)}%<br/>
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
                    I confirm that I have read and understood my {activeQName} {filterYear} appraisal result, including my IPRF rating and the performance criteria assessments provided by my Line Manager.
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
              Acknowledged by {fullName} (ID: {user.employeeId}) on {appraisal?.acknowledgedAt ? new Date(appraisal.acknowledgedAt).toLocaleString('en-GB',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : new Date().toLocaleString('en-GB',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}
            </div>
            <div className="mt-[10px] text-[13px] text-[#065F46]">
              Thank you {fName}. Your {activeQName} {filterYear} appraisal has been formally acknowledged. A record of this acknowledgement has been permanently saved.
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}