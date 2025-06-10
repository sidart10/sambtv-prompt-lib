import { unstable_cache } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export const USAGE_CACHE_TAGS = {
  USER_USAGE: (userId: string) => `usage-${userId}`,
  DAILY_STATS: 'daily-stats',
  COST_SUMMARY: 'cost-summary'
} as const;

/**
 * Get cached user usage summary
 */
export const getUserUsageSummary = unstable_cache(
  async (userId: string, days: number = 30) => {
    const supabase = await createClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('usage_daily_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString())
      .order('date', { ascending: false });

    if (error || !data) {
      console.error('Failed to fetch usage summary:', error);
      return null;
    }

    // Calculate summary metrics
    const summary = data.reduce((acc, stat) => ({
      totalRequests: acc.totalRequests + stat.request_count,
      totalTokens: acc.totalTokens + stat.total_tokens,
      totalCost: acc.totalCost + Number(stat.total_cost),
      totalErrors: acc.totalErrors + stat.error_count,
      providers: {
        ...acc.providers,
        [stat.provider]: (acc.providers[stat.provider] || 0) + Number(stat.total_cost)
      }
    }), {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      totalErrors: 0,
      providers: {} as Record<string, number>
    });

    return {
      ...summary,
      avgCostPerRequest: summary.totalRequests > 0 
        ? summary.totalCost / summary.totalRequests 
        : 0,
      errorRate: summary.totalRequests > 0 
        ? summary.totalErrors / summary.totalRequests 
        : 0,
      period: {
        from: startDate.toISOString(),
        to: new Date().toISOString(),
        days
      }
    };
  },
  ['getUserUsageSummary'],
  {
    revalidate: 300, // 5 minutes
    tags: ['usage-summary']
  }
);

/**
 * Get cached cost breakdown by model
 */
export const getModelCostBreakdown = unstable_cache(
  async (userId: string, startDate?: string, endDate?: string) => {
    const supabase = await createClient();
    
    let query = supabase
      .from('usage_analytics')
      .select('model_id, provider, total_cost, total_tokens')
      .eq('user_id', userId)
      .eq('status', 'success');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error('Failed to fetch cost breakdown:', error);
      return [];
    }

    // Aggregate by model
    const modelCosts: Record<string, {
      provider: string;
      totalCost: number;
      totalTokens: number;
      requestCount: number;
    }> = {};

    data.forEach(record => {
      if (!modelCosts[record.model_id]) {
        modelCosts[record.model_id] = {
          provider: record.provider,
          totalCost: 0,
          totalTokens: 0,
          requestCount: 0
        };
      }
      
      modelCosts[record.model_id].totalCost += Number(record.total_cost);
      modelCosts[record.model_id].totalTokens += record.total_tokens;
      modelCosts[record.model_id].requestCount += 1;
    });

    return Object.entries(modelCosts)
      .map(([modelId, stats]) => ({
        modelId,
        ...stats,
        avgCostPerRequest: stats.requestCount > 0 
          ? stats.totalCost / stats.requestCount 
          : 0,
        avgTokensPerRequest: stats.requestCount > 0 
          ? Math.round(stats.totalTokens / stats.requestCount) 
          : 0
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  },
  ['getModelCostBreakdown'],
  {
    revalidate: 600, // 10 minutes
    tags: ['cost-breakdown']
  }
);

/**
 * Get cached usage trends
 */
export const getUsageTrends = unstable_cache(
  async (userId: string, days: number = 7) => {
    const supabase = await createClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('usage_daily_stats')
      .select('date, request_count, total_cost, total_tokens')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString())
      .order('date', { ascending: true });

    if (error || !data) {
      console.error('Failed to fetch usage trends:', error);
      return [];
    }

    // Calculate daily changes
    return data.map((day, index) => {
      const previousDay = index > 0 ? data[index - 1] : null;
      
      return {
        date: day.date,
        requests: day.request_count,
        cost: Number(day.total_cost),
        tokens: day.total_tokens,
        changes: previousDay ? {
          requests: calculatePercentChange(previousDay.request_count, day.request_count),
          cost: calculatePercentChange(Number(previousDay.total_cost), Number(day.total_cost)),
          tokens: calculatePercentChange(previousDay.total_tokens, day.total_tokens)
        } : null
      };
    });
  },
  ['getUsageTrends'],
  {
    revalidate: 300, // 5 minutes
    tags: ['usage-trends']
  }
);

function calculatePercentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return Math.round(((newValue - oldValue) / oldValue) * 100);
}

/**
 * Invalidate usage caches for a user
 */
export async function invalidateUsageCache(userId: string) {
  const { revalidateTag } = await import('next/cache');
  
  revalidateTag(USAGE_CACHE_TAGS.USER_USAGE(userId));
  revalidateTag('usage-summary');
  revalidateTag('cost-breakdown');
  revalidateTag('usage-trends');
}