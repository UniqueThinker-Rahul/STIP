'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';

export default function SubmitToCEO() {
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState({show: false, icon: '', title: '', detail: ''});

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/appraisals').catch(() => ({ data: { data: [] } }));
      const allData = response.data?.data || response.data || [];
      
      // FIX: Secure Schema Workflow check
      const queue = allData.filter(a => a.workflow?.status === 'APPROVED_BY_HR' || a.workflow?.status === 'WITH_CEO');
      
      // Sort to show WITH_CEO at the top
      queue.sort((a, b) => {
        if (a.workflow?.status === 'WITH_CEO' && b.workflow?.status !== 'WITH_CEO') return -1;
        if (a.workflow?.status !== 'WITH_CEO' && b.workflow?.status === 'WITH_CEO') return 1;
        return 0;
      });

      setAppraisals(queue);
    } catch (error) {
      console.error('Failed to fetch CEO queue:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const submitToCEO = async (id, empName) => {
    try {
      // FIX: Route to the proper backend endpoint
      await api.patch(`/appraisals/${id}/forward`);
      setSuccess({
        show: true, 
        icon: '📤', 
        title: 'Sent to CEO', 
        detail: `${empName}'s appraisal has been securely routed to the CEO's desk.`
      });
      fetchData(); 
    } catch (error) {
      console.error('Submit to CEO failed:', error);
      alert("Error forwarding to CEO. Ensure status is APPROVED_BY_HR.");
    }
  };

  return (
    <div className="w-full max-w-full pb-[60px]">
      
      {/* Page Header */}
      <div className="mb-[20px] flex justify-between items-end">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
            &#128228; Submit to CEO
          </div>
          <div className="text-[13px] text-[#6b7280]">Manage appraisals queued for Executive review and final approval</div>
        </div>
        <button onClick={fetchData} className="text-[12px] font-[600] text-[#6b7280] bg-white border border-[#E2DDD4] p-[6px_12px] rounded-[8px] hover:text-[#0D2B55] hover:border-[#0D2B55] transition-colors">
          &#8635; Refresh
        </button>
      </div>
      
      {/* Main Card & Table */}
      <div className="bg-white rounded-[14px] shadow-sm border border-[#E2DDD4] overflow-hidden">
        
        {/* Card Header */}
        <div className="flex justify-between items-center p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4]">
          <div className="flex items-center gap-[12px]">
            <div className="w-[36px] h-[36px] rounded-[8px] bg-[#EDE9FE] flex items-center justify-center text-[18px]">👔</div>
            <div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">Executive Desk</div>
              <div className="text-[11px] text-[#6b7280]">Appraisals ready for or currently under CEO review</div>
            </div>
          </div>
          <span className="px-[12px] py-[4px] rounded-full text-[11px] font-[800] bg-[#EDE9FE] text-[#4C1D95] border border-[#DDD6FE]">
            {appraisals.length} in queue
          </span>
        </div>
        
        {/* Table Wrap */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F4] border-b border-[#E2DDD4] text-[10px] font-[800] text-[#6b7280] uppercase tracking-[.06em]">
                <th className="p-[12px_16px]">Employee</th>
                <th className="p-[12px_16px] text-[#92400E]">Job Title</th>
                <th className="p-[12px_16px]">Mgr</th>
                <th className="p-[12px_16px] text-center">Qtr</th>
                <th className="p-[12px_16px] text-center">IPRF</th>
                <th className="p-[12px_16px] text-center">Award%</th>
                <th className="p-[12px_16px] text-center">Pro-Rata</th>
                <th className="p-[12px_16px] text-center">EP?</th>
                <th className="p-[12px_16px] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-[#6b7280] text-[13px] font-[500] animate-pulse">
                    Loading queue data...
                  </td>
                </tr>
              ) : appraisals.map((a, i) => {
                const empName = `${a.employeeId?.personalDetails?.firstName || ''} ${a.employeeId?.personalDetails?.lastName || ''}`.trim() || 'Unknown';
                const init1 = a.employeeId?.personalDetails?.firstName?.[0] || '';
                const init2 = a.employeeId?.personalDetails?.lastName?.[0] || '';
                const mgrName = a.managerId?.personalDetails?.lastName || 'Manager';
                const iprf = a.calculatedResults?.finalIprfScore || 0;
                
                return (
                  <tr key={a._id} className={`hover:bg-[#FAF8F4] transition-colors ${i % 2 === 1 ? 'bg-[#FAF8F4]/50' : 'bg-white'}`}>
                    <td className="p-[12px_16px] whitespace-nowrap">
                      <div className="flex items-center gap-[10px]">
                        <div className="w-[28px] h-[28px] rounded-full bg-[#E2DDD4] text-[#0f1923] font-[800] flex items-center justify-center text-[10px]">
                          {init1}{init2}
                        </div>
                        <div>
                          <div className="font-[800] text-[#0D2B55] text-[13px]">{empName}</div>
                          <div className="text-[10px] text-[#6b7280] font-[600]">{a.employeeId?.companyCode || 'FSM'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-[12px_16px] whitespace-nowrap text-[12px] font-[600] text-[#0f1923]">{a.employeeId?.employmentDetails?.jobTitle}</td>
                    <td className="p-[12px_16px] whitespace-nowrap text-[11px] text-[#6b7280] font-[600]">
                      {mgrName}
                    </td>
                    <td className="p-[12px_16px] whitespace-nowrap text-center">
                      <span className="px-[8px] py-[3px] rounded-[4px] text-[10px] font-[800] bg-white border border-[#E2DDD4] text-[#6b7280]">
                        {a.period?.quarter || 'Q3'}
                      </span>
                    </td>
                    <td className="p-[12px_16px] whitespace-nowrap text-center">
                      <span className="px-[8px] py-[3px] rounded-[4px] text-[11px] font-[800] bg-[#EFF6FF] text-[#0369A1] border border-[#BFDBFE]">
                        {iprf.toFixed(1)}
                      </span>
                    </td>
                    <td className="p-[12px_16px] whitespace-nowrap text-center font-[800] text-[#059669] text-[12px]">
                      {a.stipAward ? `${a.stipAward}%` : '—'}
                    </td>
                    <td className="p-[12px_16px] whitespace-nowrap text-center font-[800] text-[#0f1923] text-[12px]">
                      {((a.employeeId?.employmentDetails?.prorateValue || 12) / 12).toFixed(3)}
                    </td>
                    <td className="p-[12px_16px] whitespace-nowrap text-center">
                      {iprf >= 1.3 ? (
                        <span className="px-[6px] py-[2px] rounded-[4px] text-[9px] font-[800] bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">⭐ EP</span>
                      ) : (
                        <span className="text-[#E2DDD4] font-[800]">—</span>
                      )}
                    </td>
                    <td className="p-[12px_16px] whitespace-nowrap text-center">
                      <div className="flex items-center justify-center">
                        {a.workflow?.status === 'WITH_CEO' ? (
                          <span className="px-[10px] py-[6px] rounded-[6px] text-[10px] font-[800] bg-[#EDE9FE] text-[#4C1D95] border border-[#DDD6FE]">
                            On CEO's Desk
                          </span>
                        ) : (
                          <button 
                            className="bg-[#0D2B55] hover:bg-[#1a3d6e] text-white px-[12px] py-[6px] rounded-[6px] text-[11px] font-[800] transition-colors shadow-sm flex items-center gap-[6px]" 
                            onClick={() => submitToCEO(a._id, empName)}
                          >
                            &#128228; Send to CEO
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {!appraisals.length && !loading && (
          <div className="text-center py-16 px-4">
            <div className="text-[48px] mb-[12px] text-slate-300">👔</div>
            <h3 className="text-[16px] font-[800] text-[#0D2B55] mb-[4px]">Queue is empty</h3>
            <p className="text-[13px] text-[#6b7280] mb-[16px]">Appraisals approved by HR will appear here to be sent to the CEO.</p>
            <button 
              className="bg-white hover:bg-[#FAF8F4] text-[#0f1923] border border-[#E2DDD4] px-[16px] py-[8px] rounded-[8px] text-[12px] font-[700] transition-colors shadow-sm"
              onClick={fetchData}
            >
              &#8635; Refresh Queue
            </button>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {success.show && (
        <div className="fixed inset-0 z-[100] bg-[#0D2B55]/65 backdrop-blur-sm flex items-center justify-center p-[20px] animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] shadow-2xl max-w-[380px] w-full p-[32px_24px] text-center slide-in-from-bottom-4">
            <div className="text-[54px] mb-[16px]">{success.icon}</div>
            <h2 className="text-[20px] font-[800] text-[#0D2B55] mb-[8px]">{success.title}</h2>
            <p className="text-[13px] text-[#6b7280] mb-[24px] leading-relaxed">{success.detail}</p>
            <button 
              className="w-full bg-[#0D2B55] hover:bg-[#1a3d6e] text-white font-[800] text-[14px] py-[12px] rounded-[10px] shadow-sm transition-colors" 
              onClick={() => setSuccess({...success, show: false})}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}