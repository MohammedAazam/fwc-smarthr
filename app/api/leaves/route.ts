import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Leave from '@/models/Leave';
import User from '@/models/User';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pendingOnly = searchParams.get('pendingOnly') === 'true';
  const calendar = searchParams.get('calendar') === 'true';
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

  const currentUser = session.user as any;

  await connectToDatabase();

  try {
    // 1. Calendar query for all approved leaves in a month
    if (calendar) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);

      const approvedLeaves = await Leave.find({
        status: 'approved',
        $or: [
          { from: { $gte: startOfMonth, $lte: endOfMonth } },
          { to: { $gte: startOfMonth, $lte: endOfMonth } },
          { from: { $lte: startOfMonth }, to: { $gte: endOfMonth } },
        ],
      }).populate('userId', 'name email department designation');

      return NextResponse.json(approvedLeaves);
    }

    // 2. Manager/Admin pending approvals checklist query
    if (pendingOnly) {
      if (!['admin', 'senior_manager'].includes(currentUser.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Senior managers see their department pending leaves, Admin sees all
      const query: any = { status: 'pending' };

      const pendingLeaves = await Leave.find(query)
        .populate('userId', 'name email department designation managerId')
        .sort({ createdAt: -1 });

      // If senior manager, filter by department
      let filtered = pendingLeaves;
      if (currentUser.role === 'senior_manager') {
        filtered = pendingLeaves.filter(
          (leave) => (leave.userId as any).department === currentUser.department
        );
      }

      return NextResponse.json(filtered);
    }

    // 3. Default: Employee fetches their own leaves and calculates balances
    const employeeLeaves = await Leave.find({ userId: currentUser.id }).sort({ createdAt: -1 });

    // Calculate balances (used leaves this year)
    const currentYear = new Date().getFullYear();
    const approvedThisYear = employeeLeaves.filter(
      (l) => l.status === 'approved' && new Date(l.from).getFullYear() === currentYear
    );

    const used = {
      casual: 0,
      sick: 0,
      earned: 0,
      unpaid: 0,
    };

    approvedThisYear.forEach((l) => {
      const diffTime = Math.abs(new Date(l.to).getTime() - new Date(l.from).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (l.type in used) {
        used[l.type as keyof typeof used] += diffDays;
      }
    });

    const allowed = {
      casual: 12,
      sick: 10,
      earned: 15,
      unpaid: 999, // unlimited
    };

    const remaining = {
      casual: Math.max(0, allowed.casual - used.casual),
      sick: Math.max(0, allowed.sick - used.sick),
      earned: Math.max(0, allowed.earned - used.earned),
      unpaid: 999,
    };

    return NextResponse.json({
      leaves: employeeLeaves,
      balances: {
        allowed,
        used,
        remaining,
      },
    });
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
  const { type, from, to, reason } = await request.json();

  if (!type || !from || !to || !reason) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (fromDate > toDate) {
    return NextResponse.json({ error: 'From date cannot be after To date' }, { status: 400 });
  }

  await connectToDatabase();

  try {
    // Verify balance limits
    if (type !== 'unpaid') {
      const allowedLimits: Record<string, number> = { casual: 12, sick: 10, earned: 15 };
      const currentYear = new Date().getFullYear();

      const approvedLeaves = await Leave.find({
        userId: currentUser.id,
        status: 'approved',
        type,
        from: { $gte: new Date(currentYear, 0, 1) },
      });

      let totalUsed = 0;
      approvedLeaves.forEach((l) => {
        const diffDays =
          Math.ceil(Math.abs(new Date(l.to).getTime() - new Date(l.from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        totalUsed += diffDays;
      });

      const requestedDays =
        Math.ceil(Math.abs(toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (totalUsed + requestedDays > allowedLimits[type]) {
        return NextResponse.json(
          {
            error: `Insufficient ${type} leave balance. Remaining: ${
              allowedLimits[type] - totalUsed
            } days.`,
          },
          { status: 400 }
        );
      }
    }

    const newRequest = new Leave({
      userId: currentUser.id,
      type,
      from: fromDate,
      to: toDate,
      reason,
      status: 'pending',
    });

    await newRequest.save();
    return NextResponse.json(newRequest, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || !['admin', 'senior_manager'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const currentUser = session.user as any;
  const { leaveId, status, comment } = await request.json();

  if (!leaveId || !status) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  await connectToDatabase();

  try {
    const leaveRequest = await Leave.findById(leaveId);
    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // Role Guard for Senior Manager department boundaries
    if (currentUser.role === 'senior_manager') {
      const requestee = await User.findById(leaveRequest.userId);
      if (!requestee || requestee.department !== currentUser.department) {
        return NextResponse.json(
          { error: 'Unauthorized to approve leaves outside your department' },
          { status: 403 }
        );
      }
    }

    leaveRequest.status = status;
    leaveRequest.approvedBy = currentUser.id;
    leaveRequest.comment = comment || '';

    await leaveRequest.save();

    return NextResponse.json({ message: 'Leave status updated successfully', leaveRequest });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
