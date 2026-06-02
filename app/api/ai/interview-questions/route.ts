import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Candidate from '@/models/Candidate';
import { auth } from '@/lib/auth';
import { getGeminiModel } from '@/lib/gemini';

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !['admin', 'hr_recruiter'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { candidateId } = await request.json();

  if (!candidateId) {
    return NextResponse.json({ error: 'Missing candidateId parameter' }, { status: 400 });
  }

  await connectToDatabase();

  try {
    const candidate = await Candidate.findById(candidateId).populate(
      'jobId',
      'title description requirements'
    );
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const jobTitle = (candidate.jobId as any)?.title || 'Position';
    const jdRequirements = (candidate.jobId as any)?.requirements?.join(', ') || 'No JD details';
    const skillsText = candidate.aiMatchReason || jdRequirements;

    console.log(`Generating Interview Questions for candidate: ${candidate.name}...`);
    const model = getGeminiModel();
    const prompt = `Generate 8 interview questions for a candidate named "${
      candidate.name
    }" applying for the job position "${jobTitle}". The candidate's background shows experience in: "${skillsText}". Include: 3 technical questions, 2 behavioral questions, 2 situational questions, 1 culture-fit question. Return JSON array ONLY in this format: [{"question": "string", "type": "technical" | "behavioral" | "situational" | "culture-fit", "expectedAnswer": "string"}]. Do not add markdown backticks or any other text.`;

    const result = await model.generateContent(prompt);
    let resultText = result.response.text().trim();

    // Clean JSON markdown tags
    if (resultText.startsWith('```json')) {
      resultText = resultText.substring(7, resultText.length - 3).trim();
    } else if (resultText.startsWith('```')) {
      resultText = resultText.substring(3, resultText.length - 3).trim();
    }

    console.log('Gemini raw response:', resultText);

    let questions;
    try {
      questions = JSON.parse(resultText);
    } catch (jsonErr) {
      console.error('Gemini output was not valid JSON, applying fallback parser', jsonErr);
      questions = [
        {
          question: `What is your experience working as a ${jobTitle}?`,
          type: 'technical',
          expectedAnswer:
            'Candidate should describe their relevant years and core technologies used.',
        },
        {
          question: 'Tell me about a challenging project you worked on recently.',
          type: 'behavioral',
          expectedAnswer: 'Identify problem, action, and key results.',
        },
        {
          question: 'How do you handle deadlines that are tight or changing?',
          type: 'situational',
          expectedAnswer: 'Prioritization, clear stakeholder communication, and focused sprints.',
        },
        {
          question: 'Why do you want to join our organization?',
          type: 'culture-fit',
          expectedAnswer:
            'Demonstrates knowledge of system goals and alignment with core standards.',
        },
      ];
    }

    return NextResponse.json({ success: true, questions });
  } catch (error: any) {
    console.error('Interview questions generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal AI questions generation failure' },
      { status: 500 }
    );
  }
}
export const maxDuration = 60;
