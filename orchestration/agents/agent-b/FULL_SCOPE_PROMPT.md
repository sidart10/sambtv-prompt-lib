# Agent B - Full Project Scope Directive

You are Agent B (Backend/API) working on the complete SambaTV AI Platform project. We're building ALL 26 tasks, not just Task 26. You have multiple high-priority tasks ready to start immediately.

## CRITICAL: Update TaskMaster First

**MANDATORY: Use TaskMaster MCP tools to update your completed work:**

1. **Mark your completed tasks as done:**
   ```
   set_task_status --id=26.4 --status=done
   set_task_status --id=26.7 --status=done
   update_subtask --id=26.4 --prompt="[Agent B] Backend API preparation complete - integration layer built"
   update_subtask --id=26.7 --prompt="[Agent B] Custom backend logic complete - all APIs implemented"
   ```

2. **Check current project status:**
   ```
   get_task --id=3
   get_task --id=5
   get_task --id=4
   get_tasks --with-subtasks
   ```

## Your High-Priority Tasks (Phase 1-3)

### **TASK 3: Configure Google OAuth Integration** ⚡ START NOW
**Status**: Ready (no dependencies)
**Priority**: HIGH

1. **OAuth Provider Setup:**
   - Configure Google OAuth for main app
   - Implement @samba.tv domain restriction
   - Set up proper scopes and permissions
   - Handle OAuth callbacks and errors

2. **Authentication Flow:**
   - Login/logout functionality
   - Token management
   - Session handling
   - Error handling and fallbacks

3. **Integration Points:**
   - Connect with existing NextAuth setup
   - Ensure compatibility with your Langfuse auth work
   - Test end-to-end auth flow

**Environment Variables Available:**
```
GOOGLE_CLIENT_ID=201626763325-m89upvbto8ei6oromvckqvtebltqp80.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-TK3BlPluoxYCnjNqPQUSBAl5tj
```

**TaskMaster Commands:**
```
set_task_status --id=3 --status=in-progress
update_subtask --id=3 --prompt="[Agent B] Starting Google OAuth integration with @samba.tv domain restriction"
```

### **TASK 5: Configure Model API Integration** ⚡ START NOW
**Status**: Ready (no dependencies) 
**Priority**: HIGH

1. **Model Provider Setup:**
   - Anthropic Claude integration
   - Google Gemini setup
   - OpenRouter configuration
   - API key management and rotation

2. **Unified Model Interface:**
   - Standardized request/response format
   - Model switching logic
   - Parameter validation
   - Rate limiting and quotas

3. **Pricing and Usage:**
   - Cost calculation per model
   - Usage tracking
   - Billing integration
   - Analytics collection

**API Keys Available:**
```
ANTHROPIC_API_KEY=sk-ant-api03-G2rMSnvtd5Gaap3hQXjz5Z2_ZxYUXCiVxR4JsvmNEqSZU8-Io4QhwclOjy-20BTaB_vIQOLfs2CQMFMKFtOTyw-j4payQAA
GEMINI_API_KEY=AIzaSyD5vTlIhgYwj3o02yKL9cROiP_xPy9uUqE
OPENROUTER_API_KEY=sk-or-v1-a37b4dd731c154f897e1646717f9721Sab500bb2285e6c2d264168b101187a90f
```

### **TASK 4: Implement Shared Authentication Session** 
**Status**: Ready after Task 3
**Priority**: HIGH

1. **Cross-App Session Sharing:**
   - Session synchronization between main app and Langfuse
   - Shared session store (Redis/Database)
   - Token validation across applications

2. **Single Sign-On (SSO):**
   - Seamless authentication flow
   - Session persistence
   - Logout synchronization

**Dependencies**: Task 3 (OAuth setup)

### **TASK 7: Create Linking Table in Supabase**
**Status**: Ready after Task 6 (Agent C's PostgreSQL)
**Priority**: MEDIUM

1. **Database Schema:**
   - Prompt-to-trace linking
   - User session mapping
   - Cross-reference tables

2. **API Endpoints:**
   - CRUD operations for links
   - Bulk sync operations
   - Data validation

## Phase 2-4 Tasks (Future Priority)

### **TASK 15: Implement Full Tracing Functionality**
**Dependencies**: Tasks 5, 14
- Request/response tracing
- Session grouping
- Performance analytics

### **TASK 16: Implement Evaluation System**
**Dependencies**: Task 15
- Automated evaluation
- Custom scoring
- Human annotation queue

### **TASK 17: Implement Dataset Management**
**Dependencies**: Task 6
- Test case management
- Import/export functionality
- Version control

### **TASK 18: Implement Basic Experimentation System**
**Dependencies**: Tasks 15, 16
- A/B testing
- Statistical analysis
- Result tracking

### **TASK 19: Implement Essential Analytics**
**Dependencies**: Tasks 10, 15
- Usage dashboards
- Cost analysis
- Performance metrics

### **TASK 20: Implement Basic Prompt Management**
**Dependencies**: Tasks 7, 8
- Version control
- Comparison tools
- Performance tracking

## Coordination Points

**With Agent A:**
- Provide auth endpoints for Task 8 (Test button)
- Coordinate on Task 14 dependencies (playground features)
- Share evaluation APIs for Task 9 (score display)

**With Agent C:**
- Wait for Task 6 (PostgreSQL) for Task 7 dependency
- Coordinate on database schemas
- Share API requirements for infrastructure

## Critical Instructions

1. **Start Tasks 3 and 5 immediately** - they have no dependencies
2. **Update TaskMaster frequently** with progress
3. **Build robust error handling** - backend stability is critical
4. **Document all APIs** for Agent A integration
5. **Update orchestrator logs** when tasks are complete

**Remember**: We're building the complete SambaTV AI Platform backend - authentication, model APIs, data management, analytics, and evaluation systems!

Project Root: /Users/sid.dani/Desktop/4. Coding Projects/SambaTVPromptWebApp

Start with TaskMaster updates, then begin Tasks 3 and 5 in parallel!