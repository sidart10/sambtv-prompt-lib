-- Task 19: Usage Analytics Dashboard - Database Schema
-- Comprehensive analytics tables for AI platform usage tracking

-- Daily usage aggregation table
CREATE TABLE IF NOT EXISTS usage_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  source TEXT CHECK (source IN ('playground', 'api', 'test')),
  
  -- Request metrics
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  
  -- Token metrics
  total_input_tokens INTEGER NOT NULL DEFAULT 0,
  total_output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  
  -- Cost metrics
  total_input_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  total_output_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  total_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  
  -- Performance metrics
  avg_duration_ms DECIMAL(10, 2),
  avg_first_token_latency_ms DECIMAL(10, 2),
  avg_tokens_per_second DECIMAL(10, 2),
  p95_duration_ms DECIMAL(10, 2),
  p95_latency_ms DECIMAL(10, 2),
  
  -- Quality metrics
  avg_quality_score DECIMAL(3, 2),
  avg_evaluation_score DECIMAL(3, 2),
  
  -- Streaming metrics
  streaming_requests INTEGER NOT NULL DEFAULT 0,
  structured_output_requests INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite unique constraint
  CONSTRAINT unique_daily_analytics UNIQUE (date, user_id, model_id, source)
);

-- Model usage statistics table
CREATE TABLE IF NOT EXISTS model_usage_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('hour', 'day', 'week', 'month')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Usage metrics
  total_requests INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  total_cost DECIMAL(12, 6) NOT NULL DEFAULT 0,
  
  -- Performance metrics
  success_rate DECIMAL(5, 2),
  error_rate DECIMAL(5, 2),
  avg_response_time_ms DECIMAL(10, 2),
  avg_tokens_per_second DECIMAL(10, 2),
  
  -- Cost efficiency
  cost_per_token DECIMAL(10, 8),
  cost_per_request DECIMAL(10, 6),
  
  -- Quality metrics
  avg_quality_score DECIMAL(3, 2),
  quality_distribution JSONB DEFAULT '{}',
  
  -- Error analysis
  error_types JSONB DEFAULT '{}',
  common_errors TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite unique constraint
  CONSTRAINT unique_model_stats UNIQUE (model_id, period_type, period_start)
);

-- Cost analysis summary table
CREATE TABLE IF NOT EXISTS cost_analysis_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type TEXT NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'quarter')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Overall costs
  total_cost DECIMAL(12, 6) NOT NULL DEFAULT 0,
  total_requests BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  
  -- Cost breakdown by model
  model_costs JSONB NOT NULL DEFAULT '{}',
  
  -- Cost breakdown by user/department
  user_costs JSONB NOT NULL DEFAULT '{}',
  department_costs JSONB NOT NULL DEFAULT '{}',
  
  -- Cost trends
  cost_change_percentage DECIMAL(5, 2),
  cost_forecast DECIMAL(12, 6),
  
  -- Optimization opportunities
  optimization_recommendations JSONB DEFAULT '[]',
  potential_savings DECIMAL(12, 6),
  
  -- Top consumers
  top_users JSONB DEFAULT '[]',
  top_prompts JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_cost_summary UNIQUE (period_type, period_start)
);

-- User activity metrics table
CREATE TABLE IF NOT EXISTS user_activity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Activity metrics
  total_requests INTEGER NOT NULL DEFAULT 0,
  unique_prompts INTEGER NOT NULL DEFAULT 0,
  unique_models_used INTEGER NOT NULL DEFAULT 0,
  total_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  
  -- Usage patterns
  peak_usage_hour INTEGER,
  most_used_model TEXT,
  most_used_prompt_id TEXT,
  
  -- Performance metrics
  avg_session_duration_minutes DECIMAL(10, 2),
  requests_per_session DECIMAL(10, 2),
  
  -- Engagement metrics
  playground_usage INTEGER NOT NULL DEFAULT 0,
  api_usage INTEGER NOT NULL DEFAULT 0,
  evaluation_runs INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_activity UNIQUE (user_id, date)
);

