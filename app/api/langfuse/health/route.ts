import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';
import { isLangfuseEnabled, getLangfusePublicUrl } from '@/lib/langfuse/client';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    // Basic health check (no auth required)
    const basicHealth = {
      status: 'ok',
      langfuseEnabled: isLangfuseEnabled(),
      timestamp: new Date().toISOString()
    };

    // If no session, return basic health
    if (!session) {
      return NextResponse.json(basicHealth);
    }

    // Detailed health check for authenticated users
    const checks: Record<string, any> = {
      ...basicHealth,
      checks: {}
    };

    // Check Langfuse configuration
    checks.checks.langfuseConfig = {
      enabled: isLangfuseEnabled(),
      baseUrl: getLangfusePublicUrl(),
      hasPublicKey: !!process.env.LANGFUSE_PUBLIC_KEY,
      hasSecretKey: !!process.env.LANGFUSE_SECRET_KEY,
      hasWebhookSecret: !!process.env.LANGFUSE_WEBHOOK_SECRET
    };

    // Check database connectivity
    try {
      const supabase = await createClient();
      const { count, error } = await supabase
        .from('langfuse_traces')
        .select('*', { count: 'exact', head: true });
      
      checks.checks.database = {
        status: error ? 'error' : 'ok',
        error: error?.message,
        traceCount: count || 0
      };
    } catch (dbError) {
      checks.checks.database = {
        status: 'error',
        error: 'Failed to connect to database'
      };
    }

    // Check Langfuse API connectivity (if enabled)
    if (isLangfuseEnabled()) {
      try {
        const langfuseUrl = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';
        const response = await fetch(`${langfuseUrl}/api/public/health`, {
          headers: {
            'Authorization': `Bearer ${process.env.LANGFUSE_PUBLIC_KEY}`
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        checks.checks.langfuseApi = {
          status: response.ok ? 'ok' : 'error',
          statusCode: response.status,
          reachable: true
        };
      } catch (apiError) {
        checks.checks.langfuseApi = {
          status: 'error',
          reachable: false,
          error: apiError instanceof Error ? apiError.message : 'Unknown error'
        };
      }
    }

    // Check model providers
    checks.checks.modelProviders = {
      anthropic: {
        configured: !!process.env.ANTHROPIC_API_KEY,
        models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
      },
      google: {
        configured: !!process.env.GOOGLE_GEMINI_API_KEY,
        models: ['gemini-1.5-pro', 'gemini-1.5-flash']
      },
      openrouter: {
        configured: !!process.env.OPENROUTER_API_KEY,
        models: ['openai/gpt-4o', 'meta-llama/llama-3.1-70b-instruct']
      }
    };

    // Integration statistics
    try {
      const supabase = await createClient();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: recentTraces } = await supabase
        .from('langfuse_traces')
        .select('created_at, total_cost, latency_ms')
        .gte('created_at', twentyFourHoursAgo);

      if (recentTraces && recentTraces.length > 0) {
        const totalCost = recentTraces.reduce((sum, t) => sum + (t.total_cost || 0), 0);
        const avgLatency = recentTraces.reduce((sum, t) => sum + (t.latency_ms || 0), 0) / recentTraces.length;
        
        checks.stats = {
          last24Hours: {
            traces: recentTraces.length,
            totalCost: Number(totalCost.toFixed(4)),
            avgLatencyMs: Math.round(avgLatency)
          }
        };
      }
    } catch (statsError) {
      // Stats are optional, don't fail health check
    }

    // Overall health status
    const hasErrors = Object.values(checks.checks).some(
      (check: any) => check.status === 'error'
    );
    checks.status = hasErrors ? 'degraded' : 'ok';

    return NextResponse.json(checks);

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}