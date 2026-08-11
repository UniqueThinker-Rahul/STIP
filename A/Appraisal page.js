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

const CRIT_WTS = {
  deliveredResults: '30%',
  behaviors: '20%',
  safeWorking: '20%',
  jobCompetence: '10%',
  dependability: '10%',
  adaptability: '10%'
};

// 🚨 UPGRADE: Dynamic Comment Parsing Engine
const parseComments = (combinedString) => {
  if (!combinedString) return {};
  const comments = {};
  
  const labels = [
    { key: 'jobCompetence', matches: ['Job Competence:'] },
    { key: 'behaviors', matches: ['Behaviors & Initiative:', 'Demonstrated Initiative:'] },
    { key: 'dependability', matches: ['Dependability:'] },
    { key: 'adaptability', matches: ['Adaptability:'] },
    { key: 'safeWorking', matches: ['Safe Working:', 'Demonstrated Safe Working:'] },
    { key: 'deliveredResults', matches: ['Delivered Expected Results:', 'Delivered Results:'] }
  ];

  let foundLabels = [];
  labels.forEach(labelDef => {
    let bestIdx = -1;
    let bestMatch = '';
    for (const matchStr of labelDef.matches) {
      const idx = combinedString.indexOf(matchStr);
      if (idx !== -1) {
        bestIdx = idx;
        bestMatch = matchStr;
        break;
      }
    }
    if (bestIdx !== -1) {
      foundLabels.push({ key: labelDef.key, index: bestIdx, match: bestMatch });
    }
  });

  foundLabels.sort((a, b) => a.index - b.index);

  foundLabels.forEach((label, i) => {
    const start = label.index + label.match.length;
    if (i + 1 < foundLabels.length) {
      const nextLabelIdx = foundLabels[i + 1].index;
      let content = combinedString.substring(start, nextLabelIdx);
      content = content.replace(/\s*\d+\.\s*$/, ''); // Backtrack and remove the proceeding list numbers
      comments[label.key] = content.trim();
    } else {
      comments[label.key] = combinedString.substring(start).trim();
    }
  });

  return comments;
};

