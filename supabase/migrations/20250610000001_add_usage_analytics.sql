-- Create shared usage analytics table for both main app and Langfuse
CREATE TABLE IF NOT EXISTS usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  source_app TEXT NOT NULL CHECK (source_app IN ('main', 'langfuse')),
  event_type TEXT NOT NULL,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  
  -- Token usage
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  -- Cost tracking
  input_cost DECIMAL(10,6) DEFAULT 0,
  output_cost DECIMAL(10,6) DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,
  
  -- Performance metrics
  latency_ms INTEGER,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  
  -- Metadata
  prompt_id INTEGER REFERENCES prompts(id) ON DELETE SET NULL,
  trace_id TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT valid_tokens CHECK (
    prompt_tokens >= 0 AND 
    completion_tokens >= 0 AND 
    total_tokens >= 0
  ),
  CONSTRAINT valid_costs CHECK (
    input_cost >= 0 AND 
    output_cost >= 0 AND 
    total_cost >= 0
  )
);

-- Create indexes for efficient querying
CREATE INDEX idx_usage_user_created ON usage_analytics(user_id, created_at DESC);
CREATE INDEX idx_usage_model_created ON usage_analytics(model_id, created_at DESC);
CREATE INDEX idx_usage_provider_created ON usage_analytics(provider, created_at DESC);
CREATE INDEX idx_usage_source_created ON usage_analytics(source_app, created_at DESC);
CREATE INDEX idx_usage_prompt_id ON usage_analytics(prompt_id) WHERE prompt_id IS NOT NULL;
CREATE INDEX idx_usage_trace_id ON usage_analytics(trace_id) WHERE trace_id IS NOT NULL;

-- Create aggregated daily stats table for performance
CREATE TABLE IF NOT EXISTS usage_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  source_app TEXT NOT NULL,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  
  -- Aggregated metrics
  request_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,
  avg_latency_ms INTEGER,
  error_count INTEGER DEFAULT 0,
  
  -- Updated timestamp
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_daily_stats UNIQUE (date, user_id, source_app, model_id)
);

-- Create index for efficient querying
CREATE INDEX idx_daily_stats_date ON usage_daily_stats(date DESC);
CREATE INDEX idx_daily_stats_user_date ON usage_daily_stats(user_id, date DESC);

-- Function to update daily stats
CREATE OR REPLACE FUNCTION update_usage_daily_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_daily_stats (
    date,
    user_id,
    source_app,
    model_id,
    provider,
    request_count,
    total_tokens,
    total_cost,
    avg_latency_ms,
    error_count
  )
  VALUES (
    DATE(NEW.created_at),
    NEW.user_id,
    NEW.source_app,
    NEW.model_id,
    NEW.provider,
    1,
    NEW.total_tokens,
    NEW.total_cost,
    NEW.latency_ms,
    CASE WHEN NEW.status = 'error' THEN 1 ELSE 0 END
  )
  ON CONFLICT (date, user_id, source_app, model_id)
  DO UPDATE SET
    request_count = usage_daily_stats.request_count + 1,
    total_tokens = usage_daily_stats.total_tokens + NEW.total_tokens,
    total_cost = usage_daily_stats.total_cost + NEW.total_cost,
    avg_latency_ms = (
      (usage_daily_stats.avg_latency_ms * usage_daily_stats.request_count + COALESCE(NEW.latency_ms, 0))
      / (usage_daily_stats.request_count + 1)
    ),
    error_count = usage_daily_stats.error_count + CASE WHEN NEW.status = 'error' THEN 1 ELSE 0 END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update daily stats
CREATE TRIGGER update_daily_stats_trigger
AFTER INSERT ON usage_analytics
FOR EACH ROW
EXECUTE FUNCTION update_usage_daily_stats();

-- RLS policies for usage_analytics
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own usage" ON usage_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can insert usage from both apps
CREATE POLICY "System can insert usage" ON usage_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS policies for usage_daily_stats
ALTER TABLE usage_daily_stats ENABLE ROW LEVEL SECURITY;

-- Users can view their own daily stats
CREATE POLICY "Users can view their own daily stats" ON usage_daily_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON usage_analytics TO authenticated;
GRANT SELECT ON usage_daily_stats TO authenticated;

-- Create view for easy cost summaries
CREATE OR REPLACE VIEW usage_cost_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', date) as month,
  source_app,
  provider,
  SUM(request_count) as total_requests,
  SUM(total_tokens) as total_tokens,
  SUM(total_cost) as total_cost,
  AVG(avg_latency_ms)::INTEGER as avg_latency_ms,
  SUM(error_count) as total_errors
FROM usage_daily_stats
GROUP BY user_id, DATE_TRUNC('month', date), source_app, provider;

-- Grant permission to view
GRANT SELECT ON usage_cost_summary TO authenticated;