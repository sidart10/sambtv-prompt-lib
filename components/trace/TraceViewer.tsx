'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, DollarSign, Zap, Activity, AlertCircle, CheckCircle, 
  XCircle, Code, BarChart3, Calendar, Hash, User, Layers,
  TrendingUp, Info, Copy, ExternalLink, Download
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TraceViewerProps {
  traceId: string;
  showTimeline?: boolean;
  showMetrics?: boolean;
  onClose?: () => void;
}

interface TraceData {
  trace_id: string;
  user_id: string;
  model_id: string;
  provider: string;
  prompt_id?: string;
  parent_trace_id?: string;
  session_id?: string;
  status: 'pending' | 'streaming' | 'success' | 'error' | 'cancelled';
  source: 'playground' | 'api' | 'test';
  streaming_enabled?: boolean;
  request_payload?: any;
  response_content?: string;
  error_message?: string;
  error_code?: string;
  tokens_used?: {
    input: number;
    output: number;
    total: number;
  };
  cost_calculation?: {
    input_cost: string;
    output_cost: string;
    total_cost: string;
    currency: string;
  };
  start_time?: string;
  first_token_time?: string;
  end_time?: string;
  duration_ms?: number;
  quality_score?: number;
  user_rating?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
  derivedMetrics?: {
    isCompleted: boolean;
    isActive: boolean;
    hasError: boolean;
    totalDuration: number;
    estimatedCost: number;
    tokenEfficiency: number | null;
    qualityScore: number | null;
    hasUserRating: boolean;
  };
}

interface TraceEvent {
  event_id: string;
  trace_id: string;
  event_type: string;
  event_data: any;
  created_at: string;
}

