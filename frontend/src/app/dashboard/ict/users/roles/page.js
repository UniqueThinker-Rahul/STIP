'use client';

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Check, Save, RotateCcw, X, Users, Power, User, Crown, ClipboardList, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import api from '../../../../../lib/api';
import usePersistentFilter from '../../../../hooks/usePersistentFilter';

// --- SYSTEM PERMISSION SCHEMA MATCHING REFERENCE IMAGE ---
const PANELS_DATA = [
  {
    id: 'MANAGER',
    title: 'Line Manager Panel',
    icon: Users,
    iconColor: 'text-[#475569]',
    count: '5 controllable permissions',
    permissions: [
      { id: 'create_appraisal', label: 'Create & submit appraisals' },
      { id: 'view_team', label: 'View own direct reports' },
      { id: 'edit_drafts', label: 'Save appraisal drafts' },
      { id: 'view_awards', label: 'View live IPRF calculator' }, 
      { id: 'view_own_profile', label: 'View own past submissions' }
    ]
  },
  {
    id: 'HR_ADMIN',
    title: 'HR Admin Panel',
    icon: User,
    iconColor: 'text-[#4F46E5]',
    count: '5 controllable permissions',
    permissions: [
      { id: 'hr_review', label: 'Review & approve/reject appraisals' },
      { id: 'submit_to_hr', label: 'Forward appraisals to CEO' }, 
      { id: 'edit_staff', label: 'Add / edit staff records' },
      { id: 'view_all_staff', label: 'View & export award validation' },
      { id: 'manage_config', label: 'Download PDF / CSV reports' }
    ]
  },
  {
    id: 'CEO',
    title: 'CEO Panel',
    icon: Crown,
    iconColor: 'text-[#F59E0B]',
    count: '5 controllable permissions',
    permissions: [
      { id: 'ceo_approval', label: 'Approve / not-approve appraisals' },
      { id: 'manage_scorecard', label: 'View KPA scorecard & chart' },
      { id: 'manage_roles', label: 'Lock scorecard (publish CP%)' }, 
      { id: 'view_team', label: 'View full decision history' },
      { id: 'view_all_staff', label: 'Download board & award reports' }
    ]
  },
  {
    id: 'EMPLOYEE',
    title: 'Staff Panel',
    icon: ClipboardList,
    iconColor: 'text-[#F87171]',
    count: '5 controllable permissions',
    permissions: [
      { id: 'view_own_profile', label: 'View own appraisal result' },
      { id: 'view_awards', label: 'View own STIP award calculation' },
      { id: 'manage_scorecard', label: 'View published CP%' }, 
      { id: 'ack_appraisals', label: 'Formally acknowledge appraisal' },
      { id: 'edit_drafts', label: 'Access STIP guide & FAQ' } 
    ]
  }
];

const INITIAL_MATRIX = {
  EMPLOYEE: { view_own_profile: true, ack_appraisals: true, view_awards: true, create_appraisal: false, edit_drafts: false, submit_to_hr: false, hr_review: false, ceo_approval: false, view_team: false, view_all_staff: false, edit_staff: false, manage_scorecard: false, manage_config: false, manage_roles: false },
  MANAGER: { view_own_profile: true, ack_appraisals: true, view_awards: true, create_appraisal: true, edit_drafts: true, submit_to_hr: true, hr_review: false, ceo_approval: false, view_team: true, view_all_staff: false, edit_staff: false, manage_scorecard: false, manage_config: false, manage_roles: false },
  HR_ADMIN: { view_own_profile: true, ack_appraisals: true, view_awards: true, create_appraisal: false, edit_drafts: false, submit_to_hr: false, hr_review: true, ceo_approval: false, view_team: false, view_all_staff: true, edit_staff: true, manage_scorecard: false, manage_config: true, manage_roles: false },
  CEO: { view_own_profile: true, ack_appraisals: true, view_awards: true, create_appraisal: true, edit_drafts: true, submit_to_hr: false, hr_review: false, ceo_approval: true, view_team: true, view_all_staff: true, edit_staff: false, manage_scorecard: true, manage_config: false, manage_roles: false },
  ICT_ADMIN: { view_own_profile: true, ack_appraisals: true, view_awards: true, create_appraisal: false, edit_drafts: false, submit_to_hr: false, hr_review: false, ceo_approval: false, view_team: false, view_all_staff: true, edit_staff: false, manage_scorecard: false, manage_config: true, manage_roles: true }
};

