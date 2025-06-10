# Task 15: Full Tracing Functionality - Architecture Plan

## 🎯 **Executive Summary**

Design and implement comprehensive AI interaction tracing across the SambaTV AI Platform, building on existing Langfuse integration to provide detailed observability for prompt engineering, model evaluation, and usage analytics.

## 📋 **Requirements Analysis**

### **Core Requirements**
- **End-to-End Tracing**: Track complete AI interaction lifecycle
- **Performance Monitoring**: Latency, token usage, cost tracking
- **Error Analysis**: Detailed error capture and debugging
- **User Journey Tracking**: Cross-app session and workflow tracing
- **Real-Time Visibility**: Live monitoring of AI operations
- **Historical Analysis**: Trend analysis and pattern recognition

### **Technical Requirements**
- **Integration**: Seamless with existing Langfuse webhook system
- **Performance**: <50ms tracing overhead per request
- **Scalability**: Handle 1000+ concurrent traces
- **Storage**: Efficient trace data storage and retrieval
- **Privacy**: Respect user privacy and data protection

## 🏗️ **Architecture Overview**

### **System Components**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Analytics     │
│   Tracing       │◄──►│   Tracing       │◄──►│   Engine        │
│                 │    │   Engine        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Trace         │    │   Database      │    │   Langfuse      │
│   Visualization │    │   Storage       │    │   Integration   │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Data Flow Architecture**

```
User Interaction → Frontend Trace Start → Backend API Call → Model Provider
       ↓                    ↓                    ↓               ↓
Trace Context      Trace Middleware     Model Response    Cost Calculation
       ↓                    ↓                    ↓               ↓
UI Updates ←── Trace Storage ←── Analytics ←── Trace Completion
```

## 🔧 **Technical Implementation Plan**

### **1. Trace Context System**

#### **Trace ID Generation**
```typescript
// /lib/tracing/context.ts
export interface TraceContext {
  traceId: string;
  parentId?: string;
  sessionId: string;
  userId: string;
  startTime: number;
  metadata: {
    source: 'playground' | 'api' | 'test';
    promptId?: string;
    model: string;
    version: string;
  };
}

export class TraceManager {
  static createTrace(context: Partial<TraceContext>): TraceContext;
  static getActiveTrace(): TraceContext | null;
  static updateTrace(traceId: string, updates: Partial<TraceContext>): void;
  static completeTrace(traceId: string, result: TraceResult): void;
}
```

#### **Request Tracing Middleware**
```typescript
// /lib/tracing/middleware.ts
export function withTracing<T extends Request, R extends Response>(
  handler: (req: T, res: R) => Promise<Response>
) {
  return async (req: T, res: R): Promise<Response> => {
    const trace = TraceManager.createTrace({
      source: getRequestSource(req),
      userId: await getUserId(req),
      sessionId: await getSessionId(req)
    });

    try {
      const result = await handler(req, res);
      TraceManager.completeTrace(trace.traceId, {
        status: 'success',
        response: result
      });
      return result;
    } catch (error) {
      TraceManager.completeTrace(trace.traceId, {
        status: 'error',
        error: error.message
      });
      throw error;
    }
  };
}
```

### **2. Database Schema Extensions**

