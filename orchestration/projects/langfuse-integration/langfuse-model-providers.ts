/**
 * Model Provider Configuration for Langfuse
 * This file should be placed in the Langfuse fork at: packages/shared/src/server/llm/providers.ts
 */

export const modelProviders = {
  // Anthropic Configuration
  anthropic: {
    apiKey: 'sk-ant-api03-G2rMSnvtd5Gaap3hQXjz5Z2_ZxYUXCiVxR4JsvmNEqSZU8-Io4QhwclOjy-20BTaB_vIQOLfs2CQMFMKFtOTyw-j4payQAA',
    baseURL: 'https://api.anthropic.com/v1',
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        maxOutput: 8192,
        pricing: { input: 0.003, output: 0.015 }
      },
      {
        id: 'claude-3-5-haiku-20241022', 
        name: 'Claude 3.5 Haiku',
        contextWindow: 200000,
        maxOutput: 8192,
        pricing: { input: 0.0008, output: 0.004 }
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        contextWindow: 200000,
        maxOutput: 4096,
        pricing: { input: 0.015, output: 0.075 }
      }
    ],
    headers: (apiKey: string) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    }),
    transformRequest: (prompt: string, systemPrompt?: string) => ({
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: 4096,
      temperature: 0.7
    })
  },

  // Google Gemini Configuration
  google: {
    apiKey: 'AIzaSyD5vTlIhgYwj3o02yKL9cROiP_xPy9uUqE',
    models: [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        contextWindow: 2000000,
        maxOutput: 8192,
        pricing: { input: 0.00125, output: 0.005 }
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        contextWindow: 1000000,
        maxOutput: 8192,
        pricing: { input: 0.000075, output: 0.0003 }
      },
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash (Experimental)',
        contextWindow: 1000000,
        maxOutput: 8192,
        pricing: { input: 0.000075, output: 0.0003 }
      }
    ],
    endpoint: (model: string) => 
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,
    headers: () => ({
      'Content-Type': 'application/json'
    }),
    queryParams: (apiKey: string) => ({
      key: apiKey
    }),
    transformRequest: (prompt: string, systemPrompt?: string) => ({
      contents: [{
        parts: [{
          text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192
      }
    })
  },

  // OpenRouter Configuration
  openrouter: {
    apiKey: 'sk-or-v1-a37b4dd731c154f897e1646717f9721Sab500bb2285e6c2d264168b101187a90f',
    baseURL: 'https://openrouter.ai/api/v1',
    models: [
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        maxOutput: 16384,
        pricing: { input: 0.0025, output: 0.01 }
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextWindow: 128000,
        maxOutput: 16384,
        pricing: { input: 0.00015, output: 0.0006 }
      },
      {
        id: 'meta-llama/llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B Instruct',
        contextWindow: 131072,
        maxOutput: 131072,
        pricing: { input: 0.00064, output: 0.00064 }
      },
      {
        id: 'qwen/qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B Instruct',
        contextWindow: 131072,
        maxOutput: 131072,
        pricing: { input: 0.00036, output: 0.00036 }
      }
    ],
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://ai.sambatv.com',
      'X-Title': 'SambaTV AI Platform',
      'Content-Type': 'application/json'
    }),
    transformRequest: (prompt: string, systemPrompt?: string, model?: string) => ({
      model: model || 'openai/gpt-4o',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4096
    })
  }
};

// Helper function to get all available models
export function getAllModels() {
  const models: any[] = [];
  
  Object.entries(modelProviders).forEach(([provider, config]) => {
    if ('models' in config && Array.isArray(config.models)) {
      config.models.forEach(model => {
        models.push({
          ...model,
          provider,
          apiConfigured: !!config.apiKey
        });
      });
    }
  });
  
  return models;
}

// Helper function to validate model configuration
export function validateModelConfig(provider: string, modelId: string): boolean {
  const providerConfig = modelProviders[provider as keyof typeof modelProviders];
  if (!providerConfig) return false;
  
  if (!providerConfig.apiKey) {
    console.error(`Missing API key for provider: ${provider}`);
    return false;
  }
  
  if ('models' in providerConfig) {
    const model = providerConfig.models.find((m: any) => m.id === modelId);
    if (!model) {
      console.error(`Model ${modelId} not found in provider ${provider}`);
      return false;
    }
  }
  
  return true;
}

// Export configuration for Langfuse environment
export const LANGFUSE_MODEL_CONFIG = {
  defaultModel: 'claude-3-5-sonnet-20241022',
  defaultProvider: 'anthropic',
  enabledProviders: ['anthropic', 'google', 'openrouter'],
  webhookUrl: 'https://prompts.sambatv.com/api/langfuse/usage-webhook',
  syncEnabled: true
};