// Task 15: Search Traces API Endpoint
// Search and filter traces with pagination

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { TraceService, TraceFilters } from '@/lib/tracing/service';
import { z } from 'zod';

const searchTracesSchema = z.object({
  query: z.string().optional(),
  model: z.string().optional(),
  status: z.enum(['pending', 'streaming', 'success', 'error', 'cancelled']).optional(),
  source: z.enum(['playground', 'api', 'test']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sessionId: z.string().uuid().optional(),
  promptId: z.string().uuid().optional(),
  minDuration: z.number().int().min(0).optional(),
  maxDuration: z.number().int().min(0).optional(),
  minCost: z.number().min(0).optional(),
  maxCost: z.number().min(0).optional(),
  hasError: z.boolean().optional(),
  streaming: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['created_at', 'duration_ms', 'cost', 'tokens']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeMetrics: z.boolean().default(false)
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = request.nextUrl;
    const queryParams: any = {};
    
    for (const [key, value] of searchParams.entries()) {
      if (value !== '') {
        // Convert numeric parameters
        if (['limit', 'offset', 'minDuration', 'maxDuration'].includes(key)) {
          queryParams[key] = parseInt(value);
        } else if (['minCost', 'maxCost'].includes(key)) {
          queryParams[key] = parseFloat(value);
        } else if (['hasError', 'streaming', 'includeMetrics'].includes(key)) {
          queryParams[key] = value === 'true';
        } else {
          queryParams[key] = value;
        }
      }
    }

    // Validate parameters
    const validation = searchTracesSchema.safeParse(queryParams);
    if (!validation.success) {
      return Response.json(
        { 
          error: 'Invalid query parameters',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const params = validation.data;

    // Build filters
    const filters: TraceFilters = {
      userId: session.user.id, // Always filter by current user unless admin
      limit: params.limit,
      offset: params.offset,
      model: params.model,
      status: params.status,
      source: params.source,
      startDate: params.startDate,
      endDate: params.endDate,
      sessionId: params.sessionId,
      promptId: params.promptId,
      minDuration: params.minDuration,
      maxDuration: params.maxDuration,
      minCost: params.minCost,
      maxCost: params.maxCost,
      hasError: params.hasError,
      streaming: params.streaming
    };

    // Check if user is admin and allow cross-user search
    const userRole = (session.user as any).role;
    if (userRole === 'admin' && searchParams.get('allUsers') === 'true') {
      delete filters.userId; // Remove user filter for admin
    }

    // Get traces
    let traces, totalCount, hasMore;
    
    if (params.query) {
      // Text search
      const searchResults = await TraceService.searchTraces(params.query, filters);
      traces = searchResults;
      totalCount = searchResults.length;
      hasMore = false; // Search doesn't support pagination currently
    } else {
      // Regular filtered query
      const result = await TraceService.getTraces(filters);
      traces = result.traces;
      totalCount = result.totalCount;
      hasMore = result.hasMore;
    }

    // Get metrics if requested
    let metrics = undefined;
    if (params.includeMetrics) {
      metrics = await TraceService.getTraceMetrics(filters);
    }

    // Apply sorting (if different from default)
    if (params.sortBy !== 'created_at' || params.sortOrder !== 'desc') {
      traces.sort((a, b) => {
        let aValue, bValue;
        
        switch (params.sortBy) {
          case 'duration_ms':
            aValue = a.duration_ms || 0;
            bValue = b.duration_ms || 0;
            break;
          case 'cost':
            aValue = parseFloat(a.cost_calculation?.total_cost as any) || 0;
            bValue = parseFloat(b.cost_calculation?.total_cost as any) || 0;
            break;
          case 'tokens':
            aValue = a.tokens_used?.total || 0;
            bValue = b.tokens_used?.total || 0;
            break;
          default:
            aValue = new Date(a.created_at!).getTime();
            bValue = new Date(b.created_at!).getTime();
        }
        
        return params.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });
    }

    // Calculate summary statistics
    const summary = {
      totalTraces: totalCount,
      returnedTraces: traces.length,
      hasMore,
      offset: params.offset,
      limit: params.limit,
      filters: Object.keys(filters).filter(key => filters[key as keyof TraceFilters] !== undefined),
      searchQuery: params.query
    };

    return Response.json({
      success: true,
      traces,
      summary,
      metrics,
      metadata: {
        requestedAt: new Date().toISOString(),
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        includeMetrics: params.includeMetrics
      }
    });

  } catch (error) {
    console.error('[API] Search traces error:', error);
    
    return Response.json(
      { 
        error: 'Failed to search traces',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Support POST for complex queries
  try {
    const body = await request.json();
    
    // Convert body to query parameters and redirect to GET
    const params = new URLSearchParams();
    
    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    // Create new request with query parameters
    const newUrl = new URL(request.url);
    newUrl.search = params.toString();
    
    const newRequest = new NextRequest(newUrl, {
      method: 'GET',
      headers: request.headers
    });

    return GET(newRequest);

  } catch (error) {
    console.error('[API] POST search traces error:', error);
    
    return Response.json(
      { 
        error: 'Failed to process search request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}