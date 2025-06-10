# Agent C - Phase 1 Task Continuation Directive

**Excellent staging deployment! Now completing remaining Phase 1 infrastructure tasks.**

---

```markdown
You are Agent C (Infrastructure/DevOps) continuing your outstanding infrastructure work on the SambaTV AI Platform.

## 🎉 CONGRATULATIONS: Task 26.10 Complete!
Your staging deployment is excellent - fully operational infrastructure ready for production. You've provided the solid foundation the team needs.

## 🎯 CURRENT MISSION: Complete Phase 1 Infrastructure Tasks

### **IMMEDIATE PRIORITY: TaskMaster Updates**

**CRITICAL FIRST STEP:** Update TaskMaster with your completed work:

```bash
# Mark completed tasks as done:
set_task_status --id=26.2 --status=done
update_subtask --id=26.2 --prompt="[Agent C] Core infrastructure provisioned - Docker, PostgreSQL, Redis, monitoring complete"

set_task_status --id=26.10 --status=done  
update_subtask --id=26.10 --prompt="[Agent C] Staging environment deployed - Infrastructure 100% operational, ready for Agent A's fork"

# Check your remaining tasks:
get_task --id=6
get_task --id=11
get_task --id=12
get_task --id=26.8
```

## 🚀 IMMEDIATE TASKS (No Dependencies - Start Now):

### **TASK 6: Set Up PostgreSQL Database for Langfuse** ⚡ START NOW

This is SEPARATE from your existing PostgreSQL work - Langfuse-specific database:

#### **Implementation Requirements:**

```yaml
# docker-compose.langfuse-db.yml
services:
  langfuse-postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: langfuse
      POSTGRES_USER: langfuse_admin
      POSTGRES_PASSWORD: ${LANGFUSE_DB_PASSWORD}
    volumes:
      - langfuse_data:/var/lib/postgresql/data
      - ./langfuse-init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5433:5432"  # Different port from main DB
    networks:
      - langfuse-network
    healthcheck:
      test: ["CMD-EXEC", "pg_isready -U langfuse_admin -d langfuse"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### **Database Configuration:**
```sql
-- langfuse-init.sql
-- Langfuse-specific schemas and tables
-- Performance tuning for tracing workloads
-- User permissions and access controls
-- Backup and recovery procedures
```

#### **Integration Setup:**
- Prepare for Agent B's linking table (Task 7) 
- Configure database networking for cross-app access
- Set up monitoring and alerting for Langfuse DB
- Implement backup strategies

### **TASK 11: Set Up Subdomain and SSL** ⚡ START NOW

Configure ai.sambatv.com with production-ready SSL:

#### **Domain Configuration:**

```nginx
# /nginx/conf.d/ai.sambatv.com.conf
server {
    listen 80;
    server_name ai.sambatv.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ai.sambatv.com;
    
    # SSL Certificate Configuration
    ssl_certificate /etc/letsencrypt/live/ai.sambatv.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ai.sambatv.com/privkey.pem;
    
    # SSL Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req zone=api burst=20 nodelay;
    
    location / {
        proxy_pass http://langfuse-app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### **SSL Implementation:**
```bash
# setup-ssl.sh
#!/bin/bash

# Install certbot
apt-get update && apt-get install -y certbot python3-certbot-nginx

# Generate SSL certificate
certbot --nginx -d ai.sambatv.com --non-interactive --agree-tos --email admin@samba.tv

# Set up automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# Test SSL configuration
nginx -t && systemctl reload nginx
```

## 🛠️ PHASE 1 COMPLETION TASKS:

### **TASK 12: Configure Docker Deployment** (After Task 6)

Production Docker setup with multi-container orchestration:

```yaml
# docker-compose.production.yml
version: '3.8'
services:
  # Main App
  prompt-library:
    build: .
    environment:
      - DATABASE_URL=${MAIN_DB_URL}
      - NEXTAUTH_URL=https://sambatv.com
    depends_on:
      - postgres-main
    
  # AI Platform (Agent A's fork)
  ai-platform:
    build: ./sambatv-ai-platform
    environment:
      - DATABASE_URL=${LANGFUSE_DB_URL}
      - NEXTAUTH_URL=https://ai.sambatv.com
    depends_on:
      - langfuse-postgres
    
  # Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx:/etc/nginx/conf.d
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - prompt-library
      - ai-platform
```

## 🎯 FUTURE TASKS (Phase 2):

### **TASK 26.8: Configure CI/CD and Secrets Management**
**Dependencies**: Task 26.5 ✅ (orchestration plan complete)

```yaml
# .github/workflows/deploy.yml
name: SambaTV AI Platform Deployment
on:
  push:
    branches: [main]
  
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        run: npm test
      
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Security Scan
        run: |
          docker run --rm -v $(pwd):/src clair-scanner
          
  deploy:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        run: |
          docker-compose -f docker-compose.production.yml up -d
```

### **TASK 13: Implement Monitoring and Alerts**
**Dependencies**: Task 12

Prometheus/Grafana monitoring stack with comprehensive alerting.

## 📋 COORDINATION POINTS:

### **With Agent A:**
- Provide staging environment for Task 14 playground testing
- Support deployment of customized Langfuse fork
- Share monitoring dashboards for performance optimization

### **With Agent B:**  
- Coordinate on Task 6 completion for Task 7 dependency (linking tables)
- Share database connection details securely
- Provide infrastructure requirements for backend APIs

### **With Agent R:**
- Submit Tasks 6, 11 for review when complete
- Ensure security standards are met
- Document all configurations for review

## 🎯 SUCCESS CRITERIA:

### **Task 6 Complete:**
- Dedicated Langfuse PostgreSQL running on port 5433
- Proper authentication and access controls
- Performance tuned for tracing workloads
- Backup and monitoring configured

### **Task 11 Complete:**
- ai.sambatv.com resolving correctly
- SSL certificate installed and auto-renewing
- Security headers and rate limiting configured
- Load balancer routing to applications

### **Task 12 Complete:**
- Multi-container production setup
- Service discovery and networking
- Volume management and persistence
- Rolling update capabilities

## 🚀 IMMEDIATE ACTION PLAN:

### **Next 2-4 Hours:**
1. **Update TaskMaster** - Mark 26.2, 26.10 as done
2. **Start Task 6** - Langfuse PostgreSQL setup
3. **Start Task 11** - SSL and subdomain configuration
4. **Document progress** in orchestration logs

### **Next 1-2 Days:**
1. **Complete Tasks 6, 11** - Submit for Agent R review
2. **Begin Task 12** - Production Docker configuration  
3. **Prepare Task 26.8** - CI/CD pipeline planning
4. **Support Agent A** - Staging environment for testing

## 📊 CURRENT STATUS:
- **Completed**: Task 26.2 ✅, Task 26.10 ✅
- **In Progress**: Tasks 6, 11 (starting now)
- **Next Phase**: Task 12, 26.8, 13
- **Team Support**: Ready for Agent A deployment needs

**Your infrastructure work is the foundation enabling all other agents. Keep up the excellent work!**

---

**START IMMEDIATELY:**
1. Update TaskMaster with completed work
2. Begin Task 6 (Langfuse PostgreSQL)
3. Begin Task 11 (SSL setup for ai.sambatv.com)
4. Document all configurations for Agent R review
```

---

**This directive builds on Agent C's excellent staging work and focuses them on completing the remaining Phase 1 infrastructure foundation.**