'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Filter, Download } from 'lucide-react';
import api from '../../lib/api'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  
  const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);
  const [dbQuarters, setDbQuarters] = useState([]); // Store raw DB objects to calculate status

  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        let queryParams = `scope=org`; 
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

  useEffect(() => {
    const fetchDynamicFilters = async () => {
      try {
        const qRes = await api.get('/quarters').catch(() => ({ data: { data: [] } }));
        if (qRes.data?.data) {
          const quartersData = qRes.data.data;
          setDbQuarters(quartersData); // Save full objects for status calculation
          
          const years = [...new Set(quartersData.map(q => q.year))];
          if (years.length > 0) setAvailableYears(years.sort((a,b) => b-a));
        }
      } catch (e) {}
    };
    fetchDynamicFilters();
  }, []);

  // 🚨 UPGRADE: Dynamic Quarter Filtering & Status Calculation
  const filteredQuarters = selectedYear === 'ALL' 
    ? dbQuarters // If all years, show everything
    : dbQuarters.filter(q => q.year?.toString() === selectedYear.toString());

  // Eliminate duplicate names if multiple years are selected to keep dropdown clean
  const uniqueQuarterOptions = [];
  const seenNames = new Set();
  
  filteredQuarters.forEach(q => {
    if (!seenNames.has(q.name)) {
      seenNames.add(q.name);
      
      // Calculate real-time status
      const start = new Date(q.startDate); start.setHours(0,0,0,0);
      const end = new Date(q.endDate); end.setHours(23,59,59,999);
      const now = new Date();
      
      const isFuture = now < start;
      const isExpired = now > end;
      
      let lockStatus = '';
      if (q.isLocked || (isExpired && !q.forceUnlock)) lockStatus = 'Locked';
      else if (isFuture) lockStatus = 'Upcoming';
      else if (q.forceUnlock) lockStatus = 'Open (Override)';
      else lockStatus = 'Active';

      uniqueQuarterOptions.push({
        name: q.name,
        status: lockStatus
      });
    }
  });
  
  // Sort Q1, Q2, Q3, Q4
  uniqueQuarterOptions.sort((a, b) => a.name.localeCompare(b.name));

  const handleDownloadPDF = () => {
    setIsDownloading(true);
    try {
      const doc = new jsPDF();
      
      const timeContext = selectedYear === 'ALL' && selectedQuarter === 'ALL' 
        ? 'All Time' 
        : `${selectedQuarter !== 'ALL' ? selectedQuarter + ' ' : ''}${selectedYear !== 'ALL' ? selectedYear : ''}`;
        
      const reportTitle = `STIP Category Analytics - ${timeContext}`;

      // Header
      doc.setFontSize(16);
      doc.setTextColor(13, 43, 85); 
      doc.text(reportTitle, 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Total Approved Appraisals Analyzed: ${totalAppraisals}`, 14, 28);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34);

      // Table Data
      const tableColumns = ["Category", "Weight (%)", "Average Score (Out of 3.0)", "Contribution to IPRF"];
      const tableRows = data.map(item => {
        const contribution = (item.score * item.weight) / 100;
        return [
          item.label,
          `${item.weight}%`,
          item.score.toFixed(2),
          `+${contribution.toFixed(3)}`
        ];
      });

      // Calculate Totals for Footer
      let totalIprf = 0;
      data.forEach(item => { totalIprf += (item.score * item.weight) / 100; });

      tableRows.push([
        { content: 'PROJECTED TOTAL IPRF SCORE', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: totalIprf.toFixed(3), styles: { fontStyle: 'bold', textColor: [22, 163, 74] } } 
      ]);

      autoTable(doc, {
        startY: 42,
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [13, 43, 85], textColor: 255, fontSize: 10, fontStyle: 'bold' },
        bodyStyles: { fontSize: 10, textColor: 50 },
        alternateRowStyles: { fillColor: [245, 248, 250] },
      });

      doc.save(`STIP_Category_Analytics_${timeContext.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("PDF Generation Failed", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

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

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E2DDD4]/60">
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Filters */}
          <div className="flex items-center gap-2 bg-[#FAF8F4] p-1.5 rounded-lg border border-[#E2DDD4] shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            
            <select 
              value={selectedYear} 
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedQuarter('ALL'); // Reset quarter when year changes to prevent invalid filters
              }}
              className="bg-white border border-[#E2DDD4] text-[#0D2B55] text-[11px] font-[700] rounded py-1 px-2 outline-none cursor-pointer hover:border-[#0D2B55]/30 transition-colors"
            >
              <option value="ALL">All Years</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            
            <select 
              value={selectedQuarter} 
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="bg-white border border-[#E2DDD4] text-[#0D2B55] text-[11px] font-[700] rounded py-1 px-2 outline-none cursor-pointer hover:border-[#0D2B55]/30 transition-colors min-w-[120px]"
            >
              <option value="ALL">All Quarters</option>
              {/* 🚨 UPGRADE: Render options with dynamic status context */}
              {uniqueQuarterOptions.map(q => (
                <option key={q.name} value={q.name}>
                  {q.name} {selectedYear !== 'ALL' ? `— ${q.status}` : ''}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleDownloadPDF}
            disabled={isDownloading || totalAppraisals === 0}
            className="flex items-center gap-1.5 bg-[#0D2B55] hover:bg-[#1a3d6e] text-white text-[11px] font-[700] py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export PDF
          </button>
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