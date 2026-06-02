'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building, Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setError('Invalid email or password. Please try again.');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  const demoAccounts = [
    {
      label: 'Admin',
      email: 'admin@fwc.com',
      pass: 'admin123',
      color:
        'border-rose-500/30 hover:bg-rose-500/5 hover:border-rose-500 text-rose-400',
    },
    {
      label: 'Manager',
      email: 'manager1@fwc.com',
      pass: 'manager123',
      color:
        'border-amber-500/30 hover:bg-amber-500/5 hover:border-amber-500 text-amber-400',
    },
    {
      label: 'HR Recruiter',
      email: 'hr1@fwc.com',
      pass: 'hr123',
      color:
        'border-emerald-500/30 hover:bg-emerald-500/5 hover:border-emerald-500 text-emerald-400',
    },
    {
      label: 'Employee',
      email: 'employee1@fwc.com',
      pass: 'employee123',
      color:
        'border-indigo-500/30 hover:bg-indigo-500/5 hover:border-indigo-500 text-indigo-400',
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-8">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 bg-indigo-600/10 rounded-xl flex items-center justify-center border border-indigo-500/20 mb-3 text-indigo-400">
            <Building className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Welcome to FWC SmartHR</h1>
          <p className="text-slate-400 text-sm mt-1">
            AI-Powered Human Resource Management System
          </p>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-400 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail className="h-5 w-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-colors"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-semibold rounded-xl text-sm disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Demo Credentials Quick-Select */}
        <div className="mt-8 border-t border-slate-800/80 pt-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-4">
            Quick Demo Login (Click to fill)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.label}
                type="button"
                onClick={() => handleDemoLogin(acc.email, acc.pass)}
                className={`py-2 px-3 border rounded-xl text-left text-xs transition-all flex flex-col gap-0.5 ${acc.color}`}
              >
                <span className="font-semibold text-slate-200">{acc.label}</span>
                <span className="text-[10px] opacity-80 truncate">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading Login Portal...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
