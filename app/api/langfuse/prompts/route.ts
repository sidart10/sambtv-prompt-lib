import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { syncPromptToLangfuse } from '@/lib/langfuse/client';
import { isLangfuseEnabled } from '@/lib/langfuse/client';

// Schema for bulk sync request
const bulkSyncSchema = z.object({
  promptIds: z.array(z.number()).optional(),
  syncAll: z.boolean().optional().default(false),
  limit: z.number().min(1).max(100).optional().default(50)
});

// Sync prompts to Langfuse
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const data = bulkSyncSchema.parse(body);
    
    const supabase = await createClient();
    
    // Build query
    let query = supabase
      .from('prompts')
      .select('id, title, content, description, model, temperature, tags, category_id')
      .eq('is_published', true);

    if (data.promptIds && data.promptIds.length > 0) {
      query = query.in('id', data.promptIds);
    }
    
    query = query.limit(data.limit);

    const { data: prompts, error } = await query;

    if (error) {
      console.error('Failed to fetch prompts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch prompts' },
        { status: 500 }
      );
    }

    let syncedCount = 0;
    const errors: any[] = [];

    // Sync each prompt to Langfuse
    for (const prompt of prompts || []) {
      try {
        await syncPromptToLangfuse({
          id: prompt.id,
          title: prompt.title,
          content: prompt.content,
          description: prompt.description,
          tags: prompt.tags,
          model: prompt.model,
          temperature: prompt.temperature
        });
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync prompt ${prompt.id}:`, error);
        errors.push({
          promptId: prompt.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: 'Sync completed',
      synced: syncedCount,
      total: prompts?.length || 0,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk sync error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to sync prompts' },
      { status: 500 }
    );
  }
}

// Get prompts with evaluation data
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
    const withEvaluations = searchParams.get('withEvaluations') === 'true';
    const categoryId = searchParams.get('categoryId');
    const tag = searchParams.get('tag');
    
    const supabase = await createClient();
    
    // Build query
    let query = supabase
      .from('prompts')
      .select(`
        *,
        profiles!prompts_author_id_fkey (
          id,
          username,
          avatar_url
        ),
        categories (
          id,
          name,
          slug
        )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data: prompts, error } = await query;

    if (error) {
      console.error('Failed to fetch prompts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch prompts' },
        { status: 500 }
      );
    }

    // If evaluation data is requested, enrich prompts
    if (withEvaluations && prompts) {
      const promptsWithEvals = await Promise.all(
        prompts.map(async (prompt) => {
          const { data: traces } = await supabase
            .from('langfuse_traces')
            .select('evaluation_scores')
            .eq('prompt_id', prompt.id)
            .not('evaluation_scores', 'is', null);

          let avgScore = null;
          let evalCount = 0;

          if (traces && traces.length > 0) {
            const scores = traces
              .flatMap(t => t.evaluation_scores as any[])
              .filter(s => s.name === 'quality' || s.name === 'accuracy')
              .map(s => s.value);

            if (scores.length > 0) {
              avgScore = scores.reduce((sum, val) => sum + val, 0) / scores.length;
              evalCount = scores.length;
            }
          }

          return {
            ...prompt,
            evaluation: {
              averageScore: avgScore,
              count: evalCount
            }
          };
        })
      );

      return NextResponse.json({
        prompts: promptsWithEvals,
        total: promptsWithEvals.length
      });
    }

    return NextResponse.json({
      prompts: prompts || [],
      total: prompts?.length || 0
    });

  } catch (error) {
    console.error('Fetch prompts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}