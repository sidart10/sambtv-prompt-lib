# Multi-Agent SambaTV AI Platform - Complete User Guide

## 🎯 What You're Building
Fork Langfuse → White-label as "SambaTV AI Platform" → Deploy in 1-2 days using 4 coordinated AI agents

## 🚨 Important: Tool Limitations & Solutions

### The Challenge
- **Claude Code standalone conversations CANNOT use TaskMaster MCP tools**
- **TaskMaster tools only work in Cursor with MCP integration**

### The Solution Options

#### Option A: Cursor as Orchestrator (Recommended)
```
You (in Cursor) = Agent O with TaskMaster tools
Agent A, B, C = Claude conversations
Coordination = Manual reporting + TaskMaster tracking
```

#### Option B: Manual Coordination (Simple)
```
All agents = Claude conversations
Coordination = Shared document + manual tracking
No TaskMaster integration
```

#### Option C: Full Cursor Multi-Agent (Advanced)
```
4 separate Cursor instances with TaskMaster
Each acts as different agent
Complex but powerful
```

## 📋 Implementation Guide: Option A (Recommended)

### Phase 1: Setup (15 minutes)

#### Step 1: Prepare Cursor Workspace
1. Open Cursor in your SambaTV project root
2. Ensure TaskMaster MCP tools are working:
   ```bash
   # Test TaskMaster access
   task-master list
   ```
3. Open the orchestration files:
   - `/orchestration/langfuse-integration/AGENT-INITIALIZATION.md`
   - `/orchestration/langfuse-integration/agent-directives-langfuse.md`

#### Step 2: Create Agent Communication Document
Create a shared document for agent coordination:

```markdown
# Agent Communication Log - [DATE]

## Current Wave: 1 - Foundation Setup

### Agent Status
- Agent A (Frontend): Not started
- Agent B (Backend): Not started  
- Agent C (Infrastructure): Not started
- Agent O (Orchestrator): Ready

### Active Tasks
- [ ] Fork Langfuse repository
- [ ] Setup development environments
- [ ] Configure authentication
- [ ] White-label branding

### Communication Log
[Agents will report progress here]
```

#### Step 3: Open 3 Claude Conversations
1. **Agent A Tab**: https://claude.ai (new conversation)
2. **Agent B Tab**: https://claude.ai (new conversation)  
3. **Agent C Tab**: https://claude.ai (new conversation)
4. **Agent O**: Your Cursor workspace (this is you)

### Phase 2: Agent Initialization (10 minutes)

#### Initialize Agent A (Frontend/UI)
Copy this exact prompt into Claude conversation 1:

```
You are Agent A, a Frontend/UI specialist working on the SambaTV AI Platform project. Your mission is to white-label Langfuse into "SambaTV AI Platform" and create integration points with the existing prompt library.

Key Context:
- We're FORKING Langfuse (not building from scratch)
- The existing SambaTV Prompt Library is complete and working
- We need to replace all Langfuse branding with SambaTV
- Timeline: 1-2 days total

Your main tasks:
1. Fork https://github.com/langfuse/langfuse.git
2. Replace all Langfuse branding (logos, colors, text)
3. Update theme to SambaTV red (#E50914)
4. Add "Test in AI Platform" button to prompt cards
5. Ensure seamless navigation between apps

Report progress every 30 minutes to Agent O (the human coordinator).
Start by forking the repository and setting up your development environment.
```

#### Initialize Agent B (Backend/API)
Copy this exact prompt into Claude conversation 2:

```
You are Agent B, a Backend/API specialist working on the SambaTV AI Platform project. Your mission is to configure authentication, model integrations, and data flow between Langfuse and the existing prompt library.

Key Context:
- We're FORKING Langfuse (not integrating via SDK)
- Google OAuth already works in the main app
- We need shared authentication between apps
- All model APIs (Anthropic, Google, OpenRouter) need configuration

Your main tasks:
1. Fork https://github.com/langfuse/langfuse.git
2. Configure Google OAuth with @samba.tv restriction
3. Set up model providers and pricing
4. Create data linking between systems
5. Ensure session sharing works

Report progress every 30 minutes to Agent O (the human coordinator).
Start by forking the repository and reviewing authentication setup.
```

