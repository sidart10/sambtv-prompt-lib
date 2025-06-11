import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AnalyticsService } from '@/lib/analytics/service';
import { z } from 'zod';
import { rateLimiter } from '@/lib/rate-limit';

// Validation schema
const analyticsQuerySchema = z.object({
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  filters: z.object({
    userId: z.string().optional(),
    modelId: z.string().optional(),
    source: z.enum(['playground', 'api', 'test']).optional()
  }).optional(),
  groupBy: z.enum(['model', 'user', 'date', 'source']).optional(),
  metrics: z.array(z.enum(['usage', 'cost', 'performance', 'quality'])).optional()
});

// POST /api/analytics - Flexible analytics queries
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const identifier = `analytics:${session.user.id}`;
    const { success, reset } = await rateLimiter.limit(identifier, {
      requests: 100,
      window: '1h'
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', reset },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = analyticsQuerySchema.parse(body);

    const dateRange = {
      start: new Date(validatedData.dateRange.start),
      end: new Date(validatedData.dateRange.end)
    };

    const results: any = {};

    // Default to all metrics if none specified
    const requestedMetrics = validatedData.metrics || ['usage', 'cost', 'performance'];

    // Get usage metrics
    if (requestedMetrics.includes('usage')) {
      results.usage = await AnalyticsService.getUsageMetrics(
        dateRange,
        validatedData.filters
      );
    }

    // Get cost analysis
    if (requestedMetrics.includes('cost')) {
      results.cost = await AnalyticsService.analyzeCosts(dateRange);
    }

    // Get model performance comparison
    if (requestedMetrics.includes('performance')) {
      results.performance = await AnalyticsService.compareModels(dateRange);
    }

    // Get user-specific analytics if userId filter is provided
    if (validatedData.filters?.userId && requestedMetrics.includes('usage')) {
      results.userAnalytics = await AnalyticsService.getUserAnalytics(
        validatedData.filters.userId,
        dateRange
      );
    }

    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        dateRange: validatedData.dateRange,
        filters: validatedData.filters,
        requestedMetrics
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Analytics query error:', error);
    return NextResponse.json(
      { error: 'Failed to process analytics query' },
      { status: 500 }
    );
  }
}

// GET /api/analytics - Get dashboard overview
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';
    const metric = searchParams.get('metric') || 'overview';

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    const dateRange = { start: startDate, end: endDate };

    if (metric === 'overview') {
      // Get comprehensive dashboard data
      const [usage, cost, models] = await Promise.all([
        AnalyticsService.getUsageMetrics(dateRange),
        AnalyticsService.analyzeCosts(dateRange),
        AnalyticsService.compareModels(dateRange)
      ]);

      return NextResponse.json({
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          totalRequests: usage.totalRequests,
          totalCost: usage.totalCost,
          errorRate: usage.errorRate,
          uniqueUsers: usage.uniqueUsers,
          avgResponseTime: usage.avgResponseTime,
          projectedMonthlySpend: cost.projectedMonthlySpend
        },
        usage,
        cost,
        topModels: models.slice(0, 5),
        trends: {
          costTrends: cost.costTrends.slice(-7), // Last 7 data points
          usage: 'stable', // Simplified trend
          performance: 'stable'
        }
      });
    } else {
      // Get specific metric data
      let data;
      switch (metric) {
        case 'usage':
          data = await AnalyticsService.getUsageMetrics(dateRange);
          break;
        case 'cost':
          data = await AnalyticsService.analyzeCosts(dateRange);
          break;
        case 'models':
          data = await AnalyticsService.compareModels(dateRange);
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid metric requested' },
            { status: 400 }
          );
      }

      return NextResponse.json({
        period,
        metric,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        data
      });
    }
  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}