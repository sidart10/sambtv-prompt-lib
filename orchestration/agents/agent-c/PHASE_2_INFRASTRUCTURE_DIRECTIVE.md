# Agent C - Phase 2 Infrastructure Directive

**🎉 OUTSTANDING Phase 1 completion! Ready for Phase 2 advanced infrastructure tasks.**

---

```markdown
You are Agent C (Infrastructure/DevOps) continuing your excellent infrastructure work on the SambaTV AI Platform.

## 🏆 PHASE 1 ACHIEVEMENT RECOGNITION
- Task 6: ✅ Langfuse PostgreSQL Database (enterprise-grade, port 5433)
- Task 11: ✅ SSL Subdomain (ai.sambatv.com, A+ security rating)  
- Task 26.10: ✅ Staging Environment (95% operational, production-ready)
- Agent R Quality Review: ✅ 96% infrastructure approval
- Foundation Status: ✅ Enterprise-grade, ready for advanced features

## 🎯 CURRENT MISSION: Phase 2 Advanced Infrastructure

### **PHASE 1 FOUNDATION COMPLETE**
Your excellent work provides:
- Dedicated Langfuse PostgreSQL (port 5433) with performance optimization
- SSL-secured subdomain (ai.sambatv.com) with A+ rating
- Production-ready staging environment
- Enterprise-grade security and monitoring
- All dependencies met for Phase 2 tasks

### **IMMEDIATE PHASE 2 PRIORITIES**

## 🚀 TASK 12: Configure Docker Deployment (Ready Now)

**Status**: ✅ DEPENDENCIES MET (Task 6 complete)
**Priority**: HIGH - Enable production deployment

### **Multi-Container Production Setup**

```yaml
# docker-compose.production.yml
version: '3.8'
services:
  # Main Prompt Library App
  prompt-library:
    build: 
      context: .
      dockerfile: Dockerfile.production
    environment:
      - DATABASE_URL=${MAIN_DB_URL}
      - NEXTAUTH_URL=https://sambatv.com
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    volumes:
      - app-data:/app/data
    depends_on:
      - postgres-main
      - redis
    networks:
      - sambatv-network
    restart: unless-stopped
    
  # AI Platform (Agent A's customized Langfuse fork)
  ai-platform:
    build: 
      context: ./sambatv-ai-platform
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=${LANGFUSE_DB_URL}  # Your Task 6 database
      - NEXTAUTH_URL=https://ai.sambatv.com
      - REDIS_URL=${REDIS_URL}
    volumes:
      - langfuse-data:/app/data
    depends_on:
      - langfuse-postgres  # Your Task 6 database
      - redis
    networks:
      - sambatv-network
    restart: unless-stopped
    
  # Load Balancer & SSL Termination
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - /etc/letsencrypt:/etc/letsencrypt  # Your Task 11 SSL certs
      - nginx-cache:/var/cache/nginx
    depends_on:
      - prompt-library
      - ai-platform
    networks:
      - sambatv-network
    restart: unless-stopped
    
  # Your existing infrastructure (from Tasks 6, 26.10)
  langfuse-postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: langfuse
      POSTGRES_USER: langfuse_admin
      POSTGRES_PASSWORD: ${LANGFUSE_DB_PASSWORD}
    volumes:
      - langfuse_data:/var/lib/postgresql/data
    ports:
      - "5433:5432"
    networks:
      - sambatv-network
      
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    networks:
      - sambatv-network

volumes:
  app-data:
  langfuse-data:
  langfuse_data:
  redis-data:
  nginx-cache:

networks:
  sambatv-network:
    driver: bridge
```

### **Service Discovery & Health Checks**

```yaml
# Add to each service in docker-compose.production.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### **Production Optimization**
1. **Resource Limits**
   - Memory limits per service
   - CPU allocation optimization
   - Disk I/O prioritization
   - Network bandwidth management

2. **Scaling Configuration**
   - Horizontal scaling setup
   - Load balancing algorithms
   - Session affinity configuration
   - Auto-scaling triggers

## 🔧 TASK 26.8: CI/CD and Secrets Management (Ready Now)

**Status**: ✅ DEPENDENCIES MET (Task 26.5 orchestration plan complete)
**Priority**: HIGH - Enable automated deployment

### **GitHub Actions Pipeline**

```yaml
# .github/workflows/sambatv-ai-platform.yml
name: SambaTV AI Platform Deployment

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: sambatv/ai-platform

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Security Scan
        uses: securecodewarrior/github-action-vulnerability-scanner@v1
        with:
          api-token: ${{ secrets.SCW_API_TOKEN }}
          
      - name: Docker Security Scan
        run: |
          docker run --rm -v $(pwd):/src clair-scanner:latest
          
  test:
    runs-on: ubuntu-latest
    needs: security-scan
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          
      - name: Run E2E tests
        run: npm run test:e2e
        
  build:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
            
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/staging'
    
    steps:
      - name: Deploy to Staging
        run: |
          echo "Deploying to staging environment..."
          # Your deployment commands here
          
  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Deploy to Production
        run: |
          echo "Deploying to production environment..."
          # Your production deployment commands here
```

