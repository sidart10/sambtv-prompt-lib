import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { aiClient } from '@/lib/ai';
import { Analytics } from '@/lib/analytics';
import { calculateModelCost } from '@/lib/ai-cost-utils';
import { trackPlaygroundExecution, isLangfuseEnabled } from '@/lib/langfuse/client';

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
});

// Server-Sent Events streaming endpoint
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
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

    // Validate model and parameters
    const validation = aiClient.validateParams({
      model: validatedData.model,
      prompt: validatedData.prompt,
      systemPrompt: validatedData.systemPrompt,
      ...validatedData.parameters
    });

    if (!validation.valid) {
      return new Response(
        `data: ${JSON.stringify({ 
          type: 'error', 
          data: { error: validation.error } 
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
        // Send initial connection confirmation
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'connected', 
            data: { model: validatedData.model } 
          })}\n\n`)
        );
      },
      
      async pull(controller) {
        try {
          // Start AI generation with streaming
          const response = await aiClient.generateResponse({
            model: validatedData.model,
            prompt: validatedData.prompt,
            systemPrompt: validatedData.systemPrompt,
            ...validatedData.parameters,
            stream: true, // Enable streaming
          });

          if (response.error) {
            // Send error event
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'error', 
                data: { error: response.error } 
              })}\n\n`)
            );
            controller.close();
            return;
          }

          // Stream tokens as they arrive
          let fullContent = '';
          let tokenCount = 0;
          
          // Simulate streaming for non-streaming providers (fallback)
          if (response.content && !response.stream) {
            const tokens = response.content.split(' ');
            for (const token of tokens) {
              fullContent += token + ' ';
              tokenCount++;
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'token', 
                  data: { 
                    token: token + ' ',
                    partial: fullContent.trim(),
                    tokenCount 
                  } 
                })}\n\n`)
              );
              
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
                
                const token = new TextDecoder().decode(value);
                fullContent += token;
                tokenCount++;
                
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: 'token', 
                    data: { 
                      token,
                      partial: fullContent,
                      tokenCount 
                    } 
                  })}\n\n`)
                );
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
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'structured', 
                  data: { 
                    parsed,
                    format: validatedData.structuredOutput.format,
                    raw: fullContent
                  } 
                })}\n\n`)
              );
            } catch (parseError) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'parse_error', 
                  data: { 
                    error: 'Failed to parse structured output',
                    raw: fullContent
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
                provider
              } 
            })}\n\n`)
          );

          // Log analytics
          const apiUsageLog = Analytics.createApiUsageLog(
            provider,
            validatedData.model,
            usage.promptTokens,
            usage.completionTokens,
            {
              userId: session.user?.id,
              requestDurationMs: requestDuration,
              status: 'success',
              streamingEnabled: true
            }
          );
          await Analytics.logApiUsage(apiUsageLog);

          // Track in Langfuse if enabled
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
              streamingEnabled: true
            }).catch(error => {
              console.error('[Langfuse] Failed to track streaming execution:', error);
            });
          }

          controller.close();
          
        } catch (error) {
          console.error('[Stream API] Generation error:', error);
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              data: { error: 'Generation failed. Please try again.' } 
            })}\n\n`)
          );
          
          controller.close();
        }
      },
      
      cancel() {
        console.log('[Stream API] Stream cancelled by client');
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
      },
    });

  } catch (error) {
    console.error('[Stream API] Request error:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        `data: ${JSON.stringify({ 
          type: 'error', 
          data: { error: 'Invalid request data', details: error.errors } 
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
        data: { error: 'Server error' } 
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