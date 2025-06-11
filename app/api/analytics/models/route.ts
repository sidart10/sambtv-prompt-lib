import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AnalyticsService } from '@/lib/analytics/service';
import { createSupabaseAdminClient } from '@/utils/supabase/server';

// GET /api/analytics/models - Model performance comparison
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const sortBy = searchParams.get('sortBy') || 'performanceScore';
    const includeDetails = searchParams.get('details') === 'true';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
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
        startDate.setDate(endDate.getDate() - 30);
    }

    const dateRange = { start: startDate, end: endDate };

    // Get model comparison data
    const modelComparison = await AnalyticsService.compareModels(dateRange);

    // Sort by requested criteria
    const sortedModels = [...modelComparison];
    switch (sortBy) {
      case 'usage':
        sortedModels.sort((a, b) => b.metrics.totalRequests - a.metrics.totalRequests);
        break;
      case 'cost':
        sortedModels.sort((a, b) => b.metrics.totalCost - a.metrics.totalCost);
        break;
      case 'efficiency':
        sortedModels.sort((a, b) => a.costEfficiency - b.costEfficiency);
        break;
      case 'quality':
        sortedModels.sort((a, b) => b.qualityScore - a.qualityScore);
        break;
      case 'performanceScore':
      default:
        sortedModels.sort((a, b) => b.performanceScore - a.performanceScore);
        break;
    }

    let additionalDetails = null;

    if (includeDetails) {
      const supabase = createSupabaseAdminClient();
      
      // Get detailed model statistics
      const { data: modelStats } = await supabase
        .from('model_usage_statistics')
        .select('*')
        .eq('period_type', 'day')
        .gte('period_start', startDate.toISOString())
        .lte('period_end', endDate.toISOString())
        .order('period_start', { ascending: true });

      if (modelStats) {
        additionalDetails = {
          trendsOverTime: calculateModelTrends(modelStats),
          errorAnalysis: calculateErrorAnalysis(modelStats),
          qualityDistribution: calculateQualityDistribution(modelStats)
        };
      }
    }

    // Generate model insights
    const insights = generateModelInsights(sortedModels);

    return NextResponse.json({
      period,
      sortBy,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      models: sortedModels,
      summary: {
        totalModels: sortedModels.length,
        totalRequests: sortedModels.reduce((sum, m) => sum + m.metrics.totalRequests, 0),
        totalCost: sortedModels.reduce((sum, m) => sum + m.metrics.totalCost, 0),
        avgPerformanceScore: sortedModels.reduce((sum, m) => sum + m.performanceScore, 0) / sortedModels.length,
        topPerformer: sortedModels[0]?.modelId || null,
        mostCostEfficient: sortedModels.sort((a, b) => a.costEfficiency - b.costEfficiency)[0]?.modelId || null
      },
      details: additionalDetails,
      insights
    });
  } catch (error) {
    console.error('Model analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model analytics' },
      { status: 500 }
    );
  }
}

// Helper function to calculate model trends over time
function calculateModelTrends(modelStats: any[]): Record<string, any> {
  const trends: Record<string, any> = {};

  modelStats.forEach(stat => {
    if (!trends[stat.model_id]) {
      trends[stat.model_id] = {
        modelId: stat.model_id,
        dataPoints: []
      };
    }

    trends[stat.model_id].dataPoints.push({
      date: stat.period_start.split('T')[0],
      requests: stat.total_requests,
      cost: parseFloat(stat.total_cost),
      successRate: stat.success_rate,
      avgResponseTime: stat.avg_response_time_ms,
      qualityScore: stat.avg_quality_score
    });
  });

  // Calculate trends for each model
  Object.values(trends).forEach((trend: any) => {
    trend.dataPoints.sort((a: any, b: any) => a.date.localeCompare(b.date));
    
    if (trend.dataPoints.length >= 2) {
      const first = trend.dataPoints[0];
      const last = trend.dataPoints[trend.dataPoints.length - 1];
      
      trend.trends = {
        usage: calculateTrend(first.requests, last.requests),
        cost: calculateTrend(first.cost, last.cost),
        performance: calculateTrend(last.successRate, first.successRate), // Higher is better
        quality: calculateTrend(first.qualityScore, last.qualityScore)
      };
    }
  });

  return trends;
}

