import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Performance from '@/models/Performance';
import User from '@/models/User';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');

  const currentUser = session.user as any;

  await connectToDatabase();

  let targetUserId = currentUser.id;

  if (['admin', 'senior_manager'].includes(currentUser.role)) {
    if (employeeId) {
      targetUserId = employeeId;
    }
  }

  try {
    const reviews = await Performance.find({ userId: targetUserId })
      .populate('reviewerId', 'name designation')
      .sort({ submittedAt: -1 });

    return NextResponse.json(reviews);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !['admin', 'senior_manager'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const currentUser = session.user as any;
  const { employeeId, period, goals, overallRating, aiGeneratedReview } = await request.json();

  if (!employeeId || !period || !goals) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  await connectToDatabase();

  try {
    const record = await Performance.findOneAndUpdate(
      { userId: employeeId, period },
      {
        userId: employeeId,
        reviewerId: currentUser.id,
        period,
        goals: goals.map((g: any) => ({
          title: g.title,
          target: g.target || 100,
          achieved: g.achieved || 0,
          score: g.score || 0,
        })),
        overallRating: overallRating || 3,
        aiGeneratedReview: aiGeneratedReview || '',
        submittedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = session.user as any;
  const { reviewId, goalId, achieved } = await request.json();

  if (!reviewId || !goalId || achieved === undefined) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  await connectToDatabase();

  try {
    const review = await Performance.findById(reviewId);
    if (!review) {
      return NextResponse.json({ error: 'Review record not found' }, { status: 404 });
    }

    if (review.userId.toString() !== currentUser.id) {
      return NextResponse.json({ error: 'Unauthorized to update this goal' }, { status: 403 });
    }

    // Mongoose sub-document querying
    const goal = (review.goals as any).id(goalId);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    goal.achieved = achieved;

    // Auto-calculate goal completion score out of 5
    const completion = Math.min(1, goal.achieved / goal.target);
    goal.score = Math.round(completion * 5);

    await review.save();

    return NextResponse.json(review);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
