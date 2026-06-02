import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Job from '@/models/Job';
import Candidate from '@/models/Candidate';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !['admin', 'hr_recruiter'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  const type = searchParams.get('type') || 'candidates'; // 'jobs' | 'candidates'

  await connectToDatabase();

  try {
    if (type === 'jobs') {
      const jobs = await Job.find({}).sort({ createdAt: -1 });
      return NextResponse.json(jobs);
    }

    // Default: Fetch candidates
    const query: any = {};
    if (jobId) {
      query.jobId = jobId;
    }

    const candidates = await Candidate.find(query)
      .populate('jobId', 'title department description requirements')
      .sort({ aiScore: -1 });

    return NextResponse.json(candidates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !['admin', 'hr_recruiter'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const currentUser = session.user as any;
  const body = await request.json();
  const { action, ...data } = body;

  await connectToDatabase();

  try {
    if (action === 'create_job') {
      const { title, department, description, requirements } = data;
      if (!title || !department || !description) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }

      const newJob = new Job({
        title,
        department,
        description,
        requirements: Array.isArray(requirements)
          ? requirements
          : requirements.split(',').map((r: string) => r.trim()),
        postedBy: currentUser.id,
        isActive: true,
      });

      await newJob.save();
      return NextResponse.json(newJob, { status: 201 });
    }

    if (action === 'create_candidate') {
      const { jobId, name, email, phone, resumeUrl } = data;
      if (!jobId || !name || !email || !phone) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }

      const newCandidate = new Candidate({
        jobId,
        name,
        email,
        phone,
        resumeUrl,
        stage: 'applied',
        aiScore: 0,
      });

      await newCandidate.save();
      return NextResponse.json(newCandidate, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || !['admin', 'hr_recruiter'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { candidateId, stage, interviewNotes, aiScore, aiMatchReason } = await request.json();

  if (!candidateId) {
    return NextResponse.json({ error: 'Missing candidate ID' }, { status: 400 });
  }

  await connectToDatabase();

  try {
    const updateData: any = {};
    if (stage) updateData.stage = stage;
    if (interviewNotes !== undefined) updateData.interviewNotes = interviewNotes;
    if (aiScore !== undefined) updateData.aiScore = aiScore;
    if (aiMatchReason !== undefined) updateData.aiMatchReason = aiMatchReason;

    const candidate = await Candidate.findByIdAndUpdate(
      candidateId,
      { $set: updateData },
      { new: true }
    );

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    return NextResponse.json(candidate);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
