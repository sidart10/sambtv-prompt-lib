-- Create prompt_evaluations table
CREATE TABLE IF NOT EXISTS prompt_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  evaluator_id TEXT NOT NULL,
  score DECIMAL(3, 2) NOT NULL CHECK (score >= 0 AND score <= 1),
  reasoning TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  request_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create prompt_comparisons table
CREATE TABLE IF NOT EXISTS prompt_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  variant_a_id TEXT NOT NULL,
  variant_b_id TEXT NOT NULL,
  winner TEXT CHECK (winner IN ('A', 'B', 'tie')),
  confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  evaluator_results JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add evaluation columns to prompts table if they don't exist
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS average_evaluation_score DECIMAL(3, 2),
ADD COLUMN IF NOT EXISTS evaluation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_evaluated_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prompt_evaluations_prompt_id ON prompt_evaluations(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_evaluations_user_id ON prompt_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_evaluations_evaluator_id ON prompt_evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_prompt_evaluations_created_at ON prompt_evaluations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_evaluations_score ON prompt_evaluations(score DESC);

CREATE INDEX IF NOT EXISTS idx_prompt_comparisons_prompt_id ON prompt_comparisons(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_comparisons_user_id ON prompt_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_comparisons_created_at ON prompt_comparisons(created_at DESC);

-- Enable RLS
ALTER TABLE prompt_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS policies for prompt_evaluations
CREATE POLICY "Users can view all evaluations for prompts" ON prompt_evaluations
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own evaluations" ON prompt_evaluations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own evaluations" ON prompt_evaluations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own evaluations" ON prompt_evaluations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for prompt_comparisons
CREATE POLICY "Users can view all comparisons" ON prompt_comparisons
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own comparisons" ON prompt_comparisons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comparisons" ON prompt_comparisons
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update prompt evaluation stats
CREATE OR REPLACE FUNCTION update_prompt_evaluation_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE prompts
    SET 
      average_evaluation_score = (
        SELECT AVG(score) 
        FROM prompt_evaluations 
        WHERE prompt_id = NEW.prompt_id
      ),
      evaluation_count = (
        SELECT COUNT(*) 
        FROM prompt_evaluations 
        WHERE prompt_id = NEW.prompt_id
      ),
      last_evaluated_at = NOW()
    WHERE id = NEW.prompt_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE prompts
    SET 
      average_evaluation_score = (
        SELECT AVG(score) 
        FROM prompt_evaluations 
        WHERE prompt_id = OLD.prompt_id
      ),
      evaluation_count = (
        SELECT COUNT(*) 
        FROM prompt_evaluations 
        WHERE prompt_id = OLD.prompt_id
      ),
      last_evaluated_at = CASE 
        WHEN (SELECT COUNT(*) FROM prompt_evaluations WHERE prompt_id = OLD.prompt_id) > 0 
        THEN NOW() 
        ELSE NULL 
      END
    WHERE id = OLD.prompt_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating prompt stats
CREATE TRIGGER update_prompt_stats_on_evaluation
AFTER INSERT OR UPDATE OR DELETE ON prompt_evaluations
FOR EACH ROW
EXECUTE FUNCTION update_prompt_evaluation_stats();

-- Add updated_at trigger
CREATE TRIGGER update_prompt_evaluations_updated_at
BEFORE UPDATE ON prompt_evaluations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();