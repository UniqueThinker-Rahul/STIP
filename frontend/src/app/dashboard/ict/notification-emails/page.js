'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Search, Edit2, ShieldCheck, AlertTriangle, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../../lib/api';

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ROLE_COLOURS = {
  'MANAGER': { bg: '#FEF3C7', fg: '#92400E', label: 'Line Manager' },
  'HR_ADMIN': { bg: '#DBEAFE', fg: '#1E40AF', label: 'HR Admin' },
  'CEO': { bg: '#EDE9FE', fg: '#4C1D95', label: 'CEO' },
  'ICT_ADMIN': { bg: '#D1FAE5', fg: '#065F46', label: 'ICT Admin' }
};

export default function ManageNotificationEmails() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Editing State
  const [editingUser, setEditingUser] = useState(null);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: null,
  });

  const closeDialog = () => setModalConfig({ ...modalConfig, isOpen: false });

  const showDialog = (type, title, message, onConfirm = closeDialog) => {
    setModalConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      const allUsers = res.data?.data || [];
      
      const privilegedUsers = allUsers.filter(u => 
        u.security?.role !== 'EMPLOYEE' && u.employmentDetails?.isActive
      );
      
      setUsers(privilegedUsers);
    } catch (err) {
      console.error("Failed to load users", err);
      showDialog('alert', 'Database Connection Error', 'Failed to load user data from the database. Ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  const getConfiguredEmail = (user) => {
    const role = user.security?.role;
    if (!role || !user.personalDetails?.notificationEmails) return null;
    
    const emails = user.personalDetails.notificationEmails;
    if (typeof emails.get === 'function') return emails.get(role);
    return emails[role] || null;
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setNewEmailInput(getConfiguredEmail(user) || '');
  };

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    if (!newEmailInput || !newEmailInput.includes('@')) {
      return showDialog('alert', 'Validation Error', 'Please enter a valid email address containing an "@" symbol.');
    }

    setIsSaving(true);
    try {
      const targetRole = editingUser.security.role;
      await api.patch(`/users/${editingUser._id}/alert-email`, {
        targetRole: targetRole,
        newEmail: newEmailInput.trim()
      });

      showDialog('alert', 'Success', `Notification email updated successfully. An in-app alert has been sent to ${editingUser.personalDetails?.firstName}.`, () => {
        closeDialog();
        setEditingUser(null);
        fetchUsers(); 
      });

    } catch (err) {
      // Improved error logging to catch 404s
      console.error("Save Error Response:", err.response);
      const errorMsg = err.response?.status === 404 
        ? "404 Error: The backend route '/users/:id/alert-email' does not exist. Please check your userRoutes.js file and restart your Node server." 
        : err.response?.data?.message || 'Failed to save the new email address.';
        
      showDialog('alert', 'Update Failed', errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter Logic
  const filteredUsers = users.filter(u => {
    const s = search.toLowerCase();
    const name = `${u.personalDetails?.firstName || ''} ${u.personalDetails?.lastName || ''}`.toLowerCase();
    const username = (u.username || '').toLowerCase();
    
    const matchesSearch = name.includes(s) || username.includes(s) || u.employeeId?.toLowerCase().includes(s);
    const matchesRole = roleFilter === '' || u.security?.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="max-w-6xl mx-auto pb-[60px] font-sans relative animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="mb-[24px]">
        <div className="text-[24px] font-[800] text-[#0D2B55] mb-[4px] flex items-center gap-[8px]">
          <Mail className="w-[24px] h-[24px] text-[#2563EB]" /> 
          Notification Email Routing
        </div>
        <div className="text-[13px] text-[#6b7280]">
          Manage and override the email addresses used to send system alerts (e.g., Appraisal forwards, approvals) to Managers and Admins.
        </div>
      </div>

      {/* Control Bar (Search & Filter) */}
      <div className="bg-white p-[16px] rounded-[14px] border border-[#E2DDD4] shadow-sm mb-[24px] flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-[12px] top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#6b7280]" />
          <input 
            type="text" 
            placeholder="Search by name, ID, or username..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-[36px] pr-[16px] py-[10px] bg-[#FAF8F4] border border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
          />
        </div>

        <select 
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="py-[10px] px-[16px] bg-[#FAF8F4] border border-[#E2DDD4] rounded-[8px] text-[13px] font-[600] text-[#0f1923] outline-none cursor-pointer hover:border-[#0D2B55]/30 transition-colors w-full sm:w-[200px]"
        >
          <option value="">All Privileged Roles</option>
          <option value="MANAGER">Line Manager</option>
          <option value="HR_ADMIN">HR Admin</option>
          <option value="CEO">CEO</option>
          <option value="ICT_ADMIN">ICT Admin</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[14px] border border-[#E2DDD4] shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-[#FAF8F4] border-b border-[#E2DDD4] text-[10px] font-[800] text-[#6b7280] uppercase tracking-[.06em]">
              <tr>
                <th className="p-[16px_20px]">System User</th>
                <th className="p-[16px_20px]">Primary Role</th>
                <th className="p-[16px_20px]">Routed Email Address</th>
                <th className="p-[16px_20px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4] text-[13px]">
              {loading ? (
                <tr><td colSpan="4" className="p-[32px] text-center text-[#6b7280] animate-pulse font-[600]">Fetching privileged users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="4" className="p-[32px] text-center text-[#6b7280] font-[600]">No administrative users found.</td></tr>
              ) : (
                currentItems.map(u => {
                  const name = `${u.personalDetails?.firstName || ''} ${u.personalDetails?.lastName || ''}`;
                  const roleConfig = ROLE_COLOURS[u.security?.role] || { bg: '#F1F5F9', fg: '#475569', label: u.security?.role };
                  const configuredEmail = getConfiguredEmail(u);

                  return (
                    <tr key={u._id} className="hover:bg-[#FAF8F4] transition-colors">
                      <td className="p-[16px_20px]">
                        <div className="flex items-center gap-[12px]">
                          <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-br from-[#0D2B55] to-[#1E40AF] text-white flex items-center justify-center text-[11px] font-[800] shadow-sm shrink-0">
                            {getInitials(name)}
                          </div>
                          <div>
                            <div className="font-[800] text-[#0D2B55]">{name}</div>
                            <div className="text-[11px] text-[#6b7280] font-mono mt-[2px]">{u.employeeId} &middot; {u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-[16px_20px]">
                        <span 
                          style={{ backgroundColor: roleConfig.bg, color: roleConfig.fg }} 
                          className="px-[8px] py-[3px] rounded-[6px] text-[10px] font-[800] uppercase tracking-wider border border-black/5"
                        >
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="p-[16px_20px]">
                        {configuredEmail ? (
                          <div className="font-[600] text-[#059669] flex items-center gap-[6px]">
                            <Mail className="w-[14px] h-[14px]" /> {configuredEmail}
                          </div>
                        ) : (
                          <div className="font-[500] text-[#94a3b8] italic">
                            Not configured (Falls back to username)
                          </div>
                        )}
                      </td>
                      <td className="p-[16px_20px] text-right">
                        <button 
                          onClick={() => openEditModal(u)}
                          className="px-[12px] py-[6px] bg-white border border-[#E2DDD4] text-[#0D2B55] text-[11px] font-[700] rounded-[6px] hover:bg-[#FAF8F4] hover:border-[#0D2B55] transition-colors shadow-sm inline-flex items-center gap-[6px]"
                        >
                          <Edit2 className="w-[12px] h-[12px]" /> Edit Email
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {filteredUsers.length > itemsPerPage && (
          <div className="p-[16px] border-t border-[#E2DDD4] bg-[#FAF8F4] flex items-center justify-between mt-auto">
            <div className="text-[12px] text-[#6b7280] font-[600]">
              Showing <span className="text-[#0D2B55]">{indexOfFirstItem + 1}</span> to <span className="text-[#0D2B55]">{Math.min(indexOfLastItem, filteredUsers.length)}</span> of <span className="text-[#0D2B55]">{filteredUsers.length}</span> administrators
            </div>
            
            <div className="flex gap-[6px]">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-[6px] rounded-[6px] bg-white border border-[#E2DDD4] text-[#6b7280] hover:border-[#0D2B55] hover:text-[#0D2B55] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronLeft className="w-[16px] h-[16px]" />
              </button>
              
              <div className="flex items-center px-[8px] text-[12px] font-[700] text-[#0D2B55]">
                Page {currentPage} of {totalPages}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-[6px] rounded-[6px] bg-white border border-[#E2DDD4] text-[#6b7280] hover:border-[#0D2B55] hover:text-[#0D2B55] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronRight className="w-[16px] h-[16px]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Edit Form Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[500px] overflow-hidden slide-in-from-bottom-4">
            
            <div className="flex justify-between items-center px-[24px] py-[16px] border-b border-[#E2DDD4] bg-[#FAF8F4]">
              <h3 className="text-[16px] font-[800] text-[#0D2B55] flex items-center gap-[8px]">
                <Mail className="w-[18px] h-[18px] text-[#2563EB]" /> Edit Route Address
              </h3>
              <button onClick={() => setEditingUser(null)} className="p-[6px] bg-white border border-[#E2DDD4] hover:bg-[#F1F5F9] rounded-full transition-colors text-[#6b7280]">
                <X className="w-[16px] h-[16px]" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEmail} className="p-[24px]">
              
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[8px] p-[12px] mb-[20px] flex items-start gap-[10px]">
                <ShieldCheck className="w-[16px] h-[16px] text-[#1E40AF] shrink-0 mt-[2px]" />
                <div className="text-[12px] text-[#1E40AF] leading-relaxed">
                  You are editing the email destination for <strong>{editingUser.personalDetails?.firstName} {editingUser.personalDetails?.lastName}</strong>. 
                  When saved, an alert will be sent to their in-app bell notification confirming the change.
                </div>
              </div>

              <div className="flex flex-col gap-[8px] mb-[24px]">
                <label className="text-[12px] font-[800] text-[#0D2B55] uppercase tracking-wider">
                  Target Role: <span className="text-[#2563EB]">{editingUser.security?.role?.replace('_', ' ')}</span>
                </label>
                <input 
                  type="email" 
                  autoFocus
                  required
                  placeholder="e.g., manager.name@fsmpetroleum.com"
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  className="w-full p-[12px_16px] bg-[#FAF8F4] border border-[#E2DDD4] rounded-[8px] text-[13px] font-mono outline-none focus:border-[#0D2B55] focus:ring-1 focus:ring-[#0D2B55] transition-all"
                />
              </div>

              <div className="flex justify-end gap-[12px] pt-[16px] border-t border-[#E2DDD4]">
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)}
                  className="px-[16px] py-[10px] text-[#475569] font-[700] text-[12px] bg-white border border-[#E2DDD4] hover:bg-[#F1F5F9] rounded-[8px] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-[20px] py-[10px] text-white font-[800] text-[12px] bg-[#0D2B55] hover:bg-[#1a3d6e] rounded-[8px] shadow-sm transition-colors flex items-center gap-[8px] disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-[14px] h-[14px] animate-spin" />}
                  Save & Notify User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚨 Universal Custom Modal for System Alerts */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-[24px]">
              <div className="flex items-center gap-[10px] mb-[12px]">
                {modalConfig.title.includes('Error') || modalConfig.title.includes('Failed') ? (
                  <AlertTriangle className="w-[20px] h-[20px] text-red-600" />
                ) : (
                  <ShieldCheck className="w-[20px] h-[20px] text-green-600" />
                )}
                <h3 className="text-[18px] font-[800] text-slate-800">{modalConfig.title}</h3>
              </div>
              
              <p className="text-[14px] text-slate-600 mb-[24px] whitespace-pre-wrap leading-relaxed">
                {modalConfig.message}
              </p>

              <div className="flex justify-end gap-[12px]">
                <button 
                  type="button"
                  onClick={() => modalConfig.onConfirm()}
                  className={`px-[20px] py-[10px] text-white font-[800] text-[13px] rounded-[8px] shadow-sm transition-colors ${
                    modalConfig.title.includes('Error') || modalConfig.title.includes('Failed')
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-[#0D2B55] hover:bg-[#1a3d6e]'
                  }`}
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}