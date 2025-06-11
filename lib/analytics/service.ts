// Task 19: Enhanced Analytics Service
// Comprehensive analytics engine for usage tracking and insights

import { createClient } from '@/utils/supabase/server';
import { TraceAnalytics } from '@/lib/tracing/analytics';
import { calculateModelCost } from '@/lib/ai-cost-utils';

export interface AnalyticsDateRange {
  start: Date;
  end: Date;
}

export interface UsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  avgTokensPerSecond: number;
  uniqueUsers: number;
  errorRate: number;
}

export interface ModelComparison {
  modelId: string;
  metrics: UsageMetrics;
  costEfficiency: number;
  performanceScore: number;
  qualityScore: number;
  recommendation: string;
}

export interface CostAnalysis {
  totalSpend: number;
  projectedMonthlySpend: number;
  costByModel: Record<string, number>;
  costByUser: Record<string, number>;
  costTrends: Array<{ date: string; cost: number }>;
  optimizationOpportunities: Array<{
    suggestion: string;
    potentialSavings: number;
    impact: 'high' | 'medium' | 'low';
  }>;
}

export interface UserAnalytics {
  userId: string;
  totalRequests: number;
  totalCost: number;
  favoriteModels: string[];
  usagePatterns: {
    peakHours: number[];
    avgSessionDuration: number;
    requestsPerSession: number;
  };
  activityTrend: 'increasing' | 'stable' | 'decreasing';
}

