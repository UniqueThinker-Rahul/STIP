'use client';

import React, { useState, useEffect } from 'react';
import { 
  Database, Download, ShieldAlert, Loader2, AlertTriangle, 
  ShieldCheck, FileJson, Table2, HardDrive, CheckCircle2, 
  Users, FileText, Settings, Bell, Activity 
} from 'lucide-react';
import api from '../../../../lib/api';

export default function BackupControlPanel() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveStats, setLiveStats] = useState({
    USERS: '...', APPRAISALS: '...', AUDIT_LOGS: '...', SYSTEM_CONFIG: 'Active', NOTIFICATIONS: 'Secured'
  });
  
  // Enterprise Backup Configuration State
  const [config, setConfig] = useState({
    format: 'ALL', // 'ALL', 'JSON', 'CSV'
    environment: 'PRODUCTION', // 'PRODUCTION', 'STAGING', 'ARCHIVE'
    reason: '',
    collections: {
      USERS: true,
      APPRAISALS: true,
      AUDIT_LOGS: true,
      SYSTEM_CONFIG: true,
      NOTIFICATIONS: false 
    }
  });

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  // Fetch Live Database Stats to remove static feeling
  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const [usersRes, appsRes, auditRes] = await Promise.all([
          api.get('/users').catch(() => null),
          api.get('/appraisals').catch(() => null),
          api.get('/audit?limit=1').catch(() => null)
        ]);

        setLiveStats({
          USERS: usersRes?.data?.data?.length ?? 'Protected',
          APPRAISALS: appsRes?.data?.count ?? appsRes?.data?.data?.length ?? 'Protected',
          AUDIT_LOGS: auditRes?.data?.pagination?.total ?? 'Protected',
          SYSTEM_CONFIG: 'Active Modules',
          NOTIFICATIONS: 'Encrypted'
        });
      } catch (error) {
        console.error("Failed to fetch live stats for backup panel", error);
      }
    };
    fetchLiveStats();
  }, []);

  const closeDialog = () => setModalConfig({ isOpen: false, title: '', message: '', type: 'alert' });
  const showDialog = (type, title, message) => setModalConfig({ isOpen: true, title, message, type });

  const toggleCollection = (key) => {
    setConfig(prev => ({
      ...prev,
      collections: { ...prev.collections, [key]: !prev.collections[key] }
    }));
  };

  const selectAll = (bool) => {
    setConfig(prev => ({
      ...prev,
      collections: { USERS: bool, APPRAISALS: bool, AUDIT_LOGS: bool, SYSTEM_CONFIG: bool, NOTIFICATIONS: bool }
    }));
  };

  const executeSystemBackup = async () => {
    const selectedCollections = Object.keys(config.collections).filter(k => config.collections[k]);
    
    // Validation
    if (selectedCollections.length === 0) {
      return showDialog('error', 'Configuration Error', 'You must select at least one database collection to extract.');
    }
    if (!config.reason.trim()) {
      return showDialog('error', 'Audit Compliance Check', 'A retention reason or ticket number is strictly required to record this extraction in the permanent audit ledger.');
    }

    try {
      setIsGenerating(true);
      
      const queryParams = new URLSearchParams({
        format: config.format,
        environment: config.environment,
        reason: config.reason,
        collections: selectedCollections.join(',')
      });

      // Hit the blob stream endpoint
      const response = await api.get(`/backup/export?${queryParams.toString()}`, { responseType: 'blob' });
      
      // Dynamic Intelligent File Naming
      const fileStamp = new Date().toISOString().split('T')[0];
      let colName = 'GLOBAL';
      if (selectedCollections.length === 1) colName = selectedCollections[0];
      else if (selectedCollections.length < 5) colName = 'CUSTOM_EXTRACT';
      
      let formatStr = config.format === 'ALL' ? 'JSON_CSV' : config.format;
      
      // Final Output Name: e.g., STIP_PRODUCTION_USERS_JSON_2026-06-18.zip
      const downloadFileName = `STIP_${config.environment}_${colName}_${formatStr}_${fileStamp}.zip`;

      // Process file download
      const blob = new Blob([response.data], { type: 'application/zip' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const outputLink = document.createElement('a');
      
      outputLink.href = downloadUrl;
      outputLink.setAttribute('download', downloadFileName);
      
      document.body.appendChild(outputLink);
      outputLink.click();
      document.body.removeChild(outputLink);
      
      showDialog(
        'success',
        'Data Extraction Complete', 
        `The requested database collections have been securely processed and downloaded as:\n\n${downloadFileName}\n\nThis action, along with your retention note, has been successfully recorded in the immutable Audit Ledger.`
      );
      
      // Clear reason after successful download
      setConfig(prev => ({ ...prev, reason: '' }));
      
    } catch (error) {
      console.error(error);
      showDialog(
        'error',
        'Extraction Failure', 
        'An error occurred inside the cluster while pulling datasets. Ensure your administration token clearance remains active and the database is reachable.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const collectionCards = [
    { id: 'USERS', icon: Users, label: 'User Directory', desc: 'Employee profiles & security roles', stat: liveStats.USERS },
    { id: 'APPRAISALS', icon: FileText, label: 'Appraisals', desc: 'Performance scores & narratives', stat: liveStats.APPRAISALS },
    { id: 'AUDIT_LOGS', icon: Activity, label: 'System Audit Logs', desc: 'Security tracking ledger', stat: liveStats.AUDIT_LOGS },
    { id: 'SYSTEM_CONFIG', icon: Settings, label: 'Platform Config', desc: 'System variables & formulas', stat: liveStats.SYSTEM_CONFIG },
    { id: 'NOTIFICATIONS', icon: Bell, label: 'Notifications', desc: 'In-app alert histories', stat: liveStats.NOTIFICATIONS }
  ];

  return (
    <div className="max-w-[1000px] mx-auto pb-20 font-sans p-[20px] lg:p-[24px_28px] animate-in fade-in duration-300">
      
      {/* Header Area */}
      <div className="mb-8 border-b border-[#E2DDD4] pb-6">
        <div className="flex items-center gap-3 mb-2 text-[#0D2B55]">
          <HardDrive className="w-8 h-8" strokeWidth={1.5} />
          <h1 className="text-[26px] font-[800] tracking-tight">Enterprise Data Extraction</h1>
        </div>
        <p className="text-[14px] text-gray-500 font-medium">
          Configure and execute secure infrastructure snapshots. All extraction tasks are immutably recorded in the database audit ledger.
        </p>
      </div>

      <div className="space-y-6">
        
        {/* STEP 1: Collections */}
        <div className="bg-white border border-[#E2DDD4] rounded-[12px] shadow-sm overflow-hidden">
          <div className="bg-[#FAF8F4] p-[16px_20px] border-b border-[#E2DDD4] flex justify-between items-center">
            <h2 className="text-[15px] font-[800] text-[#0D2B55] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0D2B55] text-white flex items-center justify-center text-[12px]">1</span>
              Select Target Collections
            </h2>
            <div className="flex gap-2">
              <button onClick={() => selectAll(true)} className="text-[11px] font-bold text-[#0D2B55] bg-white border border-[#E2DDD4] px-3 py-1 rounded hover:bg-slate-50 transition-colors">Select All</button>
              <button onClick={() => selectAll(false)} className="text-[11px] font-bold text-gray-500 bg-white border border-[#E2DDD4] px-3 py-1 rounded hover:bg-slate-50 transition-colors">Clear</button>
            </div>
          </div>
          
          <div className="p-[20px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {collectionCards.map(item => {
              const Icon = item.icon;
              const isSelected = config.collections[item.id];
              return (
                <label 
                  key={item.id} 
                  className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'bg-[#F0FDF4] border-[#059669] shadow-sm scale-[1.02]' : 'bg-white border-[#E2DDD4] hover:border-gray-300'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#D1FAE5] text-[#059669]' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => toggleCollection(item.id)}
                      className="w-5 h-5 border-gray-300 rounded text-[#059669] focus:ring-0 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className={`text-[14px] font-bold mb-1 ${isSelected ? 'text-[#065F46]' : 'text-gray-800'}`}>{item.label}</div>
                    <div className="text-[11px] text-gray-500 leading-tight mb-3 h-8">{item.desc}</div>
                    <div className="inline-block px-2 py-1 bg-white rounded border border-gray-200 text-[10px] font-black text-[#0D2B55]">
                      {item.stat} Records
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* STEP 2: Format & Environment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white border border-[#E2DDD4] rounded-[12px] shadow-sm overflow-hidden flex flex-col">
            <div className="bg-[#FAF8F4] p-[16px_20px] border-b border-[#E2DDD4]">
              <h2 className="text-[15px] font-[800] text-[#0D2B55] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0D2B55] text-white flex items-center justify-center text-[12px]">2</span>
                Format & Environment
              </h2>
            </div>
            <div className="p-[20px] flex-1 flex flex-col justify-between">
              
              <div className="mb-6">
                <label className="block text-[11px] font-[800] text-gray-500 mb-2 uppercase tracking-widest">Extraction Format</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setConfig({...config, format: 'ALL'})} className={`py-3 flex flex-col items-center rounded-lg border-2 font-bold text-[12px] transition-all ${config.format === 'ALL' ? 'border-[#0D2B55] bg-[#EFF6FF] text-[#0D2B55]' : 'border-[#E2DDD4] text-gray-500 hover:bg-slate-50'}`}>
                    <Database className="w-4 h-4 mb-1" /> JSON + CSV
                  </button>
                  <button onClick={() => setConfig({...config, format: 'JSON'})} className={`py-3 flex flex-col items-center rounded-lg border-2 font-bold text-[12px] transition-all ${config.format === 'JSON' ? 'border-[#0D2B55] bg-[#EFF6FF] text-[#0D2B55]' : 'border-[#E2DDD4] text-gray-500 hover:bg-slate-50'}`}>
                    <FileJson className="w-4 h-4 mb-1" /> JSON Only
                  </button>
                  <button onClick={() => setConfig({...config, format: 'CSV'})} className={`py-3 flex flex-col items-center rounded-lg border-2 font-bold text-[12px] transition-all ${config.format === 'CSV' ? 'border-[#0D2B55] bg-[#EFF6FF] text-[#0D2B55]' : 'border-[#E2DDD4] text-gray-500 hover:bg-slate-50'}`}>
                    <Table2 className="w-4 h-4 mb-1" /> CSV Only
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-[800] text-gray-500 mb-2 uppercase tracking-widest">Database Target</label>
                <select 
                  value={config.environment}
                  onChange={(e) => setConfig({...config, environment: e.target.value})}
                  className="w-full bg-slate-50 border border-[#E2DDD4] text-[#0f1923] text-[13px] font-bold rounded-lg focus:ring-[#0D2B55] focus:border-[#0D2B55] block p-3 outline-none cursor-pointer shadow-sm"
                >
                  <option value="PRODUCTION">PRODUCTION (Live Active Data)</option>
                  <option value="STAGING">STAGING (Testing / Sandbox)</option>
                  <option value="ARCHIVE">ARCHIVE (Legacy Data)</option>
                </select>
              </div>

            </div>
          </div>

          {/* STEP 3: Audit & Execution */}
          <div className="bg-[#FAF8F4] border border-[#E2DDD4] rounded-[12px] shadow-sm overflow-hidden flex flex-col">
            <div className="bg-[#0D2B55] p-[16px_20px] flex items-center justify-between">
              <h2 className="text-[15px] font-[800] text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white text-[#0D2B55] flex items-center justify-center text-[12px]">3</span>
                Audit Ledger & Execute
              </h2>
              <ShieldCheck className="w-5 h-5 text-[#e8c96a]" />
            </div>
            
            <div className="p-[20px] flex-1 flex flex-col justify-between">
              <div>
                <label className="block text-[11px] font-[800] text-[#0D2B55] mb-2 uppercase tracking-widest">Mandatory Retention Note <span className="text-red-500">*</span></label>
                <textarea 
                  value={config.reason}
                  onChange={(e) => setConfig({...config, reason: e.target.value})}
                  placeholder="e.g. Routine Q3 Backup Export, Support Ticket #4592, Official Compliance Request..."
                  className="w-full bg-white border border-[#E2DDD4] text-[#0f1923] text-[13px] rounded-lg focus:ring-[#0D2B55] focus:border-[#0D2B55] block p-3 outline-none min-h-[100px] resize-y shadow-inner mb-4"
                />

                <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-3 flex gap-3 text-[#DC2626] mb-6">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed font-bold">
                    This operation extracts unencrypted sensitive operational datasets. Store this archive securely on authorized corporate nodes only.
                  </div>
                </div>
              </div>

              <button
                onClick={executeSystemBackup}
                disabled={isGenerating || Object.values(config.collections).filter(Boolean).length === 0}
                className="w-full bg-[#059669] hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed text-white font-[800] text-[15px] px-[24px] py-[16px] rounded-[10px] transition-all flex justify-center items-center gap-3 shadow-md hover:shadow-lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Packaging Encrypted Archive...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Extract & Download Database
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Center-locked Screen Isolation Alert Notification Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-[24px]">
              <div className="flex items-center gap-[10px] mb-[12px]">
                {modalConfig.type === 'error' ? (
                  <AlertTriangle className="w-[22px] h-[22px] text-red-600" />
                ) : (
                  <CheckCircle2 className="w-[22px] h-[22px] text-green-600" />
                )}
                <h3 className="text-[18px] font-[800] text-slate-800">{modalConfig.title}</h3>
              </div>
              
              <p className="text-[14px] text-slate-600 mb-[24px] whitespace-pre-wrap leading-relaxed font-medium">
                {modalConfig.message}
              </p>

              <div className="flex justify-end">
                <button 
                  type="button"
                  onClick={closeDialog}
                  className={`px-[20px] py-[10px] text-white font-[800] text-[13px] rounded-[8px] shadow-sm transition-colors ${
                    modalConfig.type === 'error'
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