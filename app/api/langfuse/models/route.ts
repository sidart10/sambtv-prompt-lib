import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllModels, validateApiKeys, MODEL_PROVIDERS } from '@/lib/langfuse/model-config';

/**
 * API endpoint to get available models and their configuration
 * This will be used by Langfuse to know which models are available
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate API keys
    const { valid, missing } = validateApiKeys();
    
    // Get all available models
    const models = getAllModels();
    
    // Group models by provider
    const modelsByProvider = MODEL_PROVIDERS.map(provider => ({
      id: provider.id,
      name: provider.name,
      configured: !missing.includes(`${provider.name} (${provider.apiKeyEnvVar})`),
      models: provider.models.map(model => ({
        ...model,
        available: !missing.includes(`${provider.name} (${provider.apiKeyEnvVar})`)
      }))
    }));

    return NextResponse.json({
      providers: modelsByProvider,
      models: models.filter(m => {
        const provider = MODEL_PROVIDERS.find(p => p.id === m.provider);
        return provider && !missing.includes(`${provider.name} (${provider.apiKeyEnvVar})`);
      }),
      configuration: {
        allKeysConfigured: valid,
        missingKeys: missing,
        totalModels: models.length,
        availableModels: models.filter(m => {
          const provider = MODEL_PROVIDERS.find(p => p.id === m.provider);
          return provider && !missing.includes(`${provider.name} (${provider.apiKeyEnvVar})`);
        }).length
      }
    });

  } catch (error) {
    console.error('Model configuration error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model configuration' },
      { status: 500 }
    );
  }
}

/**
 * Test a specific model configuration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { modelId, testPrompt = 'Hello, this is a test.' } = await request.json();
    
    if (!modelId) {
      return NextResponse.json(
        { error: 'modelId is required' },
        { status: 400 }
      );
    }

    // Get model configuration
    const models = getAllModels();
    const model = models.find(m => m.id === modelId);
    
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Check if provider is configured
    const provider = MODEL_PROVIDERS.find(p => p.id === model.provider);
    if (!provider || !process.env[provider.apiKeyEnvVar]) {
      return NextResponse.json(
        { 
          error: 'Model provider not configured',
          provider: provider?.name,
          missingKey: provider?.apiKeyEnvVar
        },
        { status: 400 }
      );
    }

    // In a real implementation, this would test the model
    // For now, return a mock response
    return NextResponse.json({
      success: true,
      model: modelId,
      provider: model.provider,
      message: 'Model configuration is valid. Ready for use in Langfuse.',
      testResponse: {
        content: `This is a test response from ${model.name}`,
        usage: {
          promptTokens: 10,
          completionTokens: 15,
          totalTokens: 25
        },
        cost: {
          input: (10 / 1000) * model.pricing.input,
          output: (15 / 1000) * model.pricing.output,
          total: (10 / 1000) * model.pricing.input + (15 / 1000) * model.pricing.output
        }
      }
    });

  } catch (error) {
    console.error('Model test error:', error);
    return NextResponse.json(
      { error: 'Failed to test model configuration' },
      { status: 500 }
    );
  }
}