'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';

export default function CEOApproveAppraisals() {
  const router = useRouter();
  
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cpPct, setCpPct] = useState(null);
  
  const [actionModal, setActionModal] = useState({ show: false, type: '', id: null, name: '' });
  const [ceoComment, setCeoComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const metricsRes = await api.get('/company-metrics/2026').catch(() => ({ data: { data: null } }));
      if (metricsRes.data?.data?.cpPct) {
        setCpPct(metricsRes.data.data.cpPct);
      }

      const appRes = await api.get('/appraisals').catch(() => ({ data: { data: [] } }));
      const allApps = appRes.data?.data || [];
      
      const pendingCeo = allApps.filter(a => a.workflow?.status === 'WITH_CEO');
      
      pendingCeo.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
      
      setAppraisals(pendingCeo);
    } catch (error) {
      console.error('Failed to load CEO queue', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (type, id, name) => {
    setActionModal({ show: true, type, id, name });
    setCeoComment('');
    setSuccessMsg('');
  };

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      await api.patch(`/appraisals/${actionModal.id}/ceo-approve`, { 
        notes: 'Final Approval by CEO'
      });
      
      setSuccessMsg('Appraisal has been successfully approved.');
      setTimeout(() => {
        setActionModal({ show: false, type: '', id: null, name: '' });
        window.location.reload(); 
      }, 2000);
      
    } catch (error) {
      alert("Failed to approve the appraisal.");
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (ceoComment.trim().length < 5) {
      alert("Please provide a detailed reason for not approving this appraisal.");
      return;
    }
    
    try {
      setIsProcessing(true);
      await api.patch(`/appraisals/${actionModal.id}/reopen`, { 
        hrNotes: ceoComment 
      });
      
      setSuccessMsg('Appraisal rejected and returned to the Manager.');
      setTimeout(() => {
        setActionModal({ show: false, type: '', id: null, name: '' });
        window.location.reload(); 
      }, 2000);
      
    } catch (error) {
      alert("Failed to reject the appraisal.");
      setIsProcessing(false);
    }
  };

  const iprfStyle = (f) => {
    if (f >= 1.3) return 'bg-[#DBEAFE] text-[#1E40AF]';
    if (f >= 1.0) return 'bg-[#D1FAE5] text-[#065F46]';
    if (f >= 0.7) return 'bg-[#FEF3C7] text-[#92400E]';
    return 'bg-[#FEE2E2] text-[#991B1B]';
  };

  const iprfLabel = (f) => {
    if (f >= 1.3) return 'E'; 
    if (f >= 1.0) return 'E';
    if (f >= 0.7) return 'N'; 
    return 'L'; 
  };

  return (
    <div className="w-full max-w-full pb-[60px] font-sans">
      
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">
          &#10003; Approve Appraisals
        </div>
        <div className="text-[13px] text-[#6b7280]">
          Appraisals submitted by HR Manager &mdash; awaiting CEO decision
        </div>
      </div>

      <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-[#FAF8F4] border-b border-[#E2DDD4] text-[10px] font-[800] text-[#6b7280] uppercase tracking-[.06em]">
              <tr>
                <th className="p-[12px_16px]">Employee</th>
                <th className="p-[12px_16px] text-[#C9A84C]">Job Title</th>
                <th className="p-[12px_16px]">Quarter</th>
                <th className="p-[12px_16px] text-center">IPRF</th>
                <th className="p-[12px_16px] text-center">Award %</th>
                <th className="p-[12px_16px] text-center">Pro-Rata</th>
                <th className="p-[12px_16px] text-center">Status</th>
                <th className="p-[12px_16px] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4] text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-[40px] text-center text-[#6b7280] font-[600] animate-pulse">
                    Loading CEO Queue...
                  </td>
                </tr>
              ) : appraisals.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-[48px] text-center text-[#6b7280]">
                    <div className="text-[36px] mb-[12px] opacity-70">&#128203;</div>
                    <div className="text-[15px] font-[700] text-[#0D2B55] mb-[6px]">No appraisals pending CEO approval</div>
                    <div className="text-[13px]">When HR submits appraisals to CEO, they will appear here for your review.</div>
                  </td>
                </tr>
              ) : (
                appraisals.map((a, i) => {
                  const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`.trim();
                  const init1 = a.employeeId?.personalDetails?.firstName?.[0] || '';
                  const init2 = a.employeeId?.personalDetails?.lastName?.[0] || '';
                  const coCode = a.employeeId?.companyCode || 'FSM';
                  const jobTitle = a.employeeId?.employmentDetails?.jobTitle || 'Staff';
                  
                  const iprf = a.calculatedResults?.finalIprfScore || 0;
                  const prMonths = a.employeeId?.employmentDetails?.prorateValue || 12;
                  const proRataValue = prMonths / 12;
                  
                  let awardDisplay = '—';
                  if (cpPct !== null) {
                    const finalAw = (cpPct * iprf) * proRataValue;
                    awardDisplay = `${finalAw.toFixed(2)}%`;
                  } else if (a.stipAward) {
                     awardDisplay = `${a.stipAward}%`;
                  }

                  return (
                    <tr key={a._id} className={`hover:bg-[#FAF8F4] transition-colors ${i % 2 === 1 ? 'bg-[#FAF8F4]/40' : 'bg-white'}`}>
                      <td className="p-[12px_16px] whitespace-nowrap">
                        <div className="flex items-center gap-[9px]">
                          <div className="w-[30px] h-[30px] rounded-[6px] bg-[#E2DDD4] text-[#0f1923] font-[800] flex items-center justify-center text-[11px]">
                            {init1}{init2}
                          </div>
                          <div>
                            <div className="font-[600] text-[#0D2B55]">{empName}</div>
                            <div className="text-[10px] text-[#6b7280]">
                              {coCode} &middot; {a.period?.quarter || 'Q3'} &middot; {new Date(a.updatedAt || a.createdAt).toLocaleDateString('en-GB')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-[12px] text-[#0f1923]">
                        {jobTitle}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap">
                        <span className="bg-[#FEF3C7] text-[#92400E] px-[8px] py-[3px] rounded-[4px] text-[10px] font-[800] border border-[#FDE68A]">
                          {a.period?.quarter || 'Q3'}
                        </span>
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <span className={`px-[8px] py-[4px] rounded-[6px] text-[11px] font-[800] ${iprfStyle(iprf)}`}>
                          {iprf.toFixed(1)} — {iprfLabel(iprf)}
                        </span>
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center font-[700] text-[#059669]">
                        {awardDisplay}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center font-[600] text-[#0D2B55]">
                        {proRataValue.toFixed(3)}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <span className="bg-[#FEF3C7] text-[#92400E] px-[8px] py-[4px] rounded-full text-[10px] font-[700] border border-[#FDE68A] whitespace-nowrap">
                          &#9200; Pending CEO
                        </span>
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <div className="flex gap-[6px] justify-center items-center">
                          <button 
                            onClick={() => openModal('approve', a._id, empName)}
                            className="bg-[#059669] hover:bg-[#047857] text-white px-[12px] py-[5px] text-[11px] font-[700] rounded-[6px] transition-colors shadow-sm"
                          >
                            &#10003; Approve
                          </button>
                          <button 
                            onClick={() => openModal('reject', a._id, empName)}
                            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-[12px] py-[5px] text-[11px] font-[700] rounded-[6px] transition-colors shadow-sm"
                          >
                            &#10007; Not Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-[16px] p-[14px_16px] bg-[#DBEAFE] border border-[#BFDBFE] rounded-[14px] text-[12px] text-[#1E40AF] leading-[1.6]">
        &#8505; <strong>How it works:</strong> HR Manager submits appraisals to CEO &rarr; They appear here &rarr; CEO clicks Approve or Not Approve &rarr; If Not Approved, mandatory comment required &rarr; HR notified by email with CEO comments
      </div>

      {actionModal.show && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[100] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[460px] shadow-2xl overflow-hidden slide-in-from-bottom-4">
            
            <div className={`p-[16px_22px] flex justify-between items-center ${actionModal.type === 'approve' ? 'bg-[#059669]' : 'bg-[#DC2626]'}`}>
              <div className="text-[15px] font-[800] text-white flex items-center gap-[8px]">
                {actionModal.type === 'approve' ? '&#10003; Confirm Approval' : '&#10007; Reject Appraisal'}
              </div>
              <button 
                onClick={() => !isProcessing && setActionModal({ show: false, type: '', id: null, name: '' })} 
                className="bg-white/10 text-white w-[30px] h-[30px] rounded-[8px] flex items-center justify-center hover:bg-white/20 transition-colors"
                disabled={isProcessing}
              >
                &times;
              </button>
            </div>

            <div className="p-[24px]">
              {successMsg ? (
                <div className="text-center py-[20px]">
                  <div className="text-[48px] mb-[12px] leading-none">{actionModal.type === 'approve' ? '✅' : '📤'}</div>
                  <div className={`text-[16px] font-[800] ${actionModal.type === 'approve' ? 'text-[#059669]' : 'text-[#D97706]'}`}>
                    {successMsg}
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-[20px]">
                    <div className="text-[15px] font-[700] text-[#0D2B55]">
                      {actionModal.type === 'approve' ? 'Finalize CEO Approval for' : 'Do Not Approve Appraisal for'}
                    </div>
                    <div className={`text-[18px] font-[800] mt-[4px] ${actionModal.type === 'approve' ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                      {actionModal.name}
                    </div>
                  </div>

                  {actionModal.type === 'reject' && (
                    <div className="mb-[20px]">
                      <label className="block text-[12px] font-[700] text-[#0D2B55] mb-[6px]">
                        Reason for Non-Approval <span className="text-[#DC2626]">*</span>
                      </label>
                      <textarea 
                        className="w-full resize-y min-h-[100px] p-[10px_14px] border-[1.5px] border-[#FECACA] rounded-[8px] text-[13px] text-[#0f1923] bg-[#FEF2F2] outline-none focus:border-[#DC2626] transition-colors shadow-inner"
                        placeholder="Please detail why this appraisal is not approved. This will be sent back to the HR Manager."
                        value={ceoComment}
                        onChange={(e) => setCeoComment(e.target.value)}
                        disabled={isProcessing}
                      />
                    </div>
                  )}

                  {actionModal.type === 'approve' && (
                    <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px] p-[16px] mb-[20px] text-center shadow-sm">
                      <div className="text-[13px] text-[#065F46] font-[600]">
                        By clicking confirm, you authorize the final payout calculation for this employee based on the locked CP%.
                      </div>
                    </div>
                  )}

                  <div className="flex gap-[12px] justify-center">
                    <button 
                      onClick={() => setActionModal({ show: false, type: '', id: null, name: '' })} 
                      className="p-[12px_20px] rounded-[10px] text-[13px] font-[800] text-[#0f1923] bg-white border-[2px] border-[#E2DDD4] hover:border-[#0D2B55] transition-colors"
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={actionModal.type === 'approve' ? handleApprove : handleReject} 
                      className={`p-[12px_20px] rounded-[10px] text-[13px] font-[800] text-white shadow-md flex items-center justify-center min-w-[140px] transition-colors ${
                        actionModal.type === 'approve' 
                          ? 'bg-[#059669] hover:bg-[#047857]' 
                          : 'bg-[#DC2626] hover:bg-[#B91C1C]'
                      }`}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : actionModal.type === 'approve' ? 'Yes, Approve' : 'Submit Rejection'}
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}