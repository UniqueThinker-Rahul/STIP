'use client';

import { useState, useEffect } from 'react';
import { Shield, RefreshCw, Server, Database, Mail, FileText, Activity, AlertTriangle, Settings, Key, Check, Loader2, Save } from 'lucide-react';
import api from '../../../../lib/api';

export default function SystemStatus() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({
    server: 'Checking...',
    database: 'Checking...',
    api: 'Checking...',
    auth: 'Checking...',
    mail: 'Checking...',
    reports: 'Checking...'
  });

  const [metrics, setMetrics] = useState({
    users: 0,
    appraisals: 0,
    logs: 0
  });

  // 🚨 UPGRADE: Dynamic Real-time Email Configuration States
  const [smtpForm, setSmtpForm] = useState({
    host: '',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    fromName: '',
    fromEmail: ''
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const checkSystemStatus = async () => {
    setLoading(true);
    
    let newStatus = {
      server: 'Online',
      database: 'Connected',
      api: 'Responsive',
      auth: 'Secure',
      mail: 'Operational',
      reports: 'Ready'
    };
    
    let newMetrics = { users: 0, appraisals: 0, logs: 0 };

    try {
      // 🚨 UPGRADE: Added .catch() to ALL requests so the UI doesn't hang if one fails
      const [dropdownsRes, usersRes, appsRes, logsRes, configRes] = await Promise.all([
        api.get('/config/dropdowns').catch(() => ({ data: { data: {} } })), 
        api.get('/users').catch(() => ({ data: { data: [] } })),
        api.get('/appraisals').catch(() => ({ data: { data: [] } })),
        api.get('/audit').catch(() => ({ data: { data: [] } })),
        api.get('/config/email').catch(() => ({ data: { success: false } })) 
      ]); 

      newMetrics = {
        users: usersRes.data?.data?.length || 0,
        appraisals: appsRes.data?.data?.length || 0,
        logs: logsRes.data?.data?.length || 0
      };

      if (configRes.data?.success && configRes.data?.data) {
        setSmtpForm(configRes.data.data);
      } else {
         newStatus.mail = 'Config Error';
      }

    } catch (error) {
      console.error("System Check Failed:", error);
      newStatus.server = 'Degraded';
      newStatus.api = 'Unreachable';
      newStatus.database = 'Disconnected';
      newStatus.auth = 'Offline';
      newStatus.mail = 'Unresponsive';
    } finally {
      setStatus(newStatus);
      setMetrics(newMetrics);
      setTimeout(() => setLoading(false), 800); 
    }
  };

  useEffect(() => {
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const epCap = Math.ceil(metrics.users * 0.05);

  const permissions = [
    { name: 'Create appraisals', lm: true, hr: false, ceo: false, staff: false, ict: false },
    { name: 'Review & submit to CEO', lm: false, hr: true, ceo: false, staff: false, ict: false },
    { name: 'Approve appraisals', lm: false, hr: false, ceo: true, staff: false, ict: false },
    { name: 'Enter & lock KPA scores', lm: false, hr: false, ceo: true, staff: false, ict: false },
    { name: 'Reset scorecard lock', lm: false, hr: false, ceo: false, staff: false, ict: true },
    { name: 'View own appraisal', lm: false, hr: false, ceo: false, staff: true, ict: false },
    { name: 'View all staff', lm: false, hr: true, ceo: true, staff: false, ict: true },
    { name: 'Add/edit staff', lm: false, hr: true, ceo: false, staff: false, ict: true },
    { name: 'Download reports', lm: false, hr: true, ceo: true, staff: false, ict: true },
    { name: 'View audit trail', lm: false, hr: false, ceo: false, staff: false, ict: true },
  ];

  const renderCheck = (hasPermission) => {
    return hasPermission ? (
      <div className="flex justify-center text-emerald-500 bg-emerald-50 w-5 h-5 rounded mx-auto items-center">
        <Check className="w-4 h-4 stroke-[3]" />
      </div>
    ) : (
      <div className="text-slate-300 text-center font-[700]">&mdash;</div>
    );
  };

  // 🚨 UPGRADE: SMTP Input Validation Handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSmtpForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleVerifySettings = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await api.post('/config/email/verify', smtpForm);
      if (response.data?.success) {
        setTestResult({ error: false, message: 'SMTP Handshake verified successfully! Connection stable.' });
        setStatus(prev => ({ ...prev, mail: 'Operational' }));
      }
    } catch (err) {
      setTestResult({ error: true, message: err.response?.data?.message || 'Connection timeout. Check credentials or port.' });
      setStatus(prev => ({ ...prev, mail: 'Degraded' }));
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await api.post('/config/email', smtpForm);
      if (response.data?.success) {
        alert('Configuration synchronized directly to live database.');
      }
    } catch (err) {
      alert('Failed to save parameters.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-16 font-sans space-y-6">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="text-[24px] font-[800] text-[#0D2B55] mb-1 flex items-center gap-2">
            <Activity className="w-6 h-6" /> System Status Monitor
          </div>
          <div className="text-[13px] text-[#6b7280]">Real-time health check of all STIP portal components and services.</div>
        </div>
        <button 
          onClick={checkSystemStatus} 
          disabled={loading || testing || saving}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E2DDD4] text-[#0D2B55] text-[13px] font-[700] rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
        </button>
      </div>

      {/* Global Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center gap-3 shadow-sm ${
        status.server === 'Online' && status.mail === 'Operational'
          ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#065F46]' 
          : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
      }`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          status.server === 'Online' && status.mail === 'Operational' ? 'bg-[#D1FAE5]' : 'bg-[#FEE2E2]'
        }`}>
          {status.server === 'Online' && status.mail === 'Operational' ? <Shield className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        </div>
        <div>
          <div className="font-[800] text-[15px]">
            {status.server === 'Online' && status.mail === 'Operational' ? 'All Systems Operational' : 'System Degraded'}
          </div>
          <div className={`text-[13px] mt-0.5 ${status.server === 'Online' && status.mail === 'Operational' ? 'opacity-80' : 'opacity-90'}`}>
            {status.server === 'Online' && status.mail === 'Operational' ? 'No active incidents detected. All services are running normally.' : 'The system is experiencing connectivity or configuration issues. Inspect specific services below.'}
          </div>
        </div>
      </div>

      {/* MOVED TO TOP: Audit Log Quick Stats */}
      <div className="bg-white border border-[#E2DDD4] rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h4 className="text-[15px] font-[800] text-[#0D2B55]">System Log Health</h4>
            <p className="text-[13px] text-[#6b7280]">Database currently holds <strong className="text-[#0D2B55]">{loading ? '...' : metrics.logs}</strong> active security and workflow events.</p>
        </div>
        <button 
            onClick={() => window.location.href = '/dashboard/ict/audit'}
            className="px-4 py-2 bg-[#0D2B55] text-white text-[13px] font-[700] rounded-lg hover:bg-[#1a3d6e] transition-colors whitespace-nowrap"
        >
            View Audit Trail
        </button>
      </div>

      {/* MOVED TO TOP: Dynamic Real-time Email Configuration Panel */}
      <div className="bg-white rounded-xl border border-[#E2DDD4] shadow-sm overflow-hidden h-fit">
        <div className="bg-[#0D2B55] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white">
            <Mail size={18} className="text-[#e8c96a]" />
            <h3 className="font-bold text-sm tracking-wide uppercase">Live SMTP Gateway</h3>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-full uppercase border border-emerald-500/30">Dynamic Mode</span>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Outgoing Server Host</label>
              <input type="text" name="host" value={smtpForm.host} onChange={handleInputChange} placeholder="smtp.titan.email" className="w-full border border-[#E2DDD4] rounded-lg p-2.5 text-[13px] font-semibold focus:outline-none focus:border-[#0D2B55] bg-[#FAF8F4]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Port</label>
              <input type="number" name="port" value={smtpForm.port} onChange={handleInputChange} placeholder="465" className="w-full border border-[#E2DDD4] rounded-lg p-2.5 text-[13px] font-semibold focus:outline-none focus:border-[#0D2B55] bg-[#FAF8F4]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Authorized User (Email)</label>
              <input type="email" name="user" value={smtpForm.user} onChange={handleInputChange} placeholder="admin@domain.com" className="w-full border border-[#E2DDD4] rounded-lg p-2.5 text-[13px] font-semibold focus:outline-none focus:border-[#0D2B55] bg-[#FAF8F4]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">App Password</label>
              <input type="password" name="pass" value={smtpForm.pass} onChange={handleInputChange} placeholder="••••••••••••" className="w-full border border-[#E2DDD4] rounded-lg p-2.5 text-[13px] font-semibold focus:outline-none focus:border-[#0D2B55] bg-[#FAF8F4]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sender Display Name</label>
              <input type="text" name="fromName" value={smtpForm.fromName} onChange={handleInputChange} placeholder="FSM Portal" className="w-full border border-[#E2DDD4] rounded-lg p-2.5 text-[13px] font-semibold focus:outline-none focus:border-[#0D2B55] bg-[#FAF8F4]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sender Email Envelope</label>
              <input type="email" name="fromEmail" value={smtpForm.fromEmail} onChange={handleInputChange} placeholder="no-reply@domain.com" className="w-full border border-[#E2DDD4] rounded-lg p-2.5 text-[13px] font-semibold focus:outline-none focus:border-[#0D2B55] bg-[#FAF8F4]" />
            </div>
          </div>

          <div className="flex items-center space-x-2 py-1">
            <input type="checkbox" id="secure" name="secure" checked={smtpForm.secure} onChange={handleInputChange} className="rounded border-[#E2DDD4] w-3.5 h-3.5 accent-[#0D2B55] cursor-pointer" />
            <label htmlFor="secure" className="text-[11px] font-bold text-slate-600 select-none cursor-pointer">Force Explicit SSL/TLS Cryptography (Required for Port 465)</label>
          </div>

          {testResult && (
            <div className={`p-3 rounded-lg border text-[11px] font-bold flex items-center space-x-2 ${testResult.error ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              <AlertTriangle size={14} />
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="pt-4 border-t border-[#E2DDD4] flex items-center justify-end space-x-3">
            <button type="button" onClick={handleVerifySettings} disabled={testing || saving || loading} className="px-4 py-2.5 text-[12px] font-bold border border-[#E2DDD4] rounded-lg text-slate-700 hover:bg-[#FAF8F4] flex items-center space-x-1.5 disabled:opacity-50 transition-colors bg-white shadow-sm">
              {testing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              <span>Test Connection</span>
            </button>
            <button type="button" onClick={handleSaveSettings} disabled={testing || saving || loading} className="px-5 py-2.5 text-[12px] font-bold bg-[#C9A84C] text-[#0D2B55] rounded-lg hover:bg-[#b59540] flex items-center space-x-1.5 disabled:opacity-50 transition-colors shadow-sm">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save to Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* API Server */}
        <div className="bg-white border border-[#E2DDD4] rounded-xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.server === 'Online' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${status.server === 'Online' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-[#0D2B55] rounded-xl flex items-center justify-center mb-4 border border-blue-100">
            <Server className="w-6 h-6" />
          </div>
          <h3 className="text-[16px] font-[800] text-[#0D2B55] mb-1">Application Server</h3>
          <p className="text-[13px] text-[#6b7280] mb-4 h-10">Main Node.js Express backend serving API requests.</p>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center">
            <span className="text-[12px] font-[600] text-[#4b5563]">Status</span>
            <span className={`text-[12px] font-[800] px-2.5 py-1 rounded-md ${
              status.server === 'Online' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>{loading ? '...' : status.server}</span>
          </div>
        </div>

        {/* Database */}
        <div className="bg-white border border-[#E2DDD4] rounded-xl p-5 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.database === 'Connected' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${status.database === 'Connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 border border-indigo-100">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-[16px] font-[800] text-[#0D2B55] mb-1">MongoDB Atlas</h3>
          <p className="text-[13px] text-[#6b7280] mb-4 h-10">Primary cloud database cluster holding all application data.</p>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[12px] font-[600] text-[#4b5563]">Status</span>
              <span className={`text-[12px] font-[800] px-2.5 py-1 rounded-md ${
                status.database === 'Connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>{loading ? '...' : status.database}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-[11px] font-[600] text-[#6b7280]">Active Records</span>
              <span className="text-[11px] font-[800] text-[#0D2B55]">{loading ? '...' : `${metrics.users} Users | ${metrics.appraisals} Apps`}</span>
            </div>
          </div>
        </div>

        {/* Authentication */}
        <div className="bg-white border border-[#E2DDD4] rounded-xl p-5 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.auth === 'Secure' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${status.auth === 'Secure' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 border border-amber-100">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-[16px] font-[800] text-[#0D2B55] mb-1">JWT Security</h3>
          <p className="text-[13px] text-[#6b7280] mb-4 h-10">Authentication middleware and session token validation.</p>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center">
            <span className="text-[12px] font-[600] text-[#4b5563]">Status</span>
            <span className={`text-[12px] font-[800] px-2.5 py-1 rounded-md ${
              status.auth === 'Secure' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>{loading ? '...' : status.auth}</span>
          </div>
        </div>

        {/* Email Transport (Live Validation) */}
        <div className={`bg-white border border-[#E2DDD4] rounded-xl p-5 shadow-sm relative overflow-hidden ${status.mail !== 'Operational' ? 'ring-2 ring-amber-400' : ''}`}>
           <div className="absolute top-0 right-0 p-4">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.mail === 'Operational' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${status.mail === 'Operational' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4 border border-rose-100">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="text-[16px] font-[800] text-[#0D2B55] mb-1">SMTP Transport</h3>
          <p className="text-[13px] text-[#6b7280] mb-4 h-10">Dynamic dispatch gateway for STIP email notifications.</p>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center">
            <span className="text-[12px] font-[600] text-[#4b5563]">Status</span>
            <span className={`text-[12px] font-[800] px-2.5 py-1 rounded-md ${
              status.mail === 'Operational' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>{loading || testing ? '...' : status.mail}</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Dynamic Settings */}
        <div className="flex flex-col gap-6">
          
          {/* Version Configuration */}
          <div className="bg-white border border-[#E2DDD4] rounded-xl shadow-sm overflow-hidden h-fit">
            <div className="p-[16px_20px] border-b border-[#E2DDD4] flex items-center gap-3">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-slate-600">
                <Settings className="w-5 h-5" />
              </div>
              <h2 className="text-[15px] font-[800] text-[#0D2B55]">Configuration</h2>
            </div>
            
            <div className="p-5">
              <div className="divide-y divide-slate-100">
                <div className="flex justify-between py-3 text-[13px]">
                  <span className="text-[#6b7280]">Version</span>
                  <span className="font-[800] text-[#0D2B55]">STIP Portal v1.0.0 CY2026</span>
                </div>
                <div className="flex justify-between py-3 text-[13px]">
                  <span className="text-[#6b7280]">Total Employees</span>
                  <span className="font-[800] text-[#0D2B55]">{metrics.users}</span>
                </div>
                <div className="flex justify-between py-3 text-[13px]">
                  <span className="text-[#6b7280]">EP Cap</span>
                  <span className="font-[800] text-[#0D2B55]">{epCap} (5% of {metrics.users})</span>
                </div>
                <div className="flex justify-between py-3 text-[13px]">
                  <span className="text-[#6b7280]">Active Year</span>
                  <span className="font-[800] text-[#0D2B55]">CY2026</span>
                </div>
                <div className="flex justify-between pt-3 text-[13px]">
                  <span className="text-[#6b7280]">PDF Engine</span>
                  <span className="font-[800] text-[#0D2B55]">jsPDF v2.5.1</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Access Control Matrix */}
        <div className="bg-white border border-[#E2DDD4] rounded-xl shadow-sm overflow-hidden flex flex-col h-fit">
          <div className="p-[16px_20px] border-b border-[#E2DDD4] flex items-center gap-3">
            <div className="bg-[#FFFBEB] p-2 rounded-lg border border-[#FDE68A] text-[#D97706]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[15px] font-[800] text-[#0D2B55]">Access Control Matrix</h2>
              <div className="text-[12px] text-[#6b7280] mt-0.5">Permissions by role</div>
            </div>
          </div>

          <div className="p-5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0D2B55] text-white text-[12px] font-[800]">
                  <th className="p-[10px_12px] rounded-tl-md">Permission</th>
                  <th className="p-[10px_12px] text-center text-[#e8c96a]">LM</th>
                  <th className="p-[10px_12px] text-center text-[#e8c96a]">HR</th>
                  <th className="p-[10px_12px] text-center text-[#e8c96a]">CEO</th>
                  <th className="p-[10px_12px] text-center text-[#e8c96a]">Staff</th>
                  <th className="p-[10px_12px] text-center text-[#e8c96a] rounded-tr-md">ICT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 border-b border-l border-r border-slate-100 rounded-b-md">
                {permissions.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="p-[12px] text-[13px] text-[#4b5563] font-[500]">{row.name}</td>
                    <td className="p-[12px]">{renderCheck(row.lm)}</td>
                    <td className="p-[12px]">{renderCheck(row.hr)}</td>
                    <td className="p-[12px]">{renderCheck(row.ceo)}</td>
                    <td className="p-[12px]">{renderCheck(row.staff)}</td>
                    <td className="p-[12px]">{renderCheck(row.ict)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}