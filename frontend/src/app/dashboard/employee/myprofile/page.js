'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../../../../lib/api';

export default function EmployeeProfile() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        
        // 1. Get Logged In User Session
        const userCookie = Cookies.get('stip_user');
        if (!userCookie) {
          router.push('/login');
          return;
        }
        const sessionUser = JSON.parse(userCookie);

        // 2. Fetch Live Data to get complete up-to-date employee record
        const usersRes = await api.get('/users').catch(() => ({ data: { data: [] } }));
        const allUsers = usersRes.data?.data || [];
        
        // Match cookie user to DB user to ensure we have all fields
        const fullUser = allUsers.find(u => u._id === sessionUser.id || u.employeeId === sessionUser.employeeId) || sessionUser;
        setUser(fullUser);

      } catch (error) {
        console.error('Failed to load profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [router]);

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-[600] animate-pulse">Loading Your Profile...</div>;
  }

  if (!user) return null;

  const prMonths = user.employmentDetails?.prorateValue || 12;
  const pr = prMonths / 12;
  const pct = Math.min(100, Math.round(pr * 100));
  
  const fName = user.personalDetails?.firstName || '';
  const lName = user.personalDetails?.lastName || '';
  const ini = (fName[0] || '') + (lName[0] || '');
  
  const coCode = user.companyCode || 'FSM';
  const getCoStyles = (code) => {
    switch(code) {
      case 'FSM': return 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]';
      case 'CDU': return 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]';
      case 'NAR': return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
      case 'GUM': return 'bg-[#EDE9FE] text-[#4C1D95] border-[#DDD6FE]';
      default: return 'bg-[#FAF8F4] text-[#6b7280] border-[#E2DDD4]';
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
          &#128100; My Profile
        </div>
        <div className="text-[13px] text-[#6b7280]">Your employee record &mdash; read-only. Contact HR to update any details.</div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-[20px]">
        
        {/* Left Column: Personal Details Card */}
        <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col h-max">
          <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[14px]">&#128100;</div>
            <div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">Personal Details</div>
              <div className="text-[11px] text-[#6b7280]">As registered in the STIP system</div>
            </div>
          </div>
          
          <div className="p-[24px]">
            {/* Avatar & Name Header */}
            <div className="flex items-center gap-[16px] mb-[24px]">
              <div className="w-[64px] h-[64px] rounded-full bg-gradient-to-br from-[#1a3d6e] to-[#2a527f] flex items-center justify-center text-[22px] font-[800] text-white shadow-sm shrink-0">
                {ini}
              </div>
              <div>
                <div className="text-[20px] font-[800] text-[#0D2B55] leading-tight">{fName} {lName}</div>
                <div className="text-[14px] text-[#6b7280] font-[500] mb-[6px]">{user.employmentDetails?.jobTitle || 'Staff'}</div>
                <span className={`px-[8px] py-[3px] rounded-[4px] text-[10px] font-[800] uppercase tracking-wider border ${getCoStyles(coCode)}`}>
                  {coCode}
                </span>
              </div>
            </div>

            {/* List Details */}
            <div className="flex flex-col text-[13px]">
              <div className="flex justify-between items-center py-[12px] border-b border-[#E2DDD4]">
                <span className="text-[#6b7280] font-[600]">Employee ID</span>
                <span className="font-[800] text-[#0D2B55] font-mono bg-[#FAF8F4] border border-[#E2DDD4] px-[8px] py-[4px] rounded-[6px]">{user.employeeId}</span>
              </div>
              <div className="flex justify-between items-center py-[12px] border-b border-[#E2DDD4]">
                <span className="text-[#6b7280] font-[600]">Company</span>
                <span className="font-[700] text-[#0f1923]">{coCode}</span>
              </div>
              <div className="flex justify-between items-center py-[12px] border-b border-[#E2DDD4]">
                <span className="text-[#6b7280] font-[600]">Reporting Manager</span>
                <span className="font-[700] text-[#0f1923] text-right max-w-[200px] truncate">{user.employmentDetails?.rawManagerName || 'Assigned Manager'}</span>
              </div>
              <div className="flex justify-between items-center py-[12px] border-b border-[#E2DDD4]">
                <span className="text-[#6b7280] font-[600]">Last Hire Date</span>
                <span className="font-[700] text-[#0f1923]">
                  {prMonths >= 12 ? 'Before 1 Jan 2026' : (user.employmentDetails?.dateOfHire ? new Date(user.employmentDetails.dateOfHire).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown')}
                </span>
              </div>
              <div className="flex justify-between items-center py-[12px]">
                <span className="text-[#6b7280] font-[600]">STIP Eligibility</span>
                <span className="bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] px-[10px] py-[4px] rounded-full text-[11px] font-[800] flex items-center gap-[4px]">
                  &#10003; Eligible CY2026
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-[16px]">
          
          {/* Pro-Rata Details Card */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#D1FAE5] flex items-center justify-center text-[14px]">&#128200;</div>
              <div>
                <div className="text-[14px] font-[800] text-[#0D2B55]">Pro-Rata Details</div>
                <div className="text-[11px] text-[#6b7280]">Your STIP year coverage</div>
              </div>
            </div>
            
            <div className="p-[20px] flex-1 flex flex-col justify-center">
              <div className="text-center mb-[20px]">
                <div className="text-[48px] font-[800] text-[#0D2B55] leading-none mb-[4px]">{pr.toFixed(3)}</div>
                <div className="text-[13px] font-[600] text-[#6b7280]">{prMonths.toFixed(2)} / 12 months</div>
              </div>
              
              <div className="mb-[16px]">
                <div className="flex justify-between text-[12px] font-[600] mb-[6px]">
                  <span className="text-[#6b7280]">Year coverage</span>
                  <span className="text-[#059669] font-[800]">{pct}%</span>
                </div>
                <div className="h-[8px] bg-[#E2DDD4] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#059669] to-[#C9A84C] rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                </div>
              </div>
              
              <div className="bg-[#FAF8F4] border border-[#E2DDD4] rounded-[10px] p-[12px_16px] text-[12px] text-[#6b7280] leading-[1.6]">
                <strong className="text-[#0D2B55] font-[800]">Formula:</strong> Days worked &divide; 365<br/>
                Start = MAX(Hire Date, 1 Jan 2026)
              </div>
            </div>
          </div>

          {/* Contact HR Card */}
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#FFFBEB] flex items-center justify-center text-[14px]">&#128222;</div>
              <div className="text-[14px] font-[800] text-[#0D2B55]">Contact HR</div>
            </div>
            
            <div className="p-[20px] flex-1 flex flex-col">
              <div className="flex flex-col gap-[10px] text-[13px] mb-[16px]">
                <div className="flex justify-between items-center">
                  <span className="text-[#6b7280] font-[600]">HR Manager</span>
                  <span className="font-[800] text-[#0f1923]">Tracy Helgenberger</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6b7280] font-[600]">Extension</span>
                  <span className="font-[800] text-[#0f1923] bg-[#FAF8F4] border border-[#E2DDD4] px-[6px] py-[2px] rounded-[4px]">201</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6b7280] font-[600]">Email</span>
                  <a href="mailto:hr@fsmpc.fm" className="font-[700] text-[#1E40AF] hover:underline">hr@fsmpc.fm</a>
                </div>
              </div>
              
              <div className="mt-auto bg-[#DBEAFE] border border-[#BFDBFE] rounded-[8px] p-[10px_12px] text-[11px] font-[600] text-[#1E40AF] leading-[1.5]">
                For corrections to your employee record or appraisal, contact HR directly.
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}