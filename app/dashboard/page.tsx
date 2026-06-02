'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardRouter() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session) {
      const role = (session.user as any).role;
      if (role === 'admin') {
        router.push('/dashboard/admin');
      } else if (role === 'senior_manager') {
        router.push('/dashboard/manager');
      } else if (role === 'hr_recruiter') {
        router.push('/dashboard/hr');
      } else {
        router.push('/dashboard/employee');
      }
    }
  }, [status, session, router]);

  return (
    <div className="flex h-[60vh] items-center justify-center bg-transparent text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
        <p className="text-slate-400 text-sm font-medium">Routing to your dashboard...</p>
      </div>
    </div>
  );
}
