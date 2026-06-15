'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Edit2, Shield, Trash2, Check, Download, ChevronDown, RotateCcw, Trash, Users, Server, Power, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function ICTStaffDataManagement() {
  const router = useRouter();
  
  const [dbStaff, setDbStaff] = useState([]);
  const [dbRecycleBin, setDbRecycleBin] = useState([]); 
  const [dbManagers, setDbManagers] = useState([]);
  
  const [companyCodes, setCompanyCodes] = useState([]);
  const [officeLocations, setOfficeLocations] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [coFilter, setCoFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [accessFilter, setAccessFilter] = useState('');
  
  const [editingStaff, setEditingStaff] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isRecycleBinView, setIsRecycleBinView] = useState(false); 

  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchQueries, setSearchQueries] = useState({ title: '', office: '', co: '', mgr: '' });
  const dropdownRef = useRef(null);

  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'alert', 
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });
  const [modalInput, setModalInput] = useState('');

  const closeDialog = () => {
    setModalConfig({ ...modalConfig, isOpen: false });
    setModalInput('');
  };

  const showDialog = (type, title, message, onConfirm = closeDialog, onCancel = closeDialog) => {
    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      onConfirm,
      onCancel
    });
    setModalInput('');
  };

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
    setCurrentPage(1);
  }, [search, coFilter, roleFilter, accessFilter, isRecycleBinView]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const sourceData = isRecycleBinView ? dbRecycleBin : dbStaff;
  let data = [...sourceData];
  
  if (search) {
    const s = search.toLowerCase();
    data = data.filter(e => {
      const fn = e.personalDetails?.firstName || '';
      const ln = e.personalDetails?.lastName || '';
      const un = e.username || '';
      return `${fn} ${ln} ${e.employeeId} ${un}`.toLowerCase().includes(s);
    });
  }
  
  if (coFilter) data = data.filter(e => e.companyCode === coFilter);
  if (roleFilter) data = data.filter(e => e.security?.role === roleFilter || (e.security?.secondaryRoles || []).includes(roleFilter));
  if (accessFilter === 'locked') data = data.filter(e => e.employmentDetails?.isActive === false);
  if (accessFilter === 'active') data = data.filter(e => e.employmentDetails?.isActive !== false);

  // Pagination Logic
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);

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

  // 🚨 ICT SPECIFIC: Toggle User Login Access
  const handleToggleAccess = async (userId, currentStatus) => {
    try {
      setActionLoading(true);
      await api.patch(`/users/${userId}/status`, { isActive: !currentStatus });
      showToast(`User account has been ${!currentStatus ? 'UNLOCKED' : 'LOCKED'}.`);
      fetchData();
    } catch (e) {
      alert("Failed to toggle system access.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingStaff) return;
    try {
      setActionLoading(true);
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
      
      showToast(`${editingStaff.personalDetails.firstName}'s database profile updated.`);
      setEditingStaff(null);
      setOpenDropdown(null); 
      fetchData();
    } catch (e) { 
      alert(e.response?.data?.message || "Failed to update to database."); 
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingStaff) return;
    
    showDialog('confirm', 'Confirm Deletion', `Are you sure you want to move ${editingStaff.personalDetails?.firstName} to the Recycle Bin?`, async () => {
      closeDialog();
      try {
        setActionLoading(true);
        await api.delete(`/users/${editingStaff._id}`); 
        showToast("Employee moved to Recycle Bin.");
        setEditingStaff(null);
        fetchData();
      } catch (e) { 
        showDialog('alert', 'Error', "Failed to delete from database."); 
      } finally {
        setActionLoading(false);
      }
    });
  };

  const handleMassDelete = () => {
    if (dbStaff.length === 0) return showDialog('alert', 'Notice', "No active staff to delete.");
    
    showDialog(
      'confirm', 
      'Mass Deletion Warning', 
      `WARNING: You are about to move ALL ${dbStaff.length} active employees to the Recycle Bin.\n\nAre you absolutely sure you want to do this?`, 
      () => {
        showDialog(
          'prompt',
          'Confirm MASSIVE Action',
          'To confirm this mass deletion, please type "DELETE ALL" below:',
          async (inputValue) => {
            if (inputValue !== "DELETE ALL") {
              showDialog('alert', 'Action Cancelled', 'Mass deletion cancelled.');
              return;
            }
            
            closeDialog();
            try {
              setIsDeletingAll(true);
              await api.delete('/users/mass-delete'); 
              setSuccessMsg(`All employees have been successfully moved to the Recycle Bin.`);
              fetchData();
              setTimeout(() => setSuccessMsg(''), 5000);
            } catch (e) { 
              showDialog('alert', 'Error', "Failed to execute mass deletion. Make sure the backend route exists."); 
            } finally {
              setIsDeletingAll(false);
            }
          }
        );
      }
    );
  };

  const handleRestore = async (userId) => {
    try {
      setActionLoading(true);
      await api.patch(`/users/${userId}/restore`);
      showToast("Employee successfully restored to active directory.");
      fetchData();
    } catch (e) { 
      alert("Failed to restore user."); 
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async (userId) => {
    showDialog(
      'confirm', 
      'Permanent Deletion', 
      "WARNING: This will permanently erase the employee and all their associated data from the database. This action CANNOT be undone. Are you absolutely sure?", 
      async () => {
        closeDialog();
        try {
          setActionLoading(true);
          await api.delete(`/users/${userId}/permanent`);
          showToast("Employee permanently purged from the system.");
          fetchData();
        } catch (e) { 
          showDialog('alert', 'Error', "Failed to permanently delete user."); 
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleToggleSecondaryRole = (roleId) => {
    const currentSecondaryRoles = editingStaff.security?.secondaryRoles || [];
    let newSecondaryRoles;

    if (currentSecondaryRoles.includes(roleId)) {
      newSecondaryRoles = currentSecondaryRoles.filter(id => id !== roleId);
    } else {
      newSecondaryRoles = [...currentSecondaryRoles, roleId];
    }

    setEditingStaff({ ...editingStaff, security: { ...editingStaff.security, secondaryRoles: newSecondaryRoles } });
  };

  const renderSearchableDropdown = (fieldKey, dbFieldObj, dbFieldProp, options, placeholder, displayKey, valueKey = null) => {
    const isOpen = openDropdown === fieldKey;
    const query = searchQueries[fieldKey] || '';
    
    const filteredOptions = options.filter(opt => {
      const rawText = typeof opt === 'string' ? opt : (displayKey ? displayKey(opt) : '');
      const text = String(rawText || ''); 
      return text.toLowerCase().includes(query.toLowerCase());
    });

    const currentValue = dbFieldProp ? editingStaff[dbFieldObj]?.[dbFieldProp] : editingStaff[dbFieldObj];
    const safeCurrentValue = (fieldKey === 'mgr' && typeof currentValue === 'object' && currentValue !== null) ? currentValue._id : currentValue;

    const selectedText = safeCurrentValue 
      ? (typeof options[0] === 'string' ? safeCurrentValue : displayKey(options.find(o => (valueKey ? o[valueKey] : o._id) === safeCurrentValue)) || placeholder)
      : placeholder;

    const handleSelect = (val) => {
        setEditingStaff(prev => {
            const newState = { ...prev };
            if (dbFieldProp) newState[dbFieldObj] = { ...newState[dbFieldObj], [dbFieldProp]: val };
            else newState[dbFieldObj] = val;
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
                  type="text" autoFocus placeholder="Search..."
                  value={searchQueries[fieldKey] || ''}
                  onChange={(e) => setSearchQueries(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md outline-none focus:border-[#0D2B55]"
                />
              </div>
            </div>
            
            <div className="max-h-[180px] overflow-y-auto overflow-x-hidden custom-scrollbar">
              {fieldKey === 'mgr' && !query && (
                <div onClick={() => handleSelect(null)} className={`px-3 py-2 text-[12px] cursor-pointer hover:bg-[#0D2B55] hover:text-white transition-colors truncate ${!safeCurrentValue ? 'bg-blue-50 font-bold text-[#0D2B55]' : 'text-slate-500 italic'}`}>
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
                      key={val || idx} onClick={() => handleSelect(val)}
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
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0D2B55] p-6 rounded-xl shadow-lg border border-[#1a3d6e] gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            {isRecycleBinView ? <><Trash className="w-6 h-6 text-red-400" /> System Recycle Bin</> : <><Server className="w-6 h-6 text-[#C9A84C]"/> Central Staff Database</>}
          </h1>
          <p className="text-sm text-blue-200 mt-1">
            {isRecycleBinView ? 'Restore or permanently purge deleted records from the cluster.' : 'ICT Admin Control Center: Manage users, roles, and system access states.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsRecycleBinView(!isRecycleBinView)} 
            className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 border ${isRecycleBinView ? 'bg-white border-white text-[#0D2B55] hover:bg-gray-100' : 'bg-red-500 text-white border-red-400 hover:bg-red-600'}`}
          >
            {isRecycleBinView ? <><Server className="w-4 h-4"/> Return to Live DB</> : <><Trash2 className="w-4 h-4"/> View Recycle Bin ({dbRecycleBin.length})</>}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 animate-in fade-in duration-300 font-semibold shadow-sm">
          <Check className="w-5 h-5 text-emerald-600" /> {successMsg}
        </div>
      )}

      {/* Filters Area */}
      <div className={`p-4 rounded-xl shadow-sm border space-y-4 ${isRecycleBinView ? 'bg-red-50/30 border-red-100' : 'bg-white border-slate-200'}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, ID, username..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0D2B55] outline-none bg-white font-medium" />
          </div>
          
          <select value={coFilter} onChange={e => setCoFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white font-medium">
            <option value="">All Companies</option>
            {companyCodes.map(code => (
              <option key={`filter-co-${code}`} value={code}>{code}</option>
            ))}
          </select>
          
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white font-medium">
            <option value="">All Security Roles</option>
            <option value="EMPLOYEE">Staff / Employee</option>
            <option value="MANAGER">Line Manager</option>
            <option value="HR_ADMIN">HR Admin</option>
            <option value="CEO">CEO</option>
            <option value="ICT_ADMIN">ICT Admin</option>
          </select>

          <select value={accessFilter} onChange={e => setAccessFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white font-medium">
            <option value="">All Access States</option>
            <option value="active">Active Accounts Only</option>
            <option value="locked">Locked Accounts Only</option>
          </select>
        </div>
        
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-500">
            Query returned <span className="text-slate-900 font-black text-sm">{data.length}</span> {isRecycleBinView ? 'deleted' : 'active'} records.
          </div>
        </div>
      </div>

      {/* Real-time Table */}
      <div className={`rounded-xl shadow-sm border overflow-hidden flex flex-col min-h-[400px] ${isRecycleBinView ? 'bg-red-50/10 border-red-200' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
            <thead className={isRecycleBinView ? 'bg-red-50/50 border-b border-red-100' : 'bg-slate-50 border-b'}>
              <tr className="text-[11px] text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">System Identity</th>
                <th className="px-6 py-4 font-bold">Assignment</th>
                <th className="px-6 py-4 font-bold text-center">Auth Roles</th>
                <th className="px-6 py-4 font-bold text-center">Portal Access</th>
                <th className="px-6 py-4 font-bold text-center w-[160px]">Config</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="py-12 text-center text-slate-400 font-medium">Connecting to cluster...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="5" className="py-12 text-center text-slate-400 font-medium">{isRecycleBinView ? 'Recycle bin is empty.' : 'No active staff found matching query parameters.'}</td></tr>
              ) : currentItems.map((e) => {
                const roleKey = e.security?.role || 'EMPLOYEE';
                const roleInfo = ROLE_COLOURS[roleKey];
                const secondaryRoles = e.security?.secondaryRoles || [];
                const isActive = e.employmentDetails?.isActive !== false;

                return (
                  <tr key={e._id} className={isRecycleBinView ? 'hover:bg-red-50/30 transition-colors' : 'hover:bg-slate-50 transition-colors'}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black shadow-sm shrink-0 ${isRecycleBinView ? 'bg-red-100 text-red-700' : 'bg-[#0D2B55] text-white'}`}>
                          {getInitials(`${e.personalDetails?.firstName} ${e.personalDetails?.lastName}`)}
                        </div>
                        <div>
                          <div className={`font-black text-sm flex items-center gap-2 ${isRecycleBinView ? 'text-red-900 line-through opacity-70' : 'text-[#0D2B55]'}`}>
                            {e.personalDetails?.firstName} {e.personalDetails?.lastName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            ID: <span className="font-bold">{e.employeeId}</span> | UN: <span className="font-bold">{e.username}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className={`text-xs font-bold ${isRecycleBinView ? 'text-red-700/70' : 'text-slate-800'}`}>{e.employmentDetails?.jobTitle}</div>
                      <div className="text-[10px] font-semibold text-slate-500 mt-0.5">{e.companyCode} • {e.employmentDetails?.officeLocation || 'No Location'}</div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col items-center gap-1.5">
                        <span style={{ backgroundColor: roleInfo.bg, color: roleInfo.fg }} className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm border border-black/5 ${isRecycleBinView ? 'opacity-50 grayscale' : ''}`}>
                          {roleInfo.label}
                        </span>
                        {secondaryRoles.length > 0 && (
                          <div className="flex gap-1">
                             {secondaryRoles.map(r => (
                               <div key={r} style={{ backgroundColor: ROLE_COLOURS[r].bg, color: ROLE_COLOURS[r].fg }} className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shadow-sm border border-black/5 ${isRecycleBinView ? 'opacity-50 grayscale' : ''}`} title={`Secondary Role: ${ROLE_COLOURS[r].label}`}>
                                 {ROLE_COLOURS[r].label.charAt(0)}
                               </div>
                             ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <button 
                          disabled={isRecycleBinView || actionLoading}
                          onClick={() => handleToggleAccess(e._id, isActive)}
                          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none shadow-inner ${isActive ? 'bg-emerald-500' : 'bg-rose-500'} ${isRecycleBinView ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                        <span className={`text-[9px] font-black uppercase tracking-wider ${isActive ? 'text-emerald-600' : 'text-rose-600'} ${isRecycleBinView ? 'opacity-50' : ''}`}>
                          {isActive ? 'Active' : 'Locked'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {isRecycleBinView ? (
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleRestore(e._id)} disabled={actionLoading} className="px-3 py-1.5 text-[11px] font-bold border border-green-200 text-green-700 hover:bg-green-50 rounded-md flex items-center gap-1.5 transition-colors bg-white shadow-sm disabled:opacity-50">
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                          </button>
                          <button onClick={() => handlePermanentDelete(e._id)} disabled={actionLoading} className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors bg-white shadow-sm disabled:opacity-50" title="Permanently Delete">
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingStaff(e)} className="px-4 py-1.5 text-xs font-bold border rounded-md hover:bg-white bg-slate-50 flex items-center justify-center gap-1.5 mx-auto text-slate-700 shadow-sm transition-all hover:border-[#0D2B55] hover:text-[#0D2B55]">
                          <Edit2 className="w-3.5 h-3.5" /> DB Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data.length > itemsPerPage && (
          <div className="p-[12px_16px] border-t border-[#E2DDD4] bg-[#FAF8F4] flex items-center justify-between mt-auto">
            <div className="text-[12px] text-[#6b7280] font-[600]">
              Showing <span className="text-[#0f1923]">{indexOfFirstItem + 1}</span> to <span className="text-[#0f1923]">{Math.min(indexOfLastItem, data.length)}</span> of <span className="text-[#0f1923]">{data.length}</span> entries
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

      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-[#0D2B55] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 text-[#C9A84C] border border-[#C9A84C]/30 flex items-center justify-center font-black">
                  {getInitials(`${editingStaff.personalDetails?.firstName} ${editingStaff.personalDetails?.lastName}`)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><Server className="w-4 h-4 text-[#C9A84C]" /> Edit Database Record</h3>
                  <div className="text-[11px] text-blue-200 font-mono mt-0.5">UID: {editingStaff._id}</div>
                </div>
              </div>
              <button onClick={() => { setEditingStaff(null); setOpenDropdown(null); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"><X className="w-5 h-5 text-white" /></button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar bg-[#FAF8F4]">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">First Name</label>
                  <input className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0D2B55] shadow-sm font-semibold" value={editingStaff.personalDetails?.firstName || ''} onChange={e => setEditingStaff({...editingStaff, personalDetails: {...editingStaff.personalDetails, firstName: e.target.value}})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Last Name</label>
                  <input className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0D2B55] shadow-sm font-semibold" value={editingStaff.personalDetails?.lastName || ''} onChange={e => setEditingStaff({...editingStaff, personalDetails: {...editingStaff.personalDetails, lastName: e.target.value}})} />
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
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Company Entity</label>
                  {renderSearchableDropdown('co', 'companyCode', null, companyCodes, 'Select Company...', null)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Base Salary Parameter</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input 
                      type="number" min="0" step="500" 
                      className="w-full border rounded-lg pl-8 pr-3 py-2.5 text-sm outline-none focus:border-[#0D2B55] font-mono bg-slate-50 font-bold" 
                      value={editingStaff.employmentDetails?.salary || ''} 
                      onChange={e => setEditingStaff({...editingStaff, employmentDetails: {...editingStaff.employmentDetails, salary: parseFloat(e.target.value) || 0}})} 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date of Hire (Pro-Rata Anchor)</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      className="w-full border rounded-lg pl-3 pr-3 py-2.5 text-sm outline-none focus:border-[#0D2B55] bg-slate-50 font-bold" 
                      value={editingStaff.employmentDetails?.dateOfHire ? new Date(editingStaff.employmentDetails.dateOfHire).toISOString().split('T')[0] : ''} 
                      onChange={e => setEditingStaff({...editingStaff, employmentDetails: {...editingStaff.employmentDetails, dateOfHire: e.target.value}})} 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#0D2B55]/5 border border-[#0D2B55]/10 rounded-xl p-5 mt-2 shadow-sm">
                <h4 className="text-xs font-bold text-[#0D2B55] flex items-center gap-1.5 mb-4"><Shield className="w-4 h-4" /> System Access & Security Roles</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Primary Security Role</label>
                    <select className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-bold text-[#0D2B55] bg-white shadow-sm outline-none focus:border-[#0D2B55]" value={editingStaff.security?.role || 'EMPLOYEE'} onChange={e => setEditingStaff({...editingStaff, security: {...editingStaff.security, role: e.target.value}})}>
                      {ALL_ROLES.map(role => (
                        <option key={`primary-${role.id}`} value={role.id}>{role.label}</option>
                      ))}
                    </select>
                    <div className="text-[10px] text-slate-500 mt-1 font-medium">Dictates the primary UI layout and data access restrictions.</div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Direct Reporting Line</label>
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
                        <label key={`secondary-${role.id}`} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-white border-[#0D2B55] shadow-md text-[#0D2B55] scale-[1.02]' : 'bg-transparent border-slate-300 text-slate-500 hover:bg-white hover:border-slate-400'}`}>
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 accent-[#0D2B55] cursor-pointer" 
                            checked={isChecked}
                            onChange={() => handleToggleSecondaryRole(role.id)}
                          />
                          <span className="text-xs font-bold uppercase tracking-wider">{role.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2">Allows the user to log into multiple different role portals using the same credentials.</div>
                </div>

              </div>
              
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between shrink-0 rounded-b-xl">
              <button onClick={handleDelete} disabled={actionLoading} className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 border border-transparent hover:border-red-200 hover:bg-red-50 p-2.5 rounded-lg transition-all uppercase tracking-wider disabled:opacity-50"><Trash2 className="w-4 h-4" /> Move to Recycle Bin</button>
              <div className="flex gap-3">
                <button onClick={() => { setEditingStaff(null); setOpenDropdown(null); }} disabled={actionLoading} className="px-5 py-2.5 text-sm font-bold text-slate-600 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-sm disabled:opacity-50">Cancel</button>
                <button onClick={handleSaveEdit} disabled={actionLoading} className="px-6 py-2.5 text-sm font-bold text-white bg-[#0D2B55] hover:bg-[#1a3d6e] rounded-lg flex items-center gap-2 shadow-md transition-all disabled:opacity-80">
                  {actionLoading ? <><Server className="w-4 h-4 animate-pulse" /> Updating DB...</> : <><Check className="w-4 h-4" /> Commit Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal for System Alerts */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-[24px]">
              <div className="flex items-center gap-[10px] mb-[12px]">
                {modalConfig.title.includes('Error') || modalConfig.title.includes('Warning') || modalConfig.title.includes('Deletion') ? (
                  <AlertTriangle className="w-[20px] h-[20px] text-red-600" />
                ) : (
                  <Shield className="w-[20px] h-[20px] text-blue-600" />
                )}
                <h3 className="text-[18px] font-[800] text-slate-800">{modalConfig.title}</h3>
              </div>
              
              <p className="text-[14px] text-slate-600 mb-[24px] whitespace-pre-wrap leading-relaxed">
                {modalConfig.message}
              </p>
              
              {modalConfig.type === 'prompt' && (
                <input 
                  type="text"
                  autoFocus
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  className="w-full p-[12px_16px] mb-[24px] bg-slate-50 border border-slate-300 rounded-[8px] text-[13px] outline-none focus:border-slate-800 transition-colors font-mono"
                  placeholder="Type here to confirm..."
                />
              )}

              <div className="flex justify-end gap-[12px]">
                {(modalConfig.type === 'confirm' || modalConfig.type === 'prompt') && (
                  <button 
                    type="button"
                    onClick={modalConfig.onCancel}
                    className="px-[16px] py-[10px] text-slate-600 font-[700] text-[13px] hover:bg-slate-100 rounded-[8px] transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => {
                    if (modalConfig.type === 'prompt') {
                      modalConfig.onConfirm(modalInput);
                    } else {
                      modalConfig.onConfirm();
                    }
                  }}
                  className={`px-[20px] py-[10px] text-white font-[800] text-[13px] rounded-[8px] shadow-sm transition-colors ${
                    modalConfig.title.includes('Error') || modalConfig.title.includes('Warning') || modalConfig.title.includes('Deletion')
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-slate-800 hover:bg-slate-900'
                  }`}
                >
                  {modalConfig.type === 'alert' ? 'Acknowledge' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}