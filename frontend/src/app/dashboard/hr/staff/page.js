'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Edit2, Shield, Trash2, Check, Download, DollarSign, Calendar as CalIcon } from "lucide-react";
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
  
  // Dynamic Config States
  const [companyCodes, setCompanyCodes] = useState([]);
  const [officeLocations, setOfficeLocations] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  
  const [loading, setLoading] = useState(true);

  // UI State
  const [search, setSearch] = useState('');
  const [coFilter, setCoFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  
  const [editingStaff, setEditingStaff] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Live Data from MongoDB (Including Configs)
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resUsers, resMgrs, configRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/managers').catch(() => ({ data: { data: [] } })),
        api.get('/config/dropdowns').catch(() => ({ data: { data: {} } })) 
      ]);
      
      setDbStaff(resUsers.data?.data || []);
      setDbManagers(resMgrs.data?.data || []);
      
      const configData = configRes.data?.data || {};
      setCompanyCodes(configData.companyCodes || []);
      setOfficeLocations(configData.officeLocations || []);
      setJobTitles(configData.jobTitles || []);
      
    } catch (e) {
      console.error("Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Real-time filtering logic
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
  if (roleFilter) data = data.filter(e => e.security?.role === roleFilter);
  if (managerFilter) {
    if (managerFilter === 'unassigned') {
      data = data.filter(e => !e.employmentDetails?.reportingTo);
    } else {
      data = data.filter(e => e.employmentDetails?.reportingTo?._id === managerFilter || e.employmentDetails?.reportingTo === managerFilter);
    }
  }

// Database Actions
  const handleSaveEdit = async () => {
    if (!editingStaff) return;
    try {
      await api.patch(`/users/${editingStaff._id}/hr-update`, {
        firstName: editingStaff.personalDetails?.firstName,
        lastName: editingStaff.personalDetails?.lastName,
        jobTitle: editingStaff.employmentDetails?.jobTitle,
        officeLocation: editingStaff.employmentDetails?.officeLocation,
        salary: editingStaff.employmentDetails?.salary,
        dateOfHire: editingStaff.employmentDetails?.dateOfHire,
        companyCode: editingStaff.companyCode,
        role: editingStaff.security?.role,
        
        // Extract the _id if it's an object to prevent Mongoose cast errors in the backend
        reportingTo: editingStaff.employmentDetails?.reportingTo?._id || editingStaff.employmentDetails?.reportingTo || null
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

  // CSV Download Logic (Removed Status column)
  const handleDownloadCSV = () => {
    if (data.length === 0) return alert("No data to download.");
    
    const headers = ['Employee ID', 'First Name', 'Last Name', 'Company', 'Office Location', 'Job Title', 'Base Salary', 'Hire Date', 'System Role', 'Reporting Manager'];
    const csvRows = [headers.join(',')];
    
    data.forEach(e => {
      const mgr = e.employmentDetails?.reportingTo?.personalDetails;
      const mgrName = mgr ? `${mgr.firstName} ${mgr.lastName}` : 'Unassigned';
      
      const row = [
        e.employeeId || '',
        `"${e.personalDetails?.firstName || ''}"`,
        `"${e.personalDetails?.lastName || ''}"`,
        e.companyCode || '',
        `"${e.employmentDetails?.officeLocation || 'Unassigned'}"`,
        `"${e.employmentDetails?.jobTitle || ''}"`,
        e.employmentDetails?.salary || 0,
        e.employmentDetails?.dateOfHire ? new Date(e.employmentDetails.dateOfHire).toLocaleDateString() : '',
        ROLE_COLOURS[e.security?.role]?.label || 'Staff',
        `"${mgrName}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `fsmpc_staff_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

      {/* Filters Area */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or ID..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-200 outline-none" />
          </div>
          
          <select value={coFilter} onChange={e => setCoFilter(e.target.value)} className="w-full md:w-40 px-3 py-2 border rounded-lg text-sm outline-none">
            <option value="">All Companies</option>
            {companyCodes.map(code => (
              <option key={`filter-co-${code}`} value={code}>{code}</option>
            ))}
          </select>
          
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full md:w-48 px-3 py-2 border rounded-lg text-sm outline-none">
            <option value="">All Roles</option>
            <option value="EMPLOYEE">Staff / Employee</option>
            <option value="MANAGER">Line Manager</option>
            <option value="HR_ADMIN">HR Admin</option>
            <option value="CEO">CEO</option>
            <option value="ICT_ADMIN">ICT Admin</option>
          </select>

          <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)} className="w-full md:w-64 px-3 py-2 border rounded-lg text-sm outline-none">
            <option value="">All Managers (Any)</option>
            <option value="unassigned">-- Unassigned / CEO --</option>
            {dbManagers.map(m => (
               <option key={m._id} value={m._id}>{m.personalDetails?.firstName} {m.personalDetails?.lastName}</option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-500">
            Showing <span className="text-slate-900">{data.length}</span> staff members
          </div>
          <button onClick={handleDownloadCSV} className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
             <Download className="w-3.5 h-3.5" /> Download CSV
          </button>
        </div>
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
            ) : data.length === 0 ? (
              <tr><td colSpan="6" className="py-12 text-center text-slate-400">No staff found matching filters.</td></tr>
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
                        <div className="text-[10px] text-slate-500">{e.companyCode} • {e.employmentDetails?.officeLocation || 'No Office'}</div>
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

      {/* 🚨 UPGRADED: Expanded Comprehensive Inline Edit Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  {getInitials(`${editingStaff.personalDetails?.firstName} ${editingStaff.personalDetails?.lastName}`)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0D2B55]">Edit Employee Profile</h3>
                  <div className="text-xs text-gray-500 font-mono">ID: {editingStaff.employeeId}</div>
                </div>
              </div>
              <button onClick={() => setEditingStaff(null)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar bg-[#FAF8F4]">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">First Name</label>
                  <input className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0D2B55] shadow-sm" value={editingStaff.personalDetails?.firstName || ''} onChange={e => setEditingStaff({...editingStaff, personalDetails: {...editingStaff.personalDetails, firstName: e.target.value}})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Last Name</label>
                  <input className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0D2B55] shadow-sm" value={editingStaff.personalDetails?.lastName || ''} onChange={e => setEditingStaff({...editingStaff, personalDetails: {...editingStaff.personalDetails, lastName: e.target.value}})} />
                </div>
              </div>
              
              {/* Dynamic Job Title, Office, and Company Code */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Job Title</label>
                  <select className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none shadow-sm focus:border-[#0D2B55] bg-white" value={editingStaff.employmentDetails?.jobTitle || ''} onChange={e => setEditingStaff({...editingStaff, employmentDetails: {...editingStaff.employmentDetails, jobTitle: e.target.value}})}>
                    <option value="" disabled>Select Job Title</option>
                    {jobTitles.map((t, i) => <option key={`edit-jt-${i}`} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Office Location</label>
                  <select className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none shadow-sm focus:border-[#0D2B55] bg-white" value={editingStaff.employmentDetails?.officeLocation || ''} onChange={e => setEditingStaff({...editingStaff, employmentDetails: {...editingStaff.employmentDetails, officeLocation: e.target.value}})}>
                    <option value="" disabled>Select Office</option>
                    {officeLocations.map((o, i) => <option key={`edit-ol-${i}`} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Company</label>
                  <select className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none shadow-sm focus:border-[#0D2B55] bg-white" value={editingStaff.companyCode || ''} onChange={e => setEditingStaff({...editingStaff, companyCode: e.target.value})}>
                    <option value="" disabled>Select Company</option>
                    {companyCodes.map((c, i) => <option key={`edit-co-${i}`} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* 🚨 UPDATED ROW: Removed Account Status Dropdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Base Salary</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input 
                      type="number" min="0" step="500" 
                      className="w-full border rounded-lg pl-8 pr-3 py-2.5 text-sm outline-none focus:border-[#0D2B55] font-mono bg-slate-50" 
                      value={editingStaff.employmentDetails?.salary || ''} 
                      onChange={e => setEditingStaff({...editingStaff, employmentDetails: {...editingStaff.employmentDetails, salary: parseFloat(e.target.value) || 0}})} 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date of Hire</label>
                  <div className="relative">
                    <CalIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="date" 
                      className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#0D2B55] bg-slate-50" 
                      value={editingStaff.employmentDetails?.dateOfHire ? new Date(editingStaff.employmentDetails.dateOfHire).toISOString().split('T')[0] : ''} 
                      onChange={e => setEditingStaff({...editingStaff, employmentDetails: {...editingStaff.employmentDetails, dateOfHire: e.target.value}})} 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#0D2B55]/5 border border-[#0D2B55]/10 rounded-xl p-5 mt-2 shadow-sm">
                <h4 className="text-xs font-bold text-[#0D2B55] flex items-center gap-1.5 mb-4"><Shield className="w-4 h-4" /> System Access & Hierarchy</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Role Permissions</label>
                    <select className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-semibold bg-white" value={editingStaff.security?.role || 'EMPLOYEE'} onChange={e => setEditingStaff({...editingStaff, security: {...editingStaff.security, role: e.target.value}})}>
                      <option value="EMPLOYEE">Standard Employee</option>
                      <option value="MANAGER">Line Manager</option>
                      <option value="HR_ADMIN">HR Admin</option>
                      <option value="CEO">CEO</option>
                      <option value="ICT_ADMIN">ICT Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Direct Manager</label>
                    <select className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white" value={editingStaff.employmentDetails?.reportingTo?._id || editingStaff.employmentDetails?.reportingTo || ''} onChange={e => setEditingStaff({...editingStaff, employmentDetails: {...editingStaff.employmentDetails, reportingTo: e.target.value}})}>
                      <option value="">-- Unassigned / CEO --</option>
                      {dbManagers.map(mgr => (
                        <option key={mgr._id} value={mgr._id}>{mgr.personalDetails?.firstName} {mgr.personalDetails?.lastName} (ID: {mgr.employeeId})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between shrink-0">
              <button onClick={handleDelete} className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors uppercase tracking-wider"><Trash2 className="w-4 h-4" /> Delete Staff</button>
              <div className="flex gap-3">
                <button onClick={() => setEditingStaff(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleSaveEdit} className="px-6 py-2.5 text-sm font-bold text-white bg-[#0D2B55] hover:bg-[#1a3d6e] rounded-lg flex items-center gap-2 shadow-md transition-all"><Check className="w-4 h-4" /> Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}