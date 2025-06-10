// Task 15: Live Traces API Endpoint
// Real-time monitoring of active traces

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { TraceService } from '@/lib/tracing/service';
import { TraceManager } from '@/lib/tracing/context';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get live traces from database
    const liveData = await TraceService.getLiveTraces();
    
    // Get in-memory statistics
    const memoryStats = {
      activeTraces: TraceManager.getActiveTracesCount(),
      activeSpans: TraceManager.getActiveSpansCount(),
      memoryTraces: TraceManager.getAllActiveTraces().map(trace => ({
        traceId: trace.traceId,
        userId: trace.userId,
        model: trace.metadata.model,
        source: trace.metadata.source,
        startTime: trace.startTime,
        age: Date.now() - trace.startTime
      }))
    };

    // Calculate system health status
    const healthStatus = {
      status: 'healthy',
      activeTraces: liveData.active,
      avgLatency: Math.round(liveData.avgLatency),
      errorRate: Math.round(liveData.errorRate * 100) / 100,
      timestamp: new Date().toISOString()
    };

    // Determine system status
    if (liveData.errorRate > 10) {
      healthStatus.status = 'degraded';
    } else if (liveData.errorRate > 25) {
      healthStatus.status = 'critical';
    }

    if (liveData.avgLatency > 5000) {
      healthStatus.status = 'degraded';
    } else if (liveData.avgLatency > 10000) {
      healthStatus.status = 'critical';
    }

    // Get recent trace activity (last 5 minutes)
    const recentActivity = liveData.traces.map(trace => ({
      traceId: trace.trace_id,
      model: trace.model_id,
      source: trace.source,
      status: trace.status,
      startTime: trace.start_time,
      duration: trace.duration_ms,
      age: Date.now() - new Date(trace.start_time!).getTime(),
      streaming: trace.streaming_enabled
    }));

    // Calculate throughput (traces per minute in last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentTraces = liveData.traces.filter(trace => 
      new Date(trace.start_time!).getTime() > fiveMinutesAgo
    );
    const throughput = (recentTraces.length / 5) * 60; // per hour

    return Response.json({
      success: true,
      health: healthStatus,
      live: {
        active: liveData.active,
        avgLatency: liveData.avgLatency,
        errorRate: liveData.errorRate,
        throughput: Math.round(throughput)
      },
      memory: memoryStats,
      activity: recentActivity,
      metrics: {
        totalActiveTraces: liveData.active + memoryStats.activeTraces,
        dbActiveTraces: liveData.active,
        memoryActiveTraces: memoryStats.activeTraces,
        recentTraces: recentTraces.length,
        avgResponseTime: liveData.avgLatency,
        systemLoad: healthStatus.status
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Get live traces error:', error);
    
    return Response.json(
      { 
        error: 'Failed to get live traces',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-cache'
    },
  });
}