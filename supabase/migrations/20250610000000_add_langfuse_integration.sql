-- Create table to store Langfuse trace references
CREATE TABLE IF NOT EXISTS langfuse_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id INTEGER REFERENCES prompts(id) ON DELETE CASCADE,
  langfuse_trace_id TEXT UNIQUE NOT NULL,
  evaluation_scores JSONB,
  total_cost DECIMAL(10,6),
  latency_ms INTEGER,
  token_usage JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_langfuse_prompt ON langfuse_traces(prompt_id);
CREATE INDEX idx_langfuse_trace_id ON langfuse_traces(langfuse_trace_id);
CREATE INDEX idx_langfuse_created_at ON langfuse_traces(created_at DESC);

-- Add evaluation summary columns to prompts table
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS average_evaluation_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS evaluation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_evaluated_at TIMESTAMPTZ;

-- Create function to update evaluation metrics
CREATE OR REPLACE FUNCTION update_prompt_evaluation_metrics()
RETURNS TRIGGER AS $$
DECLARE
  avg_score DECIMAL(3,2);
  eval_count INTEGER;
BEGIN
  -- Calculate average score and count
  SELECT 
    AVG((scores->>'value')::DECIMAL),
    COUNT(*)
  INTO avg_score, eval_count
  FROM langfuse_traces lt,
       jsonb_array_elements(lt.evaluation_scores) scores
  WHERE lt.prompt_id = NEW.prompt_id
    AND scores->>'name' = 'quality';

  -- Update prompt with new metrics
  UPDATE prompts
  SET 
    average_evaluation_score = avg_score,
    evaluation_count = eval_count,
    last_evaluated_at = NEW.created_at
  WHERE id = NEW.prompt_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update evaluation metrics
CREATE TRIGGER update_prompt_evaluation_metrics_trigger
AFTER INSERT OR UPDATE ON langfuse_traces
FOR EACH ROW
EXECUTE FUNCTION update_prompt_evaluation_metrics();

-- RLS policies
ALTER TABLE langfuse_traces ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all traces
CREATE POLICY "Users can view all langfuse traces" ON langfuse_traces
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create traces
CREATE POLICY "Users can create langfuse traces" ON langfuse_traces
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to update their own traces
CREATE POLICY "Users can update their own traces" ON langfuse_traces
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prompts p
      WHERE p.id = langfuse_traces.prompt_id
      AND p.author_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON langfuse_traces TO authenticated;
GRANT USAGE ON SEQUENCE langfuse_traces_id_seq TO authenticated;