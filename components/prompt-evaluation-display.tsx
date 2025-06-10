"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, Zap, Star, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface PromptEvaluationDisplayProps {
  promptId: number;
}

interface AnalyticsData {
  analytics: {
    totals: {
      cost?: number;
      traces?: number;
      avgQuality?: number;
      avgLatency?: number;
      errors?: number;
    };
    summary: {
      totalTraces: number;
    };
  };
  insights: Array<{
    type: string;
    message: string;
    trend?: string;
    severity?: string;
  }>;
}

export function PromptEvaluationDisplay({ promptId }: PromptEvaluationDisplayProps) {
  const { data, isLoading, error, refetch } = useQuery<AnalyticsData>({
    queryKey: ['prompt-analytics', promptId],
    queryFn: async () => {
      const response = await fetch(`/api/langfuse/analytics?promptId=${promptId}&metrics=usage,cost,quality,latency,errors`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  });

  // Sync evaluation data on mount
  useEffect(() => {
    fetch('/api/langfuse/sync')
      .then(() => refetch())
      .catch(console.error);
  }, [promptId, refetch]);

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>AI Platform Analytics</CardTitle>
          <CardDescription>Loading evaluation data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.analytics) {
    return null; // Silently fail if no data available
  }

  const { totals, summary } = data.analytics;
  const insights = data.insights || [];

  const getTrendIcon = (trend?: string) => {
    if (trend === 'increasing') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'decreasing') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return null;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'cost': return <DollarSign className="w-4 h-4" />;
      case 'quality': return <Star className="w-4 h-4" />;
      case 'performance': return <Zap className="w-4 h-4" />;
      case 'reliability': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Platform Analytics</CardTitle>
            <CardDescription>
              Performance metrics from {summary.totalTraces} evaluations
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            Live Data
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {totals.cost !== undefined && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-bold">${totals.cost.toFixed(4)}</p>
              {totals.traces && (
                <p className="text-xs text-muted-foreground">
                  ${(totals.cost / totals.traces).toFixed(4)}/run
                </p>
              )}
            </div>
          )}
          
          {totals.avgQuality !== undefined && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg Quality</p>
              <p className="text-2xl font-bold">
                {(totals.avgQuality / summary.totalTraces).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">out of 1.0</p>
            </div>
          )}
          
          {totals.avgLatency !== undefined && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg Latency</p>
              <p className="text-2xl font-bold">
                {Math.round(totals.avgLatency / summary.totalTraces)}ms
              </p>
              <p className="text-xs text-muted-foreground">response time</p>
            </div>
          )}
          
          {totals.errors !== undefined && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Error Rate</p>
              <p className="text-2xl font-bold">
                {totals.traces ? ((totals.errors / totals.traces) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">
                {totals.errors} errors
              </p>
            </div>
          )}
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Insights</h4>
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {getInsightIcon(insight.type)}
                  <span className="flex-1">{insight.message}</span>
                  {getTrendIcon(insight.trend)}
                  {insight.severity && (
                    <Badge 
                      variant={
                        insight.severity === 'high' ? 'destructive' : 
                        insight.severity === 'medium' ? 'secondary' : 
                        'outline'
                      }
                      className="text-xs"
                    >
                      {insight.severity}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}