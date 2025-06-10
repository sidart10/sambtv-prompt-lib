# Agent C - Wave 3 Deployment Prompt

You are Agent C (Infrastructure) continuing your work on the SambaTV AI Platform integration. You've successfully completed Task 26.2 (Infrastructure setup). Now you have TWO remaining tasks to complete the integration.

## Your Current Status
- ✅ **Task 26.2**: Infrastructure Provisioned - COMPLETE
- ⏳ **Task 26.8**: Configure CI/CD and Secrets Management - PENDING
- ⏳ **Task 26.10**: Deploy Staging Environment - PENDING (NO DEPENDENCIES - Can start NOW!)

## Your Wave 3 Mission

**MANDATORY: Use TaskMaster MCP tools throughout your work:**

1. **START** by checking your current status:
   ```
   get_task --id=26
   get_tasks --with-subtasks
   ```

2. **For EACH subtask you work on:**
   - Mark it as in-progress: `set_task_status --id=[subtask-id] --status=in-progress`
   - Update progress regularly: `update_subtask --id=[subtask-id] --prompt="[Agent C] Detailed progress update"`
   - Mark complete when done: `set_task_status --id=[subtask-id] --status=done`

3. **Your Remaining Tasks:**

   **Task 1: Deploy Staging Environment** (Task 26.10) - START THIS FIRST!
   **No dependencies - Can begin immediately!**
   - Navigate to Agent A's fork at `/sambatv-ai-platform`
   - Build the Docker image:
     ```bash
     docker build -t sambatv-ai-platform:latest .
     ```
   - Deploy to staging using your docker-compose.prod.yml
   - Configure ai.sambatv.com subdomain with SSL:
     ```bash
     ./scripts/setup-ssl.sh
     ```
   - Run end-to-end integration tests
   - Verify all agent components work together
   - Validate infrastructure in near-production setting
   - Update TaskMaster: `set_task_status --id=26.10 --status=done`

   **Task 2: Configure CI/CD and Secrets Management** (Task 26.8)
   **Dependencies: Needs Task 26.5 (Orchestration Plan) from Agent O**
   - Set up CI/CD pipelines for automated deployments
   - Configure secure secrets management:
     - Store API keys securely (never in code)
     - Use GitHub Secrets for sensitive values
     - Implement environment-specific configs
   - Create deployment automation:
     - GitHub Actions workflow
     - Build and push Docker images
     - Automated staging deployments
     - Manual approval for production
   - Integrate with SambaTV's deployment tools
   - Ensure credentials are never exposed in logs
   - Test the complete pipeline
   - Update TaskMaster: `set_task_status --id=26.8 --status=done`

4. **Additional Testing Within Your Tasks:**
   
   **For Staging Deployment (26.10):**
   - Verify Prometheus/Grafana monitoring
   - Run load tests: `ab -n 1000 -c 10 https://ai.sambatv.com/`
   - Test backup/restore procedures
   - Security scan the deployment
   - Check rate limiting and security headers
   - Verify /api/langfuse/health endpoint

   **For CI/CD Setup (26.8):**
   - Ensure no secrets in logs
   - Test rollback procedures
   - Verify build caching works
   - Check deployment notifications

5. **CRITICAL: After completing BOTH tasks:**
   - Update the orchestrator communication log at `/orchestration/monitoring/orchestrator-communication-log.md`
   - Add a new communication entry detailing:
     - Deployment URL and status
     - CI/CD pipeline details
     - Monitoring dashboard links
     - Load test results
     - Any security findings

5. **Coordination Points:**
   - Get the latest Docker image details from Agent A
   - Obtain environment variables from Agent B
   - Provide deployment URL to all agents for testing
   - Share monitoring dashboard access

**Environment Variables to Configure:**
```env
# From Agent B
GOOGLE_CLIENT_ID=201626763325-m89upvbto8ei6oromvckqvtebltqp80.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-TK3BlPluoxYCnjNqPQUSBAl5tj
ANTHROPIC_API_KEY=sk-ant-api03-G2rMSnvtd5Gaap3hQXjz5Z2_ZxYUXCiVxR4JsvmNEqSZU8-Io4QhwclOjy-20BTaB_vIQOLfs2CQMFMKFtOTyw-j4payQAA
GEMINI_API_KEY=AIzaSyD5vTlIhgYwj3o02yKL9cROiP_xPy9uUqE
OPENROUTER_API_KEY=sk-or-v1-a37b4dd731c154f897e1646717f9721Sab500bb2285e6c2d264168b101187a90f

# Your infrastructure
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

**Remember**: Check TaskMaster frequently with `get_tasks --with-subtasks` to see other agents' progress and coordinate effectively.

Project Root: /Users/sid.dani/Desktop/4. Coding Projects/SambaTVPromptWebApp

Begin your Wave 3 deployment work now!