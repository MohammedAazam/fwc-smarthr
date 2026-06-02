import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Job from '@/models/Job';
import Candidate from '@/models/Candidate';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session || !['admin', 'hr_recruiter'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectToDatabase();

  try {
    // 1. Active jobs count card
    const activeJobsCount = await Job.countDocuments({ isActive: true });

    // 2. Candidate pipeline: total candidate count
    const totalCandidatesCount = await Candidate.countDocuments({});

    // 3. Top AI-scored candidates table
    const topCandidates = await Candidate.find({})
      .populate('jobId', 'title department')
      .sort({ aiScore: -1 })
      .limit(5);

    // 4. Interview schedule list (candidates in interview stage)
    const interviews = await Candidate.find({ stage: 'interview' })
      .populate('jobId', 'title department')
      .sort({ updatedAt: -1 })
      .limit(5);

    return NextResponse.json({
      activeJobsCount,
      totalCandidatesCount,
      topCandidates,
      interviews,
    });
  } catch (error: any) {
    console.error('HR Recruiter dashboard API failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
