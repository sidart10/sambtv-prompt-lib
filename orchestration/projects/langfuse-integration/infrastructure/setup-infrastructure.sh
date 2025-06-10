#!/bin/bash

# Langfuse Infrastructure Setup Script
# Agent C - Infrastructure/DevOps

set -e

echo "🚀 SambaTV AI Platform Infrastructure Setup"
echo "=========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual credentials!"
    echo "   Especially the OAuth and API keys from the main app."
    read -p "Press enter after updating .env file..."
fi

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p init-scripts
mkdir -p backups
mkdir -p logs

# Create PostgreSQL initialization script
cat > init-scripts/01-init-langfuse.sql << 'EOF'
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
EOF

# Function to wait for service
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service to be ready..."
    while ! nc -z localhost $port 2>/dev/null; do
        if [ $attempt -eq $max_attempts ]; then
            echo "❌ $service failed to start after $max_attempts attempts"
            return 1
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done
    echo " ✓"
    return 0
}

# Start infrastructure services
echo "🐳 Starting infrastructure services..."
docker-compose up -d postgres redis minio pgadmin

# Wait for services to be ready
wait_for_service "PostgreSQL" 5432
wait_for_service "Redis" 6379
wait_for_service "MinIO" 9000
wait_for_service "pgAdmin" 8080

# Create MinIO bucket
echo "🪣 Creating MinIO bucket..."
docker-compose exec -T minio sh -c "
    mc alias set local http://localhost:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD &&
    mc mb local/langfuse-uploads --ignore-existing &&
    mc anonymous set download local/langfuse-uploads
"

# Test database connection
echo "🔍 Testing database connection..."
docker-compose exec -T postgres psql -U langfuse -d langfuse -c "SELECT version();"

# Display service URLs
echo ""
echo "✅ Infrastructure services are running!"
echo ""
echo "📍 Service URLs:"
echo "   PostgreSQL: localhost:5432"
echo "   Redis: localhost:6379"
echo "   MinIO Console: http://localhost:9001"
echo "   pgAdmin: http://localhost:8080"
echo ""
echo "🔐 Default Credentials (update in production!):"
echo "   PostgreSQL: langfuse / [password in .env]"
echo "   Redis: [password in .env]"
echo "   MinIO: [credentials in .env]"
echo "   pgAdmin: admin@sambatv.com / [password in .env]"
echo ""
echo "📝 Next Steps:"
echo "   1. Fork and clone Langfuse repository"
echo "   2. Configure Langfuse to use these services"
echo "   3. Run Langfuse application with docker-compose"
echo ""

# Create deployment status file
cat > infrastructure-status.json << EOF
{
  "status": "ready",
  "services": {
    "postgres": "running",
    "redis": "running",
    "minio": "running",
    "pgadmin": "running"
  },
  "ports": {
    "postgres": 5432,
    "redis": 6379,
    "minio_api": 9000,
    "minio_console": 9001,
    "pgadmin": 8080
  },
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "💾 Infrastructure status saved to infrastructure-status.json"