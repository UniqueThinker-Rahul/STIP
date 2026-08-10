'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Search, Filter, AlertTriangle, ShieldCheck, FileText, ChevronLeft, ChevronRight, Loader2, Clock, User, Activity, Download, Calendar } from 'lucide-react';
import api from '../../../../lib/api';

export default function SystemAuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Custom Screen-Locking Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: ''
  });

  const closeDialog = () => setModalConfig({ isOpen: false, title: '', message: '' });

  const showDialog = (title, message) => {
    setModalConfig({ isOpen: true, title, message });
  };
  
  // Pagination & Filtering State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  
  // Calculate 6 Months Ago for Date Limits
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  
  const formatDateForInput = (date) => date.toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    category: 'ALL',
    severity: 'ALL',
    search: '',
    startDate: formatDateForInput(sixMonthsAgo),
    endDate: formatDateForInput(today)
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page,
        limit: 50,
        startDate: filters.startDate,
        endDate: filters.endDate,
        ...(filters.category !== 'ALL' && { category: filters.category }),
        ...(filters.severity !== 'ALL' && { severity: filters.severity }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await api.get(`/audit?${queryParams}`);
      setLogs(response.data?.data || []);
      setTotalPages(response.data?.pagination?.pages || 1);
      setTotalLogs(response.data?.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      showDialog('System Error', 'Failed to retrieve the audit logs from the database. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { fetchLogs(); }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [page, filters.category, filters.severity, filters.search, filters.startDate, filters.endDate]);

  // 🚨 UPGRADED: Log Exporter with Custom Modals and MM/DD/YYYY
  const handleExport = async () => {
    try {
      setExporting(true);
      const queryParams = new URLSearchParams({
        export: 'true',
        startDate: filters.startDate,
        endDate: filters.endDate,
        ...(filters.category !== 'ALL' && { category: filters.category }),
        ...(filters.severity !== 'ALL' && { severity: filters.severity }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await api.get(`/audit?${queryParams}`);
      const exportData = response.data?.data || [];

      if (exportData.length === 0) {
        return showDialog('Export Notice', 'No audit logs found matching the current filters for the selected date range.');
      }

      const headers = ['Timestamp', 'Actor ID', 'Actor Name', 'Role', 'Event Type', 'Category', 'Severity', 'Details', 'IP Address'];
      const csvRows = [headers.join(',')];

      exportData.forEach(log => {
        const dateObj = new Date(log.createdAt || log.timestamp);
        // MM/DD/YYYY HH:MM:SS (24-hour) format as requested
        const formattedDate = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}:${String(dateObj.getSeconds()).padStart(2, '0')}`;
        
        const empId = log.user?.employeeId || 'System';
        const fName = log.user?.personalDetails?.firstName || '';
        const lName = log.user?.personalDetails?.lastName || '';
        const actorName = fName || lName ? `${fName} ${lName}` : (log.user?.username || 'System Execution');
        
        csvRows.push([
          `"${formattedDate}"`,
          `"${empId}"`,
          `"${actorName}"`,
          log.role || 'SYSTEM',
          log.action,
          log.category,
          log.severity,
          `"${log.details?.replace(/"/g, '""') || ''}"`,
          log.ipAddress || 'Unknown'
        ].join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ICT_Security_Audit_${filters.startDate}_to_${filters.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      showDialog('Export Failed', 'An error occurred while generating the CSV export file.');
    } finally {
      setExporting(false);
    }
  };

  // UI Helpers
  const getSeverityBadge = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'HIGH':
      case 'CRITICAL':
        return <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">HIGH</span>;
      case 'MEDIUM':
      case 'WARNING':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">MEDIUM</span>;
      default:
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">LOW</span>;
    }
  };

  const getCategoryBadge = (category) => {
    const catStr = category?.replace(/_/g, ' ') || 'SYSTEM';
    return <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">{catStr}</span>;
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-20 font-sans text-[#0F172A] px-4 xl:px-0">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-[#0D2B55]">
            <Shield className="w-7 h-7" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold tracking-tight">System Audit Trail</h1>
          </div>
          <p className="text-sm text-gray-500 font-medium">
            Immutable security log. System auto-deletes records older than 180 days.
          </p>
        </div>
        
        {/* KPI Badges */}
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 border border-gray-200 rounded-lg shadow-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><Activity className="w-4 h-4 text-blue-600"/></div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current View Records</div>
              <div className="text-sm font-black text-[#0D2B55] leading-none">{totalLogs.toLocaleString()}</div>
            </div>
          </div>
          <button 
            onClick={handleExport}
            disabled={exporting || totalLogs === 0}
            className="flex items-center gap-2 bg-[#0D2B55] hover:bg-[#1a3d6e] text-white px-4 py-3 rounded-lg shadow-sm font-bold text-xs transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        </div>
      </div>

      {/* Control Panel (Filters & Search) */}
      <div className="bg-white border border-gray-200 rounded-t-xl shadow-sm p-4 flex flex-col xl:flex-row items-center gap-4">
        
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" placeholder="Search action or details..." 
            value={filters.search} onChange={(e) => { setFilters({...filters, search: e.target.value}); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0D2B55] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          
          {/* Date Range Restrictors */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-500 ml-1" />
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                min={formatDateForInput(sixMonthsAgo)} 
                max={formatDateForInput(today)}
                value={filters.startDate} 
                onChange={(e) => { setFilters({...filters, startDate: e.target.value}); setPage(1); }}
                className="bg-transparent text-xs font-bold text-gray-700 outline-none w-[110px]"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input 
                type="date" 
                min={filters.startDate} 
                max={formatDateForInput(today)}
                value={filters.endDate} 
                onChange={(e) => { setFilters({...filters, endDate: e.target.value}); setPage(1); }}
                className="bg-transparent text-xs font-bold text-gray-700 outline-none w-[110px]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2">
            <Filter className="w-3 h-3 text-gray-400 ml-1" />
            <select 
              value={filters.severity} 
              onChange={(e) => { setFilters({...filters, severity: e.target.value}); setPage(1); }}
              className="py-2 bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer border-none focus:ring-0"
            >
              <option value="ALL">All Severities</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low / Info</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2">
            <FileText className="w-3 h-3 text-gray-400 ml-1" />
            <select 
              value={filters.category} 
              onChange={(e) => { setFilters({...filters, category: e.target.value}); setPage(1); }}
              className="py-2 bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer border-none focus:ring-0 w-[140px]"
            >
              <option value="ALL">All Categories</option>
              <option value="AUTH">Authentication</option>
              <option value="ADMIN_ACTION">Admin Actions</option>
              <option value="APPRAISAL_WORKFLOW">Appraisals</option>
              <option value="SECURITY">Security</option>
              <option value="USER_MANAGEMENT">User Mgmt</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#0D2B55]" />
              <span className="text-sm font-bold">Decrypting system logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
              <ShieldCheck className="w-12 h-12 mb-3 text-slate-200" />
              <span className="text-sm font-bold">No audit records found matching your filters.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-[#FAF8F4] border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4 w-[180px]">Timestamp</th>
                  <th className="p-4 w-[200px]">Actor / User</th>
                  <th className="p-4 w-[140px]">Event Type</th>
                  <th className="p-4">Action Details</th>
                  <th className="p-4 text-center w-[100px]">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {logs.map((log) => {
                  const dateObj = new Date(log.createdAt || log.timestamp);
                  
                  // 🚨 MM/DD/YYYY Format
                  const formattedDate = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}/${dateObj.getFullYear()}`;
                  
                  // 🚨 24-Hour Format
                  const formattedTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}:${String(dateObj.getSeconds()).padStart(2, '0')}`;

                  const fName = log.user?.personalDetails?.firstName || '';
                  const lName = log.user?.personalDetails?.lastName || '';
                  const actorName = fName || lName ? `${fName} ${lName}` : (log.user?.username || 'System Execution');
                  const role = log.role?.replace(/_/g, ' ') || 'SYSTEM';

                  return (
                    <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono text-[11px] text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {formattedDate}
                          <span className="ml-1 text-gray-400">{formattedTime}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                            <User className="w-3 h-3" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="font-bold text-[#0D2B55] truncate">{actorName}</div>
                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate">{role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <div className="font-bold text-gray-700 text-[11px] uppercase tracking-wide">{log.action}</div>
                          {getCategoryBadge(log.category)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-gray-600 truncate max-w-[400px] whitespace-normal line-clamp-2" title={log.details}>
                          {log.details}
                        </div>
                        {log.ipAddress && (
                          <div className="text-[9px] text-gray-400 font-mono mt-1">IP: {log.ipAddress}</div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {getSeverityBadge(log.severity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-[#FAF8F4] flex items-center justify-between">
          <div className="text-[11px] font-bold text-gray-500">
            Showing Page {page} of {totalPages || 1}
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1 || loading}
              className="p-1.5 rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages || totalPages === 0 || loading}
              className="p-1.5 rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 🚨 Universal Custom Modal for System Alerts */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-[24px]">
              <div className="flex items-center gap-[10px] mb-[12px]">
                {modalConfig.title.includes('Error') || modalConfig.title.includes('Failed') ? (
                  <AlertTriangle className="w-[20px] h-[20px] text-red-600" />
                ) : (
                  <ShieldCheck className="w-[20px] h-[20px] text-blue-600" />
                )}
                <h3 className="text-[18px] font-[800] text-slate-800">{modalConfig.title}</h3>
              </div>
              
              <p className="text-[14px] text-slate-600 mb-[24px] whitespace-pre-wrap leading-relaxed">
                {modalConfig.message}
              </p>

              <div className="flex justify-end gap-[12px]">
                <button 
                  type="button"
                  onClick={closeDialog}
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