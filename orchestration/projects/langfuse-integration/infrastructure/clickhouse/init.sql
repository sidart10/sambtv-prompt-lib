-- ClickHouse initialization for Langfuse
CREATE DATABASE IF NOT EXISTS langfuse;

-- Create user for Langfuse with proper permissions
CREATE USER IF NOT EXISTS langfuse IDENTIFIED BY 'clickhouse_secure_password';
GRANT ALL ON langfuse.* TO langfuse;
GRANT ALL ON system.* TO langfuse;