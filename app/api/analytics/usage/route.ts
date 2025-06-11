import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AnalyticsService } from '@/lib/analytics/service';
import { createClient } from '@/utils/supabase/server';

// GET /api/analytics/usage - Usage statistics and trends
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';
    const breakdown = searchParams.get('breakdown') || 'total';
    const modelId = searchParams.get('modelId');
    const userId = searchParams.get('userId');

    // Calculate date range
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
    const filters: any = {};
    
    if (modelId) filters.modelId = modelId;
    if (userId) filters.userId = userId;

    // Get usage metrics
    const usage = await AnalyticsService.getUsageMetrics(dateRange, filters);

    let breakdownData = null;
    const supabase = await createClient();

    // Get breakdown data based on request
    if (breakdown === 'models') {
      const { data } = await supabase
        .from('usage_analytics_daily')
        .select('model_id, total_requests, total_cost, total_tokens')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (data) {
        breakdownData = data.reduce((acc, record) => {
          if (!acc[record.model_id]) {
            acc[record.model_id] = {
              modelId: record.model_id,
              totalRequests: 0,
              totalCost: 0,
              totalTokens: 0
            };
          }
          acc[record.model_id].totalRequests += record.total_requests;
          acc[record.model_id].totalCost += parseFloat(record.total_cost);
          acc[record.model_id].totalTokens += record.total_tokens;
          return acc;
        }, {} as Record<string, any>);

        breakdownData = Object.values(breakdownData)
          .sort((a: any, b: any) => b.totalRequests - a.totalRequests);
      }
    } else if (breakdown === 'users') {
      // Only show user breakdown if user is admin
      if (session.user.role === 'admin') {
        const { data } = await supabase
          .from('user_activity_metrics')
          .select('user_id, total_requests, total_cost')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);

        if (data) {
          breakdownData = data.reduce((acc, record) => {
            if (!acc[record.user_id]) {
              acc[record.user_id] = {
                userId: record.user_id,
                totalRequests: 0,
                totalCost: 0
              };
            }
            acc[record.user_id].totalRequests += record.total_requests;
            acc[record.user_id].totalCost += parseFloat(record.total_cost);
            return acc;
          }, {} as Record<string, any>);

          breakdownData = Object.values(breakdownData)
            .sort((a: any, b: any) => b.totalRequests - a.totalRequests)
            .slice(0, 20); // Top 20 users
        }
      }
    } else if (breakdown === 'time') {
      const { data } = await supabase
        .from('usage_analytics_daily')
        .select('date, total_requests, total_cost, successful_requests, failed_requests')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (data) {
        breakdownData = data.reduce((acc, record) => {
          const existing = acc.find((item: any) => item.date === record.date);
          if (existing) {
            existing.totalRequests += record.total_requests;
            existing.totalCost += parseFloat(record.total_cost);
            existing.successfulRequests += record.successful_requests;
            existing.failedRequests += record.failed_requests;
          } else {
            acc.push({
              date: record.date,
              totalRequests: record.total_requests,
              totalCost: parseFloat(record.total_cost),
              successfulRequests: record.successful_requests,
              failedRequests: record.failed_requests,
              errorRate: record.total_requests > 0 
                ? (record.failed_requests / record.total_requests) * 100 
                : 0
            });
          }
          return acc;
        }, [] as any[]);
      }
    }

    return NextResponse.json({
      period,
      breakdown,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: usage,
      breakdown: breakdownData,
      filters: filters
    });
  } catch (error) {
    console.error('Usage analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage analytics' },
      { status: 500 }
    );
  }
}