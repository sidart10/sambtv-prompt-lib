# Phoenix Integration Plan for SambaTV Prompt Library

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Technical Architecture](#technical-architecture)
4. [UI/UX Strategy](#uiux-strategy)
5. [Implementation Phases](#implementation-phases)
6. [Database Design](#database-design)
7. [Authentication & Security](#authentication--security)
8. [Performance Optimization](#performance-optimization)
9. [Migration Strategy](#migration-strategy)
10. [Risk Management](#risk-management)
11. [Success Metrics](#success-metrics)

## Executive Summary

### Project Overview
Integration of Arize Phoenix's LLM observability and evaluation capabilities into the SambaTV Prompt Library, creating a comprehensive platform for prompt engineering, testing, and optimization.

### Key Objectives
- **Enhance Prompt Testing**: Add evaluation, tracing, and experimentation capabilities
- **Maintain Performance**: Adopt Phoenix's performance optimizations while preserving Next.js benefits
- **Seamless Integration**: Create a unified user experience across both platforms
- **Enterprise-Grade Observability**: Provide detailed insights into prompt performance and behavior

### Approach
Hybrid architecture maintaining the Next.js foundation while running Phoenix as a microservice, with seamless UI integration and shared authentication.

## Architecture Overview

### Current State
```
┌─────────────────────────────────────────┐
│     SambaTV Prompt Library (Next.js)    │
├─────────────────────────────────────────┤
│ • Prompt Management                     │
│ • Basic Playground                      │
│ • User Profiles                         │
│ • Google OAuth (SambaTV domain)         │
│ • Supabase Backend                      │
└─────────────────────────────────────────┘
```

### Future State
```
┌─────────────────────────────────────────────────────────┐
│              SambaTV Prompt Library + Phoenix           │
├─────────────────────────────────────────────────────────┤
│                    Frontend Layer                       │
│  ┌──────────┐ ┌────────────┐ ┌───────────────────┐    │
│  │ Next.js  │ │  Phoenix   │ │    Unified UI     │    │
│  │  Pages   │ │ Components │ │   (Hybrid Apps)   │    │
│  └──────────┘ └────────────┘ └───────────────────┘    │
├─────────────────────────────────────────────────────────┤
│                     API Gateway                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │  Next.js API │ │ Phoenix Proxy│ │  GraphQL     │   │
│  │   Routes     │ │   Endpoints  │ │  Federation  │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
├─────────────────────────────────────────────────────────┤
│                   Service Layer                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │   Supabase   │ │   Phoenix    │ │ Shared Auth  │   │
│  │  (Primary)   │ │ (Evaluation) │ │   Service    │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Technical Architecture

### Component Architecture

#### 1. Frontend Integration Strategy
```typescript
// Approach: Incremental UI Migration
interface IntegrationStrategy {
  phase1: {
    approach: "iframe_embedding",
    components: ["TraceViewer", "EvaluationDashboard"],
    styling: "inherit_sambatv_theme"
  },
  phase2: {
    approach: "react_component_extraction",
    components: ["MetricsCharts", "ExperimentBuilder"],
    styling: "unified_design_system"
  },
  phase3: {
    approach: "full_integration",
    components: "all_phoenix_features",
    styling: "custom_sambatv_phoenix_theme"
  }
}
```

#### 2. Service Communication
```yaml
# docker-compose.yml
version: '3.8'

services:
  # Main Next.js Application
  sambatv-app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PHOENIX_INTERNAL_URL=http://phoenix:6006
      - PHOENIX_PUBLIC_URL=https://phoenix.sambatv.com
    depends_on:
      - phoenix
      - redis
    networks:
      - sambatv-network

  # Phoenix Service
  phoenix:
    image: arizephoenix/phoenix:latest
    ports:
      - "6006:6006"
    environment:
      - PHOENIX_SECRET_KEY=${PHOENIX_SECRET_KEY}
      - PHOENIX_DATABASE_URL=postgresql://phoenix:${DB_PASSWORD}@postgres:5432/phoenix
      - PHOENIX_WORKING_DIR=/data
      - PHOENIX_AUTH_ENABLED=true
      - PHOENIX_JWT_SECRET=${SHARED_JWT_SECRET}
    volumes:
      - phoenix-data:/data
      - ./phoenix-config:/config
    networks:
      - sambatv-network

  # Shared Redis for caching
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - sambatv-network

  # PostgreSQL for Phoenix
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=phoenix
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=phoenix
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - sambatv-network

networks:
  sambatv-network:
    driver: bridge

volumes:
  phoenix-data:
  redis-data:
  postgres-data:
```

### API Integration Layer

#### 1. GraphQL Federation
```typescript
// lib/graphql/federation.ts
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { ApolloGateway } from '@apollo/gateway';

// Gateway configuration
export const gateway = new ApolloGateway({
  supergraphSdl: `
    @core(feature: "https://specs.apollo.dev/core/v0.2")
    @core(feature: "https://specs.apollo.dev/join/v0.1") {
      query: Query
      mutation: Mutation
    }
    
    type Query
      @join__type(graph: SAMBATV)
      @join__type(graph: PHOENIX) {
      prompts: [Prompt] @join__field(graph: SAMBATV)
      evaluations: [Evaluation] @join__field(graph: PHOENIX)
      traces: [Trace] @join__field(graph: PHOENIX)
    }
    
    type Prompt
      @join__type(graph: SAMBATV, key: "id")
      @join__type(graph: PHOENIX, key: "id") {
      id: ID!
      content: String @join__field(graph: SAMBATV)
      evaluations: [Evaluation] @join__field(graph: PHOENIX)
      traces: [Trace] @join__field(graph: PHOENIX)
    }
  `,
  serviceList: [
    { name: 'sambatv', url: 'http://localhost:3000/api/graphql' },
    { name: 'phoenix', url: 'http://phoenix:6006/graphql' }
  ]
});
```

#### 2. REST API Proxy
```typescript
// app/api/phoenix/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { phoenixAuthBridge } from '@/lib/auth/phoenix-bridge';

export async function handler(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const path = req.nextUrl.pathname.replace('/api/phoenix/', '');
  const phoenixUrl = `${process.env.PHOENIX_INTERNAL_URL}/api/${path}`;
  
  // Generate Phoenix-compatible auth token
  const phoenixToken = await phoenixAuthBridge.generateToken(session);
  
  // Forward request to Phoenix
  const response = await fetch(phoenixUrl, {
    method: req.method,
    headers: {
      ...Object.fromEntries(req.headers),
      'Authorization': `Bearer ${phoenixToken}`,
      'X-Forwarded-For': req.ip || 'unknown',
      'X-Original-Host': req.headers.get('host') || ''
    },
    body: req.body
  });

  // Stream response back
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers),
      'X-Powered-By': 'SambaTV-Phoenix-Bridge'
    }
  });
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
```

## UI/UX Strategy

### Design Decision: Hybrid UI Approach

After careful consideration, we recommend a **Hybrid UI Approach** that:
1. **Adopts Phoenix's core visualization components** for complex data displays
2. **Maintains SambaTV's design system** for navigation, forms, and general UI
3. **Creates a unified theme layer** that bridges both systems

### UI Component Strategy

#### Phase 1: Embedded Phoenix Components
```typescript
// components/phoenix/EmbeddedPhoenixView.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { phoenixBridge } from '@/lib/phoenix/bridge';

interface EmbeddedPhoenixViewProps {
  component: 'traces' | 'evaluations' | 'experiments';
  promptId?: string;
  height?: string;
}

export function EmbeddedPhoenixView({ 
  component, 
  promptId, 
  height = '600px' 
}: EmbeddedPhoenixViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { data: session } = useSession();
  const [iframeUrl, setIframeUrl] = useState<string>('');

  useEffect(() => {
    if (session) {
      const token = phoenixBridge.generateEmbedToken(session);
      const url = phoenixBridge.buildEmbedUrl(component, { promptId, token });
      setIframeUrl(url);
    }
  }, [session, component, promptId]);

  return (
    <div className="relative w-full" style={{ height }}>
      {iframeUrl && (
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          className="absolute inset-0 w-full h-full border-0 rounded-lg"
          sandbox="allow-same-origin allow-scripts"
        />
      )}
    </div>
  );
}
```

#### Phase 2: Native Component Integration
```typescript
// components/phoenix/native/TraceTimeline.tsx
import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { phoenixQueries } from '@/lib/phoenix/queries';
import { cn } from '@/lib/utils';

export const TraceTimeline = memo(function TraceTimeline({ 
  traceId, 
  className 
}: TraceTimelineProps) {
  const { data: trace, isLoading } = useQuery({
    queryKey: ['phoenix', 'trace', traceId],
    queryFn: () => phoenixQueries.getTrace(traceId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return <TraceTimelineSkeleton />;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Execution Timeline</h3>
        <Badge variant="outline">
          {trace.totalDuration}ms
        </Badge>
      </div>
      
      <div className="relative">
        {/* Render Phoenix's trace visualization with SambaTV styling */}
        <PhoenixTraceRenderer 
          data={trace}
          theme={sambatvPhoenixTheme}
          interactive
          showMetrics
        />
      </div>
    </div>
  );
});
```

### Unified Design System
```typescript
// lib/design-system/phoenix-theme.ts
export const sambatvPhoenixTheme = {
  // Color palette matching SambaTV brand
  colors: {
    primary: '#E50914', // SambaTV red
    secondary: '#221F1F',
    background: {
      light: '#FFFFFF',
      dark: '#141414'
    },
    surface: {
      light: '#F5F5F5',
      dark: '#221F1F'
    },
    text: {
      primary: 'var(--foreground)',
      secondary: 'var(--muted-foreground)'
    },
    // Phoenix-specific colors
    trace: {
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6'
    }
  },
  
  // Typography matching SambaTV
  typography: {
    fontFamily: 'var(--font-sans)',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem'
    }
  },
  
  // Component-specific overrides
  components: {
    TraceViewer: {
      borderRadius: '0.5rem',
      boxShadow: 'var(--shadow-sm)'
    },
    MetricsChart: {
      gridColor: 'var(--border)',
      axisColor: 'var(--muted-foreground)'
    }
  }
};
```

## Implementation Phases

### Phase 1: Foundation (Weeks 1-3)

#### Week 1: Environment Setup
- [ ] Set up Docker environment
- [ ] Configure development containers
- [ ] Establish CI/CD pipeline modifications
- [ ] Set up staging environment

#### Week 2: Authentication Bridge
```typescript
// lib/auth/phoenix-bridge.ts
import jwt from 'jsonwebtoken';
import { Session } from 'next-auth';

export class PhoenixAuthBridge {
  private readonly jwtSecret: string;
  private readonly tokenCache: Map<string, string>;

  constructor() {
    this.jwtSecret = process.env.SHARED_JWT_SECRET!;
    this.tokenCache = new Map();
  }

  async generateToken(session: Session): Promise<string> {
    const cacheKey = `${session.user.id}-${session.expires}`;
    
    if (this.tokenCache.has(cacheKey)) {
      return this.tokenCache.get(cacheKey)!;
    }

    const token = jwt.sign(
      {
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role || 'member',
        provider: 'sambatv',
        // Phoenix-specific claims
        permissions: this.mapPermissions(session.user.role),
        metadata: {
          company: 'SambaTV',
          department: session.user.department
        }
      },
      this.jwtSecret,
      {
        expiresIn: '1h',
        issuer: 'sambatv-prompt-library',
        audience: 'phoenix-service'
      }
    );

    this.tokenCache.set(cacheKey, token);
    
    // Clean up expired tokens
    setTimeout(() => {
      this.tokenCache.delete(cacheKey);
    }, 3600000); // 1 hour

    return token;
  }

  private mapPermissions(role?: string): string[] {
    const basePermissions = ['read:traces', 'read:evaluations'];
    
    if (role === 'admin') {
      return [...basePermissions, 'write:all', 'delete:all', 'admin:all'];
    }
    
    return [...basePermissions, 'write:own', 'delete:own'];
  }
}

export const phoenixAuthBridge = new PhoenixAuthBridge();
```

#### Week 3: Database Schema
```sql
-- Migration: 001_phoenix_integration.sql

-- Evaluation runs table
CREATE TABLE prompt_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  phoenix_eval_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  config JSONB NOT NULL DEFAULT '{}',
  results JSONB,
  metrics JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Traces table
CREATE TABLE prompt_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  phoenix_trace_id TEXT UNIQUE NOT NULL,
  session_id UUID,
  execution_time_ms INTEGER NOT NULL,
  tokens_used JSONB NOT NULL DEFAULT '{"prompt": 0, "completion": 0, "total": 0}',
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES profiles(id)
);

-- Experiments table
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  phoenix_experiment_id TEXT UNIQUE NOT NULL,
  prompt_ids UUID[] NOT NULL,
  baseline_prompt_id UUID REFERENCES prompts(id),
  config JSONB NOT NULL DEFAULT '{}',
  hypothesis TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'running', 'completed', 'cancelled')),
  results JSONB,
  conclusion TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Datasets for evaluation
CREATE TABLE evaluation_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('qa_pairs', 'completions', 'classifications', 'custom')),
  data JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link table for evaluations and datasets
CREATE TABLE evaluation_dataset_runs (
  evaluation_id UUID NOT NULL REFERENCES prompt_evaluations(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES evaluation_datasets(id),
  subset_config JSONB,
  PRIMARY KEY (evaluation_id, dataset_id)
);

-- Indexes for performance
CREATE INDEX idx_evaluations_prompt_id ON prompt_evaluations(prompt_id);
CREATE INDEX idx_evaluations_status ON prompt_evaluations(status);
CREATE INDEX idx_evaluations_created_by ON prompt_evaluations(created_by);
CREATE INDEX idx_traces_prompt_id ON prompt_traces(prompt_id);
CREATE INDEX idx_traces_session_id ON prompt_traces(session_id);
CREATE INDEX idx_traces_created_at ON prompt_traces(created_at DESC);
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_prompt_ids ON experiments USING GIN(prompt_ids);

-- RLS Policies
ALTER TABLE prompt_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_datasets ENABLE ROW LEVEL SECURITY;

-- Evaluation policies
CREATE POLICY "Users can view all evaluations" ON prompt_evaluations
  FOR SELECT USING (true);

CREATE POLICY "Users can create evaluations" ON prompt_evaluations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own evaluations" ON prompt_evaluations
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own evaluations" ON prompt_evaluations
  FOR DELETE USING (auth.uid() = created_by);

-- Similar policies for other tables...
```

### Phase 2: Core Integration (Weeks 4-6)

#### Week 4: API Layer
```typescript
// app/api/evaluations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { phoenixClient } from '@/lib/phoenix/client';
import { supabase } from '@/utils/supabase/server';

const CreateEvaluationSchema = z.object({
  promptId: z.string().uuid(),
  datasetId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  config: z.object({
    model: z.string(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
    evaluators: z.array(z.string())
  })
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = CreateEvaluationSchema.parse(body);

    // Create evaluation in Phoenix
    const phoenixEval = await phoenixClient.createEvaluation({
      name: validatedData.name,
      config: validatedData.config,
      datasetId: validatedData.datasetId
    });

    // Store reference in Supabase
    const { data, error } = await supabase
      .from('prompt_evaluations')
      .insert({
        prompt_id: validatedData.promptId,
        phoenix_eval_id: phoenixEval.id,
        name: validatedData.name,
        description: validatedData.description,
        config: validatedData.config,
        status: 'pending',
        created_by: session.user.id
      })
      .select()
      .single();

    if (error) {
      // Rollback Phoenix evaluation
      await phoenixClient.deleteEvaluation(phoenixEval.id);
      throw error;
    }

    // Start evaluation asynchronously
    phoenixClient.startEvaluation(phoenixEval.id).catch(console.error);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Evaluation creation failed:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create evaluation' },
      { status: 500 }
    );
  }
}
```

#### Week 5: Real-time Updates
```typescript
// lib/phoenix/websocket.ts
import { io, Socket } from 'socket.io-client';
import { phoenixAuthBridge } from '@/lib/auth/phoenix-bridge';

export class PhoenixWebSocket {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners = new Map<string, Set<Function>>();

  async connect(session: any) {
    if (this.socket?.connected) return;

    const token = await phoenixAuthBridge.generateToken(session);
    
    this.socket = io(process.env.NEXT_PUBLIC_PHOENIX_WS_URL!, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to Phoenix WebSocket');
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from Phoenix:', reason);
      this.emit('disconnected', reason);
    });

    this.socket.on('evaluation:update', (data) => {
      this.emit('evaluation:update', data);
    });

    this.socket.on('trace:complete', (data) => {
      this.emit('trace:complete', data);
    });

    this.socket.on('error', (error) => {
      console.error('Phoenix WebSocket error:', error);
      this.emit('error', error);
    });
  }

  subscribe(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data?: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const phoenixWS = new PhoenixWebSocket();
```

#### Week 6: UI Components
```typescript
// components/evaluations/EvaluationDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { phoenixWS } from '@/lib/phoenix/websocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function EvaluationDashboard({ promptId }: { promptId: string }) {
  const [activeEval, setActiveEval] = useState<string | null>(null);
  
  const { data: evaluations, refetch } = useQuery({
    queryKey: ['evaluations', promptId],
    queryFn: () => fetchEvaluations(promptId)
  });

  useEffect(() => {
    const unsubscribe = phoenixWS.subscribe('evaluation:update', (data) => {
      if (data.promptId === promptId) {
        refetch();
      }
    });

    return unsubscribe;
  }, [promptId, refetch]);

  const runEvaluation = useMutation({
    mutationFn: createEvaluation,
    onSuccess: (data) => {
      setActiveEval(data.id);
      refetch();
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Total Evaluations"
              value={evaluations?.length || 0}
              icon={<Activity className="h-4 w-4" />}
            />
            <MetricCard
              title="Success Rate"
              value={`${evaluations?.successRate || 0}%`}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MetricCard
              title="Avg. Latency"
              value={`${evaluations?.avgLatency || 0}ms`}
              icon={<Clock className="h-4 w-4" />}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="runs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="runs">Evaluation Runs</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="traces">Traces</TabsTrigger>
        </TabsList>

        <TabsContent value="runs">
          <EvaluationRunsTable 
            evaluations={evaluations?.runs || []}
            onRunEvaluation={() => runEvaluation.mutate({ promptId })}
          />
        </TabsContent>

        <TabsContent value="metrics">
          <MetricsVisualization promptId={promptId} />
        </TabsContent>

        <TabsContent value="traces">
          <TracesExplorer promptId={promptId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Phase 3: Advanced Features (Weeks 7-9)

#### Week 7: Experimentation Platform
```typescript
// components/experiments/ExperimentBuilder.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

const ExperimentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  hypothesis: z.string().min(1, 'Hypothesis is required'),
  baselinePromptId: z.string().uuid('Select a baseline prompt'),
  variantPromptIds: z.array(z.string().uuid()).min(1, 'Select at least one variant'),
  datasetId: z.string().uuid('Select a dataset'),
  metrics: z.array(z.string()).min(1, 'Select at least one metric'),
  config: z.object({
    sampleSize: z.number().min(10).max(10000),
    confidenceLevel: z.number().min(0.8).max(0.99),
    minDetectableEffect: z.number().min(0.01).max(0.5)
  })
});

export function ExperimentBuilder() {
  const [isRunning, setIsRunning] = useState(false);
  
  const form = useForm({
    resolver: zodResolver(ExperimentSchema),
    defaultValues: {
      config: {
        sampleSize: 100,
        confidenceLevel: 0.95,
        minDetectableEffect: 0.1
      }
    }
  });

  const onSubmit = async (data: z.infer<typeof ExperimentSchema>) => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to create experiment');
      
      const experiment = await response.json();
      // Redirect to experiment details
      window.location.href = `/experiments/${experiment.id}`;
    } catch (error) {
      console.error('Experiment creation failed:', error);
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Experiment</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Form fields implementation */}
            
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline">Cancel</Button>
              <Button type="submit" disabled={isRunning}>
                {isRunning ? 'Creating...' : 'Create Experiment'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

#### Week 8: Performance Monitoring
```typescript
// lib/monitoring/performance.ts
import { metrics } from '@opentelemetry/api';
import { PerformanceObserver } from 'perf_hooks';

export class PerformanceMonitor {
  private meter = metrics.getMeter('sambatv-phoenix');
  private latencyHistogram = this.meter.createHistogram('phoenix_request_latency');
  private errorCounter = this.meter.createCounter('phoenix_errors_total');
  private activeRequests = this.meter.createUpDownCounter('phoenix_active_requests');

  trackRequest(operation: string, fn: () => Promise<any>) {
    const startTime = performance.now();
    this.activeRequests.add(1, { operation });

    return fn()
      .then(result => {
        const duration = performance.now() - startTime;
        this.latencyHistogram.record(duration, { operation, status: 'success' });
        return result;
      })
      .catch(error => {
        const duration = performance.now() - startTime;
        this.latencyHistogram.record(duration, { operation, status: 'error' });
        this.errorCounter.add(1, { operation, error: error.message });
        throw error;
      })
      .finally(() => {
        this.activeRequests.add(-1, { operation });
      });
  }

  // React component performance tracking
  trackComponentRender(componentName: string) {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name === componentName) {
          this.latencyHistogram.record(entry.duration, {
            operation: 'component_render',
            component: componentName
          });
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });
    return observer;
  }
}

export const perfMonitor = new PerformanceMonitor();
```

#### Week 9: Testing & Quality Assurance
```typescript
// __tests__/integration/phoenix-integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { phoenixClient } from '@/lib/phoenix/client';
import { createMockSession } from '@/test/utils';

describe('Phoenix Integration', () => {
  let session: any;
  let testPromptId: string;

  beforeAll(async () => {
    session = await createMockSession();
    // Create test prompt
    const prompt = await createTestPrompt();
    testPromptId = prompt.id;
  });

  afterAll(async () => {
    // Cleanup
    await deleteTestPrompt(testPromptId);
  });

  describe('Evaluation API', () => {
    it('should create evaluation successfully', async () => {
      const evaluation = await phoenixClient.createEvaluation({
        promptId: testPromptId,
        datasetId: 'test-dataset-id',
        name: 'Test Evaluation',
        config: {
          model: 'gpt-4',
          evaluators: ['coherence', 'relevance']
        }
      });

      expect(evaluation).toHaveProperty('id');
      expect(evaluation.status).toBe('pending');
    });

    it('should handle evaluation errors gracefully', async () => {
      await expect(
        phoenixClient.createEvaluation({
          promptId: 'invalid-id',
          datasetId: 'test-dataset-id',
          name: 'Test Evaluation'
        })
      ).rejects.toThrow('Invalid prompt ID');
    });
  });

  describe('Trace Collection', () => {
    it('should collect traces during prompt execution', async () => {
      const traceId = await executePromptWithTracing(testPromptId);
      const trace = await phoenixClient.getTrace(traceId);

      expect(trace).toHaveProperty('spans');
      expect(trace.spans.length).toBeGreaterThan(0);
      expect(trace.spans[0]).toHaveProperty('startTime');
      expect(trace.spans[0]).toHaveProperty('endTime');
    });
  });

  describe('WebSocket Integration', () => {
    it('should receive real-time evaluation updates', async (done) => {
      const unsubscribe = phoenixWS.subscribe('evaluation:update', (data) => {
        expect(data).toHaveProperty('evaluationId');
        expect(data).toHaveProperty('status');
        unsubscribe();
        done();
      });

      // Trigger evaluation
      await phoenixClient.startEvaluation('test-eval-id');
    });
  });
});
```

### Phase 4: Polish & Launch (Weeks 10-12)

#### Week 10: Performance Optimization
- Implement caching strategies
- Optimize bundle sizes
- Add lazy loading for Phoenix components
- Performance testing and tuning

#### Week 11: Documentation & Training
- Create user documentation
- Developer guides
- API documentation
- Training materials for team

#### Week 12: Launch Preparation
- Security audit
- Load testing
- Rollback procedures
- Monitoring setup
- Gradual rollout plan

## Database Design

### Extended Schema for Phoenix Integration

```sql
-- Performance metrics aggregation
CREATE TABLE prompt_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'latency_p50', 'latency_p90', 'latency_p99',
    'tokens_per_second', 'success_rate', 'error_rate'
  )),
  value NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  aggregation_window TEXT NOT NULL CHECK (aggregation_window IN ('1h', '1d', '7d', '30d')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evaluation templates
CREATE TABLE evaluation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alerts configuration
CREATE TABLE phoenix_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  prompt_id UUID REFERENCES prompts(id),
  condition JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create materialized view for performance dashboard
CREATE MATERIALIZED VIEW prompt_performance_summary AS
SELECT 
  p.id AS prompt_id,
  p.title AS prompt_title,
  COUNT(DISTINCT t.id) AS total_traces,
  COUNT(DISTINCT e.id) AS total_evaluations,
  AVG(t.execution_time_ms) AS avg_latency,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.execution_time_ms) AS median_latency,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY t.execution_time_ms) AS p95_latency,
  SUM(CASE WHEN t.status = 'success' THEN 1 ELSE 0 END)::FLOAT / COUNT(t.id) AS success_rate,
  AVG((t.tokens_used->>'total')::INT) AS avg_tokens,
  MAX(t.created_at) AS last_used_at
FROM prompts p
LEFT JOIN prompt_traces t ON p.id = t.prompt_id
LEFT JOIN prompt_evaluations e ON p.id = e.prompt_id
GROUP BY p.id, p.title;

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_performance_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY prompt_performance_summary;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every hour
SELECT cron.schedule('refresh-performance-summary', '0 * * * *', 'SELECT refresh_performance_summary()');
```

## Authentication & Security

### Security Architecture

#### 1. Zero Trust Model
```typescript
// lib/security/zero-trust.ts
export class ZeroTrustValidator {
  async validateRequest(req: Request, requiredPermissions: string[]): Promise<boolean> {
    // 1. Validate session
    const session = await this.validateSession(req);
    if (!session) return false;

    // 2. Validate origin
    if (!this.validateOrigin(req)) return false;

    // 3. Validate permissions
    if (!this.hasPermissions(session, requiredPermissions)) return false;

    // 4. Validate rate limits
    if (!await this.checkRateLimit(session.user.id)) return false;

    // 5. Log access attempt
    await this.logAccess(session, req, requiredPermissions);

    return true;
  }

  private validateOrigin(req: Request): boolean {
    const origin = req.headers.get('origin');
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      'https://phoenix.sambatv.com'
    ];
    return origin ? allowedOrigins.includes(origin) : false;
  }

  private hasPermissions(session: any, required: string[]): boolean {
    const userPermissions = new Set(session.permissions || []);
    return required.every(perm => userPermissions.has(perm));
  }
}
```

#### 2. API Security
```typescript
// middleware/phoenix-security.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { rateLimiter } from '@/lib/security/rate-limit';

export async function phoenixSecurityMiddleware(req: NextRequest) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL!,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers });
  }

  // Verify authentication
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers }
    );
  }

  try {
    const payload = await verifyJWT(token);
    
    // Rate limiting
    const rateLimitResult = await rateLimiter.check(payload.sub);
    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter
        }),
        { 
          status: 429,
          headers: {
            ...headers,
            'Retry-After': rateLimitResult.retryAfter.toString()
          }
        }
      );
    }

    // Add user context to request
    req.headers.set('x-user-id', payload.sub);
    req.headers.set('x-user-role', payload.role);

    return NextResponse.next({ headers });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: 'Invalid token' }),
      { status: 401, headers }
    );
  }
}
```

## Performance Optimization

### 1. Caching Strategy

```typescript
// lib/cache/phoenix-cache-strategy.ts
import { Redis } from '@upstash/redis';
import { LRUCache } from 'lru-cache';

