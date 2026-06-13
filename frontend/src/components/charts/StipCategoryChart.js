'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Filter } from 'lucide-react';
import api from '../../lib/api'; 

const CATEGORY_CONFIG = [
  { apiName: 'Job Competence', label: 'Job Competence', weight: 10, color: '#8B5CF6', bg: '#F5F3FF', track: '#E2D8FE' },
  { apiName: 'Initiative', label: 'Behaviors', weight: 20, color: '#2563EB', bg: '#EFF6FF', track: '#BFDBFE' },
  { apiName: 'Dependability', label: 'Dependability', weight: 10, color: '#0284C7', bg: '#F0F9FF', track: '#BAE6FD' },
  { apiName: 'Adaptability/Flexibility', label: 'Adaptability', weight: 10, color: '#D97706', bg: '#FFFBEB', track: '#FDE68A' },
  { apiName: 'Safe Working Environment', label: 'Safe Working', weight: 20, color: '#059669', bg: '#ECFDF5', track: '#A7F3D0' },
  { apiName: 'Expected Results', label: 'Delivered Expected', weight: 30, color: '#1E3A8A', bg: '#F8FAFC', track: '#CBD5E1' }
];

export default function StipCategoryChart({ scope = 'org', title = "STIP Award Preview by Category" }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAppraisals, setTotalAppraisals] = useState(0);
  
  // Filter States
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedQuarter, setSelectedQuarter] = useState('ALL');
  
  // 🚨 UPGRADE: Both dropdowns now have state to store dynamic DB results
  const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);
  const [availableQuarters, setAvailableQuarters] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        let queryParams = `scope=org`; // Always enforce organization scope to bypass MongoDB string/ObjectId conflicts
        if (selectedYear !== 'ALL') queryParams += `&year=${selectedYear}`;
        if (selectedQuarter !== 'ALL') queryParams += `&quarter=${selectedQuarter}`;

        const res = await api.get(`/appraisals/analytics/category-averages?${queryParams}`);

        if (res.data?.success) {
          setTotalAppraisals(res.data.count || 0);
          
          const apiData = res.data.data;
          const formattedData = CATEGORY_CONFIG.map(config => {
            const found = apiData.find(d => 
               d.name === config.apiName || 
               d.name === config.label ||
               (config.apiName === 'Initiative' && d.name === 'Behaviors')
            );
            return {
              ...config,
              score: found?.score || 0 
            };
          });
          setData(formattedData);
        } else {
          setData(CATEGORY_CONFIG.map(config => ({ ...config, score: 0 })));
        }
      } catch (err) {
        console.error("Failed to load real-time chart data", err);
        setData(CATEGORY_CONFIG.map(config => ({ ...config, score: 0 })));
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [scope, selectedYear, selectedQuarter]); 

  // 🚨 UPGRADE: Fetch BOTH years and quarters dynamically from the database
  useEffect(() => {
    const fetchDynamicFilters = async () => {
      try {
        const qRes = await api.get('/quarters').catch(() => ({ data: { data: [] } }));
        if (qRes.data?.data) {
          const quartersData = qRes.data.data;
          
          // Extract unique years and sort descending (newest first)
          const years = [...new Set(quartersData.map(q => q.year))];
          if (years.length > 0) setAvailableYears(years.sort((a,b) => b-a));

          // Extract unique quarter names and sort ascending
          const quarters = [...new Set(quartersData.map(q => q.name))];
          if (quarters.length > 0) setAvailableQuarters(quarters.sort());
        }
      } catch (e) {}
    };
    fetchDynamicFilters();
  }, []);

  if (loading && data.length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center bg-white rounded-xl border border-[#E2DDD4]">
        <Loader2 className="animate-spin text-[#0D2B55] w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-[#E2DDD4] shadow-sm w-full h-full relative">
      
      {loading && data.length > 0 && (
         <div className="absolute top-4 right-4"><Loader2 className="w-4 h-4 text-slate-300 animate-spin" /></div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E2DDD4]/60">
        <div className="flex items-center gap-3">
          <div className="bg-[#F8FAFC] border border-[#E2DDD4] p-1.5 rounded-lg flex items-end justify-center gap-0.5 h-9 w-9 shrink-0">
            <div className="w-1 bg-[#8B5CF6] h-3.5 rounded-sm"></div>
            <div className="w-1 bg-[#10B981] h-5 rounded-sm"></div>
            <div className="w-1 bg-[#2563EB] h-4 rounded-sm"></div>
          </div>
          <div>
            <h2 className="text-[15px] font-[800] text-[#0D2B55] leading-tight">{title}</h2>
            <p className="text-[12px] text-[#6b7280] mt-0.5">
              Organization-wide averages for {selectedYear === 'ALL' && selectedQuarter === 'ALL' ? 'All Time' : `${selectedQuarter !== 'ALL' ? selectedQuarter + ' ' : ''}${selectedYear !== 'ALL' ? selectedYear : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#FAF8F4] p-1.5 rounded-lg border border-[#E2DDD4] shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
          
          {/* Dynamic Year Dropdown */}
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-[#E2DDD4] text-[#0D2B55] text-[11px] font-[700] rounded py-1 px-2 outline-none cursor-pointer hover:border-[#0D2B55]/30 transition-colors"
          >
            <option value="ALL">All Years</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          
          {/* 🚨 UPGRADE: Dynamic Quarter Dropdown */}
          <select 
            value={selectedQuarter} 
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="bg-white border border-[#E2DDD4] text-[#0D2B55] text-[11px] font-[700] rounded py-1 px-2 outline-none cursor-pointer hover:border-[#0D2B55]/30 transition-colors"
          >
            <option value="ALL">All Quarters</option>
            {availableQuarters.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
      </div>
      
      <div className="flex flex-col gap-2.5">
        {data.map((item, index) => {
          const contribution = (item.score * item.weight) / 100;
          const fillPercentage = Math.min((item.score / 3) * 100, 100);

          return (
            <div key={index} className="flex justify-between items-center p-3.5 px-4 rounded-lg transition-all" style={{ backgroundColor: item.bg }}>
              <div className="flex-1 mr-8">
                <div className="flex items-baseline gap-1.5 mb-2.5">
                  <span className="font-bold text-[13px]" style={{ color: item.color }}>
                    {item.label}
                  </span>
                  <span className="text-[11px] font-semibold opacity-60" style={{ color: item.color }}>
                    ({item.weight}%)
                  </span>
                </div>
                <div className="h-[6px] w-full rounded-full overflow-hidden" style={{ backgroundColor: item.track }}>
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${fillPercentage}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>

              <div className="text-right flex flex-col justify-center items-end min-w-[100px]">
                <span className="font-bold text-[17px] leading-none mb-1" style={{ color: item.color }}>
                  {item.score.toFixed(2)}
                </span>
                <span className="text-[10px] font-medium text-[#6b7280] leading-none mb-1">
                  avg score
                </span>
                <span className="font-bold text-[10px] leading-none" style={{ color: item.color }}>
                  +{contribution.toFixed(3)} to IPRF
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-[#E2DDD4] flex items-start gap-1.5">
        <span className="text-[#9ca3af] font-serif italic text-[11px] font-bold mt-[1px]">i</span>
        <p className="text-[12px] text-[#6b7280] leading-snug">
          Displaying math for <strong className="text-[#0D2B55]">{totalAppraisals}</strong> fully approved appraisals based on current filters. Weighted contribution = avg score × category weight.
        </p>
      </div>
    </div>
  );
}