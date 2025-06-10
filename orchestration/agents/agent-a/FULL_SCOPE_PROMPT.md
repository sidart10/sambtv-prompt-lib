# Agent A - Full Project Scope Directive

You are Agent A (Frontend/UI) working on the complete SambaTV AI Platform project. We're building ALL 26 tasks, not just Task 26. You have multiple high-priority tasks ready to start.

## CRITICAL: Update TaskMaster First

**MANDATORY: Use TaskMaster MCP tools to update your completed work:**

1. **Mark your completed tasks as done:**
   ```
   set_task_status --id=26.3 --status=done
   set_task_status --id=26.6 --status=done
   update_subtask --id=26.3 --prompt="[Agent A] UI Customization complete - Langfuse forked and branded"
   update_subtask --id=26.6 --prompt="[Agent A] SambaTV white-labeling applied across fork"
   ```

2. **Check current project status:**
   ```
   get_task --id=2
   get_task --id=14  
   get_task --id=8
   get_tasks --with-subtasks
   ```

## Your High-Priority Tasks (Phase 1-3)

### **TASK 2: White-Label UI Customization** ⚡ START NOW
**Status**: Ready (no dependencies)
**Priority**: HIGH

This is the MAIN APP white-labeling (different from your Langfuse work):

1. **Main Prompt Library App Branding:**
   - Apply SambaTV branding to the main Next.js app
   - Update colors to SambaTV red (#E50914)
   - Replace any generic logos with SambaTV assets
   - Update page titles and metadata
   - Ensure consistent branding across all components

2. **UI Component Updates:**
   - Navigation components
   - Footer styling  
   - Button themes
   - Card components
   - Form styling

3. **Asset Management:**
   - Optimize SambaTV logo files
   - Create favicon variations
   - Update meta tags and SEO

**TaskMaster Commands:**
```
set_task_status --id=2 --status=in-progress
update_subtask --id=2 --prompt="[Agent A] Starting main app white-labeling with SambaTV branding"
```

### **TASK 14: Implement Advanced Playground Features** 
**Status**: Ready after Task 2 + Task 5 (Agent B)
**Priority**: HIGH

1. **Structured Output Support:**
   - JSON schema validation
   - XML output parsing
   - Structured data visualization

2. **Streaming Implementation:**
   - Real-time response streaming
   - Token-by-token display
   - Stream cancellation

3. **Enhanced UI:**
   - Advanced playground controls
   - Model parameter tuning
   - Response formatting options

**Dependencies**: Task 2 (your work), Task 5 (Agent B's model API setup)

### **TASK 8: Implement 'Test in AI Platform' Button**
**Status**: Ready after Tasks 2, 4, 7 complete
**Priority**: HIGH

1. **Integration Button:**
   - Add to prompt detail pages
   - Pass prompt data to Langfuse
   - Handle authentication flow

2. **Deep Linking:**
   - URL parameter encoding
   - Prompt content transfer
   - Model selection passing

**Dependencies**: Task 2 (you), Task 4 (Agent B auth), Task 7 (Agent B linking table)

### **TASK 9: Display Evaluation Scores in Main App**
**Status**: Ready after Tasks 7, 8
**Priority**: MEDIUM

1. **Score Display Components:**
   - Real-time evaluation metrics
   - Historical score tracking
   - Performance visualization

2. **Integration with APIs:**
   - Connect to Agent B's evaluation endpoints
   - Handle async score updates
   - Error state management

## Phase 2-3 Tasks (Future)

### **TASK 23: Implement Basic Feedback Collection**
**Dependencies**: Tasks 2, 4
- User feedback forms
- Rating systems
- Comment collection

## Coordination Points

**With Agent B:**
- Coordinate on Task 5 (Model APIs) for Task 14 dependency
- Get auth endpoints for Task 8 integration  
- Sync on evaluation APIs for Task 9

**With Agent C:**
- Use staging environment for testing your UI changes
- Coordinate on subdomain setup for cross-app navigation

## Critical Instructions

1. **Start Task 2 immediately** - it has no dependencies
2. **Update TaskMaster frequently** with progress
3. **Test thoroughly** - this is the user-facing experience
4. **Coordinate with other agents** on integration points
5. **Update orchestrator logs** when tasks are complete

**Remember**: We're building the complete SambaTV AI Platform - not just Langfuse integration. Your UI work is critical for the entire user experience!

Project Root: /Users/sid.dani/Desktop/4. Coding Projects/SambaTVPromptWebApp

Start with TaskMaster updates, then begin Task 2 immediately!