# Agent Directives for Langfuse Integration

## Project Context
We're forking Langfuse to create "SambaTV AI Platform" - a white-labeled version that integrates with our existing prompt library. The existing SambaTV Prompt Library is fully functional. We're adding Langfuse's evaluation, tracing, and experimentation features.

## Agent A - Frontend/UI Specialist

### Your Mission
Transform Langfuse's UI into SambaTV AI Platform through white-labeling and create seamless integration points with the main prompt library app.

### Specific Tasks

#### 1. Fork & Initial Setup
```bash
# Your first steps
git clone https://github.com/langfuse/langfuse.git sambatv-ai-platform
cd sambatv-ai-platform
git checkout -b sambatv-customization
```

#### 2. White-Label Customization
**File Locations & Changes:**

```typescript
// packages/web/src/constants/index.ts
export const APP_NAME = "SambaTV AI Platform"
export const APP_DESCRIPTION = "Internal LLM evaluation and testing platform"

// packages/web/src/styles/globals.css
:root {
  --primary: #E50914; /* SambaTV Red */
  --primary-foreground: #FFFFFF;
  --background: #000000;
  --foreground: #FFFFFF;
}

// Replace logo files
// packages/web/public/logo.svg → Replace with SambaTV logo
// packages/web/public/favicon.ico → Replace with SambaTV favicon
```

#### 3. Integration UI in Main App
**In the existing prompt library codebase:**

```typescript
// components/prompt-card.tsx or similar
import { ExternalLink } from 'lucide-react'

// Add this button to each prompt card
<Button
  variant="outline"
  size="sm"
  onClick={() => {
    const params = new URLSearchParams({
      prompt: prompt.content,
      promptId: prompt.id.toString(),
      model: userPreferences?.defaultModel || 'claude-3-5-sonnet'
    })
    window.open(`https://ai.sambatv.com/playground?${params}`, '_blank')
  }}
>
  <ExternalLink className="w-4 h-4 mr-2" />
  Test in AI Platform
</Button>

// components/prompt-card.tsx - Add evaluation scores display
{evaluationScore && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Badge variant="outline">
      Avg Score: {evaluationScore.toFixed(2)}
    </Badge>
    <span className="text-xs">
      ({evaluationCount} evaluations)
    </span>
  </div>
)}
```

#### 4. Navigation Consistency
```typescript
// In Langfuse: packages/web/src/components/layouts/layout.tsx
// Add link back to main prompt library
<Link 
  href="https://prompts.sambatv.com" 
  className="flex items-center gap-2"
>
  ← Back to Prompt Library
</Link>
```

### Quality Checklist
- [ ] All Langfuse branding replaced
- [ ] Color scheme matches SambaTV brand
- [ ] Navigation between apps is seamless
- [ ] Responsive design maintained
- [ ] No broken images or assets

---

## Agent B - Backend/API Specialist

### Your Mission
Configure authentication, model integrations, and data flow between Langfuse and the existing prompt library.

### Specific Tasks

#### 1. Authentication Configuration
```typescript
// packages/web/src/server/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!, // Use existing from main app
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: "samba.tv", // Domain restriction
        },
      },
    }),
  ],
  callbacks: {
    signIn: async ({ user }) => {
      // Only allow @samba.tv emails
      return user.email?.endsWith('@samba.tv') ?? false
    },
    session: async ({ session, token }) => {
      // Sync with main app session format
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
        },
      }
    },
  },
}
```

#### 2. Model Configuration
```typescript
// packages/shared/src/server/llm/providers.ts
export const modelProviders = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    pricing: {
      'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
      'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 }
    }
  },
  google: {
    apiKey: process.env.GOOGLE_GEMINI_API_KEY,
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    pricing: {
      'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
      'gemini-1.5-flash': { input: 0.000075, output: 0.0003 }
    }
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    models: ['openai/gpt-4o', 'meta-llama/llama-3.1-70b-instruct'],
    baseURL: 'https://openrouter.ai/api/v1'
  }
}
```

#### 3. Data Integration
```sql
-- In main app's Supabase
CREATE TABLE langfuse_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id INTEGER REFERENCES prompts(id),
  langfuse_trace_id TEXT UNIQUE NOT NULL,
  evaluation_scores JSONB,
  total_cost DECIMAL(10,6),
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_langfuse_prompt ON langfuse_traces(prompt_id);
```

```typescript
// In main app: app/api/langfuse/traces/route.ts
export async function POST(request: Request) {
  const { promptId, traceId } = await request.json()
  
  // Store trace reference
  const { data, error } = await supabase
    .from('langfuse_traces')
    .insert({
      prompt_id: promptId,
      langfuse_trace_id: traceId
    })
    
  return Response.json({ success: !error })
}

