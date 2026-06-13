'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Edit2, Shield, Trash2, Check, Download, ChevronDown, RotateCcw, Trash, Users, AlertTriangle } from "lucide-react";
import api from '../../../../lib/api';

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

const ALL_ROLES = [
  { id: 'EMPLOYEE', label: 'Staff' },
  { id: 'MANAGER', label: 'Line Manager' },
  { id: 'HR_ADMIN', label: 'HR Admin' },
  { id: 'CEO', label: 'CEO' },
  { id: 'ICT_ADMIN', label: 'ICT Admin' }
];

export default function StaffManagement() {
  const router = useRouter();
  
  // Real-time Database State
  const [dbStaff, setDbStaff] = useState([]);
  const [dbRecycleBin, setDbRecycleBin] = useState([]); 
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
  const [isRecycleBinView, setIsRecycleBinView] = useState(false); 

  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchQueries, setSearchQueries] = useState({ title: '', office: '', co: '', mgr: '' });
  const dropdownRef = useRef(null);

  // 🚨 NEW: State for mass delete loader
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resUsers, resBin, resMgrs, configRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/recycle-bin').catch(() => ({ data: { data: [] } })), 
        api.get('/users/managers').catch(() => ({ data: { data: [] } })),
        api.get('/config/dropdowns').catch(() => ({ data: { data: {} } })) 
      ]);
      
      setDbStaff(resUsers.data?.data || []);
      setDbRecycleBin(resBin.data?.data || []);
      setDbManagers(resMgrs.data?.data || []);
      
      const configData = configRes.data?.data || {};
      setCompanyCodes(configData.companyCodes || ['FSM', 'CDU', 'NAR', 'GUM']);
      setOfficeLocations(configData.officeLocations || []);
      setJobTitles(configData.jobTitles || []);
      
    } catch (e) {
      console.error("Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sourceData = isRecycleBinView ? dbRecycleBin : dbStaff;
  let data = [...sourceData];
  
  if (search) {
    const s = search.toLowerCase();
    data = data.filter(e => {
      const fn = e.personalDetails?.firstName || '';
      const ln = e.personalDetails?.lastName || '';
      return `${fn} ${ln} ${e.employeeId}`.toLowerCase().includes(s);
    });
  }
  
  if (coFilter) data = data.filter(e => e.companyCode === coFilter);
  if (roleFilter) data = data.filter(e => e.security?.role === roleFilter || (e.security?.secondaryRoles || []).includes(roleFilter));
  if (managerFilter) {
    if (managerFilter === 'unassigned') {
      data = data.filter(e => !e.employmentDetails?.reportingTo);
    } else {
      data = data.filter(e => e.employmentDetails?.reportingTo?._id === managerFilter || e.employmentDetails?.reportingTo === managerFilter);
    }
  }

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
        secondaryRoles: editingStaff.security?.secondaryRoles || [],
        reportingTo: editingStaff.employmentDetails?.reportingTo?._id || editingStaff.employmentDetails?.reportingTo || null
      });
      
      setSuccessMsg(`${editingStaff.personalDetails.firstName}'s profile updated successfully.`);
      setEditingStaff(null);
      setOpenDropdown(null); 
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) { alert("Failed to update to database."); }
  };

  const handleDelete = async () => {
    if (!editingStaff || !window.confirm("Are you sure you want to move this employee to the Recycle Bin?")) return;
    try {
      await api.delete(`/users/${editingStaff._id}`); 
      setSuccessMsg("Employee moved to Recycle Bin.");
      setEditingStaff(null);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) { alert("Failed to delete from database."); }
  };

  // 🚨 NEW: Mass Delete Function
  const handleMassDelete = async () => {
    if (dbStaff.length === 0) return alert("No active staff to delete.");
    
    const confirm1 = window.confirm(`WARNING: You are about to move ALL ${dbStaff.length} active employees to the Recycle Bin.\n\nAre you absolutely sure you want to do this?`);
    if (!confirm1) return;

    const confirm2 = window.prompt(`To confirm this mass deletion, please type "DELETE ALL" below:`);
    if (confirm2 !== "DELETE ALL") {
      return alert("Mass deletion cancelled.");
    }

    try {
      setIsDeletingAll(true);
      // NOTE: You need to add this route to your backend user routes: router.delete('/mass-delete', ...)
      await api.delete('/users/mass-delete'); 
      setSuccessMsg(`All employees have been successfully moved to the Recycle Bin.`);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (e) { 
      console.error(e);
      alert("Failed to execute mass deletion. Make sure the backend route exists."); 
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleRestore = async (userId) => {
    try {
      await api.patch(`/users/${userId}/restore`);
      setSuccessMsg("Employee successfully restored to active directory.");
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) { alert("Failed to restore user."); }
  };

  const handlePermanentDelete = async (userId) => {
    if (!window.confirm("WARNING: This will permanently erase the employee from the database. This action cannot be undone. Are you sure?")) return;
    try {
      await api.delete(`/users/${userId}/permanent`);
      setSuccessMsg("Employee permanently deleted from the system.");
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) { alert("Failed to permanently delete user."); }
  };

  const handleDownloadCSV = () => {
    if (data.length === 0) return alert("No data to download.");
    
    const headers = ['Employee ID', 'First Name', 'Last Name', 'Company', 'Office Location', 'Job Title', 'Base Salary', 'Hire Date', 'Primary Role', 'Secondary Roles', 'Reporting Manager'];
    const csvRows = [headers.join(',')];
    
    data.forEach(e => {
      const mgr = e.employmentDetails?.reportingTo?.personalDetails;
      const mgrName = mgr ? `${mgr.firstName} ${mgr.lastName}` : 'Unassigned';
      const secondaryRoles = (e.security?.secondaryRoles || []).map(r => ROLE_COLOURS[r]?.label).join(' & ');
      
      const row = [
        e.employeeId || '',
        `"${e.personalDetails?.firstName || ''}"`,
        `"${e.personalDetails?.lastName || ''}"`,
        e.companyCode || '',
        `"${e.employmentDetails?.officeLocation || 'd'}"`,
        `"${e.employmentDetails?.jobTitle || ''}"`,
        e.employmentDetails?.salary || 0,
        e.employmentDetails?.dateOfHire ? new Date(e.employmentDetails.dateOfHire).toLocaleDateString() : '',
        ROLE_COLOURS[e.security?.role]?.label || 'Staff',
        `"${secondaryRoles}"`,
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

  const handleToggleSecondaryRole = (roleId) => {
    const currentSecondaryRoles = editingStaff.security?.secondaryRoles || [];
    let newSecondaryRoles;

    if (currentSecondaryRoles.includes(roleId)) {
      newSecondaryRoles = currentSecondaryRoles.filter(id => id !== roleId);
    } else {
      newSecondaryRoles = [...currentSecondaryRoles, roleId];
    }

    setEditingStaff({
      ...editingStaff,
      security: {
        ...editingStaff.security,
        secondaryRoles: newSecondaryRoles
      }
    });
  };

  const renderSearchableDropdown = (fieldKey, dbFieldObj, dbFieldProp, options, placeholder, displayKey, valueKey = null) => {
    const isOpen = openDropdown === fieldKey;
    const query = searchQueries[fieldKey] || '';
    
    const filteredOptions = options.filter(opt => {
      const rawText = typeof opt === 'string' ? opt : (displayKey ? displayKey(opt) : '');
      const text = String(rawText || ''); 
      return text.toLowerCase().includes(query.toLowerCase());
    });

    const currentValue = dbFieldProp 
        ? editingStaff[dbFieldObj]?.[dbFieldProp] 
        : editingStaff[dbFieldObj];
        
    const safeCurrentValue = (fieldKey === 'mgr' && typeof currentValue === 'object' && currentValue !== null) 
        ? currentValue._id 
        : currentValue;

    const selectedText = safeCurrentValue 
      ? (typeof options[0] === 'string' 
          ? safeCurrentValue 
          : displayKey(options.find(o => (valueKey ? o[valueKey] : o._id) === safeCurrentValue)) || placeholder)
      : placeholder;

    const handleSelect = (val) => {
        setEditingStaff(prev => {
            const newState = { ...prev };
            if (dbFieldProp) {
                newState[dbFieldObj] = { ...newState[dbFieldObj], [dbFieldProp]: val };
            } else {
                newState[dbFieldObj] = val;
            }
            return newState;
        });
        setOpenDropdown(null);
        setSearchQueries(prev => ({ ...prev, [fieldKey]: '' }));
    };

    return (
      <div className="relative w-full" ref={isOpen ? dropdownRef : null}>
        <div 
          onClick={() => setOpenDropdown(isOpen ? null : fieldKey)}
          className={`w-full px-[12px] py-[10px] border rounded-[8px] text-[13px] bg-white transition-colors cursor-pointer flex justify-between items-center shadow-sm ${isOpen ? 'border-[#0D2B55] ring-2 ring-[#0D2B55]/10' : 'border-slate-300'}`}
        >
          <span className={safeCurrentValue ? "text-[#0f1923]" : "text-gray-400 truncate"}>{selectedText}</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {isOpen && (
          <div className="absolute z-[100] mt-1 w-full bg-white border border-[#E2DDD4] rounded-[8px] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-gray-100 bg-slate-50 sticky top-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search..."
                  value={searchQueries[fieldKey] || ''}
                  onChange={(e) => setSearchQueries(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md outline-none focus:border-[#0D2B55]"
                />
              </div>
            </div>
            
            <div className="max-h-[180px] overflow-y-auto overflow-x-hidden custom-scrollbar">
              {fieldKey === 'mgr' && !query && (
                <div 
                    onClick={() => handleSelect(null)}
                    className={`px-3 py-2 text-[12px] cursor-pointer hover:bg-[#0D2B55] hover:text-white transition-colors truncate ${!safeCurrentValue ? 'bg-blue-50 font-bold text-[#0D2B55]' : 'text-slate-500 italic'}`}
                >
                    -- Unassigned / CEO --
                </div>
              )}
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-xs text-center text-gray-500">No results found</div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const val = typeof opt === 'string' ? opt : (valueKey ? opt[valueKey] : opt._id);
                  const display = typeof opt === 'string' ? opt : displayKey(opt);
                  const isSelected = safeCurrentValue === val;
                  
                  return (
                    <div
                      key={val || idx}
                      onClick={() => handleSelect(val)}
                      className={`px-3 py-2 text-[12px] cursor-pointer hover:bg-[#0D2B55] hover:text-white transition-colors truncate ${isSelected ? 'bg-blue-50 font-bold text-[#0D2B55]' : 'text-[#0f1923]'}`}
                    >
                      {display}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {isRecycleBinView ? <><Trash className="w-6 h-6 text-red-500" /> Recycle Bin</> : <><Users className="w-6 h-6 text-slate-800"/> Live Staff Directory</>}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRecycleBinView ? 'Review and restore deleted employee records.' : 'Real-time HR access control and directory management.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsRecycleBinView(!isRecycleBinView)} 
            className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 border ${isRecycleBinView ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
          >
            {isRecycleBinView ? <><Users className="w-4 h-4"/> Back to Active Directory</> : <><Trash2 className="w-4 h-4"/> View Recycle Bin ({dbRecycleBin.length})</>}
          </button>
          {!isRecycleBinView && (
            <button onClick={() => router.push('/dashboard/hr/add-staff')} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow transition-colors">
              + Add New Staff
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2 animate-in fade-in duration-300">
          <Check className="w-5 h-5 text-green-600" /> {successMsg}
        </div>
      )}

      {/* Filters Area */}
      <div className={`p-4 rounded-xl shadow-sm border space-y-4 ${isRecycleBinView ? 'bg-red-50/30 border-red-100' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or ID..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-200 outline-none bg-white" />
          </div>
          
          <select value={coFilter} onChange={e => setCoFilter(e.target.value)} className="w-full md:w-40 px-3 py-2 border rounded-lg text-sm outline-none bg-white">
            <option value="">All Companies</option>
            {companyCodes.map(code => (
              <option key={`filter-co-${code}`} value={code}>{code}</option>
            ))}
          </select>
          
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full md:w-48 px-3 py-2 border rounded-lg text-sm outline-none bg-white">
            <option value="">All Roles</option>
            <option value="EMPLOYEE">Staff / Employee</option>
            <option value="MANAGER">Line Manager</option>
            <option value="HR_ADMIN">HR Admin</option>
            <option value="CEO">CEO</option>
            <option value="ICT_ADMIN">ICT Admin</option>
          </select>

          <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)} className="w-full md:w-64 px-3 py-2 border rounded-lg text-sm outline-none bg-white">
            <option value="">All Managers (Any)</option>
            <option value="unassigned">-- Unassigned / CEO --</option>
            {dbManagers.map(m => (
               <option key={m._id} value={m._id}>{m.personalDetails?.firstName} {m.personalDetails?.lastName}</option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-500">
            Showing <span className="text-slate-900">{data.length}</span> {isRecycleBinView ? 'deleted' : 'active'} staff members
          </div>
          
          <div className="flex gap-2">
            {/* 🚨 NEW: Mass Delete Button (Only in active view) */}
            {!isRecycleBinView && (
              <button 
                onClick={handleMassDelete} 
                disabled={dbStaff.length === 0 || isDeletingAll}
                className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {isDeletingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />} 
                Delete All Staff
              </button>
            )}

            <button onClick={handleDownloadCSV} className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border shadow-sm hover:bg-slate-50 rounded-lg transition-colors">
               <Download className="w-3.5 h-3.5" /> Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Table */}
      <div className={`rounded-xl shadow-sm border overflow-hidden ${isRecycleBinView ? 'bg-red-50/10 border-red-200' : 'bg-white border-slate-200'}`}>
        <table className="w-full text-left">
          <thead className={isRecycleBinView ? 'bg-red-50/50 border-b border-red-100' : 'bg-slate-50 border-b'}>
            <tr className="text-xs text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4 font-bold">Employee</th>
              <th className="px-6 py-4 font-bold">Job Title</th>
              <th className="px-6 py-4 font-bold text-center">ID</th>
              <th className="px-6 py-4 font-bold text-center">Roles</th>
              <th className="px-6 py-4 font-bold">Manager</th>
              <th className="px-6 py-4 font-bold text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="6" className="py-12 text-center text-slate-400">Syncing with database...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="6" className="py-12 text-center text-slate-400">{isRecycleBinView ? 'Recycle bin is empty.' : 'No active staff found matching filters.'}</td></tr>
            ) : data.map((e) => {
              const roleKey = e.security?.role || 'EMPLOYEE';
              const roleInfo = ROLE_COLOURS[roleKey];
              const secondaryRoles = e.security?.secondaryRoles || [];
              const mgr = e.employmentDetails?.reportingTo?.personalDetails;
              const mgrName = mgr ? `${mgr.firstName} ${mgr.lastName}` : 'Unassigned';

              return (
                <tr key={e._id} className={isRecycleBinView ? 'hover:bg-red-50/30' : 'hover:bg-slate-50'}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold ${isRecycleBinView ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                        {getInitials(`${e.personalDetails?.firstName} ${e.personalDetails?.lastName}`)}
                      </div>
                      <div>
                        <div className={`font-bold text-sm ${isRecycleBinView ? 'text-red-900 line-through opacity-70' : 'text-slate-900'}`}>{e.personalDetails?.firstName} {e.personalDetails?.lastName}</div>
                        <div className="text-[10px] text-slate-500">{e.companyCode} • {e.employmentDetails?.officeLocation || 'No Office'}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-3 text-xs font-medium ${isRecycleBinView ? 'text-red-700/70' : 'text-slate-700'}`}>{e.employmentDetails?.jobTitle}</td>
                  <td className="px-6 py-3 text-center text-xs font-mono text-slate-500">{e.employeeId}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-col items-center gap-1.5">
                      <span style={{ backgroundColor: roleInfo.bg, color: roleInfo.fg }} className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isRecycleBinView ? 'opacity-50 grayscale' : ''}`}>
                        {roleInfo.label}
                      </span>
                      {secondaryRoles.length > 0 && (
                        <div className="flex gap-1">
                           {secondaryRoles.map(r => (
                             <div key={r} style={{ backgroundColor: ROLE_COLOURS[r].bg, color: ROLE_COLOURS[r].fg }} className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm ${isRecycleBinView ? 'opacity-50 grayscale' : ''}`} title={`Also has ${ROLE_COLOURS[r].label} access`}>
                               {ROLE_COLOURS[r].label.charAt(0)}
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-[11px] font-medium text-slate-600">{mgrName}</td>
                  <td className="px-6 py-3 text-center">
                    {isRecycleBinView ? (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleRestore(e._id)} className="px-3 py-1.5 text-xs font-bold border border-green-200 text-green-700 hover:bg-green-50 rounded-md flex items-center gap-1.5 transition-colors bg-white shadow-sm">
                          <RotateCcw className="w-3 h-3" /> Restore
                        </button>
                        <button onClick={() => handlePermanentDelete(e._id)} className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors bg-white shadow-sm" title="Permanently Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingStaff(e)} className="px-3 py-1.5 text-xs font-semibold border rounded-md hover:bg-white bg-slate-50 flex items-center justify-center gap-1.5 mx-auto">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
              <button onClick={() => { setEditingStaff(null); setOpenDropdown(null); }} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Job Title</label>
                  {renderSearchableDropdown('title', 'employmentDetails', 'jobTitle', jobTitles, 'Search Title...', null)}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Office Location</label>
                  {renderSearchableDropdown('office', 'employmentDetails', 'officeLocation', officeLocations, 'Search Office...', null)}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Company</label>
                  {renderSearchableDropdown('co', 'companyCode', null, companyCodes, 'Select Company...', null)}
                </div>
              </div>

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
                    <input 
                      type="date" 
                      className="w-full border rounded-lg pl-3 pr-3 py-2.5 text-sm outline-none focus:border-[#0D2B55] bg-slate-50" 
                      value={editingStaff.employmentDetails?.dateOfHire ? new Date(editingStaff.employmentDetails.dateOfHire).toISOString().split('T')[0] : ''} 
                      onChange={e => setEditingStaff({...editingStaff, employmentDetails: {...editingStaff.employmentDetails, dateOfHire: e.target.value}})} 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#0D2B55]/5 border border-[#0D2B55]/10 rounded-xl p-5 mt-2 shadow-sm">
                <h4 className="text-xs font-bold text-[#0D2B55] flex items-center gap-1.5 mb-4"><Shield className="w-4 h-4" /> System Access & Hierarchy</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Primary Role Dashboard</label>
                    <select className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-semibold bg-white shadow-sm" value={editingStaff.security?.role || 'EMPLOYEE'} onChange={e => setEditingStaff({...editingStaff, security: {...editingStaff.security, role: e.target.value}})}>
                      {ALL_ROLES.map(role => (
                        <option key={`primary-${role.id}`} value={role.id}>{role.label}</option>
                      ))}
                    </select>
                    <div className="text-[10px] text-slate-500 mt-1">Dictates the default landing dashboard.</div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Direct Manager</label>
                    {renderSearchableDropdown('mgr', 'employmentDetails', 'reportingTo', dbManagers, 'Search for Manager...', (m) => {
                       if (!m) return '';
                       const fName = m.personalDetails?.firstName || m.firstName || '';
                       const lName = m.personalDetails?.lastName || m.lastName || '';
                       const isSecondary = !['MANAGER', 'HR_ADMIN', 'CEO'].includes(m.security?.role);
                       return `${fName} ${lName}${isSecondary ? ` (${m.security?.role})` : ''}`.trim();
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-2">Additional Portal Access (Optional)</label>
                  <div className="flex flex-wrap gap-3">
                    {ALL_ROLES.filter(r => r.id !== editingStaff.security?.role).map(role => {
                      const isChecked = (editingStaff.security?.secondaryRoles || []).includes(role.id);
                      return (
                        <label key={`secondary-${role.id}`} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'bg-white border-[#0D2B55] shadow-sm text-[#0D2B55]' : 'bg-transparent border-slate-200 text-slate-500 hover:bg-white'}`}>
                          <input 
                            type="checkbox" 
                            className="w-3.5 h-3.5 accent-[#0D2B55] cursor-pointer" 
                            checked={isChecked}
                            onChange={() => handleToggleSecondaryRole(role.id)}
                          />
                          <span className="text-[11px] font-bold">{role.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2">Allows the user to log into multiple different role portals using the same credentials.</div>
                </div>

              </div>
              
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between shrink-0 rounded-b-xl">
              <button onClick={handleDelete} className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors uppercase tracking-wider"><Trash2 className="w-4 h-4" /> Move to Recycle Bin</button>
              <div className="flex gap-3">
                <button onClick={() => { setEditingStaff(null); setOpenDropdown(null); }} className="px-5 py-2.5 text-sm font-bold text-slate-600 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-sm">Cancel</button>
                <button onClick={handleSaveEdit} className="px-6 py-2.5 text-sm font-bold text-white bg-[#0D2B55] hover:bg-[#1a3d6e] rounded-lg flex items-center gap-2 shadow-md transition-all"><Check className="w-4 h-4" /> Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}