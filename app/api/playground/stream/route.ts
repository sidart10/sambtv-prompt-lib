import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { aiClient } from '@/lib/ai';
import { Analytics } from '@/lib/analytics';
import { calculateModelCost } from '@/lib/ai-cost-utils';
import { trackPlaygroundExecution, isLangfuseEnabled } from '@/lib/langfuse/client';
import { TraceService } from '@/lib/tracing/service';
import { TraceManager } from '@/lib/tracing/context';

// Schema for streaming request
const streamRequestSchema = z.object({
  prompt: z.string().min(1).max(10000),
  systemPrompt: z.string().optional(),
  model: z.string(),
  parameters: z.object({
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(1).max(4000).default(1000),
    topP: z.number().min(0).max(1).default(1),
    frequencyPenalty: z.number().min(-2).max(2).default(0),
    presencePenalty: z.number().min(-2).max(2).default(0),
  }),
  streamFormat: z.enum(['sse']).default('sse'),
  structuredOutput: z.object({
    enabled: z.boolean().default(false),
    format: z.enum(['json', 'xml', 'yaml']).optional(),
    schema: z.string().optional(),
  }).optional(),
  traceId: z.string().uuid().optional(), // Allow existing trace ID
});

// Server-Sent Events streaming endpoint with comprehensive tracing
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let currentTrace = null;
  let firstTokenTime = null;
  let tokenCount = 0;
  let fullContent = '';
  let hasError = false;
  
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return new Response('Authentication required', { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = streamRequestSchema.parse(body);

    console.log('[Stream API] Request from user:', session.user?.email);
    console.log('[Stream API] Model:', validatedData.model);

    // Initialize or retrieve trace
    if (validatedData.traceId) {
      // Use existing trace
      currentTrace = TraceManager.getActiveTrace(validatedData.traceId);
      if (currentTrace) {
        console.log('[Stream API] Using existing trace:', validatedData.traceId);
        // Update trace to indicate streaming has started
        await TraceService.updateTrace(validatedData.traceId, {
          status: 'streaming',
          streaming_enabled: true
        });
        
        // Add streaming start event
        await TraceService.addTraceEvent(validatedData.traceId, 'token', {
          action: 'streaming_start',
          model: validatedData.model,
          streaming_enabled: true
        });
      }
    }
    
    if (!currentTrace) {
      // Create new trace
      const userAgent = request.headers.get('user-agent') || undefined;
      const forwardedFor = request.headers.get('x-forwarded-for');
      const realIP = request.headers.get('x-real-ip');
      const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIP || undefined;

      console.log('[Stream API] Creating new trace for streaming');
      currentTrace = await TraceService.startTrace({
        userId: session.user.id,
        source: 'playground',
        promptId: undefined, // Could extract from URL params if available
        model: validatedData.model,
        prompt: validatedData.prompt,
        systemPrompt: validatedData.systemPrompt,
        parameters: validatedData.parameters,
        userAgent,
        ipAddress
      });

      // Mark as streaming
      await TraceService.updateTrace(currentTrace.traceId, {
        status: 'streaming',
        streaming_enabled: true
      });
    }

    // Validate model and parameters
    const validation = aiClient.validateParams({
      model: validatedData.model,
      prompt: validatedData.prompt,
      systemPrompt: validatedData.systemPrompt,
      ...validatedData.parameters
    });

    if (!validation.valid) {
      // Log validation error to trace
      await TraceService.updateTrace(currentTrace.traceId, {
        status: 'error',
        error_message: validation.error,
        error_code: 'VALIDATION_ERROR'
      });

      await TraceService.addTraceEvent(currentTrace.traceId, 'error', {
        error_type: 'validation',
        error_message: validation.error,
        parameters: validatedData.parameters
      });

      return new Response(
        `data: ${JSON.stringify({ 
          type: 'error', 
          data: { error: validation.error, traceId: currentTrace.traceId } 
        })}\n\n`,
        {
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // Set up Server-Sent Events response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection confirmation with trace ID
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'connected', 
            data: { 
              model: validatedData.model,
              traceId: currentTrace.traceId,
              sessionId: currentTrace.sessionId,
              startTime: currentTrace.startTime
            } 
          })}\n\n`)
        );
      },
      
      async pull(controller) {
        try {
          // Add generation start event
          await TraceService.addTraceEvent(currentTrace.traceId, 'start', {
            action: 'generation_start',
            model: validatedData.model,
            prompt_length: validatedData.prompt.length,
            system_prompt_length: validatedData.systemPrompt?.length || 0,
            parameters: validatedData.parameters,
            structured_output: validatedData.structuredOutput?.enabled || false
          });

          // Start AI generation with streaming
          const response = await aiClient.generateResponse({
            model: validatedData.model,
            prompt: validatedData.prompt,
            systemPrompt: validatedData.systemPrompt,
            ...validatedData.parameters,
            stream: true, // Enable streaming
          });

          if (response.error) {
            hasError = true;
            const errorMessage = response.error;
            
            // Update trace with error
            await TraceService.updateTrace(currentTrace.traceId, {
              status: 'error',
              error_message: errorMessage,
              error_code: 'GENERATION_ERROR'
            });

            await TraceService.addTraceEvent(currentTrace.traceId, 'error', {
              error_type: 'generation',
              error_message: errorMessage,
              model: validatedData.model
            });

            // Send error event
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'error', 
                data: { error: errorMessage, traceId: currentTrace.traceId } 
              })}\n\n`)
            );
            controller.close();
            return;
          }

          // Stream tokens as they arrive
          tokenCount = 0;
          
          // Simulate streaming for non-streaming providers (fallback)
          if (response.content && !response.stream) {
            const tokens = response.content.split(' ');
            for (const token of tokens) {
              if (!firstTokenTime) {
                firstTokenTime = Date.now();
                const firstTokenLatency = firstTokenTime - startTime;
                
                // Update trace with first token latency
                await TraceService.updateTrace(currentTrace.traceId, {
                  first_token_latency_ms: firstTokenLatency
                });

                await TraceService.addTraceEvent(currentTrace.traceId, 'token', {
                  action: 'first_token',
                  latency_ms: firstTokenLatency,
                  token_number: 1
                });
              }

              fullContent += token + ' ';
              tokenCount++;
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'token', 
                  data: { 
                    token: token + ' ',
                    partial: fullContent.trim(),
                    tokenCount,
                    traceId: currentTrace.traceId
                  } 
                })}\n\n`)
              );
              
              // Log token event every 10 tokens
              if (tokenCount % 10 === 0) {
                await TraceService.addTraceEvent(currentTrace.traceId, 'token', {
                  action: 'token_batch',
                  token_count: tokenCount,
                  current_length: fullContent.length
                });
              }
              
              // Small delay to simulate streaming
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          } else if (response.stream) {
            // Handle actual streaming response
            const reader = response.stream.getReader();
            
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                if (!firstTokenTime) {
                  firstTokenTime = Date.now();
                  const firstTokenLatency = firstTokenTime - startTime;
                  
                  // Update trace with first token latency
                  await TraceService.updateTrace(currentTrace.traceId, {
                    first_token_latency_ms: firstTokenLatency
                  });

                  await TraceService.addTraceEvent(currentTrace.traceId, 'token', {
                    action: 'first_token',
                    latency_ms: firstTokenLatency,
                    token_number: 1
                  });
                }
                
                const token = new TextDecoder().decode(value);
                fullContent += token;
                tokenCount++;
                
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: 'token', 
                    data: { 
                      token,
                      partial: fullContent,
                      tokenCount,
                      traceId: currentTrace.traceId
                    } 
                  })}\n\n`)
                );

                // Log token event every 10 tokens
                if (tokenCount % 10 === 0) {
                  await TraceService.addTraceEvent(currentTrace.traceId, 'token', {
                    action: 'token_batch',
                    token_count: tokenCount,
                    current_length: fullContent.length
                  });
                }
              }
            } finally {
              reader.releaseLock();
            }
          }

          // Handle structured output parsing if enabled
          if (validatedData.structuredOutput?.enabled && fullContent) {
            try {
              const { parseOutput } = await import('@/lib/outputParser');
              const parsed = parseOutput(fullContent);
              
              await TraceService.addTraceEvent(currentTrace.traceId, 'structured', {
                action: 'structured_parse',
                format: validatedData.structuredOutput.format || 'auto',
                success: parsed.success,
                data_type: typeof parsed.data
              });
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'structured', 
                  data: { 
                    parsed,
                    format: validatedData.structuredOutput.format,
                    raw: fullContent,
                    traceId: currentTrace.traceId
                  } 
                })}\n\n`)
              );
            } catch (parseError) {
              await TraceService.addTraceEvent(currentTrace.traceId, 'error', {
                action: 'structured_parse_error',
                error_message: parseError.message,
                format: validatedData.structuredOutput.format
              });

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'parse_error', 
                  data: { 
                    error: 'Failed to parse structured output',
                    raw: fullContent,
                    traceId: currentTrace.traceId
                  } 
                })}\n\n`)
              );
            }
          }

          // Calculate final metrics
          const requestDuration = Date.now() - startTime;
          const provider = aiClient.getProviderForModel(validatedData.model);
          const usage = response.usage || { 
            promptTokens: Math.ceil(validatedData.prompt.length / 4), 
            completionTokens: tokenCount,
            totalTokens: Math.ceil(validatedData.prompt.length / 4) + tokenCount
          };

          // Calculate cost
          const costCalculation = calculateModelCost(
            provider,
            validatedData.model,
            usage.promptTokens,
            usage.completionTokens
          );

          // Calculate tokens per second
          const tokensPerSecond = requestDuration > 0 ? (tokenCount / requestDuration) * 1000 : 0;

          // Complete the trace with comprehensive results
          await TraceService.completeTrace(currentTrace.traceId, {
            status: 'success',
            response: fullContent.trim(),
            tokensUsed: {
              input: usage.promptTokens,
              output: usage.completionTokens,
              total: usage.totalTokens
            },
            costCalculation: {
              inputCost: costCalculation.inputCost,
              outputCost: costCalculation.outputCost,
              totalCost: costCalculation.totalCost
            },
            performanceMetrics: {
              durationMs: requestDuration,
              firstTokenLatencyMs: firstTokenTime ? firstTokenTime - startTime : undefined,
              tokensPerSecond
            },
            streamingEnabled: true
          });

          // Send completion event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'complete', 
              data: { 
                content: fullContent.trim(),
                usage,
                cost: costCalculation,
                duration: requestDuration,
                model: validatedData.model,
                provider,
                traceId: currentTrace.traceId,
                firstTokenLatency: firstTokenTime ? firstTokenTime - startTime : null,
                tokensPerSecond: Math.round(tokensPerSecond * 100) / 100
              } 
            })}\n\n`)
          );

          // Log analytics (existing system)
          const apiUsageLog = Analytics.createApiUsageLog(
            provider,
            validatedData.model,
            usage.promptTokens,
            usage.completionTokens,
            {
              userId: session.user?.id,
              requestDurationMs: requestDuration,
              status: 'success',
              streamingEnabled: true,
              traceId: currentTrace.traceId
            }
          );
          await Analytics.logApiUsage(apiUsageLog);

          // Track in Langfuse if enabled (existing system)
          if (isLangfuseEnabled()) {
            trackPlaygroundExecution({
              promptContent: validatedData.prompt,
              model: validatedData.model,
              provider: provider,
              userId: session.user?.id,
              response: fullContent.trim(),
              latencyMs: requestDuration,
              tokenUsage: {
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: usage.totalTokens
              },
              cost: costCalculation.totalCost,
              streamingEnabled: true,
              traceId: currentTrace.traceId
            }).catch(error => {
              console.error('[Langfuse] Failed to track streaming execution:', error);
            });
          }

          console.log(`[Stream API] Completed trace ${currentTrace.traceId} - Duration: ${requestDuration}ms, Tokens: ${tokenCount}, Cost: $${costCalculation.totalCost.toFixed(6)}`);
          controller.close();
          
        } catch (error) {
          hasError = true;
          console.error('[Stream API] Generation error:', error);
          
          // Update trace with error details
          if (currentTrace) {
            await TraceService.updateTrace(currentTrace.traceId, {
              status: 'error',
              error_message: error.message,
              error_code: 'GENERATION_EXCEPTION',
              duration_ms: Date.now() - startTime
            });

            await TraceService.addTraceEvent(currentTrace.traceId, 'error', {
              error_type: 'exception',
              error_message: error.message,
              stack_trace: error.stack,
              token_count_at_error: tokenCount
            });
          }
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              data: { 
                error: 'Generation failed. Please try again.',
                traceId: currentTrace?.traceId 
              } 
            })}\n\n`)
          );
          
          controller.close();
        }
      },
      
      cancel() {
        console.log('[Stream API] Stream cancelled by client');
        
        // Update trace if stream was cancelled
        if (currentTrace && !hasError) {
          TraceService.updateTrace(currentTrace.traceId, {
            status: 'cancelled',
            duration_ms: Date.now() - startTime
          }).catch(error => {
            console.error('[Stream API] Failed to update cancelled trace:', error);
          });

          TraceService.addTraceEvent(currentTrace.traceId, 'user_action', {
            action: 'stream_cancelled',
            token_count_at_cancel: tokenCount,
            content_length_at_cancel: fullContent.length
          }).catch(error => {
            console.error('[Stream API] Failed to log cancel event:', error);
          });
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Trace-ID': currentTrace?.traceId || '', // Include trace ID in headers
      },
    });

  } catch (error) {
    console.error('[Stream API] Request error:', error);
    
    // Update trace with error if available
    if (currentTrace) {
      TraceService.updateTrace(currentTrace.traceId, {
        status: 'error',
        error_message: error.message,
        error_code: 'REQUEST_ERROR',
        duration_ms: Date.now() - startTime
      }).catch(traceError => {
        console.error('[Stream API] Failed to update error trace:', traceError);
      });
    }
    
    if (error instanceof z.ZodError) {
      return new Response(
        `data: ${JSON.stringify({ 
          type: 'error', 
          data: { 
            error: 'Invalid request data', 
            details: error.errors,
            traceId: currentTrace?.traceId
          } 
        })}\n\n`,
        {
          status: 400,
          headers: { 'Content-Type': 'text/event-stream' }
        }
      );
    }
    
    return new Response(
      `data: ${JSON.stringify({ 
        type: 'error', 
        data: { 
          error: 'Server error',
          traceId: currentTrace?.traceId
        } 
      })}\n\n`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/event-stream' }
      }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}