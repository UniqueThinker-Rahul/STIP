'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Check, Save, RotateCcw, Info, X } from 'lucide-react';

// --- SYSTEM PERMISSION SCHEMA ---
const PERMISSION_SCHEMA = [
  {
    category: 'Self-Service Portal',
    items: [
      { id: 'view_own_profile', label: 'View Own Profile', desc: 'Allows user to view their own basic details and historical performance.' },
      { id: 'ack_appraisals', label: 'Acknowledge Appraisals', desc: 'Allows user to digitally sign and acknowledge completed appraisals.' },
      { id: 'view_awards', label: 'View Own Awards', desc: 'Allows user to view their STIP award history and calculations.' }
    ]
  },
  {
    category: 'Appraisal Management',
    items: [
      { id: 'create_appraisal', label: 'Create New Appraisals', desc: 'Can start new performance appraisals for direct reports.' },
      { id: 'edit_drafts', label: 'Edit Draft Appraisals', desc: 'Can save and resume incomplete appraisal forms.' },
      { id: 'submit_to_hr', label: 'Submit to HR', desc: 'Can forward completed appraisals to HR for review.' },
      { id: 'hr_review', label: 'HR Review & Queue', desc: 'Can review manager submissions and approve them to the CEO.' },
      { id: 'ceo_approval', label: 'Final CEO Approval', desc: 'Can grant final approval and lock the appraisal cycle.' }
    ]
  },
  {
    category: 'Staff & Directory',
    items: [
      { id: 'view_team', label: 'View Direct Team', desc: 'Can view profiles of their direct reports.' },
      { id: 'view_all_staff', label: 'View All Staff', desc: 'Can view the global staff directory.' },
      { id: 'edit_staff', label: 'Edit Staff Profiles', desc: 'Can modify job titles, locations, and salaries.' }
    ]
  },
  {
    category: 'System & Security',
    items: [
      { id: 'manage_scorecard', label: 'Manage KPA Scorecard', desc: 'Can edit company metrics and BSC raw scores.' },
      { id: 'manage_config', label: 'System Configuration', desc: 'Can modify global dropdowns, company codes, and office locations.' },
      { id: 'manage_roles', label: 'Manage Access & Roles', desc: 'Can change user roles, disable accounts, and modify permission matrices.' }
    ]
  }
];

// --- DEFAULT ROLE MATRIX ---
const INITIAL_MATRIX = {
  EMPLOYEE: {
    view_own_profile: true, ack_appraisals: true, view_awards: true,
    create_appraisal: false, edit_drafts: false, submit_to_hr: false, hr_review: false, ceo_approval: false,
    view_team: false, view_all_staff: false, edit_staff: false,
    manage_scorecard: false, manage_config: false, manage_roles: false
  },
  MANAGER: {
    view_own_profile: true, ack_appraisals: true, view_awards: true,
    create_appraisal: true, edit_drafts: true, submit_to_hr: true, hr_review: false, ceo_approval: false,
    view_team: true, view_all_staff: false, edit_staff: false,
    manage_scorecard: false, manage_config: false, manage_roles: false
  },
  HR_ADMIN: {
    view_own_profile: true, ack_appraisals: true, view_awards: true,
    create_appraisal: false, edit_drafts: false, submit_to_hr: false, hr_review: true, ceo_approval: false,
    view_team: false, view_all_staff: true, edit_staff: true,
    manage_scorecard: false, manage_config: true, manage_roles: false
  },
  CEO: {
    view_own_profile: true, ack_appraisals: true, view_awards: true,
    create_appraisal: true, edit_drafts: true, submit_to_hr: false, hr_review: false, ceo_approval: true,
    view_team: true, view_all_staff: true, edit_staff: false,
    manage_scorecard: true, manage_config: false, manage_roles: false
  },
  ICT_ADMIN: {
    view_own_profile: true, ack_appraisals: true, view_awards: true,
    create_appraisal: false, edit_drafts: false, submit_to_hr: false, hr_review: false, ceo_approval: false,
    view_team: false, view_all_staff: true, edit_staff: false,
    manage_scorecard: false, manage_config: true, manage_roles: true
  }
};