export class PhoenixCacheStrategy {
  private redis: Redis;
  private memoryCache: LRUCache<string, any>;
  
  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!
    });

    this.memoryCache = new LRUCache({
      max: 500,
      ttl: 1000 * 60 * 5, // 5 minutes
      updateAgeOnGet: true
    });
  }

  async get<T>(key: string): Promise<T | null> {
    // L1: Memory cache
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult) return memoryResult;

    // L2: Redis cache
    const redisResult = await this.redis.get(key);
    if (redisResult) {
      this.memoryCache.set(key, redisResult);
      return redisResult as T;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const defaultTTL = 3600; // 1 hour
    const actualTTL = ttl || defaultTTL;

    // Set in both caches
    this.memoryCache.set(key, value);
    await this.redis.set(key, value, { ex: actualTTL });
  }

  async invalidate(pattern: string): Promise<void> {
    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.match(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear Redis cache (requires SCAN in production)
    // This is a simplified version
    await this.redis.del(pattern);
  }
}

export const phoenixCache = new PhoenixCacheStrategy();
```

### 2. Query Optimization

```typescript
// lib/phoenix/query-optimizer.ts
export class QueryOptimizer {
  // Batch multiple Phoenix queries
  async batchQuery<T>(queries: Array<() => Promise<T>>): Promise<T[]> {
    const batchSize = 10;
    const results: T[] = [];

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(query => query().catch(err => ({ error: err })))
      );
      results.push(...batchResults);
    }

    return results;
  }

  // Implement query deduplication
  private queryCache = new Map<string, Promise<any>>();
  
  async deduplicatedQuery<T>(
    key: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    if (this.queryCache.has(key)) {
      return this.queryCache.get(key)!;
    }

    const promise = queryFn().finally(() => {
      // Clean up after 100ms
      setTimeout(() => this.queryCache.delete(key), 100);
    });

    this.queryCache.set(key, promise);
    return promise;
  }
}
```

### 3. Bundle Optimization

```javascript
// next.config.js updates
module.exports = {
  // ... existing config
  
  experimental: {
    optimizePackageImports: [
      '@phoenix/components',
      'recharts',
      '@tanstack/react-table'
    ]
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Phoenix components chunking
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          phoenix: {
            test: /[\\/]phoenix[\\/]/,
            name: 'phoenix',
            priority: 10,
            reuseExistingChunk: true
          },
          charts: {
            test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,
            name: 'charts',
            priority: 10,
            reuseExistingChunk: true
          }
        }
      };
    }

    return config;
  }
};
```

## Migration Strategy

### Phased Rollout Plan

#### Phase 1: Internal Beta (Week 1-2)
- Deploy to staging environment
- Internal team testing
- Collect feedback and iterate

#### Phase 2: Limited Release (Week 3-4)
- 10% of admin users get access
- Monitor performance and errors
- Gather user feedback

#### Phase 3: General Availability (Week 5-6)
- Roll out to all users
- Enable all features
- Marketing announcement

### Feature Flags

```typescript
// lib/features/flags.ts
export const phoenixFeatures = {
  evaluations: {
    enabled: process.env.NEXT_PUBLIC_PHOENIX_EVALUATIONS === 'true',
    rolloutPercentage: 100
  },
  traces: {
    enabled: process.env.NEXT_PUBLIC_PHOENIX_TRACES === 'true',
    rolloutPercentage: 100
  },
  experiments: {
    enabled: process.env.NEXT_PUBLIC_PHOENIX_EXPERIMENTS === 'true',
    rolloutPercentage: 50
  },
  advancedMetrics: {
    enabled: process.env.NEXT_PUBLIC_PHOENIX_ADVANCED_METRICS === 'true',
    rolloutPercentage: 25
  }
};

