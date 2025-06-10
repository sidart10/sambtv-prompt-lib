-- Add feedback table for basic feedback collection
CREATE TABLE IF NOT EXISTS public.feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT,
    feedback_type TEXT NOT NULL DEFAULT 'general' CHECK (feedback_type IN ('bug', 'feature', 'general', 'improvement')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    page_url TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies for feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can create feedback (authenticated or anonymous)
CREATE POLICY "Anyone can create feedback" ON public.feedback
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

-- Users can read their own feedback if authenticated
CREATE POLICY "Users can read own feedback" ON public.feedback
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Admin users can read all feedback
CREATE POLICY "Admin can read all feedback" ON public.feedback
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Admin users can update feedback
CREATE POLICY "Admin can update feedback" ON public.feedback
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feedback_updated_at 
    BEFORE UPDATE ON public.feedback 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(feedback_type);