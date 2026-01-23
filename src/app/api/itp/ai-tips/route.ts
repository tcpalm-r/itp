import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromCookies } from '@/lib/auth-server';
import { BehaviorComparison } from '@/types';

interface AITipRequest {
  employeeName: string;
  significantDifferences: BehaviorComparison[];
}

interface AITip {
  tip: string;
  behaviorContext?: string;
}

// POST /api/itp/ai-tips
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI tips are not configured. Please add ANTHROPIC_API_KEY to environment variables.' },
      { status: 503 }
    );
  }

  try {
    const body: AITipRequest = await request.json();
    const { employeeName, significantDifferences } = body;

    if (!significantDifferences || significantDifferences.length === 0) {
      return NextResponse.json({ tips: [] });
    }

    // Build context about the disagreements
    const disagreementDescriptions = significantDifferences.map((diff) => {
      const direction = (diff.managerRating ?? 0) < (diff.selfRating ?? 0)
        ? 'Manager rated lower than employee self-rating'
        : 'Manager rated higher than employee self-rating';
      return `- ${diff.behaviorName} (${diff.virtue.replace('_', ' ')}): Manager rated ${diff.managerRating}, Employee self-rated ${diff.selfRating}. ${direction}.`;
    }).join('\n');

    const prompt = `You are an expert leadership coach helping a manager prepare for a feedback conversation with their direct report.

The manager has completed an "Ideal Team Player" assessment for their employee, and there are significant differences (4+ points on a 1-10 scale) between the manager's ratings and the employee's self-assessment.

Employee name: ${employeeName}

Behaviors with significant rating differences:
${disagreementDescriptions}

Please provide 3-5 specific, actionable conversation tips for the manager to discuss these differences constructively. Focus on:
1. How to approach the conversation with empathy and curiosity
2. Questions to ask to understand the employee's perspective
3. How to share specific examples without being confrontational
4. Ways to turn this into a growth opportunity

Keep each tip concise (1-2 sentences). Be specific to the behaviors mentioned.

Respond in JSON format: { "tips": [{ "tip": "Your tip here", "behaviorContext": "optional - which behavior this relates to" }] }`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        system: 'You are a helpful leadership coach. Always respond with valid JSON.',
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('Anthropic API error:', anthropicResponse.status, errorText);
      return NextResponse.json(
        { error: `Anthropic API error (${anthropicResponse.status}): ${errorText}` },
        { status: 500 }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const content = anthropicData.content?.[0]?.text;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let tips: AITip[] = [];
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        tips = parsed.tips || [];
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: create a single tip from the raw response
      tips = [{ tip: content.substring(0, 500) }];
    }

    return NextResponse.json({ tips });
  } catch (err) {
    console.error('AI tips error:', err);
    return NextResponse.json(
      { error: 'Failed to generate conversation tips' },
      { status: 500 }
    );
  }
}
