/**
 * Model configuration for Langfuse integration
 * This configuration ensures consistency between main app and Langfuse
 */

export interface ModelProvider {
  id: string;
  name: string;
  apiKeyEnvVar: string;
  baseUrl?: string;
  models: ModelConfig[];
}

export interface ModelConfig {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
  pricing: {
    input: number;  // per 1K tokens
    output: number; // per 1K tokens
  };
}

export const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        maxOutput: 8192,
        pricing: {
          input: 0.003,
          output: 0.015
        }
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        contextWindow: 200000,
        maxOutput: 8192,
        pricing: {
          input: 0.0008,
          output: 0.004
        }
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        contextWindow: 200000,
        maxOutput: 4096,
        pricing: {
          input: 0.015,
          output: 0.075
        }
      }
    ]
  },
  {
    id: 'google',
    name: 'Google',
    apiKeyEnvVar: 'GOOGLE_GEMINI_API_KEY',
    models: [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        contextWindow: 2000000,
        maxOutput: 8192,
        pricing: {
          input: 0.00125,
          output: 0.005
        }
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        contextWindow: 1000000,
        maxOutput: 8192,
        pricing: {
          input: 0.000075,
          output: 0.0003
        }
      },
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash (Experimental)',
        contextWindow: 1000000,
        maxOutput: 8192,
        pricing: {
          input: 0.000075,
          output: 0.0003
        }
      }
    ]
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    apiKeyEnvVar: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        maxOutput: 16384,
        pricing: {
          input: 0.0025,
          output: 0.01
        }
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextWindow: 128000,
        maxOutput: 16384,
        pricing: {
          input: 0.00015,
          output: 0.0006
        }
      },
      {
        id: 'meta-llama/llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B Instruct',
        contextWindow: 131072,
        maxOutput: 131072,
        pricing: {
          input: 0.00064,
          output: 0.00064
        }
      },
      {
        id: 'qwen/qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B Instruct',
        contextWindow: 131072,
        maxOutput: 131072,
        pricing: {
          input: 0.00036,
          output: 0.00036
        }
      }
    ]
  }
];

/**
 * Get all available models across all providers
 */
export function getAllModels(): Array<ModelConfig & { provider: string }> {
  return MODEL_PROVIDERS.flatMap(provider =>
    provider.models.map(model => ({
      ...model,
      provider: provider.id
    }))
  );
}

/**
 * Get model configuration by ID
 */
export function getModelConfig(modelId: string): (ModelConfig & { provider: string }) | undefined {
  for (const provider of MODEL_PROVIDERS) {
    const model = provider.models.find(m => m.id === modelId);
    if (model) {
      return {
        ...model,
        provider: provider.id
      };
    }
  }
  return undefined;
}

/**
 * Validate that all required API keys are configured
 */
export function validateApiKeys(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const provider of MODEL_PROVIDERS) {
    if (!process.env[provider.apiKeyEnvVar]) {
      missing.push(`${provider.name} (${provider.apiKeyEnvVar})`);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Get environment configuration for Langfuse
 */
export function getLangfuseEnvConfig(): Record<string, string | undefined> {
  return {
    // Model API Keys
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    
    // Langfuse Configuration
    LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
    LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
    LANGFUSE_BASE_URL: process.env.LANGFUSE_BASE_URL || 'https://ai.sambatv.com',
    NEXT_PUBLIC_LANGFUSE_ENABLED: process.env.NEXT_PUBLIC_LANGFUSE_ENABLED || 'true',
    
    // Shared Auth Configuration
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    
    // Database Configuration for Langfuse
    LANGFUSE_DATABASE_URL: process.env.LANGFUSE_DATABASE_URL || 
      `postgresql://langfuse:${process.env.LANGFUSE_DB_PASSWORD}@localhost:5432/langfuse`
  };
}