#### **Enhanced Tracing Tables**
```sql
-- Enhanced trace storage building on existing langfuse_traces
CREATE TABLE IF NOT EXISTS ai_interaction_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id VARCHAR(255) UNIQUE NOT NULL,
  parent_trace_id VARCHAR(255),
  session_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  
  -- Request Details
  source VARCHAR(50) NOT NULL, -- 'playground', 'api', 'test'
  prompt_id UUID REFERENCES prompts(id),
  model_id VARCHAR(255) NOT NULL,
  prompt_content TEXT NOT NULL,
  system_prompt TEXT,
  
  -- Parameters
  parameters JSONB NOT NULL DEFAULT '{}',
  
  -- Response Details
  response_content TEXT,
  tokens_used JSONB, -- {input: number, output: number, total: number}
  cost_calculation JSONB, -- {input_cost, output_cost, total_cost}
  
  -- Performance Metrics
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_ms INTEGER,
  first_token_latency_ms INTEGER,
  streaming_enabled BOOLEAN DEFAULT FALSE,
  
  -- Status and Errors
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, success, error
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- Langfuse Integration
  langfuse_trace_id VARCHAR(255),
  langfuse_observation_id VARCHAR(255),
  
  -- Metadata
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_ai_traces_user_id ON ai_interaction_traces(user_id);
CREATE INDEX idx_ai_traces_session_id ON ai_interaction_traces(session_id);
CREATE INDEX idx_ai_traces_created_at ON ai_interaction_traces(created_at);
CREATE INDEX idx_ai_traces_status ON ai_interaction_traces(status);
CREATE INDEX idx_ai_traces_model_id ON ai_interaction_traces(model_id);

-- Trace performance metrics aggregation
CREATE TABLE IF NOT EXISTS trace_metrics_hourly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hour_bucket TIMESTAMPTZ NOT NULL,
  model_id VARCHAR(255) NOT NULL,
  
  -- Aggregated metrics
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  error_requests INTEGER NOT NULL DEFAULT 0,
  
  avg_duration_ms NUMERIC(10,2),
  avg_first_token_latency_ms NUMERIC(10,2),
  avg_tokens_per_request NUMERIC(10,2),
  
  total_cost NUMERIC(12,6) NOT NULL DEFAULT 0,
  total_input_tokens BIGINT NOT NULL DEFAULT 0,
  total_output_tokens BIGINT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(hour_bucket, model_id)
);
```

### **3. API Endpoints**

#### **Tracing API Routes**
```typescript
// /app/api/tracing/start/route.ts
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { source, promptId, model, prompt, systemPrompt } = await request.json();
  
  const trace = await TraceService.startTrace({
    userId: session.user.id,
    source,
    promptId,
    model,
    prompt,
    systemPrompt
  });

  return Response.json({ traceId: trace.traceId });
}

// /app/api/tracing/update/route.ts
export async function POST(request: NextRequest) {
  const { traceId, updates } = await request.json();
  await TraceService.updateTrace(traceId, updates);
  return Response.json({ success: true });
}

// /app/api/tracing/complete/route.ts
export async function POST(request: NextRequest) {
  const { traceId, result } = await request.json();
  await TraceService.completeTrace(traceId, result);
  return Response.json({ success: true });
}

// /app/api/tracing/list/route.ts
export async function GET(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  
  const filters = {
    userId: session.user.id,
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
    model: searchParams.get('model'),
    status: searchParams.get('status'),
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate')
  };

  const traces = await TraceService.getTraces(filters);
  return Response.json(traces);
}
```

### **4. Frontend Integration**

#### **Trace Visualization Components**
```typescript
// /components/tracing/TraceViewer.tsx
export function TraceViewer({ traceId }: { traceId: string }) {
  const { data: trace, isLoading } = useQuery({
    queryKey: ['trace', traceId],
    queryFn: () => TraceService.getTrace(traceId)
  });

  if (isLoading) return <TraceSkeleton />;
  if (!trace) return <TraceNotFound />;

  return (
    <div className="trace-viewer">
      <TraceHeader trace={trace} />
      <TraceTimeline trace={trace} />
      <TraceMetrics trace={trace} />
      <TraceContent trace={trace} />
      <TraceDebugInfo trace={trace} />
    </div>
  );
}

// /components/tracing/TraceDashboard.tsx
export function TraceDashboard() {
  const [filters, setFilters] = useState<TraceFilters>({});
  const { data: traces } = useQuery({
    queryKey: ['traces', filters],
    queryFn: () => TraceService.getTraces(filters)
  });

  return (
    <div className="trace-dashboard">
      <TraceFilters filters={filters} onChange={setFilters} />
      <TraceMetricsOverview />
      <TraceList traces={traces} />
    </div>
  );
}

// /components/tracing/LiveTraceMonitor.tsx
export function LiveTraceMonitor() {
  const { data: liveTraces } = useQuery({
    queryKey: ['live-traces'],
    queryFn: TraceService.getLiveTraces,
    refetchInterval: 2000 // Refresh every 2 seconds
  });

  return (
    <div className="live-trace-monitor">
      <div className="live-metrics">
        <MetricCard title="Active Traces" value={liveTraces?.active || 0} />
        <MetricCard title="Avg Latency" value={`${liveTraces?.avgLatency || 0}ms`} />
        <MetricCard title="Error Rate" value={`${liveTraces?.errorRate || 0}%`} />
      </div>
      <LiveTraceList traces={liveTraces?.traces || []} />
    </div>
  );
}
```

