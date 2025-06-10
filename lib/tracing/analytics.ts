// Task 15: Tracing Analytics Engine
// Advanced analytics and insights for AI interaction traces

import { TraceService, TraceFilters, TraceMetrics } from './service';
import { supabase } from '@/utils/supabase/client';

export interface AnalyticsFilters extends TraceFilters {
  groupBy?: 'model' | 'source' | 'user' | 'hour' | 'day' | 'week';
  aggregateBy?: 'count' | 'cost' | 'tokens' | 'duration' | 'quality';
  timeGranularity?: 'hour' | 'day' | 'week' | 'month';
}

export interface ModelPerformanceAnalysis {
  modelId: string;
  totalRequests: number;
  successRate: number;
  avgDuration: number;
  avgCost: number;
  avgTokensPerSecond: number;
  avgQualityScore?: number;
  costEfficiency: number; // cost per successful token
  recommendation: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface UsageAnalytics {
  totalRequests: number;
  uniqueUsers: number;
  totalCost: number;
  totalTokens: number;
  avgRequestsPerUser: number;
  topModels: Array<{ model: string; usage: number; percentage: number }>;
  costTrends: Array<{ period: string; cost: number; requests: number }>;
  errorAnalysis: {
    totalErrors: number;
    errorRate: number;
    topErrorTypes: Array<{ type: string; count: number; percentage: number }>;
  };
}

export interface PerformanceInsights {
  latencyTrends: Array<{ period: string; avgLatency: number; p95Latency: number }>;
  throughputTrends: Array<{ period: string; requestsPerHour: number }>;
  costOptimizationOpportunities: Array<{
    recommendation: string;
    potentialSavings: number;
    impact: 'high' | 'medium' | 'low';
  }>;
  qualityInsights: {
    avgQualityScore: number;
    qualityTrends: Array<{ period: string; avgScore: number }>;
    topPerformingPrompts: Array<{ promptId: string; avgScore: number; usage: number }>;
  };
}

export class TraceAnalytics {
  /**
   * Get comprehensive performance metrics with analysis
   */
  static async getPerformanceMetrics(filters: AnalyticsFilters = {}): Promise<{
    metrics: TraceMetrics;
    analysis: {
      performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
      recommendations: string[];
      trends: {
        latency: 'improving' | 'stable' | 'degrading';
        throughput: 'increasing' | 'stable' | 'decreasing';
        cost: 'optimizing' | 'stable' | 'increasing';
        quality: 'improving' | 'stable' | 'declining';
      };
    };
  }> {
    const metrics = await TraceService.getTraceMetrics(filters);
    
    // Calculate performance grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    const recommendations: string[] = [];

    // Grading criteria
    const errorRate = metrics.errorRate;
    const avgDuration = metrics.averageDuration;
    const avgLatency = metrics.averageLatency;

    if (errorRate < 1 && avgDuration < 2000 && avgLatency < 500) {
      grade = 'A';
    } else if (errorRate < 5 && avgDuration < 5000 && avgLatency < 1000) {
      grade = 'B';
    } else if (errorRate < 10 && avgDuration < 10000 && avgLatency < 2000) {
      grade = 'C';
    } else if (errorRate < 20 && avgDuration < 20000 && avgLatency < 5000) {
      grade = 'D';
    }

    // Generate recommendations
    if (errorRate > 5) {
      recommendations.push(`High error rate (${errorRate.toFixed(1)}%) - investigate common failure patterns`);
    }
    if (avgDuration > 10000) {
      recommendations.push(`Slow average response time (${avgDuration}ms) - consider model optimization`);
    }
    if (avgLatency > 2000) {
      recommendations.push(`High first token latency (${avgLatency}ms) - review model selection`);
    }
    if (metrics.streamingRate < 50) {
      recommendations.push(`Low streaming adoption (${metrics.streamingRate.toFixed(1)}%) - promote streaming for better UX`);
    }

    // Calculate trends (simplified - in production, compare with historical data)
    const trends = {
      latency: 'stable' as const,
      throughput: 'stable' as const,
      cost: 'stable' as const,
      quality: 'stable' as const
    };

    return {
      metrics,
      analysis: {
        performanceGrade: grade,
        recommendations,
        trends
      }
    };
  }

