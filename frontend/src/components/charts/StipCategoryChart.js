'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../lib/api'; 

const CATEGORY_CONFIG = [
  { apiName: 'Job Competence', label: 'Job Competence', weight: 10, color: '#8B5CF6', bg: '#F5F3FF', track: '#E2D8FE' },
  { apiName: 'Behaviors', label: 'Behaviors', weight: 20, color: '#2563EB', bg: '#EFF6FF', track: '#BFDBFE' },
  { apiName: 'Dependability', label: 'Dependability', weight: 10, color: '#0284C7', bg: '#F0F9FF', track: '#BAE6FD' },
  { apiName: 'Adaptability/Flexibility', label: 'Adaptability', weight: 10, color: '#D97706', bg: '#FFFBEB', track: '#FDE68A' },
  { apiName: 'Safe Working Environment', label: 'Safe Working', weight: 20, color: '#059669', bg: '#ECFDF5', track: '#A7F3D0' },
  { apiName: 'Expected Results', label: 'Delivered Expected', weight: 30, color: '#1E3A8A', bg: '#F8FAFC', track: '#CBD5E1' }
];

export default function StipCategoryChart({ scope = 'org', title = "STIP Award Preview by Category" }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAppraisals, setTotalAppraisals] = useState(0);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        // 🚨 REAL DATA INTEGRATION: Fetch actual DB aggregation results
        const res = await api.get(`/appraisals/analytics/category-averages?scope=${scope}`);
        
        // 🚨 REAL DATA INTEGRATION: Fetch actual count for the footer text
        const countRes = await api.get('/appraisals').catch(() => ({ data: { data: [] } }));
        let count = countRes.data?.data?.filter(a => ['SUBMITTED', 'UNDER_HR_REVIEW', 'WITH_CEO', 'APPROVED'].includes(a.workflow?.status)).length || 0;
        
        // If specific team scope requested, adjust count dynamically
        if (scope === 'team') {
          count = countRes.data?.data?.length || 0; 
        }
        setTotalAppraisals(count);

        if (res.data?.success) {
          const apiData = res.data.data;
          // 🚨 REAL DATA MAPPING: Extracting exact averages per category from backend response
          const formattedData = CATEGORY_CONFIG.map(config => {
            const found = apiData.find(d => d.name === config.apiName);
            return {
              ...config,
              score: found?.score || 0 // Maps securely to real data, explicitly assigning 0 if missing instead of static values
            };
          });
          setData(formattedData);
        } else {
          // Absolute zero fallback if data extraction fails structurally
          setData(CATEGORY_CONFIG.map(config => ({ ...config, score: 0 })));
        }
      } catch (err) {
        console.error("Failed to load real-time chart data", err);
        // Absolute zero fallback for network crash
        setData(CATEGORY_CONFIG.map(config => ({ ...config, score: 0 })));
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [scope]);

  if (loading) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center bg-white rounded-xl border border-[#E2DDD4]">
        <Loader2 className="animate-spin text-slate-400 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-[#E2DDD4] shadow-sm w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-[#F8FAFC] border border-[#E2DDD4] p-1.5 rounded-lg flex items-end justify-center gap-0.5 h-9 w-9">
          <div className="w-1 bg-[#8B5CF6] h-3.5 rounded-sm"></div>
          <div className="w-1 bg-[#10B981] h-5 rounded-sm"></div>
          <div className="w-1 bg-[#2563EB] h-4 rounded-sm"></div>
        </div>
        <div>
          <h2 className="text-[15px] font-[800] text-[#0D2B55] leading-tight">{title}</h2>
          <p className="text-[13px] text-[#6b7280] mt-0.5">
            {scope === 'team' ? 'Team average score per criterion' : 'Organization-wide average score per criterion'}
          </p>
        </div>
      </div>
      
      {/* Custom Bar List */}
      <div className="flex flex-col gap-2.5">
        {data.map((item, index) => {
          // 🚨 REAL CALCULATION: Contribution = Actual average score × strict config weight
          const contribution = (item.score * item.weight) / 100;
          
          // Assuming max possible score is 3.0 based on typical FSM metric scales
          const fillPercentage = Math.min((item.score / 3) * 100, 100);

          return (
            <div key={index} className="flex justify-between items-center p-3.5 px-4 rounded-lg" style={{ backgroundColor: item.bg }}>
              {/* Left Side: Label & Bar */}
              <div className="flex-1 mr-8">
                <div className="flex items-baseline gap-1.5 mb-2.5">
                  <span className="font-bold text-[13px]" style={{ color: item.color }}>
                    {item.label}
                  </span>
                  <span className="text-[11px] font-semibold opacity-60" style={{ color: item.color }}>
                    ({item.weight}%)
                  </span>
                </div>
                {/* Progress Track */}
                <div className="h-[6px] w-full rounded-full overflow-hidden" style={{ backgroundColor: item.track }}>
                  {/* Progress Fill */}
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${fillPercentage}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>

              {/* Right Side: Score Stats */}
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

      {/* Footer Info */}
      <div className="mt-5 pt-4 border-t border-[#E2DDD4] flex items-start gap-1.5">
        <span className="text-[#9ca3af] font-serif italic text-[11px] font-bold mt-[1px]">i</span>
        <p className="text-[12px] text-[#6b7280] leading-snug">
          Average rating each category received across all <strong className="text-[#0D2B55]">{totalAppraisals}</strong> active appraisals {scope === 'team' ? 'in your team' : 'organization-wide'}. Weighted contribution = avg score × category weight.
        </p>
      </div>
    </div>
  );
}