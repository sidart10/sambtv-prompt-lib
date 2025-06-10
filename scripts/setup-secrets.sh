#!/bin/bash

# SambaTV AI Platform - Secrets Management Setup
# This script configures GitHub secrets for CI/CD pipeline

set -e

echo "🔐 Setting up GitHub Secrets for SambaTV AI Platform"
echo "=================================================="

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   brew install gh"
    echo "   or visit: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub. Please run:"
    echo "   gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is authenticated"

# Function to set a secret
set_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    echo "📝 Setting secret: $secret_name"
    if [ -z "$secret_value" ]; then
        echo "⚠️  Warning: Empty value for $secret_name"
        read -p "Enter value for $secret_name ($description): " -s secret_value
        echo
    fi
    
    echo "$secret_value" | gh secret set "$secret_name"
    echo "✅ Secret $secret_name set successfully"
}

# Database URLs
echo "🗄️  Database Configuration"
echo "------------------------"
set_secret "MAIN_DB_URL" "${MAIN_DB_URL}" "Main application database connection string"
set_secret "LANGFUSE_DB_URL" "${LANGFUSE_DB_URL:-postgresql://langfuse_admin:password@localhost:5433/langfuse}" "Langfuse database connection string (Task 6)"
set_secret "STAGING_MAIN_DB_URL" "${STAGING_MAIN_DB_URL}" "Staging environment main database"
set_secret "STAGING_LANGFUSE_DB_URL" "${STAGING_LANGFUSE_DB_URL}" "Staging environment Langfuse database"
set_secret "PRODUCTION_MAIN_DB_URL" "${PRODUCTION_MAIN_DB_URL}" "Production environment main database"
set_secret "PRODUCTION_LANGFUSE_DB_URL" "${PRODUCTION_LANGFUSE_DB_URL}" "Production environment Langfuse database"

# Authentication
echo "🔑 Authentication Configuration"
echo "------------------------------"
set_secret "NEXTAUTH_SECRET" "${NEXTAUTH_SECRET:-$(openssl rand -base64 32)}" "NextAuth secret key"
set_secret "STAGING_NEXTAUTH_SECRET" "${STAGING_NEXTAUTH_SECRET:-$(openssl rand -base64 32)}" "Staging NextAuth secret"
set_secret "PRODUCTION_NEXTAUTH_SECRET" "${PRODUCTION_NEXTAUTH_SECRET:-$(openssl rand -base64 32)}" "Production NextAuth secret"

# Google OAuth (from existing .env or prompt)
set_secret "GOOGLE_CLIENT_ID" "${GOOGLE_CLIENT_ID}" "Google OAuth Client ID"
set_secret "GOOGLE_CLIENT_SECRET" "${GOOGLE_CLIENT_SECRET}" "Google OAuth Client Secret"

# AI API Keys (from existing setup)
echo "🤖 AI Provider API Keys"
echo "----------------------"
set_secret "ANTHROPIC_API_KEY" "${ANTHROPIC_API_KEY}" "Anthropic Claude API key"
set_secret "GOOGLE_GEMINI_API_KEY" "${GOOGLE_GEMINI_API_KEY}" "Google Gemini API key"
set_secret "OPENROUTER_API_KEY" "${OPENROUTER_API_KEY}" "OpenRouter API key"

# Supabase Configuration
echo "📊 Supabase Configuration"
echo "------------------------"
set_secret "NEXT_PUBLIC_SUPABASE_URL" "${NEXT_PUBLIC_SUPABASE_URL}" "Supabase project URL"
set_secret "NEXT_PUBLIC_SUPABASE_ANON_KEY" "${NEXT_PUBLIC_SUPABASE_ANON_KEY}" "Supabase anonymous key"
set_secret "SUPABASE_SERVICE_ROLE_KEY" "${SUPABASE_SERVICE_ROLE_KEY}" "Supabase service role key"

# Redis Configuration
echo "🔴 Redis Configuration"
echo "---------------------"
set_secret "REDIS_PASSWORD" "${REDIS_PASSWORD:-$(openssl rand -base64 16)}" "Redis password"
set_secret "STAGING_REDIS_PASSWORD" "${STAGING_REDIS_PASSWORD:-$(openssl rand -base64 16)}" "Staging Redis password"
set_secret "PRODUCTION_REDIS_PASSWORD" "${PRODUCTION_REDIS_PASSWORD:-$(openssl rand -base64 16)}" "Production Redis password"

# MinIO/S3 Configuration
echo "📦 Object Storage Configuration"
echo "------------------------------"
set_secret "MINIO_ACCESS_KEY" "${MINIO_ACCESS_KEY:-$(openssl rand -hex 8)}" "MinIO access key"
set_secret "MINIO_SECRET_KEY" "${MINIO_SECRET_KEY:-$(openssl rand -base64 24)}" "MinIO secret key"

