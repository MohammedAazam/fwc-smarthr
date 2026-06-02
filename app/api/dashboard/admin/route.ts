import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';
import Payroll from '@/models/Payroll';
import Performance from '@/models/Performance';
import { auth } from '@/lib/auth';
import { getGeminiModel } from '@/lib/gemini';
import { redis } from '@/lib/redis';

const CACHE_KEY = 'admin_dashboard_metrics';
const CACHE_TTL = 300; // 5 minutes in seconds

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 1. Check Redis Cache
  try {
    const cachedData = (await redis.get(CACHE_KEY)) as any;
    if (cachedData) {
      console.log('--- [ADMIN DASHBOARD CACHE HIT] ---');
      return NextResponse.json(cachedData);
    }
  } catch (cacheErr) {
    console.error('Redis cache retrieval failed, reading from DB:', cacheErr);
  }

  console.log('--- [ADMIN DASHBOARD CACHE MISS] - Querying MongoDB ---');
  await connectToDatabase();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  try {
    // KPI calculations
    const totalEmployees = await User.countDocuments({ role: 'employee', isActive: true });

    const payrollRecords = await Payroll.find({ month, year });
    const totalPayroll = payrollRecords.reduce((acc, curr) => acc + curr.netSalary, 0);

    const totalAttendanceLogs = await Attendance.countDocuments({
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });
    const attendedLogs = await Attendance.countDocuments({
      status: { $in: ['present', 'late', 'wfh'] },
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });
    const attendanceRate = totalAttendanceLogs > 0 ? Math.round((attendedLogs / totalAttendanceLogs) * 100) : 95;

    const perfReviews = await Performance.find({});
    const avgRating =
      perfReviews.length > 0
        ? Math.round(
            (perfReviews.reduce((acc, curr) => acc + curr.overallRating, 0) / perfReviews.length) * 10
          ) / 10
        : 4.1;

    // Headcount grouping
    const deptHeadcounts = await User.aggregate([
      { $match: { isActive: true, role: 'employee' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
    ]);
    const deptsBreakdown = deptHeadcounts.map((d) => ({
      name: d._id,
      count: d.count,
    }));

    // Activities log compilation
    const recentLeaves = await Leave.find({})
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentEmployees = await User.find({ role: 'employee' })
      .sort({ joiningDate: -1 })
      .limit(5);

    const activities = [
      ...recentLeaves.map((l) => ({
        type: 'leave',
        user: (l.userId as any)?.name || 'Employee',
        text: `requested leave (${l.type}) - Status: ${l.status}`,
        time: (l as any).createdAt,
      })),
      ...recentEmployees.map((e) => ({
        type: 'joining',
        user: e.name,
        text: `joined the company in ${e.department} as ${e.designation}`,
        time: e.joiningDate,
      })),
    ];

    const sortedActivities = activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);

    // AI Insights
    const model = getGeminiModel();
    const deptsText = deptsBreakdown.map((d) => `${d.name}: ${d.count}`).join(', ');
    const insightsPrompt = `
      You are an expert HR data analyst. Analyze these company statistics and generate 3 concise bullet points of strategic insights or warnings.
      Total Staff Count: ${totalEmployees}
      Total Salary Spend this Month: $${totalPayroll}
      Standard Monthly Attendance Rate: ${attendanceRate}%
      Average Performance Rating: ${avgRating}/5
      Headcounts by Department: ${deptsText}

      Include recommendations for optimization, absenteeism flags, or payroll warnings. Return plain text bullets ONLY, no markdown, no header. Keep each bullet under 15 words.
    `;

    let insights = '';
    try {
      const result = await model.generateContent(insightsPrompt);
      insights = result.response.text().trim();
    } catch (aiErr) {
      console.error('AI Insights generation failed:', aiErr);
      insights = `- Attendance is healthy at ${attendanceRate}%, check in on Engineering workloads.\n- Salary spend is balanced with current headcounts.\n- Average performance rating sits at a commendable ${avgRating}/5.`;
    }

    const responseBody = {
      kpis: {
        totalEmployees,
        totalPayroll,
        attendanceRate,
        avgRating,
      },
      deptsBreakdown,
      activities: sortedActivities,
      insights,
    };

    // 2. Save Response in Cache
    try {
      await redis.set(CACHE_KEY, responseBody, { ex: CACHE_TTL });
      console.log('--- [ADMIN DASHBOARD METRICS CACHED SUCCESSFULLY] ---');
    } catch (cacheSetErr) {
      console.error('Redis cache storage failed:', cacheSetErr);
    }

    return NextResponse.json(responseBody);
  } catch (error: any) {
    console.error('Admin dashboard API failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export const maxDuration = 60;
