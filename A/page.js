'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Info, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';

const allOffences = [
  { id: 1, category: 'Attendance', offence: 'Unexcused tardiness (late without good reason)', first: 'A', second: 'R -> S3', third: 'S10 -> D' },
  { id: 2, category: 'Attendance', offence: 'Unexcused or unauthorised absence (AWOL)', first: 'R -> S3', second: 'S10 -> S20', third: 'D' },
  { id: 3, category: 'Attendance', offence: 'Abandonment of position', first: 'D', second: 'D', third: 'D' },
  { id: 4, category: 'Attendance', offence: 'Leaving assigned job during working hours without permission', first: 'A -> R', second: 'S3 -> S10', third: 'S20 -> D' },
  { id: 5, category: 'Performance', offence: 'Loafing, idleness, wasting time', first: 'A', second: 'R -> S3', third: 'S20 -> D' },
  { id: 6, category: 'Performance', offence: 'Careless or negligent workmanship causing waste or delay', first: 'A -> R', second: 'R -> D', third: 'D' },
  { id: 7, category: 'Safety', offence: 'Traffic violation, reckless driving, improper vehicle operation', first: 'A -> S10', second: 'S10 -> S20', third: 'D' },
  { id: 8, category: 'Safety', offence: 'Ignoring safety precautions or not using safety clothing/equipment', first: 'S10', second: 'S10 -> S20', third: 'D' },
  { id: 9, category: 'Safety', offence: 'Smoking in "No Smoking" areas; matches/lighters in explosive areas', first: 'R -> D', second: 'D', third: 'D' },
  { id: 10, category: 'Safety', offence: 'Carrying explosives, firearms or lethal weapons without authorisation', first: 'R -> D', second: 'D', third: 'D' },
  { id: 11, category: 'Safety', offence: 'Endangering the safety of, or injuring, other personnel', first: 'R -> D', second: 'S20 -> D', third: 'D' },
  { id: 12, category: 'Safety', offence: 'Failure to report a personal injury or accident at work', first: 'A -> R', second: 'A -> R', third: 'R -> S3' },
  { id: 13, category: 'Performance', offence: 'Deliberate failure/delay in carrying out instructions (e.g. monthly reports)', first: 'R -> S3', second: 'S10 -> D', third: 'D' },
  { id: 14, category: 'Performance', offence: 'Sleeping on duty (public safety NOT endangered)', subtext: 'If public safety IS endangered, the penalty is Dismissal (D) on the first offence.', first: 'A -> S10', second: 'R -> S10', third: 'D' },
  { id: 15, category: 'Conduct', offence: 'Physical/verbal abuse, disrespect, gossip, insulting language, defamation', first: 'R -> D', second: 'S20 -> D', third: 'D' },
  { id: 16, category: 'Performance', offence: 'Excessive/improper personal use of Company equipment (phone, PC, email, internet)', first: 'A -> R', second: 'R -> S3', third: 'S3 -> S10' },
  { id: 17, category: 'Conflict of Interest', offence: 'Outside employment or financial interest without CEO approval', first: 'R -> D', second: 'S10 -> D', third: 'D' },
  { id: 18, category: 'Conflict of Interest', offence: 'Outside activities/relationships creating a conflict of interest', first: 'A -> D', second: 'S3 -> D', third: 'D' },
  { id: 19, category: 'Conflict of Interest', offence: 'Unauthorised access/disclosure/misuse of confidential info or PII', first: 'A -> D', second: 'S3 -> D', third: 'D' },
  { id: 20, category: 'Conduct', offence: 'Inappropriate fraternisation (abuse of chain-of-command relationships)', first: 'D', second: 'D', third: 'D' },
  { id: 21, category: 'Conduct', offence: 'Insubordination — refusing a proper order or abusive language to supervisors', first: 'R -> D', second: 'S20 -> D', third: 'D' },
  { id: 22, category: 'Conduct', offence: 'Reporting for / being on duty under the influence of intoxicants', first: 'R -> D', second: 'S10 -> D', third: 'S20 -> D' },
  { id: 23, category: 'Conduct', offence: 'Giving or selling intoxicants to others on Company premises', first: 'R -> D', second: 'S20 -> D', third: 'D' },
  { id: 24, category: 'Conduct', offence: 'Gambling or unlawful betting on Company premises', first: 'R -> S20', second: 'S20 -> D', third: 'D' },
  { id: 25, category: 'Conduct', offence: 'Promotion of gambling on Company premises', first: 'R -> D', second: 'S20 -> D', third: 'D' },
  { id: 26, category: 'Conduct', offence: 'Indebtedness — not paying just financial obligations to the Company in good faith', first: 'A', second: 'A -> R', third: 'R -> D' },
  { id: 27, category: 'Integrity', offence: 'Actual or attempted theft of Company or personal property', first: 'D', second: 'D', third: 'D' },
  { id: 28, category: 'Integrity', offence: 'Falsifying attendance records (for self or another)', first: 'R -> D', second: 'S20 -> D', third: 'D' },
  { id: 29, category: 'Integrity', offence: 'Falsification/concealment of material facts; forging records; false info', first: 'R -> D', second: 'S20 -> D', third: 'D' },
  { id: 30, category: 'Conduct', offence: 'Loss, damage or unauthorised use of Company property', first: 'R -> D', second: 'S20 -> D', third: 'D' },
  { id: 31, category: 'Conduct', offence: 'Wilful unofficial use of Company vehicle', first: 'S20 -> D', second: 'D', third: 'D' },
  { id: 32, category: 'Conduct', offence: 'Borrowing from a subordinate; borrowing/lending over $20 on premises', first: 'R -> D', second: 'D', third: 'D' },
  { id: 33, category: 'Conduct', offence: 'Soliciting contributions / promoting unendorsed campaigns on premises', first: 'A -> S3', second: 'S10 -> D', third: 'D' },
  { id: 34, category: 'Conduct', offence: 'Selling tickets, goods, commodities or services on Company premises', first: 'A -> D', second: 'S10 -> D', third: 'D' },
  { id: 35, category: 'Integrity', offence: 'Accepting/soliciting gifts or gratuities from those doing business with Company', first: 'R -> D', second: 'D', third: 'D' },
  { id: 36, category: 'Integrity', offence: 'Engaging in black-market activity (e.g. selling Company fuel privately)', first: 'R -> D', second: 'D', third: 'D' },
  { id: 37, category: 'Integrity', offence: 'Accepting bribes or improper payments for favourable treatment', first: 'D', second: 'D', third: 'D' },
  { id: 38, category: 'Conduct', offence: 'Misconduct off duty (where it creates risk to safety, operations or trust)', first: 'A -> R', second: 'S3 -> D', third: 'D' },
  { id: 39, category: 'Integrity', offence: 'Refusal to testify or furnish information in Company investigations', first: 'R -> D', second: 'D', third: 'D' },
  { id: 40, category: 'Integrity', offence: 'Failure of security directives; failure to safeguard sensitive information', first: 'R -> D', second: 'R -> D', third: 'R -> D' }
];

