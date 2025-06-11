import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { evaluatorRegistry, EvaluationRequest, BatchEvaluationRequest } from '@/lib/evaluators';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { rateLimiter } from '@/lib/rate-limit';
import { TraceService } from '@/lib/tracing/service';

// Validation schemas
const evaluationRequestSchema = z.object({
  prompt: z.string().min(1),
  response: z.string().min(1),
  context: z.string().optional(),
  expectedOutput: z.string().optional(),
  evaluatorId: z.string(),
  metadata: z.record(z.any()).optional(),
  promptId: z.string().optional(),
  traceId: z.string().optional()
});

const batchEvaluationRequestSchema = z.object({
  evaluations: z.array(evaluationRequestSchema),
  evaluatorId: z.string()
});

// GET /api/evaluations - List available evaluators
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const evaluators = evaluatorRegistry.list();
    
    return NextResponse.json({
      evaluators,
      total: evaluators.length
    });
  } catch (error) {
    console.error('Error listing evaluators:', error);
    return NextResponse.json(
      { error: 'Failed to list evaluators' },
      { status: 500 }
    );
  }
}

// POST /api/evaluations - Run evaluation
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const identifier = `evaluation:${session.user.id}`;
    const { success, reset } = await rateLimiter.limit(identifier, {
      requests: 100,
      window: '1m'
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', reset },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // Check if batch request
    const isBatch = Array.isArray(body.evaluations);
    
    if (isBatch) {
      const validatedData = batchEvaluationRequestSchema.parse(body);
      const evaluator = evaluatorRegistry.get(validatedData.evaluatorId);
      
      if (!evaluator) {
        return NextResponse.json(
          { error: `Evaluator ${validatedData.evaluatorId} not found` },
          { status: 404 }
        );
      }

      // Run batch evaluation
      const results = await evaluator.batchEvaluate(validatedData.evaluations);
      
      // Store results if promptIds are provided
      const supabase = await createClient();
      const storedResults = [];

      for (let i = 0; i < results.length; i++) {
        const evaluation = validatedData.evaluations[i];
        const result = results[i];
        
        if (evaluation.promptId) {
          const { data, error } = await supabase
            .from('prompt_evaluations')
            .insert({
              prompt_id: evaluation.promptId,
              user_id: session.user.id,
              evaluator_id: validatedData.evaluatorId,
              score: result.score,
              reasoning: result.reasoning,
              metadata: result.metadata,
              request_data: {
                prompt: evaluation.prompt,
                response: evaluation.response,
                context: evaluation.context,
                expectedOutput: evaluation.expectedOutput
              }
            })
            .select()
            .single();

          if (!error && data) {
            storedResults.push(data);
          }
        }
      }

      return NextResponse.json({
        results,
        storedResults: storedResults.length > 0 ? storedResults : undefined
      });
    } else {
      // Single evaluation
      const validatedData = evaluationRequestSchema.parse(body);
      const evaluator = evaluatorRegistry.get(validatedData.evaluatorId);
      
      if (!evaluator) {
        return NextResponse.json(
          { error: `Evaluator ${validatedData.evaluatorId} not found` },
          { status: 404 }
        );
      }

      // Track evaluation in tracing system if traceId provided
      const traceService = new TraceService();
      let traceEvent;
      if (validatedData.traceId) {
        traceEvent = await traceService.logEvent({
          trace_id: validatedData.traceId,
          event_type: 'evaluation_started',
          event_data: {
            evaluatorId: validatedData.evaluatorId,
            promptId: validatedData.promptId
          },
          timestamp: new Date().toISOString()
        });
      }

      // Run evaluation
      const result = await evaluator.evaluate(validatedData);
      
      // Store result if promptId is provided
      let storedResult;
      if (validatedData.promptId) {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from('prompt_evaluations')
          .insert({
            prompt_id: validatedData.promptId,
            user_id: session.user.id,
            evaluator_id: validatedData.evaluatorId,
            score: result.score,
            reasoning: result.reasoning,
            metadata: {
              ...result.metadata,
              traceId: validatedData.traceId
            },
            request_data: {
              prompt: validatedData.prompt,
              response: validatedData.response,
              context: validatedData.context,
              expectedOutput: validatedData.expectedOutput
            }
          })
          .select()
          .single();

        if (!error && data) {
          storedResult = data;
        }
      }

      // Update trace with evaluation result
      if (traceEvent && validatedData.traceId) {
        await traceService.logEvent({
          trace_id: validatedData.traceId,
          event_type: 'evaluation_completed',
          event_data: {
            score: result.score,
            evaluatorId: validatedData.evaluatorId,
            reasoning: result.reasoning
          },
          timestamp: new Date().toISOString()
        });
      }

      return NextResponse.json({
        result,
        storedResult,
        traceId: validatedData.traceId
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error running evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to run evaluation' },
      { status: 500 }
    );
  }
}