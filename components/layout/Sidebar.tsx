'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  FileSpreadsheet,
  Award,
  Briefcase,
  LogOut,
  Building,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userRole = (session?.user as any)?.role || 'employee';

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'senior_manager', 'hr_recruiter', 'employee'],
    },
    {
      name: 'Employees',
      href: '/employees',
      icon: Users,
      roles: ['admin', 'senior_manager', 'hr_recruiter'],
    },
    {
      name: 'Attendance',
      href: '/attendance',
      icon: CalendarCheck,
      roles: ['admin', 'senior_manager', 'employee'],
    },
    {
      name: 'Leaves',
      href: '/leaves',
      icon: CalendarDays,
      roles: ['admin', 'senior_manager', 'hr_recruiter', 'employee'],
    },
    {
      name: 'Payroll',
      href: '/payroll',
      icon: FileSpreadsheet,
      roles: ['admin', 'employee'],
    },
    {
      name: 'Performance',
      href: '/performance',
      icon: Award,
      roles: ['admin', 'senior_manager', 'employee'],
    },
    {
      name: 'Recruitment',
      href: '/recruitment',
      icon: Briefcase,
      roles: ['admin', 'hr_recruiter'],
    },
  ];

  const filteredItems = menuItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2 text-indigo-400 font-bold text-xl">
          <Building className="h-6 w-6" />
          <span>FWC SmartHR</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {filteredItems.map((item) => {
          // Check if current path matches item.href
          // Handle /dashboard sub-paths matches
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href)) ||
            (item.href === '/dashboard' && pathname.startsWith('/dashboard/'));

          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm text-rose-400 hover:bg-rose-500/10 transition-all duration-200 group"
        >
          <LogOut className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
