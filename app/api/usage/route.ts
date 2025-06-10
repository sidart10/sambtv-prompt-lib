import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Schema for recording usage
const recordUsageSchema = z.object({
  sourceApp: z.enum(['main', 'langfuse']).default('main'),
  eventType: z.string(),
  modelId: z.string(),
  provider: z.string(),
  promptTokens: z.number().min(0).default(0),
  completionTokens: z.number().min(0).default(0),
  totalTokens: z.number().min(0).default(0),
  inputCost: z.number().min(0).default(0),
  outputCost: z.number().min(0).default(0),
  totalCost: z.number().min(0).default(0),
  latencyMs: z.number().min(0).optional(),
  status: z.enum(['success', 'error']).default('success'),
  errorMessage: z.string().optional(),
  promptId: z.number().optional(),
  traceId: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Schema for querying usage
const queryUsageSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sourceApp: z.enum(['main', 'langfuse', 'all']).optional(),
  provider: z.string().optional(),
  modelId: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional()
});

// Record usage data
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = recordUsageSchema.parse(body);
    
    const supabase = await createClient();
    
    // Insert usage record
    const { error } = await supabase
      .from('usage_analytics')
      .insert({
        user_id: session.user.id,
        source_app: data.sourceApp,
        event_type: data.eventType,
        model_id: data.modelId,
        provider: data.provider,
        prompt_tokens: data.promptTokens,
        completion_tokens: data.completionTokens,
        total_tokens: data.totalTokens,
        input_cost: data.inputCost,
        output_cost: data.outputCost,
        total_cost: data.totalCost,
        latency_ms: data.latencyMs,
        status: data.status,
        error_message: data.errorMessage,
        prompt_id: data.promptId,
        trace_id: data.traceId,
        session_id: data.sessionId,
        metadata: data.metadata
      });

    if (error) {
      console.error('Failed to record usage:', error);
      return NextResponse.json(
        { error: 'Failed to record usage data' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Usage recording error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to record usage' },
      { status: 500 }
    );
  }
}

// Query usage data
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const params = {
      startDate: searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: searchParams.get('endDate') || new Date().toISOString(),
      sourceApp: searchParams.get('sourceApp') || 'all',
      provider: searchParams.get('provider'),
      modelId: searchParams.get('modelId'),
      groupBy: searchParams.get('groupBy') || 'day'
    };

    const validatedParams = queryUsageSchema.parse(params);
    const supabase = await createClient();

    // Query daily stats for better performance
    let query = supabase
      .from('usage_daily_stats')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', validatedParams.startDate!)
      .lte('date', validatedParams.endDate!)
      .order('date', { ascending: true });

    if (validatedParams.sourceApp && validatedParams.sourceApp !== 'all') {
      query = query.eq('source_app', validatedParams.sourceApp);
    }

    if (validatedParams.provider) {
      query = query.eq('provider', validatedParams.provider);
    }

    if (validatedParams.modelId) {
      query = query.eq('model_id', validatedParams.modelId);
    }

    const { data: dailyStats, error } = await query;

    if (error) {
      console.error('Failed to fetch usage data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch usage data' },
        { status: 500 }
      );
    }

    // Process and aggregate data based on groupBy parameter
    const aggregatedData = aggregateUsageData(dailyStats || [], validatedParams.groupBy!);
    
    // Calculate totals
    const totals = calculateTotals(dailyStats || []);

    // Get cost breakdown by provider
    const costByProvider = getCostByProvider(dailyStats || []);

    // Get top models by usage
    const topModels = getTopModels(dailyStats || []);

    return NextResponse.json({
      data: aggregatedData,
      totals,
      costByProvider,
      topModels,
      period: {
        from: validatedParams.startDate,
        to: validatedParams.endDate
      }
    });

  } catch (error) {
    console.error('Usage query error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}

function aggregateUsageData(dailyStats: any[], groupBy: string) {
  const grouped: Record<string, any> = {};

  dailyStats.forEach(stat => {
    const date = new Date(stat.date);
    let groupKey: string;

    switch (groupBy) {
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        groupKey = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default: // day
        groupKey = stat.date;
    }

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        date: groupKey,
        requests: 0,
        tokens: 0,
        cost: 0,
        errors: 0,
        avgLatency: 0,
        latencyCount: 0
      };
    }

    grouped[groupKey].requests += stat.request_count;
    grouped[groupKey].tokens += stat.total_tokens;
    grouped[groupKey].cost += Number(stat.total_cost);
    grouped[groupKey].errors += stat.error_count;
    
    if (stat.avg_latency_ms) {
      grouped[groupKey].avgLatency = 
        (grouped[groupKey].avgLatency * grouped[groupKey].latencyCount + 
         stat.avg_latency_ms * stat.request_count) / 
        (grouped[groupKey].latencyCount + stat.request_count);
      grouped[groupKey].latencyCount += stat.request_count;
    }
  });

  // Clean up and format
  return Object.values(grouped).map((group: any) => ({
    date: group.date,
    requests: group.requests,
    tokens: group.tokens,
    cost: Number(group.cost.toFixed(6)),
    errors: group.errors,
    avgLatency: Math.round(group.avgLatency),
    errorRate: group.requests > 0 ? Number((group.errors / group.requests).toFixed(3)) : 0
  }));
}

function calculateTotals(dailyStats: any[]) {
  return dailyStats.reduce((acc, stat) => ({
    requests: acc.requests + stat.request_count,
    tokens: acc.tokens + stat.total_tokens,
    cost: acc.cost + Number(stat.total_cost),
    errors: acc.errors + stat.error_count,
    avgLatency: acc.latencySum / acc.latencyCount || 0,
    latencySum: acc.latencySum + (stat.avg_latency_ms || 0) * stat.request_count,
    latencyCount: acc.latencyCount + (stat.avg_latency_ms ? stat.request_count : 0)
  }), {
    requests: 0,
    tokens: 0,
    cost: 0,
    errors: 0,
    avgLatency: 0,
    latencySum: 0,
    latencyCount: 0
  });
}

function getCostByProvider(dailyStats: any[]) {
  const byProvider: Record<string, number> = {};
  
  dailyStats.forEach(stat => {
    if (!byProvider[stat.provider]) {
      byProvider[stat.provider] = 0;
    }
    byProvider[stat.provider] += Number(stat.total_cost);
  });

  return Object.entries(byProvider)
    .map(([provider, cost]) => ({
      provider,
      cost: Number(cost.toFixed(6))
    }))
    .sort((a, b) => b.cost - a.cost);
}

function getTopModels(dailyStats: any[]) {
  const byModel: Record<string, { requests: number; tokens: number; cost: number }> = {};
  
  dailyStats.forEach(stat => {
    if (!byModel[stat.model_id]) {
      byModel[stat.model_id] = { requests: 0, tokens: 0, cost: 0 };
    }
    byModel[stat.model_id].requests += stat.request_count;
    byModel[stat.model_id].tokens += stat.total_tokens;
    byModel[stat.model_id].cost += Number(stat.total_cost);
  });

  return Object.entries(byModel)
    .map(([model, stats]) => ({
      model,
      ...stats,
      cost: Number(stats.cost.toFixed(6))
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);
}