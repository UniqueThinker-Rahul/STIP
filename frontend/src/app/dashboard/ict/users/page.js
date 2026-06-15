'use client';

import { useState, useEffect } from 'react';
import { Shield, Search, Check, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../../lib/api';

const ROLE_OPTIONS = [
  { id: 'CEO', label: 'CEO' },
  { id: 'HR_ADMIN', label: 'HR Admin' },
  { id: 'MANAGER', label: 'Line Manager' },
  { id: 'EMPLOYEE', label: 'Staff' },
  { id: 'ICT_ADMIN', label: 'ICT Admin' }
];

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function SystemAccessSetup() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [toast, setToast] = useState({ show: false, message: '' });
  
  // Track inline edits before saving
  const [pendingChanges, setPendingChanges] = useState({});
  const [savingId, setSavingId] = useState(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users').catch(() => ({ data: { data: [] } }));
      setUsers(res.data?.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- INLINE EDIT HANDLERS ---
  const handlePrimaryRoleChange = (userId, newRole) => {
    setPendingChanges(prev => {
      const currentSecondary = prev[userId]?.secondaryRoles || users.find(u => u._id === userId)?.security?.secondaryRoles || [];
      // If the new primary role was in their secondary roles, remove it from secondary
      const cleanSecondary = currentSecondary.filter(r => r !== newRole);
      
      return {
        ...prev,
        [userId]: { ...prev[userId], role: newRole, secondaryRoles: cleanSecondary }
      };
    });
  };

  const handleSecondaryRoleToggle = (userId, roleId) => {
    setPendingChanges(prev => {
      const currentSecondary = prev[userId]?.secondaryRoles || users.find(u => u._id === userId)?.security?.secondaryRoles || [];
      let newSecondary;
      
      if (currentSecondary.includes(roleId)) {
        newSecondary = currentSecondary.filter(id => id !== roleId); // Remove
      } else {
        newSecondary = [...currentSecondary, roleId]; // Add
      }
      
      return {
        ...prev,
        [userId]: { ...prev[userId], secondaryRoles: newSecondary }
      };
    });
  };

  // --- DATABASE SAVE ---
  const handleSaveSetup = async (user) => {
    setSavingId(user._id);
    try {
      const role = pendingChanges[user._id]?.role || user.security?.role || 'EMPLOYEE';
      const secondaryRoles = pendingChanges[user._id]?.secondaryRoles || user.security?.secondaryRoles || [];
      
      await api.patch(`/users/${user._id}/hr-update`, {
        role,
        secondaryRoles
      });
      
      // Update local state to reflect the save
      setUsers(users.map(u => 
        u._id === user._id ? { ...u, security: { ...u.security, role, secondaryRoles } } : u
      ));
      
      // Clear pending changes for this row
      setPendingChanges(prev => {
        const newObj = { ...prev };
        delete newObj[user._id];
        return newObj;
      });
      
      setToast({ show: true, message: `Access updated for ${user.personalDetails?.firstName}` });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
      
    } catch (error) {
      console.error('Save failed:', error);
      alert("Failed to update user access.");
    } finally {
      setSavingId(null);
    }
  };

  // --- CSV DOWNLOAD REPORT ---
  const handleDownloadReport = () => {
    if (filteredUsers.length === 0) return alert("No data to download.");
    
    let csvContent = "Employee Name,Employee ID,Job Title,Office Station,Primary Role,Additional Roles\n";
    
    // Always download the FULL filtered list, not just the current page
    filteredUsers.forEach(u => {
      const empName = `"${u.personalDetails?.firstName || ''} ${u.personalDetails?.lastName || ''}"`;
      const empId = `"${u.employeeId || ''}"`;
      const jobTitle = `"${u.employmentDetails?.jobTitle || ''}"`;
      const office = `"${u.employmentDetails?.officeLocation || 'Unassigned'}"`;
      
      // We export what is currently saved in the database, not what is pending
      const primaryRoleKey = u.security?.role || 'EMPLOYEE';
      const primaryRoleLabel = ROLE_OPTIONS.find(r => r.id === primaryRoleKey)?.label || primaryRoleKey;
      
      const secondaryRoleKeys = u.security?.secondaryRoles || [];
      const secondaryRoleLabels = secondaryRoleKeys.map(key => ROLE_OPTIONS.find(r => r.id === key)?.label || key).join(' | ');
      
      csvContent += `${empName},${empId},${jobTitle},${office},"${primaryRoleLabel}","${secondaryRoleLabels}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const timeStamp = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    link.setAttribute("download", `ICT_System_Access_Report_${timeStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- FILTERING ---
  const filteredUsers = users.filter(u => {
    const s = search.toLowerCase();
    const fn = u.personalDetails?.firstName?.toLowerCase() || '';
    const ln = u.personalDetails?.lastName?.toLowerCase() || '';
    const id = u.employeeId?.toLowerCase() || '';
    
    const matchesSearch = fn.includes(s) || ln.includes(s) || id.includes(s);
    const matchesRole = roleFilter === 'ALL' || u.security?.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    let pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages = [1, 2, 3, 4, '...', totalPages];
      } else if (currentPage >= totalPages - 2) {
        pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }
    }
    return pages;
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-[600] animate-pulse">Loading System Users...</div>;

  return (
    <div className="max-w-[1400px] mx-auto pb-[60px] font-sans relative">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-[200] p-[12px_20px] rounded-[8px] font-[600] text-[13px] shadow-lg bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] flex items-center gap-[8px] animate-in fade-in slide-in-from-top-4">
          <Check className="w-4 h-4" /> {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-[24px] flex flex-col md:flex-row justify-between items-start md:items-end gap-[12px]">
        <div>
          <div className="text-[24px] font-[800] text-[#0D2B55] mb-[4px] flex items-center gap-[10px]">
            <Shield className="w-6 h-6" /> System Access Setup
          </div>
          <div className="text-[13px] text-[#6b7280]">
            ICT Admin — Configure multi-role access and user portal configurations.
          </div>
        </div>

        <button 
          onClick={handleDownloadReport} 
          disabled={loading || filteredUsers.length === 0}
          className="py-[10px] px-[16px] bg-[#0D2B55] hover:bg-[#1a3d6e] text-white rounded-[8px] text-[13px] font-[700] transition-colors flex items-center gap-[6px] shadow-sm disabled:opacity-50"
        >
          <Download className="w-[14px] h-[14px]" /> Download Filtered Report
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm flex flex-col min-h-[400px]">
        
        {/* Filter Bar */}
        <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col md:flex-row gap-[12px] w-full md:w-auto">
            <div className="relative w-full md:w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by name or ID..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2DDD4] rounded-[8px] text-[13px] focus:outline-none focus:border-[#0D2B55] shadow-sm"
              />
            </div>
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white border border-[#E2DDD4] rounded-[8px] px-3 py-2 text-[13px] font-[600] text-[#0D2B55] focus:outline-none focus:border-[#0D2B55] shadow-sm cursor-pointer"
            >
              <option value="ALL">Filter by Role: All</option>
              {ROLE_OPTIONS.map(r => (
                <option key={`filter-${r.id}`} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Table Area */}
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="bg-[#FAF8F4] border-b border-[#E2DDD4] text-[11px] font-[800] text-[#6b7280] uppercase tracking-[.05em]">
              <tr>
                <th className="p-[16px_20px]">Employee Name</th>
                <th className="p-[16px_20px]">Employee ID</th>
                <th className="p-[16px_20px]">Primary Portal Role</th>
                <th className="p-[16px_20px]">Additional Portal Access</th>
                <th className="p-[16px_20px] text-center w-[160px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-[48px] text-center text-[#6b7280]">
                    No employees match your search filters.
                  </td>
                </tr>
              ) : (
                currentItems.map((u) => {
                  const fName = u.personalDetails?.firstName || '';
                  const lName = u.personalDetails?.lastName || '';
                  const fullName = `${fName} ${lName}`.trim() || 'Unknown User';
                  const title = u.employmentDetails?.jobTitle || 'No Title';
                  const office = u.employmentDetails?.officeLocation || 'Unassigned';
                  
                  // Live state tracking
                  const currentPrimaryRole = pendingChanges[u._id]?.role || u.security?.role || 'EMPLOYEE';
                  const currentSecondaryRoles = pendingChanges[u._id]?.secondaryRoles || u.security?.secondaryRoles || [];
                  const isDirty = !!pendingChanges[u._id]; // Has this row been edited?
                  
                  return (
                    <tr key={u._id} className="hover:bg-[#FAF8F4]/50 transition-colors bg-white">
                      
                      {/* Employee Name */}
                      <td className="p-[16px_20px]">
                        <div className="flex items-center gap-[12px]">
                          <div className="w-[36px] h-[36px] rounded-full bg-[#DBEAFE] text-[#1E40AF] font-[800] flex items-center justify-center text-[13px] shrink-0 border border-[#BFDBFE]">
                            {getInitials(fullName)}
                          </div>
                          <div>
                            <div className="font-[800] text-[14px] text-[#0f1923]">{fullName}</div>
                            <div className="text-[11px] text-[#6b7280] font-[500] mt-[2px]">{title} &bull; {office}</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Employee ID */}
                      <td className="p-[16px_20px]">
                        <span className="bg-[#F1F5F9] border border-[#E2E8F0] px-[8px] py-[4px] rounded-[6px] text-[12px] font-mono text-[#475569] font-[600]">
                          {u.employeeId || 'N/A'}
                        </span>
                      </td>
                      
                      {/* Primary Role */}
                      <td className="p-[16px_20px]">
                        <select 
                          value={currentPrimaryRole}
                          onChange={(e) => handlePrimaryRoleChange(u._id, e.target.value)}
                          className={`w-[180px] bg-white border rounded-[8px] px-3 py-2 text-[13px] font-[600] outline-none shadow-sm transition-colors cursor-pointer ${isDirty ? 'border-[#0D2B55] text-[#0D2B55]' : 'border-[#E2DDD4] text-[#4b5563] hover:border-[#0D2B55]/50'}`}
                        >
                          {ROLE_OPTIONS.map(r => (
                            <option key={`prim-${u._id}-${r.id}`} value={r.id}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                      
                      {/* Additional Portal Access */}
                      <td className="p-[16px_20px]">
                        <div className="flex flex-wrap gap-[12px]">
                          {ROLE_OPTIONS.filter(r => r.id !== currentPrimaryRole).map(role => {
                            const isChecked = currentSecondaryRoles.includes(role.id);
                            return (
                              <label key={`sec-${u._id}-${role.id}`} className="flex items-center gap-[6px] cursor-pointer group">
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  onChange={() => handleSecondaryRoleToggle(u._id, role.id)}
                                  className="w-[14px] h-[14px] rounded border-[#E2DDD4] text-[#0D2B55] focus:ring-[#0D2B55] cursor-pointer"
                                />
                                <span className={`text-[12px] font-[600] transition-colors ${isChecked ? 'text-[#0D2B55]' : 'text-[#6b7280] group-hover:text-[#0f1923]'}`}>
                                  {role.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </td>
                      
                      {/* Action */}
                      <td className="p-[16px_20px] text-center">
                        <button 
                          onClick={() => handleSaveSetup(u)}
                          disabled={savingId === u._id}
                          className={`px-[14px] py-[8px] rounded-[8px] text-[12px] font-[800] flex items-center justify-center gap-[6px] w-full transition-all shadow-sm ${
                            isDirty 
                              ? 'bg-[#0D2B55] hover:bg-[#1a3d6e] text-white' 
                              : 'bg-white border border-[#E2DDD4] text-[#6b7280] hover:text-[#0D2B55] hover:border-[#0D2B55]'
                          }`}
                        >
                          {savingId === u._id ? (
                            'Saving...'
                          ) : (
                            <>
                              <Check className="w-[14px] h-[14px] stroke-[3]" /> Save Setup
                            </>
                          )}
                        </button>
                      </td>
                      
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredUsers.length > itemsPerPage && (
          <div className="p-[12px_16px] border-t border-[#E2DDD4] bg-[#FAF8F4] flex items-center justify-between mt-auto">
            <div className="text-[12px] text-[#6b7280] font-[600]">
              Showing <span className="text-[#0f1923]">{indexOfFirstItem + 1}</span> to <span className="text-[#0f1923]">{Math.min(indexOfLastItem, filteredUsers.length)}</span> of <span className="text-[#0f1923]">{filteredUsers.length}</span> accounts
            </div>
            
            <div className="flex items-center gap-[4px]">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-[6px] rounded-[6px] border border-[#E2DDD4] text-[#6b7280] bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronLeft className="w-[14px] h-[14px]" />
              </button>
              
              <div className="flex gap-[4px] px-[4px]">
                {getPageNumbers().map((number, index) => (
                  <button
                    key={index}
                    onClick={() => number !== '...' && setCurrentPage(number)}
                    disabled={number === '...'}
                    className={`w-[28px] h-[28px] text-[12px] font-[700] rounded-[6px] transition-colors ${
                      number === currentPage 
                        ? 'bg-[#0D2B55] text-white border border-[#0D2B55]' 
                        : number === '...' 
                          ? 'bg-transparent text-[#6b7280] cursor-default'
                          : 'bg-white border border-[#E2DDD4] text-[#475569] hover:bg-slate-50 hover:text-[#0D2B55] shadow-sm'
                    }`}
                  >
                    {number}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-[6px] rounded-[6px] border border-[#E2DDD4] text-[#6b7280] bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronRight className="w-[14px] h-[14px]" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}