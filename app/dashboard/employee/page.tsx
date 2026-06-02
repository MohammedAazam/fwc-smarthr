'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  Clock,
  CalendarDays,
  Award,
  FileSpreadsheet,
  Download,
  CheckCircle,
  HelpCircle,
  Zap,
} from 'lucide-react';
import RoleGuard from '@/components/layout/RoleGuard';

interface AttendanceRecord {
  _id: string;
  date: string;
  status: string;
  clockIn?: string;
  clockOut?: string;
}

interface LeaveBalance {
  remaining: { casual: number; sick: number; earned: number };
}

interface Goal {
  _id: string;
  title: string;
  target: number;
  achieved: number;
  score: number;
}

interface PerformanceRecord {
  _id: string;
  period: string;
  goals: Goal[];
}

interface PayrollRecord {
  _id: string;
  month: number;
  year: number;
  basic: number;
  hra: number;
  da: number;
  deductions: number;
  tds: number;
  netSalary: number;
  generatedAt: string;
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUser = session?.user as any;

  // State Management
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [balances, setBalances] = useState<LeaveBalance>({
    remaining: { casual: 12, sick: 10, earned: 15 },
  });
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [recentPayslips, setRecentPayslips] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      // 1. Fetch attendance to extract today's record
      const todayMonth = new Date().getMonth() + 1;
      const todayYear = new Date().getFullYear();
      const attRes = await fetch(`/api/attendance?userId=${currentUser.id}&month=${todayMonth}&year=${todayYear}`);
      if (attRes.ok) {
        const attJson = await attRes.json();
        const todayStr = new Date().toDateString();
        const todayRec = (attJson.records || []).find(
          (r: any) => new Date(r.date).toDateString() === todayStr
        );
        setTodayRecord(todayRec || null);
      }

      // 2. Fetch leaves for balances
      const leaveRes = await fetch('/api/leaves');
      if (leaveRes.ok) {
        const leaveJson = await leaveRes.json();
        if (leaveJson.balances) setBalances(leaveJson.balances);
      }

      // 3. Fetch performance for goals
      const perfRes = await fetch(`/api/performance?employeeId=${currentUser.id}`);
      if (perfRes.ok) {
        const perfJson = await perfRes.json();
        if (perfJson && perfJson.length > 0) {
          // Take active period goals
          setActiveGoals(perfJson[0].goals || []);
        }
      }

