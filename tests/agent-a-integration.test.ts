/**
 * Integration tests for Agent A Task 14 - Advanced Playground Features
 * Tests streaming API and structured output functionality
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock authentication for testing
const mockSession = {
  user: {
    id: 'test-user-123',
    email: 'test@samba.tv',
    name: 'Test User'
  }
};

// Mock auth function
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(mockSession)
}));

describe('Agent A Integration - Task 14 Streaming API', () => {
  const API_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  beforeAll(() => {
    // Setup test environment
    console.log('Setting up Agent A integration tests...');
  });

  afterAll(() => {
    console.log('Agent A integration tests completed');
  });

  describe('Streaming API Endpoint', () => {
    it('should accept valid streaming requests', async () => {
      const response = await fetch(`${API_BASE}/api/playground/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Count from 1 to 3',
          model: 'claude-3-5-haiku-20241022',
          parameters: {
            temperature: 0,
            maxTokens: 50,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
          streamFormat: 'sse'
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/event-stream');
      expect(response.headers.get('cache-control')).toBe('no-cache');
    });

    it('should reject requests without authentication', async () => {
      // Temporarily mock unauthenticated session
      const { auth } = await import('@/lib/auth');
      (auth as any).mockResolvedValueOnce(null);

      const response = await fetch(`${API_BASE}/api/playground/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test prompt',
          model: 'claude-3-5-haiku-20241022',
          parameters: { temperature: 0.7, maxTokens: 100 }
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should validate request parameters', async () => {
      const response = await fetch(`${API_BASE}/api/playground/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: '', // Invalid: empty prompt
          model: 'invalid-model',
          parameters: {
            temperature: 5, // Invalid: > 2
            maxTokens: -1, // Invalid: < 1
          }
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Server-Sent Events Stream', () => {
    it('should stream events in correct order', async () => {
      const response = await fetch(`${API_BASE}/api/playground/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Say hello world',
          model: 'claude-3-5-haiku-20241022',
          parameters: {
            temperature: 0,
            maxTokens: 20,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
          }
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      const events: string[] = [];
      let eventsReceived = 0;
      const maxEvents = 10; // Limit for testing

      if (reader) {
        while (eventsReceived < maxEvents) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                events.push(eventData.type);
                eventsReceived++;
                
                // Test specific event structure
                switch (eventData.type) {
                  case 'connected':
                    expect(eventData.data).toHaveProperty('model');
                    break;
                  case 'token':
                    expect(eventData.data).toHaveProperty('token');
                    expect(eventData.data).toHaveProperty('partial');
                    expect(eventData.data).toHaveProperty('tokenCount');
                    break;
                  case 'complete':
                    expect(eventData.data).toHaveProperty('content');
                    expect(eventData.data).toHaveProperty('usage');
                    expect(eventData.data).toHaveProperty('cost');
                    return; // End test on completion
                }
              } catch (parseError) {
                console.error('Failed to parse event:', parseError);
              }
            }
          }
        }
      }

      // Verify we got expected events
      expect(events).toContain('connected');
      expect(events.filter(e => e === 'token').length).toBeGreaterThan(0);
    });
  });

  describe('Structured Output Support', () => {
    it('should parse JSON structured output', async () => {
      const response = await fetch(`${API_BASE}/api/playground/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Return this JSON: {"name": "test", "value": 42}',
          model: 'claude-3-5-sonnet-20241022',
          parameters: {
            temperature: 0,
            maxTokens: 100,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
          structuredOutput: {
            enabled: true,
            format: 'json'
          }
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let structuredEventReceived = false;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                
                if (eventData.type === 'structured') {
                  structuredEventReceived = true;
                  expect(eventData.data).toHaveProperty('parsed');
                  expect(eventData.data).toHaveProperty('format', 'json');
                  expect(eventData.data).toHaveProperty('raw');
                }
                
                if (eventData.type === 'complete') {
                  break;
                }
              } catch (parseError) {
                console.error('Failed to parse structured event:', parseError);
              }
            }
          }
        }
      }

      expect(structuredEventReceived).toBe(true);
    });
  });

  describe('Model Provider Integration', () => {
    const testModels = [
      'claude-3-5-haiku-20241022',
      'claude-3-5-sonnet-20241022',
      'gemini-1.5-flash',
      'openai/gpt-4o-mini'
    ];

    testModels.forEach(model => {
      it(`should work with ${model}`, async () => {
        const response = await fetch(`${API_BASE}/api/playground/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: 'Say "test successful"',
            model,
            parameters: {
              temperature: 0,
              maxTokens: 20,
              topP: 1,
              frequencyPenalty: 0,
              presencePenalty: 0,
            }
          }),
        });

        // Should either succeed or fail gracefully with specific error
        if (response.status === 200) {
          expect(response.headers.get('content-type')).toBe('text/event-stream');
        } else {
          // Model might not be available, check for proper error handling
          expect([400, 500]).toContain(response.status);
        }
      });
    });
  });

  describe('Cost Calculation Integration', () => {
    it('should include cost data in completion event', async () => {
      const response = await fetch(`${API_BASE}/api/playground/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Short response please',
          model: 'claude-3-5-haiku-20241022',
          parameters: {
            temperature: 0,
            maxTokens: 30,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
          }
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                
                if (eventData.type === 'complete') {
                  expect(eventData.data.cost).toBeDefined();
                  expect(eventData.data.cost.totalCost).toBeGreaterThanOrEqual(0);
                  expect(eventData.data.cost.inputCost).toBeGreaterThanOrEqual(0);
                  expect(eventData.data.cost.outputCost).toBeGreaterThanOrEqual(0);
                  expect(eventData.data.usage).toBeDefined();
                  expect(eventData.data.usage.totalTokens).toBeGreaterThan(0);
                  return;
                }
              } catch (parseError) {
                console.error('Failed to parse completion event:', parseError);
              }
            }
          }
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle model validation errors gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/playground/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test with invalid model',
          model: 'non-existent-model',
          parameters: {
            temperature: 0.7,
            maxTokens: 100,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
          }
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        const { value } = await reader.read();
        const chunk = decoder.decode(value);
        
        expect(chunk).toContain('"type":"error"');
        expect(chunk).toContain('not supported');
      }
    });

    it('should handle prompt length validation', async () => {
      const longPrompt = 'a'.repeat(10001); // Exceeds 10,000 char limit
      
      const response = await fetch(`${API_BASE}/api/playground/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: longPrompt,
          model: 'claude-3-5-haiku-20241022',
          parameters: {
            temperature: 0.7,
            maxTokens: 100,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
          }
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('CORS and Headers', () => {
    it('should include proper CORS headers', async () => {
      const response = await fetch(`${API_BASE}/api/playground/stream`, {
        method: 'OPTIONS',
      });

      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('access-control-allow-methods')).toContain('POST');
      expect(response.headers.get('access-control-allow-headers')).toContain('Content-Type');
    });

    it('should include proper streaming headers', async () => {
      const response = await fetch(`${API_BASE}/api/playground/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test headers',
          model: 'claude-3-5-haiku-20241022',
          parameters: { temperature: 0, maxTokens: 10 }
        }),
      });

      expect(response.headers.get('content-type')).toBe('text/event-stream');
      expect(response.headers.get('cache-control')).toBe('no-cache');
      expect(response.headers.get('connection')).toBe('keep-alive');
    });
  });
});

describe('Agent A Integration - Structured Output Parser', () => {
  it('should parse JSON correctly', async () => {
    const { parseOutput } = await import('@/lib/outputParser');
    
    const jsonString = '{"name": "test", "age": 25, "active": true}';
    const result = parseOutput(jsonString, 'json');
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: "test", age: 25, active: true });
    expect(result.format).toBe('json');
  });

  it('should parse XML correctly', async () => {
    const { parseOutput } = await import('@/lib/outputParser');
    
    const xmlString = '<person><name>test</name><age>25</age></person>';
    const result = parseOutput(xmlString, 'xml');
    
    expect(result.success).toBe(true);
    expect(result.format).toBe('xml');
  });

  it('should handle parsing errors gracefully', async () => {
    const { parseOutput } = await import('@/lib/outputParser');
    
    const invalidJson = '{"name": "test", "age":}'; // Invalid JSON
    const result = parseOutput(invalidJson, 'json');
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('Agent A Integration - Model Capabilities', () => {
  it('should provide correct model information', async () => {
    const { aiClient } = await import('@/lib/ai');
    
    const models = aiClient.getSupportedModels();
    expect(models.length).toBeGreaterThan(30); // Should have 34+ models
    
    const claudeModels = aiClient.getModelsByProvider('anthropic');
    expect(claudeModels.length).toBeGreaterThan(0);
    
    const model = aiClient.getModelInfo('claude-3-5-sonnet-20241022');
    expect(model).toBeDefined();
    expect(model?.supportsStreaming).toBe(true);
  });

  it('should validate model parameters correctly', async () => {
    const { aiClient } = await import('@/lib/ai');
    
    const validParams = {
      model: 'claude-3-5-haiku-20241022',
      prompt: 'Test prompt',
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1.0
    };
    
    const validation = aiClient.validateParams(validParams);
    expect(validation.valid).toBe(true);
    
    const invalidParams = {
      model: 'invalid-model',
      prompt: '',
      temperature: 5,
      maxTokens: -1
    };
    
    const invalidValidation = aiClient.validateParams(invalidParams);
    expect(invalidValidation.valid).toBe(false);
    expect(invalidValidation.error).toBeDefined();
  });
});

// Export test utilities for Agent A to use
export const AgentATestUtils = {
  mockSession,
  testStreamingEndpoint: async (prompt: string, model: string) => {
    const response = await fetch('/api/playground/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model,
        parameters: { temperature: 0, maxTokens: 50 }
      })
    });
    return response;
  },
  
  parseStreamEvent: (line: string) => {
    if (line.startsWith('data: ')) {
      try {
        return JSON.parse(line.slice(6));
      } catch {
        return null;
      }
    }
    return null;
  }
};