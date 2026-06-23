'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Edit2, Shield, Trash2, Check, Download, ChevronDown, RotateCcw, Trash, Users, AlertTriangle, Eye, ChevronLeft, ChevronRight, CheckSquare, Loader2 } from "lucide-react";
import api from '../../../../lib/api';

const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// 🚨 NEW: Universal helper to cleanly split backend merged names
const splitName = (source) => {
  if (!source) return { firstName: '', middleName: '', lastName: '' };
  
  let firstName = source.firstName || '';
  let middleName = source.middleName || '';
  let lastName = source.lastName || '';
  
  // If backend merged them (middleName is empty but firstName has spaces)
  if (!middleName && firstName.trim().includes(' ')) {
    const parts = firstName.trim().split(/\s+/);
    firstName = parts[0];
    middleName = parts.slice(1).join(' ');
  }
  
  return { firstName, middleName, lastName };
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

// --- CUSTOM SEARCHABLE DROPDOWN COMPONENT ---
const SearchableFilterDropdown = ({ value, onChange, options, placeholder, widthClass }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(query.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={wrapperRef} className={`relative ${widthClass}`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full py-[8px] px-[12px] bg-white border rounded-[8px] text-[13px] text-[#0f1923] outline-none cursor-pointer flex justify-between items-center transition-colors shadow-sm ${isOpen ? 'border-[#0D2B55] ring-2 ring-[#0D2B55]/10' : 'border-slate-300 hover:border-slate-400'}`}
      >
        <span className="truncate pr-2 font-medium text-slate-700">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-[14px] h-[14px] text-[#6b7280] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[60] top-[calc(100%+4px)] left-0 w-full bg-white border border-[#E2DDD4] rounded-[8px] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-[8px] border-b border-[#E2DDD4] bg-[#FAF8F4]">
            <div className="relative">
              <Search className="absolute left-[8px] top-1/2 -translate-y-1/2 w-[12px] h-[12px] text-[#6b7280]" />
              <input 
                type="text"
                autoFocus
                placeholder="Search..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-[26px] pr-[8px] py-[6px] text-[12px] border border-[#E2DDD4] rounded-[6px] outline-none focus:border-[#0D2B55]"
              />
            </div>
          </div>
          
          <div className="max-h-[170px] overflow-y-auto custom-scrollbar">
            <div 
              onClick={() => { onChange(''); setIsOpen(false); setQuery(''); }}
              className={`px-[12px] py-[10px] text-[12px] cursor-pointer transition-colors ${value === '' ? 'bg-[#EFF6FF] text-[#1E40AF] font-[700]' : 'text-[#6b7280] hover:bg-[#FAF8F4]'}`}
            >
              {placeholder}
            </div>
            
            {filteredOptions.length === 0 ? (
              <div className="px-[12px] py-[10px] text-[12px] text-[#6b7280] text-center italic">No matches found</div>
            ) : (
              filteredOptions.map((opt) => (
                <div 
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); setQuery(''); }}
                  className={`px-[12px] py-[10px] text-[12px] cursor-pointer transition-colors truncate ${value === opt.value ? 'bg-[#EFF6FF] text-[#1E40AF] font-[700]' : 'text-[#0f1923] hover:bg-[#FAF8F4]'}`}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
// ----------------------------------------------


export default function StaffManagement() {
  const router = useRouter();
  
  const [dbStaff, setDbStaff] = useState([]);
  const [dbRecycleBin, setDbRecycleBin] = useState([]); 
  const [dbManagers, setDbManagers] = useState([]);
  
  const [companyCodes, setCompanyCodes] = useState([]);
  const [officeLocations, setOfficeLocations] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [coFilter, setCoFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  
  const [editingStaff, setEditingStaff] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isRecycleBinView, setIsRecycleBinView] = useState(false); 

  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchQueries, setSearchQueries] = useState({ title: '', office: '', co: '', mgr: '' });
  const dropdownRef = useRef(null);

  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Bulk Selection States
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [isBulkActing, setIsBulkActing] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Custom Modal State to lock page and center alerts
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
      setSelectedStaffIds([]); // Clear selection on fetch
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
    setSelectedStaffIds([]); // Clear selection when filters change
  }, [search, coFilter, roleFilter, managerFilter, isRecycleBinView]);

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
      // 🚨 FIX: Extract separated names for accurate search filtering
      const { firstName, middleName, lastName } = splitName(e.personalDetails);
      return `${firstName} ${middleName} ${lastName} ${e.employeeId}`.toLowerCase().includes(s);
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

  // Pagination Logic Extraction
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);

  // Bulk Selection Logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const currentPageIds = currentItems.map(item => item._id);
      setSelectedStaffIds([...new Set([...selectedStaffIds, ...currentPageIds])]);
    } else {
      const currentPageIds = currentItems.map(item => item._id);
      setSelectedStaffIds(selectedStaffIds.filter(id => !currentPageIds.includes(id)));
    }
  };

  const handleSelectItem = (e, id) => {
    if (e.target.checked) {
      setSelectedStaffIds([...selectedStaffIds, id]);
    } else {
      setSelectedStaffIds(selectedStaffIds.filter(selectedId => selectedId !== id));
    }
  };

  const isAllCurrentPageSelected = currentItems.length > 0 && currentItems.every(item => selectedStaffIds.includes(item._id));

  // --- BULK ACTION EXECUTION HANDLERS ---
  const handleBulkDelete = () => {
    if (selectedStaffIds.length === 0) return;
    
    showDialog(
      'confirm',
      'Confirm Bulk Deletion',
      `Are you sure you want to move ${selectedStaffIds.length} selected employees to the Recycle Bin?`,
      async () => {
        closeDialog();
        setIsBulkActing(true);
        try {
          await Promise.all(selectedStaffIds.map(id => api.delete(`/users/${id}`)));
          setSuccessMsg(`${selectedStaffIds.length} employees moved to Recycle Bin.`);
          setSelectedStaffIds([]);
          fetchData();
          setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) {
          showDialog('alert', 'Error', "Failed to delete some or all selected users.");
        } finally {
          setIsBulkActing(false);
        }
      }
    );
  };

  const handleBulkRestore = () => {
    if (selectedStaffIds.length === 0) return;

    showDialog(
      'confirm',
      'Confirm Bulk Restore',
      `Are you sure you want to restore ${selectedStaffIds.length} selected employees back to the active directory?`,
      async () => {
        closeDialog();
        setIsBulkActing(true);
        try {
          await Promise.all(selectedStaffIds.map(id => api.patch(`/users/${id}/restore`)));
          setSuccessMsg(`${selectedStaffIds.length} employees successfully restored.`);
          setSelectedStaffIds([]);
          fetchData();
          setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) {
          showDialog('alert', 'Error', "Failed to restore some or all selected users.");
        } finally {
          setIsBulkActing(false);
        }
      }
    );
  };

  const handleBulkPermanentDelete = () => {
    if (selectedStaffIds.length === 0) return;

    showDialog(
      'confirm',
      'Bulk Permanent Deletion',
      `WARNING: This will permanently erase ${selectedStaffIds.length} selected employees from the database. This action CANNOT be undone. Are you sure?`,
      async () => {
        closeDialog();
        setIsBulkActing(true);
        try {
          await Promise.all(selectedStaffIds.map(id => api.delete(`/users/${id}/permanent`)));
          setSuccessMsg(`${selectedStaffIds.length} employees permanently deleted.`);
          setSelectedStaffIds([]);
          fetchData();
          setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) {
          showDialog('alert', 'Error', "Failed to permanently delete some or all selected users.");
        } finally {
          setIsBulkActing(false);
        }
      }
    );
  };

  const handleSaveEdit = async () => {
    if (!editingStaff) return;
    try {
      // 🚨 FIX: Re-combine first and middle name into the backend's expected structure before saving
      const fName = editingStaff.personalDetails?.firstName?.trim() || '';
      const mName = editingStaff.personalDetails?.middleName?.trim() || '';
      const combinedFirstName = mName ? `${fName} ${mName}` : fName;

      await api.patch(`/users/${editingStaff._id}/hr-update`, {
        firstName: combinedFirstName,
        lastName: editingStaff.personalDetails?.lastName?.trim() || '',
        jobTitle: editingStaff.employmentDetails?.jobTitle,
        officeLocation: editingStaff.employmentDetails?.officeLocation,
        salary: editingStaff.employmentDetails?.salary,
        dateOfHire: editingStaff.employmentDetails?.dateOfHire,
        companyCode: editingStaff.companyCode,
        role: editingStaff.security?.role,
        secondaryRoles: editingStaff.security?.secondaryRoles || [],
        reportingTo: editingStaff.employmentDetails?.reportingTo?._id || editingStaff.employmentDetails?.reportingTo || null
      });
      
      setSuccessMsg(`${fName}'s profile updated successfully.`);
      setEditingStaff(null);
      setOpenDropdown(null); 
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) { 
      const backendMessage = e.response?.data?.message || e.message || "Failed to update database record.";
      showDialog('alert', 'Error', backendMessage); 
    }
  };

  const handleDelete = () => {
    if (!editingStaff) return;
    
    showDialog('confirm', 'Confirm Deletion', `Are you sure you want to move ${editingStaff.personalDetails?.firstName} to the Recycle Bin?`, async () => {
      closeDialog();
      try {
        await api.delete(`/users/${editingStaff._id}`); 
        setSuccessMsg("Employee moved to Recycle Bin.");
        setEditingStaff(null);
        fetchData();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (e) { 
        showDialog('alert', 'Error', "Failed to delete from database."); 
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
      await api.patch(`/users/${userId}/restore`);
      setSuccessMsg("Employee successfully restored to active directory.");
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) { 
      showDialog('alert', 'Error', "Failed to restore user."); 
    }
  };

  const handlePermanentDelete = (userId) => {
    showDialog(
      'confirm', 
      'Permanent Deletion', 
      "WARNING: This will permanently erase the employee from the database. This action cannot be undone. Are you sure?", 
      async () => {
        closeDialog();
        try {
          await api.delete(`/users/${userId}/permanent`);
          setSuccessMsg("Employee permanently deleted from the system.");
          fetchData();
          setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) { 
          showDialog('alert', 'Error', "Failed to permanently delete user."); 
        }
      }
    );
  };

  const handleDownloadCSV = () => {
    if (data.length === 0) return showDialog('alert', 'Notice', "No data to download.");
    
    const headers = ['Employee ID', 'First Name', 'Middle Name', 'Last Name', 'Company', 'Office Location', 'Job Title', 'Base Salary', 'Hire Date', 'Primary Role', 'Secondary Roles', 'Reporting Manager'];
    const csvRows = [headers.join(',')];
    
    data.forEach(e => {
      // 🚨 FIX: Extract separated names for CSV Export
      const { firstName, middleName, lastName } = splitName(e.personalDetails);
      const mgr = e.employmentDetails?.reportingTo?.personalDetails;
      const mgrNames = splitName(mgr);
      const mgrMName = mgrNames.middleName ? `${mgrNames.middleName} ` : '';
      const mgrName = mgr ? `${mgrNames.firstName} ${mgrMName}${mgrNames.lastName}` : 'Unassigned';
      
      const secondaryRoles = (e.security?.secondaryRoles || []).map(r => ROLE_COLOURS[r]?.label).join(' & ');
      
      const row = [
        e.employeeId || '',
        `"${firstName}"`,
        `"${middleName}"`, 
        `"${lastName}"`,
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 relative pb-24">
      
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

      {/* Bulk Actions Banner */}
      {selectedStaffIds.length > 0 && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1E40AF]">
            <CheckSquare className="w-5 h-5" /> 
            {selectedStaffIds.length} Employee(s) Selected
          </div>
          <div className="flex flex-wrap gap-2">
            {isRecycleBinView ? (
              <>
                <button onClick={handleBulkRestore} disabled={isBulkActing} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#065F46] bg-[#D1FAE5] hover:bg-[#A7F3D0] border border-[#A7F3D0] rounded-lg transition-colors shadow-sm disabled:opacity-50">
                  {isBulkActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Restore Selected
                </button>
                <button onClick={handleBulkPermanentDelete} disabled={isBulkActing} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                  {isBulkActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Permanently Delete Selected
                </button>
              </>
            ) : (
              <button onClick={handleBulkDelete} disabled={isBulkActing} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#991B1B] bg-[#FEF2F2] hover:bg-[#FECACA] border border-[#FECACA] rounded-lg transition-colors shadow-sm disabled:opacity-50">
                {isBulkActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Move Selected to Recycle Bin
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters Area */}
      <div className={`p-4 rounded-xl shadow-sm border space-y-4 ${isRecycleBinView ? 'bg-red-50/30 border-red-100' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or ID..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-200 outline-none bg-white" />
          </div>
          
          <SearchableFilterDropdown 
            value={coFilter}
            onChange={setCoFilter}
            placeholder="All Companies"
            widthClass="w-full md:w-40"
            options={companyCodes.map(code => ({ value: code, label: code }))}
          />
          
          <SearchableFilterDropdown 
            value={roleFilter}
            onChange={setRoleFilter}
            placeholder="All Roles"
            widthClass="w-full md:w-48"
            options={[
              { value: 'EMPLOYEE', label: 'Staff / Employee' },
              { value: 'MANAGER', label: 'Line Manager' },
              { value: 'HR_ADMIN', label: 'HR Admin' },
              { value: 'CEO', label: 'CEO' },
              { value: 'ICT_ADMIN', label: 'ICT Admin' }
            ]}
          />

          <SearchableFilterDropdown 
            value={managerFilter}
            onChange={setManagerFilter}
            placeholder="All Managers (Any)"
            widthClass="w-full md:w-64"
            options={[
              { value: 'unassigned', label: '-- Unassigned / CEO --' },
              // 🚨 FIX: Safe extraction for Search dropdown
              ...dbManagers.map(m => {
                const { firstName, middleName, lastName } = splitName(m.personalDetails || m);
                const mNameStr = middleName ? ` ${middleName}` : '';
                return { value: m._id, label: `${firstName}${mNameStr} ${lastName}`.trim() };
              })
            ]}
          />
        </div>
        
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-500">
            Showing <span className="text-slate-900">{data.length}</span> {isRecycleBinView ? 'deleted' : 'active'} staff members
          </div>
          
          <div className="flex gap-2">
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
      <div className={`rounded-xl shadow-sm border overflow-hidden flex flex-col ${isRecycleBinView ? 'bg-red-50/10 border-red-200' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className={isRecycleBinView ? 'bg-red-50/50 border-b border-red-100' : 'bg-slate-50 border-b'}>
              <tr className="text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={isAllCurrentPageSelected}
                    onChange={handleSelectAll}
                    disabled={currentItems.length === 0}
                    className="w-4 h-4 rounded border-gray-300 text-[#0D2B55] focus:ring-[#0D2B55] cursor-pointer"
                  />
                </th>
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
                <tr><td colSpan="7" className="py-12 text-center text-slate-400">Syncing with database...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="7" className="py-12 text-center text-slate-400">{isRecycleBinView ? 'Recycle bin is empty.' : 'No active staff found matching filters.'}</td></tr>
              ) : currentItems.map((e) => {
                const roleKey = e.security?.role || 'EMPLOYEE';
                const roleInfo = ROLE_COLOURS[roleKey];
                const secondaryRoles = e.security?.secondaryRoles || [];
                const mgr = e.employmentDetails?.reportingTo?.personalDetails;
                
                // 🚨 FIX: Safe extraction for table
                const mgrNames = splitName(mgr);
                const mgrMName = mgrNames.middleName ? `${mgrNames.middleName} ` : '';
                const mgrName = mgr ? `${mgrNames.firstName} ${mgrMName}${mgrNames.lastName}` : 'Unassigned';
                const isSelected = selectedStaffIds.includes(e._id);
                
                const { firstName, middleName, lastName } = splitName(e.personalDetails);

                return (
                  <tr key={e._id} className={`${isRecycleBinView ? 'hover:bg-red-50/30' : 'hover:bg-slate-50'} ${isSelected ? 'bg-blue-50/40' : ''} transition-colors`}>
                    <td className="px-4 py-3 text-center">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => handleSelectItem(event, e._id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#0D2B55] focus:ring-[#0D2B55] cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold ${isRecycleBinView ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                          {getInitials(`${firstName} ${lastName}`)}
                        </div>
                        <div>
                          <div className={`font-bold text-sm ${isRecycleBinView ? 'text-red-900 line-through opacity-70' : 'text-slate-900'}`}>{firstName} {middleName ? middleName + ' ' : ''}{lastName}</div>
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
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => {
                            // 🚨 FIX: Intercept data and un-merge the name for the View Modal
                            const staffToView = JSON.parse(JSON.stringify(e));
                            if (staffToView.personalDetails) {
                              const { firstName, middleName, lastName } = splitName(staffToView.personalDetails);
                              staffToView.personalDetails.firstName = firstName;
                              staffToView.personalDetails.middleName = middleName;
                              staffToView.personalDetails.lastName = lastName;
                            }
                            setViewingStaff(staffToView);
                          }} className="px-3 py-1.5 text-xs font-semibold border rounded-md hover:bg-slate-100 bg-white text-slate-700 flex items-center justify-center gap-1.5 shadow-sm transition-colors">
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button onClick={() => {
                            // 🚨 FIX: Intercept data and un-merge the name for the Edit Modal
                            const staffToEdit = JSON.parse(JSON.stringify(e));
                            if (staffToEdit.personalDetails) {
                              const { firstName, middleName, lastName } = splitName(staffToEdit.personalDetails);
                              staffToEdit.personalDetails.firstName = firstName;
                              staffToEdit.personalDetails.middleName = middleName;
                              staffToEdit.personalDetails.lastName = lastName;
                            }
                            setEditingStaff(staffToEdit);
                          }} className="px-3 py-1.5 text-xs font-semibold border rounded-md hover:bg-white bg-slate-50 flex items-center justify-center gap-1.5 shadow-sm transition-colors">
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        {data.length > itemsPerPage && (
          <div className="p-[12px_16px] border-t border-[#E2DDD4] bg-white flex items-center justify-between mt-auto">
            <div className="text-[12px] text-[#6b7280] font-[600]">
              Showing <span className="text-[#0f1923]">{indexOfFirstItem + 1}</span> to <span className="text-[#0f1923]">{Math.min(indexOfLastItem, data.length)}</span> of <span className="text-[#0f1923]">{data.length}</span> entries
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

      {/* Floating Bulk Action Bar */}
      {selectedStaffIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 duration-300 z-40 border border-slate-700">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckSquare className="w-5 h-5 text-blue-400" />
            <span>{selectedStaffIds.length} {selectedStaffIds.length === 1 ? 'employee' : 'employees'} selected</span>
          </div>
          
          <div className="w-px h-6 bg-slate-700"></div>

          <div className="flex gap-2">
            {!isRecycleBinView ? (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-full transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Move to Recycle Bin
              </button>
            ) : (
              <>
                <button 
                  onClick={handleBulkRestore}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-full transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Restore Selected
                </button>
                <button 
                  onClick={handleBulkPermanentDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Permanently Delete
                </button>
              </>
            )}
            <button 
              onClick={() => setSelectedStaffIds([])}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-full transition-colors"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  {getInitials(`${viewingStaff.personalDetails?.firstName} ${viewingStaff.personalDetails?.lastName}`)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0D2B55]">Employee Profile Details</h3>
                  <div className="text-xs text-gray-500 font-mono">ID: {viewingStaff.employeeId}</div>
                </div>
              </div>
              <button onClick={() => setViewingStaff(null)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar bg-white">
              
              {/* Personal Information */}
              <div>
                <h4 className="text-xs font-bold text-[#0D2B55] uppercase tracking-wider mb-3 border-b pb-1">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">First Name</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">{viewingStaff.personalDetails?.firstName || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Middle Name</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">{viewingStaff.personalDetails?.middleName || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Last Name</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">{viewingStaff.personalDetails?.lastName || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div>
                <h4 className="text-xs font-bold text-[#0D2B55] uppercase tracking-wider mb-3 border-b pb-1">Employment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Job Title</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">{viewingStaff.employmentDetails?.jobTitle || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Office Location</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">{viewingStaff.employmentDetails?.officeLocation || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Company Code</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">{viewingStaff.companyCode || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Base Salary</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">${viewingStaff.employmentDetails?.salary?.toLocaleString() || '0'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Date of Hire</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">{viewingStaff.employmentDetails?.dateOfHire ? new Date(viewingStaff.employmentDetails.dateOfHire).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Line Manager</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">
                      {/* 🚨 FIX: Included middleName safely in the View Modal */}
                      {viewingStaff.employmentDetails?.reportingTo?.personalDetails 
                        ? (() => {
                            const mgrNames = splitName(viewingStaff.employmentDetails.reportingTo.personalDetails);
                            return `${mgrNames.firstName} ${mgrNames.middleName ? mgrNames.middleName + ' ' : ''}${mgrNames.lastName}`;
                          })()
                        : 'Unassigned / CEO'}
                    </div>
                  </div>
                </div>
              </div>

              {/* System Access */}
              <div>
                <h4 className="text-xs font-bold text-[#0D2B55] uppercase tracking-wider mb-3 border-b pb-1">System Access & Roles</h4>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Primary Role</div>
                    <div className="mt-1">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
                        {ROLE_COLOURS[viewingStaff.security?.role]?.label || 'Staff'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Secondary Roles</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(!viewingStaff.security?.secondaryRoles || viewingStaff.security.secondaryRoles.length === 0) ? (
                        <span className="text-sm text-slate-500 italic">No secondary roles</span>
                      ) : (
                        viewingStaff.security.secondaryRoles.map(r => (
                          <span key={r} className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-md">
                            {ROLE_COLOURS[r]?.label || r}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-slate-50 flex items-center justify-end shrink-0 rounded-b-xl">
              <button onClick={() => setViewingStaff(null)} className="px-6 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm transition-colors">Close Details</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">First Name</label>
                  <input className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0D2B55] shadow-sm" value={editingStaff.personalDetails?.firstName || ''} onChange={e => setEditingStaff({...editingStaff, personalDetails: {...editingStaff.personalDetails, firstName: e.target.value}})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Middle Name</label>
                  <input className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#0D2B55] shadow-sm" placeholder="Optional" value={editingStaff.personalDetails?.middleName || ''} onChange={e => setEditingStaff({...editingStaff, personalDetails: {...editingStaff.personalDetails, middleName: e.target.value}})} />
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
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Line Manager</label>
                    {/* 🚨 FIX: Safe extraction for Line Manager dropdown */}
                    {renderSearchableDropdown('mgr', 'employmentDetails', 'reportingTo', dbManagers, 'Search for Manager...', (m) => {
                       if (!m) return '';
                       const { firstName, middleName, lastName } = splitName(m.personalDetails || m);
                       const mNameStr = middleName ? ` ${middleName}` : '';
                       const isSecondary = !['MANAGER', 'HR_ADMIN', 'CEO'].includes(m.security?.role);
                       return `${firstName}${mNameStr} ${lastName}${isSecondary ? ` (${m.security?.role})` : ''}`.trim();
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

      {/* Universal Custom Modal for System Alerts */}
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