'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TraceDashboard } from '@/components/trace/TraceDashboard';
import { TraceViewer } from '@/components/trace/TraceViewer';
import { LiveTraceMonitor } from '@/components/trace/LiveTraceMonitor';
import { Activity, BarChart3, Monitor, AlertCircle, Lock } from 'lucide-react';
import { requireAuth } from '@/lib/auth-utils';

export default function TracesPage() {
  const { data: session, status } = useSession();
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  if (status === 'loading') {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[400px]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-[100px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You need to be signed in to view trace analytics. Please sign in with your SambaTV account.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleTraceSelect = (traceId: string) => {
    setSelectedTraceId(traceId);
  };

  const handleCloseViewer = () => {
    setSelectedTraceId(null);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">AI Trace Analytics</h1>
        <p className="text-muted-foreground">
          Monitor, analyze, and optimize your AI interactions with comprehensive tracing and performance insights.
        </p>
      </div>

      {/* Feature Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Analytics Dashboard</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Comprehensive overview of trace metrics, performance trends, and cost analysis.
            </CardDescription>
          </CardContent>
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs">Active</Badge>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <CardTitle className="text-base">Live Monitoring</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Real-time monitoring of active traces with WebSocket updates and health status.
            </CardDescription>
          </CardContent>
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs">Real-time</Badge>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-base">Detailed Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Deep dive into individual traces with timeline, metrics, and performance recommendations.
            </CardDescription>
          </CardContent>
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs">Advanced</Badge>
          </div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Monitor
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <TraceDashboard
            userId={session?.user?.id}
            limit={50}
            autoRefresh={true}
            onTraceSelect={handleTraceSelect}
          />
        </TabsContent>

        <TabsContent value="live" className="space-y-4">
          <LiveTraceMonitor
            maxTraces={20}
            autoConnect={true}
            showHealthStatus={true}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-6">
            {/* Quick Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Insights</CardTitle>
                <CardDescription>
                  AI-powered recommendations for optimizing your prompts and model usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Cost Optimization:</strong> Consider using Claude 3.5 Haiku for simpler tasks - 
                      it's 3x faster and 5x cheaper than Sonnet for basic operations.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <Activity className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Performance:</strong> Your average response time has improved by 23% 
                      this week. Streaming is working effectively for long-form content.
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <BarChart3 className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Usage Pattern:</strong> Peak usage is between 2-4 PM. Consider 
                      scheduling batch operations during off-peak hours for better performance.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            {/* Model Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model Performance Comparison</CardTitle>
                <CardDescription>
                  Compare performance across different AI models used in your traces
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">Claude 3.5 Sonnet</span>
                        <Badge className="bg-green-100 text-green-700">A</Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Avg Latency</span>
                          <span>1.2s</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Quality Score</span>
                          <span>4.7/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost per 1K tokens</span>
                          <span>$0.018</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">Claude 3.5 Haiku</span>
                        <Badge className="bg-blue-100 text-blue-700">B</Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Avg Latency</span>
                          <span>0.4s</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Quality Score</span>
                          <span>4.3/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost per 1K tokens</span>
                          <span>$0.004</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">Gemini 1.5 Flash</span>
                        <Badge className="bg-yellow-100 text-yellow-700">B</Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Avg Latency</span>
                          <span>0.8s</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Quality Score</span>
                          <span>4.1/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost per 1K tokens</span>
                          <span>$0.002</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Trace Viewer Dialog */}
      <Dialog open={!!selectedTraceId} onOpenChange={(open) => !open && handleCloseViewer()}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Trace Analysis</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            {selectedTraceId && (
              <TraceViewer
                traceId={selectedTraceId}
                showTimeline={true}
                showMetrics={true}
                onClose={handleCloseViewer}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}