// Get evaluation data for a prompt
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const promptId = searchParams.get('promptId')
  
  // Fetch from Langfuse API
  const traces = await fetch(
    `https://ai.sambatv.com/api/public/traces?metadata.promptId=${promptId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.LANGFUSE_PUBLIC_KEY}`
      }
    }
  ).then(r => r.json())
  
  // Calculate average scores
  const scores = traces.data
    .flatMap(t => t.scores || [])
    .filter(s => s.name === 'quality')
  
  const avgScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s.value, 0) / scores.length
    : null
    
  return Response.json({ 
    averageScore: avgScore,
    evaluationCount: scores.length,
    traces: traces.data
  })
}
```

#### 4. Environment Variables
```env
# Langfuse .env.local
DATABASE_URL=postgresql://langfuse:password@localhost:5432/langfuse
NEXTAUTH_URL=https://ai.sambatv.com
NEXTAUTH_SECRET=same-as-main-app

# Google OAuth (same as main app)
GOOGLE_CLIENT_ID=your-existing-client-id
GOOGLE_CLIENT_SECRET=your-existing-secret

# Model APIs
ANTHROPIC_API_KEY=your-key
GOOGLE_GEMINI_API_KEY=your-key
OPENROUTER_API_KEY=your-key

# For main app to access Langfuse
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_SECRET_KEY=sk-lf-xxx
```

### Quality Checklist
- [ ] Authentication works with @samba.tv emails
- [ ] Session sharing configured
- [ ] All model providers configured
- [ ] Pricing calculations accurate
- [ ] API endpoints secure

---

## Agent C - Infrastructure/DevOps Specialist

### Your Mission
Deploy Langfuse as a white-labeled service with proper infrastructure, monitoring, and integration with the existing system.

### Specific Tasks

#### 1. Local Development Setup
```bash
# Clone and setup
git clone https://github.com/langfuse/langfuse.git sambatv-ai-platform
cd sambatv-ai-platform

# Install dependencies
npm install -g pnpm
pnpm install

# Database setup
docker run -d \
  --name langfuse-postgres \
  -e POSTGRES_USER=langfuse \
  -e POSTGRES_PASSWORD=langfuse \
  -e POSTGRES_DB=langfuse \
  -p 5432:5432 \
  postgres:15

# Run migrations
pnpm run db:migrate

# Start development
pnpm run dev
```

#### 2. Production Infrastructure
```yaml
# docker-compose.yml
version: '3.8'

services:
  langfuse:
    build: .
    ports:
      - "3001:3000"
    environment:
      - DATABASE_URL=postgresql://langfuse:${DB_PASSWORD}@postgres:5432/langfuse
      - NEXTAUTH_URL=https://ai.sambatv.com
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      # Add all other env vars
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=langfuse
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=langfuse
    volumes:
      - langfuse-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  langfuse-data:
```

#### 3. Domain & SSL Configuration
```nginx
# /etc/nginx/sites-available/ai.sambatv.com
server {
    server_name ai.sambatv.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# SSL with Certbot
sudo certbot --nginx -d ai.sambatv.com
```

#### 4. Deployment Options

**Option A: Docker Deployment**
```bash
# Build and deploy
docker build -t sambatv-ai-platform .
docker-compose up -d

# Health check
curl https://ai.sambatv.com/api/health
```

**Option B: Vercel Deployment**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set custom domain in Vercel dashboard
```

#### 5. Monitoring Setup
```bash
# Health check endpoint
curl https://ai.sambatv.com/api/health

# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Log monitoring
docker logs sambatv-ai-platform -f

# Set up alerts
# Configure uptime monitoring for ai.sambatv.com
```

### Quality Checklist
- [ ] Langfuse runs locally
- [ ] Production deployment successful
- [ ] SSL certificate working
- [ ] Domain configured correctly
- [ ] Monitoring in place
- [ ] Backup strategy implemented

---

## Agent O - Orchestrator

### Your Mission
Coordinate all agents to ensure successful white-label deployment and integration of Langfuse with the existing prompt library.

### Key Coordination Points

#### 1. Synchronization Gates
- **Gate 1**: All agents have forked repo and local setup (Hour 2)
- **Gate 2**: Branding complete, auth configured (Hour 4)
- **Gate 3**: Staging deployment working (Hour 6)
- **Gate 4**: Production ready (Hour 8)

#### 2. Integration Validation
```typescript
// Test checklist
const integrationTests = {
  auth: "User can login to both apps with same session",
  navigation: "Can navigate between apps seamlessly",
  data: "Prompt data flows to Langfuse correctly",
  scores: "Evaluation scores display in main app",
  branding: "No Langfuse branding visible"
}
```

#### 3. Communication Flow
- Monitor #orchestration Slack channel
- Check progress every 2 hours
- Resolve blockers immediately
- Document decisions made

#### 4. Quality Gates
Before production:
- [ ] All agents report ready
- [ ] End-to-end test passes
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Security review complete

### Final Deliverables
1. Langfuse forked and branded as "SambaTV AI Platform"
2. Deployed at https://ai.sambatv.com
3. Integrated with existing prompt library
4. Documentation for team
5. Training materials ready