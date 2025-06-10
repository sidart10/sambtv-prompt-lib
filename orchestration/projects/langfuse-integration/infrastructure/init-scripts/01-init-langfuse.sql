-- Initialize Langfuse database extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create initial schema
CREATE SCHEMA IF NOT EXISTS langfuse;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA langfuse TO langfuse;
GRANT ALL PRIVILEGES ON DATABASE langfuse TO langfuse;

-- Create integration table for main app
CREATE TABLE IF NOT EXISTS langfuse.prompt_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    main_app_prompt_id INTEGER NOT NULL,
    langfuse_project_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prompt_integrations_main_app ON langfuse.prompt_integrations(main_app_prompt_id);
CREATE INDEX idx_prompt_integrations_langfuse ON langfuse.prompt_integrations(langfuse_project_id);
