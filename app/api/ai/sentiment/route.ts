import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Feedback from '@/models/Feedback';
import { auth } from '@/lib/auth';
import { analyzeSentiment } from '@/lib/huggingface';

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !['admin', 'senior_manager'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { feedbacks } = await request.json();

    if (!feedbacks || !Array.isArray(feedbacks)) {
      return NextResponse.json({ error: 'Missing feedbacks array' }, { status: 400 });
    }

    await connectToDatabase();

    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    const processedResults = [];

    // Loop and categorize each pulse review
    for (const item of feedbacks) {
      const { userId, text } = item;
      if (!userId || !text) continue;

      const sentiment = await analyzeSentiment(text);

      const record = await Feedback.findOneAndUpdate(
        { userId, month, year },
        {
          $set: {
            sentimentScore: sentiment.score,
            sentimentLabel: sentiment.label,
          },
          $push: {
            responses: text,
          },
        },
        { upsert: true, new: true }
      );

      processedResults.push({
        userId,
        text,
        sentimentLabel: sentiment.label,
        sentimentScore: sentiment.score,
        recordId: record._id,
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: processedResults.length,
      results: processedResults,
    });
  } catch (error: any) {
    console.error('Sentiment API error:', error);
    return NextResponse.json(
      { error: error.message || 'Sentiment processing failed' },
      { status: 500 }
    );
  }
}
export const maxDuration = 60;
