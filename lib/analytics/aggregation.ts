// Task 19: Data Aggregation Service
// Handles periodic aggregation of analytics data

import { createClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export class AggregationService {
  /**
   * Run all aggregation jobs
   */
  static async runAggregations(): Promise<{
    success: boolean;
    results: Record<string, any>;
    errors: string[];
  }> {
    const results: Record<string, any> = {};
    const errors: string[] = [];

    try {
      // Run daily usage aggregation
      results.dailyUsage = await this.aggregateDailyUsage();
    } catch (error) {
      errors.push(`Daily usage aggregation failed: ${error}`);
    }

    try {
      // Run model statistics aggregation
      results.modelStats = await this.aggregateModelStatistics();
    } catch (error) {
      errors.push(`Model statistics aggregation failed: ${error}`);
    }

    try {
      // Run cost analysis aggregation
      results.costAnalysis = await this.aggregateCostAnalysis();
    } catch (error) {
      errors.push(`Cost analysis aggregation failed: ${error}`);
    }

    try {
      // Run user activity aggregation
      results.userActivity = await this.aggregateUserActivity();
    } catch (error) {
      errors.push(`User activity aggregation failed: ${error}`);
    }

    try {
      // Run prompt performance aggregation
      results.promptPerformance = await this.aggregatePromptPerformance();
    } catch (error) {
      errors.push(`Prompt performance aggregation failed: ${error}`);
    }

    return {
      success: errors.length === 0,
      results,
      errors
    };
  }

  /**
   * Aggregate daily usage from traces
   */
  static async aggregateDailyUsage(date?: Date): Promise<{
    processed: number;
    inserted: number;
    updated: number;
  }> {
    const supabase = await createClient();
    const targetDate = date || new Date();
    
    // Call the database function to aggregate daily analytics
    const { data, error } = await supabase.rpc('aggregate_daily_analytics');

    if (error) {
      throw new Error(`Failed to aggregate daily usage: ${error.message}`);
    }

    // Also update evaluation scores
    await supabase.rpc('update_daily_evaluation_scores');

    // Get counts for reporting
    const dateStr = targetDate.toISOString().split('T')[0];
    const { count } = await supabase
      .from('usage_analytics_daily')
      .select('*', { count: 'exact', head: true })
      .eq('date', dateStr);

    return {
      processed: count || 0,
      inserted: count || 0,
      updated: 0
    };
  }

  /**
   * Aggregate model statistics by period
   */
  static async aggregateModelStatistics(
    periodType: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<{
    models: number;
    periods: number;
  }> {
    const supabase = await createClient();
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    // Determine period boundaries
    switch (periodType) {
      case 'hour':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        periodEnd = new Date(periodStart.getTime() + 60 * 60 * 1000);
        break;
      case 'day':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        periodStart = weekStart;
        periodEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
    }

    // Get aggregated data from traces
    const { data: traces, error } = await supabase
      .from('ai_interaction_traces')
      .select(`
        model_id,
        user_id,
        status,
        cost_calculation,
        tokens_used,
        duration_ms,
        tokens_per_second,
        quality_score,
        error_code
      `)
      .gte('created_at', periodStart.toISOString())
      .lt('created_at', periodEnd.toISOString());

    if (error) {
      throw new Error(`Failed to fetch traces: ${error.message}`);
    }

    // Group by model
    const modelGroups = traces.reduce((acc, trace) => {
      if (!acc[trace.model_id]) {
        acc[trace.model_id] = [];
      }
      acc[trace.model_id].push(trace);
      return acc;
    }, {} as Record<string, any[]>);

    // Insert aggregated statistics
    let modelsProcessed = 0;
    
    for (const [modelId, modelTraces] of Object.entries(modelGroups)) {
      const stats = this.calculateModelStats(modelTraces);
      
      const { error: insertError } = await supabase
        .from('model_usage_statistics')
        .upsert({
          model_id: modelId,
          period_type: periodType,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          total_requests: stats.totalRequests,
          unique_users: stats.uniqueUsers,
          total_tokens: stats.totalTokens,
          total_cost: stats.totalCost,
          success_rate: stats.successRate,
          error_rate: stats.errorRate,
          avg_response_time_ms: stats.avgResponseTime,
          avg_tokens_per_second: stats.avgTokensPerSecond,
          cost_per_token: stats.costPerToken,
          cost_per_request: stats.costPerRequest,
          avg_quality_score: stats.avgQualityScore,
          quality_distribution: stats.qualityDistribution,
          error_types: stats.errorTypes,
          common_errors: stats.commonErrors
        });

      if (!insertError) {
        modelsProcessed++;
      }
    }

    return {
      models: modelsProcessed,
      periods: 1
    };
  }

  /**
   * Aggregate cost analysis by period
   */
  static async aggregateCostAnalysis(
    periodType: 'day' | 'week' | 'month' | 'quarter' = 'day'
  ): Promise<{
    periods: number;
    totalCost: number;
  }> {
    const supabase = await createClient();
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    // Determine period boundaries
    switch (periodType) {
      case 'day':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        periodStart = weekStart;
        periodEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
        periodEnd = new Date(now.getFullYear(), quarter * 3 + 3, 1);
        break;
    }

    // Get cost data from daily analytics
    const { data, error } = await supabase
      .from('usage_analytics_daily')
      .select('*')
      .gte('date', periodStart.toISOString().split('T')[0])
      .lt('date', periodEnd.toISOString().split('T')[0]);

    if (error) {
      throw new Error(`Failed to fetch usage data: ${error.message}`);
    }

    // Calculate aggregates
    const totalCost = data.reduce((sum, record) => sum + parseFloat(record.total_cost), 0);
    const totalRequests = data.reduce((sum, record) => sum + record.total_requests, 0);
    const totalTokens = data.reduce((sum, record) => sum + record.total_tokens, 0);

    // Model costs breakdown
    const modelCosts = data.reduce((acc, record) => {
      acc[record.model_id] = (acc[record.model_id] || 0) + parseFloat(record.total_cost);
      return acc;
    }, {} as Record<string, number>);

    // User costs breakdown
    const userCosts = data.reduce((acc, record) => {
      acc[record.user_id] = (acc[record.user_id] || 0) + parseFloat(record.total_cost);
      return acc;
    }, {} as Record<string, number>);

    // Generate optimization recommendations
    const recommendations = this.generateOptimizationRecommendations(
      modelCosts,
      userCosts,
      totalCost
    );

    // Insert cost analysis summary
    const { error: insertError } = await supabase
      .from('cost_analysis_summary')
      .upsert({
        period_type: periodType,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        total_cost: totalCost,
        total_requests: totalRequests,
        total_tokens: totalTokens,
        model_costs: modelCosts,
        user_costs: userCosts,
        department_costs: {}, // To be implemented with user departments
        cost_change_percentage: 0, // Calculate from historical data
        cost_forecast: totalCost * 1.1, // Simple 10% growth forecast
        optimization_recommendations: recommendations,
        potential_savings: recommendations.reduce((sum, r) => sum + r.savings, 0),
        top_users: Object.entries(userCosts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([userId, cost]) => ({ userId, cost })),
        top_prompts: [] // To be implemented
      });

    if (insertError) {
      throw new Error(`Failed to insert cost analysis: ${insertError.message}`);
    }

    return {
      periods: 1,
      totalCost
    };
  }

  /**
   * Aggregate user activity metrics
   */
  static async aggregateUserActivity(date?: Date): Promise<{
    users: number;
  }> {
    const supabase = await createClient();
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    // Get user activity data
    const { data, error } = await supabase
      .from('usage_analytics_daily')
      .select('*')
      .eq('date', dateStr);

    if (error) {
      throw new Error(`Failed to fetch daily usage: ${error.message}`);
    }

    // Group by user
    const userGroups = data.reduce((acc, record) => {
      if (!acc[record.user_id]) {
        acc[record.user_id] = [];
      }
      acc[record.user_id].push(record);
      return acc;
    }, {} as Record<string, any[]>);

    let usersProcessed = 0;

    for (const [userId, userRecords] of Object.entries(userGroups)) {
      const totalRequests = userRecords.reduce((sum, r) => sum + r.total_requests, 0);
      const totalCost = userRecords.reduce((sum, r) => sum + parseFloat(r.total_cost), 0);
      const uniqueModels = new Set(userRecords.map(r => r.model_id)).size;
      
      // Find most used model
      const modelUsage = userRecords.reduce((acc, r) => {
        acc[r.model_id] = (acc[r.model_id] || 0) + r.total_requests;
        return acc;
      }, {} as Record<string, number>);
      
      const mostUsedModel = Object.entries(modelUsage)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

      // Calculate peak usage hour (simplified)
      const peakHour = Math.floor(Math.random() * 24); // In production, analyze timestamps

      const { error: insertError } = await supabase
        .from('user_activity_metrics')
        .upsert({
          user_id: userId,
          date: dateStr,
          total_requests: totalRequests,
          unique_prompts: 0, // To be calculated from prompt usage
          unique_models_used: uniqueModels,
          total_cost: totalCost,
          peak_usage_hour: peakHour,
          most_used_model: mostUsedModel,
          most_used_prompt_id: null, // To be implemented
          avg_session_duration_minutes: 30, // Placeholder
          requests_per_session: totalRequests / 5, // Assume 5 sessions
          playground_usage: userRecords.filter(r => r.source === 'playground').length,
          api_usage: userRecords.filter(r => r.source === 'api').length,
          evaluation_runs: 0 // To be calculated from evaluations
        });

      if (!insertError) {
        usersProcessed++;
      }
    }

    return { users: usersProcessed };
  }

  /**
   * Aggregate prompt performance trends
   */
  static async aggregatePromptPerformance(date?: Date): Promise<{
    prompts: number;
  }> {
    const supabase = await createClient();
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    // Get prompt usage from traces
    const { data: traces, error } = await supabase
      .from('ai_interaction_traces')
      .select(`
        prompt_id,
        user_id,
        model_id,
        cost_calculation,
        duration_ms,
        quality_score,
        status
      `)
      .gte('created_at', `${dateStr}T00:00:00`)
      .lt('created_at', `${dateStr}T23:59:59`)
      .not('prompt_id', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch traces: ${error.message}`);
    }

    // Group by prompt
    const promptGroups = traces.reduce((acc, trace) => {
      if (!acc[trace.prompt_id!]) {
        acc[trace.prompt_id!] = [];
      }
      acc[trace.prompt_id!].push(trace);
      return acc;
    }, {} as Record<string, any[]>);

    let promptsProcessed = 0;

    for (const [promptId, promptTraces] of Object.entries(promptGroups)) {
      const totalUses = promptTraces.length;
      const uniqueUsers = new Set(promptTraces.map(t => t.user_id)).size;
      const totalCost = promptTraces.reduce((sum, t) => 
        sum + parseFloat(t.cost_calculation?.total_cost || '0'), 0
      );
      const avgCostPerUse = totalCost / totalUses;
      const avgDuration = promptTraces.reduce((sum, t) => 
        sum + (t.duration_ms || 0), 0
      ) / totalUses;
      const successRate = (promptTraces.filter(t => t.status === 'success').length / totalUses) * 100;
      const avgQualityScore = promptTraces
        .filter(t => t.quality_score)
        .reduce((sum, t) => sum + t.quality_score!, 0) / 
        promptTraces.filter(t => t.quality_score).length || 0;

      // Model usage distribution
      const modelUsage = promptTraces.reduce((acc, t) => {
        acc[t.model_id] = (acc[t.model_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const { error: insertError } = await supabase
        .from('prompt_performance_trends')
        .upsert({
          prompt_id: promptId,
          date: dateStr,
          total_uses: totalUses,
          unique_users: uniqueUsers,
          total_cost: totalCost,
          avg_cost_per_use: avgCostPerUse,
          avg_duration_ms: avgDuration,
          success_rate: successRate,
          avg_quality_score: avgQualityScore,
          avg_evaluation_score: 0, // To be calculated from evaluations
          user_satisfaction_score: 0, // To be implemented
          model_usage: modelUsage
        });

      if (!insertError) {
        promptsProcessed++;
      }
    }

    return { prompts: promptsProcessed };
  }

  /**
   * Helper: Calculate model statistics
   */
  private static calculateModelStats(traces: any[]) {
    const totalRequests = traces.length;
    const uniqueUsers = new Set(traces.map(t => t.user_id)).size;
    const successCount = traces.filter(t => t.status === 'success').length;
    const errorCount = traces.filter(t => t.status === 'error').length;
    
    const totalTokens = traces.reduce((sum, t) => 
      sum + (t.tokens_used?.total || 0), 0
    );
    const totalCost = traces.reduce((sum, t) => 
      sum + parseFloat(t.cost_calculation?.total_cost || '0'), 0
    );
    
    const durations = traces
      .filter(t => t.duration_ms)
      .map(t => t.duration_ms);
    const avgResponseTime = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;
    
    const tokensPerSecond = traces
      .filter(t => t.tokens_per_second)
      .map(t => t.tokens_per_second);
    const avgTokensPerSecond = tokensPerSecond.length > 0
      ? tokensPerSecond.reduce((sum, tps) => sum + tps, 0) / tokensPerSecond.length
      : 0;
    
    const qualityScores = traces
      .filter(t => t.quality_score)
      .map(t => t.quality_score);
    const avgQualityScore = qualityScores.length > 0
      ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length
      : 0;
    
    // Quality distribution
    const qualityDistribution = {
      excellent: qualityScores.filter(s => s >= 0.9).length,
      good: qualityScores.filter(s => s >= 0.7 && s < 0.9).length,
      fair: qualityScores.filter(s => s >= 0.5 && s < 0.7).length,
      poor: qualityScores.filter(s => s < 0.5).length
    };
    
    // Error types
    const errorTypes = traces
      .filter(t => t.error_code)
      .reduce((acc, t) => {
        acc[t.error_code] = (acc[t.error_code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const commonErrors = Object.entries(errorTypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error]) => error);

    return {
      totalRequests,
      uniqueUsers,
      totalTokens,
      totalCost,
      successRate: (successCount / totalRequests) * 100,
      errorRate: (errorCount / totalRequests) * 100,
      avgResponseTime,
      avgTokensPerSecond,
      costPerToken: totalTokens > 0 ? totalCost / totalTokens : 0,
      costPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      avgQualityScore,
      qualityDistribution,
      errorTypes,
      commonErrors
    };
  }

  /**
   * Helper: Generate optimization recommendations
   */
  private static generateOptimizationRecommendations(
    modelCosts: Record<string, number>,
    userCosts: Record<string, number>,
    totalCost: number
  ): Array<{ type: string; description: string; savings: number }> {
    const recommendations = [];

    // Check for expensive models
    const expensiveModels = Object.entries(modelCosts)
      .filter(([, cost]) => cost > totalCost * 0.3)
      .sort(([, a], [, b]) => b - a);
    
    if (expensiveModels.length > 0) {
      recommendations.push({
        type: 'model_optimization',
        description: `Switch from ${expensiveModels[0][0]} to cheaper alternatives for routine tasks`,
        savings: expensiveModels[0][1] * 0.4
      });
    }

    // Check for high-volume users
    const highVolumeUsers = Object.entries(userCosts)
      .filter(([, cost]) => cost > totalCost * 0.1)
      .sort(([, a], [, b]) => b - a);
    
    if (highVolumeUsers.length > 0) {
      recommendations.push({
        type: 'usage_optimization',
        description: 'Implement caching for frequently repeated queries',
        savings: totalCost * 0.15
      });
    }

    // General recommendations
    if (totalCost > 1000) {
      recommendations.push({
        type: 'batch_processing',
        description: 'Batch similar requests to reduce API calls',
        savings: totalCost * 0.1
      });
    }

    return recommendations;
  }
}