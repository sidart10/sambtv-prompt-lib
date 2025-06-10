# Langfuse Fork & White-Label Orchestration

This folder contains the multi-agent orchestration plan for forking and deploying Langfuse as "SambaTV AI Platform".

## Quick Navigation

### 🚀 Start Here
- **[ORGANIZATION_GUIDE.md](./ORGANIZATION_GUIDE.md)** - New folder organization guide
- **[active/USE-THIS-GUIDE.md](./active/USE-THIS-GUIDE.md)** - Which files to use vs ignore
- **[projects/langfuse-integration/QUICK-START.md](./projects/langfuse-integration/QUICK-START.md)** - Project overview

### 📋 Agent Setup
- **[coordination/AGENT-INITIALIZATION.md](./coordination/AGENT-INITIALIZATION.md)** - Copy these prompts to start each agent
- **[agents/agent-a/](./agents/agent-a/)** - Frontend Agent prompts
- **[agents/agent-b/](./agents/agent-b/)** - Backend Agent prompts  
- **[agents/agent-c/](./agents/agent-c/)** - Infrastructure Agent prompts
- **[agents/agent-r/](./agents/agent-r/)** - Code Review Agent prompts

### 📄 Detailed Plans
- **[historical/CORRECTED-ORCHESTRATION-PLAN.md](./historical/CORRECTED-ORCHESTRATION-PLAN.md)** - Full orchestration strategy
- **[projects/langfuse-integration/agent-directives-langfuse.md](./projects/langfuse-integration/agent-directives-langfuse.md)** - Specific tasks per agent
- **[projects/langfuse-integration/wave-plan-langfuse.xml](./projects/langfuse-integration/wave-plan-langfuse.xml)** - Timeline and waves

### 📊 Monitoring & Status
- **[coordination/orchestrator-dashboard.md](./coordination/orchestrator-dashboard.md)** - Progress tracking
- **[active/AGENT_R_SUCCESS_SUMMARY.md](./active/AGENT_R_SUCCESS_SUMMARY.md)** - Current success metrics
- **[historical/orchestrator-communication-log.md](./historical/orchestrator-communication-log.md)** - Communication logs

## Project Summary

**What:** Fork Langfuse and white-label it as "SambaTV AI Platform"

**Why:** Get ALL evaluation features in 1-2 days instead of building from scratch

**Timeline:** 1-2 days with 4 agents working in parallel

**Approach:** Fork → White-label → Deploy → Integrate

## Agent Roles

- **Agent A**: Frontend/UI - White-labeling and branding
- **Agent B**: Backend/API - Authentication and model config
- **Agent C**: Infrastructure - Deployment and DevOps
- **Agent O**: Orchestrator - Coordination and quality

## Success Criteria

✅ Langfuse deployed with SambaTV branding  
✅ Single sign-on between apps  
✅ "Test in AI Platform" buttons working  
✅ Evaluation data flows back to main app  
✅ Complete in 1-2 days  

## Important Notes

⚠️ This is a FORK project, not building from scratch  
⚠️ The existing prompt library is complete - don't rebuild it  
⚠️ Focus on white-labeling and simple integration  
⚠️ Ignore any references to Phoenix or the task complexity report