// Task 15: Metrics API Endpoint
// Analytics and performance metrics for traces

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { TraceService, TraceFilters } from '@/lib/tracing/service';
import { z } from 'zod';

const metricsQuerySchema = z.object({
  timeRange: z.enum(['1h', '24h', '7d', '30d', '90d']).default('24h'),
  model: z.string().optional(),
  source: z.enum(['playground', 'api', 'test']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['model', 'source', 'hour', 'day', 'user']).optional(),
  includeHourly: z.boolean().default(false),
  includeComparison: z.boolean().default(false)
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = request.nextUrl;
    const queryParams: any = {};
    
    for (const [key, value] of searchParams.entries()) {
      if (value !== '') {
        if (['includeHourly', 'includeComparison'].includes(key)) {
          queryParams[key] = value === 'true';
        } else {
          queryParams[key] = value;
        }
      }
    }

    const validation = metricsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return Response.json(
        { 
          error: 'Invalid query parameters',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const params = validation.data;

    // Calculate date range
    let startDate, endDate;
    
    if (params.startDate && params.endDate) {
      startDate = params.startDate;
      endDate = params.endDate;
    } else {
      endDate = new Date().toISOString();
      const now = new Date();
      
      switch (params.timeRange) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
      }
    }

    // Build filters
    const filters: TraceFilters = {
      userId: session.user.id,
      startDate,
      endDate,
      model: params.model,
      source: params.source
    };

    // Check if user is admin
    const userRole = (session.user as any).role;
    if (userRole === 'admin' && searchParams.get('allUsers') === 'true') {
      delete filters.userId;
    }

    // Get basic metrics
    const metrics = await TraceService.getTraceMetrics(filters);

    // Get traces for detailed analysis
    const { traces } = await TraceService.getTraces({
      ...filters,
      limit: 1000 // Get more data for analysis
    });

    // Calculate additional metrics
    const additionalMetrics = calculateAdditionalMetrics(traces);

    // Group data if requested
    let groupedData = undefined;
    if (params.groupBy) {
      groupedData = await calculateGroupedMetrics(traces, params.groupBy);
    }

    // Get hourly data if requested
    let hourlyData = undefined;
    if (params.includeHourly) {
      hourlyData = await getHourlyMetrics(filters);
    }

    // Get comparison data if requested
    let comparisonData = undefined;
    if (params.includeComparison) {
      comparisonData = await getComparisonMetrics(filters, params.timeRange);
    }

    // Calculate trends
    const trends = calculateTrends(traces, params.timeRange);

    return Response.json({
      success: true,
      metrics: {
        ...metrics,
        ...additionalMetrics
      },
      trends,
      groupedData,
      hourlyData,
      comparisonData,
      timeRange: {
        start: startDate,
        end: endDate,
        range: params.timeRange
      },
      metadata: {
        totalDataPoints: traces.length,
        requestedAt: new Date().toISOString(),
        filters: Object.keys(filters).filter(key => filters[key as keyof TraceFilters] !== undefined)
      }
    });

  } catch (error) {
    console.error('[API] Get metrics error:', error);
    
    return Response.json(
      { 
        error: 'Failed to get metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions for metric calculations
function calculateAdditionalMetrics(traces: any[]) {
  if (traces.length === 0) {
    return {
      costPerToken: 0,
      qualityDistribution: {},
      modelUsage: {},
      sourceDistribution: {},
      errorTypes: {}
    };
  }

  const totalCost = traces.reduce((sum, t) => sum + (parseFloat(t.cost_calculation?.total_cost) || 0), 0);
  const totalTokens = traces.reduce((sum, t) => sum + (t.tokens_used?.total || 0), 0);

  const qualityScores = traces.filter(t => t.quality_score).map(t => t.quality_score);
  const qualityDistribution = {
    excellent: qualityScores.filter(s => s >= 4.5).length,
    good: qualityScores.filter(s => s >= 3.5 && s < 4.5).length,
    average: qualityScores.filter(s => s >= 2.5 && s < 3.5).length,
    poor: qualityScores.filter(s => s < 2.5).length
  };

  const modelUsage = traces.reduce((acc, t) => {
    acc[t.model_id] = (acc[t.model_id] || 0) + 1;
    return acc;
  }, {});

  const sourceDistribution = traces.reduce((acc, t) => {
    acc[t.source] = (acc[t.source] || 0) + 1;
    return acc;
  }, {});

  const errorTypes = traces.filter(t => t.status === 'error').reduce((acc, t) => {
    const errorCode = t.error_code || 'unknown';
    acc[errorCode] = (acc[errorCode] || 0) + 1;
    return acc;
  }, {});

  return {
    costPerToken: totalTokens > 0 ? totalCost / totalTokens : 0,
    qualityDistribution,
    modelUsage,
    sourceDistribution,
    errorTypes
  };
}

async function calculateGroupedMetrics(traces: any[], groupBy: string) {
  const groups = traces.reduce((acc, trace) => {
    let key;
    
    switch (groupBy) {
      case 'model':
        key = trace.model_id;
        break;
      case 'source':
        key = trace.source;
        break;
      case 'hour':
        key = new Date(trace.created_at).toISOString().slice(0, 13);
        break;
      case 'day':
        key = new Date(trace.created_at).toISOString().slice(0, 10);
        break;
      case 'user':
        key = trace.user_id;
        break;
      default:
        key = 'all';
    }

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(trace);
    return acc;
  }, {});

  const result = {};
  for (const [key, groupTraces] of Object.entries(groups)) {
    const additionalMetrics = calculateAdditionalMetrics(groupTraces as any[]);
    result[key] = {
      count: (groupTraces as any[]).length,
      ...additionalMetrics
    };
  }

  return result;
}

async function getHourlyMetrics(filters: TraceFilters) {
  // This would query the trace_metrics_hourly table
  // For now, return placeholder data
  return {
    hours: [],
    requestCounts: [],
    avgLatencies: [],
    errorRates: [],
    costs: []
  };
}

async function getComparisonMetrics(filters: TraceFilters, timeRange: string) {
  // Calculate metrics for previous period for comparison
  // This is a simplified implementation
  return {
    current: {},
    previous: {},
    change: {
      totalTraces: 0,
      avgDuration: 0,
      errorRate: 0,
      totalCost: 0
    }
  };
}

function calculateTrends(traces: any[], timeRange: string) {
  // Calculate trends over time
  const sortedTraces = traces.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  if (sortedTraces.length < 2) {
    return {
      throughput: 'stable',
      latency: 'stable',
      errorRate: 'stable',
      cost: 'stable'
    };
  }

  // Simple trend calculation (could be improved)
  const halfPoint = Math.floor(sortedTraces.length / 2);
  const firstHalf = sortedTraces.slice(0, halfPoint);
  const secondHalf = sortedTraces.slice(halfPoint);

  const firstHalfAvgLatency = firstHalf.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / firstHalf.length;
  const secondHalfAvgLatency = secondHalf.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / secondHalf.length;

  const firstHalfErrorRate = firstHalf.filter(t => t.status === 'error').length / firstHalf.length;
  const secondHalfErrorRate = secondHalf.filter(t => t.status === 'error').length / secondHalf.length;

  return {
    throughput: secondHalf.length > firstHalf.length ? 'increasing' : 'decreasing',
    latency: secondHalfAvgLatency > firstHalfAvgLatency * 1.1 ? 'increasing' : 
             secondHalfAvgLatency < firstHalfAvgLatency * 0.9 ? 'decreasing' : 'stable',
    errorRate: secondHalfErrorRate > firstHalfErrorRate * 1.1 ? 'increasing' : 
               secondHalfErrorRate < firstHalfErrorRate * 0.9 ? 'decreasing' : 'stable',
    cost: 'stable' // Simplified
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}