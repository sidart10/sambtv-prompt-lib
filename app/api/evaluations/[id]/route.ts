import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/evaluations/[id] - Get evaluation result
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();

    // Check if ID is for a prompt (get all evaluations) or specific evaluation
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      // Get specific evaluation
      const { data, error } = await supabase
        .from('prompt_evaluations')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Evaluation not found' },
          { status: 404 }
        );
      }

      // Check if user has access
      if (data.user_id !== session.user.id && session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      return NextResponse.json(data);
    } else {
      // Get all evaluations for a prompt
      const { data, error } = await supabase
        .from('prompt_evaluations')
        .select('*')
        .eq('prompt_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching evaluations:', error);
        return NextResponse.json(
          { error: 'Failed to fetch evaluations' },
          { status: 500 }
        );
      }

      // Calculate aggregate metrics
      const aggregates = data.reduce((acc, evaluation) => {
        const evaluatorId = evaluation.evaluator_id;
        if (!acc[evaluatorId]) {
          acc[evaluatorId] = {
            evaluator: evaluatorId,
            count: 0,
            totalScore: 0,
            scores: []
          };
        }
        
        acc[evaluatorId].count++;
        acc[evaluatorId].totalScore += evaluation.score;
        acc[evaluatorId].scores.push(evaluation.score);
        
        return acc;
      }, {} as Record<string, any>);

      const aggregateMetrics = Object.values(aggregates).map((agg: any) => ({
        evaluator: agg.evaluator,
        count: agg.count,
        averageScore: agg.totalScore / agg.count,
        minScore: Math.min(...agg.scores),
        maxScore: Math.max(...agg.scores),
        standardDeviation: calculateStandardDeviation(agg.scores)
      }));

      return NextResponse.json({
        evaluations: data,
        aggregates: aggregateMetrics,
        total: data.length
      });
    }
  } catch (error) {
    console.error('Error in evaluation GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/evaluations/[id] - Delete evaluation
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();

    // Check ownership
    const { data: evaluation } = await supabase
      .from('prompt_evaluations')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      );
    }

    if (evaluation.user_id !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete the evaluation
    const { error } = await supabase
      .from('prompt_evaluations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting evaluation:', error);
      return NextResponse.json(
        { error: 'Failed to delete evaluation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in evaluation DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to calculate standard deviation
function calculateStandardDeviation(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / n;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  
  return Math.sqrt(variance);
}