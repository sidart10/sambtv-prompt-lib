import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { createHmac } from 'crypto';
import { isLangfuseEnabled } from '@/lib/langfuse/client';

// Schema for webhook payload from Langfuse
const langfuseWebhookSchema = z.object({
  event: z.enum(['score.created', 'score.updated', 'trace.created']),
  data: z.object({
    traceId: z.string(),
    score: z.object({
      name: z.string(),
      value: z.number(),
      comment: z.string().optional()
    }).optional(),
    metadata: z.object({
      promptId: z.number().optional()
    }).optional()
  })
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

    const data = langfuseWebhookSchema.parse(JSON.parse(body));
    
    if (!isLangfuseEnabled()) {
      return NextResponse.json({ message: 'Langfuse integration disabled' });
    }

    const supabase = await createClient();

    switch (data.event) {
      case 'score.created':
      case 'score.updated':
        // Update trace with new score
        const { error: updateError } = await supabase
          .from('langfuse_traces')
          .update({
            evaluation_scores: supabase.sql`
              COALESCE(evaluation_scores, '[]'::jsonb) || ${JSON.stringify([data.data.score])}::jsonb
            `,
            updated_at: new Date().toISOString()
          })
          .eq('langfuse_trace_id', data.data.traceId);

        if (updateError) {
          console.error('Failed to update trace scores:', updateError);
          return NextResponse.json(
            { error: 'Failed to update scores' },
            { status: 500 }
          );
        }
        break;

      case 'trace.created':
        // Handle new trace creation if it has promptId metadata
        if (data.data.metadata?.promptId) {
          const { error: insertError } = await supabase
            .from('langfuse_traces')
            .insert({
              prompt_id: data.data.metadata.promptId,
              langfuse_trace_id: data.data.traceId
            });

          if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
            console.error('Failed to create trace reference:', insertError);
          }
        }
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    
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

// Endpoint to manually sync all evaluation data
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!isLangfuseEnabled()) {
      return NextResponse.json({
        message: 'Langfuse integration is not enabled',
        synced: 0
      });
    }

    const supabase = await createClient();
    
    // Get all traces that need syncing (no scores or old data)
    const { data: traces, error } = await supabase
      .from('langfuse_traces')
      .select('*')
      .or('evaluation_scores.is.null,updated_at.lt.' + new Date(Date.now() - 3600000).toISOString())
      .limit(100);

    if (error || !traces) {
      return NextResponse.json(
        { error: 'Failed to fetch traces for sync' },
        { status: 500 }
      );
    }

    const langfuseUrl = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';
    let syncedCount = 0;

    // Batch fetch from Langfuse
    const batchSize = 10;
    for (let i = 0; i < traces.length; i += batchSize) {
      const batch = traces.slice(i, i + batchSize);
      const traceIds = batch.map(t => t.langfuse_trace_id);
      
      try {
        const response = await fetch(
          `${langfuseUrl}/api/public/traces?${traceIds.map(id => `id=${id}`).join('&')}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.LANGFUSE_PUBLIC_KEY}`
            }
          }
        );

        if (response.ok) {
          const langfuseData = await response.json();
          
          // Update each trace with scores
          for (const trace of langfuseData.data) {
            if (trace.scores && trace.scores.length > 0) {
              await supabase
                .from('langfuse_traces')
                .update({
                  evaluation_scores: trace.scores,
                  updated_at: new Date().toISOString()
                })
                .eq('langfuse_trace_id', trace.id);
              
              syncedCount++;
            }
          }
        }
      } catch (fetchError) {
        console.error('Failed to sync batch:', fetchError);
      }
    }

    return NextResponse.json({
      message: 'Sync completed',
      synced: syncedCount,
      total: traces.length
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync evaluation data' },
      { status: 500 }
    );
  }
}