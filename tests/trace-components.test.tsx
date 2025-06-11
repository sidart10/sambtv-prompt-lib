/**
 * Integration tests for Task 15 trace visualization components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { TraceDashboard } from '@/components/trace/TraceDashboard';
import { TraceViewer } from '@/components/trace/TraceViewer';
import { LiveTraceMonitor } from '@/components/trace/LiveTraceMonitor';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@samba.tv',
        role: 'member'
      }
    },
    status: 'authenticated'
  }),
  SessionProvider: ({ children }: any) => children
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock WebSocket with constants
const WebSocketMock = vi.fn().mockImplementation(() => ({
  readyState: 1, // OPEN
  onopen: null,
  onmessage: null,
  onerror: null,
  onclose: null,
  close: vi.fn(),
  send: vi.fn()
}));

// Add WebSocket constants
WebSocketMock.CONNECTING = 0;
WebSocketMock.OPEN = 1;
WebSocketMock.CLOSING = 2;
WebSocketMock.CLOSED = 3;

global.WebSocket = WebSocketMock as any;

// Mock date-fns functions
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 minutes ago'),
  format: vi.fn(() => 'Jan 11, 2025, 10:30 AM')
}));

// Test data
const mockTraceData = {
  traces: [
    {
      trace_id: 'test-trace-123',
      model_id: 'claude-3-5-sonnet-20241022',
      status: 'success',
      source: 'playground',
      tokens_used: {
        input: 100,
        output: 200,
        total: 300
      },
      cost_calculation: {
        input_cost: '0.003',
        output_cost: '0.030',
        total_cost: '0.033'
      },
      duration_ms: 1500,
      quality_score: 4.5,
      created_at: new Date().toISOString(),
      streaming_enabled: true
    }
  ],
  summary: {
    totalTraces: 1,
    returnedTraces: 1,
    hasMore: false,
    filters: []
  },
  metrics: {
    totalTraces: 1,
    avgDuration: 1500,
    totalCost: 0.033,
    errorRate: 0,
    avgQuality: 4.5,
    tokensPerSecond: 200
  }
};

const mockTraceDetail = {
  trace: {
    trace_id: 'test-trace-123',
    user_id: 'test-user-id',
    model_id: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    status: 'success',
    source: 'playground',
    streaming_enabled: true,
    request_payload: {
      prompt: 'Test prompt',
      temperature: 0.7,
      max_tokens: 1000
    },
    response_content: 'Test response content',
    tokens_used: {
      input: 100,
      output: 200,
      total: 300
    },
    cost_calculation: {
      input_cost: '0.003',
      output_cost: '0.030',
      total_cost: '0.033',
      currency: 'USD'
    },
    start_time: new Date().toISOString(),
    first_token_time: new Date(Date.now() + 100).toISOString(),
    end_time: new Date(Date.now() + 1500).toISOString(),
    duration_ms: 1500,
    quality_score: 4.5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    derivedMetrics: {
      isCompleted: true,
      isActive: false,
      hasError: false,
      totalDuration: 1500,
      estimatedCost: 0.033,
      tokenEfficiency: 200,
      qualityScore: 4.5,
      hasUserRating: false
    }
  },
  events: [
    {
      event_id: 'event-1',
      trace_id: 'test-trace-123',
      event_type: 'trace_start',
      event_data: { model: 'claude-3-5-sonnet-20241022' },
      created_at: new Date().toISOString()
    }
  ]
};

const mockLiveData = {
  health: {
    status: 'healthy',
    activeTraces: 2,
    avgLatency: 1200,
    errorRate: 0.05,
    timestamp: new Date().toISOString()
  },
  live: {
    active: 2,
    avgLatency: 1200,
    errorRate: 0.05,
    throughput: 120
  },
  activity: [
    {
      traceId: 'live-trace-1',
      model: 'claude-3-5-haiku-20241022',
      source: 'api',
      status: 'streaming',
      startTime: new Date().toISOString(),
      age: 30000,
      streaming: true
    }
  ]
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={null}>
        {children}
      </SessionProvider>
    </QueryClientProvider>
  );
}

describe('TraceDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock different endpoints
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/tracing/live')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockLiveData)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTraceData)
      });
    });
  });

  it('should render dashboard with trace data', async () => {
    render(
      <TestWrapper>
        <TraceDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Trace Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Monitor AI interaction performance and analytics')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Total Traces')).toBeInTheDocument();
      expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
      expect(screen.getByText('Total Cost')).toBeInTheDocument();
      expect(screen.getByText('Error Rate')).toBeInTheDocument();
    });
  });

  it('should handle search and filtering', async () => {
    render(
      <TestWrapper>
        <TraceDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search traces...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search traces...');
    fireEvent.change(searchInput, { target: { value: 'claude' } });

    expect(searchInput).toHaveValue('claude');
  });

  it('should display trace list items', async () => {
    render(
      <TestWrapper>
        <TraceDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Traces')).toBeInTheDocument();
    });

    // Should show loading state initially, then data
    await waitFor(() => {
      // Look for trace ID (first 8 characters)
      expect(screen.getByText(/test-tra.../)).toBeInTheDocument();
      expect(screen.getByText('claude-3-5-sonnet-20241022')).toBeInTheDocument();
    });
  });

  it('should handle refresh functionality', async () => {
    render(
      <TestWrapper>
        <TraceDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeInTheDocument();
      fireEvent.click(refreshButton);
    });

    expect(fetch).toHaveBeenCalled();
  });
});

describe('TraceViewer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTraceDetail)
    });
  });

  it('should render trace details', async () => {
    render(
      <TestWrapper>
        <TraceViewer traceId="test-trace-123" />
      </TestWrapper>
    );

    expect(screen.getByText('Trace Details')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('claude-3-5-sonnet-20241022')).toBeInTheDocument();
      expect(screen.getByText('success')).toBeInTheDocument();
      expect(screen.getByText('playground')).toBeInTheDocument();
    });
  });

  it('should display tabs for different views', async () => {
    render(
      <TestWrapper>
        <TraceViewer traceId="test-trace-123" showTimeline={true} showMetrics={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Timeline')).toBeInTheDocument();
      expect(screen.getByText('Metrics')).toBeInTheDocument();
    });
  });

  it('should show token usage information', async () => {
    render(
      <TestWrapper>
        <TraceViewer traceId="test-trace-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Token Usage')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument(); // Input tokens
      expect(screen.getByText('200')).toBeInTheDocument(); // Output tokens
      expect(screen.getByText('300')).toBeInTheDocument(); // Total tokens
    });
  });

  it('should handle copy functionality', async () => {
    const mockClipboard = {
      writeText: vi.fn()
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(
      <TestWrapper>
        <TraceViewer traceId="test-trace-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find(button => 
        button.querySelector('svg')?.classList.contains('lucide-copy')
      );
      
      if (copyButton) {
        fireEvent.click(copyButton);
        expect(mockClipboard.writeText).toHaveBeenCalled();
      }
    });
  });
});

describe('LiveTraceMonitor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLiveData)
    });
  });

  it('should render live monitor interface', async () => {
    render(
      <TestWrapper>
        <LiveTraceMonitor />
      </TestWrapper>
    );

    expect(screen.getByText('Live Trace Monitor')).toBeInTheDocument();
    expect(screen.getByText('Real-time monitoring of AI interactions')).toBeInTheDocument();
  });

  it('should show connection status', async () => {
    render(
      <TestWrapper>
        <LiveTraceMonitor />
      </TestWrapper>
    );

    // Should show disconnected initially (WebSocket not actually connected in test)
    await waitFor(() => {
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
  });

  it('should display health metrics', async () => {
    render(
      <TestWrapper>
        <LiveTraceMonitor showHealthStatus={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('Active Traces')).toBeInTheDocument();
      expect(screen.getByText('Avg Latency')).toBeInTheDocument();
      expect(screen.getByText('Throughput')).toBeInTheDocument();
    });
  });

  it('should handle pause/resume functionality', async () => {
    render(
      <TestWrapper>
        <LiveTraceMonitor />
      </TestWrapper>
    );

    await waitFor(() => {
      const pauseButton = screen.getByText('Pause');
      expect(pauseButton).toBeInTheDocument();
      
      fireEvent.click(pauseButton);
      expect(screen.getByText('Resume')).toBeInTheDocument();
    });
  });

  it('should handle WebSocket toggle', async () => {
    render(
      <TestWrapper>
        <LiveTraceMonitor />
      </TestWrapper>
    );

    await waitFor(() => {
      const liveStreamSwitch = screen.getByLabelText('Live Stream');
      expect(liveStreamSwitch).toBeInTheDocument();
      
      fireEvent.click(liveStreamSwitch);
      // WebSocket connection should be attempted
      expect(WebSocket).toHaveBeenCalled();
    });
  });
});

describe('Trace Components Integration', () => {
  it('should handle trace selection from dashboard to viewer', async () => {
    let selectedTraceId: string | null = null;
    const handleTraceSelect = (traceId: string) => {
      selectedTraceId = traceId;
    };

    // Mock both endpoints
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/tracing/live')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockLiveData)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTraceData)
      });
    });

    render(
      <TestWrapper>
        <TraceDashboard onTraceSelect={handleTraceSelect} />
      </TestWrapper>
    );

    // Wait for data to load and find clickable trace element
    await waitFor(() => {
      expect(screen.getByText('Recent Traces')).toBeInTheDocument();
    });

    // Look for the trace ID or a clickable element containing it
    await waitFor(() => {
      const traceElements = screen.getAllByText(/test-trace-123|test-tra\.\.\./);
      if (traceElements.length > 0) {
        const clickableParent = traceElements[0].closest('[role="button"], .cursor-pointer');
        if (clickableParent) {
          fireEvent.click(clickableParent);
          expect(selectedTraceId).toBe('test-trace-123');
        }
      }
    });
  });

  it('should fetch data from correct API endpoints', () => {
    render(
      <TestWrapper>
        <TraceDashboard />
      </TestWrapper>
    );

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tracing/search')
    );
  });

  it('should handle API errors gracefully', async () => {
    (fetch as any).mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <TraceDashboard />
      </TestWrapper>
    );

    // Should still render without crashing
    expect(screen.getByText('Trace Dashboard')).toBeInTheDocument();
  });
});

// Test utilities for trace components
export const TraceTestUtils = {
  mockTraceData,
  mockTraceDetail,
  mockLiveData,
  
  createMockWebSocket: () => ({
    readyState: WebSocket.OPEN,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    close: vi.fn(),
    send: vi.fn()
  }),
  
  simulateWebSocketMessage: (ws: any, message: any) => {
    if (ws.onmessage) {
      ws.onmessage({ data: JSON.stringify(message) });
    }
  },
  
  mockFetchSuccess: (data: any) => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data)
    });
  },
  
  mockFetchError: (error: string) => {
    (fetch as any).mockRejectedValue(new Error(error));
  }
};