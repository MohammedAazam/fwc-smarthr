'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Menu, User as UserIcon, Bell } from 'lucide-react';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const { data: session } = useSession();

  const user = session?.user as any;
  const userName = user?.name || 'Guest User';
  const userRole = user?.role || 'employee';
  const userDept = user?.department || '';
  const photoUrl = user?.photoUrl;

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    senior_manager: 'Senior Manager',
    hr_recruiter: 'HR Recruiter',
    employee: 'Employee',
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    senior_manager: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    hr_recruiter: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    employee: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Mobile Menu Trigger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 lg:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Breadcrumb/Context Indicator */}
      <div className="hidden sm:flex items-center gap-2">
        <span className="text-slate-400 text-sm">Workspace</span>
        <span className="text-slate-600">/</span>
        <span className="text-slate-200 text-sm font-medium">FWC SmartHR Dashboard</span>
      </div>

      {/* User Information Summary */}
      <div className="flex items-center gap-4 ml-auto">
        <button className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-indigo-500 rounded-full"></span>
        </button>

        <div className="h-8 w-px bg-slate-800"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-slate-100">{userName}</p>
            <div className="flex items-center gap-1.5 justify-end mt-0.5">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleColors[userRole] || roleColors.employee}`}>
                {roleLabels[userRole] || 'Employee'}
              </span>
              {userDept && (
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700/50">
                  {userDept}
                </span>
              )}
            </div>
          </div>

          {/* Profile Photo */}
          <div className="h-10 w-10 rounded-full border border-slate-700 bg-slate-800 overflow-hidden flex items-center justify-center relative">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={userName} className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-5 w-5 text-slate-400" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