// Helper function to calculate error analysis
function calculateErrorAnalysis(modelStats: any[]): Record<string, any> {
  const errorAnalysis: Record<string, any> = {};

  modelStats.forEach(stat => {
    if (!errorAnalysis[stat.model_id]) {
      errorAnalysis[stat.model_id] = {
        modelId: stat.model_id,
        totalErrors: 0,
        errorTypes: {},
        commonErrors: []
      };
    }

    const errors = stat.error_types || {};
    Object.entries(errors).forEach(([errorType, count]) => {
      errorAnalysis[stat.model_id].totalErrors += count as number;
      errorAnalysis[stat.model_id].errorTypes[errorType] = 
        (errorAnalysis[stat.model_id].errorTypes[errorType] || 0) + (count as number);
    });

    if (stat.common_errors) {
      stat.common_errors.forEach((error: string) => {
        if (!errorAnalysis[stat.model_id].commonErrors.includes(error)) {
          errorAnalysis[stat.model_id].commonErrors.push(error);
        }
      });
    }
  });

  return errorAnalysis;
}

// Helper function to calculate quality distribution
function calculateQualityDistribution(modelStats: any[]): Record<string, any> {
  const qualityDist: Record<string, any> = {};

  modelStats.forEach(stat => {
    if (!qualityDist[stat.model_id]) {
      qualityDist[stat.model_id] = {
        modelId: stat.model_id,
        distribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0
        }
      };
    }

    const dist = stat.quality_distribution || {};
    qualityDist[stat.model_id].distribution.excellent += (dist.excellent || 0);
    qualityDist[stat.model_id].distribution.good += (dist.good || 0);
    qualityDist[stat.model_id].distribution.fair += (dist.fair || 0);
    qualityDist[stat.model_id].distribution.poor += (dist.poor || 0);
  });

  return qualityDist;
}

// Helper function to calculate trend direction
function calculateTrend(oldValue: number, newValue: number): 'increasing' | 'stable' | 'decreasing' {
  if (!oldValue || !newValue) return 'stable';
  
  const change = (newValue - oldValue) / oldValue;
  if (change > 0.1) return 'increasing';
  if (change < -0.1) return 'decreasing';
  return 'stable';
}

// Helper function to generate model insights
function generateModelInsights(models: any[]): string[] {
  const insights = [];

  if (models.length === 0) {
    return ['No model data available for the selected period'];
  }

  // Top performer insight
  const topModel = models[0];
  insights.push(`🏆 ${topModel.modelId} is the top performer with a score of ${topModel.performanceScore.toFixed(1)}/100`);

  // Cost efficiency insight
  const mostEfficient = models.sort((a, b) => a.costEfficiency - b.costEfficiency)[0];
  const leastEfficient = models[models.length - 1];
  
  if (mostEfficient && leastEfficient && mostEfficient.costEfficiency > 0) {
    const efficiency = leastEfficient.costEfficiency / mostEfficient.costEfficiency;
    insights.push(`💰 ${mostEfficient.modelId} is ${efficiency.toFixed(1)}x more cost-efficient than ${leastEfficient.modelId}`);
  }

  // Quality insight
  const highQualityModels = models.filter(m => m.qualityScore > 0.8);
  if (highQualityModels.length > 0) {
    insights.push(`⭐ ${highQualityModels.length} models maintain high quality scores (>0.8): ${highQualityModels.map(m => m.modelId).join(', ')}`);
  }

  // Usage insight
  const totalRequests = models.reduce((sum, m) => sum + m.metrics.totalRequests, 0);
  const topUsageModel = models.sort((a, b) => b.metrics.totalRequests - a.metrics.totalRequests)[0];
  
  if (topUsageModel && totalRequests > 0) {
    const usagePercentage = (topUsageModel.metrics.totalRequests / totalRequests) * 100;
    insights.push(`📊 ${topUsageModel.modelId} handles ${usagePercentage.toFixed(1)}% of all requests`);
  }

  // Recommendation insight
  const recommendedModels = models.filter(m => m.recommendation === 'Excellent choice for production');
  if (recommendedModels.length > 0) {
    insights.push(`✅ Recommended for production: ${recommendedModels.map(m => m.modelId).join(', ')}`);
  }

  return insights;
}