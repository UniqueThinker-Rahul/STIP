'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Send, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  X, 
  FileText, 
  Paperclip, 
  Info,
  PackageCheck,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';

export default function LineManagerMyTeamPage() {
  // Navigation State: 'list' or 'raise-case'
  const [currentView, setCurrentView] = useState('list');
  const [selectedCaseForEdit, setSelectedCaseForEdit] = useState(null);

  // UI Accordion & Modal States
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const [activePropertyModal, setActivePropertyModal] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });

  // Initial Cases Data (Only employees assigned under this Line Manager)
  const [cases, setCases] = useState([
    {
      id: 'DC-1049',
      employee: 'Brodie Model',
      role: 'Terminal Operator',
      offence: 'Ignoring safety instructions or not using safety equipment properly',
      recommended: 'E15 - 15-day suspension',
      recCode: 'E15',
      status: 'HR - 1st',
      statusType: 'hr',
      isDraft: false
    },
    {
      id: 'DC-1058',
      employee: 'Moeketsi Supsan',
      role: 'Service Operator',
      offence: 'Insubordination — refusing a proper order or abusive language to supervisor',
      recommended: 'B - Written warning',
      recCode: 'B',
      status: 'HR - 1st',
      statusType: 'hr',
      isDraft: false
    },
    {
      id: 'DC-1060',
      employee: 'Rhonald Maimoon',
      role: 'Project Engineer',
      offence: 'Deliberate failure/delay in carrying out instructions (e.g. monthly reports/performance)',
      recommended: 'B - Written warning',
      recCode: 'B',
      status: 'Draft',
      statusType: 'draft',
      isDraft: true
    }
  ]);

  // Company Property Offboarding Cases
  const [propertyCases, setPropertyCases] = useState([
    {
      id: 'DC-1042',
      employee: 'Bettina Albona',
      department: 'Teamwork',
      role: 'Terminal Operator',
      retrievedCount: 1,
      totalCount: 12,
      checklist: {
        laptop: false,
        mobile: true,
        keys: false,
        idCard: false,
        uniform: false,
        vehicle: false,
        fuelCard: false,
        tools: false,
        documents: false,
        other: false
      },
      notes: { mobile: 'SIM returned' }
    }
  ]);

  // Raise / Edit Case Form State
  const [formData, setFormData] = useState({
    employee: 'Rhonald Maimoon — Project Engineer',
    offence: '13. Deliberate failure/delay in carrying out instructions (e.g. monthly reports)',
    recommendedAction: 'B - Written warning',
    occurrence: '1st occurrence',
    incidentDate: '2026-06-20',
    statement: 'Repeated delay in submitting the monthly project progress report despite reminders.',
    isSerious: false
  });

  // Tooltip Handlers
  const handleMouseEnter = (e, text) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 36
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, text: '', x: 0, y: 0 });
  };

  // Case Actions
  const handleDeleteDraft = (caseId) => {
    setCases(cases.filter(c => c.id !== caseId));
  };

  const handleSubmitToHR = (caseId) => {
    setCases(cases.map(c => {
      if (c.id === caseId) {
        return { ...c, status: 'HR - 1st', statusType: 'hr', isDraft: false };
      }
      return c;
    }));
  };

  const handleEditDraft = (c) => {
    setSelectedCaseForEdit(c);
    setFormData({
      employee: `${c.employee} — ${c.role}`,
      offence: c.offence,
      recommendedAction: c.recommended,
      occurrence: '1st occurrence',
      incidentDate: '2026-06-20',
      statement: 'Repeated delay in submitting performance reports.',
      isSerious: false
    });
    setCurrentView('raise-case');
  };

  const handleSaveChecklist = (updatedChecklist, updatedNotes, checkedBy) => {
    const count = Object.values(updatedChecklist).filter(Boolean).length;
    setPropertyCases(propertyCases.map(item => {
      if (item.id === activePropertyModal.id) {
        return {
          ...item,
          retrievedCount: count,
          checklist: updatedChecklist,
          notes: updatedNotes
        };
      }
      return item;
    }));
    setActivePropertyModal(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16 relative">
      
      {/* Floating Custom Tooltip */}
      {tooltip.visible && (
        <div 
          className="fixed z-50 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded shadow-lg pointer-events-none transform -translate-x-1/2 transition-opacity duration-150"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          {tooltip.text}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* View Switcher: List View vs Raise/Edit Case View */}
        {currentView === 'list' ? (
          <>
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  My Team — Disciplinary
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Cases you have raised or are drafting
                </p>
              </div>

              <button 
                onClick={() => {
                  setSelectedCaseForEdit(null);
                  setFormData({
                    employee: '',
                    offence: '',
                    recommendedAction: '',
                    occurrence: '1st occurrence',
                    incidentDate: '',
                    statement: '',
                    isSerious: false
                  });
                  setCurrentView('raise-case');
                }}
                className="inline-flex items-center gap-2 bg-[#0D2B55] hover:bg-[#163b6e] text-white text-sm font-semibold px-4 py-2.5 rounded-md shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Raise a case
              </button>
            </div>

            {/* Collapsible Info Banner ("How My Team works") */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-8 overflow-hidden">
              <div 
                className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between cursor-pointer select-none"
                onClick={() => setShowHowItWorks(!showHowItWorks)}
              >
                <div className="flex items-center gap-3">
                  <Info className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-bold text-slate-800">How My Team works</span>
                  <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded">
                    Line Manager
                  </span>
                </div>
                <button className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1">
                  {showHowItWorks ? (
                    <>Hide <ChevronUp className="w-3.5 h-3.5" /></>
                  ) : (
                    <>Show <ChevronDown className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>

              {showHowItWorks && (
                <div className="p-5 text-xs text-slate-600 space-y-2 bg-white leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <p>
                      <strong className="text-slate-800">Shared:</strong> The cases you have raised or drafting are shared. Counsel the employee first — a formal case is a last resort.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <p>
                      <strong className="text-slate-800">Drafts:</strong> Drafts can be saved, modified, submitted to HR or deleted. Once submitted, the case moves to HR and you can track its status.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Section 1: Your Cases Table */}
            <div className="mb-10">
              <div className="mb-3">
                <h2 className="text-base font-bold text-slate-900">Your cases</h2>
                <p className="text-xs text-slate-500">Cases you are handling with HR</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-[#0D2B55] text-white text-[11px] font-bold tracking-wider uppercase">
                      <th className="py-3 px-4">Case</th>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Offence</th>
                      <th className="py-3 px-4">Recommended</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {cases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Case ID */}
                        <td className="py-4 px-4 font-semibold text-slate-700 whitespace-nowrap">
                          <span className="bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[11px]">
                            {c.id}
                          </span>
                        </td>

                        {/* Employee */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900">{c.employee}</div>
                          <div className="text-[11px] text-slate-500">{c.role}</div>
                        </td>

                        {/* Offence */}
                        <td className="py-4 px-4 text-slate-700 max-w-xs leading-snug">
                          {c.offence}
                        </td>

                        {/* Recommended */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 font-semibold text-[11px] px-2.5 py-1 rounded">
                            <span className="bg-amber-600 text-white text-[10px] px-1 py-0.2 rounded">
                              {c.recCode}
                            </span>
                            {c.recommended.replace(`${c.recCode} - `, '')}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {c.isDraft ? (
                            <span className="bg-slate-100 text-slate-700 border border-slate-300 font-medium px-2.5 py-1 rounded text-[11px]">
                              Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-200 font-semibold px-2.5 py-1 rounded text-[11px]">
                              <span className="text-[10px] bg-amber-700 text-white px-1 py-0.2 rounded font-bold">
                                HR - 1st
                              </span>
                              With HR
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          {c.isDraft ? (
                            <div className="inline-flex items-center gap-2">
                              <button 
                                onClick={() => handleEditDraft(c)}
                                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium px-2.5 py-1 rounded shadow-xs text-xs"
                              >
                                Edit
                              </button>

                              <button 
                                onClick={() => handleSubmitToHR(c.id)}
                                onMouseEnter={(e) => handleMouseEnter(e, "Send this draft case to HR to investigate")}
                                onMouseLeave={handleMouseLeave}
                                className="bg-[#0D2B55] hover:bg-[#163b6e] text-white font-semibold px-2.5 py-1 rounded shadow-xs text-xs flex items-center gap-1"
                              >
                                Submit to HR
                              </button>

                              <button 
                                onClick={() => handleDeleteDraft(c.id)}
                                onMouseEnter={(e) => handleMouseEnter(e, "Remove this draft case entirely. They can't be recovered.")}
                                onMouseLeave={handleMouseLeave}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium px-3 py-1 rounded shadow-xs text-xs">
                              Redraft
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Company Property to Retrieve */}
            <div>
              <div className="mb-3">
                <h2 className="text-base font-bold text-slate-900">Company property to retrieve</h2>
                <p className="text-xs text-slate-500">Outstanding company property from the employee</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-[#0D2B55] text-white text-[11px] font-bold tracking-wider uppercase">
                      <th className="py-3 px-4">Case</th>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Property Required</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {propertyCases.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 font-semibold text-slate-700">
                          <span className="bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[11px]">
                            {item.id}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900">{item.employee}</div>
                          <div className="text-[11px] text-slate-500">{item.role}</div>
                        </td>
                        <td className="py-4 px-4 text-slate-700">{item.department}</td>
                        <td className="py-4 px-4">
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold px-2.5 py-1 rounded">
                            {item.retrievedCount}/{item.totalCount} retrieved
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button 
                            onClick={() => setActivePropertyModal(item)}
                            className="bg-[#0D2B55] hover:bg-[#163b6e] text-white font-semibold px-3 py-1.5 rounded shadow-xs text-xs inline-flex items-center gap-1.5 transition-all"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            Retrieve property
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Raise / Edit Case Form View */
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-4xl mx-auto">
            
            {/* Top Back Navigation */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <button 
                onClick={() => setCurrentView('list')}
                className="text-slate-600 hover:text-slate-900 text-sm font-semibold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back to My Team
              </button>
              <h2 className="text-lg font-bold text-slate-900">
                {selectedCaseForEdit ? `Edit draft ${selectedCaseForEdit.id}` : 'Raise a Disciplinary Case'}
              </h2>
            </div>

            {/* Guidance Banner */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-bold">No counselling on file — consider counselling first</p>
                  <p className="text-amber-800 leading-relaxed">
                    Counselling the employee first is recommended for a 1st offence. For a serious offence, tick "Serious offence" below and raise the case directly.
                  </p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Employee
                </label>
                <select 
                  value={formData.employee}
                  onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select assigned employee...</option>
                  <option value="Rhonald Maimoon — Project Engineer">Rhonald Maimoon — Project Engineer</option>
                  <option value="Brodie Model — Terminal Operator">Brodie Model — Terminal Operator</option>
                  <option value="Moeketsi Supsan — Service Operator">Moeketsi Supsan — Service Operator</option>
                </select>
              </div>

              {/* Offence Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Offence (1 to 5 offences max per incident)
                </label>
                <select 
                  value={formData.offence}
                  onChange={(e) => setFormData({ ...formData, offence: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="13. Deliberate failure/delay in carrying out instructions (e.g. monthly reports)">
                    13. Deliberate failure/delay in carrying out instructions (e.g. monthly reports)
                  </option>
                  <option value="1. Unexcused tardiness / late arrival">
                    1. Unexcused tardiness / late arrival
                  </option>
                  <option value="8. Insubordination — refusing a proper order">
                    8. Insubordination — refusing a proper order
                  </option>
                </select>
              </div>

              {/* Penalty Check Grid */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Occurrence</label>
                  <div className="bg-white border border-slate-300 rounded px-3 py-1.5 text-sm font-semibold text-slate-800">
                    {formData.occurrence}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Recommended auto action</label>
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded px-3 py-1.5 text-sm font-semibold">
                    {formData.recommendedAction}
                  </div>
                </div>
              </div>

              {/* Incident Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Incident date
                </label>
                <input 
                  type="date"
                  value={formData.incidentDate}
                  onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                  className="w-full sm:w-64 bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800"
                />
              </div>

              {/* Statement of Facts */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Statement of facts
                </label>
                <textarea 
                  rows={4}
                  value={formData.statement}
                  onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
                  placeholder="Describe what occurred, dates, times, and impact..."
                  className="w-full bg-white border border-slate-300 rounded-md p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* File Attachment Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Supporting documents & evidence
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50/50 cursor-pointer transition-colors">
                  <Paperclip className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">
                    Click to upload documents or images
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    PDF, PNG, JPG or MP4 up to 25MB
                  </p>
                </div>
              </div>

              {/* Serious Offence Fast-Track Checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="serious"
                  checked={formData.isSerious}
                  onChange={(e) => setFormData({ ...formData, isSerious: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="serious" className="text-xs font-semibold text-slate-800 cursor-pointer flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  Serious offence — report to HR immediately (bypasses standard process)
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setCurrentView('list')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-md"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setCurrentView('list')}
                  className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md"
                >
                  Save draft
                </button>
                <button 
                  onClick={() => {
                    alert("Submitted case to HR successfully!");
                    setCurrentView('list');
                  }}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0D2B55] hover:bg-[#163b6e] rounded-md shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit to HR
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Property Checklist Modal */}
      {activePropertyModal && (
        <PropertyChecklistModal 
          item={activePropertyModal} 
          onClose={() => setActivePropertyModal(null)}
          onSave={handleSaveChecklist}
        />
      )}

    </div>
  );
}

// Property Checklist Modal Sub-Component
function PropertyChecklistModal({ item, onClose, onSave }) {
  const [checklist, setChecklist] = useState(item.checklist || {});
  const [notes, setNotes] = useState(item.notes || {});
  const [checkedBy, setCheckedBy] = useState('Line Manager');

  const itemsList = [
    { key: 'laptop', label: 'Laptop / computer' },
    { key: 'mobile', label: 'Mobile phone / SIM' },
    { key: 'keys', label: 'Access keys' },
    { key: 'idCard', label: 'ID / Access card' },
    { key: 'uniform', label: 'Uniform / PPE' },
    { key: 'vehicle', label: 'Company vehicle' },
    { key: 'fuelCard', label: 'Fuel card' },
    { key: 'tools', label: 'Tools / equipment' },
    { key: 'documents', label: 'Documents / files' },
    { key: 'other', label: 'Other' },
  ];

  const count = Object.values(checklist).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Property retrieved — {item.employee}
            </h3>
            <p className="text-xs text-slate-500">
              {item.employee} — {item.role}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Check off any returned company property from the employee. Type each item and check the box or update any outstanding count.
          </p>

          <div className="space-y-2.5 divide-y divide-slate-100">
            {itemsList.map((i) => (
              <div key={i.key} className="pt-2 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input 
                    type="checkbox"
                    checked={!!checklist[i.key]}
                    onChange={(e) => setChecklist({ ...checklist, [i.key]: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>{i.label}</span>
                </label>

                <input 
                  type="text"
                  placeholder="Note (e.g. serial no, or outstanding)"
                  value={notes[i.key] || ''}
                  onChange={(e) => setNotes({ ...notes, [i.key]: e.target.value })}
                  className="w-48 text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none"
                />
              </div>
            ))}
          </div>

          {/* Counter Tag */}
          <div className="pt-3">
            <span className="inline-block bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded text-xs border border-amber-200">
              {count}/12 retrieved
            </span>
          </div>

          {/* Checker Input */}
          <div className="pt-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Recorded / checked by
            </label>
            <input 
              type="text" 
              value={checkedBy}
              onChange={(e) => setCheckedBy(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-1.5 text-slate-800"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(checklist, notes, checkedBy)}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0D2B55] hover:bg-[#163b6e] rounded shadow-xs"
          >
            Save checklist
          </button>
        </div>

      </div>
    </div>
  );
}