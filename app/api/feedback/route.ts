import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/utils/supabase/server'
import { auth } from '@/lib/auth'
import { Database } from '@/types/database.types'
import { z } from 'zod'
import { 
  withErrorHandler, 
  validateRequestBody, 
  checkRateLimit,
  createErrorResponse
} from '@/lib/error-handling'

type FeedbackInsert = Database['public']['Tables']['feedback']['Insert']
type FeedbackRow = Database['public']['Tables']['feedback']['Row']

// Schema for creating feedback
const createFeedbackSchema = z.object({
  title: z.string().min(1).max(200, 'Title must be 200 characters or less'),
  content: z.string().min(10, 'Feedback must be at least 10 characters').max(2000, 'Feedback must be 2000 characters or less'),
  feedback_type: z.enum(['bug', 'feature', 'general', 'improvement']).default('general'),
  email: z.string().email().optional(),
  page_url: z.string().url().optional(),
})

// Schema for query parameters (admin only)
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  feedback_type: z.enum(['bug', 'feature', 'general', 'improvement']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
})

// POST /api/feedback - Submit new feedback
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limiting - Allow 10 feedback submissions per hour per user/IP
  const session = await auth()
  const identifier = session?.user?.id || request.headers.get('x-forwarded-for') || 'anonymous'
  checkRateLimit(identifier, 10, 3600000) // 10 requests per hour
  
  const body = await validateRequestBody(request, createFeedbackSchema)
  const supabase = createSupabaseAdminClient()
  
  // Prepare feedback data
  const feedbackData: FeedbackInsert = {
    title: body.title,
    content: body.content,
    feedback_type: body.feedback_type,
    user_id: session?.user?.id || null,
    email: body.email || session?.user?.email || null,
    page_url: body.page_url || null,
    user_agent: request.headers.get('user-agent') || null,
    status: 'open',
    priority: 'medium',
    metadata: {
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      referer: request.headers.get('referer'),
      timestamp: new Date().toISOString(),
    }
  }
  
  // Insert feedback
  const { data: feedback, error } = await supabase
    .from('feedback')
    .insert(feedbackData)
    .select()
    .single()
  
  if (error) {
    console.error('Failed to create feedback:', error)
    throw new Error('Failed to submit feedback')
  }
  
  return NextResponse.json({
    success: true,
    message: 'Thank you for your feedback! We appreciate your input.',
    feedback: {
      id: feedback.id,
      status: feedback.status,
      created_at: feedback.created_at
    }
  })
})

// GET /api/feedback - List feedback (admin only)
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await auth()
  if (!session?.user?.id) {
    return createErrorResponse('Authentication required', 401)
  }
  
  // Rate limiting for authenticated users
  checkRateLimit(session.user.id, 100, 60000) // 100 requests per minute
  
  const supabase = createSupabaseAdminClient()
  
  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  
  if (!profile || profile.role !== 'admin') {
    return createErrorResponse('Admin access required', 403)
  }
  
  const searchParams = Object.fromEntries(request.nextUrl.searchParams)
  const query = querySchema.parse(searchParams)
  
  // Build query
  let dbQuery = supabase
    .from('feedback')
    .select(`
      *,
      profiles:user_id (
        username,
        avatar_url
      )
    `)
  
  // Apply filters
  if (query.status) {
    dbQuery = dbQuery.eq('status', query.status)
  }
  
  if (query.feedback_type) {
    dbQuery = dbQuery.eq('feedback_type', query.feedback_type)
  }
  
  if (query.priority) {
    dbQuery = dbQuery.eq('priority', query.priority)
  }
  
  // Apply pagination and ordering
  const from = (query.page - 1) * query.limit
  const to = from + query.limit - 1
  
  const { data: feedback, error, count } = await dbQuery
    .order('created_at', { ascending: false })
    .range(from, to)
  
  if (error) {
    console.error('Failed to fetch feedback:', error)
    throw new Error('Failed to fetch feedback')
  }
  
  return NextResponse.json({
    success: true,
    feedback: feedback || [],
    pagination: {
      page: query.page,
      limit: query.limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / query.limit),
    },
  })
})

// PATCH /api/feedback/[id] - Update feedback status (admin only)
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const session = await auth()
  if (!session?.user?.id) {
    return createErrorResponse('Authentication required', 401)
  }
  
  const supabase = createSupabaseAdminClient()
  
  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  
  if (!profile || profile.role !== 'admin') {
    return createErrorResponse('Admin access required', 403)
  }
  
  const updateSchema = z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  })
  
  const body = await validateRequestBody(request, updateSchema)
  const url = new URL(request.url)
  const id = url.pathname.split('/').pop()
  
  if (!id || isNaN(Number(id))) {
    return createErrorResponse('Invalid feedback ID', 400)
  }
  
  const { data: feedback, error } = await supabase
    .from('feedback')
    .update(body)
    .eq('id', Number(id))
    .select()
    .single()
  
  if (error) {
    console.error('Failed to update feedback:', error)
    throw new Error('Failed to update feedback')
  }
  
  return NextResponse.json({
    success: true,
    message: 'Feedback updated successfully',
    feedback
  })
})