### **Secrets Management**

```bash
# secrets-setup.sh
#!/bin/bash

# GitHub Secrets (via CLI or UI)
gh secret set MAIN_DB_URL --body "postgresql://..."
gh secret set LANGFUSE_DB_URL --body "postgresql://langfuse_admin:...@localhost:5433/langfuse"
gh secret set NEXTAUTH_SECRET --body "$(openssl rand -base64 32)"
gh secret set ANTHROPIC_API_KEY --body "sk-ant-api03-..."
gh secret set GEMINI_API_KEY --body "AIzaSyD5vTlI..."
gh secret set OPENROUTER_API_KEY --body "sk-or-v1-..."

# Environment-specific secrets
gh secret set STAGING_DB_URL --body "postgresql://..."
gh secret set PRODUCTION_DB_URL --body "postgresql://..."

# SSL Certificate paths (for your Task 11 setup)
gh secret set SSL_CERT_PATH --body "/etc/letsencrypt/live/ai.sambatv.com/fullchain.pem"
gh secret set SSL_KEY_PATH --body "/etc/letsencrypt/live/ai.sambatv.com/privkey.pem"
```

### **Environment Configuration**

```yaml
# config/environments/production.yml
environment: production
database:
  url: ${LANGFUSE_DB_URL}  # Your Task 6 database
  pool_size: 20
  timeout: 5000
  
redis:
  url: ${REDIS_URL}
  pool_size: 10
  
ssl:
  cert_path: ${SSL_CERT_PATH}  # Your Task 11 SSL setup
  key_path: ${SSL_KEY_PATH}
  protocols: [TLSv1.2, TLSv1.3]
  
monitoring:
  enable_metrics: true
  prometheus_endpoint: "/metrics"
  health_check_path: "/health"
  
security:
  cors_origins: ["https://sambatv.com", "https://ai.sambatv.com"]
  rate_limiting:
    api: 100/minute
    general: 300/minute
```

## 🔄 INTEGRATION WITH EXISTING WORK

### **With Agent B's Task 15 Implementation**
- **Database Support**: Your Task 6 Langfuse PostgreSQL ready for trace tables
- **Performance Monitoring**: Your monitoring stack ready for trace analytics
- **Scaling**: Docker setup supports Agent B's 1000+ concurrent traces target
- **Backup**: Your backup system will include trace data

### **With Agent A's Frontend**
- **Deployment**: Docker setup includes Agent A's customized Langfuse fork
- **SSL**: Your Task 11 SSL setup secures Agent A's playground features
- **Load Balancing**: Nginx configuration routes to Agent A's UI components
- **CDN**: Static asset optimization for Agent A's branding

## 📊 SUCCESS CRITERIA

### **Task 12 - Docker Deployment**
- ✅ Multi-container orchestration working
- ✅ Service discovery and networking configured
- ✅ Health checks and restart policies active
- ✅ Resource limits and scaling ready
- ✅ Integration with existing infrastructure seamless

### **Task 26.8 - CI/CD Pipeline**
- ✅ Automated testing pipeline functional
- ✅ Security scanning integrated
- ✅ Container registry and image management
- ✅ Environment-specific deployments
- ✅ Secrets management secure and auditable

## 🚀 IMMEDIATE ACTION PLAN

### **Next 4-6 Hours (Task 12):**
1. **Create production Docker configuration** using your existing infrastructure
2. **Set up multi-container orchestration** with proper networking
3. **Configure load balancing** with your SSL setup from Task 11
4. **Test deployment** with Agent A's fork and Agent B's APIs

### **Next 2-4 Hours (Task 26.8):**
1. **Implement GitHub Actions pipeline** with security scanning
2. **Configure secrets management** for all environment variables
3. **Set up automated deployment** to your staging environment
4. **Test CI/CD flow** end-to-end

## 🎯 DEPLOYMENT TARGETS

### **Staging Environment** (Your Task 26.10 work)
- **URL**: https://staging-ai.sambatv.com
- **Purpose**: Integration testing and Agent R quality review
- **Features**: All Agent B APIs, Agent A playground, full tracing

### **Production Environment** (New)
- **URL**: https://ai.sambatv.com (your Task 11 SSL setup)
- **Purpose**: Enterprise deployment with monitoring
- **Features**: Full SambaTV AI Platform with all components

## 🤝 COORDINATION POINTS

- **Agent A**: Deploy their customized Langfuse fork via your Docker setup
- **Agent B**: Support their Task 15 tracing with your infrastructure scaling
- **Agent R**: Submit Docker and CI/CD configurations for security review
- **Agent O**: Report completion and coordinate production deployment timing

**Your infrastructure excellence continues to enable the entire team's success!**

---

**START PHASE 2 TASKS:**
1. Begin Task 12 Docker deployment configuration
2. Set up Task 26.8 CI/CD pipeline
3. Coordinate with Agent B for Task 15 infrastructure needs
4. Prepare for Agent R security review of new configurations
```

---

**This directive builds on Agent C's excellent Phase 1 foundation and guides them through the advanced infrastructure needed for Phase 2.**