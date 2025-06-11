import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { evaluatorRegistry, EvaluationComparison } from '@/lib/evaluators';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { rateLimiter } from '@/lib/rate-limit';

// Validation schema
const comparisonRequestSchema = z.object({
  promptId: z.string(),
  variantA: z.object({
    id: z.string(),
    prompt: z.string(),
    response: z.string()
  }),
  variantB: z.object({
    id: z.string(),
    prompt: z.string(),
    response: z.string()
  }),
  evaluatorIds: z.array(z.string()).optional(),
  context: z.string().optional()
});

// POST /api/evaluations/compare - Compare two prompt variants
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const identifier = `compare:${session.user.id}`;
    const { success, reset } = await rateLimiter.limit(identifier, {
      requests: 50,
      window: '1m'
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', reset },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = comparisonRequestSchema.parse(body);

    // Use composite evaluator by default if no specific evaluators requested
    const evaluatorIds = validatedData.evaluatorIds || ['composite'];
    
    const comparisons: EvaluationComparison[] = [];
    const detailedResults: any = {
      variantA: {},
      variantB: {}
    };

    // Run evaluations for each evaluator
    for (const evaluatorId of evaluatorIds) {
      const evaluator = evaluatorRegistry.get(evaluatorId);
      
      if (!evaluator) {
        console.warn(`Evaluator ${evaluatorId} not found`);
        continue;
      }

      // Evaluate variant A
      const resultA = await evaluator.evaluate({
        prompt: validatedData.variantA.prompt,
        response: validatedData.variantA.response,
        context: validatedData.context,
        evaluatorId,
        metadata: { variantId: validatedData.variantA.id }
      });

      // Evaluate variant B
      const resultB = await evaluator.evaluate({
        prompt: validatedData.variantB.prompt,
        response: validatedData.variantB.response,
        context: validatedData.context,
        evaluatorId,
        metadata: { variantId: validatedData.variantB.id }
      });

      // Determine winner
      let winner: 'A' | 'B' | 'tie';
      let confidence: number;
      
      const scoreDiff = Math.abs(resultA.score - resultB.score);
      
      if (scoreDiff < 0.05) {
        winner = 'tie';
        confidence = 1 - scoreDiff * 20; // Higher confidence for closer scores
      } else if (resultA.score > resultB.score) {
        winner = 'A';
        confidence = Math.min(0.95, scoreDiff * 2); // Cap at 95%
      } else {
        winner = 'B';
        confidence = Math.min(0.95, scoreDiff * 2);
      }

      comparisons.push({
        promptId: validatedData.promptId,
        variantA: {
          id: validatedData.variantA.id,
          response: validatedData.variantA.response,
          evaluation: resultA
        },
        variantB: {
          id: validatedData.variantB.id,
          response: validatedData.variantB.response,
          evaluation: resultB
        },
        winner,
        confidence
      });

      // Store detailed results
      detailedResults.variantA[evaluatorId] = resultA;
      detailedResults.variantB[evaluatorId] = resultB;
    }

    // Calculate overall winner based on all evaluations
    const wins = { A: 0, B: 0, tie: 0 };
    let totalConfidence = 0;
    
    comparisons.forEach(comp => {
      wins[comp.winner]++;
      totalConfidence += comp.confidence;
    });

    let overallWinner: 'A' | 'B' | 'tie';
    if (wins.A > wins.B) {
      overallWinner = 'A';
    } else if (wins.B > wins.A) {
      overallWinner = 'B';
    } else {
      overallWinner = 'tie';
    }

    const averageConfidence = comparisons.length > 0 
      ? totalConfidence / comparisons.length 
      : 0;

    // Store comparison results
    const supabase = await createClient();
    const { data: storedComparison, error } = await supabase
      .from('prompt_comparisons')
      .insert({
        prompt_id: validatedData.promptId,
        user_id: session.user.id,
        variant_a_id: validatedData.variantA.id,
        variant_b_id: validatedData.variantB.id,
        winner: overallWinner,
        confidence: averageConfidence,
        evaluator_results: detailedResults,
        metadata: {
          evaluatorIds,
          wins,
          individualComparisons: comparisons
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing comparison:', error);
    }

    return NextResponse.json({
      comparisons,
      summary: {
        overallWinner,
        averageConfidence,
        wins,
        evaluatorsUsed: evaluatorIds.length
      },
      storedComparison: storedComparison || undefined
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error comparing variants:', error);
    return NextResponse.json(
      { error: 'Failed to compare variants' },
      { status: 500 }
    );
  }
}