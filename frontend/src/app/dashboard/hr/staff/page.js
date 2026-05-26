'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Edit2, Shield, Trash2, Check } from "lucide-react";
import api from '../../../../lib/api';

// --- INLINED HELPERS TO PREVENT IMPORT ERRORS ---
const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ROLE_COLOURS = {
  'EMPLOYEE': { bg: '#F1F5F9', fg: '#475569', label: 'Staff' },
  'MANAGER': { bg: '#FEF3C7', fg: '#92400E', label: 'Line Manager' },
  'HR_ADMIN': { bg: '#DBEAFE', fg: '#1E40AF', label: 'HR Admin' },
  'CEO': { bg: '#EDE9FE', fg: '#4C1D95', label: 'CEO' },
  'ICT_ADMIN': { bg: '#D1FAE5', fg: '#065F46', label: 'ICT Admin' }
};

export default function StaffManagement() {
  const router = useRouter();
  
  // Real-time Database State
  const [dbStaff, setDbStaff] = useState([]);
  const [dbManagers, setDbManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [search, setSearch] = useState('');
  const [coFilter, setCoFilter] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Live Data from MongoDB
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resUsers, resMgrs] = await Promise.all([
        api.get('/users'),
        api.get('/users/managers').catch(() => ({ data: { data: [] } }))
      ]);
      setDbStaff(resUsers.data?.data || []);
      setDbManagers(resMgrs.data?.data || []);
    } catch (e) {
      console.error("Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Real-time filtering
  let data = [...dbStaff];
  if (search) {
    const s = search.toLowerCase();
    data = data.filter(e => {
      const fn = e.personalDetails?.firstName || '';
      const ln = e.personalDetails?.lastName || '';
      return `${fn} ${ln} ${e.employeeId}`.toLowerCase().includes(s);
    });
  }
  if (coFilter) data = data.filter(e => e.companyCode === coFilter);

  // Database Actions
  const handleSaveEdit = async () => {
    if (!editingStaff) return;
    try {
      await api.patch(`/users/${editingStaff._id}/hr-update`, {
        firstName: editingStaff.personalDetails?.firstName,
        lastName: editingStaff.personalDetails?.lastName,
        jobTitle: editingStaff.employmentDetails?.jobTitle,
        companyCode: editingStaff.companyCode,
        role: editingStaff.security?.role,
        reportingTo: editingStaff.employmentDetails?.reportingTo || null
      });
      setSuccessMsg(`${editingStaff.personalDetails.firstName}'s profile updated successfully.`);
      setEditingStaff(null);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) { alert("Failed to update to database."); }
  };

  const handleDelete = async () => {
    if (!editingStaff || !window.confirm("Are you sure you want to completely remove this employee from the system?")) return;
    try {
      await api.delete(`/users/${editingStaff._id}`);
      setSuccessMsg("Employee deleted successfully.");
      setEditingStaff(null);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) { alert("Failed to delete from database."); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">👥 Live Staff Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time HR access control and directory management.</p>
        </div>
        <button onClick={() => router.push('/dashboard/hr/add-staff')} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow transition-colors">
          + Add New Staff
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2 animate-in fade-in duration-300">
          <Check className="w-5 h-5 text-green-600" /> {successMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search live directory..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-200 outline-none" />
        </div>
        <select value={coFilter} onChange={e => setCoFilter(e.target.value)} className="w-48 px-3 py-2 border rounded-lg text-sm outline-none">
          <option value="">All Companies</option>
          <option>FSM</option><option>CDU</option><option>NAR</option><option>GUM</option>
        </select>
      </div>

      {/* Real-time Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr className="text-xs text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4 font-bold">Employee</th>
              <th className="px-6 py-4 font-bold">Job Title</th>
              <th className="px-6 py-4 font-bold text-center">ID</th>
              <th className="px-6 py-4 font-bold text-center">Role</th>
              <th className="px-6 py-4 font-bold">Manager</th>
              <th className="px-6 py-4 font-bold text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="6" className="py-12 text-center text-slate-400">Syncing with database...</td></tr>
            ) : data.map((e) => {
              const roleKey = e.security?.role || 'EMPLOYEE';
              const roleInfo = ROLE_COLOURS[roleKey];
              const mgr = e.employmentDetails?.reportingTo?.personalDetails;
              const mgrName = mgr ? `${mgr.firstName} ${mgr.lastName}` : 'Unassigned';

              return (
                <tr key={e._id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                        {getInitials(`${e.personalDetails?.firstName} ${e.personalDetails?.lastName}`)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">{e.personalDetails?.firstName} {e.personalDetails?.lastName}</div>
                        <div className="text-[10px] text-slate-500">{e.companyCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-xs font-medium text-slate-700">{e.employmentDetails?.jobTitle}</td>
                  <td className="px-6 py-3 text-center text-xs font-mono text-slate-500">{e.employeeId}</td>
                  <td className="px-6 py-3 text-center">
                    <span style={{ backgroundColor: roleInfo.bg, color: roleInfo.fg }} className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                      {roleInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[11px] font-medium text-slate-600">{mgrName}</td>
                  <td className="px-6 py-3 text-center">
                    <button onClick={() => setEditingStaff(e)} className="px-3 py-1.5 text-xs font-semibold border rounded-md hover:bg-white bg-slate-50 flex items-center justify-center gap-1.5 mx-auto">
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inline Edit Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="text-lg font-bold">Edit Profile</h3>
              <button onClick={() => setEditingStaff(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">First Name</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400" value={editingStaff.personalDetails?.firstName || ''} onChange={e => setEditingStaff({...editingStaff, personalDetails: {...editingStaff.personalDetails, firstName: e.target.value}})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Last Name</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400" value={editingStaff.personalDetails?.lastName || ''} onChange={e => setEditingStaff({...editingStaff, personalDetails: {...editingStaff.personalDetails, lastName: e.target.value}})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Job Title</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400" value={editingStaff.employmentDetails?.jobTitle || ''} onChange={e => setEditingStaff({...editingStaff, employmentDetails: {...editingStaff.employmentDetails, jobTitle: e.target.value}})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Company</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm outline-none" value={editingStaff.companyCode || ''} onChange={e => setEditingStaff({...editingStaff, companyCode: e.target.value})}>
                    <option>FSM</option><option>CDU</option><option>NAR</option><option>GUM</option>
                  </select>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mt-2">
                <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-3"><Shield className="w-4 h-4" /> System Access & Hierarchy</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Role Permissions</label>
                    <select className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm font-semibold" value={editingStaff.security?.role || 'EMPLOYEE'} onChange={e => setEditingStaff({...editingStaff, security: {...editingStaff.security, role: e.target.value}})}>
                      <option value="EMPLOYEE">Standard Employee</option>
                      <option value="MANAGER">Line Manager</option>
                      <option value="HR_ADMIN">HR Admin</option>
                      <option value="CEO">CEO</option>
                      <option value="ICT_ADMIN">ICT Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Direct Manager</label>
                    <select className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" value={editingStaff.employmentDetails?.reportingTo?._id || editingStaff.employmentDetails?.reportingTo || ''} onChange={e => setEditingStaff({...editingStaff, employmentDetails: {...editingStaff.employmentDetails, reportingTo: e.target.value}})}>
                      <option value="">-- Unassigned / CEO --</option>
                      {dbManagers.map(mgr => (
                        <option key={mgr._id} value={mgr._id}>{mgr.personalDetails?.firstName} {mgr.personalDetails?.lastName} (ID: {mgr.employeeId})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 mt-2 border-t">
                <button onClick={handleDelete} className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 hover:text-red-800 uppercase"><Trash2 className="w-4 h-4" /> Delete</button>
                <div className="flex gap-2">
                  <button onClick={() => setEditingStaff(null)} className="px-4 py-2 text-sm font-bold text-slate-600 border rounded-lg">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-lg flex items-center gap-1.5"><Check className="w-4 h-4" /> Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}