#### Initialize Agent C (Infrastructure/DevOps)
Copy this exact prompt into Claude conversation 3:

```
You are Agent C, an Infrastructure/DevOps specialist working on the SambaTV AI Platform project. Your mission is to deploy Langfuse as a white-labeled service with proper infrastructure and monitoring.

Key Context:
- We're deploying a FORKED version of Langfuse
- Target domain: ai.sambatv.com
- Main app is at: prompts.sambatv.com
- Need PostgreSQL for Langfuse (separate from Supabase)

Your main tasks:
1. Fork https://github.com/langfuse/langfuse.git
2. Set up local development environment
3. Create Docker deployment configuration
4. Configure subdomain and SSL
5. Deploy to staging then production
6. Set up monitoring and backups

Report progress every 30 minutes to Agent O (the human coordinator).
Start by forking the repository and setting up local environment.
```

### Phase 3: Wave-Based Execution (1-2 days)

#### Your Role as Agent O (Orchestrator)
You coordinate using Cursor + TaskMaster tools:

1. **Track Progress in TaskMaster:**
   ```bash
   # Update progress as agents report
   task-master update-subtask --id=26.1 --prompt="[Agent A] Fork completed, development server running"
   
   # Check overall status
   task-master list --with-subtasks
   
   # Get next priorities
   task-master next
   ```

2. **Coordinate Between Agents:**
   - Collect reports every 30 minutes
   - Resolve blockers immediately
   - Update TaskMaster with progress
   - Plan next wave activities

3. **Integration Checkpoints:**
   - Wave 1 (2h): All environments setup
   - Wave 2 (4h): Branding and auth complete
   - Wave 3 (3h): Integration working
   - Wave 4 (3h): Production ready

#### Wave 1: Foundation (2 hours)
**All agents start simultaneously:**

**Agent A Tasks:**
- Fork Langfuse repository
- Install dependencies (`pnpm install`)
- Get development server running
- Identify branding files to modify

**Agent B Tasks:**
- Fork Langfuse repository
- Review authentication setup
- Plan OAuth configuration
- Map API integration points

**Agent C Tasks:**
- Fork Langfuse repository
- Set up PostgreSQL locally
- Configure Docker environment
- Test local deployment

**Your Coordination:**
```bash
# Start Wave 1 in TaskMaster
task-master set-status --id=26.1 --status=in-progress

# As agents report progress, update:
task-master update-subtask --id=26.1 --prompt="[Agent A] Local environment ready"
task-master update-subtask --id=26.2 --prompt="[Agent C] PostgreSQL configured"
task-master update-subtask --id=26.4 --prompt="[Agent B] Auth review complete"
```

#### Wave 2: Customization (4 hours)
**Integration Checkpoint:** All development environments working

**Agent A Tasks:**
- Replace Langfuse logos with SambaTV
- Update color scheme to #E50914
- Change app name throughout codebase
- Update favicon and meta tags

**Agent B Tasks:**
- Configure Google OAuth
- Implement @samba.tv domain restriction
- Set up model API configurations
- Configure pricing for each model

**Agent C Tasks:**
- Create production Docker configuration
- Set up environment variable management
- Configure Nginx reverse proxy
- Prepare SSL certificate setup

#### Wave 3: Integration (3 hours)
**Integration Checkpoint:** Branding and auth complete

**Agent A Tasks:**
- Add "Test in AI Platform" button to main app
- Create evaluation score display component
- Add navigation links between apps
- Ensure consistent styling

**Agent B Tasks:**
- Create linking table in Supabase
- Build API endpoints for data exchange
- Implement evaluation data fetching
- Configure CORS for cross-origin requests

**Agent C Tasks:**
- Deploy to staging environment
- Configure subdomain (ai.sambatv.com)
- Set up SSL certificates
- Configure monitoring and alerts

