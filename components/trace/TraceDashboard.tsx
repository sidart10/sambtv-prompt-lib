'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, Clock, DollarSign, TrendingUp, TrendingDown, Minus,
  Search, Filter, RefreshCw, AlertCircle, Activity, Zap
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TraceDashboardProps {
  userId?: string;
  limit?: number;
  autoRefresh?: boolean;
  onTraceSelect?: (traceId: string) => void;
}

interface TraceItem {
  trace_id: string;
  model_id: string;
  prompt_id?: string;
  status: 'pending' | 'streaming' | 'success' | 'error' | 'cancelled';
  source: 'playground' | 'api' | 'test';
  tokens_used?: {
    input: number;
    output: number;
    total: number;
  };
  cost_calculation?: {
    input_cost: string;
    output_cost: string;
    total_cost: string;
  };
  duration_ms?: number;
  quality_score?: number;
  user_rating?: number;
  created_at: string;
  error_message?: string;
  streaming_enabled?: boolean;
}

interface TraceSummary {
  totalTraces: number;
  returnedTraces: number;
  hasMore: boolean;
  filters: string[];
}

interface TraceMetrics {
  totalTraces: number;
  avgDuration: number;
  totalCost: number;
  errorRate: number;
  avgQuality: number;
  tokensPerSecond: number;
}

export function TraceDashboard({ 
  userId, 
  limit = 50, 
  autoRefresh = true,
  onTraceSelect 
}: TraceDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [refreshInterval, setRefreshInterval] = useState(autoRefresh ? 30000 : 0);

  // Fetch traces
  const { data: tracesData, isLoading: tracesLoading, refetch: refetchTraces } = useQuery({
    queryKey: ['traces', searchQuery, statusFilter, modelFilter, sortBy, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        sortBy,
        sortOrder: 'desc',
        includeMetrics: 'true'
      });

      if (searchQuery) params.append('query', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (modelFilter !== 'all') params.append('model', modelFilter);
      if (userId) params.append('userId', userId);

      const response = await fetch(`/api/tracing/search?${params}`);
      if (!response.ok) throw new Error('Failed to fetch traces');
      return response.json();
    },
    refetchInterval: refreshInterval,
    staleTime: 10000
  });

  // Fetch live metrics
  const { data: liveData, isLoading: liveLoading } = useQuery({
    queryKey: ['traces-live'],
    queryFn: async () => {
      const response = await fetch('/api/tracing/live');
      if (!response.ok) throw new Error('Failed to fetch live data');
      return response.json();
    },
    refetchInterval: 5000,
    staleTime: 3000
  });

  const traces: TraceItem[] = tracesData?.traces || [];
  const summary: TraceSummary = tracesData?.summary || { totalTraces: 0, returnedTraces: 0, hasMore: false, filters: [] };
  const metrics: TraceMetrics = tracesData?.metrics || {
    totalTraces: 0,
    avgDuration: 0,
    totalCost: 0,
    errorRate: 0,
    avgQuality: 0,
    tokensPerSecond: 0
  };

  const handleRefresh = () => {
    refetchTraces();
  };

  const getStatusBadge = (status: TraceItem['status']) => {
    const variants = {
      pending: { color: 'default', icon: Clock },
      streaming: { color: 'secondary', icon: Activity },
      success: { color: 'success', icon: null },
      error: { color: 'destructive', icon: AlertCircle },
      cancelled: { color: 'outline', icon: null }
    };

    const variant = variants[status];
    const Icon = variant.icon;

    return (
      <Badge variant={variant.color as any} className="flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {status}
      </Badge>
    );
  };

  const getSourceBadge = (source: TraceItem['source']) => {
    const colors = {
      playground: 'bg-blue-500/10 text-blue-700',
      api: 'bg-green-500/10 text-green-700',
      test: 'bg-orange-500/10 text-orange-700'
    };

    return (
      <Badge className={cn('font-mono text-xs', colors[source])}>
        {source}
      </Badge>
    );
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCost = (cost?: string) => {
    if (!cost) return '-';
    const value = parseFloat(cost);
    if (value < 0.01) return `<$0.01`;
    return `$${value.toFixed(3)}`;
  };

  const isLoading = tracesLoading || liveLoading;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trace Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor AI interaction performance and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Traces</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTraces.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {liveData?.live.active || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(metrics.avgDuration)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {liveData?.trends?.latency && getTrendIcon(liveData.trends.latency)}
              <span className="ml-1">
                {liveData?.live.avgLatency ? formatDuration(liveData.live.avgLatency) : '-'} current
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(metrics.totalCost.toString())}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.tokensPerSecond.toFixed(1)} tokens/sec
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.errorRate * 100).toFixed(1)}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {liveData?.trends?.errorRate && getTrendIcon(liveData.trends.errorRate)}
              <span className="ml-1">
                {liveData?.health?.status || 'healthy'} status
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search traces..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="streaming">Streaming</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</SelectItem>
                <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date</SelectItem>
                <SelectItem value="duration_ms">Duration</SelectItem>
                <SelectItem value="cost">Cost</SelectItem>
                <SelectItem value="tokens">Tokens</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Traces List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Traces</CardTitle>
            <CardDescription>
              Showing {summary.returnedTraces} of {summary.totalTraces} traces
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                    <Skeleton className="h-8 w-[80px]" />
                  </div>
                ))}
              </div>
            ) : traces.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No traces found. Try adjusting your filters or create some AI interactions.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {traces.map((trace) => (
                  <div
                    key={trace.trace_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onTraceSelect?.(trace.trace_id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-muted-foreground">
                          {trace.trace_id.slice(0, 8)}...
                        </span>
                        {getStatusBadge(trace.status)}
                        {getSourceBadge(trace.source)}
                        {trace.streaming_enabled && (
                          <Badge variant="outline" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Streaming
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{trace.model_id}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(trace.created_at), { addSuffix: true })}</span>
                        {trace.duration_ms && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(trace.duration_ms)}</span>
                          </>
                        )}
                        {trace.tokens_used && (
                          <>
                            <span>•</span>
                            <span>{trace.tokens_used.total} tokens</span>
                          </>
                        )}
                      </div>
                      {trace.error_message && (
                        <p className="text-sm text-destructive mt-1 truncate">
                          {trace.error_message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-4">
                      <span className="font-semibold text-lg">
                        {formatCost(trace.cost_calculation?.total_cost)}
                      </span>
                      {trace.quality_score && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Quality:</span>
                          <Badge variant="outline" className="text-xs">
                            {trace.quality_score.toFixed(1)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          {summary.hasMore && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm">
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}