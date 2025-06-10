-- Task 15: Full Tracing Functionality - Database Schema
-- Enhanced AI interaction tracing system

-- Main tracing table for comprehensive trace collection
CREATE TABLE IF NOT EXISTS ai_interaction_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id VARCHAR(255) UNIQUE NOT NULL,
  parent_trace_id VARCHAR(255),
  session_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  
  -- Request Details
  source VARCHAR(50) NOT NULL CHECK (source IN ('playground', 'api', 'test')),
  prompt_id UUID REFERENCES prompts(id),
  model_id VARCHAR(255) NOT NULL,
  prompt_content TEXT NOT NULL,
  system_prompt TEXT,
  
  -- Parameters
  parameters JSONB NOT NULL DEFAULT '{}',
  
  -- Response Details
  response_content TEXT,
  tokens_used JSONB DEFAULT '{}', -- {input: number, output: number, total: number}
  cost_calculation JSONB DEFAULT '{}', -- {input_cost, output_cost, total_cost}
  
  -- Performance Metrics
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_ms INTEGER,
  first_token_latency_ms INTEGER,
  streaming_enabled BOOLEAN DEFAULT FALSE,
  tokens_per_second NUMERIC(10,2),
  
  -- Status and Errors
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'streaming', 'success', 'error', 'cancelled')),
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- Langfuse Integration
  langfuse_trace_id VARCHAR(255),
  langfuse_observation_id VARCHAR(255),
  
  -- Quality Metrics
  quality_score NUMERIC(3,2), -- 0.00 to 5.00
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  
  -- Metadata
  user_agent TEXT,
  ip_address INET,
  trace_version VARCHAR(10) DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_ai_traces_user_id ON ai_interaction_traces(user_id);
CREATE INDEX idx_ai_traces_session_id ON ai_interaction_traces(session_id);
CREATE INDEX idx_ai_traces_created_at ON ai_interaction_traces(created_at);
CREATE INDEX idx_ai_traces_status ON ai_interaction_traces(status);
CREATE INDEX idx_ai_traces_model_id ON ai_interaction_traces(model_id);
CREATE INDEX idx_ai_traces_source ON ai_interaction_traces(source);
CREATE INDEX idx_ai_traces_start_time ON ai_interaction_traces(start_time);
CREATE INDEX idx_ai_traces_duration_ms ON ai_interaction_traces(duration_ms);

-- Composite indexes for common queries
CREATE INDEX idx_ai_traces_user_status_created ON ai_interaction_traces(user_id, status, created_at DESC);
CREATE INDEX idx_ai_traces_model_start_time ON ai_interaction_traces(model_id, start_time DESC);

-- Trace performance metrics aggregation (hourly rollups)
CREATE TABLE IF NOT EXISTS trace_metrics_hourly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hour_bucket TIMESTAMPTZ NOT NULL,
  model_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  
  -- Aggregated metrics
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  error_requests INTEGER NOT NULL DEFAULT 0,
  streaming_requests INTEGER NOT NULL DEFAULT 0,
  
  -- Performance metrics
  avg_duration_ms NUMERIC(10,2),
  min_duration_ms INTEGER,
  max_duration_ms INTEGER,
  avg_first_token_latency_ms NUMERIC(10,2),
  avg_tokens_per_second NUMERIC(10,2),
  avg_tokens_per_request NUMERIC(10,2),
  
  -- Cost metrics
  total_cost NUMERIC(12,6) NOT NULL DEFAULT 0,
  total_input_tokens BIGINT NOT NULL DEFAULT 0,
  total_output_tokens BIGINT NOT NULL DEFAULT 0,
  
  -- Quality metrics
  avg_quality_score NUMERIC(3,2),
  avg_user_rating NUMERIC(3,2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(hour_bucket, model_id, user_id)
);

-- Index for hourly metrics
CREATE INDEX idx_trace_metrics_hour_model ON trace_metrics_hourly(hour_bucket, model_id);
CREATE INDEX idx_trace_metrics_user_hour ON trace_metrics_hourly(user_id, hour_bucket DESC);

-- Real-time trace events for live monitoring
CREATE TABLE IF NOT EXISTS trace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id VARCHAR(255) NOT NULL REFERENCES ai_interaction_traces(trace_id),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('start', 'token', 'structured', 'error', 'complete', 'user_action')),
  event_data JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sequence_number INTEGER NOT NULL
);

-- Index for trace events
CREATE INDEX idx_trace_events_trace_id ON trace_events(trace_id, sequence_number);
CREATE INDEX idx_trace_events_timestamp ON trace_events(timestamp DESC);

