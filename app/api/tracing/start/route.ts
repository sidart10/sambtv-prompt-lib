// Task 15: Start Trace API Endpoint
// Initialize new AI interaction trace

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { TraceService } from '@/lib/tracing/service';
import { z } from 'zod';

const startTraceSchema = z.object({
  source: z.enum(['playground', 'api', 'test']),
  promptId: z.string().uuid().optional(),
  model: z.string().min(1),
  prompt: z.string().min(1).max(50000),
  systemPrompt: z.string().max(10000).optional(),
  parameters: z.record(z.any()).optional(),
  sessionId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional()
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
    const validation = startTraceSchema.safeParse(body);
    
    if (!validation.success) {
      return Response.json(
        { 
          error: 'Invalid request data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Extract user agent and IP for metadata
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIP || undefined;

    // Start the trace
    const trace = await TraceService.startTrace({
      userId: session.user.id,
      source: data.source,
      promptId: data.promptId,
      model: data.model,
      prompt: data.prompt,
      systemPrompt: data.systemPrompt,
      parameters: data.parameters || {},
      sessionId: data.sessionId,
      userAgent,
      ipAddress
    });

    return Response.json({
      success: true,
      traceId: trace.traceId,
      sessionId: trace.sessionId,
      startTime: trace.startTime,
      metadata: trace.metadata
    });

  } catch (error) {
    console.error('[API] Start trace error:', error);
    
    return Response.json(
      { 
        error: 'Failed to start trace',
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