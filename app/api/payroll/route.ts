import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Payroll from '@/models/Payroll';
import User from '@/models/User';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = parseInt(searchParams.get('month') || '0');
  const year = parseInt(searchParams.get('year') || '0');
  const targetUserId = searchParams.get('userId');
  const overview = searchParams.get('overview') === 'true';

  const currentUser = session.user as any;

  await connectToDatabase();

  try {
    // 1. Employee fetches own payroll history
    if (currentUser.role === 'employee') {
      const records = await Payroll.find({ userId: currentUser.id }).sort({
        year: -1,
        month: -1,
      });
      return NextResponse.json({ records });
    }

    // 2. Admin queries payroll data
    if (currentUser.role === 'admin') {
      if (overview) {
        if (!month || !year) {
          return NextResponse.json({ error: 'Missing month/year parameters' }, { status: 400 });
        }

        const records = await Payroll.find({ month, year });
        const totalExpense = records.reduce((acc, curr) => acc + curr.netSalary, 0);
        const totalTds = records.reduce((acc, curr) => acc + curr.tds, 0);

        return NextResponse.json({
          count: records.length,
          totalExpense,
          totalTds,
        });
      }

      // Query filter options
      const query: any = {};
      if (targetUserId) {
        query.userId = targetUserId;
      }
      if (month) query.month = month;
      if (year) query.year = year;

      const records = await Payroll.find(query)
        .populate('userId', 'name email department designation basicSalary')
        .sort({ year: -1, month: -1 });

      return NextResponse.json({ records });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { month, year } = await request.json();

  if (!month || !year) {
    return NextResponse.json({ error: 'Missing month/year parameters' }, { status: 400 });
  }

  await connectToDatabase();

  try {
    const activeEmployees = await User.find({ isActive: true, role: 'employee' });

    let generatedCount = 0;
    // Map employees to bulk writes for high performance (scalability)
    const bulkOps = activeEmployees.map((emp) => {
      const basic = emp.basicSalary || 0;
      const hra = Math.round(basic * 0.4);
      const da = Math.round(basic * 0.2);
      const gross = basic + hra + da;
      const tds = basic > 25000 ? Math.round(gross * 0.1) : 0;
      const deductions = 500;
      const netSalary = gross - tds - deductions;

      return {
        updateOne: {
          filter: { userId: emp._id, month, year },
          update: {
            $set: {
              basic,
              hra,
              da,
              deductions,
              tds,
              netSalary,
              generatedAt: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    if (bulkOps.length > 0) {
      const res = await Payroll.bulkWrite(bulkOps);
      generatedCount =
        (res.upsertedCount || 0) + (res.modifiedCount || 0) + (res.matchedCount || 0);
    }

    return NextResponse.json({ success: true, count: generatedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
