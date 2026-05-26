'use client';

import { useState } from 'react';

export default function Reports() {
  const [success, setSuccess] = useState({show: false, icon: '', title: '', detail: ''});
  
  // In a real app, this would be fetched from the backend config.
  const SCORECARD_LOCKED = true; 

  const downloadReport = (type) => {
    const names = {
      completion: 'Appraisal Completion Report',
      awards: 'Full Award Report',
      board: 'Board Summary Report',
      office: 'Report by Office',
      criteria: 'Report on Evaluated Criteria',
      audit: 'Audit Trail Report'
    };
    
    if ((type === 'awards' || type === 'board') && !SCORECARD_LOCKED) {
      setSuccess({
        show: true,
        icon: '🔒',
        title: 'Scorecard Not Locked',
        detail: `The ${names[type]} is only available after the CEO locks the KPA scorecard.`
      });
      return;
    }
    
    setSuccess({
      show: true,
      icon: '📥',
      title: `${names[type]} Ready`,
      detail: `Generated successfully. In a fully connected system, this triggers an automatic file download to your device.`
    });
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">📊 Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Download and view STIP program reports</p>
      </div>
      
      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Completion */}
        <div 
          className="bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col"
          onClick={() => downloadReport('completion')}
        >
          <div className="text-4xl mb-3">✅</div>
          <div className="text-[15px] font-bold text-slate-900 mb-2">Appraisal Completion Report</div>
          <div className="text-xs text-slate-500 leading-relaxed mb-5 flex-grow">
            Per-employee status across all 4 quarters — submitted, approved, pending, not started
          </div>
          <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100">
            <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-bold">PDF</span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">CSV</span>
            <span className="text-[10px] text-slate-400 font-medium ml-auto">Any time</span>
          </div>
        </div>
        
        {/* Card 2: Full Award */}
        <div 
          className="bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col"
          onClick={() => downloadReport('awards')}
        >
          <div className="text-4xl mb-3">💰</div>
          <div className="text-[15px] font-bold text-slate-900 mb-2">Full Award Report</div>
          <div className="text-xs text-slate-500 leading-relaxed mb-5 flex-grow">
            All 190 employees — IPRF, pro-rata, base award%, final award%, STIP pay ($) — payroll-ready
          </div>
          <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100">
            <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-bold">PDF</span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">CSV</span>
            <span className="text-[10px] text-slate-400 font-medium ml-auto">After CEO lock</span>
          </div>
        </div>
        
        {/* Card 3: Board Summary */}
        <div 
          className="bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col"
          onClick={() => downloadReport('board')}
        >
          <div className="text-4xl mb-3">📄</div>
          <div className="text-[15px] font-bold text-slate-900 mb-2">Board Summary Report</div>
          <div className="text-xs text-slate-500 leading-relaxed mb-5 flex-grow">
            High-level summary — CP%, KPA breakdown, EP count, total payout for Board presentation
          </div>
          <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100">
            <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-bold">PDF</span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">CSV</span>
            <span className="text-[10px] text-slate-400 font-medium ml-auto">After CEO lock</span>
          </div>
        </div>
        
        {/* Card 4: Report by Office */}
        <div 
          className="bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col"
          onClick={() => downloadReport('office')}
        >
          <div className="text-4xl mb-3">🏢</div>
          <div className="text-[15px] font-bold text-slate-900 mb-2">Report by Office</div>
          <div className="text-xs text-slate-500 leading-relaxed mb-5 flex-grow">
            Statistics grouped by FSM, CDU, NAR, GUM — headcount, completion rate, average IPRF
          </div>
          <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100">
            <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-bold">PDF</span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">CSV</span>
            <span className="text-[10px] text-slate-400 font-medium ml-auto">Any time</span>
          </div>
        </div>
        
        {/* Card 5: Evaluated Criteria */}
        <div 
          className="bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col"
          onClick={() => downloadReport('criteria')}
        >
          <div className="text-4xl mb-3">⭐</div>
          <div className="text-[15px] font-bold text-slate-900 mb-2">Report on Evaluated Criteria</div>
          <div className="text-xs text-slate-500 leading-relaxed mb-5 flex-grow">
            Average scores per criterion — identifies NI/LS concentrations by department and manager
          </div>
          <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100">
            <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-bold">PDF</span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">CSV</span>
            <span className="text-[10px] text-slate-400 font-medium ml-auto">Any time</span>
          </div>
        </div>
        
        {/* Card 6: Audit Trail */}
        <div 
          className="bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col"
          onClick={() => downloadReport('audit')}
        >
          <div className="text-4xl mb-3">📄</div>
          <div className="text-[15px] font-bold text-slate-900 mb-2">Audit Trail Report</div>
          <div className="text-xs text-slate-500 leading-relaxed mb-5 flex-grow">
            Full system log — who submitted, approved, locked — timestamps, user IDs, tamper-proof
          </div>
          <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100">
            <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-bold">PDF</span>
            <span className="text-[10px] text-slate-400 font-medium ml-auto">Admin only</span>
          </div>
        </div>
      </div>
      
      {/* Tailwind Styled Success Modal */}
      {success.show && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="text-5xl mb-4">{success.icon}</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{success.title}</h2>
            <p className="text-sm text-slate-500 mb-6">{success.detail}</p>
            <button 
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-sm transition-colors" 
              onClick={() => setSuccess({...success, show: false})}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}