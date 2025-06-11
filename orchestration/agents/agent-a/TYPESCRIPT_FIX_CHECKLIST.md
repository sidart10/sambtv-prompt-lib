# Agent A - TypeScript Fix Execution Checklist

**Date**: January 11, 2025  
**Mission**: Systematic Task 14 TypeScript fixes  
**Target**: Zero compilation errors, 95%+ quality score

---

## 🚨 PRE-FIX ASSESSMENT

### [ ] Initial Error Assessment (10 minutes)
```bash
# Run these commands and document results:
npx tsc --noEmit --pretty > typescript-errors-before.txt
npm run build 2>&1 | tee build-errors-before.txt
npm run lint > lint-errors-before.txt
```

**Error Count Goals**:
- TypeScript errors: Current → 0
- Build errors: Current → 0  
- Lint warnings: Current → 0

---

## 🔧 SYSTEMATIC FIXES

### PHASE 1: Route Parameter Types (30 minutes)

#### [ ] Fix `/app/api/tracing/[traceId]/route.ts`
```typescript
// Update all methods (GET, PUT, DELETE):
export async function GET(
  request: Request,
  { params }: { params: Promise<{ traceId: string }> }
) {
  const { traceId } = await params;
  // ... rest unchanged
}
```

#### [ ] Fix `/app/api/prompts/[id]/route.ts`
```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ... rest unchanged
}
```

#### [ ] Find and fix other dynamic routes
```bash
# Search for dynamic route files:
find app/api -name "\[*\].ts" -o -name "\[*\]" -type d

# Fix each one with the Promise<params> pattern
```

#### [ ] Test Route Fixes
```bash
npx tsc --noEmit app/api/tracing/\[traceId\]/route.ts
npx tsc --noEmit app/api/prompts/\[id\]/route.ts
```

### PHASE 2: Interface Updates (20 minutes)

#### [ ] Update `/app/actions/prompts.ts`
```typescript
interface PromptWithRelations {
  id: string;
  title: string;
  content: string;
  // ... existing fields ...
  
  // ADD THESE FIELDS:
  average_evaluation_score: number | null;
  evaluation_count: number;
  last_evaluated_at: string | null;
  evaluation_summary?: {
    relevance: number;
    coherence: number;  
    helpfulness: number;
    safety: number;
    composite: number;
  } | null;
}
```

#### [ ] Verify `/types/database.types.ts`
```typescript
// Check if prompts table has evaluation fields:
export interface Database {
  public: {
    Tables: {
      prompts: {
        Row: {
          // Should include:
          average_evaluation_score: number | null;
          evaluation_count: number;
          last_evaluated_at: string | null;
        }
      }
    }
  }
}
```

#### [ ] Test Interface Updates
```bash
npx tsc --noEmit app/actions/prompts.ts
npx tsc --noEmit types/database.types.ts
```

### PHASE 3: Auth Pattern Updates (15 minutes)

#### [ ] Find files using old auth pattern
```bash
grep -r "getServerSession" app/api/
grep -r "authOptions" app/api/
```

#### [ ] Update auth imports
```typescript
// CHANGE FROM:
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// CHANGE TO:
import { auth } from '@/lib/auth';

// CHANGE USAGE FROM:
const session = await getServerSession(authOptions);

// CHANGE TO:
const session = await auth();
```

#### [ ] Verify `/lib/auth.ts` exports
```typescript
// Ensure this exists:
export const { handlers, auth, signIn, signOut } = NextAuth({
  // ... config
});
```

#### [ ] Test Auth Updates
```bash
npx tsc --noEmit lib/auth.ts
# Test a few updated API files
```

### PHASE 4: Supabase Exports (10 minutes)

#### [ ] Check `/utils/supabase/server.ts`
```typescript
// Ensure these exist:
export const createClient = () => {
  // ... implementation
};

export { createClient }; // Explicit export
```

#### [ ] Check `/utils/supabase/client.ts`
```typescript
// Ensure these exist:
export const createClient = () => {
  // ... implementation  
};

export { createClient }; // Explicit export
```

#### [ ] Test Supabase Exports
```bash
npx tsc --noEmit utils/supabase/server.ts
npx tsc --noEmit utils/supabase/client.ts
```

### PHASE 5: Streaming Endpoint Types (20 minutes)

#### [ ] Update `/app/api/playground/stream/route.ts`
```typescript
// Add interfaces at top:
interface StreamingResponse {
  choices: Array<{
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason?: string | null;
    index: number;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AIClientConfig {
  stream: boolean;
  model: string;
  // ... other properties as needed
}
```

#### [ ] Fix streaming function types
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, model, stream = true }: {
      prompt: string;
      model: string;
      stream?: boolean;
    } = body;
    
    // ... rest with proper typing
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

