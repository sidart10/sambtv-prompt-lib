// Task 15: Complete Trace API Endpoint
// Finalize trace with results and cleanup

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { TraceService } from '@/lib/tracing/service';
import { TraceResult } from '@/lib/tracing/context';
import { z } from 'zod';

const completeTraceSchema = z.object({
  traceId: z.string().uuid(),
  result: z.object({
    status: z.enum(['success', 'error', 'cancelled']),
    response: z.string().optional(),
    tokensUsed: z.object({
      input: z.number().int().min(0),
      output: z.number().int().min(0),
      total: z.number().int().min(0)
    }).optional(),
    costCalculation: z.object({
      inputCost: z.number().min(0),
      outputCost: z.number().min(0),
      totalCost: z.number().min(0)
    }).optional(),
    performanceMetrics: z.object({
      durationMs: z.number().int().min(0),
      firstTokenLatencyMs: z.number().int().min(0).optional(),
      tokensPerSecond: z.number().min(0).optional()
    }).optional(),
    qualityMetrics: z.object({
      score: z.number().min(0).max(5).optional(),
      userRating: z.number().int().min(1).max(5).optional()
    }).optional(),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
      stack: z.string().optional()
    }).optional(),
    langfuseTraceId: z.string().optional(),
    langfuseObservationId: z.string().optional(),
    streamingEnabled: z.boolean().optional()
  })
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = completeTraceSchema.safeParse(body);
    
    if (!validation.success) {
      return Response.json(
        { 
          error: 'Invalid request data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { traceId, result } = validation.data;

    // Check if trace exists and belongs to user
    const existingTrace = await TraceService.getTrace(traceId);
    if (!existingTrace) {
      return Response.json(
        { error: 'Trace not found' },
        { status: 404 }
      );
    }

    if (existingTrace.user_id !== session.user.id) {
      return Response.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if trace is already completed
    if (existingTrace.status === 'success' || existingTrace.status === 'error') {
      return Response.json(
        { 
          error: 'Trace already completed',
          currentStatus: existingTrace.status
        },
        { status: 409 }
      );
    }

    // Complete the trace
    await TraceService.completeTrace(traceId, result as TraceResult & {
      response?: string;
      langfuseTraceId?: string;
      langfuseObservationId?: string;
      streamingEnabled?: boolean;
    });

    // Calculate final metrics
    const finalTrace = await TraceService.getTrace(traceId);
    const metrics = {
      duration: finalTrace?.duration_ms,
      tokens: finalTrace?.tokens_used,
      cost: finalTrace?.cost_calculation,
      performance: {
        firstTokenLatency: finalTrace?.first_token_latency_ms,
        tokensPerSecond: finalTrace?.tokens_per_second
      }
    };

    return Response.json({
      success: true,
      traceId,
      status: result.status,
      completedAt: new Date().toISOString(),
      metrics
    });

  } catch (error) {
    console.error('[API] Complete trace error:', error);
    
    return Response.json(
      { 
        error: 'Failed to complete trace',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Allow': 'POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}