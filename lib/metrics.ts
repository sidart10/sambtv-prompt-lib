/**
 * Prometheus Metrics Library for SambaTV AI Platform
 * Task 13: Comprehensive Monitoring & Alerts
 * Agent C Implementation
 * 
 * This library provides metrics collection for:
 * - AI token usage and costs (Agent B integration)
 * - Page performance metrics (Agent A integration)
 * - System health monitoring
 * - Tracing system metrics
 */

import { Registry, Counter, Histogram, Gauge, register } from 'prom-client';

// Create a custom registry for our metrics
export const metricsRegistry = new Registry();

// Default metrics (CPU, memory, etc.)
metricsRegistry.setDefaultLabels({
  app: 'sambatv-ai-platform',
  environment: process.env.NODE_ENV || 'development'
});

// ====================
// AI Usage Metrics (for Agent B's model integrations)
// ====================

export const aiTokensUsed = new Counter({
  name: 'ai_tokens_used',
  help: 'Total AI tokens consumed',
  labelNames: ['model', 'provider', 'operation'],
  registers: [metricsRegistry]
});

export const aiTokenCost = new Counter({
  name: 'ai_token_cost_total',
  help: 'Total cost of AI tokens in USD',
  labelNames: ['model', 'provider'],
  registers: [metricsRegistry]
});

export const aiModelRequestDuration = new Histogram({
  name: 'ai_model_request_duration_seconds',
  help: 'AI model request duration in seconds',
  labelNames: ['model', 'provider', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [metricsRegistry]
});

export const aiModelRequestFailures = new Counter({
  name: 'ai_model_request_failures_total',
  help: 'Total number of failed AI model requests',
  labelNames: ['model', 'provider', 'error_type'],
  registers: [metricsRegistry]
});

// ====================
// Frontend Performance Metrics (for Agent A's UI)
// ====================

export const pageLoadTime = new Histogram({
  name: 'page_load_duration_seconds',
  help: 'Page load time in seconds',
  labelNames: ['page', 'route'],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5],
  registers: [metricsRegistry]
});

export const frontendErrors = new Counter({
  name: 'frontend_errors_total',
  help: 'Total number of frontend errors',
  labelNames: ['page', 'error_type'],
  registers: [metricsRegistry]
});

export const userInteractions = new Counter({
  name: 'user_interactions_total',
  help: 'Total user interactions',
  labelNames: ['action', 'component'],
  registers: [metricsRegistry]
});

// ====================
// Tracing System Metrics (Task 15 support)
// ====================

export const activeTraces = new Gauge({
  name: 'active_traces_count',
  help: 'Number of active AI traces',
  labelNames: ['status'],
  registers: [metricsRegistry]
});

export const traceProcessingDuration = new Histogram({
  name: 'trace_processing_duration_seconds',
  help: 'Time to process traces',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [metricsRegistry]
});

export const evaluationScores = new Histogram({
  name: 'evaluation_scores',
  help: 'Distribution of evaluation scores',
  labelNames: ['evaluator', 'model'],
  buckets: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
  registers: [metricsRegistry]
});

// ====================
// HTTP Request Metrics
// ====================

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [metricsRegistry]
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegistry]
});

// ====================
// Database Metrics
// ====================

export const databaseConnectionsActive = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database'],
  registers: [metricsRegistry]
});

export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 5],
  registers: [metricsRegistry]
});

// ====================
// Cache Metrics
// ====================

export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [metricsRegistry]
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [metricsRegistry]
});

// ====================
// Rate Limiting Metrics
// ====================

export const rateLimitExceeded = new Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit violations',
  labelNames: ['endpoint', 'user_type'],
  registers: [metricsRegistry]
});

// ====================
// Helper Functions
// ====================

/**
 * Record AI token usage and cost
 */
export function recordAIUsage(
  model: string,
  provider: string,
  tokens: number,
  costPerToken: number,
  operation: string = 'inference'
) {
  aiTokensUsed.inc({ model, provider, operation }, tokens);
  aiTokenCost.inc({ model, provider }, tokens * costPerToken);
}

/**
 * Track HTTP request metrics
 */
export function trackHttpRequest(
  method: string,
  route: string,
  status: number,
  duration: number
) {
  httpRequestsTotal.inc({ method, route, status: status.toString() });
  httpRequestDuration.observe({ method, route, status: status.toString() }, duration);
}

/**
 * Track page performance
 */
export function trackPagePerformance(page: string, route: string, loadTime: number) {
  pageLoadTime.observe({ page, route }, loadTime);
}

/**
 * Track evaluation scores
 */
export function trackEvaluationScore(evaluator: string, model: string, score: number) {
  evaluationScores.observe({ evaluator, model }, score);
}

/**
 * Express middleware for automatic HTTP metrics
 */
export function metricsMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      trackHttpRequest(req.method, req.route?.path || req.path, res.statusCode, duration);
    });
    
    next();
  };
}

/**
 * Get metrics for Prometheus scraping
 */
export async function getMetrics(): Promise<string> {
  return metricsRegistry.metrics();
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics() {
  metricsRegistry.clear();
}