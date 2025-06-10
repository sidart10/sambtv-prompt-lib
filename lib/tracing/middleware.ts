// Task 15: Tracing Middleware
// Automatic trace integration for API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { TraceService } from './service';
import { TraceManager, TraceContext } from './context';

export interface TracingOptions {
  enabled?: boolean;
  source?: 'playground' | 'api' | 'test';
  autoTrace?: boolean;
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  trackCost?: boolean;
  trackPerformance?: boolean;
}

const defaultOptions: TracingOptions = {
  enabled: true,
  source: 'api',
  autoTrace: true,
  includeRequestBody: true,
  includeResponseBody: false,
  trackCost: true,
  trackPerformance: true
};

/**
 * Middleware wrapper for automatic tracing
 */
export function withTracing<T extends any[], R>(
  handler: (request: NextRequest, ...args: T) => Promise<Response | NextResponse>,
  options: TracingOptions = {}
) {
  const config = { ...defaultOptions, ...options };

  return async (request: NextRequest, ...args: T): Promise<Response | NextResponse> => {
    if (!config.enabled) {
      return handler(request, ...args);
    }

    const startTime = Date.now();
    let trace: TraceContext | null = null;
    let hasError = false;

    try {
      // Get session for user ID
      const session = await auth();
      if (!session?.user?.id) {
        // No authentication - proceed without tracing for public endpoints
        return handler(request, ...args);
      }

      // Extract trace ID from headers if provided
      const existingTraceId = request.headers.get('x-trace-id');
      if (existingTraceId) {
        trace = TraceManager.getActiveTrace(existingTraceId);
      }

      // Create new trace if auto-tracing is enabled and no existing trace
      if (config.autoTrace && !trace) {
        const userAgent = request.headers.get('user-agent') || undefined;
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIP = request.headers.get('x-real-ip');
        const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIP || undefined;

        // Extract request data for tracing
        let requestData: any = {};
        if (config.includeRequestBody && request.body) {
          try {
            // Clone request to avoid consuming the body
            const clonedRequest = request.clone();
            requestData = await clonedRequest.json();
          } catch (error) {
            // Ignore JSON parsing errors for non-JSON requests
          }
        }

        trace = await TraceService.startTrace({
          userId: session.user.id,
          source: config.source!,
          model: requestData.model || 'unknown',
          prompt: requestData.prompt || request.url,
          systemPrompt: requestData.systemPrompt,
          parameters: requestData.parameters || {},
          userAgent,
          ipAddress
        });

        // Add request start event
        await TraceService.addTraceEvent(trace.traceId, 'start', {
          action: 'api_request_start',
          method: request.method,
          url: request.url,
          user_agent: userAgent,
          request_size: request.headers.get('content-length') || 0
        });
      }

      // Execute the original handler
      const response = await handler(request, ...args);
      
      // Track response if tracing is active
      if (trace) {
        const duration = Date.now() - startTime;
        const status = response.status;
        const isSuccess = status >= 200 && status < 400;

        // Extract response data if configured
        let responseData: any = {};
        if (config.includeResponseBody && response.body) {
          try {
            // Clone response to avoid consuming the body
            const clonedResponse = response.clone();
            responseData = await clonedResponse.json();
          } catch (error) {
            // Ignore errors for non-JSON responses
          }
        }

        // Update trace with results
        await TraceService.updateTrace(trace.traceId, {
          status: isSuccess ? 'success' : 'error',
          error_message: !isSuccess ? `HTTP ${status}` : undefined,
          error_code: !isSuccess ? `HTTP_${status}` : undefined,
          response_content: responseData.content || responseData.output,
          duration_ms: duration
        });

        // Add completion event
        await TraceService.addTraceEvent(trace.traceId, 'complete', {
          action: 'api_request_complete',
          status_code: status,
          success: isSuccess,
          duration_ms: duration,
          response_size: response.headers.get('content-length') || 0
        });

        // Complete trace
        await TraceService.completeTrace(trace.traceId, {
          status: isSuccess ? 'success' : 'error',
          response: responseData.content || responseData.output || `HTTP ${status}`,
          performanceMetrics: {
            durationMs: duration
          },
          error: !isSuccess ? {
            message: `HTTP ${status}`,
            code: `HTTP_${status}`
          } : undefined
        });

        // Add trace ID to response headers
        response.headers.set('X-Trace-ID', trace.traceId);
      }

      return response;

    } catch (error) {
      hasError = true;
      console.error('[Tracing Middleware] Error:', error);

      // Update trace with error if available
      if (trace) {
        const duration = Date.now() - startTime;
        
        await TraceService.updateTrace(trace.traceId, {
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_code: 'MIDDLEWARE_ERROR',
          duration_ms: duration
        });

        await TraceService.addTraceEvent(trace.traceId, 'error', {
          action: 'api_request_error',
          error_type: 'middleware_exception',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          stack_trace: error instanceof Error ? error.stack : undefined
        });

        await TraceService.completeTrace(trace.traceId, {
          status: 'error',
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'MIDDLEWARE_ERROR'
          },
          performanceMetrics: {
            durationMs: Date.now() - startTime
          }
        });
      }

      // Re-throw the error
      throw error;
    }
  };
}

