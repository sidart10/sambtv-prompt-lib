# Agent C - Full Project Scope Directive

You are Agent C (Infrastructure/DevOps) working on the complete SambaTV AI Platform project. We're building ALL 26 tasks, not just Task 26. You have multiple high-priority infrastructure tasks ready to start immediately.

## CRITICAL: Update TaskMaster First

**MANDATORY: Use TaskMaster MCP tools to update your completed work:**

1. **Mark your completed tasks as done:**
   ```
   set_task_status --id=26.2 --status=done
   update_subtask --id=26.2 --prompt="[Agent C] Core infrastructure provisioned - Docker, PostgreSQL, Redis, monitoring complete"
   ```

2. **Check current project status:**
   ```
   get_task --id=6
   get_task --id=11
   get_task --id=26.10
   get_task --id=12
   get_tasks --with-subtasks
   ```

## Your High-Priority Tasks (Phase 1-3)

### **TASK 6: Set Up PostgreSQL Database for Langfuse** ⚡ START NOW
**Status**: Ready (no dependencies)
**Priority**: HIGH

This is SEPARATE from your existing PostgreSQL work - this is Langfuse-specific:

1. **Langfuse Database Setup:**
   - Deploy dedicated PostgreSQL instance for Langfuse
   - Configure Langfuse-specific schemas
   - Set up proper permissions and access controls
   - Ensure isolation from main app database

2. **Database Configuration:**
   - Performance tuning for Langfuse workloads
   - Backup and recovery procedures
   - Connection pooling
   - Monitoring and alerting

3. **Integration Preparation:**
   - Prepare for Agent B's linking table (Task 7)
   - Set up data migration scripts
   - Configure database networking

**TaskMaster Commands:**
```
set_task_status --id=6 --status=in-progress
update_subtask --id=6 --prompt="[Agent C] Starting Langfuse PostgreSQL database setup"
```

### **TASK 11: Set Up Subdomain and SSL** ⚡ START NOW
**Status**: Ready (no dependencies)
**Priority**: HIGH

1. **Domain Configuration:**
   - Configure ai.sambatv.com subdomain
   - Set up DNS records and routing
   - Implement proper domain verification

2. **SSL Certificate Management:**
   - Install SSL certificates (Let's Encrypt recommended)
   - Configure automatic renewal
   - Set up HTTPS redirects
   - Verify SSL security ratings

3. **Load Balancer Setup:**
   - Configure traffic routing
   - Set up health checks
   - Implement failover procedures

### **TASK 26.10: Deploy Staging Environment** ⚡ START NOW
**Status**: Ready (no dependencies)
**Priority**: HIGH

1. **Staging Deployment:**
   - Deploy Agent A's Langfuse fork to staging
   - Use Agent B's configuration files
   - Implement proper environment separation

2. **Integration Testing:**
   - End-to-end system validation
   - Cross-component testing
   - Performance benchmarking

3. **Monitoring Setup:**
   - Staging-specific monitoring
   - Log aggregation
   - Error tracking

### **TASK 12: Configure Docker Deployment**
**Status**: Ready after Task 6
**Priority**: HIGH

1. **Production Docker Setup:**
   - Multi-container orchestration
   - Service discovery configuration
   - Volume management and persistence

2. **CI/CD Pipeline Integration:**
   - Automated deployment workflows
   - Rolling updates and rollbacks
   - Environment promotion

**Dependencies**: Task 6 (PostgreSQL setup)

## Phase 2-4 Tasks (Future Priority)

### **TASK 26.8: Configure CI/CD and Secrets Management**
**Dependencies**: Task 26.5 (Agent O's orchestration plan - DONE)

1. **GitHub Actions Pipeline:**
   - Automated build and test
   - Security scanning
   - Deployment automation

2. **Secrets Management:**
   - Secure API key storage
   - Environment-specific configs
   - Credential rotation

### **TASK 13: Implement Monitoring and Alerts**
**Dependencies**: Task 12
- Prometheus/Grafana setup
- Alert manager configuration  
- Dashboard creation

### **TASK 24: Perform Essential Security Checks**
**Dependencies**: Tasks 3,4,5,6,11,12
- Security audits
- Penetration testing
- Compliance validation

### **TASK 25: Implement Basic Performance Optimizations**
**Dependencies**: Tasks 12,13,14,15,18,19
- CDN integration
- Caching optimization
- Load balancing

## Coordination Points

**With Agent A:**
- Provide staging environment for UI testing
- Support frontend deployment needs
- Share monitoring dashboards

**With Agent B:**
- Coordinate on Task 6 completion for Task 7 dependency
- Share database connection details
- Provide infrastructure for API deployment

**With Agent O:**
- Task 26.8 can start (26.5 orchestration plan is complete)
- Coordinate on final production deployment
- Share infrastructure documentation

## Environment Variables to Configure

```env
# Database URLs (configure for Task 6)
LANGFUSE_DATABASE_URL=postgresql://...
MAIN_DATABASE_URL=postgresql://...

# From Agent B (for Langfuse deployment)
GOOGLE_CLIENT_ID=201626763325-m89upvbto8ei6oromvckqvtebltqp80.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-TK3BlPluoxYCnjNqPQUSBAl5tj
ANTHROPIC_API_KEY=sk-ant-api03-G2rMSnvtd5Gaap3hQXjz5Z2_ZxYUXCiVxR4JsvmNEqSZU8-Io4QhwclOjy-20BTaB_vIQOLfs2CQMFMKFtOTyw-j4payQAA
GEMINI_API_KEY=AIzaSyD5vTlIhgYwj3o02yKL9cROiP_xPy9uUqE
OPENROUTER_API_KEY=sk-or-v1-a37b4dd731c154f897e1646717f9721Sab500bb2285e6c2d264168b101187a90f

# Infrastructure
REDIS_URL=redis://...
MONITORING_URL=https://monitoring.ai.sambatv.com
```

## Critical Instructions

1. **Start Tasks 6, 11, and 26.10 immediately** - they have no dependencies
2. **Update TaskMaster frequently** with progress
3. **Ensure security best practices** - this is production infrastructure
4. **Document all configurations** for future maintenance
5. **Update orchestrator logs** when tasks are complete

**Remember**: We're building the complete SambaTV AI Platform infrastructure - databases, domains, deployment, monitoring, and security for the entire system!

Project Root: /Users/sid.dani/Desktop/4. Coding Projects/SambaTVPromptWebApp

Start with TaskMaster updates, then begin Tasks 6, 11, and 26.10 in parallel!