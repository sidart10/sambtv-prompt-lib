# SambaTV AI Platform Runbooks
**Task 13: Comprehensive Monitoring & Alerts**  
**Agent C Implementation**

This directory contains operational runbooks for responding to alerts from the SambaTV AI Platform monitoring system.

## 🚨 Alert Response Overview

### Severity Levels

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| **CRITICAL** | Service outage, data loss risk | < 15 minutes | PagerDuty → On-call Engineer |
| **WARNING** | Degraded performance, potential issues | < 1 hour | Slack → Platform Team |
| **INFO** | Informational, trends | < 24 hours | Email → Operations |

### Communication Channels

- **Slack**: `#ai-platform-alerts` (all alerts)
- **Email**: `ops@samba.tv` (critical), `platform-team@samba.tv` (warnings)
- **PagerDuty**: Critical alerts only
- **Grafana**: https://grafana.ai.sambatv.com

## 📚 Available Runbooks

### Service Availability
- [Service Down](./service-down.md) - When applications or services are unreachable
- [Database Connection](./database-connection.md) - Database connectivity issues
- [SSL Certificate](./ssl-renewal.md) - Certificate expiry warnings

### Performance Issues
- [High Response Time](./high-response-time.md) - API latency issues
- [High Error Rate](./high-error-rate.md) - Increased error responses
- [Container Resources](./container-memory.md) - Memory/CPU usage alerts

### AI Platform Specific
- [AI Cost Control](./ai-cost-control.md) - High token usage costs
- [AI Provider Failure](./ai-provider-failure.md) - Model API failures
- [Tracing Overload](./tracing-overload.md) - Trace system performance

### Infrastructure
- [Disk Space](./disk-space.md) - Low storage alerts
- [Redis Memory](./redis-memory.md) - Cache memory issues
- [Database Connections](./db-connections.md) - Connection pool exhaustion
- [Load Balancer](./nginx-upstream.md) - Nginx upstream failures

### Security
- [Unauthorized Access](./unauthorized-access.md) - Authentication failures
- [Rate Limits](./rate-limits.md) - Rate limiting violations

## 🛠️ General Response Procedures

### Step 1: Acknowledge
1. Check Slack alert in `#ai-platform-alerts`
2. Acknowledge in PagerDuty (if critical)
3. Verify alert in Grafana dashboard

### Step 2: Assess
1. Check service status: https://ai.sambatv.com/api/health
2. Review recent deployments and changes
3. Check related services and dependencies

### Step 3: Investigate
1. Follow specific runbook for alert type
2. Check application logs
3. Review metrics in Grafana
4. Test functionality manually

### Step 4: Mitigate
1. Apply immediate fixes if available
2. Scale resources if needed
3. Contact relevant team members
4. Document actions taken

### Step 5: Resolve
1. Verify issue is resolved
2. Update status in incident channel
3. Schedule post-incident review if needed
4. Update runbooks with lessons learned

## 🔧 Common Tools & Commands

### Kubernetes/Docker Commands
```bash
# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker logs <container-name> --tail 100 -f

# Restart service
docker-compose -f docker-compose.production.yml restart <service>

# Scale service
docker-compose -f docker-compose.production.yml scale <service>=3
```

### Database Queries
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;
```

### Monitoring URLs
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/sambatv2025)
- **Alertmanager**: http://localhost:9093

## 📞 Emergency Contacts

### Platform Team
- **Primary On-call**: Check PagerDuty rotation
- **Backup**: platform-team@samba.tv
- **Engineering Manager**: [Contact Info]

### External Services
- **AI Providers**: 
  - Anthropic: [Support Contact]
  - Google Cloud: [Support Contact]
  - OpenRouter: [Support Contact]
- **Infrastructure**: 
  - Cloud Provider: [Support Contact]
  - SSL Provider: Let's Encrypt (automated)

## 📊 Key Metrics to Monitor

### Service Health
- Service uptime (target: 99.9%)
- Response time p95 (target: < 2s)
- Error rate (target: < 1%)

### AI Platform
- Token usage cost (alert: > $100/hour)
- Active traces (alert: > 10,000)
- Model availability (target: 99.5%)

### Infrastructure
- CPU usage (alert: > 80%)
- Memory usage (alert: > 90%)
- Disk space (alert: < 10% free)

## 📝 Incident Documentation

For all incidents:
1. Create incident in `#ai-platform-incidents`
2. Use incident template in Slack
3. Update status page if customer-facing
4. Schedule post-incident review for critical issues

## 🔄 Runbook Maintenance

- Review quarterly with platform team
- Update after each major incident
- Test procedures during maintenance windows
- Keep contact information current