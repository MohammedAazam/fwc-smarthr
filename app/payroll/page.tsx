'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  FileSpreadsheet,
  Download,
  Building,
  Users,
  Search,
  CheckCircle,
  AlertTriangle,
  Play,
  Briefcase,
} from 'lucide-react';
import RoleGuard from '@/components/layout/RoleGuard';

interface PayrollRecord {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    department: string;
    designation: string;
    basicSalary: number;
  };
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

export default function PayrollPage() {
  const { data: session } = useSession();
  const currentUser = session?.user as any;
  const isAdmin = currentUser?.role === 'admin';

  // State Management
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Bulk run states
  const [bulkMonth, setBulkMonth] = useState(new Date().getMonth() + 1);
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [genSuccess, setGenSuccess] = useState('');

  // Fetch Payroll records
  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payroll');
      const json = await res.json();
      if (res.ok) {
        setRecords(json.records || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchPayroll();
    }
  }, [currentUser?.id]);

  // Run bulk generation
  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGenSuccess('');

    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: bulkMonth, year: bulkYear }),
      });

      const json = await res.json();
      if (res.ok) {
        setGenSuccess(`Successfully processed payroll for ${json.count} employees.`);
        fetchPayroll();
      } else {
        alert(json.error || 'Failed to run bulk payroll');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // PDF-lib client-side compiler
  const compilePayslipPDF = async (record: PayrollRecord) => {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
      const { width, height } = page.getSize();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const employeeName = record.userId?.name || currentUser?.name || 'Employee';
      const employeeEmail = record.userId?.email || currentUser?.email || 'N/A';
      const designation = record.userId?.designation || currentUser?.designation || 'Staff';
      const department = record.userId?.department || currentUser?.department || 'N/A';

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthStr = monthNames[record.month - 1];

      // Draw Navy header block
      page.drawRectangle({
        x: 0,
        y: height - 120,
        width,
        height: 120,
        color: rgb(0.11, 0.16, 0.29),
      });

      // Write Header Text
      page.drawText('FWC SmartHR Solutions', { x: 40, y: height - 55, size: 22, font: fontBold, color: rgb(1, 1, 1) });
      page.drawText(`OFFICIAL PAYSLIP - ${monthStr.toUpperCase()} ${record.year}`, {
        x: 40,
        y: height - 85,
        size: 11,
        font: font,
        color: rgb(0.74, 0.82, 0.9),
      });

      // Draw Employee Info Section
      page.drawText('EMPLOYEE PROFILE', { x: 40, y: height - 170, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      page.drawLine({
        start: { x: 40, y: height - 175 },
        end: { x: width - 40, y: height - 175 },
        color: rgb(0.8, 0.8, 0.8),
        thickness: 1,
      });

      // User details text
      let textY = height - 200;
      page.drawText(`Name: ${employeeName}`, { x: 40, y: textY, size: 10, font });
      page.drawText(`Department: ${department}`, { x: width / 2, y: textY, size: 10, font });
      
      textY -= 18;
      page.drawText(`Email: ${employeeEmail}`, { x: 40, y: textY, size: 10, font });
      page.drawText(`Designation: ${designation}`, { x: width / 2, y: textY, size: 10, font });

      // Financial breakdown sections
      const tableY = height - 300;
      page.drawText('EARNINGS', { x: 40, y: tableY, size: 10, font: fontBold, color: rgb(0.1, 0.6, 0.1) });
      page.drawText('DEDUCTIONS', { x: width / 2, y: tableY, size: 10, font: fontBold, color: rgb(0.8, 0.1, 0.1) });

      page.drawLine({
        start: { x: 40, y: tableY - 5 },
        end: { x: width - 40, y: tableY - 5 },
        color: rgb(0.7, 0.7, 0.7),
        thickness: 1,
      });

      // Itemize Earnings
      let leftY = tableY - 25;
      page.drawText('Basic Salary', { x: 40, y: leftY, size: 10, font });
      page.drawText(`Rs.${record.basic}`, { x: width / 2 - 80, y: leftY, size: 10, font });

      leftY -= 18;
      page.drawText('HRA (40%)', { x: 40, y: leftY, size: 10, font });
      page.drawText(`Rs.${record.hra}`, { x: width / 2 - 80, y: leftY, size: 10, font });

      leftY -= 18;
      page.drawText('DA (20%)', { x: 40, y: leftY, size: 10, font });
      page.drawText(`Rs.${record.da}`, { x: width / 2 - 80, y: leftY, size: 10, font });

      // Itemize Deductions
      let rightY = tableY - 25;
      page.drawText('PF / Flat Deductions', { x: width / 2, y: rightY, size: 10, font });
      page.drawText(`Rs.${record.deductions}`, { x: width - 100, y: rightY, size: 10, font });

      rightY -= 18;
      page.drawText('TDS / Income Tax', { x: width / 2, y: rightY, size: 10, font });
      page.drawText(`Rs.${record.tds}`, { x: width - 100, y: rightY, size: 10, font });

      // Draw separation bar
      page.drawLine({
        start: { x: 40, y: leftY - 15 },
        end: { x: width - 40, y: leftY - 15 },
        color: rgb(0.8, 0.8, 0.8),
        thickness: 1,
      });

      // Summary Gross and Total Deductions
      const gross = record.basic + record.hra + record.da;
      const totalDed = record.deductions + record.tds;

      const sumY = leftY - 35;
      page.drawText('Gross Earnings:', { x: 40, y: sumY, size: 10, font: fontBold });
      page.drawText(`Rs.${gross}`, { x: width / 2 - 80, y: sumY, size: 10, font: fontBold });

      page.drawText('Total Deductions:', { x: width / 2, y: sumY, size: 10, font: fontBold });
      page.drawText(`Rs.${totalDed}`, { x: width - 100, y: sumY, size: 10, font: fontBold });

      // Draw Net Salary Box
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
      page.drawText(`Rs.${record.netSalary}`, { x: 60, y: netY + 8, size: 15, font: fontBold, color: rgb(0.05, 0.35, 0.15) });

      // Footer
      page.drawText('This document is a computer-generated payslip and does not require a physical signature.', {
        x: 40,
        y: 60,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Save PDF and Trigger Download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `payslip_${employeeName.replace(/\s+/g, '_')}_${record.month}_${record.year}.pdf`;
      link.click();
    } catch (err: any) {
      alert(`Failed to compile PDF: ${err.message}`);
    }
  };

  const filteredRecords = records.filter((rec) => {
    if (!isAdmin) return true;
    const name = rec.userId?.name || '';
    const email = rec.userId?.email || '';
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase())
    );
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'employee']}>
      <div className="space-y-6">
        
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="h-8 w-8 text-indigo-500" />
            <span>Payroll Dashboard</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Generate employee monthly salaries, calculate tax deductions, and download formatted payslips.
          </p>
        </div>

        {/* Admin Generation widget */}
        {isAdmin && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-slate-100 font-bold text-base flex items-center gap-2">
              <Play className="h-4.5 w-4.5 text-indigo-400" />
              <span>Trigger Payroll Run</span>
            </h3>
            <p className="text-slate-400 text-xs">
              Calculate basic wages, HRA (40%), DA (20%), flat deductions, and TDS (10% on salaries &gt; ₹25,000) for all staff.
            </p>

            {genSuccess && (
              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-400 text-xs">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{genSuccess}</span>
              </div>
            )}

            <form onSubmit={handleBulkGenerate} className="flex flex-wrap items-end gap-4 bg-slate-950 p-4 border border-slate-850 rounded-xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Select Month
                </label>
                <select
                  value={bulkMonth}
                  onChange={(e) => setBulkMonth(parseInt(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 w-36 appearance-none"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Select Year
                </label>
                <select
                  value={bulkYear}
                  onChange={(e) => setBulkYear(parseInt(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 w-28 appearance-none"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="py-2 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/15 disabled:opacity-50 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                {generating ? (
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white animate-spin rounded-full"></span>
                ) : (
                  'Run Bulk Generation'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Table/List View */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Header search bar (Admin only) */}
          {isAdmin && (
            <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs transition-colors"
                />
              </div>
            </div>
          )}

          {/* Table Headers */}
          <div className="flex items-center px-6 py-4 bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
            {isAdmin && <div className="w-[25%]">Employee</div>}
            <div className="w-[15%]">Month/Year</div>
            <div className="w-[15%]">Basic Salary</div>
            <div className="w-[10%]">HRA</div>
            <div className="w-[10%]">DA</div>
            <div className="w-[10%]">TDS (Tax)</div>
            <div className="w-[15%]">Net Salary</div>
            <div className="w-[10%] text-right">Payslip</div>
          </div>

          {/* Table Body */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <p className="text-slate-400 text-sm">Loading payroll logs...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-sm">No payroll records generated yet.</div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {filteredRecords.map((record) => {
                const userName = record.userId?.name || currentUser?.name || 'N/A';
                const userEmail = record.userId?.email || currentUser?.email || 'N/A';

                return (
                  <div key={record._id} className="flex items-center px-6 py-4 hover:bg-slate-800/20 text-slate-300 text-xs transition-colors">
                    {isAdmin && (
                      <div className="w-[25%] flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold uppercase border border-slate-700/50">
                          {userName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200">{userName}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[160px]">{userEmail}</p>
                        </div>
                      </div>
                    )}
                    <div className="w-[15%] font-medium">
                      {monthNames[record.month - 1]} {record.year}
                    </div>
                    <div className="w-[15%]">₹{record.basic}</div>
                    <div className="w-[10%]">₹{record.hra}</div>
                    <div className="w-[10%]">₹{record.da}</div>
                    <div className="w-[10%] text-rose-400">₹{record.tds}</div>
                    <div className="w-[15%] font-bold text-emerald-400">₹{record.netSalary}</div>
                    <div className="w-[10%] flex justify-end">
                      <button
                        onClick={() => compilePayslipPDF(record)}
                        className="p-2 bg-slate-850 hover:bg-indigo-600 hover:text-white rounded-lg text-slate-400 transition-all active:scale-95 border border-slate-800 hover:border-indigo-500"
                        title="Download Payslip PDF"
                      >
                        <Download className="h-4 w-4" />
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
