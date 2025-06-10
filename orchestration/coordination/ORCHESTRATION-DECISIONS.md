# Orchestration Decisions Log

## Decision #1: Fork & Deploy Approach Confirmed
**Date**: 2025-01-10  
**Time**: 14:30  
**Decision**: Proceed with Option A - Fork & Deploy Langfuse  
**Rationale**: 
- 10x faster implementation (1-2 days vs 2-3 weeks)
- Get ALL Langfuse features immediately
- Battle-tested production code
- Minimal maintenance burden
- PRD strongly recommends this approach

**Impact**: All agents to focus on forking and white-labeling rather than building from scratch

---

## Decision #2: Parallel Wave Execution
**Date**: 2025-01-10  
**Time**: 14:35  
**Decision**: Execute tasks in parallel waves with synchronization checkpoints  
**Rationale**: 
- Maximize efficiency within 1-2 day timeline
- Reduce blocking dependencies
- Enable rapid iteration

**Wave Structure**:
- Wave 1 (Hours 1-4): Foundation & Setup
- Wave 2 (Hours 5-10): Core Implementation  
- Wave 3 (Hours 11-14): Integration & Testing
- Wave 4 (Hours 15-16): Production & Documentation

---

## Decision #3: Authentication Strategy
**Date**: 2025-01-10  
**Time**: 14:40  
**Decision**: Share authentication between main app and Langfuse using existing Google OAuth  
**Details**:
- Use existing Google OAuth credentials
- Implement @samba.tv domain restriction in Langfuse
- Share sessions via common backend/database
- Main app remains auth source of truth

**Credentials Available**:
- GOOGLE_CLIENT_ID: 201626763325-m89upvbto8ei6oromvckqvtebltqp80.apps.googleusercontent.com
- GOOGLE_CLIENT_SECRET: [Secured]

---

## Decision #4: Deployment Infrastructure
**Date**: 2025-01-10  
**Time**: 14:45  
**Decision**: Deploy Langfuse on Vercel with PostgreSQL database  
**Details**:
- Subdomain: ai.sambatv.com
- Use Vercel deployment (credentials available)
- Separate PostgreSQL for Langfuse data
- Maintain separation of concerns

**Available Infrastructure**:
- Vercel credentials confirmed
- Supabase available for linking table
- SSL via Let's Encrypt

---

## Decision #5: Integration Points
**Date**: 2025-01-10  
**Time**: 14:50  
**Decision**: Minimal integration touchpoints for MVP  
**Integration Points**:
1. "Test in AI Platform" button on prompt cards
2. Display evaluation scores in main app
3. Shared authentication
4. Cost/usage data exchange

**Data Flow**:
- Main App → Langfuse: promptId, content, userId, model
- Langfuse → Main App: traceId, scores, cost, latency

---

## Decision #6: Branding Priority
**Date**: 2025-01-10  
**Time**: 14:55  
**Decision**: Complete white-labeling in Wave 1  
**Requirements**:
- Replace all Langfuse logos with SambaTV logo
- Update color scheme to SambaTV red (#E50914)
- Change app name to "SambaTV AI Platform"
- Update all metadata and titles

**Assets Location**: /public/images/

---

## Decision #7: Model Configuration
**Date**: 2025-01-10  
**Time**: 15:00  
**Decision**: Configure all three AI providers in Langfuse  
**Available APIs**:
- Anthropic: ✅ (API key confirmed)
- Google Gemini: ✅ (API key confirmed)
- OpenRouter: ✅ (API key confirmed)

**Implementation**: Agent B to configure in Wave 2

---

## Decision #8: Quality Gates
**Date**: 2025-01-10  
**Time**: 15:05  
**Decision**: Checkpoint-based quality validation  
**Checkpoints**:
1. End of Wave 1: Environments ready, branding identified
2. End of Wave 2: Auth working, branding complete
3. End of Wave 3: Full integration tested
4. End of Wave 4: Production deployed

**Rollback Plan**: Keep original Langfuse fork untouched as backup

---

## Future Decisions Queue

1. **Monitoring Strategy**: Decide on Sentry vs built-in monitoring
2. **Backup Frequency**: Determine PostgreSQL backup schedule
3. **Update Policy**: How to handle Langfuse upstream updates
4. **Training Materials**: Scope of initial documentation

---

*This log will be updated as new orchestration decisions are made*