'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';

const QUARTERS = [
  { val: 'Q1', month: 3, label: 'Quarter 1 (Q1)' },
  { val: 'Q2', month: 6, label: 'Quarter 2 (Q2)' },
  { val: 'Q3', month: 9, label: 'Quarter 3 (Q3)' },
  { val: 'Q4', month: 12, label: 'Quarter 4 (Q4)' }
];

export default function ICTScorecardControl() {
  const router = useRouter();

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: '' });

  const currentYearNum = new Date().getFullYear();
  const currentYearStr = currentYearNum.toString();
  const yearOptions = [currentYearNum - 3, currentYearNum - 2, currentYearNum - 1, currentYearNum, currentYearNum + 1];

  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [isManualYear, setIsManualYear] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState('Q2');
  
  // 🚨 UPGRADED: State for Bulk/Employee ID Revert Input
  const [revertInput, setRevertInput] = useState('');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const targetMonth = QUARTERS.find(q => q.val === selectedQuarter).month;
      
      // 🚨 FIXED: Fetch from BOTH endpoints to guarantee we catch the saved toggle state
      const [qscRes, metricsRes] = await Promise.all([
        api.get(`/quarterly-scorecards/${selectedYear}`).catch(() => ({ data: { data: [] } })),
        api.get(`/company-metrics/${selectedYear}/${targetMonth}`).catch(() => ({ data: { data: null } }))
      ]);
      
      const list = qscRes.data?.data || [];
      const match = list.find(item => item.quarter === selectedQuarter) || {};
      const cMetrics = metricsRes.data?.data || {};

      // Merge safely, trusting company-metrics for the toggle state
      setMetrics({
        ...match,
        ...cMetrics,
        locked: match.locked || cMetrics.locked || false,
        requireAcknowledgment: cMetrics.requireAcknowledgment !== undefined ? cMetrics.requireAcknowledgment : (match.requireAcknowledgment !== undefined ? match.requireAcknowledgment : true)
      });
      
    } catch (error) {
      console.error('Failed to load metrics status', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [selectedYear, selectedQuarter]);

  const handleLockAction = async () => {
    try {
      setIsProcessing(true);
      const newLockState = confirmModal.type === 'lock';
      
      const targetMonth = QUARTERS.find(q => q.val === selectedQuarter).month;
      
      await Promise.all([
        api.post(`/quarterly-scorecards/${selectedYear}/${selectedQuarter}`, {
          locked: newLockState
        }),
        api.post('/company-metrics', {
          reviewYear: selectedYear,
          reviewMonth: targetMonth,
          locked: newLockState
        })
      ]);

      setConfirmModal({ open: false, type: '' });
      await fetchMetrics();
      
      setAlertModal({ 
        show: true, 
        title: 'Action Successful', 
        message: `Scorecard for ${selectedQuarter} ${selectedYear} successfully ${newLockState ? 'locked' : 'unlocked'}.`, 
        type: 'success' 
      });

    } catch (error) {
      setConfirmModal({ open: false, type: '' });
      
      setAlertModal({ 
        show: true, 
        title: 'Action Failed', 
        message: 'Failed to update scorecard lock status.', 
        type: 'error' 
      });
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const requireAck = metrics?.requireAcknowledgment !== false; // Safely defaults to true

  // 🚨 FIXED: Uses explicit requireAck state to prevent getting "stuck"
  const handleAckToggle = async () => {
    try {
      setIsProcessing(true);
      const newState = !requireAck; 
      
      setMetrics(prev => prev ? { ...prev, requireAcknowledgment: newState } : { requireAcknowledgment: newState });
      
      const targetMonth = QUARTERS.find(q => q.val === selectedQuarter).month;
      await Promise.all([
        api.post(`/quarterly-scorecards/${selectedYear}/${selectedQuarter}`, {
          requireAcknowledgment: newState
        }),
        api.post('/company-metrics', {
          reviewYear: selectedYear,
          reviewMonth: targetMonth,
          requireAcknowledgment: newState
        })
      ]);

      await fetchMetrics();

      setAlertModal({ 
        show: true, 
        title: 'Action Successful', 
        message: `Employee Acknowledgment is now ${newState ? 'REQUIRED' : 'DISABLED'} for ${selectedQuarter} ${selectedYear}.`, 
        type: 'success' 
      });

    } catch (error) {
      setMetrics(prev => prev ? { ...prev, requireAcknowledgment: !newState } : prev);
      
      setAlertModal({ 
        show: true, 
        title: 'Action Failed', 
        message: 'Failed to update acknowledgment status.', 
        type: 'error' 
      });
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // 🚨 UPGRADED: Advanced Bulk & Employee ID Revert Logic
  const handleRevertAck = async () => {
    if (!revertInput) return;
    try {
      setIsProcessing(true);
      
      // 1. Fetch all appraisals
      const res = await api.get('/appraisals').catch(() => ({ data: { data: [] } }));
      const allApps = res.data?.data || [];
      
      // 2. Filter exactly for this Quarter and Year that are currently ACKNOWLEDGED
      const quarterApps = allApps.filter(a => {
        const appYear = a.reviewYear || a.appraisalQuarter?.year || a.period?.year;
        const appQtr = a.appraisalQuarter?.name || a.period?.quarter || a.quarter?.name;
        const isAck = a.workflow?.status === 'ACKNOWLEDGED' || a.status === 'ACKNOWLEDGED';
        return appYear?.toString() === selectedYear.toString() && appQtr === selectedQuarter && isAck;
      });

      // 3. Filter for 'ALL' or specific Employee ID
      let targets = [];
      const inputClean = revertInput.trim().toUpperCase();
      
      if (inputClean === 'ALL') {
        targets = quarterApps;
      } else {
        targets = quarterApps.filter(a => {
          const empId = a.employeeId?.employeeId ? String(a.employeeId.employeeId).toUpperCase() : '';
          return empId === inputClean;
        });
      }

      if (targets.length === 0) {
        setAlertModal({ 
          show: true, 
          title: 'No Records Found', 
          message: `Could not find any ACKNOWLEDGED appraisals for '${inputClean}' in ${selectedQuarter} ${selectedYear}.`, 
          type: 'warning' 
        });
        setIsProcessing(false);
        return;
      }

      // 4. Automatically process all matched targets back to APPROVED
      let successCount = 0;
      for (const app of targets) {
        try {
          await api.put(`/appraisals/${app._id}`, {
            ...app,
            status: 'APPROVED',
            workflow: { ...(app.workflow || {}), status: 'APPROVED' },
            acknowledgedAt: null
          });
          successCount++;
        } catch (e) {
          console.error(`Failed to revert appraisal ${app._id}`, e);
        }
      }
      
      setAlertModal({ 
        show: true, 
        title: 'Action Successful', 
        message: `Successfully reverted ${successCount} appraisal(s) back to APPROVED status for ${inputClean}. The employee(s) can now acknowledge them again.`, 
        type: 'success' 
      });
      
      setRevertInput(''); 
    } catch (error) {
      setAlertModal({ 
        show: true, 
        title: 'Action Failed', 
        message: 'Failed to process revert request. Please check network connection.', 
        type: 'error' 
      });
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const scorecardLocked = metrics?.locked || false;
  const lockedBy = metrics?.lockedBy ? (typeof metrics.lockedBy === 'object' ? `${metrics.lockedBy.personalDetails?.firstName || ''} ${metrics.lockedBy.personalDetails?.lastName || ''}`.trim() : 'CEO') : 'CEO';
  const lockedAt = metrics?.lockedAt ? new Date(metrics.lockedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
  
  const cpPct = metrics ? (metrics.cpPct !== undefined && metrics.cpPct !== null 
    ? `${metrics.cpPct.toFixed(2)}%` 
    : (metrics.actuals ? 'Data entered' : 'Not entered')) : 'Not entered';

  const ts = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px] flex flex-col md:flex-row justify-between items-start md:items-end gap-[12px]">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
            &#128274; Scorecard Lock Control
          </div>
          <div className="text-[13px] text-[#6b7280]">
            ICT Admin — Only ICT can unlock the CEO scorecard after a Board-approved unlock request
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-[6px] bg-white border border-[#E2DDD4] p-[4px] rounded-[8px] shadow-sm">
           <select 
             value={selectedQuarter} 
             onChange={(e) => setSelectedQuarter(e.target.value)}
             className="bg-transparent text-[12px] font-[700] text-[#0D2B55] outline-none cursor-pointer p-[6px_8px]"
           >
              {QUARTERS.map(q => (
                 <option key={q.val} value={q.val}>{q.label}</option>
              ))}
           </select>
           
           <span className="text-[#E2DDD4]">|</span>
           
           {isManualYear ? (
              <input 
                type="number" 
                autoFocus
                defaultValue={selectedYear}
                onBlur={(e) => {
                  if (e.target.value) {
                    setSelectedYear(e.target.value);
                  }
                  setIsManualYear(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.target.value) {
                      setSelectedYear(e.target.value);
                    }
                    setIsManualYear(false);
                  }
                }}
                className="bg-transparent text-[12px] font-[700] text-[#0D2B55] outline-none p-[6px_8px] w-[80px]"
              />
           ) : (
             <select 
               value={selectedYear} 
               onChange={(e) => {
                 if (e.target.value === 'manual') setIsManualYear(true);
                 else setSelectedYear(e.target.value);
               }}
               className="bg-transparent text-[12px] font-[700] text-[#0D2B55] outline-none cursor-pointer p-[6px_8px] pr-[12px]"
             >
                {yearOptions.map(y => (
                   <option key={y} value={y}>{y}</option>
                ))}
                <option value="manual" className="font-bold text-[#1E40AF]">Enter Manually...</option>
             </select>
           )}
        </div>
      </div>

      <div className="bg-[#FFFBEB] border-[1.5px] border-[#FDE68A] text-[#92400E] rounded-[10px] p-[12px_16px] text-[13px] mb-[20px] shadow-sm flex items-start gap-[10px]">
        <span className="text-[16px] leading-none mt-[2px]">&#9888;</span> 
        <div className="leading-[1.6]">
          <strong className="font-[800]">ICT Admin Responsibility:</strong> The scorecard lock protects Board-approved KPA figures. Only unlock after written authorisation from both the CEO and Board Secretary. All actions are logged in the audit trail.
        </div>
      </div>

      <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col mb-[20px]">
        <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center">
          <div className="flex items-center gap-[12px]">
            <div className="w-[36px] h-[36px] rounded-[8px] bg-[#FEF3C7] flex items-center justify-center text-[16px]">&#128274;</div>
            <div>
              <div className="text-[15px] font-[800] text-[#0D2B55]">Current Scorecard Status</div>
              <div className="text-[12px] font-[500] text-[#6b7280]">
                Viewing status for {selectedQuarter} {selectedYear}
              </div>
            </div>
          </div>
          <span 
            className={`px-[12px] py-[6px] rounded-[6px] text-[11px] font-[800] border ${scorecardLocked ? 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]' : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'}`}
          >
            {scorecardLocked ? '🔒 Locked' : '🔓 Unlocked'}
          </span>
        </div>
        
        <div className="p-[24px]">
          {loading ? (
            <div className="py-[40px] text-center text-slate-500 font-[600] animate-pulse">Checking status...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-[30px]">
              
              {/* Status Details */}
              <div className="flex flex-col text-[13px]">
                <div className="flex justify-between items-center py-[12px] border-b border-[#E2DDD4]">
                  <span className="text-[#6b7280] font-[600]">Lock Status</span>
                  <span className={`font-[800] ${scorecardLocked ? 'text-[#059669]' : 'text-[#92400E]'}`}>{scorecardLocked ? 'Locked' : 'Unlocked'}</span>
                </div>
                <div className="flex justify-between items-center py-[12px] border-b border-[#E2DDD4]">
                  <span className="text-[#6b7280] font-[600]">Employee Acknowledgment</span>
                  <span className={`font-[800] ${requireAck ? 'text-[#059669]' : 'text-[#6b7280]'}`}>{requireAck ? 'Required' : 'Disabled'}</span>
                </div>
                <div className="flex justify-between items-center py-[12px] border-b border-[#E2DDD4]">
                  <span className="text-[#6b7280] font-[600]">Locked By</span>
                  <span className="font-[700] text-[#0f1923]">{scorecardLocked ? lockedBy : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-[12px] border-b border-[#E2DDD4]">
                  <span className="text-[#6b7280] font-[600]">Locked At</span>
                  <span className="font-[700] text-[#0f1923]">{scorecardLocked ? lockedAt : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-[12px] border-b border-[#E2DDD4]">
                  <span className="text-[#6b7280] font-[600]">Calculated Value Status</span>
                  <span className="font-[800] text-[#0D2B55]">{cpPct}</span>
                </div>
                <div className="flex justify-between items-center py-[12px]">
                  <span className="text-[#6b7280] font-[600]">Last System Sync</span>
                  <span className="font-[700] text-[#6b7280] text-[11px] bg-[#FAF8F4] border border-[#E2DDD4] px-[8px] py-[3px] rounded-[4px]">{ts}</span>
                </div>
              </div>

              {/* Controls */}
              <div>
                <div className="bg-[#FAF8F4] border border-[#E2DDD4] rounded-[12px] p-[20px] mb-[16px]">
                  <div className="text-[13px] font-[800] text-[#0D2B55] mb-[8px]">ICT Lock Controls</div>
                  <div className="text-[12px] text-[#6b7280] leading-[1.6] mb-[16px]">
                    The scorecard is locked by the CEO after Board approval. ICT can reset this lock if formally authorised. This action is irreversible unless ICT performs another reset.
                  </div>
                  <div className="flex flex-col gap-[10px]">
                    <button 
                      className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white font-[800] text-[13px] py-[10px] rounded-[8px] transition-colors flex items-center justify-center gap-[6px] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setConfirmModal({ open: true, type: 'unlock' })}
                      disabled={!scorecardLocked || isProcessing}
                    >
                      &#128275; Reset Lock (Unlock)
                    </button>
                    <button 
                      className="w-full bg-[#059669] hover:bg-[#047857] text-white font-[800] text-[13px] py-[10px] rounded-[8px] transition-colors flex items-center justify-center gap-[6px] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setConfirmModal({ open: true, type: 'lock' })}
                      disabled={scorecardLocked || isProcessing}
                    >
                      &#128274; Force Lock
                    </button>
                  </div>
                </div>

                <div className="bg-[#FAF8F4] border border-[#E2DDD4] rounded-[12px] p-[20px] mb-[16px]">
                  <div className="text-[13px] font-[800] text-[#0D2B55] mb-[8px]">Employee Acknowledgment Control</div>
                  <div className="text-[12px] text-[#6b7280] leading-[1.6] mb-[16px]">
                    Toggle whether employees are required to formally acknowledge their appraisal scores for this cycle. If disabled, the acknowledgment section will be completely hidden on the staff dashboard.
                  </div>
                  
                  <div className="flex items-center justify-between pt-[10px] border-t border-[#E2DDD4]">
                    <div>
                      <div className="text-[13px] font-[800] text-[#0D2B55]">Require Acknowledgment</div>
                      <div className="text-[11px] text-[#6b7280] font-[600] mt-[2px]">Currently <strong className={requireAck ? "text-[#059669]" : "text-[#991B1B]"}>{requireAck ? 'Enabled' : 'Disabled'}</strong></div>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleAckToggle} 
                      disabled={isProcessing}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none shadow-inner disabled:opacity-50 ${requireAck ? 'bg-[#059669]' : 'bg-[#E2DDD4]'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${requireAck ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>

                </div>
                
                {/* 🚨 UPGRADED: Revert Acknowledgment Feature Card */}
                <div className="bg-[#FAF8F4] border border-[#E2DDD4] rounded-[12px] p-[20px] mb-[16px]">
                  <div className="text-[13px] font-[800] text-[#0D2B55] mb-[8px]">Revert Employee Acknowledgment</div>
                  <div className="text-[12px] text-[#6b7280] leading-[1.6] mb-[16px]">
                    Enter an Employee ID (e.g., <strong>3692026</strong>) or type <strong>ALL</strong> to revert acknowledged appraisals back to APPROVED for {selectedQuarter} {selectedYear}. This allows them to acknowledge again.
                  </div>
                  <div className="flex flex-col sm:flex-row gap-[8px]">
                    <input 
                      type="text" 
                      placeholder="Emp ID or 'ALL'"
                      value={revertInput}
                      onChange={(e) => setRevertInput(e.target.value)}
                      className="flex-1 text-[13px] px-[12px] py-[10px] border border-[#E2DDD4] rounded-[8px] outline-none focus:border-[#0D2B55]"
                      disabled={isProcessing}
                    />
                    <button 
                      onClick={handleRevertAck}
                      disabled={isProcessing || !revertInput}
                      className="bg-[#D97706] hover:bg-[#B45309] text-white px-[16px] py-[10px] rounded-[8px] text-[13px] font-[800] transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap"
                    >
                      {isProcessing ? 'Processing...' : 'Revert'}
                    </button>
                  </div>
                </div>

                <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-[8px] p-[10px_12px] text-[11px] leading-[1.5]">
                  &#128683; <strong className="font-[800]">Unlock requires:</strong> Written CEO authorisation + Board Secretary approval + ICT audit entry
                </div>
              </div>
              
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
        <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
          <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FFF7ED] flex items-center justify-center text-[14px]">&#128218;</div>
          <div>
            <div className="text-[14px] font-[800] text-[#0D2B55]">Official Unlock Procedure</div>
            <div className="text-[11px] text-[#6b7280]">Must be followed exactly — all steps are audited</div>
          </div>
        </div>
        <div className="p-[20px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[16px]">
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] p-[16px] text-center">
              <div className="text-[28px] mb-[10px]">1&#65039;&#8419;</div>
              <div className="text-[13px] font-[800] text-[#991B1B] mb-[6px]">CEO Request</div>
              <div className="text-[11px] text-[#991B1B]/80 font-[500] leading-[1.5]">CEO submits written unlock request with reason and Board authorisation reference</div>
            </div>
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] p-[16px] text-center">
              <div className="text-[28px] mb-[10px]">2&#65039;&#8419;</div>
              <div className="text-[13px] font-[800] text-[#92400E] mb-[6px]">Board Approval</div>
              <div className="text-[11px] text-[#92400E]/80 font-[500] leading-[1.5]">Board Secretary confirms approval in writing with reference number</div>
            </div>
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px] p-[16px] text-center">
              <div className="text-[28px] mb-[10px]">3&#65039;&#8419;</div>
              <div className="text-[13px] font-[800] text-[#1E40AF] mb-[6px]">ICT Unlocks</div>
              <div className="text-[11px] text-[#1E40AF]/80 font-[500] leading-[1.5]">ICT Manager resets lock with Board reference logged in audit trail</div>
            </div>
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px] p-[16px] text-center">
              <div className="text-[28px] mb-[10px]">4&#65039;&#8419;</div>
              <div className="text-[13px] font-[800] text-[#065F46] mb-[6px]">CEO Re-enters & Locks</div>
              <div className="text-[11px] text-[#065F46]/80 font-[500] leading-[1.5]">CEO updates KPA scores and re-locks. All changes logged.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[100] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[460px] shadow-2xl overflow-hidden slide-in-from-bottom-4">
            <div className={`p-[16px_22px] flex justify-between items-center ${confirmModal.type === 'unlock' ? 'bg-[#DC2626]' : 'bg-[#059669]'}`}>
              <div className="text-[15px] font-[800] text-white flex items-center gap-[8px]">
                <span className="text-[18px]">⚠</span> Confirm {confirmModal.type === 'unlock' ? 'Unlock' : 'Lock'}
              </div>
              <button onClick={() => !isProcessing && setConfirmModal({ open: false, type: '' })} className="bg-white/10 text-white w-[30px] h-[30px] rounded-[8px] flex items-center justify-center hover:bg-white/20 transition-colors">&times;</button>
            </div>
            <div className="p-[30px_22px] text-center">
              <div className="text-[48px] mb-[16px] leading-none">{confirmModal.type === 'unlock' ? '🔓' : '🔒'}</div>
              <div className="text-[18px] font-[800] text-[#0D2B55] mb-[12px]">{confirmModal.type === 'unlock' ? 'Reset Scorecard Lock?' : 'Force Scorecard Lock?'}</div>
              <div className="text-[13px] text-[#6b7280] mb-[24px] leading-relaxed px-[10px]">
                {confirmModal.type === 'unlock' 
                  ? `This will open the scorecard for ${selectedQuarter} ${selectedYear} for the CEO to make edits. You must verify that you have written Board approval before proceeding.`
                  : `This will permanently lock the scorecard for ${selectedQuarter} ${selectedYear}. Are you sure you want to force this lock manually?`}
              </div>
              <div className="flex gap-[12px] justify-center">
                <button 
                  onClick={() => setConfirmModal({ open: false, type: '' })} 
                  className="p-[12px_20px] rounded-[10px] text-[13px] font-[800] text-[#0f1923] bg-white border-[2px] border-[#E2DDD4] hover:border-[#0D2B55] transition-colors"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLockAction} 
                  className={`p-[12px_20px] rounded-[10px] text-[13px] font-[800] text-white shadow-md flex items-center justify-center min-w-[120px] transition-colors ${confirmModal.type === 'unlock' ? 'bg-[#DC2626] hover:bg-[#B91C1C]' : 'bg-[#059669] hover:bg-[#047857]'}`}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : (confirmModal.type === 'unlock' ? 'Yes, Unlock' : 'Yes, Lock')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Success/Error Modal */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[200] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[400px] shadow-2xl overflow-hidden slide-in-from-bottom-4">
            <div className="p-[30px_22px] text-center">
              <div className="text-[48px] mb-[16px] leading-none">
                {alertModal.type === 'error' ? '❌' : alertModal.type === 'warning' ? '⚠️' : '✅'}
              </div>
              <div className="text-[18px] font-[800] text-[#0D2B55] mb-[12px]">{alertModal.title}</div>
              <div className="text-[13px] text-[#6b7280] mb-[24px] leading-relaxed px-[10px]">
                {alertModal.message}
              </div>
              <button 
                onClick={() => setAlertModal({ show: false, title: '', message: '', type: '' })} 
                className="w-full p-[12px] rounded-[10px] text-[13px] font-[800] text-white bg-[#0D2B55] hover:bg-[#1a3d6e] transition-colors shadow-md"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}