export default function EmployeeAppraisal() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [allAppraisals, setAllAppraisals] = useState([]);
  const [appraisal, setAppraisal] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentYearNum = new Date().getFullYear();
  const currentYearStr = currentYearNum.toString();
  const yearOptions = [currentYearNum - 3, currentYearNum - 2, currentYearNum - 1, currentYearNum, currentYearNum + 1];

  const [filterYear, setFilterYear] = useState(currentYearStr);
  const [isManualYear, setIsManualYear] = useState(false); // 🚨 ADDED: Manual Year State
  const [qtr, setQtr] = useState('');
  const [dbQuarters, setDbQuarters] = useState([]);

  useEffect(() => {
    const fetchAppraisalData = async () => {
      try {
        setLoading(true);
        const userCookie = Cookies.get('stip_user');
        if (!userCookie) {
          router.push('/login');
          return;
        }
        const sessionUser = JSON.parse(userCookie);

        const [usersRes, appraisalsRes, qtrRes] = await Promise.all([
          api.get('/users').catch(() => ({ data: { data: [] } })),
          api.get('/appraisals').catch(() => ({ data: { data: [] } })),
          // 🚨 FIXED: Removed "?all=true". Now it strictly fetches ONLY published quarters for normal staff!
          api.get('/quarters').catch(() => ({ data: { data: [] } }))
        ]);

        const allUsers = usersRes.data?.data || [];
        const myUser = allUsers.find(u => u._id === sessionUser.id || u.employeeId === sessionUser.employeeId) || sessionUser;
        setUser(myUser);

        const fetchedQuarters = qtrRes.data?.data || [];
        setDbQuarters(fetchedQuarters);

        const allApps = appraisalsRes.data?.data || [];
        const myApps = allApps.filter(a => (a.employeeId?._id || a.employeeId) === myUser._id || a.employeeId?.employeeId === myUser.employeeId);
        setAllAppraisals(myApps);

      } catch (error) {
        console.error('Failed to load appraisal data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppraisalData();
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
    if (!qtr || allAppraisals.length === 0) {
      setAppraisal(null);
      return;
    }
    const targetQtrObj = dbQuarters.find(q => q._id === qtr);
    const targetQtrName = targetQtrObj ? targetQtrObj.name : qtr;

    const matchedAppraisal = allAppraisals.find(a => {
        const appYear = a.reviewYear || a.appraisalQuarter?.year;
        const appQtrId = a.appraisalQuarter?._id || a.appraisalQuarter || a.period?.quarter;
        
        return (appYear && appYear.toString() === filterYear) && (appQtrId === qtr || a.period?.quarter === targetQtrName);
    });
    setAppraisal(matchedAppraisal || null);
  }, [qtr, filterYear, allAppraisals, dbQuarters]);

  const iprfColor = (score) => {
    if (score >= 1.3) return '#1E40AF'; 
    if (score >= 1.0) return '#059669'; 
    if (score >= 0.7) return '#D97706'; 
    if (score > 0) return '#DC2626'; 
    return '#0D2B55'; 
  };

  const iprfLabel = (score) => {
    if (score >= 1.3) return 'Exceeds Performance';
    if (score >= 1.0) return 'Fully Effective';
    if (score >= 0.7) return 'Needs Improvement';
    if (score > 0) return 'Less than Satisfactory';
    return 'Not yet submitted';
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-[600] animate-pulse">Loading Your Appraisal...</div>;
  }

  if (!user) return null;

  const prMonths = user?.employmentDetails?.prorateValue || 12;
  const pr = prMonths / 12;

  const iprf = appraisal?.calculatedResults?.finalIprfScore || 0;
  const status = appraisal?.workflow?.status;
  
  const isCEOApproved = status === 'APPROVED';
  const CP = 13.01; 
  const award = isCEOApproved ? (CP * iprf * pr).toFixed(2) + '%' : '—';
  
  const statusClass = isCEOApproved ? 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]' : 
                      ['UNDER_HR_REVIEW', 'APPROVED_BY_HR', 'WITH_CEO'].includes(status) ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]' : 
                      'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]';
                      
  const statusDisplay = isCEOApproved ? 'CEO Approved' : 
                        ['UNDER_HR_REVIEW', 'APPROVED_BY_HR', 'WITH_CEO'].includes(status) ? 'At HR' : 
                        status === 'SUBMITTED' ? 'Submitted' : 'Draft';

  const quartersForSelectedYear = dbQuarters.filter(q => q.year.toString() === filterYear);
  const activeQName = quartersForSelectedYear.find(q => q._id === qtr)?.name || '';

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      <div className="mb-[20px] flex flex-col md:flex-row justify-between items-start md:items-end gap-[12px]">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
            &#128203; My {activeQName} Appraisal
          </div>
          <div className="text-[13px] text-[#6b7280]">
            Submitted by your Line Manager &mdash; read-only view
          </div>
        </div>

        {/* 🚨 FIXED: Filter Controls (Year and Quarter) with Manual Custom Entry Mode */}
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

      {!appraisal || status === 'DRAFT' ? (
        <>
          <div className="bg-[#FFFBEB] border-[1.5px] border-[#FDE68A] text-[#92400E] rounded-[10px] p-[12px_16px] text-[13px] mb-[20px] shadow-sm flex items-center gap-[8px]">
            <span className="text-[16px] leading-none">&#9200;</span> 
            <span>Your {activeQName} {filterYear} appraisal has not yet been submitted by your Line Manager. Contact your manager if you have questions.</span>
          </div>
          <div className="text-center p-[48px_20px] text-[#6b7280] bg-white border border-[#E2DDD4] rounded-[14px]">
            <div className="text-[48px] mb-[14px] opacity-80">&#128203;</div>
            <div className="text-[16px] font-[700] text-[#0D2B55] mb-[6px]">No appraisal submitted yet</div>
            <div className="text-[13px]">Your Line Manager will submit your appraisal before the {activeQName} deadline.</div>
          </div>
        </>
      ) : (
        <>
          <div className={`border-[1.5px] rounded-[10px] p-[12px_16px] text-[13px] mb-[20px] shadow-sm flex items-center gap-[8px] ${
            isCEOApproved ? 'bg-[#D1FAE5] border-[#A7F3D0] text-[#065F46]' : 
            ['UNDER_HR_REVIEW', 'APPROVED_BY_HR', 'WITH_CEO'].includes(status) ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]' : 
            'bg-[#DBEAFE] border-[#BFDBFE] text-[#1E40AF]'
          }`}>
            <span className="text-[16px] leading-none">
              {isCEOApproved ? '✅' : ['UNDER_HR_REVIEW', 'APPROVED_BY_HR', 'WITH_CEO'].includes(status) ? '⏳' : '📥'}
            </span> 
            <span dangerouslySetInnerHTML={{
              __html: isCEOApproved ? 'Your appraisal has been <strong class="font-[800]">approved by the CEO</strong>. Please acknowledge your result.' :
                      ['UNDER_HR_REVIEW', 'APPROVED_BY_HR', 'WITH_CEO'].includes(status) ? 'Your appraisal is under <strong class="font-[800]">HR review</strong>.' :
                      'Your appraisal has been submitted to <strong class="font-[800]">CEO for approval</strong>.'
            }}></span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-[20px]">
            
            {/* Left Column: Appraisal Details */}
            <div>
              <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col mb-[16px]">
                <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center">
                  <div className="flex items-center gap-[10px]">
                    <div className="w-[30px] h-[30px] rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[14px]">&#128203;</div>
                    <div>
                      <div className="text-[14px] font-[800] text-[#0D2B55]">{activeQName} {filterYear} Appraisal Summary</div>
                      <div className="text-[11px] text-[#6b7280]">Submitted by your Line Manager</div>
                    </div>
                  </div>
                  <span className={`px-[12px] py-[4px] rounded-full text-[11px] font-[800] border ${statusClass}`}>
                    {statusDisplay}
                  </span>
                </div>
                
                <div className="p-[20px]">
                  
                  {/* Top Stats Grid */}
                  <div className="grid grid-cols-3 gap-[10px] mb-[16px]">
                    <div className="bg-[#FAF8F4] rounded-[9px] p-[12px] text-center border border-[#E2DDD4]">
                      <div className="text-[10px] text-[#6b7280] font-[600] uppercase tracking-wider">IPRF Factor</div>
                      <div className="text-[24px] font-[800] mt-[4px]" style={{ color: iprfColor(iprf) }}>{iprf.toFixed(1)}</div>
                      <div className="text-[10px] mt-[2px] font-[600]" style={{ color: iprfColor(iprf) }}>
                        {iprfLabel(iprf).split(' ').slice(0,2).join(' ')}
                      </div>
                    </div>
                    <div className="bg-[#FAF8F4] rounded-[9px] p-[12px] text-center border border-[#E2DDD4]">
                      <div className="text-[10px] text-[#6b7280] font-[600] uppercase tracking-wider">Award %</div>
                      <div className="text-[24px] font-[800] text-[#059669] mt-[4px]">{award}</div>
                      <div className="text-[10px] text-[#6b7280] mt-[2px] font-[500]">Gross before tax</div>
                    </div>
                    <div className="bg-[#FAF8F4] rounded-[9px] p-[12px] text-center border border-[#E2DDD4]">
                      <div className="text-[10px] text-[#6b7280] font-[600] uppercase tracking-wider">Pro-Rata</div>
                      <div className="text-[24px] font-[800] text-[#1E40AF] mt-[4px]">{pr.toFixed(3)}</div>
                      <div className="text-[10px] text-[#6b7280] mt-[2px] font-[500]">{prMonths.toFixed(1)}/12 months</div>
                    </div>
                  </div>
                  
                  <div className="text-[12px] font-[800] text-[#0D2B55] mb-[10px] uppercase tracking-[.06em]">
                    6 Performance Criteria
                  </div>
                  
                 {/* 🚨 UPGRADE: Structured Criteria UI displaying specific comments per row */}
                  {(() => {
                    const parsedComments = parseComments(appraisal.narrative?.generalComments);
                    const hasParsedComments = Object.keys(parsedComments).length > 0;
                    
                    return (
                      <>
                        <div className="border border-[#E2DDD4] rounded-[8px] overflow-hidden">
                          {Object.entries(CRIT_NAMES).map(([key, name]) => {
                            const rating = appraisal.scores?.[key]?.rating || 0;
                            const col = iprfColor(rating);
                            const lbl = {0:'LS',0.7:'NI',1:'E',1.3:'EP'}[rating] || rating;
                            const comment = parsedComments[key];
                            
                            return (
                              <div key={key} className="border-b border-[#E2DDD4] last:border-0 bg-white">
                                <div className="flex justify-between items-center p-[10px_14px]">
                                  <div className="flex-1">
                                    <div className="text-[13px] font-[600] text-[#0f1923]">{name}</div>
                                  </div>
                                  <span className="text-[11px] font-[600] text-[#6b7280] w-[40px] text-right mr-[16px]">{CRIT_WTS[key]}</span>
                                  <span className="text-[13px] font-[800] w-[80px] text-right" style={{ color: col }}>
                                    {rating.toFixed(1)} &mdash; {lbl}
                                  </span>
                                </div>
                                {comment && (
                                  <div className="p-[0_14px_12px_14px] text-[12px] text-[#6b7280] italic leading-[1.6]">
                                    <span className="font-[700] not-italic text-[#0D2B55] text-[10px] uppercase tracking-widest block mb-[2px]">Manager Justification:</span>
                                    "{comment}"
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* 🚨 UPGRADE: Fallback block - only shows if parsing fails (preventing data loss) */}
                        {appraisal.narrative?.generalComments && !hasParsedComments && (
                          <div className="mt-[12px] bg-[#FAF8F4] border border-[#E2DDD4] rounded-[8px] p-[12px_14px]">
                            <div className="text-[11px] font-[800] text-[#0D2B55] mb-[5px] uppercase tracking-widest">Manager Comments</div>
                            <div className="text-[12px] text-[#6b7280] leading-[1.6] italic whitespace-pre-wrap">
                              "{appraisal.narrative.generalComments}"
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  
                </div>
              </div>
            </div>

            {/* Right Column: Result summary & Acknowledge */}
            <div>
              <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col mb-[16px]">
                <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
                  <div className="w-[30px] h-[30px] rounded-[8px] bg-[#0D2B55] flex items-center justify-center text-[14px]">&#127942;</div>
                  <div className="text-[14px] font-[800] text-[#0D2B55]">My IPRF Result</div>
                </div>
                
                <div className="p-[24px] text-center flex flex-col items-center">
                  <div className="text-[52px] font-[800] leading-none mb-[8px]" style={{ color: iprfColor(iprf) }}>
                    {iprf.toFixed(1)}
                  </div>
                  <div className="text-[14px] font-[800] text-[#0f1923] mb-[4px]">
                    {iprfLabel(iprf)}
                  </div>
                  <div className="text-[12px] text-[#6b7280] font-[500] mb-[14px]">
                    CP: 13.01% &times; IPRF: {iprf.toFixed(1)} &times; PR: {pr.toFixed(3)}
                  </div>
                  
                  <div className="rounded-[8px] p-[12px] text-[20px] font-[800] w-full text-center text-white mb-[8px]" style={{ background: iprfColor(iprf) }}>
                    {award}
                  </div>
                  <div className="text-[11px] font-[600] text-[#6b7280]">
                    Gross STIP Award %
                  </div>
                </div>
              </div>

              {isCEOApproved && (
                <button className="w-full bg-[#059669] hover:bg-[#047857] text-white font-[800] text-[14px] py-[12px] rounded-[10px] transition-colors shadow-sm flex items-center justify-center gap-[8px]">
                  &#9989; Acknowledge My Result
                </button>
              )}
            </div>
            
          </div>
        </>
      )}
    </div>
  );
}