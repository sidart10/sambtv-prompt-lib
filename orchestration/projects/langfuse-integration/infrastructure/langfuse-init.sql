-- Task 6: Langfuse-Specific Database Initialization
-- Optimized for tracing workloads and high-performance analytics

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create dedicated schemas for organization
CREATE SCHEMA IF NOT EXISTS langfuse_core;
CREATE SCHEMA IF NOT EXISTS langfuse_analytics;
CREATE SCHEMA IF NOT EXISTS langfuse_integrations;

-- Performance optimization for tracing workloads
-- Configure for high INSERT throughput and fast queries

-- Create performance-optimized indexes
-- These will be used by Langfuse for fast trace queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_traces_timestamp ON langfuse_core.traces (timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_traces_session_id ON langfuse_core.traces (session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_observations_trace_id ON langfuse_core.observations (trace_id);

-- Create application user for Langfuse with proper permissions
CREATE USER IF NOT EXISTS langfuse_app WITH PASSWORD '${LANGFUSE_APP_PASSWORD:-langfuse_app_secure_password}';

-- Grant appropriate permissions
GRANT CONNECT ON DATABASE langfuse TO langfuse_app;
GRANT USAGE ON SCHEMA langfuse_core TO langfuse_app;
GRANT USAGE ON SCHEMA langfuse_analytics TO langfuse_app;
GRANT USAGE ON SCHEMA langfuse_integrations TO langfuse_app;

-- Grant table permissions (will be created by Langfuse migrations)
GRANT CREATE ON SCHEMA langfuse_core TO langfuse_app;
GRANT CREATE ON SCHEMA langfuse_analytics TO langfuse_app;
GRANT CREATE ON SCHEMA langfuse_integrations TO langfuse_app;

-- Create monitoring views for performance tracking
CREATE OR REPLACE VIEW langfuse_analytics.performance_metrics AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples
FROM pg_stat_user_tables
WHERE schemaname LIKE 'langfuse%';

-- Create backup user for automated backups
CREATE USER IF NOT EXISTS langfuse_backup WITH PASSWORD '${LANGFUSE_BACKUP_PASSWORD:-langfuse_backup_secure_password}';
GRANT CONNECT ON DATABASE langfuse TO langfuse_backup;
GRANT USAGE ON SCHEMA langfuse_core TO langfuse_backup;
GRANT USAGE ON SCHEMA langfuse_analytics TO langfuse_backup;
GRANT USAGE ON SCHEMA langfuse_integrations TO langfuse_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA langfuse_core TO langfuse_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA langfuse_analytics TO langfuse_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA langfuse_integrations TO langfuse_backup;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA langfuse_core GRANT SELECT ON TABLES TO langfuse_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA langfuse_analytics GRANT SELECT ON TABLES TO langfuse_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA langfuse_integrations GRANT SELECT ON TABLES TO langfuse_backup;

-- Create integration table for linking with main SambaTV app (Task 7 preparation)
CREATE TABLE IF NOT EXISTS langfuse_integrations.prompt_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    main_app_prompt_id UUID NOT NULL,
    langfuse_prompt_id UUID,
    langfuse_trace_id UUID,
    integration_type VARCHAR(50) NOT NULL DEFAULT 'test',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Create index for fast lookups from main app
CREATE INDEX IF NOT EXISTS idx_prompt_links_main_app_id ON langfuse_integrations.prompt_links (main_app_prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_links_langfuse_id ON langfuse_integrations.prompt_links (langfuse_prompt_id);

-- Grant permissions on integration table
GRANT ALL ON TABLE langfuse_integrations.prompt_links TO langfuse_app;
GRANT SELECT ON TABLE langfuse_integrations.prompt_links TO langfuse_backup;

-- Performance monitoring setup
-- Log slow queries for optimization
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Reload configuration
SELECT pg_reload_conf();

-- Create initial admin user record
INSERT INTO langfuse_integrations.prompt_links (main_app_prompt_id, integration_type, metadata) 
VALUES (
    gen_random_uuid(), 
    'system', 
    '{"description": "Database initialized for SambaTV AI Platform", "version": "1.0", "agent": "Agent C"}'
) ON CONFLICT DO NOTHING;

COMMENT ON DATABASE langfuse IS 'SambaTV AI Platform - Langfuse Database for Tracing and Analytics';
COMMENT ON SCHEMA langfuse_core IS 'Core Langfuse application data';
COMMENT ON SCHEMA langfuse_analytics IS 'Analytics and performance metrics';
COMMENT ON SCHEMA langfuse_integrations IS 'Integration with SambaTV main application';