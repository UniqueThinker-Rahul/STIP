'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from '../../../../lib/api';

export default function AddNewStaff() {
  const router = useRouter();
  
  // Form State
  const [nid, setNid] = useState('');
  const [nfn, setNfn] = useState('');
  const [nln, setNln] = useState('');
  const [ntitle, setNtitle] = useState('');
  const [nco, setNco] = useState('');
  const [nmgr, setNmgr] = useState('');
  const [nrole, setNrole] = useState('EMPLOYEE');
  const [nhire, setNhire] = useState('');
  
  const [proRataLabel, setProRataLabel] = useState('');
  const [proRataColor, setProRataColor] = useState('');
  const [calcInfo, setCalcInfo] = useState(null);

  // Live Database Managers
  const [managers, setManagers] = useState([]);
  
  // Inside src/app/dashboard/hr/add-staff/page.js
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const res = await api.get('/users/managers');
        // Just take whatever the backend gives you! 
        // If HR makes a new Line Manager tomorrow, they will automatically appear here.
        setManagers(res.data?.data || []);
      } catch (error) {
        console.error("Failed to load managers:", error);
      }
    };
    fetchManagers();
  }, []);

  const today = new Date();
  const maxDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const handleHireDate = (val) => {
    setNhire(val);
    if (!val) {
      setProRataLabel(''); setCalcInfo(null);
      return;
    }
    
    const hireDate = new Date(val);
    hireDate.setHours(0,0,0,0);
    const dToday = new Date(); dToday.setHours(0,0,0,0);
    
    if (hireDate > dToday) {
      alert('Hire date cannot be in the future.');
      setNhire(''); setProRataLabel(''); setCalcInfo(null);
      return;
    }

    const yearEnd = new Date('2026-12-31'); yearEnd.setHours(0,0,0,0);
    let pr = 1.0, days = 365, label = '', colour = '', explanation = '';

    if (hireDate <= new Date('2025-12-31')) {
      pr = 1.0;
      label = '1.000 (12.00 / 12 months)';
      colour = '#16a34a';
      explanation = `Hired before 1 Jan 2026. Full-year STIP entitlement (1.000).`;
    } else if (hireDate <= yearEnd) {
      days = Math.round((yearEnd.getTime() - hireDate.getTime())/(1000*60*60*24)) + 1;
      pr = +(days/365).toFixed(4);
      const months = +(pr*12).toFixed(2);
      label = `${pr.toFixed(3)} (${months.toFixed(2)} / 12 months)`;
      colour = pr >= 0.75 ? '#16a34a' : pr >= 0.5 ? '#d97706' : '#dc2626';
      explanation = `Mid-year joiner. ${days} days active in 2026. STIP multiplier: ${pr.toFixed(3)}.`;
    }
    
    setProRataLabel(label);
    setProRataColor(colour);
    
    let bg = '#fee2e2', text = '#b91c1c';
    if (pr >= 0.75) { bg = '#dcfce7'; text = '#15803d'; }
    else if (pr >= 0.5) { bg = '#fef3c7'; text = '#b45309'; }
    
    setCalcInfo({ bg, text, html: explanation });
  };

  const handleSave = async () => {
    if (!nid || !nfn || !nln || !ntitle || !nco || !nhire) {
      alert('Please fill in all required fields, including Manual Employee ID.');
      return;
    }

    try {
      await api.post('/users', {
        employeeId: nid.trim(),
        firstName: nfn.trim(),
        lastName: nln.trim(),
        jobTitle: ntitle.trim(),
        companyCode: nco,
        dateOfHire: nhire,
        role: nrole,
        reportingTo: nmgr || null
      });
      
      alert(`Success! Employee ${nfn} ${nln} added directly to database.`);
      router.push('/dashboard/hr/staff');
    } catch (error) {
      alert('Database Error: Check if this Employee ID already exists.');
    }
  };

  const clearForm = () => {
    setNid(''); setNfn(''); setNln(''); setNtitle(''); setNco(''); setNmgr(''); setNhire(''); setNrole('EMPLOYEE');
    setProRataLabel(''); setCalcInfo(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">+ Register New Staff</h1>
          <p className="text-sm text-slate-500 mt-1">Add an employee directly to the live database.</p>
        </div>
        <button onClick={() => router.push('/dashboard/hr/staff')} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg shadow-sm transition-colors border">
          ← Back to Directory
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-bold text-lg border-b pb-4 mb-4">Required Employee Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">First Name *</label>
            <input className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-slate-400" placeholder="e.g. Francis" value={nfn} onChange={e => setNfn(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Last Name *</label>
            <input className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-slate-400" placeholder="e.g. Sharma" value={nln} onChange={e => setNln(e.target.value)} />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Manual Employee ID *</label>
            <input className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-slate-400 font-mono" placeholder="Enter Official ID..." value={nid} onChange={e => setNid(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Company Code *</label>
            <select className="w-full border rounded-lg px-4 py-2.5 outline-none" value={nco} onChange={e => setNco(e.target.value)}>
              <option value="">Select company</option><option>FSM</option><option>CDU</option><option>NAR</option><option>GUM</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Job Title *</label>
            <input className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-slate-400" placeholder="e.g. Terminal Operator" value={ntitle} onChange={e => setNtitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">System Role *</label>
            <select className="w-full border rounded-lg px-4 py-2.5 outline-none bg-amber-50" value={nrole} onChange={e => setNrole(e.target.value)}>
              <option value="EMPLOYEE">Standard Employee</option>
              <option value="MANAGER">Line Manager</option>
              <option value="HR_ADMIN">HR Admin</option>
              <option value="CEO">CEO</option>
              <option value="ICT_ADMIN">ICT Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Reporting Manager</label>
            <select className="w-full border rounded-lg px-4 py-2.5 outline-none" value={nmgr} onChange={e => setNmgr(e.target.value)}>
              <option value="">-- Unassigned / CEO --</option>
              {managers.map(m => (
                <option key={m._id} value={m._id}>{m.personalDetails?.firstName} {m.personalDetails?.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Hire Date *</label>
            <input type="date" className="w-full border rounded-lg px-4 py-2.5 outline-none" max={maxDateStr} value={nhire} onChange={e => handleHireDate(e.target.value)} />
          </div>
        </div>

        {calcInfo && (
          <div className="mt-6 p-4 rounded-lg border font-medium text-sm" style={{ background: calcInfo.bg, color: calcInfo.text, borderColor: calcInfo.text }}>
            {calcInfo.html} (Calculated Pro-Rata: <strong>{proRataLabel}</strong>)
          </div>
        )}

        <div className="mt-8 pt-6 border-t flex gap-4">
          <button onClick={handleSave} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm">
            ✓ Push to Live Database
          </button>
        </div>
      </div>
    </div>
  );
}