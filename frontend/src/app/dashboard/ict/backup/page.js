'use client';

import React, { useState, useEffect } from 'react';
import { 
  Database, Download, ShieldAlert, Loader2, AlertTriangle, 
  ShieldCheck, FileJson, Table2, HardDrive, CheckCircle2, 
  Users, FileText, Settings, Bell, Activity, UploadCloud, Terminal, Save, Bookmark, Trash2
} from 'lucide-react';
import api from '../../../../lib/api';

export default function BackupControlPanel() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [liveStats, setLiveStats] = useState({
    USERS: '...', APPRAISALS: '...', AUDIT_LOGS: '...', SYSTEM_CONFIG: 'Active', NOTIFICATIONS: 'Secured', currentDbName: 'test'
  });
  
  const [cliLogs, setCliLogs] = useState([]);
  
  // Connection Manager State
  const [savedConnections, setSavedConnections] = useState([]);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState('');
  
  // Delete Manager State
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, target: null, inputName: '' });

  const [config, setConfig] = useState({
    actionType: 'DOWNLOAD', 
    fullDbClone: false, 
    mongoUri: '',
    targetDbName: '',
    format: 'ALL', 
    environment: 'PRODUCTION', 
    reason: '',
    collections: {
      USERS: true,
      APPRAISALS: true,
      AUDIT_LOGS: true,
      SYSTEM_CONFIG: true,
      NOTIFICATIONS: false 
    }
  });

  const [backupFile, setBackupFile] = useState(null);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  useEffect(() => {
    const initPanel = async () => {
      try {
        const [usersRes, appsRes, auditRes, cfgRes] = await Promise.all([
          api.get('/users').catch(() => null),
          api.get('/appraisals').catch(() => null),
          api.get('/audit?limit=1').catch(() => null),
          api.get('/backup/config').catch(() => null)
        ]);

        const activeOriginalDbName = cfgRes?.data?.currentDbName || 'test';

        setLiveStats({
          USERS: usersRes?.data?.data?.length ?? 'Protected',
          APPRAISALS: appsRes?.data?.count ?? appsRes?.data?.data?.length ?? 'Protected',
          AUDIT_LOGS: auditRes?.data?.pagination?.total ?? 'Protected',
          SYSTEM_CONFIG: 'Active Modules',
          NOTIFICATIONS: 'Encrypted',
          currentDbName: activeOriginalDbName
        });

        if (cfgRes?.data) {
          const { savedConnections } = cfgRes.data.data || {};
          setSavedConnections(savedConnections || []);
          setConfig(prev => ({ ...prev, targetDbName: activeOriginalDbName }));
        }
      } catch (error) {
        console.error("Failed to initialize backup panel settings", error);
      }
    };
    initPanel();
  }, []);

  const closeDialog = () => {
    setModalConfig({ isOpen: false, title: '', message: '', type: 'alert' });
    if (!isGenerating) setCliLogs([]);
  };
  
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

  const handleSaveConnection = async () => {
    if (!newConnectionName.trim()) {
      return showDialog('error', 'Missing Information', 'Please provide a custom name for this connection template.');
    }
    if (!config.mongoUri.trim()) {
      return showDialog('error', 'Missing Information', 'Cannot save an empty MongoURI.');
    }

    const newConn = {
      id: Date.now().toString(),
      name: newConnectionName.trim(),
      uri: config.mongoUri.trim(),
      dbName: config.targetDbName.trim() || 'test'
    };

    const updatedConnections = [...savedConnections, newConn];

    try {
      setIsSavingConfig(true);
      await api.post('/backup/config', { savedConnections: updatedConnections });
      setSavedConnections(updatedConnections);
      setShowSavePrompt(false);
      setNewConnectionName('');
      showDialog('success', 'Connection Saved', `Template "${newConn.name}" has been permanently added to your saved connections.`);
    } catch (error) {
      showDialog('error', 'Save Failed', 'Unable to save connection settings to cluster configuration.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleDeleteConnection = async () => {
    const targetId = deleteModal.target.id;
    const updatedConnections = savedConnections.filter(c => c.id !== targetId);
    
    try {
      await api.post('/backup/config', { savedConnections: updatedConnections });
      setSavedConnections(updatedConnections);
      
      // If the currently selected connection was deleted, clear the inputs
      if (config.mongoUri === deleteModal.target.uri) {
        setConfig(prev => ({ ...prev, mongoUri: '', targetDbName: liveStats.currentDbName || 'test' }));
      }
      
      setDeleteModal({ isOpen: false, target: null, inputName: '' });
      showDialog('success', 'Connection Removed', `The saved template "${deleteModal.target.name}" has been successfully deleted.`);
    } catch (error) {
      showDialog('error', 'Deletion Failed', 'Unable to remove the connection from cluster configuration.');
    }
  };

  const executeSystemBackup = async () => {
    const selectedCollections = config.fullDbClone 
      ? ['ALL'] 
      : Object.keys(config.collections).filter(k => config.collections[k]);
    
    if (selectedCollections.length === 0 && config.actionType !== 'RESTORE') {
      return showDialog('error', 'Configuration Error', 'You must select at least one database collection to extract.');
    }
    if (!config.reason.trim()) {
      return showDialog('error', 'Audit Compliance Check', 'A retention reason or ticket number is strictly required to record this extraction in the permanent audit ledger.');
    }

    let logInterval;
    try {
      setIsGenerating(true);
      setCliLogs([`> Initializing ${config.actionType} sequence...`]);

      const logMessages = config.actionType === 'DOWNLOAD' ? [
          '> Connecting to native MongoDB driver...',
          '> Extracting local collection documents...',
          '> Structuring JSON/CSV payloads...',
          '> Compressing into encrypted ZIP archive...',
          '> Generating Extraction Manifest...',
          '> Finalizing download stream...'
      ] : config.actionType === 'PUSH' ? [
          '> Validating destination Mongo URI...',
          `> Targeting Database Name: "${config.targetDbName || 'Default'}"...`,
          '> Extracting local DB collections in memory...',
          '> Connecting to target database cluster...',
          '> Bypassing index collisions (ordered:false)...',
          '> Executing bulk upserts...',
          '> Verifying data integrity...'
      ] : [
          '> Parsing uploaded ZIP buffer into memory...',
          '> Validating destination Mongo URI...',
          `> Targeting Database Name: "${config.targetDbName || 'Default'}"...`,
          '> Reviving BSON ObjectIDs and ISO Dates...',
          '> Pushing mapped collections to destination...'
      ];

      let logIdx = 0;
      logInterval = setInterval(() => {
          if (logIdx < logMessages.length) {
              setCliLogs(prev => [...prev, logMessages[logIdx]]);
              logIdx++;
          }
      }, 700);

      // --- EXTERNAL DB PUSH LOGIC ---
      if (config.actionType === 'PUSH') {
        if (!config.mongoUri.trim()) {
          clearInterval(logInterval);
          setIsGenerating(false);
          return showDialog('error', 'Configuration Error', 'A valid Destination Mongo URI is required to push data externally.');
        }

        await api.post('/backup/push', {
          mongoUri: config.mongoUri,
          targetDbName: config.targetDbName,
          environment: config.environment,
          reason: config.reason,
          collections: selectedCollections
        });
        
        clearInterval(logInterval);
        setCliLogs(prev => [...prev, `> ✅ SYSTEM OK: Data pushed to database "${config.targetDbName || 'Default'}".`]);
        
        showDialog(
          'success',
          'Database Push Complete', 
          `All selected collections have been successfully migrated into database "${config.targetDbName || 'Default'}".`
        );
        setConfig(prev => ({ ...prev, reason: '' }));
        setIsGenerating(false);
        return;
      }

      // --- UPLOAD & RESTORE LOGIC ---
      if (config.actionType === 'RESTORE') {
        if (!config.mongoUri.trim() || !backupFile) {
          clearInterval(logInterval);
          setIsGenerating(false);
          return showDialog('error', 'Configuration Error', 'A valid Destination Mongo URI and a Backup ZIP file are strictly required for restoration.');
        }

        const formData = new FormData();
        formData.append('backupFile', backupFile);
        formData.append('mongoUri', config.mongoUri);
        formData.append('targetDbName', config.targetDbName);
        formData.append('environment', config.environment);
        formData.append('reason', config.reason);

        await api.post('/backup/restore', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        clearInterval(logInterval);
        setCliLogs(prev => [...prev, `> ✅ SYSTEM OK: Restored to database "${config.targetDbName || 'Default'}".`]);
        
        showDialog('success', 'Database Restoration Complete', `The backup file has been successfully restored to database "${config.targetDbName || 'Default'}".`);
        setConfig(prev => ({ ...prev, reason: '' }));
        setBackupFile(null);
        setIsGenerating(false);
        return;
      }
      
      // --- LOCAL ZIP EXPORT LOGIC ---
      const queryParams = new URLSearchParams({
        format: config.fullDbClone ? 'JSON' : config.format,
        environment: config.environment,
        reason: config.reason,
        collections: selectedCollections.join(',')
      });

      const response = await api.get(`/backup/export?${queryParams.toString()}`, { responseType: 'blob' });
      
      const fileStamp = new Date().toISOString().split('T')[0];
      let colName = config.fullDbClone ? 'FULL_CLONE' : 'GLOBAL';
      if (selectedCollections.length === 1 && !config.fullDbClone) colName = selectedCollections[0];
      else if (selectedCollections.length < 5 && !config.fullDbClone) colName = 'CUSTOM_EXTRACT';
      
      let formatStr = (config.format === 'ALL' && !config.fullDbClone) ? 'JSON_CSV' : 'JSON';
      const downloadFileName = `STIP_${config.environment}_${colName}_${formatStr}_${fileStamp}.zip`;

      const blob = new Blob([response.data], { type: 'application/zip' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const outputLink = document.createElement('a');
      
      outputLink.href = downloadUrl;
      outputLink.setAttribute('download', downloadFileName);
      
      document.body.appendChild(outputLink);
      outputLink.click();
      document.body.removeChild(outputLink);
      
      clearInterval(logInterval);
      setCliLogs(prev => [...prev, '> ✅ SYSTEM OK: Archive generated and downloaded.']);

      showDialog(
        'success',
        'Data Extraction Complete', 
        `The requested database has been securely processed and downloaded as:\n\n${downloadFileName}\n\nThis action, along with your retention note, has been successfully recorded in the immutable Audit Ledger.`
      );
      
      setConfig(prev => ({ ...prev, reason: '' }));
      
    } catch (error) {
      console.error(error);
      if (logInterval) clearInterval(logInterval);
      setCliLogs(prev => [...prev, `> ❌ FATAL ERROR: ${error.response?.data?.message || error.message}`]);
      
      showDialog(
        'error',
        'Operation Failure', 
        error.response?.data?.message || 'An error occurred inside the cluster while processing the request. Ensure your administration token clearance remains active and the database is reachable.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Determine if the current URI matches a saved preset to trigger safety warnings
  const activePreset = savedConnections.find(c => c.uri === config.mongoUri);
  const showDbWarning = activePreset && activePreset.dbName !== config.targetDbName;

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
        <div className={`bg-white border border-[#E2DDD4] rounded-[12px] shadow-sm overflow-hidden transition-all ${config.actionType === 'RESTORE' ? 'opacity-50 pointer-events-none hidden md:block' : ''}`}>
          <div className="bg-[#FAF8F4] p-[16px_20px] border-b border-[#E2DDD4] flex justify-between items-center">
            <h2 className="text-[15px] font-[800] text-[#0D2B55] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0D2B55] text-white flex items-center justify-center text-[12px]">1</span>
              Select Target Collections
            </h2>
            <div className="flex gap-2">
              <button disabled={config.fullDbClone} onClick={() => selectAll(true)} className="text-[11px] font-bold text-[#0D2B55] bg-white border border-[#E2DDD4] px-3 py-1 rounded hover:bg-slate-50 transition-colors disabled:opacity-50">Select All</button>
              <button disabled={config.fullDbClone} onClick={() => selectAll(false)} className="text-[11px] font-bold text-gray-500 bg-white border border-[#E2DDD4] px-3 py-1 rounded hover:bg-slate-50 transition-colors disabled:opacity-50">Clear</button>
            </div>
          </div>
          
          <div className="p-[20px]">
            <label className={`relative flex items-center justify-between p-4 mb-5 rounded-xl border-2 cursor-pointer transition-all ${config.fullDbClone ? 'bg-[#EFF6FF] border-[#3B82F6] shadow-sm' : 'bg-white border-[#E2DDD4] hover:border-gray-300'}`}>
              <div>
                <div className={`text-[15px] font-[900] mb-1 ${config.fullDbClone ? 'text-[#1E3A8A]' : 'text-gray-800'}`}>Download Entire DB Backup (Original Format)</div>
                <div className="text-[12px] text-gray-500 font-medium">Extracts a full, native JSON clone of the database designed specifically to be pushed/restored to another Mongo account.</div>
              </div>
              <input 
                type="checkbox" 
                checked={config.fullDbClone} 
                onChange={(e) => setConfig({...config, fullDbClone: e.target.checked, format: e.target.checked ? 'JSON' : config.format})}
                className="w-5 h-5 border-gray-300 rounded text-[#3B82F6] focus:ring-0 cursor-pointer"
              />
            </label>

            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 transition-opacity ${config.fullDbClone ? 'opacity-40 pointer-events-none' : ''}`}>
              {collectionCards.map(item => {
                const Icon = item.icon;
                const isSelected = config.collections[item.id] || config.fullDbClone;
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
        </div>

        {/* STEP 2: Format & Environment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white border border-[#E2DDD4] rounded-[12px] shadow-sm overflow-hidden flex flex-col">
            <div className="bg-[#FAF8F4] p-[16px_20px] border-b border-[#E2DDD4]">
              <h2 className="text-[15px] font-[800] text-[#0D2B55] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0D2B55] text-white flex items-center justify-center text-[12px]">2</span>
                Extraction Configuration
              </h2>
            </div>
            <div className="p-[20px] flex-1 flex flex-col justify-between">
              
              <div className="mb-6">
                <label className="block text-[11px] font-[800] text-gray-500 mb-2 uppercase tracking-widest">Operation Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setConfig({...config, actionType: 'DOWNLOAD'})} className={`py-3 flex flex-col items-center justify-center gap-1 rounded-lg border-2 font-bold text-[12px] transition-all ${config.actionType === 'DOWNLOAD' ? 'border-[#0D2B55] bg-[#EFF6FF] text-[#0D2B55]' : 'border-[#E2DDD4] text-gray-500 hover:bg-slate-50'}`}>
                    <Download className="w-4 h-4" /> Local Archive
                  </button>
                  <button onClick={() => setConfig({...config, actionType: 'PUSH'})} className={`py-3 flex flex-col items-center justify-center gap-1 rounded-lg border-2 font-bold text-[12px] transition-all ${config.actionType === 'PUSH' ? 'border-[#0D2B55] bg-[#EFF6FF] text-[#0D2B55]' : 'border-[#E2DDD4] text-gray-500 hover:bg-slate-50'}`}>
                    <Database className="w-4 h-4" /> DB Push
                  </button>
                  <button onClick={() => setConfig({...config, actionType: 'RESTORE'})} className={`py-3 flex flex-col items-center justify-center gap-1 rounded-lg border-2 font-bold text-[12px] transition-all ${config.actionType === 'RESTORE' ? 'border-[#0D2B55] bg-[#EFF6FF] text-[#0D2B55]' : 'border-[#E2DDD4] text-gray-500 hover:bg-slate-50'}`}>
                    <UploadCloud className="w-4 h-4" /> File Restore
                  </button>
                </div>
              </div>

              {config.actionType === 'DOWNLOAD' ? (
                <div className={`mb-6 transition-opacity ${config.fullDbClone ? 'opacity-50 pointer-events-none' : ''}`}>
                  <label className="block text-[11px] font-[800] text-gray-500 mb-2 uppercase tracking-widest">File Format</label>
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
              ) : (
                <div className="space-y-4 mb-6 animate-in slide-in-from-top-2">
                  
                  {config.actionType === 'RESTORE' && (
                    <div>
                      <label className="block text-[11px] font-[800] text-gray-500 mb-2 uppercase tracking-widest">Select Backup File (.zip)</label>
                      <input 
                        type="file" 
                        accept=".zip"
                        onChange={(e) => setBackupFile(e.target.files[0])}
                        className="w-full bg-slate-50 border border-[#E2DDD4] text-[#0f1923] text-[13px] font-medium rounded-lg focus:ring-[#0D2B55] block p-2 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[12px] file:font-bold file:bg-[#0D2B55] file:text-white hover:file:bg-[#1a3d6e] cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Saved Connections Dropdown + Delete Option */}
                  {savedConnections.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-[800] text-gray-500 mb-2 uppercase tracking-widest">Load Saved Connection</label>
                      <div className="flex gap-2">
                        <select 
                          className="flex-1 bg-[#EFF6FF] border border-[#3B82F6]/30 text-[#1E3A8A] text-[13px] font-bold rounded-lg focus:ring-[#0D2B55] focus:border-[#0D2B55] block p-3 outline-none cursor-pointer"
                          value={activePreset ? activePreset.id : ''}
                          onChange={(e) => {
                            const conn = savedConnections.find(c => c.id === e.target.value);
                            if (conn) setConfig(prev => ({ ...prev, mongoUri: conn.uri, targetDbName: conn.dbName }));
                            else setConfig(prev => ({ ...prev, mongoUri: '', targetDbName: liveStats.currentDbName || 'test' }));
                          }}
                        >
                          <option value="">-- Select a saved connection template --</option>
                          {savedConnections.map(c => (
                            <option key={c.id} value={c.id}>{c.name} (DB: {c.dbName})</option>
                          ))}
                        </select>
                        
                        {activePreset && (
                          <button 
                            type="button"
                            onClick={() => setDeleteModal({ isOpen: true, target: activePreset, inputName: '' })}
                            className="px-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[13px] font-bold hover:bg-red-100 transition-colors flex items-center justify-center shadow-sm"
                            title="Delete this template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MongoURI Input & Save Prompt */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[11px] font-[800] text-gray-500 uppercase tracking-widest">Target MongoDB URI</label>
                      <button 
                        type="button"
                        onClick={() => setShowSavePrompt(!showSavePrompt)} 
                        className="text-[11px] font-bold text-[#0D2B55] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Bookmark className="w-3 h-3" /> Save this Connection
                      </button>
                    </div>
                    
                    {showSavePrompt && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-md flex gap-2 animate-in fade-in zoom-in-95 duration-200 shadow-inner">
                        <input 
                          type="text" 
                          placeholder="Name (e.g. London Archive Server)" 
                          value={newConnectionName} 
                          onChange={e => setNewConnectionName(e.target.value)} 
                          className="flex-1 text-[12px] p-2 border border-blue-200 rounded outline-none" 
                        />
                        <button 
                          type="button" 
                          onClick={handleSaveConnection} 
                          disabled={isSavingConfig} 
                          className="bg-[#0D2B55] text-white px-3 py-1 rounded text-[12px] font-bold disabled:opacity-50"
                        >
                          {isSavingConfig ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    )}

                    <input 
                      type="password"
                      placeholder="mongodb+srv://admin:password@cluster..."
                      value={config.mongoUri}
                      onChange={(e) => setConfig({...config, mongoUri: e.target.value})}
                      className="w-full bg-slate-50 border border-[#E2DDD4] text-[#0f1923] text-[13px] font-medium rounded-lg focus:ring-[#0D2B55] focus:border-[#0D2B55] block p-3 outline-none"
                    />
                  </div>

                  {/* Target Database Name Input & Smart Warning */}
                  <div>
                    <label className="block text-[11px] font-[800] text-gray-500 mb-2 uppercase tracking-widest">Target Database Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. test, stip_prod, stip_backup"
                      value={config.targetDbName}
                      onChange={(e) => setConfig({...config, targetDbName: e.target.value})}
                      className={`w-full bg-slate-50 border ${showDbWarning ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500' : 'border-[#E2DDD4] focus:border-[#0D2B55] focus:ring-[#0D2B55]'} text-[#0f1923] text-[13px] font-bold rounded-lg block p-3 outline-none`}
                    />
                    {showDbWarning ? (
                      <div className="text-[10.5px] text-amber-600 mt-2 font-bold flex items-center gap-1 animate-in fade-in">
                        <AlertTriangle className="w-3 h-3" /> Warning: You are manually overriding the database name of a saved connection template.
                      </div>
                    ) : (
                      <div className="text-[10.5px] text-gray-400 mt-1">Default is <code className="bg-slate-100 px-1 rounded text-slate-700">{config.targetDbName || liveStats.currentDbName}</code> if left unchanged.</div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-[800] text-gray-500 mb-2 uppercase tracking-widest">Environment Tag</label>
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
                    This operation manipulates unencrypted sensitive operational datasets. Execute only with proper authorization.
                  </div>
                </div>
              </div>

              {cliLogs.length > 0 && (
                <div className="bg-[#0f1923] border border-[#2a3641] rounded-[8px] p-[12px] mb-4 font-mono text-[11px] text-[#4ade80] h-[130px] overflow-y-auto flex flex-col gap-[4px] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2 mb-1 border-b border-[#2a3641] pb-1 text-[#8b949e]">
                    <Terminal className="w-3 h-3" />
                    <span>STIP_SECURE_SHELL_v2.0</span>
                  </div>
                  {cliLogs.map((log, i) => (
                    <div key={i} className="animate-in fade-in slide-in-from-bottom-1 duration-200 opacity-90">{log}</div>
                  ))}
                  {isGenerating && <div className="animate-pulse opacity-70">_</div>}
                </div>
              )}

              <button
                onClick={executeSystemBackup}
                disabled={isGenerating || (config.actionType !== 'RESTORE' && Object.values(config.collections).filter(Boolean).length === 0 && !config.fullDbClone)}
                className={`w-full text-white font-[800] text-[15px] px-[24px] py-[16px] rounded-[10px] transition-all flex justify-center items-center gap-3 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  config.actionType !== 'DOWNLOAD' ? 'bg-[#0D2B55] hover:bg-[#091f3f]' : 'bg-[#059669] hover:bg-[#047857]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {config.actionType === 'DOWNLOAD' ? 'Packaging Encrypted Archive...' : 'Executing Database Migration...'}
                  </>
                ) : (
                  <>
                    {config.actionType === 'DOWNLOAD' && <Download className="w-5 h-5" />}
                    {config.actionType === 'PUSH' && <Database className="w-5 h-5" />}
                    {config.actionType === 'RESTORE' && <UploadCloud className="w-5 h-5" />}
                    
                    {config.actionType === 'DOWNLOAD' && 'Extract & Download Database'}
                    {config.actionType === 'PUSH' && 'Push to External DB'}
                    {config.actionType === 'RESTORE' && 'Upload & Restore Backup'}
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* General Alert Dialog */}
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

      {/* Strict Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.target && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-red-100">
            <div className="bg-red-50 p-[24px] border-b border-red-100">
              <div className="flex items-center gap-[10px]">
                <AlertTriangle className="w-[24px] h-[24px] text-red-600" />
                <h3 className="text-[18px] font-[900] text-red-700">Delete Connection</h3>
              </div>
            </div>
            
            <div className="p-[24px]">
              <p className="text-[13px] text-slate-600 mb-[16px] leading-relaxed font-medium">
                You are about to permanently delete the saved connection template. To proceed, please enter <strong className="text-red-600 bg-red-50 px-1 rounded border border-red-100 select-all">"{deleteModal.target.name}"</strong> below.
              </p>

              <input 
                type="text"
                placeholder={`Type "${deleteModal.target.name}"`}
                value={deleteModal.inputName}
                onChange={(e) => setDeleteModal({...deleteModal, inputName: e.target.value})}
                className="w-full bg-slate-50 border border-[#E2DDD4] text-[#0f1923] text-[13px] font-bold rounded-lg focus:ring-red-500 focus:border-red-500 block p-3 outline-none mb-[24px] shadow-inner"
              />

              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setDeleteModal({ isOpen: false, target: null, inputName: '' })}
                  className="px-[16px] py-[10px] text-slate-600 font-[800] text-[13px] rounded-[8px] hover:bg-slate-100 transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleDeleteConnection}
                  disabled={deleteModal.inputName !== deleteModal.target.name}
                  className="px-[20px] py-[10px] text-white font-[800] text-[13px] rounded-[8px] shadow-sm transition-colors bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}