'use client';

import { Menu, LogOut, Bell, ChevronDown, Lock, Unlock, Clock, BarChart2, CheckCircle, Info, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import api from '../lib/api';

// 🚨 UPGRADE: Format timestamp into a proper, readable exact Date & Time
const formatExactTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-GB', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

export default function Header({ setIsOpen, user }) {
  const router = useRouter();
  
  // Dropdown States
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  
  // Real-time Metrics State
  const [metrics, setMetrics] = useState({ cpPct: null, locked: false });
  
  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Dynamic Quarter State
  const [activeQuarterData, setActiveQuarterData] = useState({
    name: 'Loading...',
    deadline: '...'
  });

  // Dynamic Year Extraction
  const currentYear = new Date().getFullYear();

  const handleLogout = async () => {
    try {
      // Clear sticky filters and local data on logout
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
      }
      await api.post('/auth/logout'); 
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      Cookies.remove('stip_token');
      Cookies.remove('stip_user');
      router.push('/');
    }
  };
  

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Header Data (Metrics, Quarters, AND Notifications)
  useEffect(() => {
    const fetchHeaderData = async () => {
      try {
        const [metricsRes, quartersRes, notifsRes] = await Promise.all([
          api.get(`/company-metrics/${currentYear}`).catch(() => ({ data: { data: null } })),
          api.get('/quarters').catch(() => ({ data: { data: [] } })),
          api.get('/notifications').catch(() => ({ data: { data: [] } }))
        ]);

        if (metricsRes.data?.data) {
          setMetrics({
            cpPct: metricsRes.data.data.cpPct,
            locked: metricsRes.data.data.locked
          });
        }

        const dbQuarters = quartersRes.data?.data || [];
        const now = new Date();
        const activeQ = dbQuarters.find(q => {
          const start = new Date(q.startDate); start.setHours(0,0,0,0);
          const end = new Date(q.endDate); end.setHours(23,59,59,999);
          return now >= start && now <= end && !q.isLocked;
        });

        if (activeQ) {
          setActiveQuarterData({
            name: `${activeQ.name} Deadline:`,
            deadline: new Date(activeQ.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          });
        } else {
          setActiveQuarterData({ name: 'Status:', deadline: 'No Active Quarters' });
        }

        const fetchedNotifs = notifsRes.data?.data || [];
        setNotifications(fetchedNotifs);
        setUnreadCount(fetchedNotifs.filter(n => !n.isRead).length);

      } catch (error) {
        console.error('Failed to load header data', error);
      }
    };
    
    fetchHeaderData();
    
    const interval = setInterval(() => {
      api.get('/notifications').then(res => {
        const fetchedNotifs = res.data?.data || [];
        setNotifications(fetchedNotifs);
        setUnreadCount(fetchedNotifs.filter(n => !n.isRead).length);
      }).catch(() => {});
    }, 60000);

    return () => clearInterval(interval);
  }, []); 

  // Handle clicking a single notification
  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.patch(`/notifications/${notif._id}/read`);
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) { console.error("Failed to mark notification as read", err); }
    }
    setShowNotifs(false);
    
    if (notif.actionUrl) {
      const path = notif.actionUrl.startsWith('http') 
          ? new URL(notif.actionUrl).pathname 
          : notif.actionUrl;
      router.push(path);
    }
  };

  // Handle marking all as read
  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) { console.error("Failed to mark all as read", err); }
  };

  // Handle CLEAR ALL notifications
  const handleClearAll = async (e) => {
    e.stopPropagation();
    try {
      await api.delete('/notifications/clear-all');
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) { console.error("Failed to clear notifications", err); }
  };

  // Handle CLEAR INDIVIDUAL notification
  const handleClearNotification = async (e, id) => {
    e.stopPropagation(); 
    try {
      await api.delete(`/notifications/${id}`);
      
      setNotifications(prev => {
        const updatedNotifs = prev.filter(n => n._id !== id);
        setUnreadCount(updatedNotifs.filter(n => !n.isRead).length);
        return updatedNotifs;
      });
      
    } catch (err) { console.error("Failed to clear notification", err); }
  };

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

      <div className="hidden lg:flex items-center bg-[#FAF8F4] border border-[#E2DDD4] rounded-full px-[16px] py-[6px] shadow-sm">
        
        <div className="flex items-center gap-[6px] pr-[14px] border-r border-[#E2DDD4]">
          <BarChart2 size={14} className="text-[#0D2B55]" />
          <span className="text-[11px] font-[700] text-[#6b7280] uppercase tracking-wider">CP Score:</span>
          <span className="text-[12px] font-[800] text-[#0D2B55]">
            {metrics.cpPct !== null ? `${metrics.cpPct.toFixed(2)}%` : '—'}
          </span>
        </div>

        <div className="flex items-center gap-[6px] px-[14px] border-r border-[#E2DDD4]">
          <Clock size={14} className="text-[#92400E]" />
          <span className="text-[11px] font-[700] text-[#6b7280] uppercase tracking-wider">{activeQuarterData.name}</span>
          <span className="text-[12px] font-[800] text-[#92400E]">{activeQuarterData.deadline}</span>
        </div>

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
        
        {!showLockStatus && (
          <div className="pl-[14px] text-[11px] font-[700] text-[#6b7280] uppercase tracking-wider">
            CY{currentYear} Active
          </div>
        )}

      </div>

      <div className="flex items-center gap-[16px]">
        
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifs(!showNotifs)}
            className={`w-[36px] h-[36px] rounded-full flex items-center justify-center transition-colors relative ${showNotifs ? 'bg-[#E2DDD4] text-[#0D2B55]' : 'bg-[#FAF8F4] border border-[#E2DDD4] text-[#0D2B55] hover:bg-[#E2DDD4]'}`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-[-2px] right-[-2px] bg-[#DC2626] text-white text-[9px] font-[800] min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-[4px] border-2 border-white shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-3 w-[350px] bg-white border border-[#E2DDD4] rounded-[12px] shadow-[0_10px_40px_rgba(0,0,0,0.12)] flex flex-col animate-in fade-in slide-in-from-top-2 z-50 overflow-hidden">
              
              <div className="px-[16px] py-[12px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex justify-between items-center">
                <div className="text-[13px] font-[800] text-[#0D2B55]">Notifications</div>
                
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[10px] font-[700] text-[#1E40AF] hover:underline bg-[#DBEAFE] px-[8px] py-[3px] rounded-full">
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={handleClearAll} className="text-[10px] font-[700] text-[#991B1B] hover:underline bg-[#FEE2E2] px-[8px] py-[3px] rounded-full">
                      Clear all
                    </button>
                  )}
                </div>
              </div>
              
              <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-[30px] text-center text-[#6b7280] text-[12px]">
                    <Bell size={24} className="mx-auto mb-[8px] opacity-20" />
                    You have no new notifications.
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {notifications.map((notif) => (
                      <div 
                        key={notif._id} 
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-[14px_16px] border-b border-[#E2DDD4] last:border-0 cursor-pointer transition-colors flex gap-[12px] ${!notif.isRead ? 'bg-[#F0F9FF] hover:bg-[#E0F2FE]' : 'bg-white hover:bg-[#FAF8F4]'}`}
                      >
                        <div className="mt-[2px] shrink-0">
                          {notif.type?.includes('APPROVED') ? <CheckCircle size={16} className="text-[#059669]" /> :
                           notif.type?.includes('REJECTED') ? <Info size={16} className="text-[#DC2626]" /> :
                           <Bell size={16} className="text-[#1E40AF]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[12px] leading-tight mb-[4px] ${!notif.isRead ? 'font-[800] text-[#0D2B55]' : 'font-[700] text-[#4b5563]'}`}>
                            {notif.title}
                          </div>
                          <div className={`text-[11px] leading-snug line-clamp-2 ${!notif.isRead ? 'text-[#334155]' : 'text-[#6b7280]'}`}>
                            {notif.message}
                          </div>
                          {/* 🚨 UPGRADE: Implemented Exact Date and Time Display */}
                          <div className="text-[10px] text-[#94a3b8] mt-[6px] font-[500]">
                            {formatExactTime(notif.createdAt)}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end justify-between shrink-0 h-full py-1">
                          {!notif.isRead ? (
                            <div className="w-[8px] h-[8px] bg-[#3B82F6] rounded-full shadow-sm mb-2"></div>
                          ) : (
                            <div className="w-[8px] h-[8px] mb-2"></div> 
                          )}
                          <button 
                            onClick={(e) => handleClearNotification(e, notif._id)}
                            className="text-[#94a3b8] hover:text-[#DC2626] hover:bg-red-50 p-1 rounded-md transition-colors"
                            title="Delete Notification"
                          >
                            <X size={14} />
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-[8px] border-t border-[#E2DDD4] bg-white text-center">
                 <div className="text-[10px] text-[#6b7280]">Real-time notification engine active</div>
              </div>
            </div>
          )}
        </div>

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