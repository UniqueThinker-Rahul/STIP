'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import StipCategoryChart from '../../../../components/charts/StipCategoryChart';
import usePersistentFilter from '../../../../hooks/usePersistentFilter';

const KPAS = [
  { name: 'Financial Resilience', wt: 13.5, maxPoints: 120, color: '#3B82F6' },
  { name: 'Operational Effectiveness', wt: 45.1, maxPoints: 400, color: '#059669' },
  { name: 'Human Capital', wt: 25.9, maxPoints: 230, color: '#F59E0B' },
  { name: 'Safety & Environment', wt: 12.4, maxPoints: 110, color: '#10B981' },
  { name: 'Reputational Capital', wt: 3.0, maxPoints: 27, color: '#8B5CF6' }
];

export default function KPAScorecard() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kpaActuals, setKpaActuals] = useState([null, null, null, null, null]);
  const [locked, setLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState('');
  const [lockedAt, setLockedAt] = useState('');
  const [successModal, setSuccessModal] = useState({ show: false, icon: '', title: '', detail: '' });
  const [lockModal, setLockModal] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // 🚨 UPGRADED: Both filters are now properly persistent with unique keys
  const [selectedYear, setSelectedYear] = usePersistentFilter('kpa_selected_year', new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = usePersistentFilter('kpa_selected_quarter', '');

  const [availableQuarters, setAvailableQuarters] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDynamicQuarters = async () => {
      setLoading(true);
      try {
        const res = await api.get('/quarters?all=true').catch(() => ({ data: { data: [] } }));
        const allQuarters = res.data?.data || [];
        
        const yearData = allQuarters.filter(q => q.year === selectedYear);
        
        if (yearData.length > 0) {
          const mapped = yearData.map(q => {
            const valMatch = q.name.match(/Q([1-4])/i);
            const val = valMatch ? parseInt(valMatch[1]) : 1;
            return { val, label: `Q${val}`, isPublished: q.isPublished || false }; 
          });

          const uniqueQuarters = [];
          const map = new Map();
          for (const item of mapped) {
              if(!map.has(item.val)){
                  map.set(item.val, item);
                  uniqueQuarters.push(item);
              }
          }
          uniqueQuarters.sort((a, b) => a.val - b.val);
          
          setAvailableQuarters(uniqueQuarters);
          
          setSelectedQuarter((prevQ) => {
             // 🚨 UPGRADED: Type-safe check ensures localStorage strings are evaluated as integers correctly
             const safePrevQ = prevQ ? parseInt(prevQ) : null;
             if (!uniqueQuarters.some(m => m.val === safePrevQ)) {
               return uniqueQuarters[uniqueQuarters.length - 1].val;
             }
             return safePrevQ;
          });
        } else {
          setAvailableQuarters([]);
        }
      } catch (err) {
        console.error("Failed to fetch available quarters from DB", err);
        setAvailableQuarters([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDynamicQuarters();
  }, [selectedYear]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedQuarter || availableQuarters.length === 0) {
         setLoading(false);
         setKpaActuals([null, null, null, null, null]);
         setLocked(false);
         return; 
      }
      try {
        setLoading(true);
        const targetMonth = selectedQuarter * 3;
        
        const [metricsRes, qtrRes] = await Promise.all([
           api.get(`/company-metrics/${selectedYear}/${targetMonth}`).catch(() => ({ data: { data: null } })),
           api.get(`/quarterly-scorecards/${selectedYear}`).catch(() => ({ data: { data: [] } }))
        ]);

        const metrics = metricsRes.data?.data;
        const qtrMatch = (qtrRes.data?.data || []).find(d => d.quarter === `Q${selectedQuarter}`);
        
        const isMLocked = metrics?.locked || false;
        const isQLocked = qtrMatch?.locked || false;

        if (isMLocked || isQLocked) {
          setLocked(true);
          const lockSource = isMLocked ? metrics : qtrMatch;
          if (lockSource.lockedAt) {
            setLockedAt(new Date(lockSource.lockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
          }
          if (lockSource.lockedBy) {
            setLockedBy(lockSource.lockedBy.personalDetails ? `${lockSource.lockedBy.personalDetails.firstName} ${lockSource.lockedBy.personalDetails.lastName}` : 'System Admin');
          }
        } else {
          setLocked(false);
          setLockedAt('');
          setLockedBy('');
        }

        if (metrics) {
          const format2Dec = (v) => v !== null && v !== undefined && v !== '' ? Number(parseFloat(v).toFixed(2)) : null;
          setKpaActuals([
            format2Dec(metrics.financialResilience),
            format2Dec(metrics.operationalEffectiveness),
            format2Dec(metrics.humanCapital),
            format2Dec(metrics.safetyEnvironment),
            format2Dec(metrics.reputationalCapital)
          ]);
        } else {
          setKpaActuals([null, null, null, null, null]);
        }
      } catch (error) {
        console.error('Failed to load KPA data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedYear, selectedQuarter, availableQuarters.length, saving]);

  const isCurrentYear = selectedYear === currentTime.getFullYear();
  const isEntryDisabled = locked || !isCurrentYear || availableQuarters.length === 0;

  const handleInput = (idx, val) => {
    if (isEntryDisabled) return;
    const v = val === '' ? null : Math.min(100, Math.max(0, parseFloat(val) || 0));
    const newArr = [...kpaActuals];
    newArr[idx] = v !== null ? Math.round(v * 100) / 100 : null;
    setKpaActuals(newArr);
  };

  const handleBlur = (idx) => {
    if (kpaActuals[idx] !== null && kpaActuals[idx] !== '') {
      const newArr = [...kpaActuals];
      newArr[idx] = Number(parseFloat(newArr[idx]).toFixed(2));
      setKpaActuals(newArr);
    }
  };

  let bscRaw = null;
  let cpPct = null;
  let safeCpPct = null; 
  let tierPct = null;
  const anyKpaEntered = kpaActuals.some(v => v !== null);
  
  if (anyKpaEntered) {
    bscRaw = kpaActuals.reduce((sum, val, idx) => {
      const pts = ((val || 0) / 100) * KPAS[idx].maxPoints;
      return sum + Number(pts.toFixed(1)); 
    }, 0);
    
    cpPct = bscRaw / 100;

    safeCpPct = Math.round((cpPct + Number.EPSILON) * 100) / 100;

    const currentMaxCp = 8.87;
    if (safeCpPct >= currentMaxCp) tierPct = 15;
    else if (safeCpPct >= currentMaxCp * 0.8) tierPct = 10;
    else if (safeCpPct >= currentMaxCp * 0.48) tierPct = 5;
    else tierPct = 0;
  }

  const handleSave = async () => {
    if (!isCurrentYear) {
       return alert("You can only save scores for quarters within the current active financial year.");
    }
    try {
      setSaving(true);
      const targetMonth = selectedQuarter * 3;
      const payload = {
        reviewYear: selectedYear,
        reviewMonth: targetMonth, 
        financialResilience: kpaActuals[0],
        operationalEffectiveness: kpaActuals[1],
        humanCapital: kpaActuals[2],
        safetyEnvironment: kpaActuals[3],
        reputationalCapital: kpaActuals[4],
        bscRawScore: bscRaw,
        cpPct: cpPct, 
        locked: false
      };
      
      await api.post('/company-metrics', payload);
      
      const filled = kpaActuals.filter(v => v !== null).length;
      setSuccessModal({
        show: true,
        icon: '💾',
        title: 'KPA Scores Saved',
        detail: `${filled} of 5 KPA scores saved for ${availableQuarters.find(q=>q.val===selectedQuarter)?.label || `Q${selectedQuarter}`} ${selectedYear}. ${5 - filled > 0 ? 'Enter the remaining ' + (5 - filled) + ' scores before locking.' : 'All scores entered — ready to lock when Board approves.'}`
      });
    } catch (error) {
      alert("Failed to save KPA scores");
    } finally {
      setSaving(false);
    }
  };

  const attemptLock = () => {
    if (!isCurrentYear) {
      return alert("You can only lock scores for quarters within the current active financial year.");
    }
    const allFilled = kpaActuals.every(v => v !== null);
    if (!allFilled) {
      alert('Please enter all 5 KPA scores before locking.');
      return;
    }
    setLockModal(true);
  };

  const confirmLock = async () => {
    try {
      setSaving(true);
      const targetMonth = selectedQuarter * 3;
      const payload = {
        reviewYear: selectedYear,
        reviewMonth: targetMonth, 
        financialResilience: kpaActuals[0],
        operationalEffectiveness: kpaActuals[1],
        humanCapital: kpaActuals[2],
        safetyEnvironment: kpaActuals[3],
        reputationalCapital: kpaActuals[4],
        bscRawScore: bscRaw,
        cpPct: cpPct,
        locked: true
      };
      
      await api.post('/company-metrics', payload);
      
      await api.post(`/quarterly-scorecards/${selectedYear}/Q${selectedQuarter}`, {
         locked: true
      }).catch(err => console.log('Silent fallback if Quarterly Scorecard not yet initialized', err));
      
      setLockModal(false);
      setSuccessModal({
        show: true,
        icon: '🔒',
        title: 'Scorecard Locked',
        detail: `CP for ${availableQuarters.find(q=>q.val===selectedQuarter)?.label || `Q${selectedQuarter}`} ${selectedYear} has been permanently set to ${safeCpPct.toFixed(2)}. The scorecard is now read-only.`
      });
    } catch (error) {
      alert("Failed to lock the scorecard.");
    } finally {
      setSaving(false);
    }
  };

  const currentY = currentTime.getFullYear();
  const yearOptions = [currentY - 2, currentY - 1, currentY, currentY + 1];
  const activeQObj = availableQuarters.find(q => q.val === selectedQuarter);

  if (loading && availableQuarters.length === 0) return <div className="p-10 text-center text-slate-500 animate-pulse font-medium">Loading Scorecard Data...</div>;

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      <div className="bg-[#0D2B55] text-[#e8c96a] text-[11px] font-[800] p-[8px_16px] rounded-t-[8px] flex justify-between items-center mb-0 border-b border-white/10">
         <span className="uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            System Clock:
         </span>
         <span className="font-mono">
            {currentTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} — {currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
         </span>
      </div>

      <div className="bg-white p-[16px_20px] rounded-b-[14px] border border-[#E2DDD4] border-t-0 shadow-sm mb-[20px] flex flex-col md:flex-row justify-between items-start md:items-end gap-[12px]">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
            &#128200; KPA Scorecard Matrix
          </div>
          <div className="text-[13px] text-[#6b7280]">Select the physical period to record or lock KPA scores</div>
        </div>
        
        <div className="flex flex-wrap items-center gap-[10px]">
          <div className="flex items-center gap-[6px] bg-slate-50 border border-[#E2DDD4] p-[4px] rounded-[8px]">
             <select 
               value={selectedQuarter} 
               onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
               className="bg-white border border-[#E2DDD4] p-[6px_10px] rounded-[6px] text-[12px] font-[700] text-[#0D2B55] outline-none cursor-pointer"
               disabled={availableQuarters.length === 0}
             >
                {availableQuarters.length === 0 && <option value="">No Quarters Created</option>}
                {availableQuarters.map(q => (
                   <option key={q.val} value={q.val}>
                     {q.label} {!q.isPublished ? '(Unpublished)' : ''}
                   </option>
                ))}
             </select>
             <select 
               value={selectedYear} 
               onChange={(e) => setSelectedYear(parseInt(e.target.value))}
               className="bg-white border border-[#E2DDD4] p-[6px_10px] rounded-[6px] text-[12px] font-[700] text-[#0D2B55] outline-none cursor-pointer"
             >
                {yearOptions.map(y => (
                   <option key={y} value={y}>{y}</option>
                ))}
             </select>

             {/* Dynamic Publish Status Badge */}
             {activeQObj && (
                <span className={`ml-[2px] px-[8px] py-[4px] rounded-[4px] text-[10px] font-[800] uppercase tracking-wider border ${activeQObj.isPublished ? 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]' : 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]'}`}>
                  {activeQObj.isPublished ? 'Published' : 'Unpublished'}
                </span>
             )}
          </div>

          <button 
            className="bg-white hover:bg-[#FAF8F4] text-[#0f1923] border border-[#E2DDD4] hover:border-[#0D2B55] px-[16px] py-[8px] rounded-[8px] text-[12px] font-[700] transition-colors shadow-sm disabled:opacity-50"
            disabled={isEntryDisabled || saving} 
            onClick={handleSave}
          >
            &#128190; Save Progress
          </button>
          <button 
            className={`px-[16px] py-[8px] rounded-[8px] text-[12px] font-[700] transition-colors shadow-sm ${locked ? 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]' : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white border-none disabled:opacity-50'}`}
            disabled={isEntryDisabled || saving} 
            onClick={attemptLock}
          >
            {locked ? '🔒 Locked' : '🔒 Lock Period'}
          </button>
        </div>
      </div>

      {availableQuarters.length === 0 && !loading && (
        <div className="bg-amber-50 border-[1.5px] border-amber-200 rounded-[10px] p-[14px_16px] mb-[20px] flex items-center gap-[12px] shadow-sm">
          <div className="text-[18px] text-amber-700">&#9888;</div>
          <div className="text-[13px] text-amber-800">There are <strong>no active quarters</strong> created by HR for <strong>{selectedYear}</strong>.</div>
        </div>
      )}

      {!isCurrentYear && !locked && availableQuarters.length > 0 && (
        <div className="bg-amber-50 border-[1.5px] border-amber-200 rounded-[10px] p-[14px_16px] mb-[20px] flex items-center gap-[12px] shadow-sm">
          <div className="text-[18px] text-amber-700">&#9888;</div>
          <div className="text-[13px] text-amber-800">You are viewing <strong>{availableQuarters.find(q=>q.val===selectedQuarter)?.label || `Q${selectedQuarter}`} {selectedYear}</strong>. You can only enter or lock data for quarters within the <strong>current active financial year</strong> ({currentTime.getFullYear()}).</div>
        </div>
      )}

      {locked && (
        <div className="mb-[18px] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#D1FAE5] border-[1.5px] border-[#A7F3D0] rounded-[12px] p-[16px_20px] mb-[14px] flex items-center gap-[16px] shadow-sm">
            <div className="text-[28px] shrink-0">&#128274;</div>
            <div className="flex-1">
              <div className="text-[15px] font-[800] text-[#065F46] mb-[3px]">Scorecard Locked — {availableQuarters.find(q=>q.val===selectedQuarter)?.label || `Q${selectedQuarter}`} {selectedYear}</div>
              <div className="text-[12px] text-[#065F46] leading-[1.6]">
                Locked by: <strong className="font-[800]">{lockedBy || '—'}</strong> &nbsp;|&nbsp; Timestamp: <strong className="font-[800]">{lockedAt || '—'}</strong><br/>
                KPA scores are now <strong className="font-[800]">read-only for everyone</strong> &middot; Award generation unlocked for HR Admin
              </div>
            </div>
          </div>

          <div className="bg-[#FFF7ED] border-[1.5px] border-[#FED7AA] rounded-[12px] p-[16px_20px] mb-[18px] flex items-start gap-[12px] shadow-sm">
            <div className="text-[22px] shrink-0 mt-[2px]">&#8505;</div>
            <div>
              <div className="text-[13px] font-[800] text-[#9A3412] mb-[8px]">How to unlock the scorecard</div>
              <div className="text-[12px] text-[#9A3412] leading-[1.7]">
                The scorecard lock is <strong className="font-[800]">permanent and irreversible through the CEO panel</strong>. This is intentional — it protects the Board-approved CP% from being changed after formal ratification.<br/><br/>
                <strong className="font-[800]">If an unlock is required</strong> (e.g. data entry error before Board ratification):
              </div>
              <div className="mt-[10px] flex flex-col gap-[7px]">
                <div className="flex items-start gap-[10px] bg-white/60 rounded-[8px] p-[10px_12px]">
                  <span className="text-[14px] shrink-0">1️⃣</span>
                  <div className="text-[12px] text-[#9A3412]"><strong className="font-[800]">Contact ICT Admin</strong> — Only the ICT Manager has the authority to reset the scorecard lock via the ICT Admin Panel or direct database access.</div>
                </div>
                <div className="flex items-start gap-[10px] bg-white/60 rounded-[8px] p-[10px_12px]">
                  <span className="text-[14px] shrink-0">2️⃣</span>
                  <div className="text-[12px] text-[#9A3412]"><strong className="font-[800]">Board re-approval required</strong> — Any unlock must be accompanied by a formal Board decision to revise the CP%. The revised figures must be re-approved before re-locking.</div>
                </div>
                <div className="flex items-start gap-[10px] bg-white/60 rounded-[8px] p-[10px_12px]">
                  <span className="text-[14px] shrink-0">3️⃣</span>
                  <div className="text-[12px] text-[#9A3412]"><strong className="font-[800]">Audit trail updated</strong> — All unlock and re-lock actions are recorded in the system audit log with timestamps and user IDs for governance compliance.</div>
                </div>
              </div>
              <div className="mt-[12px] p-[10px_12px] bg-white/50 rounded-[8px] border-l-[3px] border-[#FB923C]">
                <div className="text-[11px] text-[#7C2D12] leading-[1.6]">
                  &#128231; <strong className="font-[800]">To request an unlock:</strong> Contact the ICT Manager directly and provide written justification. The ICT Manager will coordinate with the Board and HR before proceeding.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCurrentYear && !locked && availableQuarters.length > 0 && (
        <div className="bg-[#FEF2F2] border-[1.5px] border-[#FECACA] rounded-[10px] p-[14px_16px] mb-[20px] flex items-center gap-[12px] shadow-sm">
          <div className="text-[18px] text-[#991B1B]">&#9888;</div>
          <div className="text-[13px] text-[#991B1B]">Locking is <strong className="font-[800]">permanent and irreversible</strong>. Once locked, KPA scores cannot be edited by anyone. Only lock after Board approval.</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-[20px]">
        
        {/* KPA Entry Card */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center">
            <div className="flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[14px]">&#127919;</div>
              <div>
                <div className="text-[14px] font-[800] text-[#0D2B55]">Enter KPA Actual Scores</div>
                <div className="text-[11px] text-[#6b7280]">Type the actual performance % achieved for each KPA (0–100)</div>
              </div>
            </div>
            <span className={`text-[10px] font-[800] px-[10px] py-[4px] rounded-full border ${locked ? 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]' : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'}`}>
              {locked ? '🔒 Locked' : '🔓 Unlocked'}
            </span>
          </div>
          
          <div className="p-[20px] flex-1">
            {/* Table Header */}
            <div className="flex items-center pb-[8px] border-b-[2px] border-[#0D2B55] mb-[12px]">
              <span className="flex-1 text-[10px] font-[800] text-[#6b7280] uppercase tracking-[.07em]">KPA Area</span>
              <span className="w-[80px] text-[10px] font-[800] text-[#1E40AF] uppercase tracking-[.07em] text-center">Weight</span>
              <span className="w-[120px] text-[10px] font-[800] text-[#0D2B55] uppercase tracking-[.07em] text-center pl-[10px]">Actual %</span>
              <span className="w-[120px] text-[10px] font-[800] text-[#059669] uppercase tracking-[.07em] text-center">Pts Earned</span>
            </div>
            
            {/* Rows */}
            <div className="flex flex-col gap-[12px]">
              {KPAS.map((k, i) => (
                <div className="flex items-center p-[10px_0] border-b border-[#E2DDD4]/50" key={i}>
                  <div className="flex-1 pr-[20px]">
                    <div className="text-[13px] font-[700] text-[#0f1923] mb-[6px]">{k.name}</div>
                    <div className="h-[6px] bg-[#E2DDD4] rounded-full overflow-hidden w-[80%]">
                      <div className="h-full rounded-full transition-all duration-[400ms]" style={{ width: `${kpaActuals[i] || 0}%`, background: k.color }}></div>
                    </div>
                  </div>
                  <div className="w-[80px] text-center text-[15px] font-[800] text-[#1E40AF]">{k.wt}%</div>
                  <div className="w-[120px] pl-[10px]">
                    <input 
                      className="w-full bg-[#FAF8F4] border-[1.5px] border-[#E2DDD4] rounded-[8px] p-[8px] text-center text-[15px] font-[800] text-[#0D2B55] outline-none focus:border-[#0D2B55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                      type="number" min="0" max="100" step="0.01" 
                      value={kpaActuals[i] !== null ? kpaActuals[i] : ''}
                      placeholder="0.00" 
                      disabled={isEntryDisabled}
                      onChange={(e) => handleInput(i, e.target.value)}
                      onBlur={() => handleBlur(i)} 
                    />
                  </div>
                  <div className="w-[120px] text-center text-[15px] font-[800] text-[#059669]">
                    {kpaActuals[i] !== null ? (((kpaActuals[i] / 100) * k.maxPoints).toFixed(1)) : ' — '}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Strip */}
            <div className="mt-[24px] bg-[#FAF8F4] border-[1.5px] border-[#E2DDD4] rounded-[12px] p-[16px] flex flex-col md:flex-row justify-between items-center gap-[16px]">
              <div>
                <div className="text-[12px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">BSC Raw Score &rarr; Final CP</div>
                <div className="text-[24px] font-[800] text-[#0D2B55] leading-none mb-[6px]">
                  {cpPct !== null ? `${bscRaw.toFixed(1)} / 887 → ${safeCpPct.toFixed(2)}` : '—'}
                </div>
                <div className="text-[11px] text-[#6b7280]">Enter all 5 KPA scores to calculate &middot; Max CP cap: 8.87</div>
              </div>
              <div className="flex gap-[6px]">
                <div className="bg-white border border-[#E2DDD4] rounded-[8px] p-[8px_12px] text-center min-w-[70px] shadow-sm">
                  <div className="text-[14px] font-[800] text-[#92400E] leading-none mb-[4px]">{tierPct !== null ? (tierPct * 0.7).toFixed(2) + '%' : '—'}</div>
                  <div className="text-[9px] font-[800] text-[#6b7280] uppercase tracking-wider">NI Award</div>
                </div>
                <div className="bg-white border border-[#E2DDD4] rounded-[8px] p-[8px_12px] text-center min-w-[70px] shadow-sm">
                  <div className="text-[14px] font-[800] text-[#065F46] leading-none mb-[4px]">{tierPct !== null ? tierPct.toFixed(2) + '%' : '—'}</div>
                  <div className="text-[9px] font-[800] text-[#6b7280] uppercase tracking-wider">E Award</div>
                </div>
                <div className="bg-white border border-[#E2DDD4] rounded-[8px] p-[8px_12px] text-center min-w-[70px] shadow-sm">
                  <div className="text-[14px] font-[800] text-[#1E40AF] leading-none mb-[4px]">{tierPct !== null ? (tierPct * 1.3).toFixed(2) + '%' : '—'}</div>
                  <div className="text-[9px] font-[800] text-[#6b7280] uppercase tracking-wider">EP Award</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-[16px]">
          
          {/* Formula Card */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[14px]">&#129518;</div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">CP Formula</div>
            </div>
            <div className="p-[16px]">
              <div className="bg-[#0D2B55] rounded-[9px] p-[12px_14px] font-mono text-[12px] text-[#e8c96a] leading-[1.8] mb-[16px]">
                BSC = &Sigma;(Actual % &times; Max Pts)<br/>
                <span className="text-white/40">CP = BSC &divide; 100</span>
              </div>
              <div className="flex flex-col gap-[12px]">
                <div className="flex justify-between items-center pb-[8px] border-b border-[#E2DDD4]">
                  <span className="text-[12px] font-[600] text-[#6b7280]">BSC Raw Score</span>
                  <span className="text-[14px] font-[800] text-[#0D2B55]">{cpPct !== null ? bscRaw.toFixed(1) : '—'}</span>
                </div>
                <div className="flex justify-between items-center pb-[8px] border-b border-[#E2DDD4]">
                  <span className="text-[12px] font-[600] text-[#6b7280]">Max CP Cap</span>
                  <span className="text-[14px] font-[800] text-[#92400E]">8.87</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-[600] text-[#6b7280]">Final CP</span>
                  <span className="text-[16px] font-[800] text-[#065F46]">{cpPct !== null ? safeCpPct.toFixed(2) : '—'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Live Award Preview Card */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center">
              <div className="flex items-center gap-[10px]">
                <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FFFBEB] flex items-center justify-center text-[14px]">&#128176;</div>
                <div>
                  <div className="text-[14px] font-[800] text-[#0D2B55]">Live Award Preview</div>
                  <div className="text-[11px] text-[#6b7280]">Updates as you type</div>
                </div>
              </div>
            </div>
            <div className="p-[16px] flex flex-col gap-[10px]">
              <div className="flex justify-between items-center pb-[8px] border-b border-[#E2DDD4]">
                <span className="text-[12px] font-[700] text-[#991B1B]">LS (0.0)</span>
                <span className="text-[14px] font-[800] text-[#991B1B]">0.00%</span>
              </div>
              <div className="flex justify-between items-center pb-[8px] border-b border-[#E2DDD4]">
                <span className="text-[12px] font-[700] text-[#92400E]">NI (0.7)</span>
                <span className="text-[14px] font-[800] text-[#92400E]">{tierPct !== null ? (tierPct * 0.7).toFixed(2) + '%' : '—'}</span>
              </div>
              <div className="flex justify-between items-center pb-[8px] border-b border-[#E2DDD4]">
                <span className="text-[12px] font-[700] text-[#065F46]">E (1.0)</span>
                <span className="text-[14px] font-[800] text-[#065F46]">{tierPct !== null ? tierPct.toFixed(2) + '%' : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-[700] text-[#1E40AF]">EP (1.3)</span>
                <span className="text-[14px] font-[800] text-[#1E40AF]">{tierPct !== null ? (tierPct * 1.3).toFixed(2) + '%' : '—'}</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Success Modal */}
      {successModal.show && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[100] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[400px] shadow-2xl p-[32px] text-center slide-in-from-bottom-4">
            <div className="text-[54px] mb-[16px] leading-none">{successModal.icon}</div>
            <h2 className="text-[20px] font-[800] text-[#0D2B55] mb-[8px]">{successModal.title}</h2>
            <div className="text-[13px] text-[#6b7280] mb-[24px] leading-relaxed">{successModal.detail}</div>
            <button 
              className="w-full bg-[#0D2B55] hover:bg-[#1a3d6e] text-white font-[800] text-[14px] py-[12px] rounded-[10px] shadow-sm transition-colors" 
              onClick={() => setSuccessModal({ show: false, icon: '', title: '', detail: '' })}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Lock Confirmation Modal */}
      {lockModal && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[100] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[460px] shadow-2xl overflow-hidden slide-in-from-bottom-4">
            <div className="bg-[#DC2626] p-[16px_22px] flex justify-between items-center">
              <div className="text-[15px] font-[800] text-white flex items-center gap-[8px]">
                <span className="text-[18px]">⚠</span> Confirm Permanent Lock
              </div>
              <button onClick={() => setLockModal(false)} className="bg-white/10 text-white w-[30px] h-[30px] rounded-[8px] flex items-center justify-center hover:bg-white/20 transition-colors">&times;</button>
            </div>
            <div className="p-[30px_22px] text-center">
              <div className="text-[48px] mb-[16px] leading-none">🔒</div>
              <div className="text-[18px] font-[800] text-[#0D2B55] mb-[12px]">Lock {availableQuarters.find(q=>q.val===selectedQuarter)?.label || `Q${selectedQuarter}`} {selectedYear} Scorecard?</div>
              <div className="text-[13px] text-[#6b7280] mb-[24px] leading-relaxed px-[10px]">
                This action is <strong>irreversible</strong> from the CEO panel. 
                Are you absolutely sure the Board has approved the final CP calculation of <strong className="text-[#0D2B55]">{safeCpPct.toFixed(2)}</strong>?
              </div>
              <div className="flex gap-[12px] justify-center">
                <button 
                  onClick={() => setLockModal(false)} 
                  className="p-[12px_20px] rounded-[10px] text-[13px] font-[800] text-[#0f1923] bg-white border-[2px] border-[#E2DDD4] hover:border-[#0D2B55] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmLock} 
                  className="p-[12px_20px] rounded-[10px] text-[13px] font-[800] bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-colors shadow-md flex items-center gap-[6px]"
                >
                  Yes, Lock Scorecard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}