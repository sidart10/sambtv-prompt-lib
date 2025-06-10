# Wave 3 Directives - Integration & Testing Phase

**Time**: 2025-01-10 23:45  
**Phase**: Wave 3 - Integration & Testing (4 hours)  
**Status**: All primary development complete, moving to integration

## Summary of Completed Work

### Agent A (Frontend) ✅
- Forked Langfuse successfully
- Complete white-labeling with SambaTV branding
- Added "Test in AI Platform" button to main app
- Created cross-app navigation
- All UI customization complete

### Agent B (Backend) ✅
- Built complete integration layer (no fork needed!)
- 10+ API endpoints implemented
- Database schemas with triggers
- Session sharing mechanism ready
- Cost/usage tracking implemented

### Agent C (Infrastructure) ✅
- PostgreSQL, Redis, MinIO stack ready
- Docker configurations complete
- SSL and monitoring configured
- Backup automation implemented

## CRITICAL INSTRUCTIONS FOR ALL AGENTS

**MANDATORY WORKFLOW:**
1. Start by checking TaskMaster: `get_task --id=26` and `get_tasks --with-subtasks`
2. Update TaskMaster when starting each subtask: `set_task_status --id=[subtask-id] --status=in-progress`
3. Log progress in TaskMaster: `update_subtask --id=[subtask-id] --prompt="[Agent X] Your detailed progress"`
4. When a subtask is complete: `set_task_status --id=[subtask-id] --status=done`
5. After ALL subtasks for a main task are complete, update the orchestrator communication log

## Wave 3 Assignments

### Agent A - Frontend Integration & Polish
**Primary Tasks:**
1. **Integration Testing**
   - Test "Test in AI Platform" button end-to-end
   - Verify prompt data passes correctly to Langfuse
   - Ensure navigation works bidirectionally
   - Test responsive design on mobile

2. **Connect to Agent B's APIs**
   - Display evaluation scores in main app using `/api/langfuse/sync`
   - Show cost data using `/api/langfuse/analytics`
   - Test session sharing between apps

3. **Final Polish**
   - Fix any remaining branding inconsistencies
   - Optimize performance (bundle size, lazy loading)
   - Create user documentation for new features

**Deliverables:**
- Integration test results
- Performance metrics
- User guide for "Test in AI Platform" feature

### Agent B - Backend Integration & Configuration
**Primary Tasks:**
1. **Connect Langfuse to APIs**
   - Configure Langfuse to use your integration endpoints
   - Set up webhook connections
   - Test data flow both directions
   - Verify session sharing works

2. **Configure Authentication**
   - Implement Google OAuth in Langfuse using existing setup
   - Add @samba.tv domain restriction
   - Test single sign-on between apps
   - Verify session persistence

3. **Model Configuration**
   - Configure all AI providers in Langfuse:
     * Anthropic (key available)
     * Google Gemini (key available)
     * OpenRouter (key available)
   - Test model switching works
   - Verify pricing calculations

**Deliverables:**
- Auth configuration complete
- Model providers configured
- Integration test results
- API performance metrics

### Agent C - Deployment & DevOps
**Primary Tasks:**
1. **Deploy Langfuse to Staging**
   - Build Langfuse Docker image from Agent A's fork
   - Deploy using docker-compose.prod.yml
   - Configure ai.sambatv.com subdomain
   - Set up SSL certificates

2. **CI/CD Configuration (Task 26.8)**
   - Create GitHub Actions workflow
   - Set up automated builds
   - Configure deployment pipeline
   - Implement rollback procedures

3. **Monitoring & Testing**
   - Verify Prometheus/Grafana dashboards
   - Test backup/restore procedures
   - Load test the infrastructure
   - Security scan the deployment

**Deliverables:**
- Staging deployment live at ai.sambatv.com
- CI/CD pipeline configured
- Monitoring dashboards active
- Load test results

## Integration Checkpoints

### Hour 1 (00:45)
- [ ] Langfuse Docker image built
- [ ] Basic deployment working
- [ ] Auth configuration started

### Hour 2 (01:45)
- [ ] Staging deployment accessible
- [ ] Single sign-on working
- [ ] API integration tested

### Hour 3 (02:45)
- [ ] All features integrated
- [ ] Performance testing complete
- [ ] Monitoring active

### Hour 4 (03:45)
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Ready for production

## Critical Integration Points

1. **Authentication Flow**
   ```
   Main App → Google OAuth → Shared Session → Langfuse
   ```

2. **Data Flow**
   ```
   Main App → "Test in AI Platform" → Langfuse Playground
   Langfuse → Webhook → Agent B APIs → Main App Display
   ```

3. **Infrastructure**
   ```
   User → Nginx → Langfuse → PostgreSQL/Redis
                          → Agent B APIs → Supabase
   ```

## Success Criteria
- [ ] Users can click "Test in AI Platform" and see their prompt
- [ ] Single sign-on works seamlessly
- [ ] Evaluation scores appear in main app
- [ ] All models are configured and working
- [ ] Staging deployment is stable
- [ ] Monitoring shows healthy metrics

## Communication Protocol
- Update progress every hour
- Report blockers immediately
- Coordinate on integration points
- Final sync at Hour 4

## Next Phase Preview
Wave 4 (Final 2 hours) will focus on:
- Production deployment
- Final documentation
- Team training materials
- Handoff procedures

---
**Let's complete this integration successfully!**