#### Wave 4: Production (3 hours)
**Integration Checkpoint:** All integration working

**All Agents:**
- Final testing and bug fixes
- Production deployment
- Documentation updates
- Team training materials

## 🔧 Coordination Tools & Templates

### Agent Communication Template
```markdown
## [Agent X] Progress Report - [Time]

**Completed:**
- Task 1: Description and outcome
- Task 2: Description and outcome

**Currently Working On:**
- Task 3: What I'm doing now

**Blockers:**
- Issue 1: Description and help needed
- Issue 2: Description and help needed

**Next Steps:**
- Task 4: What I'll do next
- Task 5: After current task

**Integration Needs:**
- Need from Agent Y: Specific requirement
- Ready to provide: What I can give other agents
```

### Your TaskMaster Commands
```bash
# Check project status
task-master list --with-subtasks

# Update agent progress
task-master update-subtask --id=26.X --prompt="[Agent X] Progress update"

# Mark completions
task-master set-status --id=26.X --status=done

# Check dependencies
task-master show 26

# Get next priority
task-master next
```

### Integration Checkpoint Checklist
```markdown
## Wave 1 Checkpoint (2 hours)
- [ ] All agents have working local environments
- [ ] Development servers running
- [ ] Dependencies installed
- [ ] Basic authentication working

## Wave 2 Checkpoint (4 hours)  
- [ ] SambaTV branding visible
- [ ] Color scheme updated
- [ ] OAuth configured for @samba.tv
- [ ] Model APIs connected

## Wave 3 Checkpoint (7 hours)
- [ ] Can navigate between apps
- [ ] "Test in AI Platform" button works
- [ ] Data flows between systems
- [ ] Staging deployment accessible

## Wave 4 Checkpoint (10 hours)
- [ ] Production deployment live
- [ ] SSL certificates working
- [ ] All features tested
- [ ] Documentation complete
```

## 🚀 Alternative: Manual Coordination (Option B)

If you prefer simpler coordination without TaskMaster:

### Setup
1. Create shared Google Doc or Notion page
2. Initialize 3 Claude conversations with same prompts
3. Agents report progress in shared document
4. You coordinate manually without TaskMaster tools

### Pros/Cons
**Pros:** Simpler setup, no tool dependencies
**Cons:** No structured tracking, harder to manage dependencies

## 🎯 Success Criteria

### Technical Success
- [ ] Langfuse deploys with SambaTV branding at ai.sambatv.com
- [ ] Single sign-on works between apps
- [ ] "Test in AI Platform" button functional
- [ ] Evaluation data flows back to main app
- [ ] Complete in 1-2 days

### Coordination Success
- [ ] All agents report progress regularly
- [ ] Blockers resolved within 30 minutes
- [ ] Integration checkpoints met on time
- [ ] Quality gates passed before next wave
- [ ] Documentation maintained throughout

## 🆘 Troubleshooting

### Common Issues
1. **Agent stops responding:** Refresh Claude conversation, resume with context
2. **Integration conflicts:** Stop work, analyze conflict, update all agents
3. **Timeline delays:** Adjust wave timing, focus on critical path
4. **Quality issues:** Add extra checkpoint before proceeding

### Emergency Procedures
1. **Major blocker:** Stop all agents, resolve issue, restart wave
2. **Integration failure:** Rollback to last checkpoint, debug, retry
3. **Timeline pressure:** Defer non-critical features to post-launch

## 📞 Getting Help

### If Stuck
1. **Technical issues:** Ask specific agent for detailed debug info
2. **Coordination issues:** Review agent communication log, identify gaps
3. **Timeline issues:** Assess critical path, defer non-essential tasks
4. **Quality issues:** Add focused review and testing phase

This guide provides everything you need to coordinate 4 AI agents using Cursor + TaskMaster for orchestration and Claude conversations for specialized work. The key is regular communication, structured progress tracking, and clear integration checkpoints. 