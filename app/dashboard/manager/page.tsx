'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users,
  CalendarDays,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import RoleGuard from '@/components/layout/RoleGuard';

interface HeatmapDay {
  date: string;
  status: 'present' | 'absent' | 'late' | 'wfh' | 'holiday';
}

interface HeatmapItem {
  name: string;
  days: HeatmapDay[];
}

interface PendingLeave {
  _id: string;
  userId: {
    _id: string;
    name: string;
    designation: string;
    department: string;
  };
  type: string;
  from: string;
  to: string;
  reason: string;
  status: string;
}

export default function ManagerDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUser = session?.user as any;

  // Manager metrics
  const [headcount, setHeadcount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [teamPerf, setTeamPerf] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapItem[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/manager');
      const json = await res.json();
      if (res.ok) {
        setHeadcount(json.headcount || 0);
        setPendingCount(json.pendingLeavesCount || 0);
        setTeamPerf(json.teamPerformance || []);
        setHeatmapData(json.heatmap || []);
      }

      // Fetch pending leaves list details
      const leavesRes = await fetch('/api/leaves?pendingOnly=true');
      const leavesJson = await leavesRes.json();
      if (leavesRes.ok) {
        setPendingLeaves(leavesJson || []);
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

  // Quick Approval actions
  const handleApprovalAction = async (leaveId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveId, status, comment: 'Processed via manager dashboard quick action.' }),
      });

      if (res.ok) {
        alert(`Leave request ${status} successfully.`);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const statusColors: Record<string, string> = {
    present: 'bg-emerald-500 border-emerald-600',
    late: 'bg-amber-500 border-amber-600',
    absent: 'bg-rose-500 border-rose-600',
    wfh: 'bg-indigo-500 border-indigo-600',
    holiday: 'bg-slate-700 border-slate-800',
  };

  return (
    <RoleGuard allowedRoles={['admin', 'senior_manager']}>
      <div className="space-y-6">
        
        {/* Dashboard Title Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="h-8 w-8 text-indigo-500" />
            <span>Manager Dashboard ({currentUser?.department || 'Engineering'})</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Oversee department headcounts, check staff weekly attendance tracks, and approve leave requests.
          </p>
        </div>

        {/* Manager KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-5">
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/15 text-indigo-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Headcount</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{loading ? '--' : headcount}</h3>
            </div>
          </div>

          <div
            onClick={() => router.push('/leaves')}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-5 cursor-pointer hover:border-indigo-500/30 transition-all group"
          >
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/15 text-amber-400 group-hover:scale-105 transition-transform">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Approvals</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{loading ? '--' : pendingCount}</h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-5">
            <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/15 text-rose-400">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evaluation Period</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">Q2 2026</h3>
            </div>
          </div>
        </div>

        {/* Heatmap & Performance Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Team Attendance Heatmap (Last 7 Days) */}
          <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
            <h3 className="text-slate-100 font-bold text-base mb-4 flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-indigo-400" />
              <span>Weekly Attendance Heatmap</span>
            </h3>

            {loading ? (
              <div className="py-20 text-center text-slate-500 text-sm animate-pulse">Loading heatmap...</div>
            ) : heatmapData.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-sm">No attendance logged for team members.</div>
            ) : (
              <div className="space-y-3 min-w-[500px]">
                {/* Heatmap rows */}
                {heatmapData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between py-1 border-b border-slate-800/40 last:border-0 pb-2">
                    <span className="text-xs font-semibold text-slate-350 truncate w-32">{item.name}</span>
                    <div className="flex gap-2">
                      {item.days.map((day, dIdx) => (
                        <div
                          key={dIdx}
                          className={`h-7 w-12 rounded border text-[9px] font-black uppercase flex items-center justify-center text-white ${
                            statusColors[day.status] || statusColors.holiday
                          }`}
                          title={`${item.name} on ${day.date}: ${day.status}`}
                        >
                          {day.date}
                        </div>
                      ))}
                      {item.days.length === 0 && (
                        <span className="text-[10px] text-slate-600 italic">No logs this week</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team Performance Bar Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-slate-100 font-bold text-base mb-4 flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-indigo-400" />
              <span>Average Goal Completion</span>
            </h3>

            <div className="h-64 w-full">
              {isClient && teamPerf.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamPerf} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                    <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} name="Avg Score (%)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  Loading goals breakdown...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Pending Approvals Checklist */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-slate-100 font-bold text-base mb-4 flex items-center gap-2">
            <CalendarDays className="h-4.5 w-4.5 text-indigo-400" />
            <span>Leave Requests Quick Decisions</span>
          </h3>

          {loading ? (
            <div className="py-6 space-y-3 animate-pulse">
              <div className="h-12 bg-slate-950 rounded-xl w-full"></div>
              <div className="h-12 bg-slate-950 rounded-xl w-full"></div>
            </div>
          ) : pendingLeaves.length === 0 ? (
            <p className="text-slate-500 text-xs py-4 text-center">No pending leaves to process in your department.</p>
          ) : (
            <div className="space-y-4">
              {pendingLeaves.slice(0, 5).map((leave) => {
                const diffDays = Math.ceil(
                  Math.abs(new Date(leave.to).getTime() - new Date(leave.from).getTime()) / (1000 * 60 * 60 * 24)
                ) + 1;

                return (
                  <div key={leave._id} className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-200">{leave.userId?.name}</span>
                        <span className="text-xs text-slate-400">({leave.userId?.designation})</span>
                      </div>
                      <p className="text-xs text-indigo-400 mt-1">
                        Requesting {leave.type.toUpperCase()} leave: {new Date(leave.from).toLocaleDateString()} - {new Date(leave.to).toLocaleDateString()} ({diffDays} days)
                      </p>
                      <p className="text-xs text-slate-500 mt-1 italic">Reason: "{leave.reason}"</p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprovalAction(leave._id, 'rejected')}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-455 text-rose-400 flex items-center gap-1 text-xs transition-colors active:scale-95"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleApprovalAction(leave._id, 'approved')}
                        className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-emerald-455 text-emerald-400 flex items-center gap-1 text-xs transition-colors active:scale-95"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
