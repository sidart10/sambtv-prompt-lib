// Task 15: Trace Context Management System
// Core tracing functionality for comprehensive AI interaction tracking

import { v4 as uuidv4 } from 'uuid';

export interface TraceContext {
  traceId: string;
  parentTraceId?: string;
  sessionId: string;
  userId: string;
  startTime: number;
  metadata: {
    source: 'playground' | 'api' | 'test';
    promptId?: string;
    model: string;
    version: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

export interface TraceSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  tags: Record<string, any>;
  logs: TraceLog[];
  status: 'pending' | 'success' | 'error';
}

export interface TraceLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: Record<string, any>;
}

export interface TraceResult {
  status: 'success' | 'error' | 'cancelled';
  response?: string;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  costCalculation?: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
  performanceMetrics?: {
    durationMs: number;
    firstTokenLatencyMs?: number;
    tokensPerSecond?: number;
  };
  qualityMetrics?: {
    score?: number;
    userRating?: number;
  };
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

// Active trace storage
const activeTraces = new Map<string, TraceContext>();
const activeSpans = new Map<string, TraceSpan>();

export class TraceManager {
  /**
   * Create a new trace context
   */
  static createTrace(context: Partial<TraceContext>): TraceContext {
    const traceId = uuidv4();
    const sessionId = context.sessionId || uuidv4();
    
    const trace: TraceContext = {
      traceId,
      parentTraceId: context.parentTraceId,
      sessionId,
      userId: context.userId || '',
      startTime: Date.now(),
      metadata: {
        source: context.metadata?.source || 'api',
        promptId: context.metadata?.promptId,
        model: context.metadata?.model || 'unknown',
        version: context.metadata?.version || '1.0',
        userAgent: context.metadata?.userAgent,
        ipAddress: context.metadata?.ipAddress,
        ...context.metadata
      }
    };

    activeTraces.set(traceId, trace);
    return trace;
  }

  /**
   * Get active trace by ID
   */
  static getActiveTrace(traceId: string): TraceContext | null {
    return activeTraces.get(traceId) || null;
  }

  /**
   * Update trace metadata
   */
  static updateTrace(traceId: string, updates: Partial<TraceContext>): void {
    const trace = activeTraces.get(traceId);
    if (trace) {
      const updated = {
        ...trace,
        ...updates,
        metadata: {
          ...trace.metadata,
          ...updates.metadata
        }
      };
      activeTraces.set(traceId, updated);
    }
  }

  /**
   * Complete and finalize a trace
   */
  static completeTrace(traceId: string, result: TraceResult): void {
    const trace = activeTraces.get(traceId);
    if (trace) {
      // Store final result in metadata
      trace.metadata = {
        ...trace.metadata,
        result,
        endTime: Date.now(),
        duration: Date.now() - trace.startTime
      };
      
      // Remove from active traces after a delay to allow for final operations
      setTimeout(() => {
        activeTraces.delete(traceId);
      }, 60000); // Keep for 1 minute after completion
    }
  }

  /**
   * Create a span within a trace
   */
  static createSpan(
    traceId: string, 
    operationName: string, 
    parentSpanId?: string
  ): TraceSpan {
    const spanId = uuidv4();
    const span: TraceSpan = {
      spanId,
      traceId,
      parentSpanId,
      operationName,
      startTime: Date.now(),
      tags: {},
      logs: [],
      status: 'pending'
    };

    activeSpans.set(spanId, span);
    return span;
  }

  /**
   * Finish a span
   */
  static finishSpan(
    spanId: string, 
    status: 'success' | 'error' = 'success',
    tags?: Record<string, any>
  ): void {
    const span = activeSpans.get(spanId);
    if (span) {
      span.endTime = Date.now();
      span.status = status;
      if (tags) {
        span.tags = { ...span.tags, ...tags };
      }
      
      // Remove from active spans
      setTimeout(() => {
        activeSpans.delete(spanId);
      }, 30000); // Keep for 30 seconds
    }
  }

  /**
   * Add log to span
   */
  static addSpanLog(
    spanId: string, 
    level: TraceLog['level'], 
    message: string, 
    data?: Record<string, any>
  ): void {
    const span = activeSpans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        level,
        message,
        data
      });
    }
  }

  /**
   * Set span tags
   */
  static setSpanTags(spanId: string, tags: Record<string, any>): void {
    const span = activeSpans.get(spanId);
    if (span) {
      span.tags = { ...span.tags, ...tags };
    }
  }

  /**
   * Get current active traces count
   */
  static getActiveTracesCount(): number {
    return activeTraces.size;
  }

  /**
   * Get current active spans count
   */
  static getActiveSpansCount(): number {
    return activeSpans.size;
  }

  /**
   * Get all active traces (for monitoring)
   */
  static getAllActiveTraces(): TraceContext[] {
    return Array.from(activeTraces.values());
  }

  /**
   * Get all active spans (for monitoring)
   */
  static getAllActiveSpans(): TraceSpan[] {
    return Array.from(activeSpans.values());
  }

  /**
   * Clean up old traces and spans
   */
  static cleanup(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    // Clean up old traces
    for (const [traceId, trace] of activeTraces.entries()) {
      if (now - trace.startTime > maxAge) {
        activeTraces.delete(traceId);
      }
    }

    // Clean up old spans
    for (const [spanId, span] of activeSpans.entries()) {
      if (now - span.startTime > maxAge) {
        activeSpans.delete(spanId);
      }
    }
  }

  /**
   * Generate trace ID that can be used for correlation
   */
  static generateTraceId(): string {
    return uuidv4();
  }

  /**
   * Generate span ID that can be used for correlation
   */
  static generateSpanId(): string {
    return uuidv4();
  }

  /**
   * Extract trace context from headers (for API requests)
   */
  static extractTraceFromHeaders(headers: Headers): TraceContext | null {
    const traceId = headers.get('x-trace-id');
    const parentTraceId = headers.get('x-parent-trace-id');
    const sessionId = headers.get('x-session-id');
    
    if (traceId) {
      return this.getActiveTrace(traceId) || {
        traceId,
        parentTraceId: parentTraceId || undefined,
        sessionId: sessionId || uuidv4(),
        userId: '',
        startTime: Date.now(),
        metadata: {
          source: 'api',
          model: 'unknown',
          version: '1.0'
        }
      };
    }

    return null;
  }

  /**
   * Inject trace context into headers (for API responses)
   */
  static injectTraceIntoHeaders(trace: TraceContext): Record<string, string> {
    const headers: Record<string, string> = {
      'x-trace-id': trace.traceId,
      'x-session-id': trace.sessionId
    };

    if (trace.parentTraceId) {
      headers['x-parent-trace-id'] = trace.parentTraceId;
    }

    return headers;
  }
}

// Utility functions for trace correlation
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
}

export function formatTraceId(traceId: string): string {
  return traceId.substring(0, 8);
}

export function isValidTraceId(traceId: string): boolean {
  return /^[a-f0-9-]{36}$/.test(traceId);
}

// Cleanup interval - run every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    TraceManager.cleanup();
  }, 5 * 60 * 1000);
}