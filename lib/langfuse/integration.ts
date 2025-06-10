import { syncPromptToLangfuse } from './client';

export interface LangfuseIntegrationConfig {
  promptId: string | number;
  promptContent: string;
  promptTitle: string;
  model?: string;
  temperature?: number;
  systemPrompt?: string;
}

/**
 * Generate Langfuse playground URL with pre-filled prompt data
 */
export function generateLangfusePlaygroundUrl(config: LangfuseIntegrationConfig): string {
  const baseUrl = process.env.NEXT_PUBLIC_LANGFUSE_URL || 'https://ai.sambatv.com';
  const playgroundUrl = new URL('/playground', baseUrl);
  
  // Add query parameters
  const params = new URLSearchParams({
    promptId: config.promptId.toString(),
    prompt: config.promptContent,
    title: config.promptTitle
  });

  if (config.model) {
    params.set('model', config.model);
  }

  if (config.temperature !== undefined) {
    params.set('temperature', config.temperature.toString());
  }

  if (config.systemPrompt) {
    params.set('systemPrompt', config.systemPrompt);
  }

  playgroundUrl.search = params.toString();
  return playgroundUrl.toString();
}

/**
 * Open Langfuse in a new window with session authentication
 */
export async function openInLangfuse(config: LangfuseIntegrationConfig): Promise<void> {
  try {
    // First, get session token
    const response = await fetch('/api/langfuse/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        returnUrl: generateLangfusePlaygroundUrl(config)
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate session token');
    }

    const { authUrl } = await response.json();
    
    // Open Langfuse with authentication
    window.open(authUrl, '_blank');
    
    // Sync prompt to Langfuse in the background
    syncPromptToLangfuse({
      id: config.promptId,
      title: config.promptTitle,
      content: config.promptContent,
      model: config.model,
      temperature: config.temperature
    }).catch(error => {
      console.error('Failed to sync prompt to Langfuse:', error);
    });

  } catch (error) {
    console.error('Failed to open in Langfuse:', error);
    // Fallback to direct URL without session
    window.open(generateLangfusePlaygroundUrl(config), '_blank');
  }
}

/**
 * Create a trace in Langfuse when a prompt is executed
 */
export async function createLangfuseTrace(
  promptId: number,
  traceId: string,
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  },
  totalCost?: number,
  latencyMs?: number
): Promise<boolean> {
  try {
    const response = await fetch('/api/langfuse/traces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        promptId,
        traceId,
        tokenUsage,
        totalCost,
        latencyMs
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to create Langfuse trace:', error);
    return false;
  }
}

/**
 * Fetch evaluation data for a prompt
 */
export async function fetchPromptEvaluations(promptId: string | number) {
  try {
    const response = await fetch(`/api/langfuse/traces?promptId=${promptId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch evaluations');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch evaluations:', error);
    return {
      averageScore: null,
      evaluationCount: 0,
      traces: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// React hooks moved to separate client file: ./hooks.ts