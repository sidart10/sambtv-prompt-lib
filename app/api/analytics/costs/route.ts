import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AnalyticsService } from '@/lib/analytics/service';
import { createClient } from '@/utils/supabase/server';

// GET /api/analytics/costs - Cost analysis and optimization
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const breakdown = searchParams.get('breakdown') || 'models';
    const includeOptimization = searchParams.get('optimization') === 'true';

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
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const dateRange = { start: startDate, end: endDate };

    // Get cost analysis
    const costAnalysis = await AnalyticsService.analyzeCosts(dateRange);

    // Get additional breakdown data
    const supabase = await createClient();
    let additionalData = null;

    if (breakdown === 'daily') {
      const { data } = await supabase
        .from('cost_analysis_summary')
        .select('period_start, total_cost, total_requests')
        .eq('period_type', 'day')
        .gte('period_start', startDate.toISOString().split('T')[0])
        .lte('period_end', endDate.toISOString().split('T')[0])
        .order('period_start', { ascending: true });

      additionalData = data?.map(record => ({
        date: record.period_start,
        cost: parseFloat(record.total_cost),
        requests: record.total_requests,
        costPerRequest: record.total_requests > 0 
          ? parseFloat(record.total_cost) / record.total_requests 
          : 0
      }));
    } else if (breakdown === 'efficiency') {
      // Calculate cost efficiency metrics
      const { data } = await supabase
        .from('model_usage_statistics')
        .select('model_id, total_cost, total_tokens, total_requests, avg_quality_score')
        .eq('period_type', 'day')
        .gte('period_start', startDate.toISOString())
        .lte('period_end', endDate.toISOString());

      if (data) {
        const modelEfficiency = data.reduce((acc, stat) => {
          if (!acc[stat.model_id]) {
            acc[stat.model_id] = {
              modelId: stat.model_id,
              totalCost: 0,
              totalTokens: 0,
              totalRequests: 0,
              totalQualityScore: 0,
              records: 0
            };
          }
          
          acc[stat.model_id].totalCost += parseFloat(stat.total_cost);
          acc[stat.model_id].totalTokens += stat.total_tokens;
          acc[stat.model_id].totalRequests += stat.total_requests;
          acc[stat.model_id].totalQualityScore += (stat.avg_quality_score || 0);
          acc[stat.model_id].records++;
          
          return acc;
        }, {} as Record<string, any>);

        additionalData = Object.values(modelEfficiency).map((model: any) => ({
          modelId: model.modelId,
          costPerToken: model.totalTokens > 0 ? model.totalCost / model.totalTokens : 0,
          costPerRequest: model.totalRequests > 0 ? model.totalCost / model.totalRequests : 0,
          avgQualityScore: model.records > 0 ? model.totalQualityScore / model.records : 0,
          qualityPerDollar: model.totalCost > 0 && model.records > 0 
            ? (model.totalQualityScore / model.records) / model.totalCost 
            : 0,
          totalCost: model.totalCost,
          totalRequests: model.totalRequests,
          totalTokens: model.totalTokens
        })).sort((a: any, b: any) => b.qualityPerDollar - a.qualityPerDollar);
      }
    }

    // Get predictive analytics if requested
    let forecast = null;
    if (includeOptimization) {
      try {
        forecast = await AnalyticsService.getPredictiveAnalytics('cost', 30);
      } catch (error) {
        console.warn('Failed to get cost forecast:', error);
      }
    }

    return NextResponse.json({
      period,
      breakdown,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      analysis: costAnalysis,
      breakdown: additionalData,
      forecast,
      insights: generateCostInsights(costAnalysis, additionalData)
    });
  } catch (error) {
    console.error('Cost analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost analytics' },
      { status: 500 }
    );
  }
}

// Helper function to generate cost insights
function generateCostInsights(costAnalysis: any, breakdown: any): string[] {
  const insights = [];

  // Check spending trends
  if (costAnalysis.projectedMonthlySpend > costAnalysis.totalSpend * 4) {
    insights.push(`📈 Spending is accelerating - projected monthly cost (${costAnalysis.projectedMonthlySpend.toFixed(2)}) is higher than current period trend`);
  }

  // Find most expensive model
  const topModel = Object.entries(costAnalysis.costByModel)
    .sort(([, a], [, b]) => (b as number) - (a as number))[0];
  
  if (topModel && (topModel[1] as number) > costAnalysis.totalSpend * 0.4) {
    insights.push(`💰 ${topModel[0]} accounts for ${((topModel[1] as number) / costAnalysis.totalSpend * 100).toFixed(1)}% of total spend - consider cheaper alternatives for routine tasks`);
  }

  // Check optimization opportunities
  if (costAnalysis.optimizationOpportunities.length > 0) {
    const totalSavings = costAnalysis.optimizationOpportunities
      .reduce((sum: number, opp: any) => sum + opp.potentialSavings, 0);
    insights.push(`💡 ${costAnalysis.optimizationOpportunities.length} optimization opportunities identified with potential savings of $${totalSavings.toFixed(2)}`);
  }

  // Efficiency insights
  if (breakdown && Array.isArray(breakdown)) {
    const bestModel = breakdown[0];
    const worstModel = breakdown[breakdown.length - 1];
    
    if (bestModel && worstModel && bestModel.qualityPerDollar > worstModel.qualityPerDollar * 2) {
      insights.push(`⚡ ${bestModel.modelId} provides ${(bestModel.qualityPerDollar / worstModel.qualityPerDollar).toFixed(1)}x better value than ${worstModel.modelId}`);
    }
  }

  return insights;
}