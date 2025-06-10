import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { generateLangfusePlaygroundUrl } from '@/lib/langfuse/integration';

// Schema for creating an experiment
const createExperimentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  basePromptId: z.number(),
  variants: z.array(z.object({
    name: z.string(),
    promptContent: z.string(),
    model: z.string().optional(),
    temperature: z.number().optional(),
    systemPrompt: z.string().optional()
  })).min(1).max(5)
});

// Schema for experiment results
const experimentResultsSchema = z.object({
  experimentId: z.string(),
  variantId: z.string(),
  score: z.number().min(0).max(1),
  feedback: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Create a new experiment
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = createExperimentSchema.parse(body);
    
    const supabase = await createClient();
    
    // Get base prompt details
    const { data: basePrompt, error: promptError } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', data.basePromptId)
      .single();

    if (promptError || !basePrompt) {
      return NextResponse.json(
        { error: 'Base prompt not found' },
        { status: 404 }
      );
    }

    // Create experiment record
    const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const experiment = {
      id: experimentId,
      name: data.name,
      description: data.description,
      basePromptId: data.basePromptId,
      userId: session.user.id,
      status: 'active',
      variants: data.variants.map((variant, index) => ({
        id: `var_${index}_${Math.random().toString(36).substr(2, 9)}`,
        ...variant,
        langfuseUrl: generateLangfusePlaygroundUrl({
          promptId: `${experimentId}_${index}`,
          promptContent: variant.promptContent,
          promptTitle: `${data.name} - ${variant.name}`,
          model: variant.model || basePrompt.model,
          temperature: variant.temperature ?? basePrompt.temperature,
          systemPrompt: variant.systemPrompt
        })
      })),
      createdAt: new Date().toISOString()
    };

    // Store experiment data (in a real implementation, this would go to a database)
    // For now, we'll return the experiment configuration
    
    return NextResponse.json({
      experiment,
      message: 'Experiment created successfully',
      instructions: 'Test each variant in Langfuse and submit results using the experiment ID'
    });

  } catch (error) {
    console.error('Experiment creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    );
  }
}

// Submit experiment results
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = experimentResultsSchema.parse(body);
    
    // In a real implementation, this would:
    // 1. Store the results in the database
    // 2. Calculate statistical significance
    // 3. Update experiment metrics
    
    return NextResponse.json({
      message: 'Results recorded successfully',
      experimentId: data.experimentId,
      variantId: data.variantId,
      score: data.score
    });

  } catch (error) {
    console.error('Results submission error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to submit results' },
      { status: 500 }
    );
  }
}

// Get experiment results and analysis
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const experimentId = searchParams.get('experimentId');
    
    if (!experimentId) {
      return NextResponse.json(
        { error: 'experimentId is required' },
        { status: 400 }
      );
    }

    // In a real implementation, this would fetch from database
    // For now, return mock analysis
    
    return NextResponse.json({
      experimentId,
      status: 'completed',
      results: {
        variants: [
          {
            id: 'var_0',
            name: 'Original',
            metrics: {
              averageScore: 0.75,
              sampleSize: 50,
              confidenceInterval: [0.70, 0.80]
            }
          },
          {
            id: 'var_1',
            name: 'Variant A',
            metrics: {
              averageScore: 0.82,
              sampleSize: 48,
              confidenceInterval: [0.77, 0.87]
            },
            improvement: '+9.3%',
            significant: true
          }
        ],
        recommendation: 'Variant A shows statistically significant improvement',
        confidence: 0.95
      }
    });

  } catch (error) {
    console.error('Fetch results error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiment results' },
      { status: 500 }
    );
  }
}