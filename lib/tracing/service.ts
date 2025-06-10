// Task 15: Trace Service - Database operations and business logic
// Core service for managing AI interaction traces

import { supabase } from '@/utils/supabase/client';
import { TraceContext, TraceResult, TraceManager } from './context';
import { calculateModelCost } from '@/lib/ai-cost-utils';
import { aiClient } from '@/lib/ai';

export interface TraceData {
  id?: string;
  trace_id: string;
  parent_trace_id?: string;
  session_id: string;
  user_id: string;
  source: 'playground' | 'api' | 'test';
  prompt_id?: string;
  model_id: string;
  prompt_content: string;
  system_prompt?: string;
  parameters: Record<string, any>;
  response_content?: string;
  tokens_used?: {
    input: number;
    output: number;
    total: number;
  };
  cost_calculation?: {
    input_cost: number;
    output_cost: number;
    total_cost: number;
  };
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  first_token_latency_ms?: number;
  streaming_enabled: boolean;
  tokens_per_second?: number;
  status: 'pending' | 'streaming' | 'success' | 'error' | 'cancelled';
  error_message?: string;
  error_code?: string;
  langfuse_trace_id?: string;
  langfuse_observation_id?: string;
  quality_score?: number;
  user_rating?: number;
  user_agent?: string;
  ip_address?: string;
  trace_version: string;
  created_at?: string;
  updated_at?: string;
}

export interface TraceFilters {
  userId?: string;
  limit?: number;
  offset?: number;
  model?: string;
  status?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  sessionId?: string;
  promptId?: string;
  minDuration?: number;
  maxDuration?: number;
  minCost?: number;
  maxCost?: number;
  hasError?: boolean;
  streaming?: boolean;
}

export interface TraceMetrics {
  totalTraces: number;
  successfulTraces: number;
  errorTraces: number;
  averageDuration: number;
  averageLatency: number;
  totalCost: number;
  averageTokensPerSecond: number;
  errorRate: number;
  streamingRate: number;
}

export interface TraceEvent {
  id?: string;
  trace_id: string;
  event_type: 'start' | 'token' | 'structured' | 'error' | 'complete' | 'user_action';
  event_data: Record<string, any>;
  timestamp: string;
  sequence_number: number;
}

