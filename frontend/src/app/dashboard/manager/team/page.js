'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';

export default function DirectReports() {
  const router = useRouter();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // NEW: State to hold the currently selected employee for the profile view
  const [selectedEmp, setSelectedEmp] = useState(null);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const res = await api.get('/users/my-team').catch(() => ({ data: { data: [] } }));
        const myTeam = res.data?.data || [];
        setTeam(myTeam);
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchTeam();
  }, []);

  const prC = (p) => p >= 1 ? '#065F46' : p >= 0.6 ? '#92400E' : '#991B1B';

  if (loading) return <div className="p-10 text-center text-slate-500">Loading team data...</div>;

  return (
    <div className="w-full max-w-full pb-[60px]">
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px]">&#128101; Direct Reports</div>
        <div className="text-[13px] text-[#6b7280]">Click on any team member to view their full HR profile</div>
      </div>
      
      <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#FAF8F4] border-b border-[#E2DDD4] text-[11px] font-[700] text-[#6b7280] uppercase tracking-[.06em]">
              <tr>
                <th className="p-[12px_16px]">Employee</th>
                <th className="p-[12px_16px]">Job Title</th>
                <th className="p-[12px_16px] text-center">Emp ID</th>
                <th className="p-[12px_16px] text-center">Company</th>
                <th className="p-[12px_16px] text-center">Pro-Rata</th>
                <th className="p-[12px_16px] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4]">
              {team.map((e) => {
                const pr = (e.employmentDetails?.prorateValue || 12) / 12;
                const fName = e.personalDetails?.firstName || 'Unknown';
                const lName = e.personalDetails?.lastName || '';
                
                return (
                  <tr 
                    key={e._id} 
                    onClick={() => setSelectedEmp(e)} 
                    className="hover:bg-[#EFF6FF] transition-colors cursor-pointer group"
                  >
                    <td className="p-[12px_16px] flex items-center gap-[10px]">
                      <div className="w-[28px] h-[28px] rounded-full bg-[#0D2B55]/10 text-[#0D2B55] flex items-center justify-center text-[10px] font-[800] group-hover:bg-[#0D2B55] group-hover:text-white transition-colors">
                        {fName[0]}{lName[0]}
                      </div>
                      <div className="text-[13px] font-[700] text-[#0D2B55]">{fName} {lName}</div>
                    </td>
                    <td className="p-[12px_16px] text-[12px] text-[#0f1923]">{e.employmentDetails?.jobTitle}</td>
                    <td className="p-[12px_16px] text-center font-mono text-[12px] text-[#6b7280]">
                      {e.employeeId}
                    </td>
                    <td className="p-[12px_16px] text-center">
                      <span className={`text-[10px] font-[700] px-[8px] py-[3px] rounded-full uppercase tracking-wide
                        ${e.companyCode === 'FSM' ? 'bg-[#DBEAFE] text-[#1E40AF]' : 
                          e.companyCode === 'CDU' ? 'bg-[#D1FAE5] text-[#065F46]' : 
                          e.companyCode === 'NAR' ? 'bg-[#FEF3C7] text-[#92400E]' : 
                          'bg-[#EDE9FE] text-[#4C1D95]'}`}>
                        {e.companyCode || 'FSM'}
                      </span>
                    </td>
                    <td className="p-[12px_16px] text-center font-[700] text-[13px]" style={{ color: prC(pr) }}>
                      {pr.toFixed(3)}
                    </td>
                    <td className="p-[12px_16px] text-center">
                      <span className="text-[10px] font-[700] px-[8px] py-[3px] rounded-full bg-[#D1FAE5] text-[#065F46]">Active</span>
                    </td>
                  </tr>
                );
              })}
              {team.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">No direct reports found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-[11px] text-[#6b7280] p-[12px_16px] text-right border-t border-[#E2DDD4] bg-[#FAF8F4]">
          {team.length} direct reports
        </div>
      </div>

      {/* NEW: Employee Profile Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[100] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[20px] w-full max-w-[500px] shadow-2xl overflow-hidden slide-in-from-bottom-4">
            
            {/* Modal Header */}
            <div className="bg-[#0D2B55] p-[24px_24px_30px] relative">
              <button 
                onClick={() => setSelectedEmp(null)} 
                className="absolute top-[16px] right-[16px] bg-white/10 text-white w-[30px] h-[30px] rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                &#215;
              </button>
              <div className="flex items-center gap-[16px]">
                <div className="w-[64px] h-[64px] rounded-full bg-gradient-to-br from-[#C9A84C] to-[#9a7a2e] flex items-center justify-center text-[22px] font-[800] text-[#0D2B55] shadow-lg border-[3px] border-[#0D2B55]">
                  {selectedEmp.personalDetails?.firstName?.[0]}{selectedEmp.personalDetails?.lastName?.[0]}
                </div>
                <div>
                  <h2 className="text-[22px] font-[800] text-white tracking-tight leading-tight">
                    {selectedEmp.personalDetails?.firstName} {selectedEmp.personalDetails?.lastName}
                  </h2>
                  <div className="text-[13px] text-white/70 mt-[2px] font-[500]">
                    {selectedEmp.employmentDetails?.jobTitle}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-[24px] bg-[#FAF8F4] relative">
              {/* Overlapping Info Card */}
              <div className="bg-white border border-[#E2DDD4] rounded-[14px] p-[20px] mt-[-40px] relative z-10 shadow-sm">
                
                <h3 className="text-[11px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[16px] border-b border-[#E2DDD4] pb-[8px]">
                  Employment Details
                </h3>
                
                <div className="grid grid-cols-2 gap-y-[16px] gap-x-[20px]">
                  <div>
                    <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">Employee ID</div>
                    <div className="text-[14px] font-[700] text-[#0f1923] font-mono">{selectedEmp.employeeId}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">System Username</div>
                    <div className="text-[14px] font-[700] text-[#0f1923] font-mono">{selectedEmp.username}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">Company Code</div>
                    <div className="text-[14px] font-[700] text-[#0f1923]">{selectedEmp.companyCode || 'FSM'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">System Role</div>
                    <div className="text-[14px] font-[700] text-[#0f1923]">{selectedEmp.security?.role || 'EMPLOYEE'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">Date of Hire</div>
                    <div className="text-[14px] font-[700] text-[#0f1923]">
                      {new Date(selectedEmp.employmentDetails?.dateOfHire).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#6b7280] font-[600] uppercase mb-[2px]">STIP Pro-Rata</div>
                    <div className="text-[14px] font-[800] text-[#065F46]">
                      {((selectedEmp.employmentDetails?.prorateValue || 12) / 12).toFixed(3)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="p-[16px_24px] bg-white border-t border-[#E2DDD4] flex justify-end gap-[12px]">
              <button 
                onClick={() => setSelectedEmp(null)} 
                className="px-[16px] py-[10px] text-[13px] font-[700] text-[#0f1923] bg-white border-[2px] border-[#E2DDD4] rounded-[10px] hover:border-[#0D2B55] transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => router.push('/dashboard/manager/new')} 
                className="px-[16px] py-[10px] text-[13px] font-[700] text-white bg-[#0D2B55] rounded-[10px] hover:bg-[#1a3d6e] transition-colors flex items-center gap-[6px]"
              >
                &#9997; Start Appraisal
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}