-- Function to update trace metrics automatically
CREATE OR REPLACE FUNCTION update_trace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_trace_updated_at
  BEFORE UPDATE ON ai_interaction_traces
  FOR EACH ROW
  EXECUTE FUNCTION update_trace_updated_at();

-- Function to aggregate hourly metrics (called by cron or scheduled job)
CREATE OR REPLACE FUNCTION aggregate_trace_metrics_hourly(target_hour TIMESTAMPTZ)
RETURNS VOID AS $$
BEGIN
  INSERT INTO trace_metrics_hourly (
    hour_bucket, model_id, user_id,
    total_requests, successful_requests, error_requests, streaming_requests,
    avg_duration_ms, min_duration_ms, max_duration_ms,
    avg_first_token_latency_ms, avg_tokens_per_second, avg_tokens_per_request,
    total_cost, total_input_tokens, total_output_tokens,
    avg_quality_score, avg_user_rating
  )
  SELECT 
    date_trunc('hour', start_time) as hour_bucket,
    model_id,
    user_id,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'success') as successful_requests,
    COUNT(*) FILTER (WHERE status = 'error') as error_requests,
    COUNT(*) FILTER (WHERE streaming_enabled = true) as streaming_requests,
    AVG(duration_ms) as avg_duration_ms,
    MIN(duration_ms) as min_duration_ms,
    MAX(duration_ms) as max_duration_ms,
    AVG(first_token_latency_ms) as avg_first_token_latency_ms,
    AVG(tokens_per_second) as avg_tokens_per_second,
    AVG((tokens_used->>'total')::numeric) as avg_tokens_per_request,
    COALESCE(SUM((cost_calculation->>'total_cost')::numeric), 0) as total_cost,
    COALESCE(SUM((tokens_used->>'input')::bigint), 0) as total_input_tokens,
    COALESCE(SUM((tokens_used->>'output')::bigint), 0) as total_output_tokens,
    AVG(quality_score) as avg_quality_score,
    AVG(user_rating) as avg_user_rating
  FROM ai_interaction_traces
  WHERE date_trunc('hour', start_time) = target_hour
    AND status IN ('success', 'error')
  GROUP BY date_trunc('hour', start_time), model_id, user_id
  ON CONFLICT (hour_bucket, model_id, user_id)
  DO UPDATE SET
    total_requests = EXCLUDED.total_requests,
    successful_requests = EXCLUDED.successful_requests,
    error_requests = EXCLUDED.error_requests,
    streaming_requests = EXCLUDED.streaming_requests,
    avg_duration_ms = EXCLUDED.avg_duration_ms,
    min_duration_ms = EXCLUDED.min_duration_ms,
    max_duration_ms = EXCLUDED.max_duration_ms,
    avg_first_token_latency_ms = EXCLUDED.avg_first_token_latency_ms,
    avg_tokens_per_second = EXCLUDED.avg_tokens_per_second,
    avg_tokens_per_request = EXCLUDED.avg_tokens_per_request,
    total_cost = EXCLUDED.total_cost,
    total_input_tokens = EXCLUDED.total_input_tokens,
    total_output_tokens = EXCLUDED.total_output_tokens,
    avg_quality_score = EXCLUDED.avg_quality_score,
    avg_user_rating = EXCLUDED.avg_user_rating;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for security
ALTER TABLE ai_interaction_traces ENABLE ROW LEVEL SECURITY;

-- Users can only see their own traces
CREATE POLICY "Users can view own traces" ON ai_interaction_traces
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own traces" ON ai_interaction_traces
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own traces" ON ai_interaction_traces
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin users can see all traces (for analytics)
CREATE POLICY "Admins can view all traces" ON ai_interaction_traces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Similar policies for metrics and events
ALTER TABLE trace_metrics_hourly ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics" ON trace_metrics_hourly
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own trace events" ON trace_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_interaction_traces 
      WHERE ai_interaction_traces.trace_id = trace_events.trace_id 
      AND ai_interaction_traces.user_id = auth.uid()
    )
  );

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON ai_interaction_traces TO authenticated;
GRANT SELECT ON trace_metrics_hourly TO authenticated;
GRANT SELECT, INSERT ON trace_events TO authenticated;

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_traces_performance 
  ON ai_interaction_traces(user_id, status, start_time DESC) 
  WHERE status IN ('success', 'error');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_traces_live 
  ON ai_interaction_traces(status, start_time DESC) 
  WHERE status IN ('pending', 'streaming');

COMMENT ON TABLE ai_interaction_traces IS 'Comprehensive AI interaction tracing for Task 15';
COMMENT ON TABLE trace_metrics_hourly IS 'Hourly aggregated metrics for performance analytics';
COMMENT ON TABLE trace_events IS 'Real-time events for live trace monitoring';