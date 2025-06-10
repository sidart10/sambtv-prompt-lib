import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { Analytics } from '@/lib/analytics';
import { isLangfuseEnabled } from '@/lib/langfuse/client';

// Schema for creating a trace reference
const createTraceSchema = z.object({
  promptId: z.number(),
  traceId: z.string(),
  tokenUsage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number()
  }).optional(),
  totalCost: z.number().optional(),
  latencyMs: z.number().optional()
});

// Schema for fetching evaluation data
const getEvaluationSchema = z.object({
  promptId: z.string().transform(Number),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = createTraceSchema.parse(body);
    
    const supabase = await createClient();
    
    // Insert trace reference
    const { error } = await supabase
      .from('langfuse_traces')
      .insert({
        prompt_id: data.promptId,
        langfuse_trace_id: data.traceId,
        token_usage: data.tokenUsage,
        total_cost: data.totalCost,
        latency_ms: data.latencyMs
      });
    
    if (error) {
      console.error('Failed to store trace reference:', error);
      return NextResponse.json(
        { error: 'Failed to store trace reference' },
        { status: 500 }
      );
    }

    // Track analytics
    await Analytics.trackEvent({
      userId: session.user?.id,
      eventType: 'langfuse_trace_created',
      eventData: {
        promptId: data.promptId,
        traceId: data.traceId,
        cost: data.totalCost
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Trace creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create trace reference' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const promptId = searchParams.get('promptId');
    
    if (!promptId) {
      return NextResponse.json(
        { error: 'promptId is required' },
        { status: 400 }
      );
    }

    const validatedData = getEvaluationSchema.parse({ promptId });
    
    if (!isLangfuseEnabled()) {
      return NextResponse.json({
        averageScore: null,
        evaluationCount: 0,
        traces: [],
        message: 'Langfuse integration is not enabled'
      });
    }

    // First get trace references from our database
    const supabase = await createClient();
    const { data: traces, error } = await supabase
      .from('langfuse_traces')
      .select('*')
      .eq('prompt_id', validatedData.promptId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to fetch traces:', error);
      return NextResponse.json(
        { error: 'Failed to fetch evaluation data' },
        { status: 500 }
      );
    }

    if (!traces || traces.length === 0) {
      return NextResponse.json({
        averageScore: null,
        evaluationCount: 0,
        traces: [],
        recentEvaluations: []
      });
    }

    // Fetch detailed evaluation data from Langfuse API
    const langfuseUrl = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';
    const traceIds = traces.map(t => t.langfuse_trace_id);
    
    try {
      const langfuseResponse = await fetch(
        `${langfuseUrl}/api/public/traces?${traceIds.map(id => `id=${id}`).join('&')}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.LANGFUSE_PUBLIC_KEY}`
          }
        }
      );

      if (langfuseResponse.ok) {
        const langfuseData = await langfuseResponse.json();
        
        // Extract scores from Langfuse data
        const scores = langfuseData.data
          .flatMap((t: any) => t.scores || [])
          .filter((s: any) => s.name === 'quality' || s.name === 'accuracy');
        
        const avgScore = scores.length > 0
          ? scores.reduce((sum: number, s: any) => sum + s.value, 0) / scores.length
          : null;

        // Update our database with the latest scores
        for (const trace of langfuseData.data) {
          if (trace.scores && trace.scores.length > 0) {
            await supabase
              .from('langfuse_traces')
              .update({
                evaluation_scores: trace.scores,
                updated_at: new Date().toISOString()
              })
              .eq('langfuse_trace_id', trace.id);
          }
        }

        return NextResponse.json({
          averageScore: avgScore,
          evaluationCount: scores.length,
          traces: langfuseData.data,
          recentEvaluations: scores.slice(0, 10)
        });
      }
    } catch (langfuseError) {
      console.error('Failed to fetch from Langfuse:', langfuseError);
      // Fall back to our cached data
    }

    // If Langfuse API fails, use our cached scores
    const cachedScores = traces
      .filter(t => t.evaluation_scores)
      .flatMap(t => t.evaluation_scores as any[])
      .filter(s => s.name === 'quality' || s.name === 'accuracy');
    
    const avgScore = cachedScores.length > 0
      ? cachedScores.reduce((sum, s) => sum + s.value, 0) / cachedScores.length
      : null;

    return NextResponse.json({
      averageScore: avgScore,
      evaluationCount: cachedScores.length,
      traces: traces,
      recentEvaluations: cachedScores.slice(0, 10),
      fromCache: true
    });

  } catch (error) {
    console.error('Evaluation fetch error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch evaluation data' },
      { status: 500 }
    );
  }
}