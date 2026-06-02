import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';
import Candidate from '@/models/Candidate';
import User from '@/models/User';
import { auth } from '@/lib/auth';
import { getGeminiModel } from '@/lib/gemini';

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = session.user as any;
  const { messages } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Missing or invalid messages history' }, { status: 400 });
  }

  const userMessage = messages[messages.length - 1]?.content || '';

  await connectToDatabase();
  const model = getGeminiModel();

  try {
    // Phase 1: Classify intent
    const classificationPrompt = `
      You are an AI router for an HR system. Analyze the user's message and determine if they are querying the database for:
      1. "leave_balance" (e.g. "how many leaves do I have left?", "casual leave balance")
      2. "attendance_summary" (e.g. "show my attendance this month", "how many days was I present?")
      3. "shortlisted_candidates" (e.g. "which candidates are shortlisted?", "candidates for frontend role")
      4. "team_absences" (e.g. "which department has the most absences?", "team absence stats")
      5. "general" (none of the above)

      Respond with JSON ONLY in this format: { "intent": "leave_balance" | "attendance_summary" | "shortlisted_candidates" | "team_absences" | "general" }
      User query: "${userMessage}"
    `;

    const classificationResult = await model.generateContent(classificationPrompt);
    let classText = classificationResult.response.text().trim();

    // Clean JSON markdown tags if present
    if (classText.startsWith('```json')) {
      classText = classText.substring(7, classText.length - 3).trim();
    } else if (classText.startsWith('```')) {
      classText = classText.substring(3, classText.length - 3).trim();
    }

    let intent = 'general';
    try {
      intent = JSON.parse(classText).intent || 'general';
    } catch (e) {
      console.error('Failed to parse intent, defaulting to general', e);
    }

    console.log(`Classified intent: ${intent}`);

    let dataContext = '';

    // Phase 2: Query database based on intent
    if (intent === 'leave_balance') {
      const currentYear = new Date().getFullYear();
      const approvedLeaves = await Leave.find({
        userId: currentUser.id,
        status: 'approved',
        from: { $gte: new Date(currentYear, 0, 1) },
      });

      const used = { casual: 0, sick: 0, earned: 0, unpaid: 0 };
      approvedLeaves.forEach((l) => {
        const diffDays =
          Math.ceil(Math.abs(new Date(l.to).getTime() - new Date(l.from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (l.type in used) {
          used[l.type as keyof typeof used] += diffDays;
        }
      });

      dataContext = `Database output: Leave balance limits are Casual: 12, Sick: 10, Earned: 15. The logged-in employee (${currentUser.name}) has used: Casual: ${used.casual} days, Sick: ${used.sick} days, Earned: ${used.earned} days. Remaining balances: Casual: ${12 - used.casual}, Sick: ${10 - used.sick}, Earned: ${15 - used.earned}.`;
    } 
    
    else if (intent === 'attendance_summary') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const records = await Attendance.find({
        userId: currentUser.id,
        date: { $gte: startOfMonth, $lte: endOfMonth },
      });

      const summary = { present: 0, absent: 0, late: 0, wfh: 0, holiday: 0 };
      records.forEach((r) => {
        if (r.status in summary) {
          summary[r.status as keyof typeof summary]++;
        }
      });

      dataContext = `Database output: Attendance logs for employee (${currentUser.name}) this month: Present: ${summary.present} days, Late: ${summary.late} days, Absent: ${summary.absent} days, WFH: ${summary.wfh} days, Holidays: ${summary.holiday} days.`;
    } 
    
    else if (intent === 'shortlisted_candidates') {
      if (!['admin', 'hr_recruiter'].includes(currentUser.role)) {
        dataContext = `Database output: Access Denied. The user is a ${currentUser.role} and does not have security credentials to view shortlisted candidate applications.`;
      } else {
        const candidates = await Candidate.find({
          stage: { $in: ['screened', 'interview', 'offer'] },
        }).populate('jobId', 'title department');

        const candidateLines = candidates.map(
          (c) => `- ${c.name} for role "${(c.jobId as any)?.title || 'Job'}" (AI Score: ${c.aiScore}, Stage: ${c.stage})`
        );

        dataContext = `Database output: Currently shortlisted candidates:\n${
          candidateLines.length > 0 ? candidateLines.join('\n') : 'No candidates currently shortlisted.'
        }`;
      }
    } 
    
    else if (intent === 'team_absences') {
      if (!['admin', 'senior_manager'].includes(currentUser.role)) {
        dataContext = `Database output: Access Denied. The user is a ${currentUser.role} and does not have manager permissions to view company-wide absences.`;
      } else {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Fetch all absent records for the month
        const absents = await Attendance.find({
          status: 'absent',
          date: { $gte: startOfMonth, $lte: endOfMonth },
        }).populate('userId', 'department');

        const deptCounts: Record<string, number> = {};
        absents.forEach((rec) => {
          const dept = (rec.userId as any)?.department || 'Unknown';
          deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        });

        let highestDept = 'None';
        let maxAbs = 0;
        Object.entries(deptCounts).forEach(([dept, count]) => {
          if (count > maxAbs) {
            maxAbs = count;
            highestDept = dept;
          }
        });

        dataContext = `Database output: Monthly Absences grouped by department: ${JSON.stringify(
          deptCounts
        )}. The department with the most absences this month is ${highestDept} with ${maxAbs} absent logs.`;
      }
    }

    // Phase 3: Final prompt to Gemini with injected context
    const finalSystemPrompt = `
      You are FWC SmartHR's intelligent HR voice assistant. 
      You are chatting with an employee named "${currentUser.name}", whose role is "${currentUser.role}" and department is "${currentUser.department}".
      Always format your answers in clean natural text. Never disclose database schema variables.
      If the user's query requires specific data, it has been resolved from the database for you:
      ---
      ${dataContext}
      ---
      Respond to the user's message using the database context if available, otherwise answer general queries politely within your limits.
    `;

    // Construct conversation block including previous history
    const contextPrompt = `${finalSystemPrompt}\n\nUser: ${userMessage}\nAssistant:`;
    const finalResult = await model.generateContent(contextPrompt);
    const reply = finalResult.response.text().trim();

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Chatbot API error:', error);
    return NextResponse.json({ reply: "I'm sorry, I'm having trouble connecting to my service. Please try again in a moment." });
  }
}
