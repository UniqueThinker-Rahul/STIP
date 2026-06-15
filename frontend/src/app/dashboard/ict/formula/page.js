'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '../../../../lib/api'; 

// --- INLINED DATA CONFIGURATION ---
const CRIT_LABELS = {
  jobCompetence: "Job Competence",
  dependability: "Dependability",
  deliveredResults: "Delivered Results",
  adaptability: "Adaptability/Flexibility",
  safeWorking: "Safe Working Environment",
  behaviors: "Behaviors & Initiative"
};

const DEFAULT_FORMULA = {
  version: '1.0',
  effectiveFrom: new Date().toISOString(),
  method: 'simple', 
  cpPercent: 13.01,
  epCapPercent: 5.0,
  epCapAbsolute: 2,
  weights: {
    jobCompetence: 10,
    dependability: 10,
    deliveredResults: 30,
    adaptability: 10,
    safeWorking: 20,
    behaviors: 20
  },
  thresholds: {
    ep: 1.3,
    e: 1.0,
    ni: 0.7
  }
};

// --- INLINED UI COMPONENTS ---
const Card = ({ children, className = '' }) => (
  <div className={`bg-white border border-[#E2DDD4] rounded-[14px] shadow-sm overflow-hidden flex flex-col ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ icon, title, subtitle, badge }) => (
  <div className="flex justify-between items-start p-[16px_20px] border-b border-[#E2DDD4] bg-[#FAF8F4]">
    <div className="flex gap-[12px]">
      {icon}
      <div>
        <h3 className="text-[15px] font-[800] text-[#0D2B55] leading-tight">{title}</h3>
        {subtitle && <div className="text-[12px] text-[#6b7280] mt-[2px] leading-snug">{subtitle}</div>}
      </div>
    </div>
    {badge && <div>{badge}</div>}
  </div>
);

const CardBody = ({ children, className = '' }) => (
  <div className={`p-[16px_20px] flex-1 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'navy', disabled = false, className = '' }) => {
  const baseStyle = "rounded-[8px] font-[700] transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
  
  let variantStyle = "";
  if (variant === 'navy') variantStyle = "bg-[#0D2B55] hover:bg-[#1a3d6e] text-white border border-[#0D2B55]";
  if (variant === 'ghost') variantStyle = "bg-white hover:bg-[#FAF8F4] text-[#475569] border border-[#E2DDD4]";
  if (variant === 'green') variantStyle = "bg-[#059669] hover:bg-[#047857] text-white border border-[#059669]";
  
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variantStyle} ${className}`}>
      {children}
    </button>
  );
};


// --- MAIN COMPONENT ---
export default function FormulaView() {
  
  // 🚨 NEW: Custom Screen-Locking Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'alert', // 'alert' or 'confirm'
    title: '',
    message: '',
    onConfirm: null,
  });

  const closeDialog = () => setModalConfig({ ...modalConfig, isOpen: false });

  const showDialog = (type, title, message, onConfirm = closeDialog) => {
    setModalConfig({ isOpen: true, type, title, message, onConfirm });
  };
  
  // Real-time Database States
  const [formula, setFormula] = useState(DEFAULT_FORMULA);
  const [formulaHistory, setFormulaHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_FORMULA);
  const [reason, setReason] = useState('');
  
  const [previewScores, setPreviewScores] = useState({
    results: 1.0, behaviors: 1.0, safety: 1.0, competence: 1.0, dependability: 1.0, adaptability: 1.0
  });

  const [isHistModalOpen, setIsHistModalOpen] = useState(false);

  // Fetch Live Configuration from Database
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await api.get('/settings/formula').catch(() => ({ data: { data: null } }));
        if (res.data?.data) {
          setFormula(res.data.data.formula || DEFAULT_FORMULA);
          setFormulaHistory(res.data.data.history || []);
          setDraft(res.data.data.formula || DEFAULT_FORMULA);
        }
      } catch (error) {
        console.error("Failed to fetch formula config:", error);
        showDialog('alert', 'Connection Error', 'Failed to connect to the database to fetch formula settings. Using defaults.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const active = isEditing ? draft : formula;

  const beginEdit = () => {
    setDraft(JSON.parse(JSON.stringify(formula)));
    setIsEditing(true);
    setReason('');
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setReason('');
  };

  // Save to Database
  const saveFormula = async () => {
    if (!reason.trim()) {
      showDialog('alert', 'Validation Error', 'Please provide a clear reason for the formula change. This will be saved to the permanent audit log.');
      return;
    }
    const total = Object.values(draft.weights).reduce((s, v) => s + Number(v), 0);
    if (Math.abs(total - 100) > 0.01) {
      showDialog('alert', 'Validation Error', `Criterion weights must sum to exactly 100% (currently ${total.toFixed(2)}%).`);
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        formula: draft,
        reason: reason
      };
      
      const res = await api.patch('/settings/formula', payload);
      
      if (res.data?.success) {
        setFormula(res.data.data.formula);
        setFormulaHistory(res.data.data.history || []);
        setIsEditing(false);
        showDialog('success', 'Update Complete', 'The new appraisal formula has been successfully saved to the database and is now active system-wide.');
      }
    } catch (error) {
      console.error(error);
      showDialog('alert', 'Update Failed', error.response?.data?.message || 'A server error occurred while updating the formula.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset Database to Defaults
  const resetToDefault = async () => {
    showDialog('confirm', 'Reset to Defaults', 'Are you absolutely sure you want to reset the appraisal formula to factory defaults? This action will be logged in the system audit.', async () => {
      closeDialog();
      try {
        setIsSaving(true);
        const payload = {
          formula: DEFAULT_FORMULA,
          reason: 'Reset to factory defaults via ICT Control Panel'
        };
        
        const res = await api.patch('/settings/formula', payload);
        
        if (res.data?.success) {
          setFormula(res.data.data.formula);
          setFormulaHistory(res.data.data.history || []);
          setDraft(res.data.data.formula);
          setIsEditing(false);
          showDialog('success', 'Factory Reset Complete', 'The formula has been successfully reset to factory default values.');
        }
      } catch (error) {
        showDialog('alert', 'Reset Failed', error.response?.data?.message || 'Failed to reset formula configuration.');
      } finally {
        setIsSaving(false);
      }
    });
  };

  const handleFieldChange = (field, value) => {
    if (!isEditing) return;
    if (field.includes('.')) {
      const [p, c] = field.split('.');
      setDraft({ ...draft, [p]: { ...draft[p], [c]: value } });
    } else {
      setDraft({ ...draft, [field]: value });
    }
  };

  const weightTotal = Object.values(active.weights || {}).reduce((s, v) => s + Number(v), 0);
  const wtOk = Math.abs(weightTotal - 100) < 0.01;

  let iprf = 0;
  if (active.method === 'simple') {
    const vals = Object.values(previewScores);
    iprf = vals.reduce((s, v) => s + v, 0) / vals.length;
  } else {
    iprf = Object.entries(active.weights || {}).reduce((s, [k, w]) => s + (previewScores[k] || 0) * (Number(w) / 100), 0);
  }

  const rating = iprf >= (active.thresholds?.ep || 1.3) ? 'EP' : iprf >= (active.thresholds?.e || 1.0) ? 'E' : iprf >= (active.thresholds?.ni || 0.7) ? 'NI' : 'LS';
  const ratingColor = rating === 'EP' ? '#1E40AF' : rating === 'E' ? '#059669' : rating === 'NI' ? '#D97706' : '#DC2626';

  const InputWrap = ({ value, suffix = '', onChange, type = 'number', step = '1', disabled = true }) => (
    <div className={`flex border-[1.5px] rounded-[7px] overflow-hidden ${disabled ? 'border-dashed border-[#E2DDD4] bg-[#FAF8F4]' : 'border-solid border-[#E2DDD4] bg-white'} min-w-0`}>
      <input type={type} step={step} value={value} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} disabled={disabled} className={`flex-1 p-[8px_10px] border-none text-[13px] font-sans bg-transparent outline-none ${disabled ? 'text-[#6b7280] font-semibold' : 'text-[#0D2B55] font-semibold'}`} />
      {suffix && <span className="p-[8px_10px] text-[11px] text-[#6b7280] bg-[#F3F4F6]">{suffix}</span>}
    </div>
  );

  if (loading) {
    return (
      <div className="w-full h-[400px] flex flex-col items-center justify-center p-10 text-[#6b7280] font-semibold">
        <Loader2 className="w-8 h-8 animate-spin text-[#0D2B55] mb-4" />
        Loading Formula Engine from Database...
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-[60px] font-sans relative p-[20px] lg:p-[24px_28px_80px] animate-in fade-in duration-300">

      <div className="flex flex-col md:flex-row md:items-start justify-between mb-[22px] gap-4">
        <div>
          <div className="text-[22px] font-extrabold text-[#0D2B55]">🧮 Formula Configuration</div>
          <div className="text-[13px] text-[#6b7280] mt-[3px]">Adjust the STIP calculation parameters. Changes apply immediately to all panels.</div>
        </div>
        <div className="flex gap-[8px] flex-wrap w-full md:w-auto">
          <Button variant="ghost" className="flex-1 md:flex-none px-[12px] py-[8px] text-[12px]" onClick={() => setIsHistModalOpen(true)}>📜 Change History <span className="bg-[#E2DDD4] px-[7px] py-[1px] rounded-full ml-1 text-[10px] text-[#0D2B55]">{formulaHistory.length}</span></Button>
          <Button disabled={isSaving} variant="ghost" className="flex-1 md:flex-none px-[12px] py-[8px] text-[12px] text-[#D97706] !border-[#FDE68A] disabled:opacity-50" onClick={resetToDefault}>↺ Reset Defaults</Button>
          {!isEditing && <Button variant="navy" className="flex-1 md:flex-none px-[12px] py-[8px] text-[12px]" onClick={beginEdit}>✎ Edit Formula</Button>}
          {isEditing && (
            <>
              <Button disabled={isSaving} variant="ghost" className="flex-1 md:flex-none px-[12px] py-[8px] text-[12px]" onClick={cancelEdit}>✕ Cancel</Button>
              <Button disabled={isSaving} variant="green" className="flex-1 md:flex-none px-[12px] py-[8px] text-[12px]" onClick={saveFormula}>
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '✓'} Save & Apply
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center gap-[8px] flex-wrap bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px] p-[12px_16px] mb-[18px] text-[12px] text-[#1E40AF] shadow-sm">
        <span><strong>Currently effective:</strong> Version {active.version || '1.0'} since {new Date(active.effectiveFrom || Date.now()).toLocaleDateString('en-GB')} · Method: <strong>{active.method === 'weighted' ? 'Weighted Average' : 'Simple Average'}</strong></span>
        {isEditing && <span className="bg-[#FFFBEB] text-[#D97706] px-[9px] py-[3px] rounded-full font-bold text-[11px] border border-[#FDE68A]">⚠ EDITING — changes not yet applied</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
        {/* Method */}
        <Card>
          <CardHeader icon={<div className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] shrink-0 bg-[#EFF6FF]">📐</div>} title="IPRF Calculation Method" subtitle="How to combine the 6 criterion scores" />
          <CardBody>
            <div className="flex gap-[10px] flex-wrap">
              <div 
                className={`flex-1 min-w-[200px] p-[14px] rounded-[10px] transition-colors ${active.method === 'weighted' ? 'border-2 border-[#059669] bg-[#ECFDF5] shadow-sm' : 'border-[1.5px] border-[#E2DDD4] bg-white opacity-55'} ${isEditing ? 'cursor-pointer hover:border-[#059669]/50' : 'cursor-default'}`}
                onClick={() => isEditing && setDraft({ ...draft, method: 'weighted' })}
              >
                <div className="flex items-center gap-[8px] mb-[6px]">
                  <span className={`inline-block w-[18px] h-[18px] rounded-full ${active.method === 'weighted' ? 'border-[5px] border-[#059669]' : 'border-2 border-[#9CA3AF]'}`} />
                  <div className="text-[13px] font-bold text-[#0D2B55]">Weighted Average</div>
                </div>
                <div className="text-[11px] text-[#1E40AF] font-mono mb-[6px] font-semibold">IPRF = Σ (score × weight)</div>
                <div className="text-[11px] text-[#6b7280] leading-[1.5] break-words">Each criterion has its own weight (must sum to 100%).</div>
              </div>
              <div 
                className={`flex-1 min-w-[200px] p-[14px] rounded-[10px] transition-colors ${active.method === 'simple' ? 'border-2 border-[#059669] bg-[#ECFDF5] shadow-sm' : 'border-[1.5px] border-[#E2DDD4] bg-white opacity-55'} ${isEditing ? 'cursor-pointer hover:border-[#059669]/50' : 'cursor-default'}`}
                onClick={() => isEditing && setDraft({ ...draft, method: 'simple' })}
              >
                <div className="flex items-center gap-[8px] mb-[6px]">
                  <span className={`inline-block w-[18px] h-[18px] rounded-full ${active.method === 'simple' ? 'border-[5px] border-[#059669]' : 'border-2 border-[#9CA3AF]'}`} />
                  <div className="text-[13px] font-bold text-[#0D2B55]">Simple Average</div>
                </div>
                <div className="text-[11px] text-[#1E40AF] font-mono mb-[6px] font-semibold">IPRF = (Σ scores) / 6</div>
                <div className="text-[11px] text-[#6b7280] leading-[1.5] break-words">Per the FSM spreadsheet. Every criterion counts equally.</div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* CP% and EP */}
        <Card>
          <CardHeader icon={<div className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] shrink-0 bg-[#FFFBEB]">💰</div>} title="Corporate Performance & EP Cap" subtitle="Company-wide settings" />
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            <div>
              <label className="text-[11px] font-bold text-[#0D2B55] block mb-1">CP %</label>
              <InputWrap value={active.cpPercent} step="0.01" onChange={(v) => handleFieldChange('cpPercent', v)} disabled={!isEditing} suffix="%" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#0D2B55] block mb-1">EP Cap (% of staff)</label>
              <InputWrap value={active.epCapPercent} step="0.5" onChange={(v) => handleFieldChange('epCapPercent', v)} disabled={!isEditing} suffix="%" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#0D2B55] block mb-1">EP Cap (absolute max)</label>
              <InputWrap value={active.epCapAbsolute} onChange={(v) => handleFieldChange('epCapAbsolute', v)} disabled={!isEditing} suffix="employees" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#0D2B55] block mb-1">Effective from Date</label>
              <InputWrap value={active.effectiveFrom ? active.effectiveFrom.split('T')[0] : ''} type="date" onChange={(v) => handleFieldChange('effectiveFrom', v)} disabled={!isEditing} />
            </div>
          </CardBody>
        </Card>

        {/* Weights */}
        <Card className="lg:col-span-2">
          <CardHeader 
            icon={<div className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] shrink-0 bg-[#EFF6FF]">⚖</div>} 
            title="Criterion Weights" 
            subtitle="How much each of the 6 STIP criteria contributes to IPRF (must sum to 100%)" 
            badge={<div className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${wtOk ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]' : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'}`}>Total: {weightTotal.toFixed(2)}% {wtOk ? '✓' : '⚠'}</div>}
          />
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[16px] p-4 bg-[#FAF8F4] rounded-b-xl border-t border-[#E2DDD4]">
            {Object.entries(active.weights || {}).map(([k, v]) => (
              <div key={k} className={`p-3 rounded-lg border transition-colors ${isEditing ? 'bg-white border-[#BFDBFE]' : 'bg-transparent border-transparent'}`}>
                <div className="flex justify-between mb-2">
                  <span className="text-[12px] font-bold text-[#0D2B55]">{CRIT_LABELS[k] || k}</span>
                  <span className={`text-[13px] font-extrabold ${isEditing ? 'text-[#2563EB]' : 'text-[#1E40AF]'}`}>{Number(v).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="1" 
                  value={v} 
                  disabled={!isEditing}
                  onChange={e => handleFieldChange(`weights.${k}`, Number(e.target.value))} 
                  className={`w-full accent-[#2563EB] ${isEditing ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`} 
                />
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Thresholds */}
        <Card>
          <CardHeader icon={<div className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] shrink-0 bg-[#FFFBEB]">🎯</div>} title="Rating Thresholds" subtitle="IPRF score ranges that map to each rating tier" />
          <CardBody>
            <div className="flex items-center gap-[10px] py-[8px] border-b border-[#F3F4F6] text-[13px] flex-wrap">
              <span className="inline-block w-[11px] h-[11px] rounded-full bg-[#1E40AF]"></span>
              <span className="flex-1 font-semibold text-[#0D2B55] min-w-[150px]">EP — Exceeded</span>
              <span className="text-[12px] text-[#6b7280] font-mono whitespace-nowrap">IPRF ≥</span>
              <input type="number" step="0.01" value={active.thresholds?.ep || 1.3} disabled={!isEditing} onChange={e => handleFieldChange('thresholds.ep', Number(e.target.value))} className={`w-[78px] p-[6px_8px] text-right border-[1.5px] ${isEditing ? 'border-[#1E40AF] bg-white text-[#1E40AF]' : 'border-dashed border-[#E2DDD4] bg-[#FAF8F4] text-[#6b7280]'} rounded-[6px] text-[13px] font-mono font-bold outline-none transition-colors`} />
            </div>
            <div className="flex items-center gap-[10px] py-[8px] border-b border-[#F3F4F6] text-[13px] flex-wrap">
              <span className="inline-block w-[11px] h-[11px] rounded-full bg-[#059669]"></span>
              <span className="flex-1 font-semibold text-[#0D2B55] min-w-[150px]">E — Met</span>
              <span className="text-[12px] text-[#6b7280] font-mono whitespace-nowrap">IPRF ≥</span>
              <input type="number" step="0.01" value={active.thresholds?.e || 1.0} disabled={!isEditing} onChange={e => handleFieldChange('thresholds.e', Number(e.target.value))} className={`w-[78px] p-[6px_8px] text-right border-[1.5px] ${isEditing ? 'border-[#059669] bg-white text-[#059669]' : 'border-dashed border-[#E2DDD4] bg-[#FAF8F4] text-[#6b7280]'} rounded-[6px] text-[13px] font-mono font-bold outline-none transition-colors`} />
            </div>
            <div className="flex items-center gap-[10px] py-[8px] border-b border-[#F3F4F6] text-[13px] flex-wrap">
              <span className="inline-block w-[11px] h-[11px] rounded-full bg-[#D97706]"></span>
              <span className="flex-1 font-semibold text-[#0D2B55] min-w-[150px]">NI — Needs Improvement</span>
              <span className="text-[12px] text-[#6b7280] font-mono whitespace-nowrap">IPRF ≥</span>
              <input type="number" step="0.01" value={active.thresholds?.ni || 0.7} disabled={!isEditing} onChange={e => handleFieldChange('thresholds.ni', Number(e.target.value))} className={`w-[78px] p-[6px_8px] text-right border-[1.5px] ${isEditing ? 'border-[#D97706] bg-white text-[#D97706]' : 'border-dashed border-[#E2DDD4] bg-[#FAF8F4] text-[#6b7280]'} rounded-[6px] text-[13px] font-mono font-bold outline-none transition-colors`} />
            </div>
            <div className="flex items-center gap-[10px] py-[8px] text-[13px]">
              <span className="inline-block w-[11px] h-[11px] rounded-full bg-[#DC2626]"></span>
              <span className="flex-1 font-semibold text-[#0D2B55]">LS — Less than Sat.</span>
              <span className="text-[11px] text-[#6b7280] font-semibold">Falls below NI threshold</span>
            </div>
          </CardBody>
        </Card>

        {/* Live Preview */}
        <Card className="lg:col-span-2 !bg-[#FAF8F4]">
          <CardHeader icon={<div className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] shrink-0 bg-[#ECFDF5]">🔬</div>} title="Live Formula Preview" subtitle={<>Adjust criterion scores below to see how the <span className="font-bold">{isEditing ? 'DRAFT' : 'CURRENT'}</span> formula computes IPRF</>} />
          <CardBody className="flex flex-col sm:flex-row gap-[20px] items-start">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-[10px] flex-1">
              {Object.entries(CRIT_LABELS).map(([k, label]) => (
                <div key={k} className="min-w-0">
                  <label className="text-[11px] font-bold text-[#0D2B55] block mb-1">{label}</label>
                  <select 
                    className="w-full p-[7px_9px] border-[1.5px] border-[#E2DDD4] rounded-[7px] text-[13px] font-sans outline-none bg-white min-w-0 focus:border-[#2563EB] shadow-sm"
                    value={previewScores[k]}
                    onChange={e => setPreviewScores({ ...previewScores, [k]: Number(e.target.value) })}
                  >
                    <option value="0.0">0.0 — LS</option>
                    <option value="0.7">0.7 — NI</option>
                    <option value="1.0">1.0 — E</option>
                    <option value="1.3">1.3 — EP</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="text-center bg-white rounded-[12px] p-[18px] border-[2px] shadow-sm w-full sm:w-auto" style={{ borderColor: ratingColor }}>
              <div className="text-[10px] font-bold text-[#6b7280] uppercase tracking-[0.05em]">Computed IPRF</div>
              <div className="text-[36px] font-extrabold mt-[6px] leading-none" style={{ color: ratingColor }}>{iprf.toFixed(3)}</div>
              <div className="text-[14px] font-bold mt-[8px]" style={{ color: ratingColor }}>{rating}</div>
              <div className="text-[10px] text-[#6b7280] mt-[8px] font-mono">Method: {active.method === 'simple' ? 'Σ ÷ 6' : 'Σ (s × w)'}</div>
            </div>
          </CardBody>
        </Card>

        {isEditing && (
          <Card className="lg:col-span-2 !bg-[#FFFBEB] !border-[#FDE68A] animate-in slide-in-from-bottom-2">
            <CardBody>
              <label className="text-[12px] font-bold text-[#D97706] block mb-[6px]">⚠ Reason for change *</label>
              <textarea 
                className="w-full p-[10px_12px] border-[1.5px] border-[#FDE68A] rounded-lg text-[13px] font-sans bg-white outline-none focus:ring-2 focus:ring-[#FDE68A] resize-y min-h-[80px]"
                placeholder="e.g. Quarterly CP% adjustment per Board resolution dated DD/MM/YYYY..."
                value={reason} onChange={e => setReason(e.target.value)}
              />
              <div className="text-[10px] text-[#D97706] mt-[6px] font-medium">This reason will be saved to the database audit trail and change history. Provide a clear justification for stakeholders.</div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* History Modal */}
      {isHistModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-[20px] animate-in fade-in duration-200" onClick={() => setIsHistModalOpen(false)}>
          <div className="bg-white rounded-[14px] max-w-[600px] w-full max-h-[85vh] overflow-auto shadow-2xl flex flex-col slide-in-from-bottom-4" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#0D2B55] p-[15px_20px] flex justify-between items-center rounded-t-[14px] z-10 shadow-sm">
              <div className="text-[14px] font-bold text-white flex items-center gap-2">📜 Database Configuration History</div>
              <button className="bg-white/10 hover:bg-white/20 border-none text-white w-[28px] h-[28px] rounded-[6px] cursor-pointer flex items-center justify-center transition-colors" onClick={() => setIsHistModalOpen(false)}>✕</button>
            </div>
            <div className="p-[20px] bg-[#FAF8F4] flex-1">
              {formulaHistory.length === 0 ? (
                <div className="p-[30px] text-center text-[#6b7280] text-[13px] bg-white rounded-xl border border-[#E2DDD4]">No changes recorded in the database yet. The formula has not been edited since deployment.</div>
              ) : (
                formulaHistory.map(h => (
                  <div key={h.id || Math.random()} className="border border-[#E2DDD4] rounded-xl p-[14px_16px] mb-[12px] bg-white shadow-sm hover:border-[#BFDBFE] transition-colors">
                    <div className="flex justify-between items-start gap-2 mb-[8px] pb-[8px] border-b border-slate-100">
                      <span className="text-[12px] font-bold text-[#0D2B55]">{new Date(h.effectiveFrom).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[10px] font-bold px-[8px] py-[2px] rounded-full bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">Authorized by {h.changedBy || 'System Admin'}</span>
                    </div>
                    <div className="text-[13px] text-[#374151] mb-[12px] font-medium">"{h.reason}"</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-[#6b7280] bg-[#FAF8F4] p-2.5 rounded-lg border border-[#E2DDD4]">
                      <div><strong className="text-[#0D2B55] uppercase tracking-wider text-[9px]">From:</strong><br/>{h.previous?.method === 'weighted' ? 'Weighted' : 'Simple'}, CP: {h.previous?.cpPercent}%, EP Cap: {h.previous?.epCapPercent}%</div>
                      <div><strong className="text-[#059669] uppercase tracking-wider text-[9px]">To:</strong><br/>{h.next?.method === 'weighted' ? 'Weighted' : 'Simple'}, CP: {h.next?.cpPercent}%, EP Cap: {h.next?.epCapPercent}%</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🚨 Universal Custom Modal for System Alerts and Confirmations */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-[24px]">
              <div className="flex items-center gap-[10px] mb-[12px]">
                {modalConfig.title.includes('Error') || modalConfig.title.includes('Failed') ? (
                  <AlertTriangle className="w-[20px] h-[20px] text-red-600" />
                ) : (
                  <ShieldCheck className="w-[20px] h-[20px] text-green-600" />
                )}
                <h3 className="text-[18px] font-[800] text-slate-800">{modalConfig.title}</h3>
              </div>
              
              <p className="text-[14px] text-slate-600 mb-[24px] whitespace-pre-wrap leading-relaxed">
                {modalConfig.message}
              </p>

              <div className="flex justify-end gap-[12px]">
                {modalConfig.type === 'confirm' && (
                  <button 
                    type="button"
                    onClick={closeDialog}
                    className="px-[16px] py-[10px] text-slate-600 font-[700] text-[13px] hover:bg-slate-100 rounded-[8px] transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => modalConfig.onConfirm()}
                  className={`px-[20px] py-[10px] text-white font-[800] text-[13px] rounded-[8px] shadow-sm transition-colors ${
                    modalConfig.title.includes('Error') || modalConfig.title.includes('Failed')
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-[#0D2B55] hover:bg-[#1a3d6e]'
                  }`}
                >
                  {modalConfig.type === 'confirm' ? 'Confirm' : 'Acknowledge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}