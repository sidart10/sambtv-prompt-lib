// Task 19: Cost Optimization Engine
// Advanced cost analysis and recommendation system

import { createClient } from '@/utils/supabase/server';
import { AnalyticsService } from './service';

export interface CostOptimizationRecommendation {
  id: string;
  type: 'model_switch' | 'usage_pattern' | 'batch_optimization' | 'cache_strategy';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  potentialSavings: number;
  implementationEffort: 'easy' | 'moderate' | 'complex';
  confidence: number; // 0-1
  details: {
    currentCost: number;
    optimizedCost: number;
    affectedRequests: number;
    timeframe: string;
  };
  actionItems: string[];
}

export interface CostForecast {
  period: 'weekly' | 'monthly' | 'quarterly';
  current: number;
  forecasted: number;
  confidence: number;
  factors: Array<{
    factor: string;
    impact: number;
    explanation: string;
  }>;
}

export interface ModelCostEfficiency {
  modelId: string;
  costPerToken: number;
  costPerRequest: number;
  qualityScore: number;
  performanceScore: number;
  efficiencyRating: 'excellent' | 'good' | 'average' | 'poor';
  recommendations: string[];
}

export class CostOptimizer {
  /**
   * Generate comprehensive cost optimization recommendations
   */
  static async generateRecommendations(
    dateRange: { start: Date; end: Date },
    minSavings: number = 50 // Minimum potential savings to include
  ): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];

    // Get cost analysis data
    const costAnalysis = await AnalyticsService.analyzeCosts(dateRange);
    const modelComparison = await AnalyticsService.compareModels(dateRange);

    // 1. Model switching recommendations
    const modelSwitchRecs = await this.analyzeModelSwitchOpportunities(
      modelComparison,
      costAnalysis,
      minSavings
    );
    recommendations.push(...modelSwitchRecs);

    // 2. Usage pattern optimization
    const usagePatternRecs = await this.analyzeUsagePatterns(
      dateRange,
      costAnalysis,
      minSavings
    );
    recommendations.push(...usagePatternRecs);

    // 3. Batch optimization opportunities
    const batchOptimizationRecs = await this.analyzeBatchOpportunities(
      dateRange,
      minSavings
    );
    recommendations.push(...batchOptimizationRecs);

    // 4. Caching strategy recommendations
    const cacheRecs = await this.analyzeCachingOpportunities(
      dateRange,
      minSavings
    );
    recommendations.push(...cacheRecs);

    // Sort by potential savings (highest first)
    return recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Generate cost forecasts
   */
  static async generateCostForecast(
    period: 'weekly' | 'monthly' | 'quarterly',
    historicalDays: number = 30
  ): Promise<CostForecast> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - historicalDays);

    const costAnalysis = await AnalyticsService.analyzeCosts({ start: startDate, end: endDate });
    const dailyAverage = costAnalysis.totalSpend / historicalDays;

    let forecastDays: number;
    switch (period) {
      case 'weekly':
        forecastDays = 7;
        break;
      case 'monthly':
        forecastDays = 30;
        break;
      case 'quarterly':
        forecastDays = 90;
        break;
    }

    // Simple linear projection with trend analysis
    const trends = costAnalysis.costTrends;
    let trendMultiplier = 1.0;

    if (trends.length >= 7) {
      const recentAvg = trends.slice(-7).reduce((sum, t) => sum + t.cost, 0) / 7;
      const olderAvg = trends.slice(0, 7).reduce((sum, t) => sum + t.cost, 0) / 7;
      trendMultiplier = recentAvg / olderAvg;
    }

    const forecasted = dailyAverage * forecastDays * trendMultiplier;
    const current = dailyAverage * forecastDays;

    // Calculate confidence based on data variability
    const variance = this.calculateVariance(trends.map(t => t.cost));
    const confidence = Math.max(0.3, Math.min(0.95, 1 - (variance / (dailyAverage * dailyAverage))));

    // Identify key factors
    const factors = [
      {
        factor: 'Historical trend',
        impact: (trendMultiplier - 1) * 100,
        explanation: trendMultiplier > 1.1 
          ? 'Costs are increasing based on recent usage patterns'
          : trendMultiplier < 0.9 
          ? 'Costs are decreasing based on recent usage patterns'
          : 'Costs remain stable based on recent patterns'
      },
      {
        factor: 'Usage growth',
        impact: 15, // Assume 15% growth
        explanation: 'Expected organic growth in platform usage'
      }
    ];

    return {
      period,
      current,
      forecasted,
      confidence,
      factors
    };
  }

  /**
   * Analyze model cost efficiency
   */
  static async analyzeModelEfficiency(
    dateRange: { start: Date; end: Date }
  ): Promise<ModelCostEfficiency[]> {
    const modelComparison = await AnalyticsService.compareModels(dateRange);

    return modelComparison.map(model => {
      const costPerToken = model.costEfficiency;
      const costPerRequest = model.metrics.totalRequests > 0 
        ? model.metrics.totalCost / model.metrics.totalRequests 
        : 0;

      let efficiencyRating: 'excellent' | 'good' | 'average' | 'poor';
      const recommendations: string[] = [];

      // Rate efficiency based on cost per token and quality
      if (costPerToken < 0.001 && model.qualityScore > 0.8) {
        efficiencyRating = 'excellent';
        recommendations.push('Ideal for production workloads');
      } else if (costPerToken < 0.005 && model.qualityScore > 0.7) {
        efficiencyRating = 'good';
        recommendations.push('Good balance of cost and quality');
      } else if (costPerToken < 0.01) {
        efficiencyRating = 'average';
        recommendations.push('Consider for specialized use cases only');
      } else {
        efficiencyRating = 'poor';
        recommendations.push('Review usage - may be too expensive for current workload');
      }

      // Additional recommendations based on metrics
      if (model.metrics.errorRate > 10) {
        recommendations.push('High error rate - investigate integration issues');
      }
      if (model.metrics.avgResponseTime > 5000) {
        recommendations.push('Slow response times - consider faster alternatives');
      }
      if (model.performanceScore < 50) {
        recommendations.push('Low performance score - reassess model suitability');
      }

      return {
        modelId: model.modelId,
        costPerToken,
        costPerRequest,
        qualityScore: model.qualityScore,
        performanceScore: model.performanceScore,
        efficiencyRating,
        recommendations
      };
    });
  }

  /**
   * Get real-time cost alerts
   */
  static async getCostAlerts(): Promise<Array<{
    type: 'budget_exceeded' | 'unusual_spike' | 'model_expensive' | 'user_heavy';
    severity: 'low' | 'medium' | 'high';
    message: string;
    value: number;
    threshold: number;
    timestamp: string;
  }>> {
    const alerts = [];
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const todayCosts = await AnalyticsService.analyzeCosts({
      start: yesterday,
      end: today
    });

    // Check for budget alerts (simplified - in production, use actual budget settings)
    const dailyBudget = 100; // $100 daily budget
    if (todayCosts.totalSpend > dailyBudget) {
      alerts.push({
        type: 'budget_exceeded',
        severity: 'high',
        message: `Daily budget exceeded: $${todayCosts.totalSpend.toFixed(2)} / $${dailyBudget}`,
        value: todayCosts.totalSpend,
        threshold: dailyBudget,
        timestamp: new Date().toISOString()
      });
    }

    // Check for cost spikes
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekCosts = await AnalyticsService.analyzeCosts({
      start: weekAgo,
      end: yesterday
    });

    const avgDailyCost = weekCosts.totalSpend / 7;
    if (todayCosts.totalSpend > avgDailyCost * 2) {
      alerts.push({
        type: 'unusual_spike',
        severity: 'medium',
        message: `Unusual cost spike detected: ${(todayCosts.totalSpend / avgDailyCost).toFixed(1)}x above average`,
        value: todayCosts.totalSpend,
        threshold: avgDailyCost * 2,
        timestamp: new Date().toISOString()
      });
    }

    // Check for expensive model usage
    const expensiveThreshold = todayCosts.totalSpend * 0.5;
    Object.entries(todayCosts.costByModel).forEach(([model, cost]) => {
      if (cost > expensiveThreshold) {
        alerts.push({
          type: 'model_expensive',
          severity: 'low',
          message: `${model} accounts for ${((cost / todayCosts.totalSpend) * 100).toFixed(1)}% of today's costs`,
          value: cost as number,
          threshold: expensiveThreshold,
          timestamp: new Date().toISOString()
        });
      }
    });

    return alerts;
  }

  // Helper methods
  private static async analyzeModelSwitchOpportunities(
    modelComparison: any[],
    costAnalysis: any,
    minSavings: number
  ): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];

    // Find expensive models that could be replaced
    const sortedModels = modelComparison.sort((a, b) => b.costEfficiency - a.costEfficiency);
    const cheapestModels = sortedModels.slice(0, 3);
    const expensiveModels = sortedModels.slice(-3);

    expensiveModels.forEach(expensiveModel => {
      const bestAlternative = cheapestModels.find(cheap => 
        cheap.qualityScore >= expensiveModel.qualityScore * 0.9 && // Quality within 10%
        cheap.performanceScore >= expensiveModel.performanceScore * 0.8 // Performance within 20%
      );

      if (bestAlternative) {
        const potentialSavings = (expensiveModel.costEfficiency - bestAlternative.costEfficiency) * 
                               expensiveModel.metrics.totalTokens;

        if (potentialSavings >= minSavings) {
          recommendations.push({
            id: `model-switch-${expensiveModel.modelId}`,
            type: 'model_switch',
            title: `Switch from ${expensiveModel.modelId} to ${bestAlternative.modelId}`,
            description: `Replace expensive model with more cost-efficient alternative`,
            impact: potentialSavings > 500 ? 'high' : potentialSavings > 200 ? 'medium' : 'low',
            potentialSavings,
            implementationEffort: 'easy',
            confidence: 0.8,
            details: {
              currentCost: expensiveModel.metrics.totalCost,
              optimizedCost: expensiveModel.metrics.totalCost - potentialSavings,
              affectedRequests: expensiveModel.metrics.totalRequests,
              timeframe: 'immediate'
            },
            actionItems: [
              'Test alternative model with sample requests',
              'Update application configuration',
              'Monitor quality metrics after switch'
            ]
          });
        }
      }
    });

    return recommendations;
  }

  private static async analyzeUsagePatterns(
    dateRange: { start: Date; end: Date },
    costAnalysis: any,
    minSavings: number
  ): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];

    // Analyze high-volume users
    const highVolumeUsers = Object.entries(costAnalysis.costByUser)
      .filter(([, cost]) => (cost as number) > costAnalysis.totalSpend * 0.1)
      .sort(([, a], [, b]) => (b as number) - (a as number));

    if (highVolumeUsers.length > 0) {
      const topUser = highVolumeUsers[0];
      const potentialSavings = (topUser[1] as number) * 0.2; // Assume 20% savings possible

      if (potentialSavings >= minSavings) {
        recommendations.push({
          id: `usage-pattern-${topUser[0]}`,
          type: 'usage_pattern',
          title: 'Optimize high-volume user workflows',
          description: `Top user could benefit from usage optimization strategies`,
          impact: potentialSavings > 500 ? 'high' : 'medium',
          potentialSavings,
          implementationEffort: 'moderate',
          confidence: 0.6,
          details: {
            currentCost: topUser[1] as number,
            optimizedCost: (topUser[1] as number) * 0.8,
            affectedRequests: 0, // Would need to calculate
            timeframe: '1-2 weeks'
          },
          actionItems: [
            'Analyze user request patterns',
            'Implement request deduplication',
            'Add caching for repeated queries',
            'Provide usage guidelines'
          ]
        });
      }
    }

    return recommendations;
  }

  private static async analyzeBatchOpportunities(
    dateRange: { start: Date; end: Date },
    minSavings: number
  ): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];

    const supabase = await createClient();
    
    // Look for patterns that could benefit from batching
    const { data: traces } = await supabase
      .from('ai_interaction_traces')
      .select('prompt_content, model_id, cost_calculation')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .limit(1000);

    if (traces) {
      // Find similar prompts that could be batched
      const promptPatterns = traces.reduce((acc, trace) => {
        const pattern = this.extractPromptPattern(trace.prompt_content);
        if (!acc[pattern]) {
          acc[pattern] = [];
        }
        acc[pattern].push(trace);
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(promptPatterns).forEach(([pattern, patternTraces]) => {
        if (patternTraces.length >= 10) { // At least 10 similar requests
          const totalCost = patternTraces.reduce((sum, t) => 
            sum + parseFloat(t.cost_calculation?.total_cost || '0'), 0
          );
          const potentialSavings = totalCost * 0.15; // Assume 15% savings from batching

          if (potentialSavings >= minSavings) {
            recommendations.push({
              id: `batch-${pattern}`,
              type: 'batch_optimization',
              title: 'Implement request batching',
              description: `Batch similar requests to reduce API overhead`,
              impact: potentialSavings > 300 ? 'medium' : 'low',
              potentialSavings,
              implementationEffort: 'complex',
              confidence: 0.5,
              details: {
                currentCost: totalCost,
                optimizedCost: totalCost * 0.85,
                affectedRequests: patternTraces.length,
                timeframe: '2-4 weeks'
              },
              actionItems: [
                'Implement batch processing logic',
                'Update API endpoints to support batching',
                'Modify client code to use batch requests',
                'Monitor batch performance'
              ]
            });
          }
        }
      });
    }

    return recommendations;
  }

  private static async analyzeCachingOpportunities(
    dateRange: { start: Date; end: Date },
    minSavings: number
  ): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];

    const supabase = await createClient();
    
    // Look for repeated requests that could be cached
    const { data: traces } = await supabase
      .from('ai_interaction_traces')
      .select('prompt_content, response_content, model_id, cost_calculation')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .limit(1000);

    if (traces) {
      const duplicateRequests = traces.reduce((acc, trace) => {
        const key = `${trace.model_id}:${trace.prompt_content}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(trace);
        return acc;
      }, {} as Record<string, any[]>);

      let totalCacheableCost = 0;
      let cacheableRequests = 0;

      Object.values(duplicateRequests).forEach(duplicates => {
        if (duplicates.length > 1) {
          // All but the first request could have been cached
          const cacheableCost = duplicates.slice(1).reduce((sum, t) => 
            sum + parseFloat(t.cost_calculation?.total_cost || '0'), 0
          );
          totalCacheableCost += cacheableCost;
          cacheableRequests += duplicates.length - 1;
        }
      });

      if (totalCacheableCost >= minSavings) {
        recommendations.push({
          id: 'caching-strategy',
          type: 'cache_strategy',
          title: 'Implement intelligent caching',
          description: `Cache repeated requests to eliminate redundant API calls`,
          impact: totalCacheableCost > 500 ? 'high' : totalCacheableCost > 200 ? 'medium' : 'low',
          potentialSavings: totalCacheableCost,
          implementationEffort: 'moderate',
          confidence: 0.85,
          details: {
            currentCost: totalCacheableCost,
            optimizedCost: 0,
            affectedRequests: cacheableRequests,
            timeframe: '1-2 weeks'
          },
          actionItems: [
            'Implement Redis-based response caching',
            'Add cache keys based on prompt and model',
            'Set appropriate cache TTL values',
            'Monitor cache hit rates'
          ]
        });
      }
    }

    return recommendations;
  }

  private static extractPromptPattern(prompt: string): string {
    // Simplified pattern extraction - in production, use more sophisticated NLP
    const words = prompt.toLowerCase().split(' ');
    const significantWords = words.filter(word => 
      word.length > 3 && !['the', 'and', 'for', 'are', 'with'].includes(word)
    );
    return significantWords.slice(0, 3).join('-');
  }

  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }
}