#### [ ] Test Streaming Types
```bash
npx tsc --noEmit app/api/playground/stream/route.ts
```

### PHASE 6: Rate Limiting Implementation (25 minutes)

#### [ ] Create `/lib/rate-limiter.ts`
```typescript
interface RateLimitConfig {
  interval: number;
  uniqueTokenPerInterval: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(private config: RateLimitConfig) {}
  
  check(identifier: string): { success: boolean; remaining: number } {
    const now = Date.now();
    const windowStart = now - this.config.interval;
    
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.config.uniqueTokenPerInterval) {
      return { success: false, remaining: 0 };
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return { 
      success: true, 
      remaining: this.config.uniqueTokenPerInterval - validRequests.length 
    };
  }
}

export const streamingLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 10, // 10 requests per minute
});
```

#### [ ] Apply to streaming endpoint
```typescript
// Add to /app/api/playground/stream/route.ts:
import { streamingLimiter } from '@/lib/rate-limiter';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  // Add auth check
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Add rate limiting
  const rateLimitResult = streamingLimiter.check(session.user.email);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  // ... rest of implementation
}
```

#### [ ] Test Rate Limiting
```bash
npx tsc --noEmit lib/rate-limiter.ts
npx tsc --noEmit app/api/playground/stream/route.ts
```

---

## ✅ VERIFICATION PHASE

### [ ] Complete TypeScript Check
```bash
npx tsc --noEmit --pretty
# Target: Zero errors
```

### [ ] Build Verification
```bash
npm run build
# Target: Successful build
```

### [ ] Linting Check
```bash
npm run lint
# Target: No errors, minimal warnings
```

### [ ] Test Suite
```bash
npm test -- --testPathPattern="playground|streaming|trace"
# Target: All tests pass
```

---

## 🧪 FUNCTIONAL TESTING

### [ ] Playground Streaming Test
1. Navigate to `/playground`
2. Enter test prompt
3. Select model
4. Click generate
5. Verify streaming works
6. Check cost display
7. Confirm structured output parsing

### [ ] Trace Visualization Test  
1. Navigate to `/traces`
2. Verify dashboard loads
3. Test filtering functionality
4. Open trace detail view
5. Check real-time monitoring

### [ ] API Endpoint Test
```bash
# Test auth-protected endpoint:
curl -X GET "http://localhost:3000/api/tracing/search" \
  -H "Authorization: Bearer TOKEN"

# Should return proper auth error or data
```

### [ ] Rate Limiting Test
```bash
# Make rapid requests to streaming endpoint:
for i in {1..15}; do
  curl -X POST "http://localhost:3000/api/playground/stream" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test","model":"claude-3-5-sonnet"}' &
done

# Should see rate limiting after 10 requests
```

---

## 📋 COMPLETION ACTIONS

### [ ] TaskMaster Update
```bash
# Update status to review:
set_task_status --id=14 --status=review
update_subtask --id=14.1 --prompt="[Agent A] TypeScript fixes complete. Zero compilation errors, rate limiting added, all functionality verified. Ready for Agent R re-review."
```

### [ ] Documentation
Create fix summary:
- [ ] List of files modified
- [ ] Types of errors resolved
- [ ] New features added (rate limiting)
- [ ] Test results confirmation

### [ ] Agent R Notification
Message to Agent R:
```
Task 14 TypeScript fixes completed:
- Route parameter types updated for Next.js 15
- PromptWithRelations interface enhanced
- Auth patterns modernized to NextAuth v5
- Supabase exports verified
- Streaming endpoint types added
- Rate limiting implemented
- Zero compilation errors
- All tests passing
- Functionality verified

Ready for priority re-review.
```

---

## 🎯 SUCCESS CRITERIA CHECKLIST

### Technical Requirements:
- [ ] Zero TypeScript errors (`npx tsc --noEmit`)
- [ ] Successful build (`npm run build`)
- [ ] Clean linting (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] Rate limiting functional
- [ ] Authentication working

### Functional Requirements:
- [ ] Playground streaming operational
- [ ] Structured output parsing works
- [ ] Cost tracking displays correctly
- [ ] Trace visualization loads
- [ ] No runtime console errors
- [ ] Mobile responsiveness maintained

### Quality Requirements:
- [ ] Code follows TypeScript strict standards
- [ ] Security patterns properly implemented
- [ ] Performance maintained or improved
- [ ] Error handling comprehensive
- [ ] User experience preserved

---

**TIMELINE ESTIMATE**: 2-3 hours for systematic completion
**EXPECTED AGENT R SCORE**: 95%+ (up from 88%)
**PHASE 2 IMPACT**: Completion unlocked, ready for final sprint!

**🚀 GO TIME: Fix these issues methodically and launch Task 14 to completion!**