export function TraceViewer({ 
  traceId, 
  showTimeline = true, 
  showMetrics = true,
  onClose 
}: TraceViewerProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch trace details
  const { data, isLoading, error } = useQuery({
    queryKey: ['trace', traceId],
    queryFn: async () => {
      const response = await fetch(`/api/tracing/${traceId}?includeEvents=true`);
      if (!response.ok) throw new Error('Failed to fetch trace');
      return response.json();
    },
    staleTime: 30000
  });

  const trace: TraceData = data?.trace;
  const events: TraceEvent[] = data?.events || [];

  const handleCopyTraceId = () => {
    navigator.clipboard.writeText(traceId);
    toast.success('Trace ID copied to clipboard');
  };

  const handleCopyPayload = () => {
    if (trace?.request_payload) {
      navigator.clipboard.writeText(JSON.stringify(trace.request_payload, null, 2));
      toast.success('Request payload copied to clipboard');
    }
  };

  const handleCopyResponse = () => {
    if (trace?.response_content) {
      navigator.clipboard.writeText(trace.response_content);
      toast.success('Response content copied to clipboard');
    }
  };

  const handleExportTrace = () => {
    if (trace) {
      const exportData = {
        trace,
        events,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trace-${traceId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Trace exported successfully');
    }
  };

  const getStatusIcon = (status: TraceData['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
      case 'streaming':
        return <Activity className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const getQualityGrade = (score?: number) => {
    if (!score) return '-';
    if (score >= 4.5) return 'A';
    if (score >= 3.5) return 'B';
    if (score >= 2.5) return 'C';
    if (score >= 1.5) return 'D';
    return 'F';
  };

  const getQualityColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-orange-600 bg-orange-100';
      case 'F': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatCost = (cost?: string) => {
    if (!cost) return '-';
    const value = parseFloat(cost);
    if (value < 0.01) return `<$0.01`;
    return `$${value.toFixed(4)}`;
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[300px] mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !trace) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Error Loading Trace</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || 'Trace not found'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const qualityGrade = getQualityGrade(trace.quality_score);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Trace Details</CardTitle>
              {getStatusIcon(trace.status)}
            </div>
            <CardDescription className="flex items-center gap-2">
              <span className="font-mono text-xs">{trace.trace_id}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={handleCopyTraceId}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportTrace}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            {showTimeline && <TabsTrigger value="timeline">Timeline</TabsTrigger>}
            {showMetrics && <TabsTrigger value="metrics">Metrics</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Status and Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={trace.status === 'success' ? 'default' : 'destructive'}>
                  {trace.status}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Model</p>
                <p className="text-sm font-medium">{trace.model_id}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Source</p>
                <Badge variant="outline">{trace.source}</Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Duration</p>
                <p className="text-sm font-medium">{formatDuration(trace.duration_ms)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-sm font-medium">{formatCost(trace.cost_calculation?.total_cost)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Quality Score</p>
                <div className="flex items-center gap-2">
                  <Badge className={cn('font-bold', getQualityColor(qualityGrade))}>
                    {qualityGrade}
                  </Badge>
                  {trace.quality_score && (
                    <span className="text-sm text-muted-foreground">
                      ({trace.quality_score.toFixed(1)}/5)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Token Usage */}
            {trace.tokens_used && (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Token Usage</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Input</span>
                        <span className="text-sm font-medium">{trace.tokens_used.input.toLocaleString()}</span>
                      </div>
                      <Progress value={(trace.tokens_used.input / trace.tokens_used.total) * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Output</span>
                        <span className="text-sm font-medium">{trace.tokens_used.output.toLocaleString()}</span>
                      </div>
                      <Progress value={(trace.tokens_used.output / trace.tokens_used.total) * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="text-sm font-medium">{trace.tokens_used.total.toLocaleString()}</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Error Information */}
            {trace.error_message && (
              <>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Error:</strong> {trace.error_message}
                    {trace.error_code && (
                      <span className="block mt-1 font-mono text-xs">
                        Code: {trace.error_code}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
                <Separator />
              </>
            )}

            {/* Timestamps */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Timestamps</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(new Date(trace.created_at), 'PPpp')}</span>
                </div>
                {trace.start_time && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span>{format(new Date(trace.start_time), 'PPpp')}</span>
                  </div>
                )}
                {trace.first_token_time && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">First Token</span>
                    <span>{format(new Date(trace.first_token_time), 'PPpp')}</span>
                  </div>
                )}
                {trace.end_time && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span>{format(new Date(trace.end_time), 'PPpp')}</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Request Payload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Request Payload</h3>
                <Button variant="ghost" size="sm" onClick={handleCopyPayload}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                <pre className="text-xs">
                  {JSON.stringify(trace.request_payload || {}, null, 2)}
                </pre>
              </ScrollArea>
            </div>

            {/* Response Content */}
            {trace.response_content && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Response Content</h3>
                  <Button variant="ghost" size="sm" onClick={handleCopyResponse}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  <pre className="text-xs whitespace-pre-wrap">
                    {trace.response_content}
                  </pre>
                </ScrollArea>
              </div>
            )}

            {/* Metadata */}
            {trace.metadata && Object.keys(trace.metadata).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Metadata</h3>
                <ScrollArea className="h-[150px] w-full rounded-md border p-4">
                  <pre className="text-xs">
                    {JSON.stringify(trace.metadata, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}

            {/* Related IDs */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Related IDs</h3>
              <div className="space-y-1 text-sm">
                {trace.session_id && (
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Session:</span>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {trace.session_id}
                    </code>
                  </div>
                )}
                {trace.parent_trace_id && (
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Parent Trace:</span>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {trace.parent_trace_id}
                    </code>
                  </div>
                )}
                {trace.prompt_id && (
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Prompt:</span>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {trace.prompt_id}
                    </code>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">User:</span>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {trace.user_id}
                  </code>
                </div>
              </div>
            </div>
          </TabsContent>

          {showTimeline && (
            <TabsContent value="timeline" className="space-y-4 mt-4">
              <h3 className="text-sm font-medium">Trace Events Timeline</h3>
              <ScrollArea className="h-[400px] w-full">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No events recorded for this trace
                  </p>
                ) : (
                  <div className="space-y-4">
                    {events.map((event, index) => (
                      <div key={event.event_id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            index === 0 ? "bg-primary" : "bg-muted-foreground"
                          )} />
                          {index < events.length - 1 && (
                            <div className="w-0.5 h-full bg-muted-foreground/20 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-8">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-xs">
                              {event.event_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(event.created_at), 'HH:mm:ss.SSS')}
                            </span>
                          </div>
                          {event.event_data && (
                            <div className="mt-2 p-2 bg-muted rounded-md">
                              <pre className="text-xs">
                                {JSON.stringify(event.event_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          )}

          {showMetrics && (
            <TabsContent value="metrics" className="space-y-4 mt-4">
              <h3 className="text-sm font-medium">Performance Metrics</h3>
              
              {/* Latency Breakdown */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Latency Breakdown</h4>
                <div className="space-y-2">
                  {trace.start_time && trace.first_token_time && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Time to First Token</span>
                      <span className="font-medium">
                        {formatDuration(
                          new Date(trace.first_token_time).getTime() - 
                          new Date(trace.start_time).getTime()
                        )}
                      </span>
                    </div>
                  )}
                  {trace.first_token_time && trace.end_time && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Generation Time</span>
                      <span className="font-medium">
                        {formatDuration(
                          new Date(trace.end_time).getTime() - 
                          new Date(trace.first_token_time).getTime()
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Duration</span>
                    <span className="font-medium">{formatDuration(trace.duration_ms)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Cost Breakdown */}
              {trace.cost_calculation && (
                <>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Cost Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Input Cost</span>
                        <span className="font-medium">{formatCost(trace.cost_calculation.input_cost)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Output Cost</span>
                        <span className="font-medium">{formatCost(trace.cost_calculation.output_cost)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>Total Cost</span>
                        <span>{formatCost(trace.cost_calculation.total_cost)}</span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Efficiency Metrics */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Efficiency Metrics</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Token Efficiency</p>
                          <p className="text-xs text-muted-foreground">Tokens per second</p>
                        </div>
                        <div className="text-2xl font-bold">
                          {trace.derivedMetrics?.tokenEfficiency?.toFixed(1) || '-'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Cost per Token</p>
                          <p className="text-xs text-muted-foreground">Average cost</p>
                        </div>
                        <div className="text-2xl font-bold">
                          {trace.tokens_used && trace.cost_calculation ? 
                            formatCost((parseFloat(trace.cost_calculation.total_cost) / trace.tokens_used.total).toString()) : 
                            '-'
                          }
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Performance Recommendations */}
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <strong>Performance Analysis:</strong>
                  {trace.derivedMetrics?.tokenEfficiency && trace.derivedMetrics.tokenEfficiency > 30 ? (
                    <span> Excellent token generation speed. </span>
                  ) : (
                    <span> Consider using a faster model for improved latency. </span>
                  )}
                  {trace.cost_calculation && parseFloat(trace.cost_calculation.total_cost) > 0.1 ? (
                    <span>High cost per request - consider using a more cost-effective model.</span>
                  ) : (
                    <span>Cost-efficient operation.</span>
                  )}
                </AlertDescription>
              </Alert>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}