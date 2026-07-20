'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Check, AlertTriangle, Loader2, ShieldAlert, History, FileX, Edit, Trash2 } from 'lucide-react';
import api from '../../../../lib/api';

const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

export default function QuarterManagement() {
  const [quarters, setQuarters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', isError: false });

  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    isPublished: false 
  });

  const loadSystemData = async () => {
    try {
      setLoading(true);
      const [quarterRes, userRes] = await Promise.all([
        // 🚨 FIXED: Using Axios params object to ensure the backend receives the flag
        api.get('/quarters', { params: { all: true } }), 
        api.get('/auth/me') 
      ]);
      
      setQuarters(quarterRes.data?.data || []);
      setCurrentUser(userRes.data?.data || null);
    } catch (error) {
      showToast('Failed to synchronize tracking parameters from database.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSystemData(); }, []);

  const showToast = (message, isError = false) => {
    setToast({ show: true, message, isError });
    setTimeout(() => setToast({ show: false, message: '', isError: false }), 4000);
  };

  const canCreateQuarter = currentUser && (
    currentUser.security?.role === 'HR_ADMIN' || currentUser.security?.secondaryRoles?.includes('HR_ADMIN') ||
    currentUser.security?.role === 'CEO' || currentUser.security?.secondaryRoles?.includes('CEO') ||
    currentUser.security?.role === 'ICT_ADMIN' || currentUser.security?.secondaryRoles?.includes('ICT_ADMIN')
  );

  const canOverrideDate = currentUser && (
    currentUser.security?.role === 'ICT_ADMIN' || currentUser.security?.secondaryRoles?.includes('ICT_ADMIN') ||
    currentUser.security?.role === 'HR_ADMIN' || currentUser.security?.secondaryRoles?.includes('HR_ADMIN')
  );

  const handleSubmitQuarter = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate || !formData.endDate) {
      return showToast('Please fulfill all date and naming requirements.', true);
    }

    const newStart = new Date(formData.startDate);
    const newEnd = new Date(formData.endDate);

    if (newStart >= newEnd) return showToast('The Deadline Cutoff must be strictly after the Start Date.', true);

    if (newStart.getFullYear() !== formData.year || newEnd.getFullYear() !== formData.year) {
      return showToast(`Date Error: Start and End dates must fall exactly within the selected fiscal year (${formData.year}).`, true);
    }

    const isDuplicateName = quarters.some(q => q._id !== editingId && q.name === formData.name && q.year === formData.year);
    if (isDuplicateName) return showToast(`Error: ${formData.name} has already been configured for the year ${formData.year}.`, true);

    const quarterSequence = ['Q1', 'Q2', 'Q3', 'Q4'];
    const selectedQIndex = quarterSequence.indexOf(formData.name);
    
    if (selectedQIndex > 0) {
      const requiredPreviousQ = quarterSequence[selectedQIndex - 1];
      const prevQuarter = quarters.find(q => q._id !== editingId && q.year === formData.year && q.name === requiredPreviousQ);
      
      if (!prevQuarter) {
        return showToast(`Sequence Error: You must establish ${requiredPreviousQ} for ${formData.year} before creating ${formData.name}.`, true);
      }
      
      const prevQEndDate = new Date(prevQuarter.endDate);
      if (newStart <= prevQEndDate) {
        return showToast(`Timeline Error: ${formData.name} must start after ${requiredPreviousQ} ends (${formatDate(prevQEndDate)}).`, true);
      }
    }

    const hasOverlap = quarters.some(q => {
      if (q._id === editingId) return false;
      if (q.year !== formData.year) return false;
      const exStart = new Date(q.startDate);
      const exEnd = new Date(q.endDate);
      return (newStart <= exEnd && exStart <= newEnd); 
    });

    if (hasOverlap) return showToast('Error: The selected dates overlap with an existing quarter block in this year.', true);

    try {
      setActionLoading(true);
      if (editingId) {
        await api.put(`/quarters/${editingId}`, formData);
        showToast(`Successfully updated lifecycle parameters for ${formData.name}.`);
      } else {
        await api.post('/quarters', formData);
        showToast(`Successfully published lifecycle parameters for ${formData.name}.`);
      }
      handleCancelEdit();
      loadSystemData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to process database record.', true);
    } finally {
      setActionLoading(false);
    }
  };

  const initiateEdit = (q) => {
    const formatAsInputDate = (dateString) => new Date(dateString).toISOString().split('T')[0];
    setFormData({
      name: q.name,
      year: q.year,
      startDate: formatAsInputDate(q.startDate),
      endDate: formatAsInputDate(q.endDate),
      isPublished: q.isPublished || false 
    });
    setEditingId(q._id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', year: new Date().getFullYear(), startDate: '', endDate: '', isPublished: false });
  };

  const handleDeleteQuarter = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete the upcoming quarter ${name}?`)) return;
    try {
      setActionLoading(true);
      await api.delete(`/quarters/${id}`);
      showToast(`${name} has been successfully deleted.`);
      if (editingId === id) handleCancelEdit();
      loadSystemData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete quarter.', true);
    } finally {
      setActionLoading(false);
    }
  };

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

  const handleTogglePublish = async (q) => {
    try {
      setActionLoading(true);
      
      const formatAsInputDate = (dateString) => new Date(dateString).toISOString().split('T')[0];
      
      await api.put(`/quarters/${q._id}`, { 
        name: q.name, 
        year: q.year, 
        startDate: formatAsInputDate(q.startDate), 
        endDate: formatAsInputDate(q.endDate), 
        isPublished: !q.isPublished 
      });
      showToast(`${q.name} is now ${!q.isPublished ? 'published & visible to staff' : 'hidden from staff'}.`);
      loadSystemData();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Failed to toggle publish status.', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadReport = async (quarter, type) => {
    try {
      showToast(`Compiling ${type.toLowerCase()} report for ${quarter.name}...`);
      
      const [appRes, usersRes] = await Promise.all([
        api.get('/appraisals'),
        api.get('/users') 
      ]);

      const allAppraisals = appRes.data?.data || [];
      const allUsers = usersRes.data?.data || [];
      const quarterAppraisals = allAppraisals.filter(app => app.appraisalQuarter?._id === quarter._id);
      const submittedUserIds = quarterAppraisals.map(app => app.employeeId?._id || app.employeeId);

      let csvRows = [];
      let filename = '';

      if (type === 'SUBMITTED') {
        if (quarterAppraisals.length === 0) return showToast(`No submittals found for ${quarter.name} yet.`, true);
        
        const headers = ['Appraisal Reference', 'Employee Name', 'Manager Name', 'Final Score', 'Performance Target', 'Workflow Status', 'Submission Date'];
        csvRows.push(headers.join(','));

        quarterAppraisals.forEach(record => {
          const row = [
            record.appraisalRef || 'N/A',
            `"${record.employeeId?.personalDetails?.firstName || ''} ${record.employeeId?.personalDetails?.lastName || ''}"`,
            `"${record.managerId?.personalDetails?.firstName || ''} ${record.managerId?.personalDetails?.lastName || ''}"`,
            record.calculatedResults?.finalIprfScore || 0,
            record.calculatedResults?.isExceedingPerformance ? 'EXCEEDING' : 'STANDARD',
            record.workflow?.status || 'UNKNOWN',
            record.createdAt ? formatDate(record.createdAt) : 'N/A'
          ];
          csvRows.push(row.join(','));
        });
        filename = `STIP_${quarter.name}_Submitted_Report.csv`;

      } else if (type === 'MISSING') {
        const missingUsers = allUsers.filter(u => 
          u.employmentDetails?.isActive && 
          !u.employmentDetails?.isDeleted &&
          u.security?.role !== 'CEO' && 
          !submittedUserIds.includes(u._id)
        );

        if (missingUsers.length === 0) return showToast('Excellent! All staff have submitted appraisals for this quarter.', false);

        const headers = ['Employee ID', 'Employee Name', 'Job Title', 'Manager Name', 'Company Code'];
        csvRows.push(headers.join(','));

        missingUsers.forEach(u => {
          const mgr = u.employmentDetails?.reportingTo?.personalDetails;
          const mgrName = mgr ? `${mgr.firstName} ${mgr.lastName}` : (u.employmentDetails?.rawManagerName || 'Unassigned');
          const empName = `${u.personalDetails?.firstName || ''} ${u.personalDetails?.lastName || ''}`;

          csvRows.push([
             u.employeeId || 'N/A',
             `"${empName}"`,
             `"${u.employmentDetails?.jobTitle || 'N/A'}"`,
             `"${mgrName}"`,
             u.companyCode || 'FSM'
          ].join(','));
        });
        filename = `STIP_${quarter.name}_Missing_Pending_Report.csv`;
      }

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename.replace(/\s+/g, '_'));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      showToast('Error aggregating tracking report streams.', true);
    }
  };

  if (loading) return <div className="min-h-[400px] flex items-center justify-center text-slate-500 font-semibold"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Syncing...</div>;

  return (
    <div className="max-w-[1400px] mx-auto pb-20 font-sans text-[#0F172A] px-4 xl:px-0">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[200] p-4 rounded-lg font-semibold text-xs shadow-lg flex items-center gap-2 border animate-in fade-in slide-in-from-top-4 ${
          toast.isError ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'
        }`}><AlertTriangle className="w-4 h-4" /> {toast.message}</div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1 text-[#0D2B55]">
          <Calendar className="w-7 h-7" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight">Appraisal Quarter Controls</h1>
        </div>
        <p className="text-sm text-gray-500 font-medium">Manage corporate review parameters and export status lists.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        <div className={`lg:col-span-1 bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4 ${!canCreateQuarter ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-sm font-bold text-[#0D2B55] flex items-center gap-1.5">
              {editingId ? <><Edit className="w-4 h-4 text-blue-600" /> Update Timeline</> : <><Plus className="w-4 h-4 text-emerald-600" /> Establish Timeline</>}
            </h2>
          </div>
          
          {!canCreateQuarter && <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 font-medium flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 text-amber-500" /> Requires HR, CEO, or ICT clearance.</div>}

          <form onSubmit={handleSubmitQuarter} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quarter Label</label>
              <select required className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#0D2B55] transition-colors shadow-sm"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              >
                <option value="">-- Select Quarter --</option>
                <option value="Q1">Quarter 1 (Q1)</option>
                <option value="Q2">Quarter 2 (Q2)</option>
                <option value="Q3">Quarter 3 (Q3)</option>
                <option value="Q4">Quarter 4 (Q4)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fiscal Target Year</label>
              <input type="number" required className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#0D2B55] font-mono shadow-sm"
                value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value) || new Date().getFullYear()})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Submission Range Start</label>
              <input type="date" required className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#0D2B55] font-mono shadow-sm"
                value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Deadline Date Cutoff</label>
              <input type="date" required className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#0D2B55] font-mono shadow-sm"
                value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div>
                <label className="block text-[10px] font-bold text-[#0D2B55] uppercase">Publish Quarter</label>
                <div className="text-[10px] text-gray-500 font-medium">Make visible to staff</div>
              </div>
              <button 
                type="button" 
                onClick={() => setFormData({...formData, isPublished: !formData.isPublished})} 
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${formData.isPublished ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${formData.isPublished ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            
            <div className="flex gap-2 pt-2">
              {editingId && (
                <button type="button" onClick={handleCancelEdit} disabled={actionLoading} className="w-1/3 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                  Cancel
                </button>
              )}
              <button type="submit" disabled={actionLoading || !canCreateQuarter} className={`flex-1 py-2 text-white rounded-lg text-xs font-bold transition-colors shadow flex items-center justify-center gap-1.5 disabled:opacity-50 ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#0D2B55] hover:bg-[#1a3d6e]'}`}>
                {actionLoading ? 'Processing...' : editingId ? 'Update Quarter Block' : 'Publish New Quarter Block'}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-[#FAF8F4] flex items-center gap-2">
            <History className="w-4 h-4 text-[#0D2B55]" />
            <div>
              <h3 className="text-sm font-bold text-[#0D2B55]">Active Trackers & Deadlines</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] font-bold text-gray-400 bg-white uppercase tracking-wider">
                  <th className="p-4">Tracking Window</th>
                  <th className="p-4">Schedule</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center" title="Override system lock to allow late submissions">Late Exceptions</th>
                  <th className="p-4 text-center" title="Toggle visibility for staff">Published</th>
                  <th className="p-4 text-center">Actions & Exports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {quarters.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-400 font-medium">No appraisal quarter windows initialized.</td></tr>
                ) : (
                  quarters.map(q => {
                    const now = new Date();
                    const start = new Date(q.startDate); start.setHours(0, 0, 0, 0);
                    const end = new Date(q.endDate); end.setHours(23, 59, 59, 999);
                    
                    const isFuture = now < start;
                    const isExpired = now > end;
                    const isActive = !isFuture && !isExpired;
                    
                    return (
                      <tr key={q._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-800 text-sm">{q.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Reference Year: {q.year}</div>
                        </td>
                        <td className="p-4 font-mono text-slate-600 space-y-0.5">
                          <div>Start: {formatDate(start)}</div>
                          <div className={isExpired ? 'text-rose-600 font-bold' : isActive ? 'text-emerald-600 font-bold' : ''}>End: {formatDate(end)}</div>
                        </td>
                        <td className="p-4 text-center">
                          {isFuture ? (
                             <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wide">Upcoming (Locked)</span>
                          ) : isExpired && !q.forceUnlock ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 uppercase tracking-wide">Locked (Expired)</span>
                          ) : q.forceUnlock ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wide">Override Open</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">Active</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <button disabled={actionLoading || !canOverrideDate} onClick={() => handleToggleForceUnlock(q._id)} className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${q.forceUnlock ? 'bg-amber-500' : 'bg-gray-200'} ${!canOverrideDate ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${q.forceUnlock ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                            {!canOverrideDate && <span className="text-[8px] text-gray-400 uppercase font-bold tracking-wider">ICT/HR Only</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <button disabled={actionLoading || !canCreateQuarter} onClick={() => handleTogglePublish(q)} className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${q.isPublished ? 'bg-emerald-500' : 'bg-gray-200'} ${!canCreateQuarter ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${q.isPublished ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5 items-center justify-center">
                            
                            {isFuture && (
                              <div className="flex w-[96px] gap-1 justify-center mb-1">
                                <button onClick={() => initiateEdit(q)} className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold text-[10px] flex items-center justify-center transition-colors flex-1" title="Edit Upcoming Quarter"><Edit className="w-3 h-3" /></button>
                                <button onClick={() => handleDeleteQuarter(q._id, q.name)} className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-bold text-[10px] flex items-center justify-center transition-colors flex-1" title="Delete Upcoming Quarter"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            )}

                            <button onClick={() => handleDownloadReport(q, 'SUBMITTED')} className="w-24 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-bold text-[10px] flex items-center justify-center gap-1 transition-colors"><Check className="w-3 h-3" /> Submitted</button>
                            <button onClick={() => handleDownloadReport(q, 'MISSING')} className="w-24 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-bold text-[10px] flex items-center justify-center gap-1 transition-colors"><FileX className="w-3 h-3" /> Pending</button>
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

      </div>
    </div>
  );
}