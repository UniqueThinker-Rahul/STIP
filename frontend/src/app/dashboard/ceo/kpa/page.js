'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// 🚨 FIXED: Corrected the relative path to go up 4 levels to access 'lib' and 'components'
import api from '../../../../lib/api';
import StipCategoryChart from '../../../../components/charts/StipCategoryChart';

const KPAS = [
  { name: 'Financial Resilience', wt: 14, color: '#3B82F6' },
  { name: 'Operational Effectiveness', wt: 45, color: '#059669' },
  { name: 'Human Capital', wt: 26, color: '#F59E0B' },
  { name: 'Safety & Environment', wt: 12, color: '#10B981' },
  { name: 'Reputational Capital', wt: 3, color: '#8B5CF6' }
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

  // Fetch initial data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/company-metrics/2026').catch(() => ({ data: { data: null } }));
        const metrics = res.data?.data;
        
        if (metrics) {
          setKpaActuals([
            metrics.financialResilience,
            metrics.operationalEffectiveness,
            metrics.humanCapital,
            metrics.safetyEnvironment,
            metrics.reputationalCapital
          ]);
          setLocked(metrics.locked || false);
          if (metrics.lockedAt) {
            setLockedAt(new Date(metrics.lockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
          }
          if (metrics.lockedBy) {
            setLockedBy('Jared Morris'); // Assuming CEO
          }
        }
      } catch (error) {
        console.error('Failed to load KPA data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Real-time calculations
  const handleInput = (idx, val) => {
    const v = val === '' ? null : Math.min(100, Math.max(0, parseFloat(val) || 0));
    const newArr = [...kpaActuals];
    newArr[idx] = v;
    setKpaActuals(newArr);
  };

  let bscRaw = null;
  let cpPct = null;
  const anyKpaEntered = kpaActuals.some(v => v !== null);
  
  if (anyKpaEntered) {
    // 🚨 FIXED: The * 100 line was removed as it was inflating 100% to 10,000. 
    bscRaw = kpaActuals.reduce((sum, val, idx) => sum + ((val || 0) * (KPAS[idx].wt / 100)), 0);
    
    // CP is BSC * 15% Max Cap
    cpPct = bscRaw * 0.15;
  }

  const awNIf = cpPct ? `CP% × 0.7 × Pro-Rata` : 'CP% × 0.7 × Pro-Rata';
  const awEf = cpPct ? `CP% × 1.0 × Pro-Rata` : 'CP% × 1.0 × Pro-Rata';
  const awEPf = cpPct ? `CP% × 1.3 × Pro-Rata` : 'CP% × 1.3 × Pro-Rata';

  // Save functionality
  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        reviewYear: 2026,
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
        detail: `${filled} of 5 KPA scores saved. ${5 - filled > 0 ? 'Enter the remaining ' + (5 - filled) + ' scores before locking.' : 'All scores entered — ready to lock when Board approves.'}`
      });
    } catch (error) {
      alert("Failed to save KPA scores");
    } finally {
      setSaving(false);
    }
  };

  // Lock functionality
  const attemptLock = () => {
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
      const payload = {
        reviewYear: 2026,
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
      
      setLocked(true);
      setLockedBy('Jared Morris');
      setLockedAt(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
      setLockModal(false);
      
      setSuccessModal({
        show: true,
        icon: '🔒',
        title: 'Scorecard Locked',
        detail: `CP has been permanently set to ${cpPct.toFixed(2)}%. The scorecard is now read-only and HR can process awards.`
      });
    } catch (error) {
      alert("Failed to lock the scorecard.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse font-medium">Loading Scorecard...</div>;

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Page Header */}
      <div className="mb-[20px] flex justify-between items-end">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
            &#128200; KPA Scorecard
          </div>
          <div className="text-[13px] text-[#6b7280]">Enter CY2026 actual performance scores for each KPA area &mdash; CP% auto-calculates</div>
        </div>
        <div className="flex gap-[10px]">
          <button 
            className="bg-white hover:bg-[#FAF8F4] text-[#0f1923] border border-[#E2DDD4] hover:border-[#0D2B55] px-[16px] py-[8px] rounded-[8px] text-[12px] font-[700] transition-colors shadow-sm disabled:opacity-50"
            disabled={locked || saving} 
            onClick={handleSave}
          >
            &#128190; Save Progress
          </button>
          <button 
            className={`px-[16px] py-[8px] rounded-[8px] text-[12px] font-[700] transition-colors shadow-sm ${locked ? 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]' : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white border-none'}`}
            disabled={locked || saving} 
            onClick={attemptLock}
          >
            {locked ? '🔒 Locked' : '🔒 Lock Scorecard'}
          </button>
        </div>
      </div>

      {locked && (
        <div className="mb-[18px] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#D1FAE5] border-[1.5px] border-[#A7F3D0] rounded-[12px] p-[16px_20px] mb-[14px] flex items-center gap-[16px] shadow-sm">
            <div className="text-[28px] shrink-0">&#128274;</div>
            <div className="flex-1">
              <div className="text-[15px] font-[800] text-[#065F46] mb-[3px]">Scorecard Locked — Board Approved</div>
              <div className="text-[12px] text-[#065F46] leading-[1.6]">
                Locked by: <strong className="font-[800]">{lockedBy || '—'}</strong> &nbsp;|&nbsp; Date: <strong className="font-[800]">{lockedAt || '—'}</strong><br/>
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

      {!locked && (
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
              <span className="w-[120px] text-[10px] font-[800] text-[#059669] uppercase tracking-[.07em] text-center">Contribution</span>
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
                      type="number" min="0" max="100" step="0.1"
                      value={kpaActuals[i] !== null ? kpaActuals[i] : ''}
                      placeholder="0–100" 
                      disabled={locked}
                      onChange={(e) => handleInput(i, e.target.value)}
                    />
                  </div>
                  <div className="w-[120px] text-center text-[15px] font-[800] text-[#059669]">
                    {kpaActuals[i] !== null ? ((kpaActuals[i] / 100) * k.wt).toFixed(2) : ' — '}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Strip */}
            <div className="mt-[24px] bg-[#FAF8F4] border-[1.5px] border-[#E2DDD4] rounded-[12px] p-[16px] flex flex-col md:flex-row justify-between items-center gap-[16px]">
              <div>
                <div className="text-[12px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[4px]">BSC Raw Score &rarr; Final CP%</div>
                <div className="text-[24px] font-[800] text-[#0D2B55] leading-none mb-[6px]">
                  {cpPct !== null ? `${bscRaw.toFixed(2)} / 100 → ${cpPct.toFixed(2)}%` : '—'}
                </div>
                <div className="text-[11px] text-[#6b7280]">Enter all 5 KPA scores to calculate &middot; Max cap: 15%</div>
              </div>
              <div className="flex gap-[6px]">
                <div className="bg-white border border-[#E2DDD4] rounded-[8px] p-[8px_12px] text-center min-w-[70px] shadow-sm">
                  <div className="text-[14px] font-[800] text-[#92400E] leading-none mb-[4px]">{cpPct !== null ? (cpPct * 0.7).toFixed(2) + '%' : '—'}</div>
                  <div className="text-[9px] font-[800] text-[#6b7280] uppercase tracking-wider">NI Award</div>
                </div>
                <div className="bg-white border border-[#E2DDD4] rounded-[8px] p-[8px_12px] text-center min-w-[70px] shadow-sm">
                  <div className="text-[14px] font-[800] text-[#065F46] leading-none mb-[4px]">{cpPct !== null ? cpPct.toFixed(2) + '%' : '—'}</div>
                  <div className="text-[9px] font-[800] text-[#6b7280] uppercase tracking-wider">E Award</div>
                </div>
                <div className="bg-white border border-[#E2DDD4] rounded-[8px] p-[8px_12px] text-center min-w-[70px] shadow-sm">
                  <div className="text-[14px] font-[800] text-[#1E40AF] leading-none mb-[4px]">{cpPct !== null ? (cpPct * 1.3).toFixed(2) + '%' : '—'}</div>
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
              <div className="text-[14px] font-[800] text-[#0D2B55]">CP% Formula</div>
            </div>
            <div className="p-[16px]">
              <div className="bg-[#0D2B55] rounded-[9px] p-[12px_14px] font-mono text-[12px] text-[#e8c96a] leading-[1.8] mb-[16px]">
                BSC = &Sigma;(Actual &divide; 100 &times; Weight)<br/>
                <span className="text-white/40">CP% = BSC &times; 15%</span>
              </div>
              <div className="flex flex-col gap-[12px]">
                <div className="flex justify-between items-center pb-[8px] border-b border-[#E2DDD4]">
                  <span className="text-[12px] font-[600] text-[#6b7280]">BSC Raw Score</span>
                  <span className="text-[14px] font-[800] text-[#0D2B55]">{cpPct !== null ? bscRaw.toFixed(2) : '—'}</span>
                </div>
                <div className="flex justify-between items-center pb-[8px] border-b border-[#E2DDD4]">
                  <span className="text-[12px] font-[600] text-[#6b7280]">Max CP Cap</span>
                  <span className="text-[14px] font-[800] text-[#92400E]">15%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-[600] text-[#6b7280]">Final CP%</span>
                  <span className="text-[16px] font-[800] text-[#065F46]">{cpPct !== null ? cpPct.toFixed(2) + '%' : '—'}</span>
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
                <span className="text-[14px] font-[800] text-[#92400E]">{cpPct !== null ? (cpPct * 0.7).toFixed(2) + '%' : '—'}</span>
              </div>
              <div className="flex justify-between items-center pb-[8px] border-b border-[#E2DDD4]">
                <span className="text-[12px] font-[700] text-[#065F46]">E (1.0)</span>
                <span className="text-[14px] font-[800] text-[#065F46]">{cpPct !== null ? cpPct.toFixed(2) + '%' : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-[700] text-[#1E40AF]">EP (1.3)</span>
                <span className="text-[14px] font-[800] text-[#1E40AF]">{cpPct !== null ? (cpPct * 1.3).toFixed(2) + '%' : '—'}</span>
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
              onClick={() => setSuccessModal({ show: false })}
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
              <div className="text-[18px] font-[800] text-[#0D2B55] mb-[12px]">Lock 2026 Scorecard?</div>
              <div className="text-[13px] text-[#6b7280] mb-[24px] leading-relaxed px-[10px]">
                This action is <strong>irreversible</strong> from the CEO panel. 
                Are you absolutely sure the Board has approved the final CP calculation of <strong className="text-[#0D2B55]">{cpPct.toFixed(2)}%</strong>?
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