export default function TableOfCharges() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All categories');
  const [currentPage, setCurrentPage] = useState(1);
  const [showInfo, setShowInfo] = useState(true);
  const itemsPerPage = 10;

  // Filter Data
  const filteredData = useMemo(() => {
    return allOffences.filter(item => {
      const matchCategory = selectedCategory === 'All categories' || item.category === selectedCategory;
      const matchSearch = item.offence.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.id.toString().includes(searchTerm);
      return matchCategory && matchSearch;
    });
  }, [searchTerm, selectedCategory]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // Category Icon Renderer
  const getCategoryIcon = (category) => {
    switch(category) {
      case 'Attendance': return '🕒';
      case 'Performance': return '📊';
      case 'Safety': return '⚠️';
      case 'Conduct': return '👥';
      case 'Conflict of Interest': return '👥';
      case 'Integrity': return '🔒';
      default: return '📌';
    }
  };

  // Exact Penalty Badge Renderer
  const renderPenalty = (text) => {
    if (!text) return null;
    const parts = text.split(' -> ');
    return (
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {parts.map((part, index) => {
          let badgeClass = '';
          if (part === 'A') badgeClass = 'bg-[#eff6ff] text-[#3b82f6]'; 
          else if (part === 'R') badgeClass = 'bg-[#fefce8] text-[#eab308]'; 
          else if (part.startsWith('S')) badgeClass = 'bg-[#fff7ed] text-[#f97316]'; 
          else if (part === 'D') badgeClass = 'bg-[#fef2f2] text-[#ef4444]'; 

          return (
            <React.Fragment key={index}>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide ${badgeClass}`}>
                {part}
              </span>
              {index < parts.length - 1 && (
                <span className="text-gray-400 font-medium text-[12px] leading-none">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8 font-sans relative">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Title */}
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Table of Charges</h1>
            <p className="text-sm text-gray-500 mt-1">Recognised offences and penalty ranges by occurrence</p>
          </div>
          
          {/* Show Info Toggle (Visible when info box is hidden) */}
          {!showInfo && (
            <button 
              onClick={() => setShowInfo(true)}
              className="flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors animate-in fade-in"
            >
              <Info size={14} className="mr-1.5" /> Show how it works <ChevronDown size={14} className="ml-1" />
            </button>
          )}
        </div>

        {/* Info Callout Box */}
        {showInfo && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 relative shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-600 text-white rounded-full p-1">
                <Info size={14} strokeWidth={3} />
              </div>
              <h3 className="font-bold text-gray-800 text-sm">How the Table of Charges works</h3>
            </div>
            
            <button 
              onClick={() => setShowInfo(false)}
              className="absolute top-4 right-4 flex items-center text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              Hide <ChevronUp size={16} className="ml-1" />
            </button>

            <ul className="list-disc pl-9 text-xs text-gray-600 space-y-1.5 font-medium">
              <li>The AD (Aggravating/Mitigating) factors and the penalty range for each occurrence (1st / 2nd / 3rd), exactly as in the FSMPC disciplinary policy.</li>
              <li>Codes: A = Admonishment (verbal warning), W = Written warning, D# = # working day suspension without pay (e.g., D10), D = Dismissal.</li>
              <li>A range like 'A → D3' means the penalty may fall anywhere from a written warning up to a 3-day suspension. Offences can be added, edited or removed here by an administrator.</li>
            </ul>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <input
            type="text"
            placeholder="Search offence or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-72 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-56 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm cursor-pointer bg-white"
          >
            <option value="All categories">All categories</option>
            <option value="Attendance">Attendance</option>
            <option value="Performance">Performance</option>
            <option value="Safety">Safety</option>
            <option value="Conduct">Conduct</option>
            <option value="Integrity">Integrity</option>
            <option value="Conflict of Interest">Conflict of Interest</option>
          </select>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a] text-white text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold w-12 text-center">#</th>
                <th className="px-4 py-3 font-semibold w-48">CATEGORY</th>
                <th className="px-4 py-3 font-semibold auto">OFFENCE</th>
                <th className="px-4 py-3 font-semibold w-36 text-center">1ST</th>
                <th className="px-4 py-3 font-semibold w-36 text-center">2ND</th>
                <th className="px-4 py-3 font-semibold w-36 text-center">3RD+</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentData.length > 0 ? currentData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 text-[13px] font-semibold text-gray-700 text-center">{row.id}</td>
                  <td className="px-4 py-4 text-[13px] text-gray-700 whitespace-nowrap">
                    <span className="mr-2 text-base">{getCategoryIcon(row.category)}</span>
                    {row.category}
                  </td>
                  <td className="px-4 py-4 text-[13px] text-gray-800 pr-10">
                    {row.offence}
                    {row.subtext && (
                      <div className="flex items-center gap-1.5 mt-2 bg-red-50 text-red-500 text-[11px] font-semibold px-2 py-1 rounded w-fit border border-red-100">
                        <AlertTriangle size={12} strokeWidth={2.5} />
                        {row.subtext}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-4 text-center">{renderPenalty(row.first)}</td>
                  <td className="px-2 py-4 text-center">{renderPenalty(row.second)}</td>
                  <td className="px-2 py-4 text-center">{renderPenalty(row.third)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">No offences found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-center gap-4 mt-8 pb-4">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-1.5 border border-gray-300 rounded-md text-sm font-semibold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            ← Prev
          </button>
          
          <span className="text-[13px] font-medium text-gray-500">
            Page {currentPage} of {totalPages} · {filteredData.length} offences
          </span>
          
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-4 py-1.5 border border-gray-300 rounded-md text-sm font-semibold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>

      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <button className="self-end bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-sm px-5 py-2.5 rounded-full shadow-lg flex items-center transition-transform hover:scale-105">
          ? Help
        </button>
        <button className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-lg flex items-center transition-transform hover:scale-105">
          ! Report Issue
        </button>
      </div>
    </div>
  );
}