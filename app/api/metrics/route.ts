/**
 * Prometheus Metrics Endpoint
 * Task 13: Comprehensive Monitoring & Alerts
 * Agent C Implementation
 * 
 * This endpoint exposes application metrics for Prometheus scraping
 */

import { NextResponse } from 'next/server';
import { getMetrics, metricsRegistry } from '@/lib/metrics';
import { collectDefaultMetrics } from 'prom-client';

// Collect default Node.js metrics
collectDefaultMetrics({ register: metricsRegistry });

export async function GET() {
  try {
    const metrics = await getMetrics();
    
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
      },
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}