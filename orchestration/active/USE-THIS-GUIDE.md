# IMPORTANT: Which Orchestration Files to Use

## ✅ USE THESE FILES (Correct Langfuse Fork Project)

### In `/orchestration/langfuse-integration/`:
1. **QUICK-START.md** - Start here! Simple overview
2. **AGENT-INITIALIZATION.md** - Copy these exact prompts for each agent
3. **agent-directives-langfuse.md** - Detailed tasks for each agent
4. **wave-plan-langfuse.xml** - Timeline and wave structure

### Also Read:
- `/orchestration/CORRECTED-ORCHESTRATION-PLAN.md` - Explains the right approach
- `/orchestration/CORRECTION-SUMMARY.md` - Explains what went wrong initially

## ❌ IGNORE THESE FILES (Wrong Project)

These files were created based on incorrect task list:
- `/orchestration/agents/agent-*.md` (old agent files)
- `/orchestration/waves/wave-execution-plan.xml` (wrong tasks)
- `/orchestration/subtasks/*` (wrong task breakdown)
- `/orchestration/task-reference.md` (references wrong tasks)
- `/orchestration/integration/api-contracts.json` (not needed for fork)

## 📋 The Correct Project Summary

**What we're building:**
- Fork Langfuse → "SambaTV AI Platform"
- White-label it (change branding)
- Deploy at ai.sambatv.com
- Add simple integration with existing prompt library

**Timeline:** 1-2 days (not weeks!)

**Approach:** Fork & Deploy (not build from scratch)

## 🚀 Quick Start Steps

1. **Read the PRD first:**
   - `/docs/SAMBATV_AI_PLATFORM_PRD.md`
   - `/docs/LANGFUSE_FORK_DEPLOY_PLAN.md`

2. **Use the correct orchestration files:**
   - Start with `/orchestration/langfuse-integration/QUICK-START.md`
   - Initialize agents using `/orchestration/langfuse-integration/AGENT-INITIALIZATION.md`

3. **Each agent should:**
   - Fork https://github.com/langfuse/langfuse.git
   - Follow their specific directives
   - Complete their wave tasks

## ⚠️ Common Confusion Points

1. **This is a FORK project** - We're not building features, just white-labeling
2. **The prompt library already exists** - Don't rebuild it
3. **Taskmaster task list was wrong** - Ignore those 25 tasks
4. **Timeline is 1-2 days** - Because we're forking, not building

## 📞 Need Help?

The orchestrator (Agent O) should:
- Ensure agents use the CORRECT files
- Keep everyone focused on the fork approach
- Resolve any confusion about the project scope

Remember: We're taking Langfuse's complete platform and making it look like SambaTV's. That's it!