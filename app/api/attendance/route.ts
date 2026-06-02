import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const targetUserId = searchParams.get('userId');

  const currentUser = session.user as any;

  await connectToDatabase();

  // Employee role can only view their own attendance
  let userId = currentUser.id;
  if (['admin', 'senior_manager'].includes(currentUser.role)) {
    if (targetUserId) {
      userId = targetUserId;
    } else if (currentUser.role === 'admin' && !targetUserId) {
      // Admin overall report for the month
      try {
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        const records = await Attendance.find({
          date: { $gte: startOfMonth, $lte: endOfMonth },
        }).populate('userId', 'name email department designation');

        return NextResponse.json({ records });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }
  }

  // Fetch single employee monthly attendance
  try {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const records = await Attendance.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: 1 });

    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      wfh: 0,
      holiday: 0,
    };

    records.forEach((record) => {
      if (record.status in summary) {
        summary[record.status as keyof typeof summary]++;
      }
    });

    return NextResponse.json({ records, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = session.user as any;
  const { action, statusOverride } = await request.json(); // action: 'clock_in' | 'clock_out'

  await connectToDatabase();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  try {
    let record = await Attendance.findOne({
      userId: currentUser.id,
      date: { $gte: todayStart, $lte: todayEnd },
    });

    if (action === 'clock_in') {
      if (record) {
        return NextResponse.json({ error: 'Already clocked in for today.' }, { status: 400 });
      }

      // Check-in after 10:00 AM is late
      let status: 'present' | 'late' | 'wfh' = 'present';
      if (statusOverride === 'wfh') {
        status = 'wfh';
      } else {
        const checkLimit = new Date();
        checkLimit.setHours(10, 0, 0, 0); // 10:00 AM
        if (now > checkLimit) {
          status = 'late';
        }
      }

      record = new Attendance({
        userId: currentUser.id,
        date: todayStart,
        clockIn: now,
        status,
      });

      await record.save();
      return NextResponse.json({ message: 'Clocked in successfully', record });
    }

    if (action === 'clock_out') {
      if (!record) {
        return NextResponse.json({ error: 'You have not clocked in today.' }, { status: 400 });
      }
      if (record.clockOut) {
        return NextResponse.json({ error: 'Already clocked out for today.' }, { status: 400 });
      }

      record.clockOut = now;
      await record.save();
      return NextResponse.json({ message: 'Clocked out successfully', record });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || !['admin', 'senior_manager'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId, date, status, clockIn, clockOut } = await request.json();

  if (!userId || !date || !status) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  await connectToDatabase();

  const targetDate = new Date(date);
  const normalizedDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
  const dateEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

  try {
    const record = await Attendance.findOneAndUpdate(
      {
        userId,
        date: { $gte: normalizedDate, $lte: dateEnd },
      },
      {
        userId,
        date: normalizedDate,
        status,
        clockIn: clockIn ? new Date(clockIn) : undefined,
        clockOut: clockOut ? new Date(clockOut) : undefined,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: 'Attendance overridden successfully', record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