export function isFeatureEnabled(
  feature: keyof typeof phoenixFeatures,
  userId: string
): boolean {
  const config = phoenixFeatures[feature];
  if (!config.enabled) return false;

  // Simple hash-based rollout
  const hash = userId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  return (hash % 100) < config.rolloutPercentage;
}
```

## Risk Management

### Identified Risks and Mitigation

1. **Performance Degradation**
   - Risk: Phoenix integration slows down the main app
   - Mitigation: Implement circuit breakers, timeouts, and fallbacks

2. **Data Consistency**
   - Risk: Data sync issues between Supabase and Phoenix
   - Mitigation: Implement eventual consistency patterns and reconciliation jobs

3. **Security Vulnerabilities**
   - Risk: Exposed Phoenix endpoints could be attacked
   - Mitigation: Implement comprehensive security middleware and monitoring

4. **User Experience Disruption**
   - Risk: New features confuse existing users
   - Mitigation: Gradual rollout with feature flags and user education

### Rollback Procedures

```bash
#!/bin/bash
# scripts/phoenix-rollback.sh

echo "Starting Phoenix integration rollback..."

# 1. Disable feature flags
kubectl set env deployment/sambatv-app \
  NEXT_PUBLIC_PHOENIX_ENABLED=false \
  NEXT_PUBLIC_PHOENIX_EVALUATIONS=false \
  NEXT_PUBLIC_PHOENIX_TRACES=false

