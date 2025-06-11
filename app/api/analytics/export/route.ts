import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AnalyticsService } from '@/lib/analytics/service';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Validation schema
const exportRequestSchema = z.object({
  reportType: z.enum(['usage', 'cost', 'performance', 'custom']),
  format: z.enum(['csv', 'json', 'pdf', 'excel']),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  filters: z.object({
    modelId: z.string().optional(),
    userId: z.string().optional(),
    source: z.enum(['playground', 'api', 'test']).optional()
  }).optional(),
  includeDetails: z.boolean().optional()
});

// POST /api/analytics/export - Create export job
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = exportRequestSchema.parse(body);

    const dateRange = {
      start: new Date(validatedData.dateRange.start),
      end: new Date(validatedData.dateRange.end)
    };

    // Create export job
    const { jobId } = await AnalyticsService.exportAnalytics(
      validatedData.reportType,
      validatedData.format,
      dateRange,
      validatedData.filters
    );

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Export job created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Export creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create export job' },
      { status: 500 }
    );
  }
}

// GET /api/analytics/export - Get export status and download
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const action = searchParams.get('action') || 'status';

    if (action === 'list') {
      // List user's export jobs
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('analytics_export_queue')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw new Error(`Failed to fetch export jobs: ${error.message}`);
      }

      return NextResponse.json({
        exports: data?.map(job => ({
          id: job.id,
          reportType: job.report_type,
          exportType: job.export_type,
          status: job.status,
          progress: job.progress,
          createdAt: job.created_at,
          completedAt: job.completed_at,
          fileSize: job.file_size_bytes,
          errorMessage: job.error_message
        })) || []
      });
    }

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: job, error } = await supabase
      .from('analytics_export_queue')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', session.user.id)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: 'Export job not found' },
        { status: 404 }
      );
    }

    if (action === 'download' && job.status === 'completed' && job.file_url) {
      // In production, this would redirect to the actual file URL
      // For now, we'll generate the content on-demand
      const content = await generateExportContent(job);
      
      const headers = new Headers();
      headers.set('Content-Type', getContentType(job.export_type));
      headers.set('Content-Disposition', `attachment; filename="analytics_${job.report_type}_${job.id}.${job.export_type}"`);
      
      return new NextResponse(content, { headers });
    }

    // Process the job if it's still pending
    if (job.status === 'pending') {
      try {
        await processExportJob(job);
      } catch (error) {
        console.error('Failed to process export job:', error);
      }
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      reportType: job.report_type,
      exportType: job.export_type,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      fileSize: job.file_size_bytes,
      fileUrl: job.file_url,
      errorMessage: job.error_message
    });
  } catch (error) {
    console.error('Export status error:', error);
    return NextResponse.json(
      { error: 'Failed to get export status' },
      { status: 500 }
    );
  }
}

// Helper function to process export job
async function processExportJob(job: any): Promise<void> {
  const supabase = await createClient();
  
  try {
    // Update status to processing
    await supabase
      .from('analytics_export_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        progress: 10
      })
      .eq('id', job.id);

    // Generate the export content
    const content = await generateExportContent(job);
    
    // In production, upload to storage and get URL
    const fileSize = Buffer.byteLength(content, 'utf8');
    
    // Update job as completed
    await supabase
      .from('analytics_export_queue')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        file_url: `/api/analytics/export?jobId=${job.id}&action=download`,
        file_size_bytes: fileSize
      })
      .eq('id', job.id);
  } catch (error) {
    // Update job as failed
    await supabase
      .from('analytics_export_queue')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);
    
    throw error;
  }
}

// Helper function to generate export content
async function generateExportContent(job: any): Promise<string> {
  const dateRange = {
    start: new Date(job.date_range_start),
    end: new Date(job.date_range_end)
  };

  let data: any;

  switch (job.report_type) {
    case 'usage':
      data = await AnalyticsService.getUsageMetrics(dateRange, job.filters);
      break;
    case 'cost':
      data = await AnalyticsService.analyzeCosts(dateRange);
      break;
    case 'performance':
      data = await AnalyticsService.compareModels(dateRange);
      break;
    default:
      throw new Error(`Unsupported report type: ${job.report_type}`);
  }

  switch (job.export_type) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'csv':
      return convertToCSV(data, job.report_type);
    case 'pdf':
      return generatePDF(data, job.report_type);
    case 'excel':
      return generateExcel(data, job.report_type);
    default:
      throw new Error(`Unsupported export type: ${job.export_type}`);
  }
}

// Helper function to convert data to CSV
function convertToCSV(data: any, reportType: string): string {
  if (reportType === 'usage') {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Requests', data.totalRequests],
      ['Successful Requests', data.successfulRequests],
      ['Failed Requests', data.failedRequests],
      ['Total Tokens', data.totalTokens],
      ['Total Cost', data.totalCost],
      ['Average Response Time (ms)', data.avgResponseTime],
      ['Average Tokens/Second', data.avgTokensPerSecond],
      ['Unique Users', data.uniqueUsers],
      ['Error Rate (%)', data.errorRate]
    ];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  } else if (reportType === 'cost') {
    const headers = ['Model', 'Cost', 'Percentage'];
    const rows = Object.entries(data.costByModel).map(([model, cost]: [string, any]) => [
      model,
      cost,
      ((cost / data.totalSpend) * 100).toFixed(2)
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  } else if (reportType === 'performance') {
    const headers = ['Model', 'Performance Score', 'Total Requests', 'Success Rate', 'Avg Response Time', 'Cost Efficiency'];
    const rows = data.map((model: any) => [
      model.modelId,
      model.performanceScore.toFixed(1),
      model.metrics.totalRequests,
      ((model.metrics.successfulRequests / model.metrics.totalRequests) * 100).toFixed(1),
      model.metrics.avgResponseTime.toFixed(1),
      model.costEfficiency.toFixed(6)
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
  
  return '';
}

// Helper function to generate PDF (simplified)
function generatePDF(data: any, reportType: string): string {
  // In production, use a PDF library like puppeteer or jsPDF
  // For now, return a simple text representation
  return `Analytics Report - ${reportType}\n\nGenerated: ${new Date().toISOString()}\n\nData:\n${JSON.stringify(data, null, 2)}`;
}

// Helper function to generate Excel (simplified)
function generateExcel(data: any, reportType: string): string {
  // In production, use a library like xlsx
  // For now, return CSV format
  return convertToCSV(data, reportType);
}

// Helper function to get content type
function getContentType(exportType: string): string {
  switch (exportType) {
    case 'json':
      return 'application/json';
    case 'csv':
      return 'text/csv';
    case 'pdf':
      return 'application/pdf';
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'text/plain';
  }
}