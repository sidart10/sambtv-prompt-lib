// Task 15: Update Trace API Endpoint
// Update existing trace with progress information

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { TraceService } from '@/lib/tracing/service';
import { z } from 'zod';

const updateTraceSchema = z.object({
  traceId: z.string().uuid(),
  updates: z.object({
    status: z.enum(['pending', 'streaming', 'success', 'error', 'cancelled']).optional(),
    streaming_enabled: z.boolean().optional(),
    first_token_latency_ms: z.number().int().min(0).optional(),
    tokens_per_second: z.number().min(0).optional(),
    response_content: z.string().optional(),
    tokens_used: z.object({
      input: z.number().int().min(0),
      output: z.number().int().min(0),
      total: z.number().int().min(0)
    }).optional(),
    cost_calculation: z.object({
      input_cost: z.number().min(0),
      output_cost: z.number().min(0),
      total_cost: z.number().min(0)
    }).optional(),
    quality_score: z.number().min(0).max(5).optional(),
    user_rating: z.number().int().min(1).max(5).optional(),
    error_message: z.string().optional(),
    error_code: z.string().optional(),
    langfuse_trace_id: z.string().optional(),
    langfuse_observation_id: z.string().optional(),
    metadata: z.record(z.any()).optional()
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
    const validation = updateTraceSchema.safeParse(body);
    
    if (!validation.success) {
      return Response.json(
        { 
          error: 'Invalid request data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { traceId, updates } = validation.data;

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

    // Update the trace
    await TraceService.updateTrace(traceId, updates);

    // Add event for significant updates
    if (updates.status || updates.streaming_enabled !== undefined) {
      await TraceService.addTraceEvent(traceId, 'user_action', {
        action: 'trace_updated',
        updates: Object.keys(updates),
        status: updates.status,
        streaming: updates.streaming_enabled
      });
    }

    return Response.json({
      success: true,
      traceId,
      updated: Object.keys(updates),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Update trace error:', error);
    
    return Response.json(
      { 
        error: 'Failed to update trace',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Alias PUT to POST for RESTful compatibility
  return POST(request);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Allow': 'POST, PUT, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}