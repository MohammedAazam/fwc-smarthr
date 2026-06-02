'use client';

import React, { useState, useEffect } from 'react';
import {
  Building,
  Users,
  DollarSign,
  TrendingUp,
  Award,
  Sparkles,
  ClipboardList,
  UserCheck,
  Zap,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import RoleGuard from '@/components/layout/RoleGuard';

interface KPIState {
  totalEmployees: number;
  totalPayroll: number;
  attendanceRate: number;
  avgRating: number;
}

interface ActivityItem {
  type: string;
  user: string;
  text: string;
  time: string;
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KPIState>({
    totalEmployees: 0,
    totalPayroll: 0,
    attendanceRate: 100,
    avgRating: 4.2,
  });
  const [deptsBreakdown, setDeptsBreakdown] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [insights, setInsights] = useState('');
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/admin');
      const json = await res.json();
      if (res.ok) {
        if (json.kpis) setKpis(json.kpis);
        if (json.deptsBreakdown) setDeptsBreakdown(json.deptsBreakdown);
        if (json.activities) setActivities(json.activities);
        if (json.insights) setInsights(json.insights);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
    fetchDashboardData();
  }, []);

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="space-y-6">
        
        {/* Dashboard Title Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <Building className="h-8 w-8 text-indigo-500" />
            <span>Admin Executive Console</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time corporate metrics, payroll balances, department headcount divisions, and AI analytics.
          </p>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-5">
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/15 text-indigo-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Headcount</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{loading ? '--' : kpis.totalEmployees}</h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-5">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/15 text-emerald-400">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Wage Spend</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">
                {loading ? '--' : `$${kpis.totalPayroll.toLocaleString()}`}
              </h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-5">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/15 text-amber-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Rate</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{loading ? '--' : `${kpis.attendanceRate}%`}</h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-5">
            <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/15 text-rose-400">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Rating Score</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{loading ? '--' : `${kpis.avgRating} / 5`}</h3>
            </div>
          </div>
        </div>

        {/* AI Insights & Department headcounts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Insights Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl lg:col-span-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-base">
                <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
                <span>Gemini HR Insights</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Strategic analytical predictions generated dynamically from database audits.
              </p>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3 min-h-[160px] flex flex-col justify-center">
                {loading ? (
                  <div className="flex flex-col gap-2 animate-pulse">
                    <div className="h-3 bg-slate-800 rounded w-full"></div>
                    <div className="h-3 bg-slate-800 rounded w-[85%]"></div>
                    <div className="h-3 bg-slate-800 rounded w-[90%]"></div>
                  </div>
                ) : insights ? (
                  <div className="text-xs text-slate-350 space-y-2.5 leading-relaxed">
                    {insights.split(/\n/).map((line, idx) => (
                      <p key={idx} className="flex gap-2">
                        <span className="text-indigo-455 text-indigo-400 shrink-0">•</span>
                        <span>{line.replace(/^-\s*/, '')}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic text-center">No insights compiled.</p>
                )}
              </div>
            </div>

            <button
              onClick={fetchDashboardData}
              className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            >
              Recalculate Audits
            </button>
          </div>

          {/* Department Breakdown BarChart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl lg:col-span-2">
            <h3 className="text-slate-100 font-bold text-base mb-6 flex items-center gap-2">
              <ClipboardList className="h-4.5 w-4.5 text-indigo-400" />
              <span>Headcount by Division</span>
            </h3>

            <div className="h-64 w-full">
              {isClient && deptsBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptsBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                    <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Headcount" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  Loading headcount records...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Activity Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-slate-100 font-bold text-base mb-4 flex items-center gap-2">
            <Zap className="h-4.5 w-4.5 text-indigo-400" />
            <span>Recent System Activity Log</span>
          </h3>

          {loading ? (
            <div className="space-y-3 py-4 animate-pulse">
              <div className="h-10 bg-slate-950 rounded-xl w-full"></div>
              <div className="h-10 bg-slate-950 rounded-xl w-full"></div>
              <div className="h-10 bg-slate-950 rounded-xl w-full"></div>
            </div>
          ) : activities.length === 0 ? (
            <p className="text-slate-500 text-xs py-4 text-center">No recent operations logged.</p>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {activities.map((item, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-800/10 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center border text-xs shrink-0 ${
                      item.type === 'leave'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                    }`}>
                      {item.type === 'leave' ? <ClipboardList className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </div>
                    <div>
                      <span className="font-bold text-slate-200">{item.user} </span>
                      <span className="text-slate-450 text-slate-400">{item.text}</span>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-500">
                    {new Date(item.time).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