# pgAdmin Configuration
echo "🛠️  Database Administration"
echo "--------------------------"
set_secret "PGADMIN_PASSWORD" "${PGADMIN_PASSWORD:-$(openssl rand -base64 16)}" "pgAdmin password"
set_secret "GRAFANA_PASSWORD" "${GRAFANA_PASSWORD:-$(openssl rand -base64 16)}" "Grafana admin password"

# SSL Certificate Paths (from Task 11)
echo "🔒 SSL Configuration (Task 11)"
echo "-----------------------------"
set_secret "SSL_CERT_PATH" "${SSL_CERT_PATH:-/etc/letsencrypt/live/ai.sambatv.com/fullchain.pem}" "SSL certificate path"
set_secret "SSL_KEY_PATH" "${SSL_KEY_PATH:-/etc/letsencrypt/live/ai.sambatv.com/privkey.pem}" "SSL private key path"

# Deployment SSH Configuration
echo "🚀 Deployment Configuration"
echo "--------------------------"
echo "📝 Please set up SSH keys for deployment servers:"
echo "   1. Generate SSH key pair: ssh-keygen -t ed25519 -C 'github-actions'"
echo "   2. Add public key to staging/production servers"
echo "   3. Set the private key as GitHub secrets below"

set_secret "STAGING_SSH_KEY" "${STAGING_SSH_KEY}" "SSH private key for staging deployment"
set_secret "STAGING_USER" "${STAGING_USER:-deploy}" "SSH user for staging server"
set_secret "STAGING_HOST" "${STAGING_HOST}" "Staging server hostname/IP"

set_secret "PRODUCTION_SSH_KEY" "${PRODUCTION_SSH_KEY}" "SSH private key for production deployment"
set_secret "PRODUCTION_USER" "${PRODUCTION_USER:-deploy}" "SSH user for production server"
set_secret "PRODUCTION_HOST" "${PRODUCTION_HOST}" "Production server hostname/IP"

# Monitoring and Notifications
echo "📊 Monitoring and Notifications"
echo "------------------------------"
set_secret "SLACK_WEBHOOK" "${SLACK_WEBHOOK}" "Slack webhook URL for deployment notifications"
set_secret "CODECOV_TOKEN" "${CODECOV_TOKEN}" "Codecov token for test coverage"

# Security Scanning
echo "🛡️  Security Configuration"
echo "-------------------------"
echo "📝 Consider setting up:"
echo "   - SNYK_TOKEN for vulnerability scanning"
echo "   - SONAR_TOKEN for code quality analysis"
echo "   - WHITESOURCE_API_KEY for dependency scanning"

# Environment Files
echo "📄 Creating environment templates"
echo "-------------------------------"

# Create .env.example for documentation
cat > .env.example << EOF
# SambaTV AI Platform Environment Configuration
# Copy this file to .env.local and fill in your values

# Database Configuration
MAIN_DB_URL=postgresql://user:password@localhost:5432/sambatv_prompts
LANGFUSE_DB_URL=postgresql://langfuse_admin:password@localhost:5433/langfuse

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Model API Keys
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_GEMINI_API_KEY=AIzaSyD...
OPENROUTER_API_KEY=sk-or-v1-...

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# MinIO/S3
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key

# SSL (from Task 11)
SSL_CERT_PATH=/etc/letsencrypt/live/ai.sambatv.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/ai.sambatv.com/privkey.pem

# Database Administration
PGADMIN_PASSWORD=your-pgadmin-password
GRAFANA_PASSWORD=your-grafana-password
EOF

# Create staging environment template
cat > .env.staging.example << EOF
# Staging Environment Configuration
NODE_ENV=staging
MAIN_DB_URL=\${STAGING_MAIN_DB_URL}
LANGFUSE_DB_URL=\${STAGING_LANGFUSE_DB_URL}
NEXTAUTH_SECRET=\${STAGING_NEXTAUTH_SECRET}
REDIS_PASSWORD=\${STAGING_REDIS_PASSWORD}

# Staging-specific URLs
NEXTAUTH_URL=https://staging.sambatv.com
NEXT_PUBLIC_APP_URL=https://staging.sambatv.com
NEXT_PUBLIC_AI_PLATFORM_URL=https://staging-ai.sambatv.com
EOF

echo ""
echo "🎉 Secrets setup complete!"
echo "=========================="
echo ""
echo "✅ All GitHub secrets have been configured"
echo "✅ Environment templates created (.env.example, .env.staging.example)"
echo "✅ CI/CD pipeline ready for deployment"
echo ""
echo "📋 Next steps:"
echo "1. Review GitHub repository secrets in the Settings tab"
echo "2. Test the CI/CD pipeline with a test commit"
echo "3. Configure monitoring dashboards"
echo "4. Set up alerting for production deployments"
echo ""
echo "🔧 For local development:"
echo "1. Copy .env.example to .env.local"
echo "2. Fill in your local values"
echo "3. Run 'npm run dev' to start development server"
echo ""
echo "🚀 Ready for Task 12 Docker deployment testing!"