const ROLE_LABELS = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Line Manager',
  HR_ADMIN: 'HR Admin',
  CEO: 'CEO',
  ICT_ADMIN: 'ICT Admin'
};

export default function RolesAndPermissions() {
  const [loading, setLoading] = useState(true);
  
  // Matrix States
  const [matrix, setMatrix] = useState(INITIAL_MATRIX);
  const [savedMatrix, setSavedMatrix] = useState(INITIAL_MATRIX);
  
  // Real User States
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // UI States
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  // Fetch saved matrix AND users from MongoDB on load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matrixRes, usersRes] = await Promise.all([
          api.get('/settings/roles-matrix').catch(() => null),
          api.get('/users').catch(() => ({ data: { data: [] } }))
        ]);

        if (matrixRes?.data?.data) {
          setMatrix(matrixRes.data.data);
          setSavedMatrix(matrixRes.data.data);
        }
        
        setUsers(usersRes.data?.data || []);
      } catch (error) {
        console.error("Failed to fetch system data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const current = JSON.stringify(matrix);
    const saved = JSON.stringify(savedMatrix);
    setIsDirty(current !== saved);
  }, [matrix, savedMatrix]);

  // Reset pagination when role filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [userRoleFilter]);

  const handleToggle = (roleKey, permId) => {
    setMatrix(prev => ({
      ...prev,
      [roleKey]: {
        ...prev[roleKey],
        [permId]: !prev[roleKey][permId]
      }
    }));
  };

  const handleDiscard = () => {
    setMatrix(JSON.parse(JSON.stringify(savedMatrix)));
  };

  const handleSaveMatrix = async () => {
    setIsSaving(true);
    try {
      await api.put('/settings/roles-matrix', { matrix });
      setSavedMatrix(JSON.parse(JSON.stringify(matrix)));
      setToast({ show: true, message: 'Role permissions successfully updated in database.' });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
    } catch (error) {
      console.error("Failed to save matrix:", error);
      alert("Failed to save changes to the database.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    const originalUsers = [...users];

    setUsers(users.map(u => 
      u._id === userId 
        ? { ...u, employmentDetails: { ...u.employmentDetails, isActive: newStatus } } 
        : u
    ));

    try {
      await api.patch(`/users/${userId}/status`, { isActive: newStatus })
        .catch(async () => {
          await api.put(`/users/${userId}`, { isActive: newStatus });
        });

      setToast({ show: true, message: `Account access ${newStatus ? 'Activated' : 'Deactivated'} successfully.` });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
    } catch (error) {
      console.error("Failed to update user status:", error);
      setUsers(originalUsers); 
      alert("Failed to update user login credentials. Please check database connection.");
    }
  };

  const filteredUsers = userRoleFilter === 'ALL' 
    ? users 
    : users.filter(u => u.security?.role === userRoleFilter);

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  // Download filtered data
  const handleDownloadCSV = () => {
    if (filteredUsers.length === 0) {
      alert("No data to download.");
      return;
    }

    const headers = ['Employee ID', 'Name', 'Username', 'Portal Role', 'Login Access'];
    const csvRows = [headers.join(',')];

    filteredUsers.forEach(user => {
      const isActive = user.employmentDetails?.isActive ?? true;
      const roleLabel = ROLE_LABELS[user.security?.role] || user.security?.role;
      const name = `${user.personalDetails?.firstName || ''} ${user.personalDetails?.lastName || ''}`;

      const row = [
        user.employeeId || '',
        `"${name}"`,
        `"${user.username}"`,
        `"${roleLabel}"`,
        isActive ? 'Active' : 'Disabled'
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `fsmpc_${userRoleFilter === 'ALL' ? 'all' : userRoleFilter.toLowerCase()}_credentials.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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

  if (loading) return <div className="p-10 text-center font-[600] text-slate-500 animate-pulse">Loading Access Control Systems...</div>;

  return (
    <div className="max-w-[1400px] mx-auto pb-[80px] font-sans text-[#0F172A] px-4 md:px-0">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-[200] p-[12px_20px] rounded-[8px] font-[600] text-[13px] shadow-lg bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] flex items-center gap-[8px] animate-in fade-in slide-in-from-top-4">
          <Check className="w-4 h-4" /> {toast.message}
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-[20px] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-[#0F172A]">
            <Shield className="w-7 h-7" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold tracking-tight">Panel Permissions Control</h1>
          </div>
          <p className="text-[14px] text-gray-500 font-medium">
            ICT Admin configures what each role can see and do. Changes apply immediately across all panels.
          </p>
        </div>
        
        {/* Dynamic Save/Discard Buttons bound to database */}
        <div className="flex items-center gap-[12px] w-full md:w-auto">
          <button 
            onClick={handleDiscard}
            disabled={!isDirty || isSaving}
            className="flex-1 md:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" /> Discard
          </button>
          <button 
            onClick={handleSaveMatrix}
            disabled={!isDirty || isSaving}
            className="flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2 bg-[#0D2B55] hover:bg-[#1a3d6e] text-white rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Processing...' : <><Save className="w-4 h-4" /> Save</>}
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-4 mb-8 flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
        <div className="text-sm text-[#92400E]">
          <span className="font-bold">ICT Admin Authority:</span> Toggling a permission OFF immediately hides that feature from the relevant panel. All changes are logged to the audit trail.
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECTION 1: PANELS GRID LAYOUT (Responsive Cards)     */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start mb-[40px]">
        {PANELS_DATA.map((panel) => {
          const PanelIcon = panel.icon;
          const roleKey = panel.id; 
          
          return (
            <div key={panel.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              
              {/* Card Header */}
              <div className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shadow-sm ${panel.iconColor}`}>
                  <PanelIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-[#0F172A]">{panel.title}</h2>
                  <p className="text-[12px] text-gray-500 font-medium">{panel.count}</p>
                </div>
              </div>

              {/* Permissions List */}
              <div className="flex flex-col border-t border-gray-100">
                {panel.permissions.map((perm, index) => {
                  // Connects the toggle to the real MongoDB state using the roleKey
                  const isON = matrix[roleKey]?.[perm.id] || false; 
                  const isLast = index === panel.permissions.length - 1;

                  return (
                    <div 
                      key={perm.id} 
                      className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${!isLast ? 'border-b border-gray-100' : ''}`}
                    >
                      {/* Text Info */}
                      <div>
                        <div className="text-[13px] font-bold text-[#1E293B] mb-1">
                          {perm.label}
                        </div>
                        <div className="font-mono text-[10px] text-gray-400">
                          {perm.id}
                        </div>
                      </div>

                      {/* Custom Toggle Switch */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(roleKey, perm.id)}
                          className={`relative inline-flex h-[24px] w-[46px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-sm ${
                            isON ? 'bg-[#059669]' : 'bg-gray-200'
                          }`}
                        >
                          <span className="sr-only">Toggle {perm.label}</span>
                          <span
                            className={`pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isON ? 'translate-x-[22px]' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span 
                          className={`text-[12px] font-bold w-6 ${
                            isON ? 'text-[#059669]' : 'text-gray-400'
                          }`}
                        >
                          {isON ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECTION 2: USER CREDENTIAL & ACCESS MANAGEMENT       */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
        <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex flex-col md:flex-row md:items-center justify-between gap-[15px]">
          <div className="flex items-center gap-[10px]">
            <div className="w-[32px] h-[32px] rounded-[8px] bg-red-50 flex items-center justify-center text-red-600 shrink-0">
              <Power className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[15px] font-[800] text-[#0D2B55]">User Credential Control</div>
              <div className="text-[12px] font-[500] text-[#6b7280]">Deactivate or restore login portal access for specific employees</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select 
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="flex-1 md:flex-none border border-[#E2DDD4] rounded-lg text-[13px] px-3 py-2 outline-none focus:border-[#0D2B55] bg-white shadow-sm font-[600] text-[#0D2B55]"
            >
              <option value="ALL">Filter by: All Roles</option>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            
            <button 
              onClick={handleDownloadCSV}
              disabled={filteredUsers.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E2DDD4] hover:bg-[#FAF8F4] text-[#0D2B55] text-[13px] font-[700] rounded-lg shadow-sm transition-colors disabled:opacity-50"
              title="Download Filtered Data"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-[#E2DDD4] bg-white">
                <th className="p-[16px_20px] text-[11px] font-[800] text-[#6b7280] uppercase tracking-widest w-[30%]">Employee Profile</th>
                <th className="p-[16px_20px] text-[11px] font-[800] text-[#6b7280] uppercase tracking-widest">Username</th>
                <th className="p-[16px_20px] text-[11px] font-[800] text-[#6b7280] uppercase tracking-widest">Portal Role</th>
                <th className="p-[16px_20px] text-[11px] font-[800] text-[#6b7280] uppercase tracking-widest text-center">Login Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-[40px] text-center text-[#6b7280] font-[500]">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No users found matching this role.
                  </td>
                </tr>
              ) : (
                currentItems.map(user => {
                  const isActive = user.employmentDetails?.isActive ?? true;
                  const roleLabel = ROLE_LABELS[user.security?.role] || user.security?.role;
                  
                  return (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-[16px_20px]">
                        <div className="text-[14px] font-[700] text-[#0f1923]">
                          {user.personalDetails?.firstName} {user.personalDetails?.lastName}
                        </div>
                        <div className="text-[11px] text-[#6b7280] mt-0.5">ID: {user.employeeId} &bull; {user.employmentDetails?.jobTitle}</div>
                      </td>
                      <td className="p-[16px_20px]">
                        <span className="font-mono text-[12px] bg-slate-100 px-2 py-1 rounded border border-slate-200 text-[#0D2B55] font-[700]">
                          {user.username}
                        </span>
                      </td>
                      <td className="p-[16px_20px]">
                        <span className="text-[11px] font-[800] px-2.5 py-1 rounded-md bg-[#E0E7FF] text-[#4338CA] uppercase tracking-wider">
                          {roleLabel}
                        </span>
                      </td>
                      <td className="p-[16px_20px]">
                        <div className="flex items-center justify-center gap-3">
                          <span className={`text-[12px] font-[700] w-[60px] text-right ${isActive ? 'text-[#059669]' : 'text-[#EF4444]'}`}>
                            {isActive ? 'Active' : 'Disabled'}
                          </span>
                          <button 
                            onClick={() => toggleUserStatus(user._id, isActive)}
                            className={`relative inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner ${isActive ? 'bg-[#059669]' : 'bg-[#EF4444]'}`}
                            title={isActive ? "Disable login access" : "Restore login access"}
                          >
                            <span 
                              className={`pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-[20px]' : 'translate-x-0'}`}
                            />
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

        {/* 🚨 Pagination Footer with Direct Page Selection */}
        {filteredUsers.length > itemsPerPage && (
          <div className="p-[12px_16px] border-t border-[#E2DDD4] bg-[#FAF8F4] flex items-center justify-between mt-auto">
            <div className="text-[12px] text-[#6b7280] font-[600]">
              Showing <span className="text-[#0f1923]">{indexOfFirstItem + 1}</span> to <span className="text-[#0f1923]">{Math.min(indexOfLastItem, filteredUsers.length)}</span> of <span className="text-[#0f1923]">{filteredUsers.length}</span> entries
            </div>
            
            <div className="flex items-center gap-[4px]">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-[6px] rounded-[6px] border border-[#E2DDD4] text-[#6b7280] bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                          : 'bg-white border border-[#E2DDD4] text-[#475569] hover:bg-slate-50 hover:text-[#0D2B55]'
                    }`}
                  >
                    {number}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-[6px] rounded-[6px] border border-[#E2DDD4] text-[#6b7280] bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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