'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import StipCategoryChart from '../../../components/charts/StipCategoryChart';

export default function ManagerDashboard() {
  const router = useRouter();
  
  const [team, setTeam] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dynamic Quarters State
  const [dbQuarters, setDbQuarters] = useState([]);
  const [activeQuarter, setActiveQuarter] = useState(null);

  const [metrics, setMetrics] = useState({
    financialResilience: 82, operationalEffectiveness: 91, humanCapital: 78,
    safetyEnvironment: 95, reputationalCapital: 88, cpPct: 13.01, bscRawScore: 86.75
  });

  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        setLoading(true);
        
        // Fetch live metrics, team data, appraisals, AND the dynamic Quarters schedule
        const [metricsRes, teamRes, appRes, qtrRes] = await Promise.all([
          api.get('/company-metrics/2026').catch(() => ({ data: { data: null } })),
          api.get('/users/my-team').catch(() => ({ data: { data: [] } })),
          api.get('/appraisals').catch(() => ({ data: { data: [] } })),
          api.get('/quarters').catch(() => ({ data: { data: [] } }))
        ]);

        if (metricsRes.data?.data) {
          setMetrics(metricsRes.data.data);
        }

        const myTeam = teamRes.data?.data || [];
        setTeam(myTeam);

        const myAppraisals = appRes.data?.data || [];
        setDrafts(myAppraisals.filter(a => a.workflow?.status === 'DRAFT'));
        setSubmissions(myAppraisals.filter(a => a.workflow?.status && a.workflow?.status !== 'DRAFT'));

        // Configure Dynamic Quarters
        const fetchedQuarters = qtrRes.data?.data || [];
        fetchedQuarters.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        setDbQuarters(fetchedQuarters);

        // Find the currently active quarter
        const now = new Date();
        const active = fetchedQuarters.find(q => new Date(q.startDate) <= now && new Date(q.endDate) >= now && !q.isLocked);
        setActiveQuarter(active || null);

      } catch (error) {
        console.error('Failed to load manager data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchManagerData();
  }, []);

  const pendingHr = submissions.filter(a => a.workflow?.status === 'SUBMITTED').length;
  const approved = submissions.filter(a => a.workflow?.status === 'APPROVED' || a.workflow?.status === 'APPROVED_BY_HR').length; 
  const epRated = submissions.filter(a => a.calculatedResults?.finalIprfScore >= 1.3).length;

  const { cpPct, bscRawScore, financialResilience, operationalEffectiveness, humanCapital, safetyEnvironment, reputationalCapital } = metrics;

  const awNIf = cpPct !== null ? `${cpPct.toFixed(2)}% × 0.7 × Pro-Rata` : 'CP% × 0.7 × Pro-Rata';
  const awEf = cpPct !== null ? `${cpPct.toFixed(2)}% × 1.0 × Pro-Rata` : 'CP% × 1.0 × Pro-Rata';
  const awEPf = cpPct !== null ? `${cpPct.toFixed(2)}% × 1.3 × Pro-Rata` : 'CP% × 1.3 × Pro-Rata';
  
  const awNI = cpPct !== null ? (cpPct * 0.7).toFixed(2) + '%' : '—';
  const awE = cpPct !== null ? (cpPct * 1.0).toFixed(2) + '%' : '—';
  const awEP = cpPct !== null ? (cpPct * 1.3).toFixed(2) + '%' : '—';

  const recentActivity = [...submissions, ...drafts]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 3);

  let daysRemainingText = "No active deadlines";
  if (activeQuarter) {
    const end = new Date(activeQuarter.endDate);
    const now = new Date();
    const diffTime = Math.abs(end - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    daysRemainingText = `${diffDays} days remaining`;
  }

  if (loading) return <div className="text-center p-20 text-[#6b7280]">Loading real-time manager dashboard...</div>;

  return (
    <div className="w-full max-w-full pb-10">
      <div className="mb-[22px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">Dashboard</div>
        <div className="text-[13px] text-[#6b7280]">Real-time STIP program overview</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[12px] mb-[16px]">
        
        {/* Navy Card: CP Score */}
        <div className="rounded-[14px] p-[16px_18px] bg-[#0D2B55] text-white min-w-0">
          <div className="text-[9px] font-[700] uppercase tracking-[.08em] mb-[8px] text-white/50">Company Performance</div>
          <div className="text-[30px] font-[800] leading-[1] text-[#e8c96a]">{cpPct.toFixed(2)}%</div>
          <div className="text-[11px] mt-[5px] text-white/50">BSC Score: {bscRawScore.toFixed(2)} / 100</div>
          <div className="mt-[8px] h-[5px] bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#C9A84C] rounded-full transition-all duration-[0.6s]" style={{ width: `${bscRawScore}%` }}></div>
          </div>
          <div className="text-[10px] mt-[5px] text-white/35">Max cap 15% &middot; Board approved</div>
        </div>

        {/* White Card: Total Staff */}
        <div className="rounded-[14px] p-[16px_18px] bg-white border border-[#E2DDD4] min-w-0">
          <div className="text-[9px] font-[700] uppercase tracking-[.08em] mb-[8px] text-[#6b7280]">My Direct Reports</div>
          <div className="text-[30px] font-[800] leading-[1] text-[#0D2B55]">{team.length}</div>
          <div className="text-[11px] mt-[5px] text-[#6b7280]">STIP-eligible employees assigned to you</div>
          <div className="flex gap-[5px] mt-[8px] flex-wrap">
            {['FSM', 'CDU', 'NAR', 'GUM'].map(code => {
               const count = team.filter(t => t.companyCode === code).length;
               if (count === 0) return null;
               const bg = code === 'FSM' ? 'bg-[#DBEAFE] text-[#1E40AF]' : code === 'CDU' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEF3C7] text-[#92400E]';
               return <span key={code} className={`text-[10px] font-[700] px-[7px] py-[2px] rounded-full ${bg}`}>{code} {count}</span>
            })}
          </div>
        </div>

        {/* White Card: EP Rated */}
        <div className="rounded-[14px] p-[16px_18px] bg-white border border-[#E2DDD4] min-w-0">
          <div className="text-[9px] font-[700] uppercase tracking-[.08em] mb-[8px] text-[#6b7280]">My EP Rated Staff</div>
          <div className="flex items-baseline gap-[5px]">
            <div className="text-[30px] font-[800] leading-[1] text-[#1E40AF]">{epRated}</div>
            <div className="text-[13px] text-[#6b7280] font-[600]">/ 9 max</div>
          </div>
          <div className="text-[11px] mt-[5px] text-[#6b7280]">Cap = 5% of total company staff</div>
          <div className="mt-[8px] h-[7px] bg-[#DBEAFE] rounded-full overflow-hidden">
            <div className="h-full bg-[#1E40AF] rounded-full transition-all duration-[0.5s]" style={{ width: Math.min(100, epRated / 9 * 100) + '%' }}></div>
          </div>
          <div className="text-[10px] mt-[4px] text-[#6b7280]">{epRated} of 9 slots used</div>
        </div>

        {/* White Card: Pending Approvals */}
        <div className="rounded-[14px] p-[16px_18px] bg-white border border-[#E2DDD4] min-w-0">
          <div className="text-[9px] font-[700] uppercase tracking-[.08em] mb-[8px] text-[#6b7280]">My Approvals</div>
          <div className="text-[30px] font-[800] leading-[1] text-[#92400E]">{pendingHr}</div>
          <div className="text-[11px] mt-[5px] text-[#6b7280]">Awaiting HR action</div>
          <div className="flex gap-[6px] mt-[8px]">
            <div className="flex-1 bg-[#FEF3C7] rounded-[7px] p-[5px_8px] text-center">
              <div className="text-[14px] font-[700] text-[#92400E]">{pendingHr}</div>
              <div className="text-[9px] text-[#92400E] mt-[1px]">At HR</div>
            </div>
            <div className="flex-1 bg-[#D1FAE5] rounded-[7px] p-[5px_8px] text-center">
              <div className="text-[14px] font-[700] text-[#065F46]">{approved}</div>
              <div className="text-[9px] text-[#065F46] mt-[1px]">Approved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: KPA Progress & Award Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] mb-[16px]">
        
        {/* Balanced Scorecard */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden min-w-0">
          <div className="p-[13px_16px] border-b border-[#E2DDD4] flex items-center gap-[9px]">
            <div className="w-[28px] h-[28px] rounded-[7px] bg-[#EFF6FF] flex items-center justify-center text-[13px] shrink-0">&#128200;</div>
            <div>
              <div className="text-[13px] font-[700] text-[#0D2B55]">Balanced Scorecard &mdash; KPA Progress</div>
              <div className="text-[11px] text-[#6b7280]">Live Company performance vs targets</div>
            </div>
          </div>
          <div className="p-[14px_16px] flex flex-col gap-[11px]">
            
            <div>
              <div className="flex justify-between items-center mb-[4px] gap-[8px]">
                <span className="text-[12px] font-[600] text-[#0f1923] truncate flex-1">Financial Resilience</span>
                <div className="flex items-center gap-[8px] shrink-0">
                  <span className="text-[10px] text-[#6b7280]">Wt: 14%</span>
                  <span className="text-[12px] font-[800] text-[#3B82F6]">{financialResilience}%</span>
                </div>
              </div>
              <div className="h-[9px] bg-[#F1F0EB] rounded-full overflow-hidden">
                <div className="h-full bg-[#3B82F6] rounded-full transition-all" style={{ width: `${financialResilience}%` }}></div>
              </div>
              <div className="text-[10px] text-[#6b7280] mt-[3px]">Contribution to BSC: <strong className="text-[#0f1923]">{(financialResilience * 0.14).toFixed(2)} pts</strong></div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-[4px] gap-[8px]">
                <span className="text-[12px] font-[600] text-[#0f1923] truncate flex-1">Operational Effectiveness</span>
                <div className="flex items-center gap-[8px] shrink-0">
                  <span className="text-[10px] text-[#6b7280]">Wt: 45%</span>
                  <span className="text-[12px] font-[800] text-[#059669]">{operationalEffectiveness}%</span>
                </div>
              </div>
              <div className="h-[9px] bg-[#F1F0EB] rounded-full overflow-hidden">
                <div className="h-full bg-[#059669] rounded-full transition-all" style={{ width: `${operationalEffectiveness}%` }}></div>
              </div>
              <div className="text-[10px] text-[#6b7280] mt-[3px]">Contribution to BSC: <strong className="text-[#0f1923]">{(operationalEffectiveness * 0.45).toFixed(2)} pts</strong></div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-[4px] gap-[8px]">
                <span className="text-[12px] font-[600] text-[#0f1923] truncate flex-1">Human Capital</span>
                <div className="flex items-center gap-[8px] shrink-0">
                  <span className="text-[10px] text-[#6b7280]">Wt: 26%</span>
                  <span className="text-[12px] font-[800] text-[#F59E0B]">{humanCapital}%</span>
                </div>
              </div>
              <div className="h-[9px] bg-[#F1F0EB] rounded-full overflow-hidden">
                <div className="h-full bg-[#F59E0B] rounded-full transition-all" style={{ width: `${humanCapital}%` }}></div>
              </div>
              <div className="text-[10px] text-[#6b7280] mt-[3px]">Contribution to BSC: <strong className="text-[#0f1923]">{(humanCapital * 0.26).toFixed(2)} pts</strong></div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-[4px] gap-[8px]">
                <span className="text-[12px] font-[600] text-[#0f1923] truncate flex-1">Safety & Environment</span>
                <div className="flex items-center gap-[8px] shrink-0">
                  <span className="text-[10px] text-[#6b7280]">Wt: 12%</span>
                  <span className="text-[12px] font-[800] text-[#10B981]">{safetyEnvironment}%</span>
                </div>
              </div>
              <div className="h-[9px] bg-[#F1F0EB] rounded-full overflow-hidden">
                <div className="h-full bg-[#10B981] rounded-full transition-all" style={{ width: `${safetyEnvironment}%` }}></div>
              </div>
              <div className="text-[10px] text-[#6b7280] mt-[3px]">Contribution to BSC: <strong className="text-[#0f1923]">{(safetyEnvironment * 0.12).toFixed(2)} pts</strong></div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-[4px] gap-[8px]">
                <span className="text-[12px] font-[600] text-[#0f1923] truncate flex-1">Reputational Capital</span>
                <div className="flex items-center gap-[8px] shrink-0">
                  <span className="text-[10px] text-[#6b7280]">Wt: 3%</span>
                  <span className="text-[12px] font-[800] text-[#8B5CF6]">{reputationalCapital}%</span>
                </div>
              </div>
              <div className="h-[9px] bg-[#F1F0EB] rounded-full overflow-hidden">
                <div className="h-full bg-[#8B5CF6] rounded-full transition-all" style={{ width: `${reputationalCapital}%` }}></div>
              </div>
              <div className="text-[10px] text-[#6b7280] mt-[3px]">Contribution to BSC: <strong className="text-[#0f1923]">{(reputationalCapital * 0.03).toFixed(2)} pts</strong></div>
            </div>

            <div className="bg-[#0D2B55] rounded-[9px] p-[11px_14px] flex justify-between items-center mt-[4px]">
              <span className="text-[12px] font-[700] text-white/60">BSC Raw Score &rarr; CP%</span>
              <div>
                <span className="text-[20px] font-[800] text-[#e8c96a]">{bscRawScore.toFixed(2)}</span>
                <span className="text-[12px] text-white/50"> / 100 &rarr; </span>
                <span className="text-[16px] font-[800] text-[#e8c96a]">{cpPct.toFixed(2)}%</span>
              </div>
            </div>

          </div>
        </div>

        {/* STIP Award Preview */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden min-w-0">
          <div className="p-[13px_16px] border-b border-[#E2DDD4] flex items-center gap-[9px]">
            <div className="w-[28px] h-[28px] rounded-[7px] bg-[#FFFBEB] flex items-center justify-center text-[13px] shrink-0">&#128176;</div>
            <div>
              <div className="text-[13px] font-[700] text-[#0D2B55]">STIP Award Preview by Rating</div>
              <div className="text-[11px] text-[#6b7280]">CP = {cpPct.toFixed(2)}% &middot; Pro-Rata = 1.000 (full year)</div>
            </div>
          </div>
          <div className="p-[14px_16px] flex flex-col gap-[9px]">
            <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-[10px] p-[12px_14px] flex justify-between items-center gap-[10px]">
              <div className="min-w-0">
                <div className="text-[13px] font-[700] text-[#991B1B]">0.0 &mdash; Less than Satisfactory</div>
                <div className="text-[11px] text-[#991B1B]/75 mt-[2px]">{cpPct.toFixed(2)}% &times; 0.0 &times; Pro-Rata &times; Salary</div>
              </div>
              <div className="text-[22px] font-[800] text-[#991B1B] shrink-0">0.00%</div>
            </div>
            <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-[10px] p-[12px_14px] flex justify-between items-center gap-[10px]">
              <div className="min-w-0">
                <div className="text-[13px] font-[700] text-[#92400E]">0.7 &mdash; Needs Improvement</div>
                <div className="text-[11px] text-[#92400E]/80 mt-[2px]">{awNIf}</div>
              </div>
              <div className="text-[22px] font-[800] text-[#92400E] shrink-0">{awNI}</div>
            </div>
            <div className="bg-[#D1FAE5] border-[2px] border-[#A7F3D0] rounded-[10px] p-[12px_14px] flex justify-between items-center gap-[10px]">
              <div className="min-w-0">
                <div className="text-[13px] font-[700] text-[#065F46]">1.0 &mdash; Fully Effective</div>
                <div className="text-[11px] text-[#065F46]/80 mt-[2px]">{awEf}</div>
              </div>
              <div className="text-[22px] font-[800] text-[#065F46] shrink-0">{awE}</div>
            </div>
            <div className="bg-[#DBEAFE] border border-[#BFDBFE] rounded-[10px] p-[12px_14px] flex justify-between items-center gap-[10px]">
              <div className="min-w-0">
                <div className="text-[13px] font-[700] text-[#1E40AF]">1.3 &mdash; Exceeds Performance</div>
                <div className="text-[11px] text-[#1E40AF]/80 mt-[2px]">{awEPf}</div>
              </div>
              <div className="text-[22px] font-[800] text-[#1E40AF] shrink-0">{awEP}</div>
            </div>
            <div className="text-[11px] text-[#6b7280] bg-[#FAF8F4] p-[9px_12px] rounded-[8px] mt-[1px] leading-[1.6]">
              &#8505; Final STIP Pay = Award% &times; Pro-Rata &times; Base Salary. Pro-Rata adjusts for mid-year joiners. All figures gross &mdash; subject to income tax.
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
        
        {/* My Appraisal Activity */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden min-w-0 flex flex-col">
          <div className="p-[13px_16px] border-b border-[#E2DDD4] flex items-center justify-between gap-[9px]">
            <div className="flex items-center gap-[9px]">
              <div className="w-[28px] h-[28px] rounded-[7px] bg-[#EDE9FE] flex items-center justify-center text-[13px] shrink-0">&#128203;</div>
              <div>
                <div className="text-[13px] font-[700] text-[#0D2B55]">My Appraisal Activity</div>
                <div className="text-[11px] text-[#6b7280]">Submissions, drafts &amp; status</div>
              </div>
            </div>
            <button 
              className="p-[6px_14px] text-[12px] font-[700] bg-[#0D2B55] text-white border-none rounded-[8px] cursor-pointer hover:bg-[#1a3d6e] transition-colors"
              onClick={() => router.push('/dashboard/manager/new')}
            >
              + New
            </button>
          </div>
          <div className="p-[14px_16px] flex flex-col flex-1">
            <div className="grid grid-cols-3 gap-[8px] mb-[12px]">
              <div className="bg-[#FAF8F4] rounded-[10px] p-[11px] text-center border border-[#E2DDD4]">
                <div className="text-[24px] font-[800] text-[#0D2B55]">{submissions.length}</div>
                <div className="text-[10px] text-[#6b7280] mt-[3px] font-[600]">Submitted</div>
              </div>
              <div className="bg-[#FAF8F4] rounded-[10px] p-[11px] text-center border border-[#E2DDD4]">
                <div className="text-[24px] font-[800] text-[#1E40AF]">{drafts.length}</div>
                <div className="text-[10px] text-[#6b7280] mt-[3px] font-[600]">Drafts</div>
              </div>
              <div className="bg-[#FAF8F4] rounded-[10px] p-[11px] text-center border border-[#E2DDD4]">
                <div className="text-[24px] font-[800] text-[#065F46]">{approved}</div>
                <div className="text-[10px] text-[#6b7280] mt-[3px] font-[600]">Approved</div>
              </div>
            </div>
            
            <div className="text-[11px] font-[700] text-[#6b7280] uppercase tracking-[.06em] mb-[7px]">Recent Activity</div>
            
            <div className="flex flex-col gap-[6px] flex-1">
              {recentActivity.length === 0 ? (
                <div className="text-center p-[18px] text-[#6b7280] text-[12px] bg-[#FAF8F4] rounded-[8px]">
                  No activity yet &mdash; start by creating an appraisal
                </div>
              ) : (
                recentActivity.map((a, i) => (
                  <div key={i} className="flex justify-between items-center p-[8px_12px] bg-[#FAF8F4] rounded-[8px] border border-[#E2DDD4]/50">
                    <div>
                      <div className="text-[12px] font-[600] text-[#0f1923]">
                        {a.employeeId?.personalDetails?.firstName} {a.employeeId?.personalDetails?.lastName}
                      </div>
                      <div className="text-[10px] text-[#6b7280] mt-[1px]">Updated {new Date(a.updatedAt || a.createdAt).toLocaleDateString()}</div>
                    </div>
                    <span className="text-[10px] font-[600] bg-[#E2DDD4]/40 text-[#0f1923] px-[6px] py-[2px] rounded-md border border-[#E2DDD4]">
                      {a.workflow?.status?.replace(/_/g, ' ') || 'UNKNOWN'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-[10px] flex gap-[8px] pt-[4px]">
              <button 
                className="flex-1 p-[8px] text-[12px] font-[600] bg-white text-[#0D2B55] border-[1.5px] border-[#E2DDD4] rounded-[8px] cursor-pointer hover:border-[#0D2B55] transition-colors"
                onClick={() => router.push('/dashboard/manager/submissions')}
              >
                View Submissions
              </button>
              <button 
                className="flex-1 p-[8px] text-[12px] font-[600] bg-white text-[#0D2B55] border-[1.5px] border-[#E2DDD4] rounded-[8px] cursor-pointer hover:border-[#0D2B55] transition-colors"
                onClick={() => router.push('/dashboard/manager/drafts')}
              >
                View Drafts
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic DB Deadlines */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden min-w-0">
          <div className="p-[13px_16px] border-b border-[#E2DDD4] flex items-center gap-[9px]">
            <div className="w-[28px] h-[28px] rounded-[7px] bg-[#FFF7ED] flex items-center justify-center text-[13px] shrink-0">&#128197;</div>
            <div>
              <div className="text-[13px] font-[700] text-[#0D2B55]">Live Appraisal Deadlines</div>
              <div className="text-[11px] text-[#6b7280]">All quarters &middot; Submit before deadline date</div>
            </div>
          </div>
          <div className="p-[14px_16px]">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-[700] text-[#6b7280] uppercase tracking-[.06em] pb-[8px] border-b border-[#E2DDD4]">Quarter</th>
                  <th className="text-left text-[10px] font-[700] text-[#6b7280] uppercase tracking-[.06em] pb-[8px] border-b border-[#E2DDD4]">Year</th>
                  <th className="text-center text-[10px] font-[700] text-[#6b7280] uppercase tracking-[.06em] pb-[8px] border-b border-[#E2DDD4]">Deadline</th>
                  <th className="text-center text-[10px] font-[700] text-[#6b7280] uppercase tracking-[.06em] pb-[8px] border-b border-[#E2DDD4]">Status</th>
                </tr>
              </thead>
              <tbody>
                {dbQuarters.length === 0 ? (
                  <tr><td colSpan="4" className="text-center p-4 text-gray-500">No timeline data available.</td></tr>
                ) : (
                  dbQuarters.map(q => {
                    const now = new Date();
                    const exp = now > new Date(q.endDate);
                    const isActive = q._id === activeQuarter?._id;
                    const isLocked = q.isLocked || (exp && !q.forceUnlock);
                    
                    let bgRow = '';
                    let textClass = 'text-[#6b7280]';
                    let statusBadge = <span className="bg-[#E2DDD4] text-[#6b7280] text-[11px] font-[700] p-[2px_10px] rounded-full whitespace-nowrap">Upcoming</span>;
                    
                    if (isLocked) {
                      bgRow = 'bg-[#F0FDF4]';
                      textClass = 'text-[#065F46]';
                      statusBadge = <span className="bg-[#D1FAE5] text-[#065F46] text-[11px] font-[700] p-[2px_10px] rounded-full whitespace-nowrap">&#10003; Locked</span>;
                    } else if (isActive || q.forceUnlock) {
                      bgRow = 'bg-[#FFFBEB] outline outline-[1.5px] outline-[#FDE68A] outline-offset-[-1px] rounded-[6px]';
                      textClass = 'text-[#92400E]';
                      statusBadge = <span className="bg-[#FEF3C7] text-[#92400E] text-[11px] font-[700] p-[2px_10px] rounded-full whitespace-nowrap">&#9200; {q.forceUnlock && exp ? 'Override' : 'Active'}</span>;
                    }

                    return (
                      <tr key={q._id} className={bgRow}>
                        <td className={`p-[9px_8px] font-[700] ${textClass} rounded-l-[6px]`}>{q.name}</td>
                        <td className="p-[9px_8px] text-[#0f1923]">{q.year}</td>
                        <td className={`p-[9px_8px] text-center font-[700] ${textClass}`}>{new Date(q.endDate).toLocaleDateString()}</td>
                        <td className="p-[9px_8px] text-center rounded-r-[6px]">{statusBadge}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div className="mt-[12px] bg-[#0D2B55] rounded-[9px] p-[10px_14px] flex items-center justify-between">
              <span className="text-[12px] text-white/60">{activeQuarter ? `${activeQuarter.name} closes in` : 'System Status'}</span>
              <span className="text-[14px] font-[700] text-[#e8c96a]">{daysRemainingText}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Full Width Bottom Chart */}
      <div className="mt-6">
         <StipCategoryChart scope="team" />
      </div>

    </div>
  );
}