### **5. Playground Integration**

#### **Enhanced Playground with Tracing**
```typescript
// Enhanced playground streaming with automatic tracing
const handleStreamingGeneration = async (prompt: string, systemPrompt: string) => {
  // Start trace
  const traceResponse = await fetch('/api/tracing/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'playground',
      promptId: searchParams.get('promptId'),
      model: selectedModel,
      prompt,
      systemPrompt
    })
  });
  
  const { traceId } = await traceResponse.json();
  
  // Update UI with trace ID
  setCurrentTraceId(traceId);
  
  return new Promise((resolve, reject) => {
    fetch('/api/playground/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        traceId, // Include trace ID in streaming request
        prompt,
        systemPrompt,
        model: selectedModel,
        parameters: { temperature, maxTokens, topP, frequencyPenalty, presencePenalty }
      })
    }).then(response => {
      const reader = response.body?.getReader();
      
      // ... streaming implementation with trace updates
    });
  });
};
```

## 📊 **Analytics and Reporting**

### **Performance Analytics**
```typescript
// /lib/tracing/analytics.ts
export class TraceAnalytics {
  static async getPerformanceMetrics(filters: AnalyticsFilters) {
    return {
      avgLatency: await this.calculateAverageLatency(filters),
      throughput: await this.calculateThroughput(filters),
      errorRate: await this.calculateErrorRate(filters),
      costTrends: await this.calculateCostTrends(filters),
      modelComparison: await this.compareModelPerformance(filters)
    };
  }

  static async generateUsageReport(dateRange: DateRange) {
    return {
      totalRequests: await this.getTotalRequests(dateRange),
      uniqueUsers: await this.getUniqueUsers(dateRange),
      topModels: await this.getTopModels(dateRange),
      costBreakdown: await this.getCostBreakdown(dateRange),
      performanceTrends: await this.getPerformanceTrends(dateRange)
    };
  }
}
```

### **Real-Time Monitoring**
```typescript
// /lib/tracing/monitoring.ts
export class TraceMonitoring {
  static async getSystemHealth() {
    const activeTraces = await this.getActiveTraceCount();
    const errorRate = await this.getCurrentErrorRate();
    const avgLatency = await this.getCurrentLatency();
    
    return {
      status: this.determineSystemStatus(errorRate, avgLatency),
      activeTraces,
      errorRate,
      avgLatency,
      alerts: await this.getActiveAlerts()
    };
  }

  static async createAlert(condition: AlertCondition) {
    // Alert system for performance issues, high error rates, etc.
  }
}
```

## 🔄 **Integration Points**

### **Langfuse Integration Enhancement**
```typescript
// Enhanced Langfuse webhook to capture trace data
export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-langfuse-signature');
  const body = await request.text();
  
  if (!verifyWebhookSignature(signature, body)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);
  
  // Enhanced trace processing with our custom schema
  switch (event.type) {
    case 'trace-created':
      await TraceService.syncLangfuseTrace(event.data);
      break;
    case 'observation-created':
      await TraceService.syncLangfuseObservation(event.data);
      break;
    case 'score-created':
      await TraceService.syncLangfuseScore(event.data);
      break;
  }

  return Response.json({ success: true });
}
```

### **Cost Tracking Integration**
```typescript
// Enhanced cost calculation with tracing
export async function calculateAndTraceModelCost(
  traceId: string,
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
) {
  const cost = calculateModelCost(provider, model, inputTokens, outputTokens);
  
  // Update trace with cost information
  await TraceService.updateTrace(traceId, {
    cost_calculation: cost,
    tokens_used: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens
    }
  });

  return cost;
}
```

