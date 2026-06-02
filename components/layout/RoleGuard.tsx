'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Array<'admin' | 'senior_manager' | 'hr_recruiter' | 'employee'>;
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userRole = (session.user as any).role;

  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
        <h1 className="text-4xl font-bold text-rose-500 mb-4">403 - Access Denied</h1>
        <p className="text-slate-400 mb-6 max-w-md">
          You do not have the required permissions to access this page. Please contact your system administrator if you believe this is an error.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-semibold rounded-lg shadow-lg"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
