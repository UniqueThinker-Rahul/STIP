'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Info, ChevronUp, ChevronDown, AlertTriangle, Plus, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import api from '../../../../../lib/api'; // Adjust relative path to your API wrapper

// Default fallback data in case the API returns 404
const defaultOffences = [
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
];

const PENALTY_OPTIONS = [
  { value: 'A', label: 'A - Verbal' },
  { value: 'R', label: 'R - Written' },
  { value: 'S3', label: 'S3 - 3 days' },
  { value: 'S10', label: 'S10 - 10 days' },
  { value: 'S20', label: 'S20 - 20 days' },
  { value: 'D', label: 'D - Dismiss' }
];

export default function TableOfCharges() {
  const [userRole, setUserRole] = useState('');
  const [offences, setOffences] = useState([]);
  const [categories, setCategories] = useState([
    'Attendance', 'Performance', 'Safety', 'Conduct', 'Integrity', 'Conflict of Interest'
  ]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All categories');
  const [currentPage, setCurrentPage] = useState(1);
  const [showInfo, setShowInfo] = useState(true);
  const itemsPerPage = 10;

  // Modal States
  const [activeModal, setActiveModal] = useState(null); 
  const [selectedOffence, setSelectedOffence] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [newCategoryName, setNewCategoryName] = useState('');
  const [offenceForm, setOffenceForm] = useState({
    offence: '',
    category: 'Attendance',
    firstMin: 'A',
    firstMax: 'A',
    secondMin: 'R',
    secondMax: 'S3',
    thirdMin: 'S10',
    thirdMax: 'D',
    subtext: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch user profile to verify role
      const userRes = await api.get('/auth/me').catch(() => null);
      const role = userRes?.data?.data?.security?.role || userRes?.data?.role || localStorage.getItem('userRole') || 'STAFF';
      setUserRole(role.toUpperCase());

      // Attempt to fetch dynamic offences from API
      const offencesRes = await api.get('/offences');
      const fetchedOffences = offencesRes.data?.data || offencesRes.data || [];
      
      if (fetchedOffences.length > 0) {
        setOffences(fetchedOffences);
        const dynamicCategories = Array.from(new Set(fetchedOffences.map(o => o.category))).filter(Boolean);
        if (dynamicCategories.length > 0) {
          setCategories(prev => Array.from(new Set([...prev, ...dynamicCategories])));
        }
      } else {
        setOffences(defaultOffences); // Fallback if API returns empty array
      }
    } catch (error) {
      console.error("Failed to fetch offences data, applying static fallback:", error);
      // Fallback if API throws 404 Not Found
      setOffences(defaultOffences);
    } finally {
      setLoading(false);
    }
  };

  // Fixed permission check to handle roles with spaces (e.g., "HR ADMIN")
  const canManage = ['HR_ADMIN', 'HR ADMIN', 'HR', 'ICT_ADMIN', 'ICT ADMIN', 'ADMIN'].includes(userRole);

  const buildRangeString = (min, max) => (min === max ? min : `${min} -> ${max}`);

  const parseRangeString = (rangeStr) => {
    if (!rangeStr) return { min: 'A', max: 'A' };
    const parts = rangeStr.split(' -> ');
    return { min: parts[0]?.trim() || 'A', max: parts[1]?.trim() || parts[0]?.trim() || 'A' };
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    setIsSubmitting(true);
    try {
      await api.post('/offences/categories', { name: newCategoryName.trim() }).catch(() => null);
      if (!categories.includes(newCategoryName.trim())) {
        setCategories(prev => [...prev, newCategoryName.trim()]);
      }
      setNewCategoryName('');
      setActiveModal(null);
    } catch (err) {
      console.error("Error adding category:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAddOffence = () => {
    setOffenceForm({
      offence: '',
      category: categories[0] || 'Attendance',
      firstMin: 'A',
      firstMax: 'R',
      secondMin: 'R',
      secondMax: 'S3',
      thirdMin: 'S10',
      thirdMax: 'D',
      subtext: ''
    });
    setActiveModal('addOffence');
  };

  const handleOpenEditOffence = (row) => {
    setSelectedOffence(row);
    const f1 = parseRangeString(row.first);
    const f2 = parseRangeString(row.second);
    const f3 = parseRangeString(row.third);

    setOffenceForm({
      offence: row.offence,
      category: row.category,
      firstMin: f1.min,
      firstMax: f1.max,
      secondMin: f2.min,
      secondMax: f2.max,
      thirdMin: f3.min,
      thirdMax: f3.max,
      subtext: row.subtext || ''
    });
    setActiveModal('editOffence');
  };

  const handleSaveOffence = async (e) => {
    e.preventDefault();
    if (!offenceForm.offence.trim()) return alert("Offence description is required.");

    setIsSubmitting(true);
    const payload = {
      category: offenceForm.category,
      offence: offenceForm.offence,
      first: buildRangeString(offenceForm.firstMin, offenceForm.firstMax),
      second: buildRangeString(offenceForm.secondMin, offenceForm.secondMax),
      third: buildRangeString(offenceForm.thirdMin, offenceForm.thirdMax),
      subtext: offenceForm.subtext
    };

    try {
      if (activeModal === 'addOffence') {
        const res = await api.post('/offences', payload).catch(() => ({ data: { data: null } }));
        const createdObj = res.data?.data || { ...payload, id: offences.length + 1, _id: Date.now().toString() };
        setOffences(prev => [...prev, createdObj]);
      } else if (activeModal === 'editOffence' && selectedOffence) {
        const targetId = selectedOffence._id || selectedOffence.id;
        await api.put(`/offences/${targetId}`, payload).catch(() => null);
        setOffences(prev => prev.map(item => (item._id === targetId || item.id === targetId) ? { ...item, ...payload } : item));
      }
      setActiveModal(null);
    } catch (error) {
      console.error("Failed to save offence:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOffence = async (row) => {
    const targetId = row._id || row.id;
    if (!confirm(`Are you sure you want to delete this offence?`)) return;

    try {
      await api.delete(`/offences/${targetId}`).catch(() => null);
      setOffences(prev => prev.filter(item => (item._id !== targetId && item.id !== targetId)));
    } catch (error) {
      console.error("Failed to delete offence:", error);
    }
  };

  const filteredData = useMemo(() => {
    return offences.filter(item => {
      const matchCategory = selectedCategory === 'All categories' || item.category === selectedCategory;
      const matchSearch = item.offence.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.id && item.id.toString().includes(searchTerm));
      return matchCategory && matchSearch;
    });
  }, [offences, searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'Attendance': return '🕒';
      case 'Performance': return '📊';
      case 'Safety': return '⚠️';
      case 'Conduct': return '👥';
      case 'Conflict of Interest': return '💼';
      case 'Integrity': return '🔒';
      default: return '📌';
    }
  };

  const renderPenalty = (text) => {
    if (!text) return null;
    const parts = text.split(' -> ');
    return (
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {parts.map((part, index) => {
          let badgeClass = 'bg-gray-100 text-gray-700';
          if (part === 'A') badgeClass = 'bg-[#eff6ff] text-[#3b82f6]'; 
          else if (part === 'R') badgeClass = 'bg-[#fefce8] text-[#ca8a04]'; 
          else if (part.startsWith('S')) badgeClass = 'bg-[#fff7ed] text-[#ea580c]'; 
          else if (part === 'D') badgeClass = 'bg-[#fef2f2] text-[#ef4444]'; 

          return (
            <React.Fragment key={index}>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wide ${badgeClass}`}>
                {part}
              </span>
              {index < parts.length - 1 && (
                <span className="text-gray-400 font-medium text-[11px] leading-none">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center font-sans">
        <Loader2 className="animate-spin text-[#0f172a] mb-2" size={32} />
        <p className="text-sm text-gray-600 font-medium">Loading Table of Charges...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8 font-sans relative">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-6 flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0f172a] flex items-center gap-2">
              Table of Charges <Info size={18} className="text-gray-400 cursor-pointer" />
            </h1>
            <p className="text-[13px] text-gray-500 mt-1">Recognised offences and penalty ranges by occurrence</p>
          </div>
          
          <div className="flex items-center gap-3">
            {!showInfo && (
              <button 
                onClick={() => setShowInfo(true)}
                className="flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors mr-2"
              >
                <Info size={14} className="mr-1.5" /> Show how it works <ChevronDown size={14} className="ml-1" />
              </button>
            )}

            {canManage && (
              <>
                <button
                  onClick={() => setActiveModal('addCategory')}
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-full text-[12px] font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  + Add category <Info size={12} className="text-gray-400" />
                </button>
                <button
                  onClick={handleOpenAddOffence}
                  className="bg-[#0f172a] text-white hover:bg-slate-800 px-4 py-2 rounded-full text-[12px] font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  + Add offence <Info size={12} className="text-gray-400" />
                </button>
              </>
            )}
          </div>
        </div>

        {showInfo && (
          <div className="bg-[#f8fafc] border border-gray-200 rounded-lg p-5 mb-6 relative shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-100 text-blue-600 rounded p-1">
                <Info size={16} strokeWidth={2.5} />
              </div>
              <h3 className="font-bold text-[#0f172a] text-sm">How the Table of Charges works</h3>
              <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">HR Manager</span>
            </div>
            
            <button 
              onClick={() => setShowInfo(false)}
              className="absolute top-5 right-5 text-[12px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              Hide
            </button>

            <ul className="list-disc pl-9 text-[13px] text-gray-600 space-y-1.5">
              <li>The 40 recognised offences and the penalty range for each occurrence (1st / 2nd / 3rd), exactly as in the FSMPC disciplinary policy.</li>
              <li>Codes: A = Admonishment (verbal warning), R = Written warning, S# = # working-day suspension without pay (e.g. S10), D = Dismissal.</li>
              <li>A range like "R → S3" means the penalty may fall anywhere from a written warning up to a 3-day suspension. Offences can be added, edited or removed here by an administrator.</li>
            </ul>
          </div>
        )}

        <div className="flex items-center gap-4 mb-4">
          <input
            type="text"
            placeholder="Search offence or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-72 px-4 py-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition-all shadow-sm"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-56 px-4 py-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm cursor-pointer bg-white"
          >
            <option value="All categories">All categories</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a] text-white text-[11px] uppercase tracking-wider font-bold">
                <th className="px-4 py-3.5 w-12 text-center">#</th>
                <th className="px-4 py-3.5 w-48">CATEGORY</th>
                <th className="px-4 py-3.5 auto">OFFENCE</th>
                <th className="px-4 py-3.5 w-32 text-center">1ST</th>
                <th className="px-4 py-3.5 w-32 text-center">2ND</th>
                <th className="px-4 py-3.5 w-32 text-center">3RD+</th>
                {canManage && <th className="px-4 py-3.5 w-28 text-center">MANAGE</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentData.length > 0 ? currentData.map((row, index) => (
                <tr key={row._id || row.id || index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 text-[13px] font-bold text-[#0f172a] text-center">
                    {row.id || (currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="px-4 py-4 text-[13px] text-gray-700 whitespace-nowrap">
                    <span className="mr-2 text-base">{getCategoryIcon(row.category)}</span>
                    {row.category}
                  </td>
                  <td className="px-4 py-4 text-[13px] text-[#0f172a] pr-10">
                    {row.offence}
                    {row.subtext && (
                      <div className="flex items-center gap-1.5 mt-2 bg-red-50 text-red-600 text-[11px] font-semibold px-2 py-1 rounded w-fit border border-red-100">
                        <AlertTriangle size={12} strokeWidth={2.5} />
                        {row.subtext}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-4 text-center">{renderPenalty(row.first)}</td>
                  <td className="px-2 py-4 text-center">{renderPenalty(row.second)}</td>
                  <td className="px-2 py-4 text-center">{renderPenalty(row.third)}</td>
                  
                  {canManage && (
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditOffence(row)}
                          className="px-3 py-1.5 border border-gray-300 rounded text-[11px] font-bold text-[#0f172a] hover:bg-gray-50 transition-colors shadow-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOffence(row)}
                          className="px-3 py-1.5 border border-red-200 bg-red-50 text-red-700 rounded text-[11px] font-bold hover:bg-red-100 transition-colors shadow-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-4 py-12 text-center text-sm text-gray-500">
                    No offences found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-4 mt-8 pb-4">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-1.5 border border-gray-300 rounded-md text-[13px] font-semibold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            &larr; Prev
          </button>
          
          <span className="text-[13px] font-medium text-gray-500">
            Page {currentPage} of {totalPages} &middot; {filteredData.length} offences
          </span>
          
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-4 py-1.5 border border-gray-300 rounded-md text-[13px] font-semibold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Next &rarr;
          </button>
        </div>

      </div>

      {/* MODAL 1: ADD CATEGORY */}
      {activeModal === 'addCategory' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden font-sans">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#0f172a] text-[16px]">Add offence category</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#0f172a] mb-1.5">Category name</label>
                <input
                  type="text"
                  placeholder="e.g. Environmental"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
                <p className="text-[12px] text-gray-500 mt-2 leading-relaxed">
                  The new category becomes available when adding or editing an offence, and in the category filter.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-5 py-2 text-[13px] font-bold text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#0f172a] text-white rounded-[6px] text-[13px] font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 & 3: ADD / EDIT OFFENCE */}
      {(activeModal === 'addOffence' || activeModal === 'editOffence') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[600px] overflow-hidden font-sans">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#0f172a] text-[16px]">
                {activeModal === 'addOffence' ? 'Add offence' : `Edit offence #${selectedOffence?.id || ''}`}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveOffence} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold text-[#0f172a] mb-1.5">Offence description</label>
                <textarea
                  rows={2}
                  value={offenceForm.offence}
                  onChange={(e) => setOffenceForm({...offenceForm, offence: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0f172a] mb-1.5">Category</label>
                <select
                  value={offenceForm.category}
                  onChange={(e) => setOffenceForm({...offenceForm, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] bg-white outline-none cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="flex items-center gap-1 text-[11px] font-bold text-[#0f172a] mb-3">
                  Penalty ranges <Info size={12} className="text-gray-500" />
                </label>
                
                {/* 1st Occurrence */}
                <div className="flex items-center gap-3 mb-3 text-[13px]">
                  <span className="font-bold text-[#0f172a] w-28 text-[12px]">1st occurrence</span>
                  <select
                    value={offenceForm.firstMin}
                    onChange={(e) => setOffenceForm({...offenceForm, firstMin: e.target.value})}
                    className="w-32 px-2 py-1.5 border border-gray-300 rounded bg-white text-[12px] outline-none"
                  >
                    {PENALTY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <span className="text-gray-400 text-[12px]">to</span>
                  <select
                    value={offenceForm.firstMax}
                    onChange={(e) => setOffenceForm({...offenceForm, firstMax: e.target.value})}
                    className="w-32 px-2 py-1.5 border border-gray-300 rounded bg-white text-[12px] outline-none"
                  >
                    {PENALTY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <div className="ml-2 min-w-[70px]">
                    {renderPenalty(buildRangeString(offenceForm.firstMin, offenceForm.firstMax))}
                  </div>
                </div>

                {/* 2nd Occurrence */}
                <div className="flex items-center gap-3 mb-3 text-[13px]">
                  <span className="font-bold text-[#0f172a] w-28 text-[12px]">2nd occurrence</span>
                  <select
                    value={offenceForm.secondMin}
                    onChange={(e) => setOffenceForm({...offenceForm, secondMin: e.target.value})}
                    className="w-32 px-2 py-1.5 border border-gray-300 rounded bg-white text-[12px] outline-none"
                  >
                    {PENALTY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <span className="text-gray-400 text-[12px]">to</span>
                  <select
                    value={offenceForm.secondMax}
                    onChange={(e) => setOffenceForm({...offenceForm, secondMax: e.target.value})}
                    className="w-32 px-2 py-1.5 border border-gray-300 rounded bg-white text-[12px] outline-none"
                  >
                    {PENALTY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <div className="ml-2 min-w-[70px]">
                    {renderPenalty(buildRangeString(offenceForm.secondMin, offenceForm.secondMax))}
                  </div>
                </div>

                {/* 3rd+ Occurrence */}
                <div className="flex items-center gap-3 mb-4 text-[13px]">
                  <span className="font-bold text-[#0f172a] w-28 text-[12px]">3rd+ occurrence</span>
                  <select
                    value={offenceForm.thirdMin}
                    onChange={(e) => setOffenceForm({...offenceForm, thirdMin: e.target.value})}
                    className="w-32 px-2 py-1.5 border border-gray-300 rounded bg-white text-[12px] outline-none"
                  >
                    {PENALTY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <span className="text-gray-400 text-[12px]">to</span>
                  <select
                    value={offenceForm.thirdMax}
                    onChange={(e) => setOffenceForm({...offenceForm, thirdMax: e.target.value})}
                    className="w-32 px-2 py-1.5 border border-gray-300 rounded bg-white text-[12px] outline-none"
                  >
                    {PENALTY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <div className="ml-2 min-w-[70px]">
                    {renderPenalty(buildRangeString(offenceForm.thirdMin, offenceForm.thirdMax))}
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 mb-4">
                  A = verbal warning - R = written warning - S3/S10/S20 = suspension days - D = dismissal.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0f172a] mb-1.5">Special note (optional)</label>
                <input
                  type="text"
                  value={offenceForm.subtext}
                  onChange={(e) => setOffenceForm({...offenceForm, subtext: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-5 py-2 text-[13px] font-bold text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#0f172a] text-white rounded-[6px] text-[13px] font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : activeModal === 'addOffence' ? 'Add' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}