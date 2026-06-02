const hfToken = process.env.HUGGINGFACE_API_TOKEN;
const isMock = !hfToken || hfToken === 'mock-hf-token' || hfToken === '';

interface SentimentResult {
  label: 'POSITIVE' | 'NEGATIVE';
  score: number;
}

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  if (isMock) {
    console.log('--- [MOCK HUGGINGFACE CALLED] ---');
    console.log('Text:', text.substring(0, 100) + '...');

    const lower = text.toLowerCase();
    const negativeKeywords = ['workload', 'slow', 'morale', 'unrealistic', 'frustrating', 'stress', 'overtime'];
    const hasNegative = negativeKeywords.some((keyword) => lower.includes(keyword));

    if (hasNegative) {
      return {
        label: 'NEGATIVE',
        score: 0.85,
      };
    }

    return {
      label: 'POSITIVE',
      score: 0.92,
    };
  }

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      throw new Error(`HF request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // HuggingFace output for distilbert sst-2: [[{label: "POSITIVE", score: 0.99}, {label: "NEGATIVE", score: 0.01}]]
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const results = data[0];
      // Find the label with the highest score
      const sorted = [...results].sort((a: any, b: any) => b.score - a.score);
      return {
        label: sorted[0].label as 'POSITIVE' | 'NEGATIVE',
        score: sorted[0].score,
      };
    }

    throw new Error('Invalid HF response structure');
  } catch (err) {
    console.error('HF Inference failed, falling back to mock classifier:', err);
    // Safe rule-based fallback if token is invalid or rate limited
    const lower = text.toLowerCase();
    const negativeKeywords = ['workload', 'slow', 'morale', 'unrealistic', 'frustrating', 'stress', 'overtime'];
    const hasNegative = negativeKeywords.some((keyword) => lower.includes(keyword));
    return {
      label: hasNegative ? 'NEGATIVE' : 'POSITIVE',
      score: 0.75,
    };
  }
}
