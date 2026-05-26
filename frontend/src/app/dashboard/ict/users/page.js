'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';

export default function ICTUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userModal, setUserModal] = useState({ open: false, id: null });

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const deactivateUser = async (id) => {
    const isConfirmed = window.confirm("Are you sure you want to deactivate this user?");
    if (!isConfirmed) return;

    try {
      // Assuming your backend has an endpoint for user status modification
      // This maps to your backend's user update controller
      await api.patch(`/users/${id}`, { isActive: false });
      
      // Update UI optimistically
      setUsers(users.map(u => u._id === id ? { ...u, isActive: false } : u));
      alert("User has been deactivated.");
    } catch (error) {
      console.error('Deactivation failed:', error);
      alert("Failed to deactivate user. Endpoint might need configuration.");
    }
  };

  const getPanelName = (role) => {
    switch(role) {
      case 'CEO': return 'CEO Panel';
      case 'HR_ADMIN': return 'HR Panel';
      case 'MANAGER': return 'Manager Panel';
      case 'EMPLOYEE': return 'Staff Panel';
      case 'ICT_ADMIN': return 'ICT Panel';
      default: return 'No Access';
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-[600] animate-pulse">Loading System Users...</div>;

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header */}
      <div className="mb-[20px] flex justify-between items-end">
        <div>
          <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
            &#128101; User Management
          </div>
          <div className="text-[13px] text-[#6b7280]">
            STIP portal role assignments — ICT Admin only
          </div>
        </div>
        <button 
          className="bg-[#0D2B55] hover:bg-[#1a3d6e] text-white px-[16px] py-[8px] rounded-[8px] text-[12px] font-[700] transition-colors shadow-sm"
          onClick={() => setUserModal({ open: true, id: null })}
        >
          &#43; Add User
        </button>
      </div>

      <div className="bg-[#DBEAFE] border-[1.5px] border-[#BFDBFE] text-[#1E40AF] rounded-[10px] p-[12px_16px] text-[13px] mb-[20px] shadow-sm flex items-center gap-[10px]">
        <span className="text-[18px] leading-none">&#8505;</span> 
        <span className="leading-[1.5]">Role permissions are enforced at the application level. Each user can only access the panel assigned to their role.</span>
      </div>

      <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm flex flex-col">
        <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center">
          <div className="flex items-center gap-[12px]">
            <div className="w-[36px] h-[36px] rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[16px]">&#128101;</div>
            <div>
              <div className="text-[15px] font-[800] text-[#0D2B55]">System Users</div>
              <div className="text-[12px] font-[500] text-[#6b7280]">All configured STIP portal accounts</div>
            </div>
          </div>
          <span className="bg-[#EFF6FF] text-[#0369A1] border border-[#BFDBFE] px-[12px] py-[4px] rounded-full text-[11px] font-[800]">
            {users.length} users
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-[#FAF8F4] border-b border-[#E2DDD4] text-[10px] font-[800] text-[#6b7280] uppercase tracking-[.06em]">
              <tr>
                <th className="p-[12px_16px]">User</th>
                <th className="p-[12px_16px] text-[#C9A84C]">Role</th>
                <th className="p-[12px_16px]">Email</th>
                <th className="p-[12px_16px] text-center">Panel Access</th>
                <th className="p-[12px_16px] text-center">Status</th>
                <th className="p-[12px_16px] text-center">Last Login</th>
                <th className="p-[12px_16px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4] text-[13px]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-[48px] text-center text-[#6b7280]">
                    No users found in the system.
                  </td>
                </tr>
              ) : (
                users.map((u, i) => {
                  const fName = u.personalDetails?.firstName || u.firstName || '';
                  const lName = u.personalDetails?.lastName || u.lastName || '';
                  const fullName = `${fName} ${lName}`.trim() || 'Unknown User';
                  const init = fName ? fName[0].toUpperCase() : 'U';
                  const isActive = u.isActive !== false; // Assume active unless explicitly false
                  
                  return (
                    <tr key={u._id} className={`hover:bg-[#FAF8F4] transition-colors ${i % 2 === 1 ? 'bg-[#FAF8F4]/40' : 'bg-white'}`}>
                      <td className="p-[12px_16px] whitespace-nowrap">
                        <div className="flex items-center gap-[9px]">
                          <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[#0D2B55] to-[#1E40AF] text-white font-[800] flex items-center justify-center text-[11px] shadow-sm shrink-0">
                            {init}
                          </div>
                          <div>
                            <div className="font-[700] text-[#0D2B55]">{fullName}</div>
                            <div className="text-[10px] text-[#6b7280]">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap font-[700] text-[#0f1923]">
                        {u.role ? u.role.replace('_', ' ') : 'EMPLOYEE'}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-[11px] text-[#6b7280]">
                        {u.email}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <span className="bg-[#EFF6FF] text-[#0369A1] px-[8px] py-[3px] rounded-[4px] text-[10px] font-[800] border border-[#BFDBFE]">
                          {getPanelName(u.role)}
                        </span>
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        {isActive ? (
                          <span className="bg-[#D1FAE5] text-[#065F46] px-[8px] py-[3px] rounded-[4px] text-[10px] font-[800] border border-[#A7F3D0]">
                            &#9679; Active
                          </span>
                        ) : (
                          <span className="bg-[#FEF2F2] text-[#991B1B] px-[8px] py-[3px] rounded-[4px] text-[10px] font-[800] border border-[#FECACA]">
                            &#9679; Inactive
                          </span>
                        )}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center text-[11px] text-[#6b7280]">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-GB') : 'Never'}
                      </td>
                      <td className="p-[12px_16px] whitespace-nowrap text-center">
                        <div className="flex gap-[6px] justify-center">
                          <button 
                            className="bg-white hover:bg-[#FAF8F4] border border-[#E2DDD4] text-[#0f1923] px-[10px] py-[4px] text-[11px] font-[700] rounded-[6px] transition-colors shadow-sm"
                            onClick={() => setUserModal({ open: true, id: u._id })}
                          >
                            &#9998; Edit
                          </button>
                          <button 
                            className="bg-[#FEF2F2] hover:bg-[#FECACA] border border-[#FECACA] text-[#991B1B] px-[10px] py-[4px] text-[11px] font-[700] rounded-[6px] transition-colors shadow-sm"
                            onClick={() => deactivateUser(u._id)}
                            disabled={!isActive}
                          >
                            &#10007; {isActive ? 'Disable' : 'Disabled'}
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

      {/* Basic Edit User Modal Skeleton */}
      {userModal.open && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[100] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[400px] shadow-2xl overflow-hidden slide-in-from-bottom-4">
            <div className="p-[16px_22px] bg-[#0D2B55] flex justify-between items-center text-white">
              <h2 className="text-[15px] font-[800]">
                {userModal.id ? 'Edit System User' : 'Add New User'}
              </h2>
              <button onClick={() => setUserModal({ open: false, id: null })} className="bg-white/10 w-[30px] h-[30px] rounded-[8px] flex items-center justify-center hover:bg-white/20 transition-colors">&times;</button>
            </div>
            <div className="p-[24px]">
              <p className="text-[13px] text-[#6b7280] mb-[20px] leading-[1.6]">
                Editing role assignments directly impacts what pages a user can access. Please contact Database Admin if you require new fields here.
              </p>
              
              <div className="flex justify-end">
                <button 
                  className="bg-[#C9A84C] hover:bg-[#b59540] text-[#0D2B55] px-[16px] py-[10px] rounded-[8px] text-[13px] font-[800] transition-colors shadow-md w-full"
                  onClick={() => setUserModal({ open: false, id: null })}
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}