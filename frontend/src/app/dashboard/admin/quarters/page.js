'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Lock, Unlock, Plus, Download, Check, AlertTriangle, Loader2, ShieldAlert, History } from 'lucide-react';
import api from '../../../../lib/api';

export default function QuarterManagement() {
  const [quarters, setQuarters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', isError: false });

  // Form State (HR Admin creation tool)
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    startDate: '',
    endDate: ''
  });

  // Fetch structural data on component load
  const loadSystemData = async () => {
    try {
      setLoading(true);
      // Fetch both appraisal quarters and current session details
      const [quarterRes, userRes] = await Promise.all([
        api.get('/quarters'),
        api.get('/auth/me').catch(() => ({ data: { data: { role: 'HR_ADMIN' } } })) // Fallback safety catch
      ]);
      
      setQuarters(quarterRes.data?.data || []);
      setCurrentUser(userRes.data?.data || null);
    } catch (error) {
      showToast('Failed to synchronize tracking parameters from database.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemData();
  }, []);

  const showToast = (message, isError = false) => {
    setToast({ show: true, message, isError });
    setTimeout(() => setToast({ show: false, message: '', isError: false }), 3500);
  };

  // Check role clearancess
  const isHR = currentUser?.role === 'HR_ADMIN' || currentUser?.secondaryRoles?.includes('HR_ADMIN');
  const isICT = currentUser?.role === 'ICT_ADMIN' || currentUser?.secondaryRoles?.includes('ICT_ADMIN');

  // Handle Form Submission (HR creation pipeline)
  const handleCreateQuarter = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate || !formData.endDate) {
      return showToast('Please fulfill all date and naming requirements.', true);
    }

    try {
      setActionLoading(true);
      await api.post('/quarters', formData);
      showToast(`Successfully opened lifecycle parameters for ${formData.name}.`);
      setFormData({ name: '', year: new Date().getFullYear(), startDate: '', endDate: '' });
      loadSystemData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to initialize database record.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Override Request (ICT Admin lifecycle toggle)
  const handleToggleForceUnlock = async (quarterId) => {
    try {
      setActionLoading(true);
      const res = await api.patch(`/quarters/${quarterId}/unlock`);
      showToast(res.data?.message || 'Access state modified securely.');
      loadSystemData();
    } catch (error) {
      showToast('Unauthorized execution attempt or interface error.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Dynamic Client-Side CSV Generator (Downloads filtered appraisal records by quarter)
  const handleDownloadAppraisalsByQuarter = async (quarter) => {
    try {
      showToast(`Compiling performance summaries for ${quarter.name}...`);
      const response = await api.get('/appraisals');
      const allAppraisals = response.data?.data || [];
      
      // Filter appraisals matching this specific quarter ID
      const filteredRecords = allAppraisals.filter(app => app.appraisalQuarter?._id === quarter._id);
      
      if (filteredRecords.length === 0) {
        return showToast(`No appraisal submittals found for ${quarter.name} yet.`, true);
      }

      // Build out the dynamic tracking sheet rows
      const headers = ['Appraisal Reference', 'Employee Name', 'Manager Name', 'Final Score', 'Performance Target', 'Workflow Status', 'Submission Date'];
      const csvRows = [headers.join(',')];

      filteredRecords.forEach(record => {
        const row = [
          record.appraisalRef || 'N/A',
          `"${record.employeeId?.personalDetails?.firstName || ''} ${record.employeeId?.personalDetails?.lastName || ''}"`,
          `"${record.managerId?.personalDetails?.firstName || ''} ${record.managerId?.personalDetails?.lastName || ''}"`,
          record.calculatedResults?.finalIprfScore || 0,
          record.calculatedResults?.isExceedingPerformance ? 'EXCEEDING' : 'STANDARD',
          record.workflow?.status || 'UNKNOWN',
          record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'N/A'
        ];
        csvRows.push(row.join(','));
      });

      // Construct download blob pipeline
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `STIP_Report_${quarter.name.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      showToast('Error aggregating appraisal report streams.', true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center font-sans text-slate-500 font-semibold animate-pulse">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#0D2B55]" /> Syncing Quarter Lockout System...
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-20 font-sans text-[#0F172A] px-4 xl:px-0">
      
      {/* Toast Warning/Success Alerts */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[200] p-4 rounded-lg font-semibold text-xs shadow-lg flex items-center gap-2 border animate-in fade-in slide-in-from-top-4 ${
          toast.isError ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'
        }`}>
          <AlertTriangle className="w-4 h-4" /> {toast.message}
        </div>
      )}

      {/* Hero Layout Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1 text-[#0D2B55]">
          <Calendar className="w-7 h-7" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight">Appraisal Quarter Controls</h1>
        </div>
        <p className="text-sm text-gray-500 font-medium">
          Manage corporate review parameters, define structural deadline dates, and configure access overrides.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Form panel: Only visible to HR Admin schemas */}
        <div className={`lg:col-span-1 bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4 ${!isHR ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-sm font-bold text-[#0D2B55] flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" /> Establish Timeline
            </h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">HR creates tracking blocks to group submittals.</p>
          </div>

          {!isHR && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" /> Creating timeline parameters requires root HR Admin clearance levels.
            </div>
          )}

          <form onSubmit={handleCreateQuarter} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quarter Label</label>
              <input 
                type="text" required placeholder="e.g., Q1 - 2026 Cycle" 
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#0D2B55] transition-colors shadow-sm"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fiscal Target Year</label>
              <input 
                type="number" required
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#0D2B55] transition-colors shadow-sm font-mono"
                value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value) || new Date().getFullYear()})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Submission Range Start</label>
              <input 
                type="date" required
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#0D2B55] transition-colors shadow-sm font-mono"
                value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Deadline Date Cutoff</label>
              <input 
                type="date" required
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#0D2B55] transition-colors shadow-sm font-mono"
                value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})}
              />
            </div>

            <button 
              type="submit" disabled={actionLoading || !isHR}
              className="w-full py-2 bg-[#0D2B55] hover:bg-[#1a3d6e] text-white rounded-lg text-xs font-bold transition-colors shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : 'Publish New Quarter Block'}
            </button>
          </form>
        </div>

        {/* Global Overview Tracking Table */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-[#FAF8F4] flex items-center gap-2">
            <History className="w-4 h-4 text-[#0D2B55]" />
            <div>
              <h3 className="text-sm font-bold text-[#0D2B55]">Active Trackers & Deadlines</h3>
              <p className="text-[11px] text-gray-400 font-medium">Live evaluation metrics pulled straight from the system</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] font-bold text-gray-400 bg-white uppercase tracking-wider">
                  <th className="p-4">Quarter Tracking Window</th>
                  <th className="p-4">Active Schedule</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Late Exceptions</th>
                  <th className="p-4 text-center">Data Exports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {quarters.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400 font-medium">
                      No appraisal quarter windows initialized in system configuration.
                    </td>
                  </tr>
                ) : (
                  quarters.map(q => {
                    // Normalize dates to midnight to prevent timezone issues
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const end = new Date(q.endDate);
                    end.setHours(0, 0, 0, 0);
                    
                    const expired = today > end;
                    
                    return (
                      <tr key={q._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-800 text-sm">{q.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Reference Year: {q.year}</div>
                        </td>
                        <td className="p-4 font-mono text-slate-600 space-y-0.5">
                          <div>Start: {new Date(q.startDate).toLocaleDateString()}</div>
                          <div className={expired ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                            End: {new Date(q.endDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {expired && !q.forceUnlock ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 uppercase tracking-wide">Locked</span>
                          ) : q.forceUnlock ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wide">Override Open</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">Open</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center">
                            {/* 🚨 FIX: Always render the ICT Admin Switch Override regardless of expired status */}
                            <button
                              disabled={actionLoading || !isICT}
                              onClick={() => handleToggleForceUnlock(q._id)}
                              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                                q.forceUnlock ? 'bg-amber-500' : 'bg-gray-200'
                              } ${!isICT ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                              title={isICT ? "Toggle forced late entry submittals" : "Requires ICT clearance"}
                            >
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                q.forceUnlock ? 'translate-x-5' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleDownloadAppraisalsByQuarter(q)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border text-slate-700 rounded font-bold text-[11px] flex items-center gap-1 mx-auto transition-colors shadow-sm"
                          >
                            <Download className="w-3 h-3" /> Report
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}