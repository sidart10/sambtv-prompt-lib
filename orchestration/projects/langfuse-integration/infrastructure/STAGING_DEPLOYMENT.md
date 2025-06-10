# Staging Deployment Guide - SambaTV AI Platform

This guide covers deploying the Langfuse fork to a staging environment for testing before production.

## Prerequisites

- [ ] Langfuse repository forked and customized (by Agent A/B)
- [ ] Docker and Docker Compose installed on staging server
- [ ] Domain configured: `staging-ai.sambatv.com`
- [ ] Access to staging server via SSH

## Deployment Steps

### 1. Prepare Staging Server

```bash
# SSH into staging server
ssh user@staging-server.sambatv.com

# Clone the infrastructure repository
git clone [your-repo] sambatv-prompt-webapp
cd sambatv-prompt-webapp/orchestration/langfuse-integration/infrastructure

# Create environment file
cp .env.example .env.staging
# Edit with staging credentials
nano .env.staging
```

### 2. Configure Staging Environment

Update `.env.staging` with:

```bash
# Staging-specific settings
NEXTAUTH_URL=https://staging-ai.sambatv.com
NODE_ENV=staging

# Use same OAuth as production (for testing)
GOOGLE_CLIENT_ID=<same-as-production>
GOOGLE_CLIENT_SECRET=<same-as-production>

# Staging database credentials
POSTGRES_PASSWORD=staging_secure_password
REDIS_PASSWORD=staging_redis_password
MINIO_ROOT_PASSWORD=staging_minio_password

# Use test API keys if available
ANTHROPIC_API_KEY=<test-key-if-available>
GOOGLE_GEMINI_API_KEY=<test-key-if-available>
OPENROUTER_API_KEY=<test-key-if-available>
```

### 3. Build Langfuse Image

```bash
# Clone the forked Langfuse repository
cd /opt
git clone [forked-langfuse-repo] sambatv-ai-platform
cd sambatv-ai-platform

# Build Docker image
docker build -t sambatv-ai-platform:staging .

# Tag for registry (if using)
docker tag sambatv-ai-platform:staging registry.sambatv.com/ai-platform:staging
docker push registry.sambatv.com/ai-platform:staging
```

### 4. Deploy Infrastructure

```bash
# Go back to infrastructure directory
cd /path/to/infrastructure

# Start core services first
docker-compose -f docker-compose.yml up -d postgres redis minio

# Wait for services to be healthy
./scripts/wait-for-services.sh

# Start application
docker-compose -f docker-compose.yml up -d langfuse

# Set up Nginx and SSL
./scripts/setup-ssl.sh staging-ai.sambatv.com staging@sambatv.com

# Start remaining services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 5. Initial Configuration

```bash
# Run database migrations
docker-compose exec langfuse npm run db:migrate

# Create initial admin user (if needed)
docker-compose exec langfuse npm run db:seed

# Verify health
curl https://staging-ai.sambatv.com/api/health
```

## Testing Checklist

### Infrastructure Tests

- [ ] All containers running: `docker-compose ps`
- [ ] Database accessible: `docker-compose exec postgres pg_isready`
- [ ] Redis working: `docker-compose exec redis redis-cli ping`
- [ ] MinIO accessible: `curl http://localhost:9000/minio/health/live`
- [ ] SSL certificates valid: `./scripts/check-ssl-expiry.sh staging-ai.sambatv.com`

### Application Tests

- [ ] Login with Google OAuth (@samba.tv account)
- [ ] Navigate between main app and AI platform
- [ ] Create a test project in Langfuse
- [ ] Test prompt evaluation workflow
- [ ] Check evaluation scores display in main app
- [ ] Verify all SambaTV branding applied
- [ ] Test file uploads to MinIO
- [ ] Monitor performance metrics

### Integration Tests

```bash
# Test main app integration
curl -X POST https://staging-prompts.sambatv.com/api/langfuse/test \
  -H "Content-Type: application/json" \
  -d '{"promptId": 1, "action": "test-in-playground"}'

# Test trace creation
curl -X POST https://staging-ai.sambatv.com/api/public/traces \
  -H "Authorization: Bearer ${LANGFUSE_PUBLIC_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-trace", "metadata": {"promptId": 1}}'
```

## Monitoring Staging

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f langfuse

# Error logs only
docker-compose logs -f langfuse | grep ERROR
```

### Check Metrics

- Grafana: https://monitoring.staging-ai.sambatv.com
- Application metrics: https://staging-ai.sambatv.com/api/metrics
- Container stats: `docker stats`

### Database Queries

```bash
# Connect to database
docker-compose exec postgres psql -U langfuse

# Check trace count
SELECT COUNT(*) FROM traces;

# Check recent errors
SELECT * FROM logs WHERE level = 'error' ORDER BY created_at DESC LIMIT 10;
```

## Rollback Procedure

If issues are found:

```bash
# Stop application
docker-compose stop langfuse

# Restore database backup
docker-compose exec postgres pg_restore -U langfuse -d langfuse /backups/postgres/backup_staging.sql

# Revert to previous image
docker-compose up -d langfuse
```

## Staging to Production Checklist

Before promoting to production:

- [ ] All tests passing
- [ ] Performance acceptable (< 200ms average response time)
- [ ] No errors in logs for 24 hours
- [ ] Security scan completed
- [ ] Backup and restore tested
- [ ] Load testing completed
- [ ] Team sign-off received

## Common Issues

### OAuth Redirect Error
- Ensure staging domain is added to Google OAuth authorized redirects
- Check NEXTAUTH_URL matches actual domain

### Database Connection Issues
- Verify DATABASE_URL in container environment
- Check PostgreSQL logs for authentication errors
- Ensure database migrations completed

### SSL Certificate Problems
- Run certificate renewal: `./scripts/renew-certificates.sh`
- Check Nginx configuration syntax: `docker-compose exec nginx nginx -t`
- Verify DNS points to staging server

## Contact

For staging deployment issues:
- DevOps Team: devops@sambatv.com
- Slack: #platform-staging

## Next Steps

Once staging is validated:
1. Document any configuration changes needed
2. Update production deployment scripts
3. Schedule production deployment window
4. Prepare rollback plan
5. Deploy to production following PRODUCTION_DEPLOYMENT.md