const ROLE_LABELS = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Line Manager',
  HR_ADMIN: 'HR Admin',
  CEO: 'CEO',
  ICT_ADMIN: 'ICT Admin'
};

export default function RolesAndPermissions() {
  const [activeRole, setActiveRole] = useState('CEO'); 
  
  // Matrix holds the active editing state, savedMatrix holds the last confirmed state
  const [matrix, setMatrix] = useState(JSON.parse(JSON.stringify(INITIAL_MATRIX)));
  const [savedMatrix, setSavedMatrix] = useState(JSON.parse(JSON.stringify(INITIAL_MATRIX)));
  
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    const current = JSON.stringify(matrix);
    const saved = JSON.stringify(savedMatrix);
    setIsDirty(current !== saved);
  }, [matrix, savedMatrix]);

  const handleToggle = (permId) => {
    setMatrix(prev => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [permId]: !prev[activeRole][permId]
      }
    }));
  };

  const handleDiscard = () => {
    setMatrix(JSON.parse(JSON.stringify(savedMatrix)));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setSavedMatrix(JSON.parse(JSON.stringify(matrix)));
      setIsSaving(false);
      setToast({ show: true, message: 'Role permissions successfully updated across the system.' });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
    }, 800);
  };

  return (
    <div className="max-w-5xl mx-auto pb-[80px] font-sans">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-[200] p-[12px_20px] rounded-[8px] font-[600] text-[13px] shadow-lg bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] flex items-center gap-[8px] animate-in fade-in slide-in-from-top-4">
          <Check className="w-4 h-4" /> {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-[20px]">
        <div className="text-[20px] font-[700] text-[#0D2B55] mb-[3px] flex items-center gap-[8px]">
          <Shield className="w-6 h-6" /> System Roles & Permissions
        </div>
        <div className="text-[13px] text-[#6b7280]">
          ICT Admin — Configure what each system role is allowed to see and do.
        </div>
      </div>

      {/* ICT Warning Alert */}
      <div className="bg-[#FFFBEB] border-[1.5px] border-[#FDE68A] text-[#92400E] rounded-[10px] p-[12px_16px] text-[13px] mb-[24px] shadow-sm flex items-start gap-[10px]">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
        <div className="leading-[1.6]">
          <strong className="font-[800]">ICT Admin Responsibility:</strong> Role permissions govern the entire platform's security. Changes made here apply instantly to all active sessions. Review carefully before saving.
        </div>
      </div>

      {/* Main Access Matrix Card */}
      <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col mb-[30px]">
        
        {/* Card Header & Role Tabs */}
        <div className="bg-[#FAF8F4] border-b border-[#E2DDD4]">
          <div className="p-[16px_20px] flex items-center gap-[10px]">
            <div className="w-[32px] h-[32px] rounded-[8px] bg-[#E0E7FF] flex items-center justify-center text-[#4338CA]">
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-[15px] font-[800] text-[#0D2B55]">Role Access Matrix</div>
          </div>
          
          <div className="px-[20px] pb-[16px] flex gap-[8px] overflow-x-auto custom-scrollbar">
            {Object.keys(ROLE_LABELS).map(roleKey => (
              <button
                key={roleKey}
                onClick={() => setActiveRole(roleKey)}
                className={`px-[16px] py-[8px] rounded-full text-[12px] font-[800] transition-all whitespace-nowrap border ${
                  activeRole === roleKey 
                    ? 'bg-[#0D2B55] text-white border-[#0D2B55] shadow-md' 
                    : 'bg-white text-[#6b7280] border-[#E2DDD4] hover:border-[#0D2B55]/40 hover:text-[#0D2B55]'
                }`}
              >
                {ROLE_LABELS[roleKey]}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions List */}
        <div className="p-[24px] space-y-[32px]">
          {PERMISSION_SCHEMA.map((categoryGroup, idx) => (
            <div key={idx}>
              <h3 className="text-[11px] font-[800] text-[#6b7280] uppercase tracking-widest mb-[12px] border-b border-[#E2DDD4] pb-[8px]">
                {categoryGroup.category}
              </h3>
              
              <div className="flex flex-col gap-[16px]">
                {categoryGroup.items.map(item => {
                  const isEnabled = matrix[activeRole][item.id];
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-[20px] p-[12px] rounded-[10px] hover:bg-[#FAF8F4] transition-colors border border-transparent hover:border-[#E2DDD4]">
                      <div className="flex items-start gap-[12px]">
                        <div className="mt-0.5">
                          <Info className="w-4 h-4 text-[#0D2B55]/40" />
                        </div>
                        <div>
                          <div className="text-[14px] font-[700] text-[#0D2B55] mb-[2px]">{item.label}</div>
                          <div className="text-[12px] text-[#6b7280] leading-relaxed">{item.desc}</div>
                        </div>
                      </div>
                      
                      {/* Interactive iOS Style Toggle Switch */}
                      <button 
                        onClick={() => handleToggle(item.id)}
                        className={`relative inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner ${isEnabled ? 'bg-[#059669]' : 'bg-[#CBD5E1]'}`}
                      >
                        <span className="sr-only">Toggle {item.label}</span>
                        <span 
                          className={`pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-[20px]' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions Panel */}
        <div className="p-[20px_24px] border-t border-[#E2DDD4] bg-[#FAF8F4] flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="text-[12px] text-[#6b7280] font-[500]">
            {isDirty ? (
              <span className="text-[#92400E] flex items-center gap-1.5"><AlertTriangle className="w-4 h-4"/> Unsaved changes pending</span>
            ) : (
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4"/> Matrix is up to date</span>
            )}
          </div>
          
          <div className="flex gap-[12px] w-full md:w-auto">
            <button 
              onClick={handleDiscard}
              disabled={!isDirty || isSaving}
              className="flex-1 md:flex-none px-[16px] py-[10px] text-[13px] font-[800] text-[#0f1923] bg-white border border-[#E2DDD4] rounded-[8px] hover:border-[#0D2B55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Discard Changes
            </button>
            <button 
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="flex-1 md:flex-none px-[20px] py-[10px] text-[13px] font-[800] text-white bg-[#0D2B55] hover:bg-[#1a3d6e] rounded-[8px] shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? 'Processing...' : <><Save className="w-4 h-4" /> Save Permission Changes</>}
            </button>
          </div>
        </div>
      </div>

      {/* 🚨 NEW: LIVE PERMISSION MATRIX GUIDE */}
      <div className="bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col mt-[40px]">
        <div className="p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
          <div className="w-[32px] h-[32px] rounded-[8px] bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[15px] font-[800] text-[#0D2B55]">Live Permission Matrix Guide</div>
            <div className="text-[12px] font-[500] text-[#6b7280]">Overview of all active system capabilities per role</div>
          </div>
        </div>
        
        <div className="overflow-x-auto p-[20px]">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b-2 border-[#E2DDD4]">
                <th className="p-[12px_16px] text-[11px] font-[800] text-[#6b7280] uppercase tracking-widest bg-slate-50 w-[25%] rounded-tl-lg border-r border-[#E2DDD4]">Permission Capability</th>
                {Object.keys(ROLE_LABELS).map(roleKey => (
                  <th key={roleKey} className="p-[12px_16px] text-center text-[11px] font-[800] text-[#0D2B55] uppercase tracking-widest bg-slate-50 border-r border-[#E2DDD4] last:border-r-0 last:rounded-tr-lg">
                    {ROLE_LABELS[roleKey]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4]">
              {PERMISSION_SCHEMA.flatMap(categoryGroup => 
                categoryGroup.items.map(item => (
                  <tr key={`guide-${item.id}`} className="hover:bg-[#FAF8F4] transition-colors">
                    <td className="p-[12px_16px] border-r border-[#E2DDD4]">
                      <div className="text-[13px] font-[700] text-[#0f1923] mb-[2px]">{item.label}</div>
                      <div className="text-[10px] text-[#6b7280] leading-tight">{item.desc}</div>
                    </td>
                    {Object.keys(ROLE_LABELS).map(roleKey => {
                      const isGranted = savedMatrix[roleKey][item.id];
                      return (
                        <td key={`${roleKey}-${item.id}`} className="p-[12px_16px] text-center border-r border-[#E2DDD4] last:border-r-0">
                          {isGranted ? (
                            <Check className="w-5 h-5 text-[#059669] mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-[#CBD5E1] mx-auto opacity-50" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}