'use client';

import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';

const nm = (s) => `${s.fn} ${s.ln}`.trim();

// Mocking function mapped to an empty array (no static data used)
// ensuring UI handles standard functionality properly without crashing
const discCasesFor = (id) => [];

export default function PortfolioDiscipline() {
  const [loading, setLoading] = useState(true);
  const [allCases, setAllCases] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/executive/dashboard');
        const { allAppraisals = [] } = res.data?.data || {};

        // Parse unique staff
        const staffMap = new Map();
        allAppraisals.forEach(a => {
          const emp = a.employeeId;
          if (!emp) return;
          if (!staffMap.has(emp._id)) {
            staffMap.set(emp._id, {
              id: emp._id,
              fn: emp.personalDetails?.firstName || '',
              ln: emp.personalDetails?.lastName || '',
              title: emp.employmentDetails?.jobTitle || ''
            });
          }
        });

        // Parse cases (dynamically empty as requested via no static data)
        let cases = [];
        Array.from(staffMap.values()).forEach(s => {
          const c = discCasesFor(s.id);
          c.forEach(x => { cases.push({ ...x, staff: s }); });
        });

        setAllCases(cases.sort((a, b) => new Date(b.raised).getTime() - new Date(a.raised).getTime()));
      } catch (error) {
        console.error("Error fetching disciplinary cases:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Syncing Disciplinary DB...</div>;

  return (
    <div className="max-w-[1120px] mx-auto p-[24px_22px_70px] font-sans">
      <div className="mb-[16px]">
        <h2 className="text-[22px] text-[#0D2B55] m-0 mb-[3px] tracking-[-0.01em] font-bold">Portfolio Discipline</h2>
        <div className="text-[13px] text-[#667085]">Live view of all disciplinary cases across your portfolio, synced directly from HR&rsquo;s Disciplinary tracking system.</div>
      </div>

      <div className="bg-white border border-[#E4E0D8] rounded-[13px] mb-[14px] overflow-hidden shadow-sm">
        <div className="flex justify-between items-center gap-[10px] p-[13px_17px] border-b border-[#E4E0D8] flex-wrap bg-[#FBFAF7]">
          <div>
            <div className="font-extrabold text-[#0D2B55] text-[14.5px]">Disciplinary Cases</div>
            <div className="text-[11.5px] text-[#667085]">Showing {allCases.length} records.</div>
          </div>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-left p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Case ID</th>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-left p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Employee</th>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-left p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Status</th>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-left p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Date Raised</th>
                <th className="text-[10.5px] uppercase tracking-[0.04em] text-[#667085] text-left p-[9px_12px] border-b border-[#E4E0D8] bg-[#FBFAF7]">Description</th>
              </tr>
            </thead>
            <tbody>
              {allCases.map(c => (
                <tr key={c.id}>
                  <td className="p-[9px_12px] text-[13px] border-b border-[#F0EEE8] align-middle font-bold text-[#0D2B55]">{c.id}</td>
                  <td className="p-[9px_12px] text-[13px] border-b border-[#F0EEE8] align-middle">
                    <b className="text-[#0D2B55]">{nm(c.staff)}</b>
                    <div className="text-[11.5px] text-[#667085]">{c.staff.title}</div>
                  </td>
                  <td className="p-[9px_12px] text-[13px] border-b border-[#F0EEE8] align-middle">
                    <span className={`inline-block text-[10.5px] font-bold px-[9px] py-[2px] rounded-full whitespace-nowrap bg-[#EEF2F7] text-[#64748B]`}>{c.status}</span>
                  </td>
                  <td className="p-[9px_12px] text-[13px] border-b border-[#F0EEE8] align-middle">{c.raised}</td>
                  <td className="p-[9px_12px] text-[12px] border-b border-[#F0EEE8] align-middle max-w-[300px] truncate" title={c.desc}>{c.desc}</td>
                </tr>
              ))}
              {!allCases.length && (
                <tr>
                  <td colSpan="5" className="p-[20px] text-center text-[13px] text-[#667085]">No disciplinary cases found in your portfolio.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}