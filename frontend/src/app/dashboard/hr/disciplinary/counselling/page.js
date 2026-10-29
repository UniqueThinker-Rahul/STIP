"use client";

import React, { useState, useEffect } from 'react';
import { Info, Loader2 } from 'lucide-react';
import api from '../../../../../lib/api'; // Adjust path depending on your folder depth

export default function HrCounsellingLog() {
  const [showInfoBox, setShowInfoBox] = useState(true);
  const [counsellings, setCounsellings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all counselling logs from the HR endpoint
  const fetchAllCounsellings = async () => {
    try {
      const res = await api.get('/disciplinary/hr/counselling');
      setCounsellings(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load HR counselling records", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCounsellings();
  }, []);

  // Calculate Statistics
  const totalLogged = counsellings.length;
  const resolvedCount = counsellings.filter(c => c.outcome === 'Resolved' || c.outcome === 'No further action').length;
  const verbalCount = counsellings.filter(c => c.outcome === 'Verbal admonishment').length;
  const escalatedCount = counsellings.filter(c => c.outcome === 'Escalated to case' || c.outcome === 'Referred to EAP').length; // Adjust based on your exact escalate strings

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 font-sans text-gray-800">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold flex items-center gap-2 text-[#0f172a]">
          Counselling Log <Info size={18} className="text-[#0f172a] cursor-pointer" />
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">Informal counselling recorded before formal cases — oversight</p>
      </div>

      {/* Info Box */}
      {showInfoBox && (
        <div className="bg-white border border-gray-200 border-l-4 border-l-[#eab308] rounded-lg p-5 mb-6 relative shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-600 rounded p-1"><Info size={16} /></div>
              <h2 className="font-bold text-[#0f172a] text-sm">How the Counselling Log works</h2>
              <span className="bg-[#ffedd5] text-[#c2410c] text-[11px] px-2 py-0.5 rounded font-bold">HR Manager</span>
            </div>
            <button onClick={() => setShowInfoBox(false)} className="text-sm text-gray-500 hover:text-gray-800 font-medium">Hide</button>
          </div>
          <ul className="text-[13px] text-gray-600 space-y-2 list-disc pl-5 ml-1">
            <li>Every informal counselling recorded by line managers, before it becomes (or instead of becoming) a formal case.</li>
            <li>Shows the issue, what was discussed, the outcome, and whether it was escalated to a case.</li>
            <li>Read-only oversight — it confirms that problems are being counselled and managed early across the company.</li>
          </ul>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="text-[32px] font-bold text-[#0d9488] leading-tight">{totalLogged}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mt-1">TOTAL LOGGED</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="text-[32px] font-bold text-[#0d9488] leading-tight">{resolvedCount}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mt-1">RESOLVED</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="text-[32px] font-bold text-[#f97316] leading-tight">{verbalCount}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mt-1">VERBAL ADMONISHMENT</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="text-[32px] font-bold text-[#9333ea] leading-tight">{escalatedCount}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mt-1">ESCALATED TO CASE</div>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="animate-spin text-gray-400 mb-2" size={24} />
            <p className="text-sm text-gray-500">Loading company logs...</p>
          </div>
        ) : counsellings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-500">No counselling records logged company-wide yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-sm whitespace-nowrap">
              {/* Dark Navy Header */}
              <thead className="bg-[#0f172a] text-white text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 rounded-tl-sm">REF</th>
                  <th className="px-5 py-3">EMPLOYEE</th>
                  <th className="px-5 py-3">DEPT</th>
                  <th className="px-5 py-3">ISSUE</th>
                  <th className="px-5 py-3">DISCUSSED</th>
                  <th className="px-5 py-3">DATE</th>
                  <th className="px-5 py-3 rounded-tr-sm">OUTCOME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {counsellings.map((c, idx) => {
                  // Fallback Mock Reference generator if you aren't storing one in DB (e.g. CN-2001)
                  const refId = `CN-200${idx + 1}`; 
                  
                  return (
                    <tr key={c._id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-5 py-4 font-bold text-[#0f172a]">
                        {refId}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#0f172a]">{c.employeeId?.personalDetails?.firstName} {c.employeeId?.personalDetails?.lastName}</div>
                        <div className="text-[12px] text-gray-500 mt-0.5">{c.employeeId?.employmentDetails?.jobTitle}</div>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-gray-600">
                        {c.employeeId?.employmentDetails?.department || 'Unknown'}
                      </td>
                      <td className="px-5 py-4 text-[13px] text-gray-600 max-w-[150px] truncate" title={c.issue}>
                        {c.issue}
                      </td>
                      <td className="px-5 py-4 text-[13px] text-gray-600 max-w-[200px] truncate" title={c.discussed}>
                        {c.discussed}
                      </td>
                      <td className="px-5 py-4 text-[13px] text-[#0f172a]">
                        {new Date(c.date).toISOString().split('T')[0]}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          c.outcome === 'Resolved' ? 'bg-green-100 text-green-800' :
                          c.outcome === 'Verbal admonishment' ? 'bg-[#fef3c7] text-[#92400e]' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {c.outcome}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}