export class TraceService {
  /**
   * Start a new trace and store in database
   */
  static async startTrace(context: {
    userId: string;
    source: 'playground' | 'api' | 'test';
    promptId?: string;
    model: string;
    prompt: string;
    systemPrompt?: string;
    parameters?: Record<string, any>;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<TraceContext> {
    const trace = TraceManager.createTrace({
      userId: context.userId,
      sessionId: context.sessionId,
      metadata: {
        source: context.source,
        promptId: context.promptId,
        model: context.model,
        version: '1.0',
        userAgent: context.userAgent,
        ipAddress: context.ipAddress
      }
    });

    // Store in database
    const traceData: Partial<TraceData> = {
      trace_id: trace.traceId,
      parent_trace_id: trace.parentTraceId,
      session_id: trace.sessionId,
      user_id: context.userId,
      source: context.source,
      prompt_id: context.promptId,
      model_id: context.model,
      prompt_content: context.prompt,
      system_prompt: context.systemPrompt,
      parameters: context.parameters || {},
      start_time: new Date(trace.startTime).toISOString(),
      streaming_enabled: false,
      status: 'pending',
      user_agent: context.userAgent,
      ip_address: context.ipAddress,
      trace_version: '1.0'
    };

    const { data, error } = await supabase
      .from('ai_interaction_traces')
      .insert(traceData)
      .select()
      .single();

    if (error) {
      console.error('[TraceService] Failed to create trace:', error);
      throw new Error(`Failed to create trace: ${error.message}`);
    }

    // Add start event
    await this.addTraceEvent(trace.traceId, 'start', {
      model: context.model,
      prompt_length: context.prompt.length,
      has_system_prompt: !!context.systemPrompt,
      parameters: context.parameters
    });

    return trace;
  }

  /**
   * Update trace with new information
   */
  static async updateTrace(
    traceId: string, 
    updates: Partial<TraceData>
  ): Promise<void> {
    // Update in-memory trace
    TraceManager.updateTrace(traceId, updates as any);

    // Update in database
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('ai_interaction_traces')
      .update(updateData)
      .eq('trace_id', traceId);

    if (error) {
      console.error('[TraceService] Failed to update trace:', error);
      throw new Error(`Failed to update trace: ${error.message}`);
    }
  }

  /**
   * Complete a trace with final results
   */
  static async completeTrace(
    traceId: string, 
    result: TraceResult & {
      response?: string;
      langfuseTraceId?: string;
      langfuseObservationId?: string;
      streamingEnabled?: boolean;
    }
  ): Promise<void> {
    const endTime = new Date().toISOString();
    const trace = TraceManager.getActiveTrace(traceId);
    const durationMs = trace ? Date.now() - trace.startTime : undefined;

    // Calculate tokens per second if we have the data
    let tokensPerSecond: number | undefined;
    if (result.tokensUsed?.total && durationMs) {
      tokensPerSecond = (result.tokensUsed.total / durationMs) * 1000;
    }

    const updateData: Partial<TraceData> = {
      end_time: endTime,
      duration_ms: durationMs,
      status: result.status,
      response_content: result.response,
      tokens_used: result.tokensUsed,
      cost_calculation: result.costCalculation,
      first_token_latency_ms: result.performanceMetrics?.firstTokenLatencyMs,
      tokens_per_second: tokensPerSecond,
      quality_score: result.qualityMetrics?.score,
      user_rating: result.qualityMetrics?.userRating,
      error_message: result.error?.message,
      error_code: result.error?.code,
      langfuse_trace_id: result.langfuseTraceId,
      langfuse_observation_id: result.langfuseObservationId,
      streaming_enabled: result.streamingEnabled || false
    };

    await this.updateTrace(traceId, updateData);

    // Add completion event
    await this.addTraceEvent(traceId, 'complete', {
      status: result.status,
      duration_ms: durationMs,
      tokens_used: result.tokensUsed,
      cost: result.costCalculation,
      error: result.error
    });

    // Complete in-memory trace
    TraceManager.completeTrace(traceId, result);
  }

  /**
   * Add an event to a trace
   */
  static async addTraceEvent(
    traceId: string,
    eventType: TraceEvent['event_type'],
    eventData: Record<string, any>,
    sequenceNumber?: number
  ): Promise<void> {
    // Get next sequence number if not provided
    if (sequenceNumber === undefined) {
      const { data, error } = await supabase
        .from('trace_events')
        .select('sequence_number')
        .eq('trace_id', traceId)
        .order('sequence_number', { ascending: false })
        .limit(1);

      sequenceNumber = (data?.[0]?.sequence_number || 0) + 1;
    }

    const event: Partial<TraceEvent> = {
      trace_id: traceId,
      event_type: eventType,
      event_data: eventData,
      timestamp: new Date().toISOString(),
      sequence_number: sequenceNumber
    };

    const { error } = await supabase
      .from('trace_events')
      .insert(event);

    if (error) {
      console.error('[TraceService] Failed to add trace event:', error);
      // Don't throw here as events are not critical
    }
  }

  /**
   * Get a single trace by ID
   */
  static async getTrace(traceId: string): Promise<TraceData | null> {
    const { data, error } = await supabase
      .from('ai_interaction_traces')
      .select('*')
      .eq('trace_id', traceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('[TraceService] Failed to get trace:', error);
      throw new Error(`Failed to get trace: ${error.message}`);
    }

    return data;
  }

  /**
   * Get traces with filtering and pagination
   */
  static async getTraces(filters: TraceFilters = {}): Promise<{
    traces: TraceData[];
    totalCount: number;
    hasMore: boolean;
  }> {
    let query = supabase
      .from('ai_interaction_traces')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.model) {
      query = query.eq('model_id', filters.model);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.source) {
      query = query.eq('source', filters.source);
    }
    if (filters.sessionId) {
      query = query.eq('session_id', filters.sessionId);
    }
    if (filters.promptId) {
      query = query.eq('prompt_id', filters.promptId);
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters.minDuration) {
      query = query.gte('duration_ms', filters.minDuration);
    }
    if (filters.maxDuration) {
      query = query.lte('duration_ms', filters.maxDuration);
    }
    if (filters.minCost) {
      query = query.gte('cost_calculation->total_cost', filters.minCost);
    }
    if (filters.maxCost) {
      query = query.lte('cost_calculation->total_cost', filters.maxCost);
    }
    if (filters.hasError === true) {
      query = query.eq('status', 'error');
    }
    if (filters.hasError === false) {
      query = query.neq('status', 'error');
    }
    if (filters.streaming === true) {
      query = query.eq('streaming_enabled', true);
    }
    if (filters.streaming === false) {
      query = query.eq('streaming_enabled', false);
    }

    // Apply pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[TraceService] Failed to get traces:', error);
      throw new Error(`Failed to get traces: ${error.message}`);
    }

    return {
      traces: data || [],
      totalCount: count || 0,
      hasMore: (count || 0) > offset + limit
    };
  }