  /**
   * Analyze model performance and provide recommendations
   */
  static async analyzeModelPerformance(filters: AnalyticsFilters = {}): Promise<ModelPerformanceAnalysis[]> {
    const { data, error } = await supabase
      .from('ai_interaction_traces')
      .select(`
        model_id,
        status,
        duration_ms,
        cost_calculation,
        tokens_used,
        tokens_per_second,
        quality_score,
        created_at
      `)
      .gte('created_at', filters.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .lte('created_at', filters.endDate || new Date().toISOString());

    if (error || !data) {
      throw new Error(`Failed to analyze model performance: ${error?.message || 'No data'}`);
    }

    // Group by model
    const modelStats = data.reduce((acc, trace) => {
      const modelId = trace.model_id;
      if (!acc[modelId]) {
        acc[modelId] = {
          requests: [],
          totalCost: 0,
          totalTokens: 0,
          totalDuration: 0,
          successCount: 0,
          qualityScores: []
        };
      }

      acc[modelId].requests.push(trace);
      if (trace.status === 'success') {
        acc[modelId].successCount++;
      }
      if (trace.cost_calculation?.total_cost) {
        acc[modelId].totalCost += parseFloat(trace.cost_calculation.total_cost);
      }
      if (trace.tokens_used?.total) {
        acc[modelId].totalTokens += trace.tokens_used.total;
      }
      if (trace.duration_ms) {
        acc[modelId].totalDuration += trace.duration_ms;
      }
      if (trace.quality_score) {
        acc[modelId].qualityScores.push(trace.quality_score);
      }

      return acc;
    }, {} as Record<string, any>);

    // Calculate analytics for each model
    const analyses: ModelPerformanceAnalysis[] = Object.entries(modelStats).map(([modelId, stats]) => {
      const totalRequests = stats.requests.length;
      const successRate = (stats.successCount / totalRequests) * 100;
      const avgDuration = stats.totalDuration / totalRequests;
      const avgCost = stats.totalCost / totalRequests;
      const avgTokensPerSecond = stats.requests
        .filter((r: any) => r.tokens_per_second)
        .reduce((sum: number, r: any) => sum + r.tokens_per_second, 0) / 
        stats.requests.filter((r: any) => r.tokens_per_second).length || 0;
      const avgQualityScore = stats.qualityScores.length > 0 
        ? stats.qualityScores.reduce((sum: number, score: number) => sum + score, 0) / stats.qualityScores.length
        : undefined;
      const costEfficiency = stats.totalTokens > 0 ? stats.totalCost / stats.totalTokens : 0;

      // Determine recommendation
      let recommendation: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
      if (successRate > 95 && avgDuration < 3000 && costEfficiency < 0.001) {
        recommendation = 'excellent';
      } else if (successRate > 90 && avgDuration < 5000 && costEfficiency < 0.005) {
        recommendation = 'good';
      } else if (successRate > 80 && avgDuration < 10000) {
        recommendation = 'fair';
      }

      return {
        modelId,
        totalRequests,
        successRate,
        avgDuration,
        avgCost,
        avgTokensPerSecond,
        avgQualityScore,
        costEfficiency,
        recommendation
      };
    });

    // Sort by total requests (popularity)
    return analyses.sort((a, b) => b.totalRequests - a.totalRequests);
  }

  /**
   * Generate comprehensive usage analytics
   */
  static async generateUsageReport(dateRange: { start: string; end: string }): Promise<UsageAnalytics> {
    const { data, error } = await supabase
      .from('ai_interaction_traces')
      .select(`
        user_id,
        model_id,
        status,
        cost_calculation,
        tokens_used,
        error_code,
        created_at
      `)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    if (error || !data) {
      throw new Error(`Failed to generate usage report: ${error?.message || 'No data'}`);
    }

    const totalRequests = data.length;
    const uniqueUsers = new Set(data.map(trace => trace.user_id)).size;
    const totalCost = data.reduce((sum, trace) => {
      return sum + (parseFloat(trace.cost_calculation?.total_cost || '0'));
    }, 0);
    const totalTokens = data.reduce((sum, trace) => {
      return sum + (trace.tokens_used?.total || 0);
    }, 0);

    const avgRequestsPerUser = totalRequests / uniqueUsers;

    // Model usage analysis
    const modelUsage = data.reduce((acc, trace) => {
      acc[trace.model_id] = (acc[trace.model_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topModels = Object.entries(modelUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([model, usage]) => ({
        model,
        usage,
        percentage: (usage / totalRequests) * 100
      }));

    // Cost trends (daily)
    const costTrends = this.aggregateByPeriod(data, 'day', dateRange)
      .map(period => ({
        period: period.date,
        cost: period.traces.reduce((sum, trace) => 
          sum + parseFloat(trace.cost_calculation?.total_cost || '0'), 0
        ),
        requests: period.traces.length
      }));

    // Error analysis
    const errors = data.filter(trace => trace.status === 'error');
    const errorTypes = errors.reduce((acc, trace) => {
      const errorType = trace.error_code || 'UNKNOWN';
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topErrorTypes = Object.entries(errorTypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / errors.length) * 100
      }));

    return {
      totalRequests,
      uniqueUsers,
      totalCost,
      totalTokens,
      avgRequestsPerUser,
      topModels,
      costTrends,
      errorAnalysis: {
        totalErrors: errors.length,
        errorRate: (errors.length / totalRequests) * 100,
        topErrorTypes
      }
    };
  }

  /**
   * Generate performance insights and optimization recommendations
   */
  static async getPerformanceInsights(filters: AnalyticsFilters = {}): Promise<PerformanceInsights> {
    const { data, error } = await supabase
      .from('ai_interaction_traces')
      .select(`
        duration_ms,
        first_token_latency_ms,
        cost_calculation,
        quality_score,
        prompt_id,
        model_id,
        created_at
      `)
      .gte('created_at', filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('created_at', filters.endDate || new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error || !data) {
      throw new Error(`Failed to get performance insights: ${error?.message || 'No data'}`);
    }

    // Latency trends
    const latencyTrends = this.aggregateByPeriod(data, 'day', {
      start: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: filters.endDate || new Date().toISOString()
    }).map(period => {
      const latencies = period.traces
        .map(t => t.first_token_latency_ms)
        .filter(l => l !== null && l !== undefined)
        .sort((a, b) => a - b);
      
      const avgLatency = latencies.length > 0 
        ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length 
        : 0;
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95Latency = latencies[p95Index] || 0;

      return {
        period: period.date,
        avgLatency,
        p95Latency
      };
    });

    // Throughput trends
    const throughputTrends = this.aggregateByPeriod(data, 'day', {
      start: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: filters.endDate || new Date().toISOString()
    }).map(period => ({
      period: period.date,
      requestsPerHour: (period.traces.length / 24) // Approximate requests per hour
    }));

    // Cost optimization opportunities
    const costOptimizationOpportunities = this.identifyCostOptimizations(data);

    // Quality insights
    const qualityScores = data
      .map(t => t.quality_score)
      .filter(s => s !== null && s !== undefined);
    
    const avgQualityScore = qualityScores.length > 0 
      ? qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length 
      : 0;

    const qualityTrends = this.aggregateByPeriod(data, 'day', {
      start: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: filters.endDate || new Date().toISOString()
    }).map(period => {
      const scores = period.traces
        .map(t => t.quality_score)
        .filter(s => s !== null && s !== undefined);
      
      const avgScore = scores.length > 0 
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
        : 0;

      return {
        period: period.date,
        avgScore
      };
    });

    // Top performing prompts
    const promptPerformance = data
      .filter(t => t.prompt_id && t.quality_score)
      .reduce((acc, trace) => {
        if (!acc[trace.prompt_id!]) {
          acc[trace.prompt_id!] = { scores: [], usage: 0 };
        }
        acc[trace.prompt_id!].scores.push(trace.quality_score!);
        acc[trace.prompt_id!].usage++;
        return acc;
      }, {} as Record<string, { scores: number[]; usage: number }>);

    const topPerformingPrompts = Object.entries(promptPerformance)
      .map(([promptId, data]) => ({
        promptId,
        avgScore: data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length,
        usage: data.usage
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);

    return {
      latencyTrends,
      throughputTrends,
      costOptimizationOpportunities,
      qualityInsights: {
        avgQualityScore,
        qualityTrends,
        topPerformingPrompts
      }
    };
  }

  /**
   * Get real-time dashboard data
   */
  static async getDashboardData(): Promise<{
    live: {
      activeTraces: number;
      avgLatency: number;
      errorRate: number;
      throughput: number;
    };
    today: {
      totalRequests: number;
      totalCost: number;
      avgQuality: number;
      topModel: string;
    };
    alerts: Array<{
      type: 'warning' | 'error' | 'info';
      message: string;
      timestamp: string;
    }>;
  }> {
    // Get live data
    const liveData = await TraceService.getLiveTraces();
    
    // Get today's data
    const today = new Date().toISOString().split('T')[0];
    const todayStart = `${today}T00:00:00.000Z`;
    const todayEnd = `${today}T23:59:59.999Z`;
    
    const { data: todayTraces } = await supabase
      .from('ai_interaction_traces')
      .select('model_id, cost_calculation, quality_score')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    const todayStats = {
      totalRequests: todayTraces?.length || 0,
      totalCost: todayTraces?.reduce((sum, t) => 
        sum + parseFloat(t.cost_calculation?.total_cost || '0'), 0) || 0,
      avgQuality: todayTraces && todayTraces.length > 0 
        ? todayTraces
            .filter(t => t.quality_score)
            .reduce((sum, t) => sum + t.quality_score!, 0) / 
          todayTraces.filter(t => t.quality_score).length || 0
        : 0,
      topModel: todayTraces && todayTraces.length > 0 
        ? todayTraces.reduce((acc, t) => {
            acc[t.model_id] = (acc[t.model_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        : {}
    };

    const topModel = Object.entries(todayStats.topModel)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || 'none';

    // Generate alerts
    const alerts = [];
    if (liveData.errorRate > 10) {
      alerts.push({
        type: 'error' as const,
        message: `High error rate: ${liveData.errorRate.toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
    }
    if (liveData.avgLatency > 5000) {
      alerts.push({
        type: 'warning' as const,
        message: `High latency: ${liveData.avgLatency.toFixed(0)}ms`,
        timestamp: new Date().toISOString()
      });
    }

    return {
      live: {
        activeTraces: liveData.active,
        avgLatency: liveData.avgLatency,
        errorRate: liveData.errorRate,
        throughput: 0 // Calculate from recent data
      },
      today: {
        totalRequests: todayStats.totalRequests,
        totalCost: todayStats.totalCost,
        avgQuality: todayStats.avgQuality,
        topModel
      },
      alerts
    };
  }

  /**
   * Helper: Aggregate traces by time period
   */
  private static aggregateByPeriod(data: any[], granularity: 'hour' | 'day' | 'week', dateRange: { start: string; end: string }) {
    const periods = new Map<string, any[]>();
    
    data.forEach(trace => {
      const date = new Date(trace.created_at);
      let periodKey: string;
      
      switch (granularity) {
        case 'hour':
          periodKey = date.toISOString().slice(0, 13);
          break;
        case 'day':
          periodKey = date.toISOString().slice(0, 10);
          break;
        case 'week':
          const week = new Date(date);
          week.setDate(date.getDate() - date.getDay());
          periodKey = week.toISOString().slice(0, 10);
          break;
      }
      
      if (!periods.has(periodKey)) {
        periods.set(periodKey, []);
      }
      periods.get(periodKey)!.push(trace);
    });

    return Array.from(periods.entries()).map(([date, traces]) => ({
      date,
      traces
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Helper: Identify cost optimization opportunities
   */
  private static identifyCostOptimizations(data: any[]) {
    const opportunities = [];

    // Analyze model costs
    const modelCosts = data.reduce((acc, trace) => {
      const modelId = trace.model_id;
      const cost = parseFloat(trace.cost_calculation?.total_cost || '0');
      if (!acc[modelId]) {
        acc[modelId] = { totalCost: 0, count: 0 };
      }
      acc[modelId].totalCost += cost;
      acc[modelId].count++;
      return acc;
    }, {} as Record<string, { totalCost: number; count: number }>);

    // Find expensive models with alternatives
    const expensiveModels = Object.entries(modelCosts)
      .map(([model, stats]) => ({
        model,
        avgCost: stats.totalCost / stats.count,
        totalCost: stats.totalCost,
        usage: stats.count
      }))
      .sort((a, b) => b.avgCost - a.avgCost);

    if (expensiveModels.length > 0 && expensiveModels[0].avgCost > 0.01) {
      opportunities.push({
        recommendation: `Consider switching from ${expensiveModels[0].model} to a more cost-effective alternative`,
        potentialSavings: expensiveModels[0].totalCost * 0.3, // Estimate 30% savings
        impact: 'high' as const
      });
    }

    return opportunities;
  }
}