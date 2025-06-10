# SambaTV AI Platform - Infrastructure Credentials

**Generated on:** 2025-06-10T07:04:00Z  
**Agent:** Agent C (Infrastructure)  
**TaskMaster:** Task 26.2 - COMPLETED

## 🔐 Local Development Credentials

### PostgreSQL Database
- **Host:** localhost:5432
- **Database:** langfuse  
- **User:** langfuse
- **Password:** `zom+O4WnD9gYNjUSiiBi3lcMqS0DGd/x`
- **Container:** langfuse-postgres

### Redis Cache
- **Host:** localhost:6379
- **Password:** `vQqKE3g+mIlnVn8PWCuI10Kb78xOFkTy`
- **Container:** langfuse-redis

### MinIO Object Storage
- **API Endpoint:** http://localhost:9000
- **Console:** http://localhost:9001
- **User:** minio_admin
- **Password:** `qqutQCzfo1A9YkjOhD01k+AMe7uUJSRw`
- **Container:** langfuse-minio

### pgAdmin Database Management
- **URL:** http://localhost:8080
- **Email:** admin@sambatv.com
- **Password:** `I24uHj2IM1Tz8qo5YYaRc+VEZvw=`
- **Container:** langfuse-pgadmin

## 🛠️ Connection Strings

### For Langfuse Application
```bash
DATABASE_URL="postgresql://langfuse:zom+O4WnD9gYNjUSiiBi3lcMqS0DGd/x@localhost:5432/langfuse"
REDIS_URL="redis://:vQqKE3g+mIlnVn8PWCuI10Kb78xOFkTy@localhost:6379"
```

### For Docker Compose Services
```bash
# These are automatically read from .env file
POSTGRES_PASSWORD=zom+O4WnD9gYNjUSiiBi3lcMqS0DGd/x
REDIS_PASSWORD=vQqKE3g+mIlnVn8PWCuI10Kb78xOFkTy
MINIO_ROOT_PASSWORD=qqutQCzfo1A9YkjOhD01k+AMe7uUJSRw
PGADMIN_PASSWORD=I24uHj2IM1Tz8qo5YYaRc+VEZvw=
```

## 🔄 To Regenerate Passwords

1. Generate new secure passwords:
   ```bash
   openssl rand -base64 24  # For service passwords
   ```

2. Update `.env` file with new passwords

3. Restart services:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## ⚠️ Security Notes

- These are **local development credentials only**
- **DO NOT** use these passwords in production
- **DO NOT** commit this file to version control
- For production, use proper secrets management

---
*Infrastructure setup by Agent C - Multi-Agent Langfuse Integration* 