/**
 * Middleware for streaming endpoints with trace correlation
 */
export function withStreamingTrace(
  handler: (request: NextRequest, traceId?: string) => Promise<Response>,
  options: TracingOptions = {}
) {
  const config = { ...defaultOptions, ...options };

  return async (request: NextRequest): Promise<Response> => {
    if (!config.enabled) {
      return handler(request);
    }

    try {
      // Get session for user ID
      const session = await auth();
      if (!session?.user?.id) {
        return handler(request);
      }

      // Extract or create trace ID
      let traceId = request.headers.get('x-trace-id');
      
      if (!traceId && config.autoTrace) {
        // Create new trace for streaming
        const userAgent = request.headers.get('user-agent') || undefined;
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIP = request.headers.get('x-real-ip');
        const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIP || undefined;

        const trace = await TraceService.startTrace({
          userId: session.user.id,
          source: config.source!,
          model: 'streaming',
          prompt: 'streaming request',
          userAgent,
          ipAddress
        });

        traceId = trace.traceId;
      }

      // Execute handler with trace ID
      const response = await handler(request, traceId || undefined);

      // Add trace ID to response headers if available
      if (traceId) {
        response.headers.set('X-Trace-ID', traceId);
      }

      return response;

    } catch (error) {
      console.error('[Streaming Trace Middleware] Error:', error);
      throw error;
    }
  };
}

/**
 * Extract trace context from request headers
 */
export function extractTraceContext(request: NextRequest): TraceContext | null {
  const traceId = request.headers.get('x-trace-id');
  const parentTraceId = request.headers.get('x-parent-trace-id');
  const sessionId = request.headers.get('x-session-id');

  if (!traceId) {
    return null;
  }

  return TraceManager.getActiveTrace(traceId) || {
    traceId,
    parentTraceId: parentTraceId || undefined,
    sessionId: sessionId || traceId,
    userId: '',
    startTime: Date.now(),
    metadata: {
      source: 'api',
      model: 'unknown',
      version: '1.0'
    }
  };
}

/**
 * Inject trace context into response headers
 */
export function injectTraceHeaders(
  response: Response | NextResponse,
  trace: TraceContext
): Response | NextResponse {
  response.headers.set('X-Trace-ID', trace.traceId);
  response.headers.set('X-Session-ID', trace.sessionId);
  
  if (trace.parentTraceId) {
    response.headers.set('X-Parent-Trace-ID', trace.parentTraceId);
  }

  return response;
}

/**
 * Create span for specific operations within a trace
 */
export async function withSpan<T>(
  traceId: string,
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const span = TraceManager.createSpan(traceId, operationName);
  const startTime = Date.now();

  try {
    TraceManager.addSpanLog(span.spanId, 'info', `Starting ${operationName}`);
    
    const result = await operation();
    
    const duration = Date.now() - startTime;
    TraceManager.setSpanTags(span.spanId, {
      'operation.duration_ms': duration,
      'operation.success': true
    });
    
    TraceManager.addSpanLog(span.spanId, 'info', `Completed ${operationName}`, {
      duration_ms: duration
    });
    
    TraceManager.finishSpan(span.spanId, 'success');
    
    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    
    TraceManager.setSpanTags(span.spanId, {
      'operation.duration_ms': duration,
      'operation.success': false,
      'error.message': error instanceof Error ? error.message : 'Unknown error'
    });
    
    TraceManager.addSpanLog(span.spanId, 'error', `Failed ${operationName}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: duration
    });
    
    TraceManager.finishSpan(span.spanId, 'error');
    
    throw error;
  }
}

/**
 * Trace decorator for class methods
 */
export function traced(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const opName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      // Try to find active trace context
      const activeTraces = TraceManager.getAllActiveTraces();
      const currentTrace = activeTraces[0]; // Use first active trace

      if (currentTrace) {
        return withSpan(currentTrace.traceId, opName, () => originalMethod.apply(this, args));
      } else {
        // No active trace, execute normally
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Performance monitoring utilities
 */
export class TracePerformance {
  private static measurements = new Map<string, number>();

  static startMeasurement(key: string): void {
    this.measurements.set(key, performance.now());
  }

  static endMeasurement(key: string): number {
    const start = this.measurements.get(key);
    if (!start) return 0;

    const duration = performance.now() - start;
    this.measurements.delete(key);
    return duration;
  }

  static async measureAsync<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    this.startMeasurement(key);
    try {
      const result = await operation();
      const duration = this.endMeasurement(key);
      return { result, duration };
    } catch (error) {
      this.endMeasurement(key);
      throw error;
    }
  }
}