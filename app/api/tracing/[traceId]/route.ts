// Task 15: Get Trace API Endpoint
// Retrieve specific trace details and events

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { TraceService } from '@/lib/tracing/service';
import { z } from 'zod';

const getTraceParamsSchema = z.object({
  traceId: z.string().uuid()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { traceId: string } }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate trace ID
    const validation = getTraceParamsSchema.safeParse(params);
    if (!validation.success) {
      return Response.json(
        { error: 'Invalid trace ID' },
        { status: 400 }
      );
    }

    const { traceId } = validation.data;

    // Get trace data
    const trace = await TraceService.getTrace(traceId);
    if (!trace) {
      return Response.json(
        { error: 'Trace not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (trace.user_id !== session.user.id) {
      // Check if user is admin
      const userRole = (session.user as any).role;
      if (userRole !== 'admin') {
        return Response.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Get trace events if requested
    const includeEvents = request.nextUrl.searchParams.get('includeEvents') === 'true';
    let events = undefined;
    
    if (includeEvents) {
      events = await TraceService.getTraceEvents(traceId);
    }

    // Calculate derived metrics
    const derivedMetrics = {
      isCompleted: ['success', 'error', 'cancelled'].includes(trace.status),
      isActive: ['pending', 'streaming'].includes(trace.status),
      hasError: trace.status === 'error',
      totalDuration: trace.duration_ms,
      estimatedCost: trace.cost_calculation?.total_cost || 0,
      tokenEfficiency: trace.tokens_used?.total && trace.duration_ms 
        ? (trace.tokens_used.total / trace.duration_ms) * 1000 
        : null,
      qualityScore: trace.quality_score,
      hasUserRating: !!trace.user_rating
    };

    return Response.json({
      success: true,
      trace: {
        ...trace,
        derivedMetrics
      },
      events,
      metadata: {
        requestedAt: new Date().toISOString(),
        includeEvents,
        eventCount: events?.length
      }
    });

  } catch (error) {
    console.error('[API] Get trace error:', error);
    
    return Response.json(
      { 
        error: 'Failed to get trace',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { traceId: string } }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate trace ID
    const validation = getTraceParamsSchema.safeParse(params);
    if (!validation.success) {
      return Response.json(
        { error: 'Invalid trace ID' },
        { status: 400 }
      );
    }

    const { traceId } = validation.data;

    // Get trace to check ownership
    const trace = await TraceService.getTrace(traceId);
    if (!trace) {
      return Response.json(
        { error: 'Trace not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (trace.user_id !== session.user.id) {
      const userRole = (session.user as any).role;
      if (userRole !== 'admin') {
        return Response.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Delete trace and related events
    const { supabase } = await import('@/utils/supabase/client');
    
    // Delete events first (foreign key constraint)
    await supabase
      .from('trace_events')
      .delete()
      .eq('trace_id', traceId);

    // Delete trace
    const { error } = await supabase
      .from('ai_interaction_traces')
      .delete()
      .eq('trace_id', traceId);

    if (error) {
      throw new Error(`Failed to delete trace: ${error.message}`);
    }

    return Response.json({
      success: true,
      message: 'Trace deleted successfully',
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Delete trace error:', error);
    
    return Response.json(
      { 
        error: 'Failed to delete trace',
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
      'Allow': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}