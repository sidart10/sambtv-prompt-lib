import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { createHmac } from 'crypto';

// Schema for Langfuse usage webhook
const langfuseUsageWebhookSchema = z.object({
  event: z.enum(['generation.completed', 'generation.failed']),
  data: z.object({
    userId: z.string(),
    traceId: z.string(),
    generationId: z.string(),
    model: z.string(),
    modelParameters: z.object({
      provider: z.string()
    }),
    usage: z.object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number()
    }).optional(),
    cost: z.object({
      input: z.number(),
      output: z.number(),
      total: z.number()
    }).optional(),
    latency: z.number().optional(),
    error: z.string().optional(),
    metadata: z.object({
      promptId: z.number().optional(),
      sessionId: z.string().optional()
    }).optional()
  }),
  timestamp: z.string()
});

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const webhookSecret = process.env.LANGFUSE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('LANGFUSE_WEBHOOK_SECRET not configured');
    return false;
  }

  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-langfuse-signature');
    const body = await request.text();
    
    if (!signature || !verifyWebhookSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const data = langfuseUsageWebhookSchema.parse(JSON.parse(body));
    const supabase = await createClient();

    // Map Langfuse data to our usage analytics format
    const usageRecord = {
      user_id: data.data.userId,
      source_app: 'langfuse',
      event_type: data.event,
      model_id: data.data.model,
      provider: data.data.modelParameters.provider,
      prompt_tokens: data.data.usage?.promptTokens || 0,
      completion_tokens: data.data.usage?.completionTokens || 0,
      total_tokens: data.data.usage?.totalTokens || 0,
      input_cost: data.data.cost?.input || 0,
      output_cost: data.data.cost?.output || 0,
      total_cost: data.data.cost?.total || 0,
      latency_ms: data.data.latency ? Math.round(data.data.latency * 1000) : null,
      status: data.event === 'generation.completed' ? 'success' : 'error',
      error_message: data.data.error,
      prompt_id: data.data.metadata?.promptId,
      trace_id: data.data.traceId,
      session_id: data.data.metadata?.sessionId,
      metadata: {
        generationId: data.data.generationId,
        timestamp: data.timestamp
      }
    };

    // Insert usage record
    const { error } = await supabase
      .from('usage_analytics')
      .insert(usageRecord);

    if (error) {
      console.error('Failed to store Langfuse usage data:', error);
      return NextResponse.json(
        { error: 'Failed to store usage data' },
        { status: 500 }
      );
    }

    // If this is related to a prompt, update the langfuse_traces table
    if (data.data.metadata?.promptId) {
      await supabase
        .from('langfuse_traces')
        .update({
          total_cost: data.data.cost?.total,
          latency_ms: data.data.latency ? Math.round(data.data.latency * 1000) : null,
          token_usage: data.data.usage,
          updated_at: new Date().toISOString()
        })
        .eq('langfuse_trace_id', data.data.traceId);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Usage webhook error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid webhook data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Endpoint to configure webhook in Langfuse
export async function GET(request: NextRequest) {
  const webhookUrl = `${process.env.NEXTAUTH_URL}/api/langfuse/usage-webhook`;
  const webhookSecret = process.env.LANGFUSE_WEBHOOK_SECRET;

  return NextResponse.json({
    webhook: {
      url: webhookUrl,
      events: ['generation.completed', 'generation.failed'],
      secretConfigured: !!webhookSecret
    },
    instructions: [
      '1. Add this webhook URL to your Langfuse project settings',
      '2. Select the events: generation.completed, generation.failed',
      '3. Use the same webhook secret in both applications',
      '4. Test the webhook using Langfuse\'s test feature'
    ]
  });
}