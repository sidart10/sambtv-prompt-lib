'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Activity, AlertCircle, Zap, Wifi, WifiOff, Play, Pause,
  TrendingUp, TrendingDown, Minus, BarChart3, Clock, 
  CheckCircle, XCircle, RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LiveTraceMonitorProps {
  websocketUrl?: string;
  maxTraces?: number;
  autoConnect?: boolean;
  showHealthStatus?: boolean;
}

interface LiveTrace {
  traceId: string;
  model: string;
  source: string;
  status: 'pending' | 'streaming' | 'success' | 'error' | 'cancelled';
  startTime: string;
  duration?: number;
  age: number;
  streaming?: boolean;
}

interface LiveMetrics {
  active: number;
  avgLatency: number;
  errorRate: number;
  throughput: number;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  activeTraces: number;
  avgLatency: number;
  errorRate: number;
  timestamp: string;
}

interface WebSocketMessage {
  type: 'trace_start' | 'trace_update' | 'trace_complete' | 'metrics_update' | 'health_update';
  data: any;
  timestamp: string;
}

export function LiveTraceMonitor({ 
  websocketUrl = 'ws://localhost:3000/traces/live',
  maxTraces = 20,
  autoConnect = true,
  showHealthStatus = true
}: LiveTraceMonitorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setPaused] = useState(false);
  const [liveTraces, setLiveTraces] = useState<LiveTrace[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Fetch initial live data
  const { data: liveData, refetch: refetchLive } = useQuery({
    queryKey: ['traces-live-monitor'],
    queryFn: async () => {
      const response = await fetch('/api/tracing/live');
      if (!response.ok) throw new Error('Failed to fetch live data');
      return response.json();
    },
    refetchInterval: isPaused ? 0 : 5000,
    staleTime: 3000
  });

  const metrics: LiveMetrics = liveData?.live || {
    active: 0,
    avgLatency: 0,
    errorRate: 0,
    throughput: 0
  };

  const health: HealthStatus = liveData?.health || {
    status: 'healthy',
    activeTraces: 0,
    avgLatency: 0,
    errorRate: 0,
    timestamp: new Date().toISOString()
  };

  const activity: LiveTrace[] = liveData?.activity || [];

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(websocketUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        console.log('[LiveTraceMonitor] WebSocket connected');
      };

      ws.onmessage = (event) => {
        if (isPaused) return;

        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('[LiveTraceMonitor] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[LiveTraceMonitor] WebSocket error:', error);
        setConnectionError('Connection error occurred');
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[LiveTraceMonitor] Attempting to reconnect (attempt ${reconnectAttemptsRef.current})...`);
            connectWebSocket();
          }, delay);
        } else {
          setConnectionError('Unable to establish connection after multiple attempts');
        }
      };
    } catch (error) {
      console.error('[LiveTraceMonitor] Failed to create WebSocket:', error);
      setConnectionError('Failed to connect to live monitoring');
    }
  }, [websocketUrl, isPaused]);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'trace_start':
        const newTrace: LiveTrace = {
          traceId: message.data.traceId,
          model: message.data.model,
          source: message.data.source,
          status: 'pending',
          startTime: message.data.startTime,
          age: 0,
          streaming: message.data.streaming
        };
        
        setLiveTraces(prev => {
          const updated = [newTrace, ...prev].slice(0, maxTraces);
          return updated;
        });
        break;

      case 'trace_update':
        setLiveTraces(prev => 
          prev.map(trace => 
            trace.traceId === message.data.traceId
              ? { ...trace, ...message.data }
              : trace
          )
        );
        break;

      case 'trace_complete':
        setLiveTraces(prev => 
          prev.map(trace => 
            trace.traceId === message.data.traceId
              ? { ...trace, status: message.data.status, duration: message.data.duration }
              : trace
          )
        );
        
        // Remove completed traces after 10 seconds
        setTimeout(() => {
          setLiveTraces(prev => prev.filter(t => t.traceId !== message.data.traceId));
        }, 10000);
        break;

      case 'metrics_update':
      case 'health_update':
        // These would trigger a refetch of the live data
        refetchLive();
        break;
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    if (autoConnect) {
      connectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [autoConnect, connectWebSocket, disconnectWebSocket]);

  // Update trace ages
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTraces(prev => 
        prev.map(trace => ({
          ...trace,
          age: Date.now() - new Date(trace.startTime).getTime()
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Merge WebSocket traces with API activity
  const allTraces = React.useMemo(() => {
    const wsTraceIds = new Set(liveTraces.map(t => t.traceId));
    const apiTraces = activity
      .filter(t => !wsTraceIds.has(t.traceId))
      .slice(0, maxTraces - liveTraces.length);
    
    return [...liveTraces, ...apiTraces];
  }, [liveTraces, activity, maxTraces]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'streaming':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthBadge = (status: string) => {
    const variants = {
      healthy: { color: 'success', icon: CheckCircle },
      degraded: { color: 'warning', icon: AlertCircle },
      critical: { color: 'destructive', icon: XCircle }
    };

    const variant = variants[status as keyof typeof variants] || variants.healthy;
    const Icon = variant.icon;

    return (
      <Badge variant={variant.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const handleToggleConnection = () => {
    if (isConnected) {
      disconnectWebSocket();
      toast.info('Disconnected from live monitoring');
    } else {
      connectWebSocket();
      toast.info('Connecting to live monitoring...');
    }
  };

  const handleTogglePause = () => {
    setPaused(!isPaused);
    toast.info(isPaused ? 'Live updates resumed' : 'Live updates paused');
  };

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Live Trace Monitor
                {isConnected ? (
                  <Badge variant="outline" className="text-xs">
                    <Wifi className="h-3 w-3 mr-1 text-green-500" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <WifiOff className="h-3 w-3 mr-1 text-red-500" />
                    Disconnected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Real-time monitoring of AI interactions
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-connect"
                  checked={isConnected}
                  onCheckedChange={handleToggleConnection}
                />
                <Label htmlFor="auto-connect" className="text-sm">
                  Live Stream
                </Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePause}
                disabled={!isConnected}
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Connection Error Alert */}
      {connectionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{connectionError}</AlertDescription>
        </Alert>
      )}

      {/* Health Status and Metrics */}
      {showHealthStatus && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">System Health</p>
                  <p className="text-xs text-muted-foreground">Overall status</p>
                </div>
                {getHealthBadge(health.status)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Active Traces</p>
                  <p className="text-xs text-muted-foreground">Currently processing</p>
                </div>
                <div className="text-2xl font-bold">{metrics.active}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Avg Latency</p>
                  <p className="text-xs text-muted-foreground">Response time</p>
                </div>
                <div className="text-2xl font-bold">{formatDuration(metrics.avgLatency)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Throughput</p>
                  <p className="text-xs text-muted-foreground">Traces per hour</p>
                </div>
                <div className="text-2xl font-bold">{metrics.throughput}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Live Traces List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Active Traces</CardTitle>
            <CardDescription>
              {allTraces.length} trace{allTraces.length !== 1 ? 's' : ''} active
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {allTraces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No active traces at the moment
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {allTraces.map((trace) => (
                  <div
                    key={trace.traceId}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      trace.status === 'error' && "border-red-200 bg-red-50",
                      trace.status === 'pending' && "border-blue-200 bg-blue-50",
                      trace.status === 'streaming' && "border-yellow-200 bg-yellow-50",
                      trace.status === 'success' && "border-green-200 bg-green-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(trace.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {trace.traceId.slice(0, 8)}...
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {trace.model}
                          </Badge>
                          {trace.streaming && (
                            <Badge variant="secondary" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              Streaming
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{trace.source}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(trace.startTime), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {trace.duration ? (
                        <span className="text-sm font-medium">{formatDuration(trace.duration)}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {formatDuration(trace.age)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}