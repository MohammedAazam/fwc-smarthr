import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { auth } from '@/lib/auth';
import { getGeminiModel } from '@/lib/gemini';

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !['admin', 'senior_manager'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { employeeId, rating, managerObservations, goals } = await request.json();

  if (!employeeId || !rating || !managerObservations) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  await connectToDatabase();

  try {
    const employee = await User.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const designation = employee.designation;
    const department = employee.department;

    console.log(`Generating AI Review for ${employee.name}...`);
    const model = getGeminiModel();
    const prompt = `Write a professional employee performance review for a ${designation} in the ${department} department. Rating: ${rating}/5. Manager observations: ${managerObservations}. Goal completion: ${
      goals || 'N/A'
    }. Write in formal HR language. Include: overall summary (2 sentences), key strengths (3 points), areas for improvement (2 points), goals for next quarter (3 SMART goals). Return plain text, no markdown.`;

    const result = await model.generateContent(prompt);
    const reviewText = result.response.text().trim();

    return NextResponse.json({ review: reviewText });
  } catch (error: any) {
    console.error('Review generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal AI review generation failure' },
      { status: 500 }
    );
  }
}
export const maxDuration = 60;
