# SambaTV AI Platform Infrastructure

This directory contains the complete infrastructure setup for deploying Langfuse as the SambaTV AI Platform.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Nginx (SSL)   │────▶│  Langfuse App    │────▶│   PostgreSQL    │
│ ai.sambatv.com  │     │ (Node.js/Next)   │     │   (Primary DB)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                           │
                                ├──────────────────────────┤
                                ▼                           ▼
                        ┌─────────────┐           ┌─────────────────┐
                        │    Redis    │           │     MinIO       │
                        │  (Caching)  │           │ (File Storage)  │
                        └─────────────┘           └─────────────────┘
```

## Quick Start

### 1. Development Setup

```bash
# Copy and configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Start infrastructure services
./setup-infrastructure.sh

# Services will be available at:
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
# - MinIO: localhost:9000 (Console: localhost:9001)
# - pgAdmin: localhost:8080
```

### 2. Production Deployment

```bash
# Build Langfuse image (after forking and customizing)
docker build -t sambatv-ai-platform:latest ../../../sambatv-ai-platform/

# Deploy with production configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Set up SSL certificates
./scripts/setup-ssl.sh ai.sambatv.com
```

## Infrastructure Components

### Core Services

1. **PostgreSQL 15**
   - Primary database for Langfuse
   - Configured with UUID and crypto extensions
   - Automatic backups enabled
   - Connection pooling ready

2. **Redis 7**
   - Session storage and caching
   - Configured with AOF persistence
   - Memory limit: 2GB (production)
   - LRU eviction policy

3. **MinIO**
   - S3-compatible object storage
   - For file uploads and exports
   - Web console for management
   - Automatic bucket creation

### Supporting Services

4. **Nginx**
   - Reverse proxy with SSL termination
   - Rate limiting configured
   - WebSocket support
   - Security headers included

5. **Monitoring Stack**
   - Prometheus for metrics collection
   - Grafana for visualization
   - Pre-configured dashboards
   - Alert rules included

6. **Backup Service**
   - Daily automated backups
   - 7-day retention policy
   - Optional S3 upload
   - Point-in-time recovery

## Environment Variables

Key variables to configure in `.env`:

```bash
# Database
POSTGRES_PASSWORD=<secure-password>

# Redis
REDIS_PASSWORD=<secure-password>

# Object Storage
MINIO_ROOT_USER=<admin-user>
MINIO_ROOT_PASSWORD=<secure-password>

# Application
NEXTAUTH_SECRET=<same-as-main-app>
GOOGLE_CLIENT_ID=<from-main-app>
GOOGLE_CLIENT_SECRET=<from-main-app>

# AI APIs
ANTHROPIC_API_KEY=<your-key>
GOOGLE_GEMINI_API_KEY=<your-key>
OPENROUTER_API_KEY=<your-key>
```

## Security Considerations

1. **Network Isolation**
   - All services communicate via internal Docker network
   - Only Nginx exposed to public internet
   - Database ports not exposed in production

2. **SSL/TLS**
   - Automatic certificate renewal with Certbot
   - Strong cipher configuration
   - HSTS enabled

3. **Authentication**
   - Google OAuth restricted to @samba.tv domain
   - Session tokens encrypted
   - CSRF protection enabled

4. **Rate Limiting**
   - API endpoints: 10 requests/second
   - General traffic: 30 requests/second
   - Configurable burst limits

## Monitoring & Maintenance

### Health Checks

```bash
# Check all services
docker-compose ps

# Test database connection
docker-compose exec postgres pg_isready

# Check application health
curl https://ai.sambatv.com/health
```

### Backup & Recovery

```bash
# Manual backup
docker-compose exec backup /backup.sh

# Restore from backup
docker-compose exec postgres psql -U langfuse -d langfuse < /backups/postgres/langfuse_20240109_120000.sql

# Check backup status
cat backups/last_backup_status.json
```

### Monitoring Dashboards

- Grafana: https://monitoring.ai.sambatv.com (internal only)
- Prometheus: http://localhost:9090 (development)
- MinIO Console: https://minio.ai.sambatv.com

## Scaling Considerations

1. **Horizontal Scaling**
   - Langfuse app configured for 2 replicas
   - Load balanced via Nginx
   - Session affinity enabled

2. **Database Scaling**
   - Connection pooling configured
   - Read replicas supported
   - Automatic vacuum settings

3. **Storage Scaling**
   - MinIO supports distributed mode
   - Can add more storage nodes
   - Automatic data distribution

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL logs
   docker-compose logs postgres
   
   # Verify credentials
   docker-compose exec postgres psql -U langfuse -c "SELECT 1"
   ```

2. **Redis Memory Issues**
   ```bash
   # Check memory usage
   docker-compose exec redis redis-cli info memory
   
   # Flush cache if needed
   docker-compose exec redis redis-cli FLUSHALL
   ```

3. **SSL Certificate Issues**
   ```bash
   # Renew certificates manually
   docker-compose exec certbot certbot renew --force-renewal
   
   # Restart Nginx
   docker-compose restart nginx
   ```

## Integration with Main App

The infrastructure is designed to integrate seamlessly with the existing SambaTV Prompt Library:

1. **Shared Authentication**
   - Uses same Google OAuth credentials
   - Session compatible between apps

2. **Data Integration**
   - Prompt IDs linked via integration table
   - API endpoints for data exchange
   - Real-time evaluation scores

3. **Unified Experience**
   - Consistent domain structure
   - Shared navigation elements
   - Same user permissions

## Next Steps

1. Fork and customize Langfuse repository
2. Build Docker image with customizations
3. Deploy to staging environment
4. Configure DNS for ai.sambatv.com
5. Run integration tests
6. Deploy to production

For questions or issues, contact the DevOps team.