      // 4. Fetch payroll for past payslips
      const payRes = await fetch('/api/payroll');
      if (payRes.ok) {
        const payJson = await payRes.json();
        setRecentPayslips((payJson.records || []).slice(0, 3));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchDashboardData();
    }
  }, [currentUser?.id]);

  // Clock in action
  const handleClockIn = async () => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clock_in' }),
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Compile Payslip PDF
  const compilePDF = async (record: PayrollRecord) => {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
      const { width, height } = page.getSize();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthStr = monthNames[record.month - 1];

      // Draw Header Block
      page.drawRectangle({
        x: 0,
        y: height - 120,
        width,
        height: 120,
        color: rgb(0.11, 0.16, 0.29),
      });

      page.drawText('FWC SmartHR Solutions', { x: 40, y: height - 55, size: 22, font: fontBold, color: rgb(1, 1, 1) });
      page.drawText(`OFFICIAL PAYSLIP - ${monthStr.toUpperCase()} ${record.year}`, {
        x: 40,
        y: height - 85,
        size: 11,
        font: font,
        color: rgb(0.74, 0.82, 0.9),
      });

      // Employee Info Section
      page.drawText('EMPLOYEE PROFILE', { x: 40, y: height - 170, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      page.drawLine({
        start: { x: 40, y: height - 175 },
        end: { x: width - 40, y: height - 175 },
        color: rgb(0.8, 0.8, 0.8),
        thickness: 1,
      });

      let textY = height - 200;
      page.drawText(`Name: ${currentUser?.name || 'Staff'}`, { x: 40, y: textY, size: 10, font });
      page.drawText(`Department: ${currentUser?.department || 'N/A'}`, { x: width / 2, y: textY, size: 10, font });

      textY -= 18;
      page.drawText(`Email: ${currentUser?.email || 'N/A'}`, { x: 40, y: textY, size: 10, font });
      page.drawText(`Designation: ${currentUser?.designation || 'Staff'}`, { x: width / 2, y: textY, size: 10, font });

      // Financials tables
      const tableY = height - 300;
      page.drawText('EARNINGS', { x: 40, y: tableY, size: 10, font: fontBold, color: rgb(0.1, 0.6, 0.1) });
      page.drawText('DEDUCTIONS', { x: width / 2, y: tableY, size: 10, font: fontBold, color: rgb(0.8, 0.1, 0.1) });

      page.drawLine({
        start: { x: 40, y: tableY - 5 },
        end: { x: width - 40, y: tableY - 5 },
        color: rgb(0.7, 0.7, 0.7),
        thickness: 1,
      });

      let leftY = tableY - 25;
      page.drawText('Basic Salary', { x: 40, y: leftY, size: 10, font });
      page.drawText(`$${record.basic}`, { x: width / 2 - 80, y: leftY, size: 10, font });

      leftY -= 18;
      page.drawText('HRA (40%)', { x: 40, y: leftY, size: 10, font });
      page.drawText(`$${record.hra}`, { x: width / 2 - 80, y: leftY, size: 10, font });

      leftY -= 18;
      page.drawText('DA (20%)', { x: 40, y: leftY, size: 10, font });
      page.drawText(`$${record.da}`, { x: width / 2 - 80, y: leftY, size: 10, font });

      let rightY = tableY - 25;
      page.drawText('PF / flat Deductions', { x: width / 2, y: rightY, size: 10, font });
      page.drawText(`$${record.deductions}`, { x: width - 100, y: rightY, size: 10, font });

      rightY -= 18;
      page.drawText('TDS / Income Tax', { x: width / 2, y: rightY, size: 10, font });
      page.drawText(`$${record.tds}`, { x: width - 100, y: rightY, size: 10, font });

      page.drawLine({
        start: { x: 40, y: leftY - 15 },
        end: { x: width - 40, y: leftY - 15 },
        color: rgb(0.8, 0.8, 0.8),
        thickness: 1,
      });

      const gross = record.basic + record.hra + record.da;
      const totalDed = record.deductions + record.tds;

      const sumY = leftY - 35;
      page.drawText('Gross Earnings:', { x: 40, y: sumY, size: 10, font: fontBold });
      page.drawText(`$${gross}`, { x: width / 2 - 80, y: sumY, size: 10, font: fontBold });

      page.drawText('Total Deductions:', { x: width / 2, y: sumY, size: 10, font: fontBold });
      page.drawText(`$${totalDed}`, { x: width - 100, y: sumY, size: 10, font: fontBold });

      const netY = sumY - 70;
      page.drawRectangle({
        x: 40,
        y: netY,
        width: width - 80,
        height: 45,
        color: rgb(0.95, 0.97, 0.98),
        borderColor: rgb(0.85, 0.88, 0.9),
        borderWidth: 1,
      });

      page.drawText('NET TAKE-HOME SALARY', { x: 60, y: netY + 26, size: 9, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(`$${record.netSalary}`, { x: 60, y: netY + 8, size: 15, font: fontBold, color: rgb(0.05, 0.35, 0.15) });

      page.drawText('This document is a computer-generated payslip and does not require a physical signature.', {
        x: 40,
        y: 60,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `payslip_${(currentUser?.name || 'employee').replace(/\s+/g, '_')}_${record.month}_${record.year}.pdf`;
      link.click();
    } catch (err: any) {
      alert(`PDF compilation failed: ${err.message}`);
    }
  };

  const statusColors: Record<string, string> = {
    present: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    late: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    absent: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    wfh: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    holiday: 'bg-slate-500/10 text-slate-400 border-slate-700/50',
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <RoleGuard allowedRoles={['employee', 'admin', 'senior_manager', 'hr_recruiter']}>
      <div className="space-y-6">
        
        {/* Dashboard Title Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <Zap className="h-8 w-8 text-indigo-500" />
            <span>My Workspace Dashboard</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Welcome back, <span className="font-semibold text-slate-200">{currentUser?.name}</span>. Check in today, review goals, and manage payslips.
          </p>
        </div>

        {/* Dashboard grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (Attendance & Leaves) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Attendance widget */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between h-[280px]">
              <div>
                <h3 className="text-slate-100 font-bold text-base mb-1 flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-indigo-400" />
                  <span>Clock In Widget</span>
                </h3>
                <p className="text-slate-400 text-[11px] mb-4">
                  Check in for work today. Late clocks trigger automatically after 10:00 AM.
                </p>

                <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl mb-4 text-center">
                  {todayRecord ? (
                    <div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${statusColors[todayRecord.status] || statusColors.holiday}`}>
                        {todayRecord.status}
                      </span>
                      <p className="text-slate-400 text-xs mt-3">
                        Clocked In: <span className="font-semibold text-slate-250">{todayRecord.clockIn ? new Date(todayRecord.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-slate-800 text-slate-500 uppercase">
                        Not Clocked In
                      </span>
                      <p className="text-slate-450 text-[11px] mt-2">Submit check-in stamp below.</p>
                    </div>
                  )}
                </div>
              </div>

              {!todayRecord && (
                <button
                  onClick={handleClockIn}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm active:scale-95 transition-all shadow-lg shadow-indigo-600/15"
                >
                  Quick Clock In
                </button>
              )}
              {todayRecord && !todayRecord.clockOut && (
                <button
                  onClick={() => router.push('/attendance')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold"
                >
                  Go to Attendance Portal to Clock Out
                </button>
              )}
            </div>

            {/* Leave Balance summary */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-100 font-bold text-base flex items-center gap-2">
                  <CalendarDays className="h-4.5 w-4.5 text-indigo-400" />
                  <span>Leave Balances</span>
                </h3>
                <button
                  onClick={() => router.push('/leaves')}
                  className="text-xs text-indigo-455 text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  Apply
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-center">
                  <span className="text-lg font-black text-indigo-400">{balances.remaining.casual}</span>
                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-wider">Casual</p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-center">
                  <span className="text-lg font-black text-rose-400">{balances.remaining.sick}</span>
                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-wider">Sick</p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-center">
                  <span className="text-lg font-black text-emerald-400">{balances.remaining.earned}</span>
                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-wider">Earned</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Columns (Goals & Payroll) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Goals progress bars */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-100 font-bold text-base flex items-center gap-2">
                  <Award className="h-4.5 w-4.5 text-indigo-400" />
                  <span>My Active OKRs &amp; Goals</span>
                </h3>
                <button
                  onClick={() => router.push('/performance')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  Manage
                </button>
              </div>

              {loading ? (
                <div className="py-10 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-950 rounded w-full"></div>
                  <div className="h-4 bg-slate-950 rounded w-full"></div>
                </div>
              ) : activeGoals.length === 0 ? (
                <p className="text-slate-550 text-xs py-10 text-center">No goals currently assigned for this quarter.</p>
              ) : (
                <div className="space-y-4">
                  {activeGoals.map((goal) => (
                    <div key={goal._id} className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-300">{goal.title}</span>
                        <span className="text-indigo-400 font-bold">{goal.achieved} / {goal.target}%</span>
                      </div>
                      <div className="w-full bg-slate-950 border border-slate-850 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (goal.achieved / goal.target) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Payslips */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-100 font-bold text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4.5 w-4.5 text-indigo-400" />
                  <span>Recent Payslips</span>
                </h3>
                <button
                  onClick={() => router.push('/payroll')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  View All
                </button>
              </div>

              {loading ? (
                <div className="space-y-3 py-2 animate-pulse">
                  <div className="h-10 bg-slate-950 rounded-xl w-full"></div>
                </div>
              ) : recentPayslips.length === 0 ? (
                <p className="text-slate-550 text-xs py-6 text-center">No payslips issued yet.</p>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {recentPayslips.map((pay) => (
                    <div key={pay._id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <h4 className="font-bold text-slate-200">
                          {monthNames[pay.month - 1]} {pay.year}
                        </h4>
                        <p className="text-[10px] text-slate-550 mt-0.5">Take-home: ${pay.netSalary}</p>
                      </div>

                      <button
                        onClick={() => compilePDF(pay)}
                        className="p-1.5 hover:bg-indigo-500/15 hover:text-indigo-400 text-slate-400 rounded-lg transition-colors border border-slate-800 hover:border-indigo-500/25 active:scale-95"
                        title="Download Payslip"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