## 🛡️ **Security and Privacy**

### **Data Protection**
- **PII Filtering**: Automatic detection and masking of sensitive data
- **Retention Policies**: Configurable data retention (default: 90 days)
- **Access Controls**: Role-based access to trace data
- **Audit Logging**: All trace access logged for compliance

### **Performance Considerations**
- **Async Processing**: Non-blocking trace storage
- **Batch Operations**: Bulk trace updates for efficiency
- **Caching**: Redis caching for frequently accessed traces
- **Compression**: Gzip compression for large trace payloads

## 📋 **Implementation Phases**

### **Phase 1: Foundation (Week 1)**
- ✅ Database schema design and migration
- ✅ Core TraceService implementation
- ✅ Basic API endpoints
- ✅ Middleware integration

### **Phase 2: Integration (Week 2)**
- ✅ Playground tracing integration
- ✅ Streaming API trace integration
- ✅ Langfuse webhook enhancement
- ✅ Basic visualization components

### **Phase 3: Analytics (Week 3)**
- ✅ Performance metrics calculation
- ✅ Usage analytics dashboard
- ✅ Real-time monitoring
- ✅ Alert system

### **Phase 4: Advanced Features (Week 4)**
- ✅ Advanced filtering and search
- ✅ Export functionality
- ✅ Custom analytics queries
- ✅ Performance optimization

## 🧪 **Testing Strategy**

### **Unit Tests**
```typescript
// /tests/tracing/trace-service.test.ts
describe('TraceService', () => {
  test('should create trace with valid context', async () => {
    const trace = await TraceService.startTrace({
      userId: 'test-user',
      source: 'playground',
      model: 'claude-3-5-sonnet',
      prompt: 'Test prompt'
    });
    
    expect(trace.traceId).toBeDefined();
    expect(trace.status).toBe('pending');
  });

  test('should update trace metrics correctly', async () => {
    const trace = await TraceService.startTrace({ /* ... */ });
    
    await TraceService.updateTrace(trace.traceId, {
      first_token_latency_ms: 150,
      tokens_used: { input: 10, output: 20, total: 30 }
    });
    
    const updated = await TraceService.getTrace(trace.traceId);
    expect(updated.first_token_latency_ms).toBe(150);
  });
});
```

### **Integration Tests**
```typescript
// /tests/tracing/integration.test.ts
describe('Tracing Integration', () => {
  test('should trace complete playground interaction', async () => {
    const response = await request(app)
      .post('/api/playground/stream')
      .send({
        prompt: 'Test prompt',
        model: 'claude-3-5-haiku',
        parameters: { temperature: 0.7 }
      });

    expect(response.status).toBe(200);
    
    // Verify trace was created
    const traces = await TraceService.getRecentTraces(1);
    expect(traces).toHaveLength(1);
    expect(traces[0].status).toBe('success');
  });
});
```

## 📈 **Success Metrics**

### **Performance Targets**
- **Trace Creation**: <10ms overhead
- **Trace Storage**: <50ms async processing
- **Dashboard Load**: <2s for 100 traces
- **Real-time Updates**: <5s latency

### **Quality Targets**
- **Data Completeness**: >99% trace capture rate
- **Error Tracking**: 100% error capture with stack traces
- **Cost Accuracy**: <1% variance in cost calculations
- **User Experience**: Seamless integration with existing workflows

## 🚀 **Production Deployment**

### **Rollout Strategy**
1. **Internal Testing**: Full tracing on development environment
2. **Beta Release**: Enable for internal SambaTV users
3. **Gradual Rollout**: 25% → 50% → 100% user base
4. **Full Production**: Complete tracing system active

### **Monitoring and Alerts**
- **System Health**: Real-time monitoring dashboard
- **Performance Alerts**: Latency and error rate thresholds
- **Cost Monitoring**: Usage and cost trend analysis
- **User Feedback**: Integration satisfaction metrics

---

**This architecture provides enterprise-grade tracing capabilities that will transform the SambaTV AI Platform into a fully observable and optimizable AI system. The comprehensive tracing will enable data-driven decisions for prompt engineering, model selection, and performance optimization.**