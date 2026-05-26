'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';

export default function AllStaff() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [co, setCo] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        const res = await api.get('/users').catch(() => ({ data: { data: [] } }));
        const allUsers = res.data?.data || [];
        
        // Exclude system accounts like ICT Admin if needed, or show everyone.
        setStaffList(allUsers);
      } catch (error) {
        console.error('Failed to load staff data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  // 🚨 BULLETPROOF MANAGER NAME EXTRACTION
  const getManagerName = (userObj) => {
    // 1. Check direct string reference
    if (userObj.employmentDetails?.rawManagerName) {
      return userObj.employmentDetails.rawManagerName;
    }
    
    // 2. Check if manager is populated as an object by the backend
    if (userObj.employmentDetails?.managerId?.personalDetails) {
      const { firstName, lastName } = userObj.employmentDetails.managerId.personalDetails;
      return `${firstName || ''} ${lastName || ''}`.trim();
    }
    
    // 3. 🚨 CRITICAL FIX: If managerId is just a string (ObjectId), find that user in our staffList!
    if (typeof userObj.employmentDetails?.managerId === 'string') {
      const managerUser = staffList.find(u => u._id === userObj.employmentDetails.managerId);
      if (managerUser) {
        const { firstName, lastName } = managerUser.personalDetails || {};
        return `${firstName || ''} ${lastName || ''}`.trim() || 'Manager Found (No Name)';
      }
    }

    // 4. Check top level fallback
    if (userObj.managerName) return userObj.managerName;
    
    return 'Not Assigned';
  };

  // Filter Logic
  const filteredStaff = staffList.filter(e => {
    const fName = (e.personalDetails?.firstName || '').toLowerCase();
    const lName = (e.personalDetails?.lastName || '').toLowerCase();
    const fullName = `${fName} ${lName}`;
    const jobTitle = (e.employmentDetails?.jobTitle || '').toLowerCase();
    const empId = (e.employeeId || '').toLowerCase();
    
    const mgrName = getManagerName(e).toLowerCase();
    const coCode = e.companyCode || 'FSM';

    const searchString = search.toLowerCase();

    if (searchString && !fullName.includes(searchString) && !jobTitle.includes(searchString) && !empId.includes(searchString) && !mgrName.includes(searchString)) return false;
    if (co && coCode !== co) return false;
    
    return true;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentStaffPage = filteredStaff.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 if filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, co]);

  const getPrColor = (pr) => pr >= 1 ? 'text-[#065F46]' : pr >= 0.6 ? 'text-[#92400E]' : 'text-[#991B1B]';
  
  const getCoStyles = (coCode) => {
    switch(coCode) {
      case 'FSM': return 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]';
      case 'CDU': return 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]';
      case 'NAR': return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
      case 'GUM': return 'bg-[#EDE9FE] text-[#4C1D95] border-[#DDD6FE]';
      default: return 'bg-[#FAF8F4] text-[#6b7280] border-[#E2DDD4]';
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px] flex justify-between items-end">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
            &#128101; All Staff
          </div>
          <div className="text-[13px] text-[#6b7280]">{staffList.length} STIP-eligible employees — full read-only access including salary data</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-[12px] mb-[20px]">
        <div className="flex-1 min-w-[250px] relative">
          <input 
            type="text" 
            placeholder="Search name, title, ID, manager..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-[36px] pr-[16px] py-[10px] bg-white border border-[#E2DDD4] rounded-[10px] text-[13px] text-[#0f1923] outline-none focus:border-[#0D2B55] transition-colors shadow-sm"
          />
          <span className="absolute left-[12px] top-[10px] text-[#6b7280] text-[16px] leading-none">&#128269;</span>
        </div>
        <select value={co} onChange={e => setCo(e.target.value)} className="p-[10px_14px] bg-white border border-[#E2DDD4] rounded-[10px] text-[13px] text-[#0f1923] outline-none cursor-pointer shadow-sm min-w-[160px]">
          <option value="">All Companies</option>
          <option value="FSM">FSM</option>
          <option value="CDU">CDU</option>
          <option value="NAR">NAR</option>
          <option value="GUM">GUM</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm flex flex-col min-h-[500px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-[#FAF8F4] border-b border-[#E2DDD4] text-[10px] font-[800] text-[#6b7280] uppercase tracking-[.06em]">
              <tr>
                <th className="p-[12px_16px]">Employee</th>
                <th className="p-[12px_16px] text-[#C9A84C]">Job Title</th>
                <th className="p-[12px_16px] text-center">ID</th>
                <th className="p-[12px_16px] text-center">Co.</th>
                <th className="p-[12px_16px] text-center">Pro-Rata</th>
                <th className="p-[12px_16px] text-center">Months</th>
                <th className="p-[12px_16px]">Manager</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4] text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-[48px] text-center text-[#6b7280] font-[600] animate-pulse">
                    Loading Staff Directory...
                  </td>
                </tr>
              ) : currentStaffPage.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-[48px] text-center text-[#6b7280]">
                    <div className="text-[36px] mb-[12px] opacity-70">&#128269;</div>
                    <div className="text-[15px] font-[700] text-[#0D2B55] mb-[6px]">No matches found</div>
                    <div className="text-[13px]">Try adjusting your search or filters to find what you're looking for.</div>
                  </td>
                </tr>
              ) : (
                currentStaffPage.map((e, i) => {
                  const fName = e.personalDetails?.firstName || '';
                  const lName = e.personalDetails?.lastName || '';
                  const init1 = fName[0] || '';
                  const init2 = lName[0] || '';
                  const coCode = e.companyCode || 'FSM';
                  
                  const prMonths = e.employmentDetails?.prorateValue || 12;
                  const prRatio = prMonths / 12;

                  const hireStr = prMonths >= 12 ? 'Before 2026' : `${prMonths.toFixed(1)} months ago`;
                  
                  // 🚨 ROBUST MANAGER EXTRACTOR
                  const finalManagerName = getManagerName(e);

                  return (
                    <tr key={e._id} className={`hover:bg-[#FAF8F4] transition-colors ${i % 2 === 1 ? 'bg-[#FAF8F4]/40' : 'bg-white'}`}>
                      <td className="p-[12px_16px] whitespace-nowrap">
                        <div className="flex items-center gap-[9px]">
                          <div className="w-[30px] h-[30px] rounded-[6px] bg-[#E2DDD4] text-[#0f1923] font-[800] flex items-center justify-center text-[11px]">
                            {init1}{init2}
                          </div>
                          <div>
                            <div className="font-[600] text-[#0D2B55]">{fName} {lName}</div>
                            <div className="text-[10px] text-[#6b7280]">Hired: {hireStr}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-[12px] text-[#0f1923]">
                        {e.employmentDetails?.jobTitle}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center text-[#6b7280] font-mono text-[12px]">
                        {e.employeeId}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <span className={`px-[8px] py-[3px] rounded-[4px] text-[10px] font-[800] border ${getCoStyles(coCode)}`}>
                          {coCode}
                        </span>
                      </td>
                      <td className={`p-[12px_16px] whitespace-nowrap text-center font-[700] ${getPrColor(prRatio)}`}>
                        {prRatio.toFixed(3)}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center text-[#6b7280] text-[12px] font-[600]">
                        {prMonths.toFixed(1)}/12
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-[12px] text-[#0D2B55] font-[600]">
                        {finalManagerName}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {filteredStaff.length > 0 && (
          <div className="p-[12px_16px] bg-[#FAF8F4] border-t border-[#E2DDD4] flex justify-between items-center">
            <div className="text-[11px] font-[600] text-[#6b7280]">
              Showing <strong className="text-[#0D2B55]">{startIndex + 1}</strong> to <strong className="text-[#0D2B55]">{Math.min(startIndex + itemsPerPage, filteredStaff.length)}</strong> of <strong className="text-[#0D2B55]">{filteredStaff.length}</strong> employees
            </div>
            
            {totalPages > 1 && (
              <div className="flex gap-[6px]">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-[12px] py-[6px] text-[11px] font-[700] bg-white border border-[#E2DDD4] text-[#0f1923] rounded-[6px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
                >
                  &larr; Prev
                </button>
                
                <div className="flex items-center gap-[4px] px-[8px]">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    if (
                      pageNum === 1 || 
                      pageNum === totalPages || 
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-[26px] h-[26px] flex items-center justify-center rounded-[6px] text-[11px] font-[700] transition-colors ${currentPage === pageNum ? 'bg-[#0D2B55] text-white shadow-sm' : 'bg-transparent text-[#6b7280] hover:bg-[#E2DDD4]'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className="text-[#6b7280] text-[10px]">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-[12px] py-[6px] text-[11px] font-[700] bg-white border border-[#E2DDD4] text-[#0f1923] rounded-[6px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}