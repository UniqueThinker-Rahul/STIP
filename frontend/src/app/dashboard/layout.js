'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

  // Load the user from cookies when the layout mounts
  useEffect(() => {
    const userCookie = Cookies.get('stip_user');
    if (!userCookie) {
      router.push('/'); // Protect the dashboard from logged-out users
      return;
    }
    setUser(JSON.parse(userCookie));
  }, [router]);

  if (!user) return null; // Show nothing while checking security

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      
      {/* Universal Sidebar Component */}
      <Sidebar 
        role={user.role} 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        
        {/* Universal Header Component */}
        <Header 
          setIsOpen={setSidebarOpen} 
          user={user} 
        />
        
        {/* This is where the actual page content (like the CEO Dashboard) gets injected */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6 px-4 sm:px-6 md:px-8">
            {children}
          </div>
        </main>
        
      </div>
    </div>
  );
}