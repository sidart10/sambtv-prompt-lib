import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { isLangfuseEnabled } from '@/lib/langfuse/client';

// Schema for analytics request
const analyticsSchema = z.object({
  promptId: z.number().optional(),
  userId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
  metrics: z.array(z.enum(['usage', 'cost', 'latency', 'quality', 'errors'])).optional()
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!isLangfuseEnabled()) {
      return NextResponse.json({
        message: 'Langfuse integration is not enabled',
        analytics: null
      });
    }

    const { searchParams } = new URL(request.url);
    const params = {
      promptId: searchParams.get('promptId') ? Number(searchParams.get('promptId')) : undefined,
      userId: searchParams.get('userId') || undefined,
      dateFrom: searchParams.get('dateFrom') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      dateTo: searchParams.get('dateTo') || new Date().toISOString(),
      groupBy: searchParams.get('groupBy') || 'day',
      metrics: searchParams.get('metrics')?.split(',') || ['usage', 'cost', 'quality']
    };

    const validatedParams = analyticsSchema.parse(params);
    
    const supabase = await createClient();
    
    // Build query for traces
    let query = supabase
      .from('langfuse_traces')
      .select('*')
      .gte('created_at', validatedParams.dateFrom!)
      .lte('created_at', validatedParams.dateTo!)
      .order('created_at', { ascending: true });

    if (validatedParams.promptId) {
      query = query.eq('prompt_id', validatedParams.promptId);
    }

    const { data: traces, error } = await query;

    if (error) {
      console.error('Failed to fetch traces:', error);
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 500 }
      );
    }

    // Process traces into analytics
    const analytics = processTracesIntoAnalytics(traces || [], validatedParams);

    // Get additional insights
    const insights = generateInsights(analytics);

    return NextResponse.json({
      analytics,
      insights,
      period: {
        from: validatedParams.dateFrom,
        to: validatedParams.dateTo
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate analytics' },
      { status: 500 }
    );
  }
}

function processTracesIntoAnalytics(traces: any[], params: z.infer<typeof analyticsSchema>) {
  const groupedData: Record<string, any> = {};
  
  // Group traces by time period
  traces.forEach(trace => {
    const date = new Date(trace.created_at);
    let groupKey: string;
    
    switch (params.groupBy) {
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        groupKey = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default: // day
        groupKey = date.toISOString().split('T')[0];
    }
    
    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        date: groupKey,
        usage: 0,
        cost: 0,
        latency: [],
        quality: [],
        errors: 0,
        traces: 0
      };
    }
    
    const group = groupedData[groupKey];
    group.traces++;
    
    // Usage metrics
    if (trace.token_usage) {
      group.usage += trace.token_usage.totalTokens || 0;
    }
    
    // Cost metrics
    if (trace.total_cost) {
      group.cost += trace.total_cost;
    }
    
    // Latency metrics
    if (trace.latency_ms) {
      group.latency.push(trace.latency_ms);
    }
    
    // Quality metrics
    if (trace.evaluation_scores) {
      const qualityScores = (trace.evaluation_scores as any[])
        .filter(s => s.name === 'quality' || s.name === 'accuracy')
        .map(s => s.value);
      group.quality.push(...qualityScores);
    }
    
    // Error tracking
    if (trace.error || trace.status === 'error') {
      group.errors++;
    }
  });
  
  // Calculate aggregated metrics
  const timeSeriesData = Object.values(groupedData).map((group: any) => {
    const result: any = {
      date: group.date,
      traces: group.traces
    };
    
    if (params.metrics?.includes('usage')) {
      result.usage = group.usage;
      result.avgTokensPerTrace = group.traces > 0 ? Math.round(group.usage / group.traces) : 0;
    }
    
    if (params.metrics?.includes('cost')) {
      result.cost = Number(group.cost.toFixed(6));
      result.avgCostPerTrace = group.traces > 0 ? Number((group.cost / group.traces).toFixed(6)) : 0;
    }
    
    if (params.metrics?.includes('latency') && group.latency.length > 0) {
      result.avgLatency = Math.round(group.latency.reduce((a: number, b: number) => a + b, 0) / group.latency.length);
      result.p95Latency = Math.round(percentile(group.latency, 0.95));
    }
    
    if (params.metrics?.includes('quality') && group.quality.length > 0) {
      result.avgQuality = Number((group.quality.reduce((a: number, b: number) => a + b, 0) / group.quality.length).toFixed(2));
      result.qualityCount = group.quality.length;
    }
    
    if (params.metrics?.includes('errors')) {
      result.errors = group.errors;
      result.errorRate = group.traces > 0 ? Number((group.errors / group.traces).toFixed(3)) : 0;
    }
    
    return result;
  });
  
  // Calculate totals
  const totals = timeSeriesData.reduce((acc, day) => {
    Object.keys(day).forEach(key => {
      if (key !== 'date') {
        acc[key] = (acc[key] || 0) + (day[key] || 0);
      }
    });
    return acc;
  }, {} as Record<string, number>);
  
  return {
    timeSeries: timeSeriesData,
    totals,
    summary: {
      totalTraces: traces.length,
      uniquePrompts: new Set(traces.map(t => t.prompt_id).filter(Boolean)).size,
      dateRange: {
        from: traces[0]?.created_at || params.dateFrom,
        to: traces[traces.length - 1]?.created_at || params.dateTo
      }
    }
  };
}

function generateInsights(analytics: any) {
  const insights = [];
  
  // Cost insights
  if (analytics.totals.cost) {
    const avgDailyCost = analytics.totals.cost / analytics.timeSeries.length;
    insights.push({
      type: 'cost',
      message: `Average daily cost: $${avgDailyCost.toFixed(2)}`,
      trend: calculateTrend(analytics.timeSeries, 'cost')
    });
  }
  
  // Quality insights
  if (analytics.totals.avgQuality) {
    const overallQuality = analytics.totals.avgQuality / analytics.timeSeries.filter((d: any) => d.avgQuality).length;
    insights.push({
      type: 'quality',
      message: `Overall quality score: ${overallQuality.toFixed(2)}/1.0`,
      trend: calculateTrend(analytics.timeSeries, 'avgQuality')
    });
  }
  
  // Performance insights
  if (analytics.totals.avgLatency) {
    const overallLatency = analytics.totals.avgLatency / analytics.timeSeries.filter((d: any) => d.avgLatency).length;
    insights.push({
      type: 'performance',
      message: `Average response time: ${overallLatency}ms`,
      trend: calculateTrend(analytics.timeSeries, 'avgLatency')
    });
  }
  
  // Error insights
  if (analytics.totals.errors) {
    const errorRate = (analytics.totals.errors / analytics.totals.traces) * 100;
    insights.push({
      type: 'reliability',
      message: `Error rate: ${errorRate.toFixed(1)}%`,
      severity: errorRate > 5 ? 'high' : errorRate > 1 ? 'medium' : 'low'
    });
  }
  
  return insights;
}

function percentile(arr: number[], p: number): number {
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[index] || 0;
}

function calculateTrend(timeSeries: any[], metric: string): string {
  if (timeSeries.length < 2) return 'stable';
  
  const values = timeSeries
    .map(d => d[metric])
    .filter(v => v !== undefined && v !== null);
  
  if (values.length < 2) return 'stable';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const change = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (change > 10) return 'increasing';
  if (change < -10) return 'decreasing';
  return 'stable';
}