# 2. Scale down Phoenix service
kubectl scale deployment/phoenix --replicas=0

# 3. Revert database migrations
npm run db:migrate:down -- --to 001_phoenix_integration

# 4. Clear caches
npm run cache:clear

# 5. Notify monitoring
curl -X POST $MONITORING_WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{"event": "phoenix_rollback", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'

echo "Rollback completed"
```

## Success Metrics

### Key Performance Indicators (KPIs)

1. **Technical Metrics**
   - Page load time < 2s (p95)
   - API response time < 200ms (p95)
   - Error rate < 0.1%
   - Uptime > 99.9%

2. **User Engagement Metrics**
   - Evaluation feature adoption > 60% in 3 months
   - Average evaluations per user per week > 5
   - Trace viewing rate > 40%
   - Experiment creation rate > 10 per week

3. **Business Metrics**
   - Prompt quality improvement > 25%
   - User satisfaction score > 4.5/5
   - Support ticket reduction > 20%
   - Time to optimize prompts reduced by 50%

### Monitoring Dashboard

```typescript
// lib/monitoring/dashboard-config.ts
export const phoenixDashboardConfig = {
  widgets: [
    {
      type: 'metric',
      title: 'Active Evaluations',
      query: 'count(phoenix_evaluations{status="running"})'
    },
    {
      type: 'chart',
      title: 'Evaluation Latency',
      query: 'histogram_quantile(0.95, phoenix_evaluation_duration_seconds)'
    },
    {
      type: 'heatmap',
      title: 'Error Distribution',
      query: 'sum by (error_type) (rate(phoenix_errors_total[5m]))'
    }
  ],
  alerts: [
    {
      name: 'High Error Rate',
      condition: 'rate(phoenix_errors_total[5m]) > 0.01',
      severity: 'critical'
    },
    {
      name: 'Slow Evaluations',
      condition: 'phoenix_evaluation_duration_seconds{quantile="0.95"} > 30',
      severity: 'warning'
    }
  ]
};
```

## Conclusion

This comprehensive integration plan provides a clear roadmap for incorporating Phoenix's powerful evaluation and observability features into the SambaTV Prompt Library. The hybrid approach ensures minimal disruption while maximizing the benefits of both platforms.

The phased implementation allows for iterative improvements and risk mitigation, while the detailed technical specifications provide clear guidance for the development team. With proper execution, this integration will transform the SambaTV Prompt Library into a best-in-class platform for prompt engineering and optimization.