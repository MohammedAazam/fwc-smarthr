'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  CalendarCheck,
  Clock,
  Briefcase,
  AlertTriangle,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Settings,
  Calendar,
  Smile,
} from 'lucide-react';
import RoleGuard from '@/components/layout/RoleGuard';

interface AttendanceRecord {
  _id: string;
  userId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: 'present' | 'absent' | 'late' | 'wfh' | 'holiday';
}

export default function AttendancePage() {
  const { data: session } = useSession();
  const currentUser = session?.user as any;
  const isManagerOrAdmin = ['admin', 'senior_manager'].includes(currentUser?.role || '');

  // Calendar dates
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Data states
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState({
    present: 0,
    absent: 0,
    late: 0,
    wfh: 0,
    holiday: 0,
  });
  const [loading, setLoading] = useState(true);

  // Today status states
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [isWfhCheck, setIsWfhCheck] = useState(false);
  const [clockActionLoading, setClockActionLoading] = useState(false);

  // Admin select employee & override states
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(currentUser?.id || '');
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<'present' | 'absent' | 'late' | 'wfh' | 'holiday'>('present');
  const [overrideClockIn, setOverrideClockIn] = useState('');
  const [overrideClockOut, setOverrideClockOut] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Fetch employees list for managers
  const fetchEmployeesList = async () => {
    try {
      const res = await fetch('/api/employees?limit=200');
      const json = await res.json();
      if (res.ok) {
        setEmployeesList(json.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch specific user's monthly attendance
  const fetchMonthlyAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const targetUser = isManagerOrAdmin ? selectedEmployeeId : currentUser?.id;
      const res = await fetch(
        `/api/attendance?userId=${targetUser || ''}&month=${selectedMonth}&year=${selectedYear}`
      );
      const json = await res.json();
      if (res.ok) {
        setRecords(json.records || []);
        if (json.summary) {
          setSummary(json.summary);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isManagerOrAdmin, selectedEmployeeId, currentUser?.id, selectedMonth, selectedYear]);

  // Fetch today's record to check if already clocked-in/out
  const fetchTodayStatus = useCallback(async () => {
    try {
      const todayMonth = new Date().getMonth() + 1;
      const todayYear = new Date().getFullYear();
      const res = await fetch(
        `/api/attendance?userId=${currentUser?.id}&month=${todayMonth}&year=${todayYear}`
      );
      const json = await res.json();
      if (res.ok) {
        const todayStr = new Date().toDateString();
        const todayRec = (json.records || []).find(
          (r: any) => new Date(r.date).toDateString() === todayStr
        );
        setTodayRecord(todayRec || null);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchMonthlyAttendance();
      fetchTodayStatus();
      if (isManagerOrAdmin) {
        fetchEmployeesList();
      }
    }
  }, [currentUser?.id, selectedEmployeeId, selectedMonth, selectedYear, fetchMonthlyAttendance, fetchTodayStatus, isManagerOrAdmin]);

  // Handles Clock-in and Clock-out POST request
  const handleClockAction = async (action: 'clock_in' | 'clock_out') => {
    setClockActionLoading(true);
    try {
      const payload = {
        action,
        statusOverride: isWfhCheck ? 'wfh' : undefined,
      };

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchTodayStatus();
        await fetchMonthlyAttendance();
      } else {
        const errorJson = await res.json();
        alert(errorJson.error || 'Failed to execute clock action');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setClockActionLoading(false);
    }
  };

  // Handles Admin override PUT request
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !overrideDate || !overrideStatus) {
      alert('Please fill out all fields.');
      return;
    }

    setOverrideLoading(true);
    try {
      // Parse clock-in/out date-times if provided
      let clockInDateTime: string | undefined;
      let clockOutDateTime: string | undefined;

      if (overrideClockIn) {
        clockInDateTime = new Date(`${overrideDate}T${overrideClockIn}`).toISOString();
      }
      if (overrideClockOut) {
        clockOutDateTime = new Date(`${overrideDate}T${overrideClockOut}`).toISOString();
      }

      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedEmployeeId,
          date: overrideDate,
          status: overrideStatus,
          clockIn: clockInDateTime,
          clockOut: clockOutDateTime,
        }),
      });

      if (res.ok) {
        alert('Attendance updated successfully.');
        setOverrideDate('');
        setOverrideClockIn('');
        setOverrideClockOut('');
        fetchMonthlyAttendance();
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'Override failed');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setOverrideLoading(false);
    }
  };

  // Helper to render calendar days
  const getDaysInMonth = (month: number, year: number) => {
    const days = new Date(year, month, 0).getDate();
    const result = [];
    for (let i = 1; i <= days; i++) {
      result.push(new Date(year, month - 1, i));
    }
    return result;
  };

  const daysList = getDaysInMonth(selectedMonth, selectedYear);

  const statusColors: Record<string, string> = {
    present: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    late: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    absent: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
    wfh: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
    holiday: 'bg-slate-500/10 text-slate-400 border-slate-700/50',
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'senior_manager', 'employee']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarCheck className="h-8 w-8 text-indigo-500" />
            <span>Attendance Records</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track clock-in times, submit WFH sessions, and view month-over-month attendance summaries.
          </p>
        </div>

        {/* Top Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Clock In/Out Widget */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-slate-100 font-bold text-lg mb-1 flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-400" />
                <span>Today's Log</span>
              </h3>
              <p className="text-slate-400 text-xs mb-4">
                Verify check-in timestamps. Checks after 10:00 AM auto-resolve as Late.
              </p>

              {/* Status Display */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl mb-4 text-center">
                {todayRecord ? (
                  <div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border uppercase ${statusColors[todayRecord.status]}`}>
                      {todayRecord.status}
                    </span>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <div>
                        <p className="opacity-80">Clock In</p>
                        <p className="text-slate-200 font-medium mt-0.5">
                          {todayRecord.clockIn ? new Date(todayRecord.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </p>
                      </div>
                      <div>
                        <p className="opacity-80">Clock Out</p>
                        <p className="text-slate-200 font-medium mt-0.5">
                          {todayRecord.clockOut ? new Date(todayRecord.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs text-slate-500 font-semibold bg-slate-900 px-3 py-1 rounded-full border border-slate-800 uppercase">
                      No Records
                    </span>
                    <p className="text-slate-400 text-xs mt-3">You have not clocked in for today.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Panel */}
            <div className="space-y-3">
              {!todayRecord && (
                <label className="flex items-center gap-2 text-xs text-slate-400 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWfhCheck}
                    onChange={(e) => setIsWfhCheck(e.target.checked)}
                    className="h-4 w-4 bg-slate-950 border border-slate-800 rounded text-indigo-600 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Clock-in as Work From Home (WFH)</span>
                </label>
              )}

              <div className="flex gap-3">
                <button
                  disabled={!!todayRecord || clockActionLoading}
                  onClick={() => handleClockAction('clock_in')}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Clock In</span>
                </button>
                <button
                  disabled={!todayRecord || !!todayRecord.clockOut || clockActionLoading}
                  onClick={() => handleClockAction('clock_out')}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-lg shadow-rose-600/10 flex items-center justify-center gap-1.5"
                >
                  <Clock className="h-4 w-4" />
                  <span>Clock Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Monthly Attendance summary cards */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-slate-100 font-bold text-lg mb-4 flex items-center gap-2">
              <Smile className="h-5 w-5 text-indigo-400" />
              <span>Monthly Statistics ({monthNames[selectedMonth - 1]} {selectedYear})</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
                <span className="text-2xl font-bold text-emerald-400">{summary.present}</span>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">Present</p>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
                <span className="text-2xl font-bold text-amber-400">{summary.late}</span>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">Late</p>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
                <span className="text-2xl font-bold text-rose-400">{summary.absent}</span>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">Absent</p>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
                <span className="text-2xl font-bold text-indigo-400">{summary.wfh}</span>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">WFH</p>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center col-span-2 md:col-span-1">
                <span className="text-2xl font-bold text-slate-400">{summary.holiday}</span>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">Holiday</p>
              </div>
            </div>

            {/* Attendance Rate */}
            <div className="mt-6 p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-200">Overall Attendance Rate</p>
                <p className="text-xs text-slate-400">Total days present or WFH over standard weekdays.</p>
              </div>
              <div className="text-right">
                {(() => {
                  const totalDays = summary.present + summary.late + summary.absent + summary.wfh;
                  const attended = summary.present + summary.late + summary.wfh;
                  const rate = totalDays > 0 ? Math.round((attended / totalDays) * 100) : 100;
                  return (
                    <span className={`text-2xl font-black ${rate >= 90 ? 'text-emerald-400' : rate >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {rate}%
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid View & Admin Overrides */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            {/* Calendar Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-slate-100 font-bold text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-400" />
                <span>Attendance Grid</span>
              </h3>

              <div className="flex items-center gap-3">
                {/* Employee selector for managers */}
                {isManagerOrAdmin && (
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs w-48 appearance-none"
                  >
                    {employeesList.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1 shrink-0">
                  <button
                    onClick={() => {
                      if (selectedMonth === 1) {
                        setSelectedMonth(12);
                        setSelectedYear(selectedYear - 1);
                      } else {
                        setSelectedMonth(selectedMonth - 1);
                      }
                    }}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-semibold text-slate-200 px-2 min-w-[100px] text-center">
                    {monthNames[selectedMonth - 1]} {selectedYear}
                  </span>
                  <button
                    onClick={() => {
                      if (selectedMonth === 12) {
                        setSelectedMonth(1);
                        setSelectedYear(selectedYear + 1);
                      } else {
                        setSelectedMonth(selectedMonth + 1);
                      }
                    }}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Days */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                <p className="text-slate-400 text-sm">Loading calendar...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2.5">
                {daysList.map((day) => {
                  const dateStr = day.toDateString();
                  const record = records.find(
                    (r) => new Date(r.date).toDateString() === dateStr
                  );
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  let displayStatus = record?.status || (isWeekend ? 'holiday' : 'absent');
                  // If date is in the future, don't show absent
                  if (day > new Date() && !record) {
                    displayStatus = 'holiday';
                  }

                  return (
                    <div
                      key={day.getDate()}
                      className={`p-3 border rounded-xl flex flex-col justify-between h-20 transition-all ${
                        statusColors[displayStatus] || statusColors.holiday
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-black text-slate-100">{day.getDate()}</span>
                        <span className="text-[9px] opacity-60 uppercase font-semibold">
                          {day.toLocaleDateString([], { weekday: 'short' })}
                        </span>
                      </div>
                      <div className="text-[10px] font-black uppercase text-right leading-none truncate">
                        {displayStatus}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin Override Form */}
          {isManagerOrAdmin && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-slate-100 font-bold text-lg mb-1 flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-400" />
                <span>Override Record</span>
              </h3>
              <p className="text-slate-400 text-xs mb-4">
                Manually adjust or backfill attendance logs for staff.
              </p>

              <form onSubmit={handleOverrideSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Employee
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    {employeesList.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Select Date
                  </label>
                  <input
                    type="date"
                    required
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Log Status
                  </label>
                  <select
                    value={overrideStatus}
                    onChange={(e: any) => setOverrideStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                    <option value="wfh">WFH</option>
                    <option value="holiday">Holiday</option>
                  </select>
                </div>

                {overrideStatus !== 'absent' && overrideStatus !== 'holiday' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Clock In Time
                      </label>
                      <input
                        type="time"
                        value={overrideClockIn}
                        onChange={(e) => setOverrideClockIn(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Clock Out Time
                      </label>
                      <input
                        type="time"
                        value={overrideClockOut}
                        onChange={(e) => setOverrideClockOut(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={overrideLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-semibold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
                >
                  {overrideLoading ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></span>
                  ) : (
                    'Save Override'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