export class AnalyticsService {
  /**
   * Get comprehensive usage metrics for a date range
   */
  static async getUsageMetrics(
    dateRange: AnalyticsDateRange,
    filters?: {
      userId?: string;
      modelId?: string;
      source?: 'playground' | 'api' | 'test';
    }
  ): Promise<UsageMetrics> {
    const supabase = await createClient();
    
    let query = supabase
      .from('usage_analytics_daily')
      .select('*')
      .gte('date', dateRange.start.toISOString().split('T')[0])
      .lte('date', dateRange.end.toISOString().split('T')[0]);

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.modelId) {
      query = query.eq('model_id', filters.modelId);
    }
    if (filters?.source) {
      query = query.eq('source', filters.source);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get usage metrics: ${error.message}`);
    }

    // Aggregate the metrics
    const metrics = data.reduce((acc, record) => {
      acc.totalRequests += record.total_requests;
      acc.successfulRequests += record.successful_requests;
      acc.failedRequests += record.failed_requests;
      acc.totalTokens += record.total_tokens;
      acc.totalCost += parseFloat(record.total_cost);
      
      // Weighted averages
      if (record.avg_duration_ms) {
        acc.totalDuration += record.avg_duration_ms * record.total_requests;
      }
      if (record.avg_tokens_per_second) {
        acc.totalTokensPerSecond += record.avg_tokens_per_second * record.total_requests;
      }
      
      return acc;
    }, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      totalDuration: 0,
      totalTokensPerSecond: 0
    });

    // Get unique users count
    const uniqueUsers = new Set(data.map(r => r.user_id)).size;

    return {
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      failedRequests: metrics.failedRequests,
      totalTokens: metrics.totalTokens,
      totalCost: metrics.totalCost,
      avgResponseTime: metrics.totalRequests > 0 ? metrics.totalDuration / metrics.totalRequests : 0,
      avgTokensPerSecond: metrics.totalRequests > 0 ? metrics.totalTokensPerSecond / metrics.totalRequests : 0,
      uniqueUsers,
      errorRate: metrics.totalRequests > 0 ? (metrics.failedRequests / metrics.totalRequests) * 100 : 0
    };
  }

  /**
   * Compare performance across different models
   */
  static async compareModels(dateRange: AnalyticsDateRange): Promise<ModelComparison[]> {
    const supabase = await createClient();
    
    // Get model statistics
    const { data, error } = await supabase
      .from('model_usage_statistics')
      .select('*')
      .eq('period_type', 'day')
      .gte('period_start', dateRange.start.toISOString())
      .lte('period_end', dateRange.end.toISOString());

    if (error) {
      throw new Error(`Failed to compare models: ${error.message}`);
    }

    // Group by model and calculate aggregates
    const modelGroups = data.reduce((acc, stat) => {
      if (!acc[stat.model_id]) {
        acc[stat.model_id] = [];
      }
      acc[stat.model_id].push(stat);
      return acc;
    }, {} as Record<string, any[]>);

    const comparisons: ModelComparison[] = Object.entries(modelGroups).map(([modelId, stats]) => {
      const totalRequests = stats.reduce((sum, s) => sum + s.total_requests, 0);
      const totalCost = stats.reduce((sum, s) => sum + parseFloat(s.total_cost), 0);
      const totalTokens = stats.reduce((sum, s) => sum + s.total_tokens, 0);
      const avgSuccessRate = stats.reduce((sum, s) => sum + (s.success_rate || 0), 0) / stats.length;
      const avgResponseTime = stats.reduce((sum, s) => sum + (s.avg_response_time_ms || 0), 0) / stats.length;
      const avgTokensPerSecond = stats.reduce((sum, s) => sum + (s.avg_tokens_per_second || 0), 0) / stats.length;
      const avgQualityScore = stats.reduce((sum, s) => sum + (s.avg_quality_score || 0), 0) / stats.length;

      const costEfficiency = totalTokens > 0 ? totalCost / totalTokens : 0;
      const performanceScore = this.calculatePerformanceScore(avgResponseTime, avgTokensPerSecond, avgSuccessRate);
      
      let recommendation = 'Consider for specific use cases';
      if (performanceScore > 80 && costEfficiency < 0.001) {
        recommendation = 'Excellent choice for production';
      } else if (performanceScore > 60 && costEfficiency < 0.005) {
        recommendation = 'Good balance of performance and cost';
      } else if (costEfficiency > 0.01) {
        recommendation = 'High cost - use for premium features only';
      }

      return {
        modelId,
        metrics: {
          totalRequests,
          successfulRequests: Math.round(totalRequests * avgSuccessRate / 100),
          failedRequests: Math.round(totalRequests * (100 - avgSuccessRate) / 100),
          totalTokens,
          totalCost,
          avgResponseTime,
          avgTokensPerSecond,
          uniqueUsers: stats[0]?.unique_users || 0,
          errorRate: 100 - avgSuccessRate
        },
        costEfficiency,
        performanceScore,
        qualityScore: avgQualityScore,
        recommendation
      };
    });

    return comparisons.sort((a, b) => b.performanceScore - a.performanceScore);
  }

  /**
   * Analyze costs and provide optimization recommendations
   */
  static async analyzeCosts(dateRange: AnalyticsDateRange): Promise<CostAnalysis> {
    const supabase = await createClient();
    
    // Get cost summary data
    const { data: costData, error } = await supabase
      .from('cost_analysis_summary')
      .select('*')
      .gte('period_start', dateRange.start.toISOString().split('T')[0])
      .lte('period_end', dateRange.end.toISOString().split('T')[0])
      .order('period_start', { ascending: true });

    if (error) {
      throw new Error(`Failed to analyze costs: ${error.message}`);
    }

    // Calculate total spend
    const totalSpend = costData.reduce((sum, record) => sum + parseFloat(record.total_cost), 0);
    
    // Project monthly spend based on daily average
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const dailyAverage = totalSpend / days;
    const projectedMonthlySpend = dailyAverage * 30;

    // Aggregate costs by model and user
    const costByModel: Record<string, number> = {};
    const costByUser: Record<string, number> = {};
    
    costData.forEach(record => {
      // Model costs
      Object.entries(record.model_costs || {}).forEach(([model, cost]) => {
        costByModel[model] = (costByModel[model] || 0) + (cost as number);
      });
      
      // User costs
      Object.entries(record.user_costs || {}).forEach(([user, cost]) => {
        costByUser[user] = (costByUser[user] || 0) + (cost as number);
      });
    });

    // Cost trends
    const costTrends = costData.map(record => ({
      date: record.period_start,
      cost: parseFloat(record.total_cost)
    }));

    // Generate optimization opportunities
    const optimizationOpportunities = this.generateCostOptimizations(
      costByModel,
      costByUser,
      totalSpend,
      projectedMonthlySpend
    );

    return {
      totalSpend,
      projectedMonthlySpend,
      costByModel,
      costByUser,
      costTrends,
      optimizationOpportunities
    };
  }

  /**
   * Get user-specific analytics
   */
  static async getUserAnalytics(
    userId: string,
    dateRange: AnalyticsDateRange
  ): Promise<UserAnalytics> {
    const supabase = await createClient();
    
    // Get user activity metrics
    const { data, error } = await supabase
      .from('user_activity_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', dateRange.start.toISOString().split('T')[0])
      .lte('date', dateRange.end.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      throw new Error(`Failed to get user analytics: ${error.message}`);
    }

    // Aggregate metrics
    const totalRequests = data.reduce((sum, r) => sum + r.total_requests, 0);
    const totalCost = data.reduce((sum, r) => sum + parseFloat(r.total_cost), 0);
    
    // Find favorite models
    const modelUsage: Record<string, number> = {};
    data.forEach(record => {
      if (record.most_used_model) {
        modelUsage[record.most_used_model] = (modelUsage[record.most_used_model] || 0) + 1;
      }
    });
    
    const favoriteModels = Object.entries(modelUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([model]) => model);

    // Calculate usage patterns
    const peakHours = data
      .filter(r => r.peak_usage_hour !== null)
      .reduce((acc, r) => {
        acc[r.peak_usage_hour!] = (acc[r.peak_usage_hour!] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
    
    const topPeakHours = Object.entries(peakHours)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    const avgSessionDuration = data.length > 0
      ? data.reduce((sum, r) => sum + (r.avg_session_duration_minutes || 0), 0) / data.length
      : 0;
    
    const requestsPerSession = data.length > 0
      ? data.reduce((sum, r) => sum + (r.requests_per_session || 0), 0) / data.length
      : 0;

    // Determine activity trend
    let activityTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (data.length >= 7) {
      const firstWeek = data.slice(0, 7).reduce((sum, r) => sum + r.total_requests, 0);
      const lastWeek = data.slice(-7).reduce((sum, r) => sum + r.total_requests, 0);
      
      if (lastWeek > firstWeek * 1.2) {
        activityTrend = 'increasing';
      } else if (lastWeek < firstWeek * 0.8) {
        activityTrend = 'decreasing';
      }
    }

    return {
      userId,
      totalRequests,
      totalCost,
      favoriteModels,
      usagePatterns: {
        peakHours: topPeakHours,
        avgSessionDuration,
        requestsPerSession
      },
      activityTrend
    };
  }

  /**
   * Export analytics data in various formats
   */
  static async exportAnalytics(
    reportType: 'usage' | 'cost' | 'performance' | 'custom',
    format: 'csv' | 'json' | 'pdf' | 'excel',
    dateRange: AnalyticsDateRange,
    filters?: Record<string, any>
  ): Promise<{ jobId: string }> {
    const supabase = await createClient();
    
    // Create export job
    const { data, error } = await supabase
      .from('analytics_export_queue')
      .insert({
        export_type: format,
        report_type: reportType,
        date_range_start: dateRange.start.toISOString().split('T')[0],
        date_range_end: dateRange.end.toISOString().split('T')[0],
        filters: filters || {},
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create export job: ${error.message}`);
    }

    // In production, this would trigger a background job
    // For now, we'll process it synchronously in the API
    return { jobId: data.id };
  }

  /**
   * Get predictive analytics and forecasts
   */
  static async getPredictiveAnalytics(
    metric: 'usage' | 'cost' | 'performance',
    forecastDays: number = 30
  ): Promise<{
    historical: Array<{ date: string; value: number }>;
    forecast: Array<{ date: string; value: number; confidence: number }>;
    trend: 'increasing' | 'stable' | 'decreasing';
    insights: string[];
  }> {
    const supabase = await createClient();
    
    // Get historical data (last 90 days)
    const historicalRange = {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: new Date()
    };

    let historicalData: Array<{ date: string; value: number }> = [];
    
    if (metric === 'usage') {
      const { data } = await supabase
        .from('usage_analytics_daily')
        .select('date, total_requests')
        .gte('date', historicalRange.start.toISOString().split('T')[0])
        .order('date', { ascending: true });
      
      historicalData = (data || []).reduce((acc, record) => {
        const existing = acc.find(item => item.date === record.date);
        if (existing) {
          existing.value += record.total_requests;
        } else {
          acc.push({ date: record.date, value: record.total_requests });
        }
        return acc;
      }, [] as Array<{ date: string; value: number }>);
    } else if (metric === 'cost') {
      const { data } = await supabase
        .from('cost_analysis_summary')
        .select('period_start, total_cost')
        .eq('period_type', 'day')
        .gte('period_start', historicalRange.start.toISOString().split('T')[0])
        .order('period_start', { ascending: true });
      
      historicalData = (data || []).map(record => ({
        date: record.period_start,
        value: parseFloat(record.total_cost)
      }));
    }

    // Simple linear regression for forecast
    const forecast = this.calculateForecast(historicalData, forecastDays);
    const trend = this.determineTrend(historicalData);
    const insights = this.generatePredictiveInsights(metric, historicalData, forecast, trend);

    return {
      historical: historicalData,
      forecast,
      trend,
      insights
    };
  }

  /**
   * Helper: Calculate performance score
   */
  private static calculatePerformanceScore(
    avgResponseTime: number,
    avgTokensPerSecond: number,
    successRate: number
  ): number {
    // Weighted scoring: 40% success rate, 30% response time, 30% throughput
    const successScore = successRate; // Already 0-100
    const responseScore = Math.max(0, 100 - (avgResponseTime / 100)); // 100ms = 100 score
    const throughputScore = Math.min(100, avgTokensPerSecond * 2); // 50 tokens/s = 100 score
    
    return (successScore * 0.4) + (responseScore * 0.3) + (throughputScore * 0.3);
  }

  /**
   * Helper: Generate cost optimization recommendations
   */
  private static generateCostOptimizations(
    costByModel: Record<string, number>,
    costByUser: Record<string, number>,
    totalSpend: number,
    projectedMonthlySpend: number
  ): Array<{ suggestion: string; potentialSavings: number; impact: 'high' | 'medium' | 'low' }> {
    const opportunities = [];

    // Check for expensive model usage
    const modelCosts = Object.entries(costByModel).sort(([, a], [, b]) => b - a);
    if (modelCosts.length > 0 && modelCosts[0][1] > totalSpend * 0.5) {
      opportunities.push({
        suggestion: `Consider using cheaper alternatives to ${modelCosts[0][0]} for non-critical tasks`,
        potentialSavings: modelCosts[0][1] * 0.3,
        impact: 'high' as const
      });
    }

    // Check for high individual user spend
    const userCosts = Object.entries(costByUser).sort(([, a], [, b]) => b - a);
    if (userCosts.length > 0 && userCosts[0][1] > totalSpend * 0.2) {
      opportunities.push({
        suggestion: `Review usage patterns for top user to optimize their workflows`,
        potentialSavings: userCosts[0][1] * 0.2,
        impact: 'medium' as const
      });
    }

    // Check projected spend
    if (projectedMonthlySpend > 1000) {
      opportunities.push({
        suggestion: 'Implement usage quotas and monitoring to control costs',
        potentialSavings: projectedMonthlySpend * 0.15,
        impact: 'high' as const
      });
    }

    return opportunities;
  }

  /**
   * Helper: Calculate simple forecast
   */
  private static calculateForecast(
    historical: Array<{ date: string; value: number }>,
    days: number
  ): Array<{ date: string; value: number; confidence: number }> {
    if (historical.length < 7) {
      return [];
    }

    // Simple moving average with trend
    const recentDays = 14;
    const recent = historical.slice(-recentDays);
    const avgValue = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
    
    // Calculate trend
    const firstHalf = recent.slice(0, recentDays / 2);
    const secondHalf = recent.slice(recentDays / 2);
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;
    const dailyTrend = (secondAvg - firstAvg) / (recentDays / 2);

    const forecast = [];
    const lastDate = new Date(historical[historical.length - 1].date);

    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(lastDate.getDate() + i);
      
      const forecastValue = Math.max(0, avgValue + (dailyTrend * i));
      const confidence = Math.max(0.5, 1 - (i / days) * 0.5); // Confidence decreases with distance
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        value: Math.round(forecastValue),
        confidence
      });
    }

    return forecast;
  }

  /**
   * Helper: Determine trend from historical data
   */
  private static determineTrend(
    historical: Array<{ date: string; value: number }>
  ): 'increasing' | 'stable' | 'decreasing' {
    if (historical.length < 14) {
      return 'stable';
    }

    const firstWeek = historical.slice(0, 7).reduce((sum, d) => sum + d.value, 0) / 7;
    const lastWeek = historical.slice(-7).reduce((sum, d) => sum + d.value, 0) / 7;
    
    if (lastWeek > firstWeek * 1.1) {
      return 'increasing';
    } else if (lastWeek < firstWeek * 0.9) {
      return 'decreasing';
    }
    
    return 'stable';
  }

  /**
   * Helper: Generate predictive insights
   */
  private static generatePredictiveInsights(
    metric: string,
    historical: Array<{ date: string; value: number }>,
    forecast: Array<{ date: string; value: number; confidence: number }>,
    trend: string
  ): string[] {
    const insights = [];

    if (trend === 'increasing') {
      insights.push(`${metric} is showing an upward trend - consider capacity planning`);
    } else if (trend === 'decreasing') {
      insights.push(`${metric} is declining - investigate potential causes`);
    }

    if (forecast.length > 0) {
      const avgForecast = forecast.reduce((sum, f) => sum + f.value, 0) / forecast.length;
      const currentAvg = historical.slice(-7).reduce((sum, h) => sum + h.value, 0) / 7;
      
      if (avgForecast > currentAvg * 1.5) {
        insights.push(`Significant growth expected in ${metric} - prepare for increased demand`);
      }
    }

    return insights;
  }
}