'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  CalendarDays,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  UserCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';
import RoleGuard from '@/components/layout/RoleGuard';

interface LeaveRequest {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    department: string;
    designation: string;
  };
  type: 'casual' | 'sick' | 'earned' | 'unpaid';
  from: string;
  to: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  comment?: string;
  createdAt: string;
}

export default function LeavesPage() {
  const { data: session } = useSession();
  const currentUser = session?.user as any;
  const isManagerOrAdmin = ['admin', 'senior_manager'].includes(currentUser?.role || '');

  // Tabs
  const [activeTab, setActiveTab] = useState<'my_requests' | 'pending_approvals' | 'team_calendar'>('my_requests');

  // Employee data states
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState({
    allowed: { casual: 12, sick: 10, earned: 15, unpaid: 999 },
    used: { casual: 0, sick: 0, earned: 0, unpaid: 0 },
    remaining: { casual: 12, sick: 10, earned: 15, unpaid: 999 },
  });

  // Approvals states
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [actionComment, setActionComment] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Calendar states
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarLeaves, setCalendarLeaves] = useState<LeaveRequest[]>([]);

  // Form states
  const [formType, setFormType] = useState<'casual' | 'sick' | 'earned' | 'unpaid'>('casual');
  const [formFrom, setFormFrom] = useState('');
  const [formTo, setFormTo] = useState('');
  const [formReason, setFormReason] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Fetch employee own requests and balances
  const fetchMyLeaves = useCallback(async () => {
    try {
      const res = await fetch('/api/leaves');
      const json = await res.json();
      if (res.ok) {
        setMyLeaves(json.leaves || []);
        if (json.balances) {
          setBalances(json.balances);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch pending approvals for managers
  const fetchPendingApprovals = useCallback(async () => {
    try {
      const res = await fetch('/api/leaves?pendingOnly=true');
      const json = await res.json();
      if (res.ok) {
        setPendingRequests(json || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch approved leaves for the team leave calendar
  const fetchCalendarLeaves = useCallback(async () => {
    try {
      const res = await fetch(`/api/leaves?calendar=true&month=${calendarMonth}&year=${calendarYear}`);
      const json = await res.json();
      if (res.ok) {
        setCalendarLeaves(json || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [calendarMonth, calendarYear]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchMyLeaves();
      fetchCalendarLeaves();
      if (isManagerOrAdmin) {
        fetchPendingApprovals();
        setActiveTab('pending_approvals');
      }
    }
  }, [currentUser?.id, calendarMonth, calendarYear, fetchMyLeaves, fetchCalendarLeaves, fetchPendingApprovals, isManagerOrAdmin]);

  // Form submission
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formType || !formFrom || !formTo || !formReason) {
      alert('Please fill out all form fields.');
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          from: formFrom,
          to: formTo,
          reason: formReason,
        }),
      });

      if (res.ok) {
        alert('Leave request submitted successfully.');
        setFormFrom('');
        setFormTo('');
        setFormReason('');
        fetchMyLeaves();
        fetchCalendarLeaves();
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'Failed to submit request');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Manager Approve/Reject action
  const handleApprovalAction = async (leaveId: string, status: 'approved' | 'rejected') => {
    setActionLoading((prev) => ({ ...prev, [leaveId]: true }));
    try {
      const comment = actionComment[leaveId] || '';
      const res = await fetch('/api/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveId, status, comment }),
      });

      if (res.ok) {
        alert(`Leave request ${status} successfully.`);
        fetchPendingApprovals();
        fetchCalendarLeaves();
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'Action failed');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [leaveId]: false }));
    }
  };

  // Calendar rendering helper
  const getDaysInMonth = (month: number, year: number) => {
    const days = new Date(year, month, 0).getDate();
    const result = [];
    for (let i = 1; i <= days; i++) {
      result.push(new Date(year, month - 1, i));
    }
    return result;
  };

  const daysList = getDaysInMonth(calendarMonth, calendarYear);

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  const leaveColors: Record<string, string> = {
    casual: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
    sick: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    earned: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    unpaid: 'bg-slate-500/15 text-slate-400 border-slate-700/50',
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'senior_manager', 'hr_recruiter', 'employee']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-indigo-500" />
            <span>Leave Management</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Submit time-off requests, monitor leave balances, review team schedules, and process approvals.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800">
          {isManagerOrAdmin && (
            <button
              onClick={() => setActiveTab('pending_approvals')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all ${
                activeTab === 'pending_approvals'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              <span>Pending Approvals ({pendingRequests.length})</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('my_requests')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all ${
              activeTab === 'my_requests'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>My Leaves & Balance</span>
          </button>
          <button
            onClick={() => setActiveTab('team_calendar')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all ${
              activeTab === 'team_calendar'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Team Leave Calendar</span>
          </button>
        </div>

        {/* Tab Content 1: My Requests and Balances */}
        {activeTab === 'my_requests' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Balances & Form column */}
            <div className="lg:col-span-1 space-y-6">
              {/* Balance Cards */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-slate-100 font-bold text-base">Leave Balances</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
                    <span className="text-2xl font-black text-indigo-400">{balances.remaining.casual}</span>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">Casual (12)</p>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
                    <span className="text-2xl font-black text-rose-400">{balances.remaining.sick}</span>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">Sick (10)</p>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
                    <span className="text-2xl font-black text-emerald-400">{balances.remaining.earned}</span>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">Earned (15)</p>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
                    <span className="text-2xl font-black text-slate-400">∞</span>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">Unpaid</p>
                  </div>
                </div>
              </div>

              {/* Leave Request Form */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-slate-100 font-bold text-base mb-4">Request Time Off</h3>
                <form onSubmit={handleRequestSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Leave Type
                    </label>
                    <select
                      value={formType}
                      onChange={(e: any) => setFormType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="casual">Casual Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="earned">Earned Leave</option>
                      <option value="unpaid">Unpaid Leave</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        required
                        value={formFrom}
                        onChange={(e) => setFormFrom(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        required
                        value={formTo}
                        onChange={(e) => setFormTo(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Reason for Request
                    </label>
                    <textarea
                      required
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                      placeholder="Explain your request details..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-semibold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15"
                  >
                    {submitLoading ? (
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></span>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Submit Request</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* My Requests List column */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden">
              <h3 className="text-slate-100 font-bold text-base mb-4">Request Log</h3>

              {myLeaves.length === 0 ? (
                <div className="py-20 text-center text-slate-500 text-sm">No leave requests found.</div>
              ) : (
                <div className="space-y-4 max-h-[560px] overflow-y-auto pr-2">
                  {myLeaves.map((leave) => {
                    const diffDays = Math.ceil(
                      Math.abs(new Date(leave.to).getTime() - new Date(leave.from).getTime()) / (1000 * 60 * 60 * 24)
                    ) + 1;

                    return (
                      <div key={leave._id} className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${leaveColors[leave.type]}`}>
                              {leave.type}
                            </span>
                            <h4 className="text-sm font-semibold text-slate-200 mt-2">
                              {new Date(leave.from).toLocaleDateString()} - {new Date(leave.to).toLocaleDateString()}
                              <span className="text-slate-500 text-xs font-normal ml-1.5">({diffDays} days)</span>
                            </h4>
                          </div>

                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border uppercase ${statusColors[leave.status]}`}>
                            {leave.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed italic">
                          " {leave.reason} "
                        </p>

                        {leave.comment && (
                          <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-lg text-xs">
                            <span className="font-semibold text-slate-300">Manager comment:</span>
                            <p className="text-slate-400 mt-1">{leave.comment}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content 2: Pending Approvals (Manager/Admin Only) */}
        {activeTab === 'pending_approvals' && isManagerOrAdmin && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-slate-100 font-bold text-base mb-4">Pending Approvals</h3>

            {pendingRequests.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-sm">
                No pending leave requests. You are all caught up!
              </div>
            ) : (
              <div className="space-y-5">
                {pendingRequests.map((leave) => {
                  const diffDays = Math.ceil(
                    Math.abs(new Date(leave.to).getTime() - new Date(leave.from).getTime()) / (1000 * 60 * 60 * 24)
                  ) + 1;

                  const leaveId = leave._id;

                  return (
                    <div key={leaveId} className="p-5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        {/* Profile Info */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-200">{leave.userId?.name}</span>
                          <span className="text-slate-600 text-xs">|</span>
                          <span className="text-xs text-slate-400">{leave.userId?.designation} ({leave.userId?.department})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${leaveColors[leave.type]}`}>
                            {leave.type}
                          </span>
                          <span className="text-xs font-semibold text-slate-300">
                            {new Date(leave.from).toLocaleDateString()} - {new Date(leave.to).toLocaleDateString()} ({diffDays} days)
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-850 italic">
                          " {leave.reason} "
                        </p>
                      </div>

                      {/* Approvals controls */}
                      <div className="flex flex-col gap-2 min-w-[240px]">
                        <input
                          type="text"
                          placeholder="Manager notes/comments..."
                          value={actionComment[leaveId] || ''}
                          onChange={(e) => setActionComment({ ...actionComment, [leaveId]: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-indigo-500"
                        />
                        <div className="flex gap-2">
                          <button
                            disabled={actionLoading[leaveId]}
                            onClick={() => handleApprovalAction(leaveId, 'rejected')}
                            className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                          <button
                            disabled={actionLoading[leaveId]}
                            onClick={() => handleApprovalAction(leaveId, 'approved')}
                            className="flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Team Calendar */}
        {activeTab === 'team_calendar' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            {/* Calendar Header Controls */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-slate-100 font-bold text-base flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-indigo-400" />
                <span>Team Absences</span>
              </h3>

              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1">
                <button
                  onClick={() => {
                    if (calendarMonth === 1) {
                      setCalendarMonth(12);
                      setCalendarYear(calendarYear - 1);
                    } else {
                      setCalendarMonth(calendarMonth - 1);
                    }
                  }}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-semibold text-slate-200 px-2 min-w-[100px] text-center">
                  {monthNames[calendarMonth - 1]} {calendarYear}
                </span>
                <button
                  onClick={() => {
                    if (calendarMonth === 12) {
                      setCalendarMonth(1);
                      setCalendarYear(calendarYear + 1);
                    } else {
                      setCalendarMonth(calendarMonth + 1);
                    }
                  }}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
              {daysList.map((day) => {
                const dateStr = day.toDateString();
                const dayTime = day.getTime();
                
                // Find all approved leaves spanning this day
                const matchingLeaves = calendarLeaves.filter((l) => {
                  const fTime = new Date(new Date(l.from).toDateString()).getTime();
                  const tTime = new Date(new Date(l.to).toDateString()).getTime();
                  return dayTime >= fTime && dayTime <= tTime;
                });

                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <div
                    key={day.getDate()}
                    className={`p-3 border rounded-xl flex flex-col justify-between min-h-[100px] transition-all bg-slate-950 ${
                      isWeekend ? 'border-slate-800/40 opacity-55' : 'border-slate-850'
                    }`}
                  >
                    <div className="flex justify-between items-start border-b border-slate-900 pb-1 mb-2">
                      <span className="text-xs font-bold text-slate-300">{day.getDate()}</span>
                      <span className="text-[9px] opacity-60 uppercase font-semibold">
                        {day.toLocaleDateString([], { weekday: 'short' })}
                      </span>
                    </div>

                    <div className="flex-1 space-y-1 overflow-y-auto max-h-[60px] pr-1">
                      {matchingLeaves.map((l) => (
                        <div
                          key={l._id}
                          className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/15 rounded text-[9px] font-medium text-indigo-400 truncate"
                          title={`${l.userId?.name} (${l.type})`}
                        >
                          {l.userId?.name}
                        </div>
                      ))}

                      {matchingLeaves.length === 0 && !isWeekend && (
                        <span className="text-[9px] text-slate-600 block text-center mt-2">All Present</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
