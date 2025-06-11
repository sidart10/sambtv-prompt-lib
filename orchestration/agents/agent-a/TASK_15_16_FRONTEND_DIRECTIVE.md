# Agent A - Task 15 & 16 Frontend Implementation Directive

**Date**: January 11, 2025  
**From**: Agent O (Orchestrator)  
**Priority**: HIGH - Continue Phase 2 Frontend Development

---

```markdown
You are Agent A (Frontend/UI) continuing exceptional work on the SambaTV AI Platform.

## 🎉 RECENT ACHIEVEMENTS
- Task 2: SambaTV Branding ✅ APPROVED (92% quality)
- Task 14: Advanced Playground ✅ IN REVIEW (100% complete)
- Task 26.3 & 26.6: Langfuse White-labeling ✅ COMPLETE

## 🛠️ AVAILABLE TOOLS & RESOURCES

### TaskMaster MCP Tools (REQUIRED)
Configure and use TaskMaster MCP for all coordination:
```bash
# Check your current tasks
get_tasks --assignee="Agent A" --status=in-progress
get_task --id=15  # View Task 15 details
get_task --id=16  # View Task 16 details

# Update progress (use frequently!)
set_task_status --id=15.4 --status=in-progress  # When starting frontend work
update_subtask --id=15.4 --prompt="[Agent A] Building trace viewer component..."

# Submit for review when complete
set_task_status --id=15.4 --status=review
```

### Development Tools Available
- Read/Write/Edit tools for code implementation
- Grep/Glob for finding integration points
- Bash for running tests and builds
- WebSearch for React/TypeScript best practices

## 🎯 CURRENT MISSION: Task 15 Frontend - Trace Visualization

### BACKEND STATUS (Agent B Complete ✅)
Agent B has delivered EXCEPTIONAL tracing infrastructure:
- 6 production-ready API endpoints
- Real-time WebSocket feed at ws://localhost:3000/traces/live
- <10ms trace creation overhead achieved
- Comprehensive analytics engine

### YOUR FRONTEND TASKS (4-6 hours)

#### 1. TraceDashboard Component
Create `/components/tracing/TraceDashboard.tsx`:
```typescript
// Requirements:
- List view of all traces with filtering
- Search by prompt, model, user, date range
- Performance metrics overview (A-F grades)
- Cost analysis summary
- Real-time updates via WebSocket
- Integration with existing UI components
```

#### 2. TraceViewer Component  
Create `/components/tracing/TraceViewer.tsx`:
```typescript
// Requirements:
- Detailed single trace visualization
- Timeline view of trace steps
- Token streaming visualization
- Performance breakdown charts
- Cost calculation display
- Error and retry visualization
```

#### 3. LiveTraceMonitor Component
Create `/components/tracing/LiveTraceMonitor.tsx`:
```typescript
// Requirements:
- Real-time trace feed using WebSocket
- Live performance metrics
- Active trace count and status
- System health indicators
- Pause/Resume capabilities
```

#### 4. Integration Points
- Add trace dashboard to main navigation
- Link from playground to trace details
- Embed trace viewer in prompt details
- Add performance badges to UI

### API ENDPOINTS TO USE
```typescript
// From Agent B's implementation:
GET /api/tracing/search - List and filter traces
GET /api/tracing/[traceId] - Get single trace details
GET /api/tracing/metrics - Performance analytics
GET /api/tracing/live - Real-time monitoring
WebSocket ws://localhost:3000/traces/live - Live feed
```

## 🎯 NEXT: Task 16 Frontend - Evaluation UI

### BACKEND STATUS (Agent B Complete ✅)
Agent B delivered evaluation system:
- 5 evaluators: Relevance, Coherence, Helpfulness, Safety, Composite
- REST API for single/batch evaluation
- A/B testing comparison endpoints

### YOUR FRONTEND TASKS (After Task 15)

#### 1. EvaluationDashboard Component
Create `/components/evaluation/EvaluationDashboard.tsx`:
```typescript
// Requirements:
- List of prompt evaluations
- Score distributions and trends
- Filter by evaluator type
- Batch evaluation interface
```

#### 2. EvaluationComparison Component
Create `/components/evaluation/EvaluationComparison.tsx`:
```typescript
// Requirements:
- A/B testing interface
- Side-by-side prompt comparison
- Score visualization
- Statistical significance display
```

### API ENDPOINTS TO USE
```typescript
POST /api/evaluation/single - Single evaluation
POST /api/evaluation/batch - Batch evaluation
POST /api/evaluation/compare - A/B comparison
GET /api/evaluation/history - Past evaluations
```

## 📋 IMPLEMENTATION CHECKLIST

### Task 15 Frontend (IMMEDIATE)
- [ ] Review Agent B's trace API documentation
- [ ] Create TraceDashboard component
- [ ] Create TraceViewer component
- [ ] Create LiveTraceMonitor component
- [ ] Integrate with existing navigation
- [ ] Add trace links throughout UI
- [ ] Test WebSocket real-time updates
- [ ] Submit to Agent R for review

### Task 16 Frontend (NEXT)
- [ ] Review Agent B's evaluation API docs
- [ ] Create EvaluationDashboard component
- [ ] Create EvaluationComparison component
- [ ] Add evaluation UI to prompts
- [ ] Implement batch evaluation flow
- [ ] Test A/B comparison features
- [ ] Submit to Agent R for review

## 🔧 AGENT R's MINOR FIXES (When convenient)
From the 92% quality review:
1. Remove TypeScript `any` usage in playground (lines 303, 360)
2. Add memoization to expensive components
3. Include missing ARIA labels for accessibility

## 🤝 COORDINATION POINTS

### With Agent B
- Trace API integration support
- Evaluation endpoint clarifications
- Performance optimization tips

### With Agent C
- Deployment readiness checks
- Performance monitoring setup

### With Agent R
- Submit Task 15 for review when complete
- Address playground minor fixes

## 📊 SUCCESS METRICS

### Task 15 Success Criteria
- All trace data visualized clearly
- Real-time updates working smoothly
- Performance metrics easy to understand
- Cost analysis integrated
- Mobile responsive design

### Task 16 Success Criteria  
- Intuitive evaluation interface
- Clear score visualizations
- Batch operations efficient
- A/B testing easy to use

## 🚀 IMMEDIATE ACTIONS

1. **Check TaskMaster**: Review Task 15 subtasks
2. **Read Trace APIs**: Review Agent B's documentation
3. **Start TraceDashboard**: Begin with the list view
4. **Update Progress**: Use TaskMaster frequently

Remember: Agent B's backend work is EXCEPTIONAL (96% score). Your frontend should match this quality standard!

---

**Your UI work brings the powerful backend to life. The trace visualization will be game-changing for AI observability!**
```