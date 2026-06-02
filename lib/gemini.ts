import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const isMock = !apiKey || apiKey === 'mock-gemini-key' || apiKey === '';

// Mock Model class for testing/compilation safety when API keys are not supplied
class MockGeminiModel {
  async generateContent(prompt: string) {
    console.log('--- [MOCK GEMINI CALLED] ---');
    console.log('Prompt:', prompt.substring(0, 150) + '...');
    
    let text = '';
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('screening') || lowerPrompt.includes('score the candidate')) {
      // Mock Resume Screener response
      text = JSON.stringify({
        score: 82,
        matchedSkills: ['React', 'TypeScript', 'TailwindCSS', 'JavaScript'],
        missingSkills: ['MongoDB Optimization', 'Upstash Redis Caching'],
        summary: 'The candidate demonstrates strong experience in modern frontend development and UI styling, but has limited exposure to database design and performance caching.',
        recommendation: 'Moderate Match',
      });
    } else if (lowerPrompt.includes('performance review') || lowerPrompt.includes('observations:')) {
      // Mock Review Generator response
      text = `Overall Summary: Jane has shown exceptional dedication this quarter, meeting development deadlines and demonstrating a strong grasp of our product goals.
Key Strengths:
- Excellent frontend execution using React and TypeScript.
- Strong team collaborator with good communication skills.
- High attention to design details and responsiveness.
Areas for Improvement:
- Needs more exposure to serverless database indexing.
- Increase familiarity with automated testing frameworks.
Goals for Next Quarter:
1. Complete Next.js advanced app optimization courses.
2. Formulate 3 reusable dashboard modules.
3. Improve API query response times by 15%.`;
    } else if (lowerPrompt.includes('interview questions') || lowerPrompt.includes('jobtitle:')) {
      // Mock Interview Prep response
      text = JSON.stringify([
        {
          question: 'What are the main differences between Server Components and Client Components in Next.js?',
          type: 'technical',
          expectedAnswer: 'Server Components render on the server, saving bundle size. Client Components enable browser state.',
        },
        {
          question: 'Describe a situation where you had to debug a slow database query. What was your process?',
          type: 'situational',
          expectedAnswer: 'Analyze query plans, identify missing indexes, run profile triggers, and cache hot data.',
        },
        {
          question: 'Tell me about a time you had to adapt to a sudden change in requirements right before a sprint release.',
          type: 'behavioral',
          expectedAnswer: 'Focus on core priorities, communicate immediately with stakeholders, and phase non-critical edits.',
        },
        {
          question: 'How do you ensure your code remains accessible and matches design specs?',
          type: 'culture-fit',
          expectedAnswer: 'Contrast checkers, semantic HTML, screen-reader testing, and close collaboration with UI designers.',
        },
      ]);
    } else {
      // Mock Chatbot responses
      if (lowerPrompt.includes('casual leaves') || lowerPrompt.includes('how many casual')) {
        text = 'According to the records, you have 10 casual leaves remaining out of your 12 annual allowance.';
      } else if (lowerPrompt.includes('attendance') || lowerPrompt.includes('show my attendance')) {
        text = "I've pulled your attendance logs. You have been present for 22 days, late 2 times, and had 2 WFH sessions this month.";
      } else if (lowerPrompt.includes('shortlisted') || lowerPrompt.includes('frontend role')) {
        text = 'Shortlisted candidates for the Senior Frontend Engineer role are: Jane Doe (Score: 92) and John Smith (Score: 84).';
      } else if (lowerPrompt.includes('absences') || lowerPrompt.includes('most absences')) {
        text = 'The Sales department has the most absences this month, with a total of 15 absent days logged across the team.';
      } else {
        text = "Hello! I'm the FWC SmartHR AI Assistant. How can I help you manage attendance, leaves, or reviews today?";
      }
    }

    return {
      response: {
        text: () => text,
      },
    };
  }
}

export function getGeminiModel() {
  if (isMock) {
    return new MockGeminiModel() as any;
  }
  const ai = new GoogleGenerativeAI(apiKey);
  return ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
}
