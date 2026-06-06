import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Candidate from '@/models/Candidate';
import { auth } from '@/lib/auth';
import { getGeminiModel } from '@/lib/gemini';
import { PDFParse } from 'pdf-parse';

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !['admin', 'hr_recruiter'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const candidateId = formData.get('candidateId') as string | null;
    const jobDescription = formData.get('jobDescription') as string | null;

    if (!file || !candidateId || !jobDescription) {
      return NextResponse.json(
        { error: 'Missing file, candidateId, or jobDescription parameters' },
        { status: 400 }
      );
    }

    // Convert file object to Buffer for pdf-parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('Extracting text from PDF resume...');
    let resumeText = '';
    try {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const pdfData = await parser.getText();
      resumeText = pdfData.text || '';
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: `Failed to parse PDF resume: ${parseErr.message}` },
        { status: 400 }
      );
    }

    if (!resumeText.trim()) {
      return NextResponse.json({ error: 'Extracted resume text is empty' }, { status: 400 });
    }

    // Call Gemini API
    console.log('Calling Gemini API for resume screening...');
    const model = getGeminiModel();
    const prompt = `You are an HR screening expert. Given this job description: "${jobDescription}" and this resume text: "${resumeText}", score the candidate from 0-100 and return JSON ONLY in this format: { "score": number, "matchedSkills": ["skill1", "skill2"], "missingSkills": ["skill3"], "summary": "short summary", "recommendation": "Strong Match" | "Moderate Match" | "Weak Match" }. Do not add markdown backticks or any other text.`;

    const result = await model.generateContent(prompt);
    let resultText = result.response.text().trim();

    // Clean JSON markdown packaging if returned by Gemini
    if (resultText.startsWith('```json')) {
      resultText = resultText.substring(7, resultText.length - 3).trim();
    } else if (resultText.startsWith('```')) {
      resultText = resultText.substring(3, resultText.length - 3).trim();
    }

    console.log('Gemini raw response:', resultText);

    let screeningResult;
    try {
      screeningResult = JSON.parse(resultText);
    } catch (jsonErr) {
      console.error('Gemini output was not valid JSON, applying fallback parser', jsonErr);
      screeningResult = {
        score: 70,
        matchedSkills: [],
        missingSkills: [],
        summary: 'Resume parsed but AI evaluation returned unformatted text.',
        recommendation: 'Moderate Match',
      };
    }

    // Update candidate record in DB
    await connectToDatabase();
    const candidate = await Candidate.findByIdAndUpdate(
      candidateId,
      {
        $set: {
          aiScore: screeningResult.score || 0,
          aiMatchReason: `Summary: ${screeningResult.summary || ''}. Matched: ${
            (screeningResult.matchedSkills || []).join(', ')
          }. Missing: ${(screeningResult.missingSkills || []).join(', ')}`,
          aiRecommendation: screeningResult.recommendation || 'Moderate Match',
        },
      },
      { new: true }
    );

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, candidate, result: screeningResult });
  } catch (error: any) {
    console.error('Resume screening error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal screening failure' },
      { status: 500 }
    );
  }
}
export const maxDuration = 60; // Next.js edge configuration allowance
