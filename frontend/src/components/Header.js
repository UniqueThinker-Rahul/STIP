'use client';

import { Menu, LogOut, Bell, ChevronDown, Lock, Unlock, Clock, BarChart2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import api from '../lib/api';

export default function Header({ setIsOpen, user }) {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  // Real-time Metrics State
  const [metrics, setMetrics] = useState({ cpPct: null, locked: false });

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout'); 
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      Cookies.remove('stip_token');
      Cookies.remove('stip_user');
      router.push('/');
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real-time company metrics for the header strip
  useEffect(() => {
    const fetchHeaderMetrics = async () => {
      try {
        const res = await api.get('/company-metrics/2026').catch(() => ({ data: { data: null } }));
        if (res.data?.data) {
          setMetrics({
            cpPct: res.data.data.cpPct,
            locked: res.data.data.locked
          });
        }
      } catch (error) {
        console.error('Failed to load header metrics', error);
      }
    };
    fetchHeaderMetrics();
  }, []);

  // 🚨 BULLETPROOF NAME EXTRACTION
  const fName = user?.personalDetails?.firstName || user?.firstName || '';
  const lName = user?.personalDetails?.lastName || user?.lastName || '';
  const email = user?.email || '';
  
  const displayName = fName || lName ? `${fName} ${lName}`.trim() : (email.split('@')[0] || 'User');
  const greetingName = fName || (email.split('@')[0] || 'User');
  const role = user?.role || 'EMPLOYEE';
  const init = fName ? fName[0].toUpperCase() : (displayName[0] || 'U').toUpperCase();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Determine if we should show the Lock/Unlock status (Only for CEO and HR_ADMIN)
  const showLockStatus = role === 'CEO' || role === 'HR_ADMIN';

  return (
    <header className="flex items-center justify-between h-[70px] px-6 bg-white border-b border-[#E2DDD4] shadow-[0_2px_10px_rgba(0,0,0,0.02)] sticky top-0 z-40 transition-all">
      
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-[#6b7280] rounded-[8px] md:hidden hover:bg-[#FAF8F4] hover:text-[#0D2B55] transition-colors"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-[18px] font-[800] text-[#0D2B55] hidden sm:block tracking-tight">
          {getGreeting()}, <span className="text-[#C9A84C] capitalize">{greetingName}</span>
        </h1>
      </div>

      {/* 🚨 NEW: Real-Time Central Information Strip */}
      <div className="hidden lg:flex items-center bg-[#FAF8F4] border border-[#E2DDD4] rounded-full px-[16px] py-[6px] shadow-sm">
        
        {/* CP Score */}
        <div className="flex items-center gap-[6px] pr-[14px] border-r border-[#E2DDD4]">
          <BarChart2 size={14} className="text-[#0D2B55]" />
          <span className="text-[11px] font-[700] text-[#6b7280] uppercase tracking-wider">CP Score:</span>
          <span className="text-[12px] font-[800] text-[#0D2B55]">
            {metrics.cpPct !== null ? `${metrics.cpPct.toFixed(2)}%` : '—'}
          </span>
        </div>

        {/* Q3 Deadline */}
        <div className="flex items-center gap-[6px] px-[14px] border-r border-[#E2DDD4]">
          <Clock size={14} className="text-[#92400E]" />
          <span className="text-[11px] font-[700] text-[#6b7280] uppercase tracking-wider">Q3 Deadline:</span>
          <span className="text-[12px] font-[800] text-[#92400E]">30 Sep 2026</span>
        </div>

        {/* Conditional Scorecard Lock Status (CEO & HR Only) */}
        {showLockStatus && (
          <div className="flex items-center gap-[6px] pl-[14px]">
            {metrics.locked ? (
              <>
                <Lock size={14} className="text-[#059669]" />
                <span className="text-[12px] font-[800] text-[#059669]">Scorecard Locked</span>
              </>
            ) : (
              <>
                <Unlock size={14} className="text-[#D97706]" />
                <span className="text-[12px] font-[800] text-[#D97706]">Scorecard Unlocked</span>
              </>
            )}
          </div>
        )}
        
        {/* Fill space if lock status is hidden to maintain layout balance */}
        {!showLockStatus && (
          <div className="pl-[14px] text-[11px] font-[700] text-[#6b7280] uppercase tracking-wider">
            CY2026 Active
          </div>
        )}

      </div>

      <div className="flex items-center gap-[16px]">
        {/* Notifications */}
        <button className="w-[36px] h-[36px] rounded-full bg-[#FAF8F4] border border-[#E2DDD4] flex items-center justify-center text-[#0D2B55] hover:bg-[#E2DDD4] transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-[8px] right-[10px] w-[8px] h-[8px] bg-[#DC2626] rounded-full border-2 border-white"></span>
        </button>

        <div className="h-[30px] w-[1px] bg-[#E2DDD4] hidden sm:block"></div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className={`flex items-center gap-[10px] p-[4px_12px_4px_4px] rounded-full transition-colors border ${showDropdown ? 'bg-[#FAF8F4] border-[#E2DDD4]' : 'bg-transparent border-transparent hover:bg-[#FAF8F4] hover:border-[#E2DDD4]'}`}
          >
            <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-[#0D2B55] to-[#1E40AF] flex items-center justify-center text-white font-[800] text-[13px] shadow-sm shrink-0">
              {init}
            </div>
            <div className="hidden sm:flex flex-col items-start max-w-[120px]">
              <span className="text-[13px] font-[800] text-[#0f1923] leading-tight truncate w-full text-left capitalize">{displayName}</span>
              <span className="text-[10px] font-[700] text-[#C9A84C] uppercase tracking-wider truncate w-full text-left">{role.replace('_', ' ')}</span>
            </div>
            <ChevronDown size={14} className={`text-[#6b7280] hidden sm:block transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-3 w-[240px] bg-white border border-[#E2DDD4] rounded-[12px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] py-[8px] animate-in fade-in slide-in-from-top-2 z-50">
              <div className="px-[16px] py-[12px] border-b border-[#E2DDD4] mb-[4px] bg-[#FAF8F4]/50">
                <div className="text-[10px] font-[700] text-[#6b7280] uppercase tracking-widest mb-[4px]">Signed in as</div>
                <div className="text-[14px] font-[800] text-[#0D2B55] truncate capitalize">{displayName}</div>
                <div className="text-[12px] font-[500] text-[#6b7280] truncate">{email || 'No email provided'}</div>
              </div>
              
              <div className="px-[8px] py-[4px]">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-[10px] px-[12px] py-[10px] text-[13px] font-[700] text-[#DC2626] rounded-[8px] hover:bg-[#FEF2F2] transition-colors text-left"
                >
                  <LogOut size={16} /> Sign out securely
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}