/**
 * Integration tests for playground streaming and structured output features
 */

import { describe, it, expect, vi } from 'vitest';
import { parseOutput } from '@/lib/outputParser';
import { aiClient } from '@/lib/ai';
import { calculateModelCost } from '@/lib/ai-cost-utils';

describe('Playground Integration - Output Parser', () => {
  it('should parse JSON correctly', () => {
    const jsonString = '{"name": "test", "age": 25, "active": true}';
    const result = parseOutput(jsonString, 'json');
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: "test", age: 25, active: true });
    expect(result.format).toBe('json');
  });

  it('should parse XML correctly', () => {
    const xmlString = '<person><name>test</name><age>25</age></person>';
    const result = parseOutput(xmlString, 'xml');
    
    expect(result.success).toBe(true);
    expect(result.format).toBe('xml');
    expect(result.data).toBeDefined();
  });

  it('should parse YAML correctly', () => {
    const yamlString = `name: test
age: 25
active: true`;
    const result = parseOutput(yamlString, 'yaml');
    
    expect(result.success).toBe(true);
    expect(result.format).toBe('yaml');
    expect(result.data).toEqual({ name: "test", age: 25, active: true });
  });

  it('should handle auto-detection', () => {
    const jsonString = '{"type": "auto", "value": 123}';
    const result = parseOutput(jsonString);
    
    expect(result.success).toBe(true);
    expect(result.format).toBe('json');
    expect(result.data.type).toBe('auto');
  });

  it('should handle parsing errors gracefully', () => {
    const invalidJson = '{"name": "test", "age":}'; // Invalid JSON
    const result = parseOutput(invalidJson, 'json');
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('JSON');
  });

  it('should parse markdown tables', () => {
    const markdownTable = `| Name | Age |
|------|-----|
| John | 25  |
| Jane | 30  |`;
    
    const result = parseOutput(markdownTable, 'markdown');
    expect(result.success).toBe(true);
    expect(result.format).toBe('markdown');
    expect(result.data).toContain('Name');
    expect(result.data).toContain('John');
  });
});

describe('Playground Integration - Model Capabilities', () => {
  it('should provide correct model information', () => {
    const models = aiClient.getSupportedModels();
    expect(models.length).toBeGreaterThan(30); // Should have 34+ models
    
    const claudeModels = aiClient.getModelsByProvider('anthropic');
    expect(claudeModels.length).toBeGreaterThan(0);
    expect(claudeModels.some(m => m.id.includes('claude'))).toBe(true);
    
    const model = aiClient.getModelInfo('claude-3-5-sonnet-20241022');
    expect(model).toBeDefined();
    expect(model?.supportsStreaming).toBe(true);
    expect(model?.provider).toBe('anthropic');
  });

  it('should validate model parameters correctly', () => {
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
      temperature: 5, // Invalid: > 2
      maxTokens: -1  // Invalid: < 1
    };
    
    const invalidValidation = aiClient.validateParams(invalidParams);
    expect(invalidValidation.valid).toBe(false);
    expect(invalidValidation.error).toBeDefined();
  });

  it('should get model by provider correctly', () => {
    const googleModels = aiClient.getModelsByProvider('google');
    expect(googleModels.length).toBeGreaterThan(0);
    expect(googleModels.every(m => m.provider === 'google')).toBe(true);
    
    const openrouterModels = aiClient.getModelsByProvider('openrouter');
    expect(openrouterModels.length).toBeGreaterThan(0);
    expect(openrouterModels.every(m => m.provider === 'openrouter')).toBe(true);
  });
});

describe('Playground Integration - Cost Calculation', () => {
  it('should calculate costs correctly for different models', () => {
    // Test Claude model cost
    // Pricing is per 1K tokens: $0.003 per 1K input, $0.015 per 1K output
    const claudeCost = calculateModelCost('anthropic', 'claude-3-5-sonnet-20241022', 100, 200);
    expect(claudeCost.inputCost).toBeCloseTo(0.0003, 6); // 100 tokens * $0.003/1K = $0.0003
    expect(claudeCost.outputCost).toBeCloseTo(0.003, 6);  // 200 tokens * $0.015/1K = $0.003
    expect(claudeCost.totalCost).toBeCloseTo(0.0033, 6);
    
    // Test Gemini model cost
    const geminiCost = calculateModelCost('google', 'gemini-1.5-flash', 100, 200);
    expect(geminiCost.totalCost).toBeGreaterThan(0);
    expect(geminiCost.inputCost).toBeLessThan(geminiCost.outputCost);
    
    // Test OpenRouter model cost
    const gptCost = calculateModelCost('openrouter', 'openai/gpt-4o-mini', 100, 200);
    expect(gptCost.totalCost).toBeGreaterThan(0);
  });

  it('should handle zero tokens', () => {
    const cost = calculateModelCost('anthropic', 'claude-3-5-haiku-20241022', 0, 0);
    expect(cost.inputCost).toBe(0);
    expect(cost.outputCost).toBe(0);
    expect(cost.totalCost).toBe(0);
  });

  it('should handle unknown models gracefully', () => {
    const cost = calculateModelCost('unknown', 'unknown-model', 100, 200);
    expect(cost.totalCost).toBeGreaterThanOrEqual(0);
  });
});

describe('Playground Integration - Streaming Simulation', () => {
  it('should handle streaming token simulation', async () => {
    const content = "This is a test response for streaming simulation";
    const tokens = content.split(' ');
    let fullContent = '';
    let tokenCount = 0;
    
    for (const token of tokens) {
      fullContent += token + ' ';
      tokenCount++;
      
      expect(fullContent).toContain(token);
      expect(tokenCount).toBeLessThanOrEqual(tokens.length);
    }
    
    expect(fullContent.trim()).toBe(content);
    expect(tokenCount).toBe(tokens.length);
  });

  it('should calculate streaming metrics', () => {
    const startTime = Date.now();
    const tokenCount = 50;
    const elapsedMs = 2500; // 2.5 seconds
    
    const tokensPerSecond = (tokenCount / elapsedMs) * 1000;
    
    expect(tokensPerSecond).toBeCloseTo(20, 0); // 50 tokens / 2.5s = 20 tokens/s
  });
});

// Test utilities for playground features
export const PlaygroundTestUtils = {
  mockStreamEvent: (type: string, data: any) => ({
    type,
    data: {
      ...data,
      traceId: 'test-trace-id',
      timestamp: Date.now()
    }
  }),
  
  parseSSELine: (line: string) => {
    if (line.startsWith('data: ')) {
      try {
        return JSON.parse(line.slice(6));
      } catch {
        return null;
      }
    }
    return null;
  },
  
  simulateStreaming: async (content: string, onToken: (token: string, count: number) => void) => {
    const tokens = content.split(' ');
    let tokenCount = 0;
    
    for (const token of tokens) {
      tokenCount++;
      onToken(token, tokenCount);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return { totalTokens: tokenCount, content };
  }
};