  /**
   * Get trace events for a specific trace
   */
  static async getTraceEvents(traceId: string): Promise<TraceEvent[]> {
    const { data, error } = await supabase
      .from('trace_events')
      .select('*')
      .eq('trace_id', traceId)
      .order('sequence_number', { ascending: true });

    if (error) {
      console.error('[TraceService] Failed to get trace events:', error);
      throw new Error(`Failed to get trace events: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get performance metrics for traces
   */
  static async getTraceMetrics(filters: TraceFilters = {}): Promise<TraceMetrics> {
    let query = supabase
      .from('ai_interaction_traces')
      .select('status, duration_ms, first_token_latency_ms, cost_calculation, tokens_per_second, streaming_enabled');

    // Apply filters (reuse logic from getTraces)
    if (filters.userId) query = query.eq('user_id', filters.userId);
    if (filters.model) query = query.eq('model_id', filters.model);
    if (filters.source) query = query.eq('source', filters.source);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) query = query.lte('created_at', filters.endDate);

    const { data, error } = await query;

    if (error) {
      console.error('[TraceService] Failed to get trace metrics:', error);
      throw new Error(`Failed to get trace metrics: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        totalTraces: 0,
        successfulTraces: 0,
        errorTraces: 0,
        averageDuration: 0,
        averageLatency: 0,
        totalCost: 0,
        averageTokensPerSecond: 0,
        errorRate: 0,
        streamingRate: 0
      };
    }

    const totalTraces = data.length;
    const successfulTraces = data.filter(t => t.status === 'success').length;
    const errorTraces = data.filter(t => t.status === 'error').length;
    const streamingTraces = data.filter(t => t.streaming_enabled).length;

    const durations = data.filter(t => t.duration_ms).map(t => t.duration_ms);
    const latencies = data.filter(t => t.first_token_latency_ms).map(t => t.first_token_latency_ms);
    const tokenSpeeds = data.filter(t => t.tokens_per_second).map(t => t.tokens_per_second);
    
    const totalCost = data.reduce((sum, t) => {
      const cost = t.cost_calculation?.total_cost || 0;
      return sum + (typeof cost === 'number' ? cost : parseFloat(cost) || 0);
    }, 0);

    return {
      totalTraces,
      successfulTraces,
      errorTraces,
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      averageLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      totalCost,
      averageTokensPerSecond: tokenSpeeds.length > 0 ? tokenSpeeds.reduce((a, b) => a + b, 0) / tokenSpeeds.length : 0,
      errorRate: totalTraces > 0 ? (errorTraces / totalTraces) * 100 : 0,
      streamingRate: totalTraces > 0 ? (streamingTraces / totalTraces) * 100 : 0
    };
  }

  /**
   * Get live traces (currently active)
   */
  static async getLiveTraces(): Promise<{
    active: number;
    avgLatency: number;
    errorRate: number;
    traces: TraceData[];
  }> {
    // Get traces from last 5 minutes that are still pending or streaming
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('ai_interaction_traces')
      .select('*')
      .in('status', ['pending', 'streaming'])
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[TraceService] Failed to get live traces:', error);
      return { active: 0, avgLatency: 0, errorRate: 0, traces: [] };
    }

    // Also get recent completed traces for metrics
    const { data: recentData } = await supabase
      .from('ai_interaction_traces')
      .select('duration_ms, status')
      .gte('created_at', fiveMinutesAgo)
      .in('status', ['success', 'error']);

    const recentTraces = recentData || [];
    const avgLatency = recentTraces.length > 0 
      ? recentTraces.filter(t => t.duration_ms).reduce((sum, t) => sum + t.duration_ms, 0) / recentTraces.filter(t => t.duration_ms).length
      : 0;
    
    const errorRate = recentTraces.length > 0
      ? (recentTraces.filter(t => t.status === 'error').length / recentTraces.length) * 100
      : 0;

    return {
      active: data?.length || 0,
      avgLatency,
      errorRate,
      traces: data || []
    };
  }

  /**
   * Calculate and store cost for a trace
   */
  static async calculateAndStoreTraceCost(
    traceId: string,
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<{ totalCost: number; inputCost: number; outputCost: number }> {
    const cost = calculateModelCost(provider, model, inputTokens, outputTokens);
    
    await this.updateTrace(traceId, {
      cost_calculation: {
        input_cost: cost.inputCost,
        output_cost: cost.outputCost,
        total_cost: cost.totalCost
      },
      tokens_used: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens
      }
    });

    return cost;
  }

  /**
   * Aggregate hourly metrics (called by scheduled job)
   */
  static async aggregateHourlyMetrics(targetHour?: Date): Promise<void> {
    const hour = targetHour || new Date();
    hour.setMinutes(0, 0, 0); // Round to hour

    const { error } = await supabase.rpc('aggregate_trace_metrics_hourly', {
      target_hour: hour.toISOString()
    });

    if (error) {
      console.error('[TraceService] Failed to aggregate hourly metrics:', error);
      throw new Error(`Failed to aggregate metrics: ${error.message}`);
    }
  }

  /**
   * Search traces by content
   */
  static async searchTraces(
    query: string, 
    filters: TraceFilters = {}
  ): Promise<TraceData[]> {
    let dbQuery = supabase
      .from('ai_interaction_traces')
      .select('*')
      .or(`prompt_content.ilike.%${query}%,response_content.ilike.%${query}%`);

    // Apply standard filters
    if (filters.userId) dbQuery = dbQuery.eq('user_id', filters.userId);
    if (filters.model) dbQuery = dbQuery.eq('model_id', filters.model);
    if (filters.status) dbQuery = dbQuery.eq('status', filters.status);

    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .limit(filters.limit || 50);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('[TraceService] Failed to search traces:', error);
      throw new Error(`Failed to search traces: ${error.message}`);
    }

    return data || [];
  }
}