'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { 
  Home, Activity, CheckCircle, FileText, Users, BarChart, 
  UserPlus, FileEdit, Settings, HelpCircle, X, CheckSquare,
  Lock, Shield, Database, Calendar
} from 'lucide-react';

export default function Sidebar({ role, isOpen, setIsOpen, user }) {
  const pathname = usePathname();

  // STATE: Hold user data locally to handle missing props
  const [currentUser, setCurrentUser] = useState(user);

  // EFFECT: Fetch user from cookie if the prop is empty
  useEffect(() => {
    if (user && Object.keys(user).length > 0) {
      setCurrentUser(user);
    } else {
      const stipUser = Cookies.get('stip_user');
      if (stipUser) {
        try {
          setCurrentUser(JSON.parse(stipUser));
        } catch (error) {
          console.error('Failed to parse user cookie', error);
        }
      }
    }
  }, [user]);

  // Dynamic Navigation mapped to roles and grouped by categories
  const navigationConfig = {
    CEO: [
      {
        category: 'Main Menu',
        items: [
          { name: 'Dashboard', href: '/dashboard/ceo', icon: Home }
        ]
      },
      {
        category: 'Scorecard',
        items: [
          { name: 'KPA Scorecard', href: '/dashboard/ceo/kpa', icon: Activity },
           { name: 'Quarter Cycles', href: '/dashboard/admin/quarters', icon: Calendar }
        ]
      },
      {
        category: 'Appraisals',
        items: [
          { name: 'Approve Appraisals', href: '/dashboard/ceo/approve', icon: CheckCircle },
          { name: 'All Appraisals', href: '/dashboard/ceo/appraisals', icon: FileText }
        ]
      },
      {
        category: 'Staff',
        items: [
          { name: 'All Staff', href: '/dashboard/ceo/staff', icon: Users }
        ]
      },
      {
        category: 'System',
        items: [
          { name: 'Reports', href: '/dashboard/ceo/reports', icon: BarChart }
        ]
      }
    ],
    HR_ADMIN: [
      {
        category: 'Main Menu',
        items: [
          { name: 'Dashboard', href: '/dashboard/hr', icon: Home }
        ]
      },
      {
        category: 'Appraisals',
        items: [
          { name: 'Review Appraisals', href: '/dashboard/hr/review', icon: CheckSquare },
          { name: 'Submit to CEO', href: '/dashboard/hr/submit', icon: CheckCircle },
          { name: 'All Appraisals', href: '/dashboard/hr/appraisals', icon: Activity }
        ]
      },
      {
        category: 'Staff',
        items: [
          { name: 'Staff Management', href: '/dashboard/hr/staff', icon: Users },
          { name: 'Add New Staff', href: '/dashboard/hr/add-staff', icon: UserPlus },
          { name: 'System Config', href: '/dashboard/hr/system-config', icon: Settings },
          // 🚨 UPGRADED: Added Quarter Cycles to HR Menu
          { name: 'Quarter Cycles', href: '/dashboard/admin/quarters', icon: Calendar }
        ]
      },
      {
        category: 'Awards',
        items: [
          { name: 'Validate Awards', href: '/dashboard/hr/validate', icon: Activity }
        ]
      },
      {
        category: 'Reports',
        items: [
          { name: 'Reports', href: '/dashboard/hr/reports', icon: BarChart }
        ]
      }
    ],
    MANAGER: [
      {
        category: 'Main Menu',
        items: [
          { name: 'Dashboard', href: '/dashboard/manager', icon: Home }
        ]
      },
      {
        category: 'Appraisals',
        items: [
          { name: 'New Appraisal', href: '/dashboard/manager/new', icon: FileEdit },
          { name: 'Drafts', href: '/dashboard/manager/drafts', icon: FileText },
          { name: 'Submissions', href: '/dashboard/manager/submissions', icon: CheckCircle }
        ]
      },
      {
        category: 'Staff',
        items: [
          { name: 'My Team', href: '/dashboard/manager/team', icon: Users }
        ]
      }
    ],
    EMPLOYEE: [
      {
        category: 'My Overview',
        items: [
          { name: 'My Dashboard', href: '/dashboard/employee', icon: Home },
          { name: 'My Profile', href: '/dashboard/employee/profile', icon: UserPlus }
        ]
      },
      {
        category: 'My Appraisal',
        items: [
          { name: 'Appraisal', href: '/dashboard/employee/appraisal', icon: FileText },
           { name: 'My Award', href: '/dashboard/employee/award', icon: Activity },
            { name: 'Acknowledge', href: '/dashboard/employee/acknowledge', icon: CheckSquare }
        ]
      },
      {
        category: 'Information',
        items: [
          // { name: 'STIP Guide & FAQ', href: '/dashboard/employee/info', icon: HelpCircle },
          { name: 'Deadlines', href: '/dashboard/employee/deadlines', icon: Calendar }
        ]
      }
    ],
    ICT_ADMIN: [
      {
        category: 'Main Menu',
        items: [
          { name: 'Dashboard', href: '/dashboard/ict', icon: Home }
        ]
      },
      {
        category: 'System Controls',
        items: [
          { name: 'Scorecard Lock', href: '/dashboard/ict/scorecard', icon: Lock },
          { name: 'User Roles', href: '/dashboard/ict/users', icon: Shield },
          { name: 'Audit Trail', href: '/dashboard/ict/audit', icon: FileText },
          { name: 'Update Password', href: '/dashboard/ict/reset-password', icon: Lock },
          //  { name: 'Panel Permissions', href: '/dashboard/ict/users/roles', icon: Lock },
          { name: 'System Status & E-mail Config', href: '/dashboard/ict/system', icon: Database },
          // 🚨 UPGRADED: Added Quarter Cycles to ICT Menu for override control
          { name: 'Quarter Cycles', href: '/dashboard/admin/quarters', icon: Calendar }
        ]
      },
      {
        category: 'Information',
        items: [
          { name: 'Staff Data', href: '/dashboard/ict/staff', icon: Users },
          { name: 'Reports', href: '/dashboard/ict/reports', icon: BarChart }
        ]
      }
    ]
  };

  // Safe fallback for role routing
  const activeRole = role || currentUser?.role || 'EMPLOYEE';
  const navSections = navigationConfig[activeRole] || navigationConfig.EMPLOYEE;

  // Name extraction
  const fName = currentUser?.personalDetails?.firstName || currentUser?.firstName || '';
  const lName = currentUser?.personalDetails?.lastName || currentUser?.lastName || '';
  const email = currentUser?.email || '';
  
  const fullName = fName || lName ? `${fName} ${lName}`.trim() : (email.split('@')[0] || 'Unknown User');
  const init = fName ? fName[0].toUpperCase() : (fullName[0] || 'U').toUpperCase();

  // Route calculation for the bottom button
  const getBasePath = (r) => {
    if (r === 'HR_ADMIN') return '/dashboard/hr';
    if (r === 'ICT_ADMIN') return '/dashboard/ict';
    return `/dashboard/${r.toLowerCase()}`;
  };
  const profileLink = `${getBasePath(activeRole)}/profile`;

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-[#0D2B55]/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[260px] bg-[#0D2B55] text-white flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shadow-2xl md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Branding Logo Area */}
        <div className="h-[70px] flex items-center justify-between px-[24px] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-[10px]">
            <div className="w-[32px] h-[32px] rounded-[8px] bg-gradient-to-br from-[#C9A84C] to-[#9a7a2e] flex items-center justify-center font-[800] text-[16px] text-[#0D2B55]">
              F
            </div>
            <div>
              <div className="font-[800] text-[16px] tracking-tight leading-none text-white">FSMPC</div>
              <div className="font-[600] text-[10px] text-[#C9A84C] uppercase tracking-widest mt-[2px]">STIP Portal</div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links Grouped by Category */}
        <nav className="flex-1 px-[16px] py-[24px] space-y-[20px] overflow-y-auto custom-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-[6px]">
              <div className="text-[10px] font-[700] uppercase tracking-widest text-white/40 mb-[8px] px-[12px]">
                {section.category}
              </div>
              
              {section.items.map((item) => {
                const isDashboardRoot = item.href.split('/').length === 3; 
                const isActive = isDashboardRoot 
                  ? pathname === item.href 
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                  
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center px-[14px] py-[12px] text-[13px] font-[700] rounded-[10px] transition-all duration-200 group relative overflow-hidden
                      ${isActive 
                        ? 'text-[#C9A84C] bg-[#C9A84C]/20 shadow-sm' 
                        : 'text-white/70 hover:text-[#C9A84C] hover:bg-white/10'} 
                    `}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#C9A84C]"></div>}
                    <Icon className={`w-[18px] h-[18px] mr-[12px] transition-colors ${isActive ? 'text-[#C9A84C]' : 'text-white/50 group-hover:text-[#C9A84C]'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Role Badge - Now fully functional and using the Settings icon */}
        <Link 
          href={profileLink}
          onClick={() => setIsOpen(false)}
          className="p-[20px] bg-black/20 border-t border-white/5 shrink-0 block hover:bg-black/30 transition-colors cursor-pointer group"
        >
          <div className="bg-white/5 border border-white/10 rounded-[10px] p-[12px] flex items-center gap-[12px] group-hover:border-white/20 transition-colors">
            <div className="w-[36px] h-[36px] rounded-full bg-[#C9A84C] flex items-center justify-center text-[#0D2B55] font-[800] text-[14px] shadow-sm shrink-0">
              {init}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-[13px] font-[800] text-white tracking-wide truncate" title={fullName}>
                {fullName}
              </p>
              <p className="text-[10px] font-[700] text-[#C9A84C] uppercase tracking-widest mt-[2px] truncate">
                {activeRole ? activeRole.replace('_', ' ') : 'EMPLOYEE'}
              </p>
            </div>
            {/* The Settings Icon is applied right here */}
            <div className="text-white/30 group-hover:text-[#C9A84C] transition-colors">
              <Settings size={16} />
            </div>
          </div>
        </Link>
      </aside>
    </>
  );
}