-- Prompt performance trends table
CREATE TABLE IF NOT EXISTS prompt_performance_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Usage metrics
  total_uses INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  
  -- Cost metrics
  total_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  avg_cost_per_use DECIMAL(10, 6),
  
  -- Performance metrics
  avg_duration_ms DECIMAL(10, 2),
  success_rate DECIMAL(5, 2),
  
  -- Quality metrics
  avg_quality_score DECIMAL(3, 2),
  avg_evaluation_score DECIMAL(3, 2),
  user_satisfaction_score DECIMAL(3, 2),
  
  -- Model distribution
  model_usage JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_prompt_trends UNIQUE (prompt_id, date)
);

-- Analytics export queue table
CREATE TABLE IF NOT EXISTS analytics_export_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('csv', 'json', 'pdf', 'excel')),
  report_type TEXT NOT NULL CHECK (report_type IN ('usage', 'cost', 'performance', 'custom')),
  
  -- Parameters
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  filters JSONB DEFAULT '{}',
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Results
  file_url TEXT,
  file_size_bytes INTEGER,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_daily_date ON usage_analytics_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_daily_user ON usage_analytics_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_daily_model ON usage_analytics_daily(model_id);
CREATE INDEX IF NOT EXISTS idx_usage_daily_date_model ON usage_analytics_daily(date DESC, model_id);

CREATE INDEX IF NOT EXISTS idx_model_stats_period ON model_usage_statistics(period_start DESC, period_type);
CREATE INDEX IF NOT EXISTS idx_model_stats_model ON model_usage_statistics(model_id, period_type);

CREATE INDEX IF NOT EXISTS idx_cost_summary_period ON cost_analysis_summary(period_start DESC, period_type);

CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_date ON user_activity_metrics(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_prompt_trends_date ON prompt_performance_trends(date DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_trends_prompt_date ON prompt_performance_trends(prompt_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_export_queue_status ON analytics_export_queue(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_queue_user ON analytics_export_queue(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE usage_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_usage_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_analysis_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_performance_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_export_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Analytics data is viewable by all authenticated users
-- but user-specific data requires ownership or admin role

-- Usage analytics daily
CREATE POLICY "Users can view all usage analytics" ON usage_analytics_daily
  FOR SELECT USING (true);

CREATE POLICY "Only system can insert usage analytics" ON usage_analytics_daily
  FOR INSERT WITH CHECK (false); -- Only backend can insert

CREATE POLICY "Only system can update usage analytics" ON usage_analytics_daily
  FOR UPDATE USING (false);

-- Model usage statistics
CREATE POLICY "Users can view model statistics" ON model_usage_statistics
  FOR SELECT USING (true);

CREATE POLICY "Only system can modify model statistics" ON model_usage_statistics
  FOR ALL USING (false);

-- Cost analysis summary
CREATE POLICY "Users can view cost summaries" ON cost_analysis_summary
  FOR SELECT USING (true);

CREATE POLICY "Only system can modify cost summaries" ON cost_analysis_summary
  FOR ALL USING (false);

-- User activity metrics
CREATE POLICY "Users can view their own activity metrics" ON user_activity_metrics
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only system can modify activity metrics" ON user_activity_metrics
  FOR ALL USING (false);

-- Prompt performance trends
CREATE POLICY "Users can view prompt trends" ON prompt_performance_trends
  FOR SELECT USING (true);

CREATE POLICY "Only system can modify prompt trends" ON prompt_performance_trends
  FOR ALL USING (false);

-- Analytics export queue
CREATE POLICY "Users can view their own exports" ON analytics_export_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exports" ON analytics_export_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exports" ON analytics_export_queue
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to aggregate daily analytics from traces
CREATE OR REPLACE FUNCTION aggregate_daily_analytics()
RETURNS void AS $$
BEGIN
  -- Insert or update daily analytics from ai_interaction_traces
  INSERT INTO usage_analytics_daily (
    date, user_id, model_id, source,
    total_requests, successful_requests, failed_requests,
    total_input_tokens, total_output_tokens, total_tokens,
    total_input_cost, total_output_cost, total_cost,
    avg_duration_ms, avg_first_token_latency_ms, avg_tokens_per_second,
    p95_duration_ms, p95_latency_ms,
    avg_quality_score, avg_evaluation_score,
    streaming_requests, structured_output_requests
  )
  SELECT 
    DATE(created_at) as date,
    user_id,
    model_id,
    source,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'success') as successful_requests,
    COUNT(*) FILTER (WHERE status = 'error') as failed_requests,
    SUM(COALESCE((tokens_used->>'input')::INTEGER, 0)) as total_input_tokens,
    SUM(COALESCE((tokens_used->>'output')::INTEGER, 0)) as total_output_tokens,
    SUM(COALESCE((tokens_used->>'total')::INTEGER, 0)) as total_tokens,
    SUM(COALESCE((cost_calculation->>'input_cost')::DECIMAL, 0)) as total_input_cost,
    SUM(COALESCE((cost_calculation->>'output_cost')::DECIMAL, 0)) as total_output_cost,
    SUM(COALESCE((cost_calculation->>'total_cost')::DECIMAL, 0)) as total_cost,
    AVG(duration_ms) as avg_duration_ms,
    AVG(first_token_latency_ms) as avg_first_token_latency_ms,
    AVG(tokens_per_second) as avg_tokens_per_second,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY first_token_latency_ms) as p95_latency_ms,
    AVG(quality_score) as avg_quality_score,
    NULL as avg_evaluation_score, -- Will be updated from evaluations
    COUNT(*) FILTER (WHERE streaming_enabled = true) as streaming_requests,
    COUNT(*) FILTER (WHERE response_content::jsonb ? 'structured_output') as structured_output_requests
  FROM ai_interaction_traces
  WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
  GROUP BY DATE(created_at), user_id, model_id, source
  ON CONFLICT (date, user_id, model_id, source) 
  DO UPDATE SET
    total_requests = EXCLUDED.total_requests,
    successful_requests = EXCLUDED.successful_requests,
    failed_requests = EXCLUDED.failed_requests,
    total_input_tokens = EXCLUDED.total_input_tokens,
    total_output_tokens = EXCLUDED.total_output_tokens,
    total_tokens = EXCLUDED.total_tokens,
    total_input_cost = EXCLUDED.total_input_cost,
    total_output_cost = EXCLUDED.total_output_cost,
    total_cost = EXCLUDED.total_cost,
    avg_duration_ms = EXCLUDED.avg_duration_ms,
    avg_first_token_latency_ms = EXCLUDED.avg_first_token_latency_ms,
    avg_tokens_per_second = EXCLUDED.avg_tokens_per_second,
    p95_duration_ms = EXCLUDED.p95_duration_ms,
    p95_latency_ms = EXCLUDED.p95_latency_ms,
    avg_quality_score = EXCLUDED.avg_quality_score,
    streaming_requests = EXCLUDED.streaming_requests,
    structured_output_requests = EXCLUDED.structured_output_requests,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update evaluation scores in daily analytics
CREATE OR REPLACE FUNCTION update_daily_evaluation_scores()
RETURNS void AS $$
BEGIN
  UPDATE usage_analytics_daily uad
  SET avg_evaluation_score = (
    SELECT AVG(pe.score)
    FROM prompt_evaluations pe
    JOIN ai_interaction_traces ait ON ait.trace_id = pe.metadata->>'traceId'
    WHERE DATE(ait.created_at) = uad.date
      AND ait.user_id = uad.user_id
      AND ait.model_id = uad.model_id
  )
  WHERE uad.date >= CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Add triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usage_daily_updated_at BEFORE UPDATE ON usage_analytics_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_activity_updated_at BEFORE UPDATE ON user_activity_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();