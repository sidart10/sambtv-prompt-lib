'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Copy, 
  Send, 
  AlertCircle, 
  Loader2, 
  MessageSquare,
  Settings,
  Sliders,
  Download,
  Save,
  RotateCcw,
  Bot,
  X,
  Search,
  Cpu,
  Info,
  SlidersHorizontal
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PromptContentRenderer } from '@/components/prompt-content-renderer';
import Navigation from '@/components/navigation/Navigation';
import { SUPPORTED_MODELS } from '@/lib/ai';
import { useModelPreferences } from '@/hooks/useModelPreferences';
import { ModelInfo } from '@/lib/ai/generated-models';
import { ModelPreferences } from '@/components/playground/ModelPreferences';
import { estimateTokensFallback } from '@/lib/tokenization';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Wand2, History } from "lucide-react";
import { StructuredOutputDisplay } from '@/components/playground/StructuredOutputDisplay';
import { StreamingDisplay, useStreaming } from '@/components/playground/StreamingDisplay';
import { parseOutput } from '@/lib/outputParser';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Update the form schema
const playgroundSchema = z.object({
  model: z.string().min(1, "Model is required"),
  prompt: z.string().min(1, "Prompt is required"),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(1).max(4000),
  topP: z.number().min(0).max(1),
  frequencyPenalty: z.number().min(-2).max(2),
  presencePenalty: z.number().min(-2).max(2),
});

type PlaygroundFormData = z.infer<typeof playgroundSchema>;

function PlaygroundContent() {
  console.log('[Playground] Rendering playground page');
  
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
  const [systemPromptDisplay, setSystemPromptDisplay] = useState(''); // For display with markup
  const [selectedModel, setSelectedModel] = useState<string>('claude-3-7-sonnet-20250219');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [topP, setTopP] = useState(1.0);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const [showModelPreferences, setShowModelPreferences] = useState(false);
  const [variablesFilled, setVariablesFilled] = useState(false);
  const [streamingMode, setStreamingMode] = useState(false);
  const [structuredOutputMode, setStructuredOutputMode] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMetrics, setStreamingMetrics] = useState<{
    totalTokens: number;
    tokensPerSecond: number;
    elapsed: number;
  } | undefined>(undefined);
  const { isStreaming, isPaused, startStream, pauseStream, resumeStream, stopStream } = useStreaming();

  // Model preferences
  const { getFilteredModels, loading: modelPrefsLoading, preferences } = useModelPreferences();
  
  // Get current filtered models - this will re-run when preferences change
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  
  // Update available models when preferences change
  useEffect(() => {
    if (!modelPrefsLoading) {
      const filtered = getFilteredModels();

      setAvailableModels(filtered);
    }
  }, [getFilteredModels, modelPrefsLoading, preferences.enabledModels]);
  
  // Handle selected model becoming unavailable
  useEffect(() => {
    if (!modelPrefsLoading && availableModels.length > 0) {
      const isSelectedModelAvailable = availableModels.find(m => m.id === selectedModel);
      if (!isSelectedModelAvailable) {
        setSelectedModel(availableModels[0].id);

      }
    }
  }, [availableModels, selectedModel, modelPrefsLoading]);

  // Accurate token counting using tiktoken
  // Estimate tokens with lightweight fallback for immediate UI feedback
  const estimateTokens = useCallback((text: string): number => {
    return estimateTokensFallback(text);
  }, []);

  // Calculate total tokens for conversation
  const calculateTotalTokens = useCallback(() => {
    let total = 0;
    
    // Add system prompt tokens
    if (systemPrompt.trim()) {
      total += estimateTokens(systemPrompt);
    }
    
    // Add all message tokens
    messages.forEach(message => {
      total += estimateTokens(message.content);
    });
    
    return total;
  }, [systemPrompt, messages]);

  // Update token count when conversation changes
  useEffect(() => {
    const totalTokens = calculateTotalTokens();
    // Add current input text tokens
    const inputTokens = inputText.trim() ? estimateTokens(inputText) : 0;
    setEstimatedTokens(totalTokens + inputTokens);
  }, [calculateTotalTokens, inputText]);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savePromptTitle, setSavePromptTitle] = useState('');
  const [savePromptDescription, setSavePromptDescription] = useState('');
  const [savePromptContent, setSavePromptContent] = useState('');
  const [savePromptCategory, setSavePromptCategory] = useState('General');
  const [savePromptTags, setSavePromptTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loading]);

  // Track if prompt has been loaded to prevent duplicate loads
  const promptLoadedRef = useRef<string | null>(null);

  // Load prompt from URL if prompt ID is provided
  useEffect(() => {
    const promptId = searchParams.get('promptId');
    if (promptId && promptLoadedRef.current !== promptId) {
      promptLoadedRef.current = promptId;
      loadPrompt(promptId);
    }
  }, [searchParams]);

  // Load prompt data
  const loadPrompt = async (promptId: string) => {
    try {
      console.log('[Playground] loadPrompt called with promptId:', promptId)
      
      // Check if we have processed content from template variables
      const processedContent = localStorage.getItem('playground-processed-content')
      const storedPromptId = localStorage.getItem('playground-prompt-id')
      
      console.log('[Playground] localStorage check:')
      console.log('- processedContent exists:', !!processedContent)
      console.log('- processedContent length:', processedContent?.length || 0)
      console.log('- storedPromptId:', storedPromptId)
      console.log('- promptId:', promptId)
      console.log('- IDs match:', String(storedPromptId) === String(promptId))
      
      if (processedContent) {
        console.log('- processedContent includes {{PROJECT_KEY}}:', processedContent.includes('{{PROJECT_KEY}}'))
        console.log('- processedContent includes SAMBA-123:', processedContent.includes('SAMBA-123'))
      }
      
      // Ensure both IDs are strings and match
      if (processedContent && storedPromptId && String(storedPromptId) === String(promptId)) {
        console.log('[Playground] Using processed content from localStorage')
        
        // Clean up HTML markup for plain text input
        const cleanContent = processedContent
          .replace(/<mark class="filled-variable">/g, '')
          .replace(/<\/mark>/g, '')
          .replace(/<[^>]*>/g, '') // Remove any other HTML tags
          .trim();
        
        // Put processed content in user input field, clear system prompt
        setInputText(cleanContent)
        setSystemPrompt('') // Clear system prompt
        setSystemPromptDisplay('') // Clear display markup
        setVariables({})
        setVariablesFilled(true)
        
        // Clear the localStorage items AFTER setting the content
        localStorage.removeItem('playground-processed-content')
        localStorage.removeItem('playground-prompt-id')
        
        toast({
          title: "Prompt Loaded",
          description: "Loaded prompt with filled variables in message input",
        })
        return
      }
      
      console.log('[Playground] Falling back to API')
      
      // Fallback to API if no processed content
      const response = await fetch(`/api/playground/prompt/${promptId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Playground] API Error Response:', errorData);
        
        if (errorData.available) {
          throw new Error(`Prompt ${promptId} not found. Available IDs: ${errorData.available.join(', ')}`);
        }
        
        throw new Error(`Failed to load prompt (${response.status}): ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log('[Playground] Loaded prompt data:', data);
      
      // Check if the response has the expected structure
      if (!data || !data.success || !data.prompt) {
        console.error('[Playground] Invalid response structure:', data);
        throw new Error('Invalid response structure - missing prompt data');
      }
      
      // The new API returns { success: true, prompt: { ... } }
      const prompt = data.prompt;
      
      // Put content in user input field, clear system prompt
      setInputText(prompt.content); // Put content in user input
      setSystemPrompt(''); // Clear system prompt
      setSystemPromptDisplay(''); // Clear display markup
      if (prompt.model) setSelectedModel(prompt.model);
      
      // Don't extract template variables when loading from playground
      // Clear any existing variables
      setVariables({});
      setVariablesFilled(false)
      
      toast({
        title: "Prompt Loaded",
        description: `Loaded "${prompt.title}" in message input`,
      });
    } catch (error) {
      console.error('[Playground] Error loading prompt:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load prompt",
        variant: "destructive",
      });
    }
  };

  // Extract template variables from prompt text
  const extractTemplateVariables = (text: string): string[] => {
    // Extract standard {{variable}} format
    const standardRegex = /\{\{([^}]+)\}\}/g;
    const standardMatches = text.match(standardRegex) || [];
    const standardVars = standardMatches.map(match => match.slice(2, -2).trim());
    
    // Extract markdown list format: - `VARIABLE`: Description (e.g., "example") or (default: "example")
    const mdListRegex = /-\s*`([A-Z_]+)`:\s*[^\n]*\((e\.g\.,|default:)\s*["'][^"']*["']\)/g;
    const mdListMatches = [...text.matchAll(mdListRegex)];
    const mdListVars = mdListMatches.map(match => match[1]);
    
    return [...new Set([...standardVars, ...mdListVars])];
  };

  // Handle template variable changes
  const handleVariableChange = useCallback((varName: string, value: string) => {
    console.log('[Playground] Variable changed:', varName, value);
    setVariables(prev => ({ ...prev, [varName]: value }));
    
    // Update display version with filled variables
    setSystemPromptDisplay(prev => {
      let updated = systemPrompt; // Start with clean text
      if (value.trim()) {
        // Replace standard variable format {{KEY}}
        const regex = new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g');
        updated = updated.replace(regex, `<mark class="filled-variable">${value}</mark>`);
        
        // Replace markdown list format: - `KEY`: Description (e.g., "example") or (default: "example")
        const mdListRegex = new RegExp(`-\\s*\`${varName}\`:\\s*[^\\n]*\\((e\\.g\\.,|default:)\\s*["'][^"']*["']\\)`, 'g');
        updated = updated.replace(mdListRegex, `<mark class="filled-variable">${value}</mark>`);
      }
      
      // Apply all other variables too
      Object.entries(variables).forEach(([key, val]) => {
        if (key !== varName && val.trim()) {
          const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
          updated = updated.replace(regex, `<mark class="filled-variable">${val}</mark>`);
          
          const mdListRegex = new RegExp(`-\\s*\`${key}\`:\\s*[^\\n]*\\((e\\.g\\.,|default:)\\s*["'][^"']*["']\\)`, 'g');
          updated = updated.replace(mdListRegex, `<mark class="filled-variable">${val}</mark>`);
        }
      });
      
      return updated;
    });
  }, [systemPrompt, variables]);

  // Process prompt with variables
  const processPromptWithVariables = (text: string): string => {
    let processed = text;
    Object.entries(variables).forEach(([key, value]) => {
      // Replace standard variable format {{KEY}}
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processed = processed.replace(regex, value);
      
      // Replace markdown list format: - `KEY`: Description (e.g., "example") or (default: "example")
      const mdListRegex = new RegExp(`-\\s*\`${key}\`:\\s*[^\\n]*\\((e\\.g\\.,|default:)\\s*["'][^"']*["']\\)`, 'g');
      processed = processed.replace(mdListRegex, value);
    });
    return processed;
  };

  // Send message (supports both streaming and regular generation)
  const handleSendMessage = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to test prompts",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    setError('');

    const processedPrompt = processPromptWithVariables(inputText);
    const processedSystemPrompt = processPromptWithVariables(systemPrompt);

    try {
      if (streamingMode) {
        // Use streaming API
        await handleStreamingGeneration(processedPrompt, processedSystemPrompt);
      } else {
        // Use regular API
        await handleRegularGeneration(processedPrompt, processedSystemPrompt);
      }
    } catch (error) {
      console.error('[Playground] Generation error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Regular generation (existing functionality)
  const handleRegularGeneration = async (processedPrompt: string, processedSystemPrompt: string) => {
    const response = await fetch('/api/playground/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: processedPrompt,
        systemPrompt: processedSystemPrompt,
        model: selectedModel,
        parameters: {
          temperature,
          maxTokens,
          topP,
          frequencyPenalty,
          presencePenalty,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate output');
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: data.output,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setLastResponse(data.output);
    console.log('[Playground] Generation successful');
  };

  // Streaming generation using Server-Sent Events
  const handleStreamingGeneration = async (processedPrompt: string, processedSystemPrompt: string) => {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(
        '/api/playground/stream',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: processedPrompt,
            systemPrompt: processedSystemPrompt,
            model: selectedModel,
            parameters: {
              temperature,
              maxTokens,
              topP,
              frequencyPenalty,
              presencePenalty,
            },
            structuredOutput: {
              enabled: structuredOutputMode,
              format: 'auto'
            }
          }),
        } as any
      );

      // Use fetch with SSE for streaming
      fetch('/api/playground/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: processedPrompt,
          systemPrompt: processedSystemPrompt,
          model: selectedModel,
          parameters: {
            temperature,
            maxTokens,
            topP,
            frequencyPenalty,
            presencePenalty,
          },
          structuredOutput: {
            enabled: structuredOutputMode,
            format: 'auto'
          }
        }),
      }).then(response => {
        if (!response.ok) {
          throw new Error('Streaming request failed');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No stream reader available');
        }

        let fullContent = '';
        let tokenCount = 0;
        const startTime = Date.now();
        const assistantMessageId = (Date.now() + 1).toString();

        const readStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const eventData = JSON.parse(line.slice(6));
                    
                    switch (eventData.type) {
                      case 'connected':
                        console.log('[Streaming] Connected to', eventData.data.model);
                        setStreamingContent('');
                        setStreamingMetrics({
                          totalTokens: 0,
                          tokensPerSecond: 0,
                          elapsed: 0
                        });
                        break;
                      
                      case 'token':
                        fullContent = eventData.data.partial || fullContent;
                        tokenCount = eventData.data.tokenCount || tokenCount + 1;
                        
                        // Update streaming display content and metrics
                        setStreamingContent(fullContent);
                        const elapsed = (Date.now() - startTime) / 1000;
                        setStreamingMetrics({
                          totalTokens: tokenCount,
                          tokensPerSecond: elapsed > 0 ? tokenCount / elapsed : 0,
                          elapsed
                        });
                        
                        // Update or create the assistant message
                        setMessages(prev => {
                          const existing = prev.find(m => m.id === assistantMessageId);
                          if (existing) {
                            return prev.map(m => 
                              m.id === assistantMessageId 
                                ? { ...m, content: fullContent }
                                : m
                            );
                          } else {
                            return [...prev, {
                              id: assistantMessageId,
                              role: 'assistant' as const,
                              content: fullContent,
                              timestamp: new Date(),
                            }];
                          }
                        });
                        break;
                      
                      case 'structured':
                        setLastResponse(eventData.data.raw);
                        break;
                      
                      case 'complete':
                        setLastResponse(eventData.data.content);
                        setStreamingContent('');
                        setStreamingMetrics(undefined);
                        console.log('[Streaming] Complete:', eventData.data);
                        resolve(eventData.data);
                        return;
                      
                      case 'error':
                        setStreamingContent('');
                        setStreamingMetrics(undefined);
                        throw new Error(eventData.data.error);
                    }
                  } catch (parseError) {
                    console.error('[Streaming] Failed to parse event:', parseError);
                  }
                }
              }
            }
          } catch (error) {
            setStreamingContent('');
            setStreamingMetrics(undefined);
            reject(error);
          }
        };

        readStream();
      }).catch(reject);
    });
  };

  // Handle keyboard shortcut
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSendMessage();
    }
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    setError('');
  };

  // Copy message to clipboard using centralized utility
  const copyMessage = async (content: string) => {
    const { copyToClipboard } = await import('@/lib/clipboard');
    
    const success = await copyToClipboard(content, {
      onSuccess: () => {
        toast({
          title: "Copied!",
          description: "Message copied to clipboard",
        });
      },
      onError: (error) => {
        console.error('[Playground] Copy error:', error);
        toast({
          title: "Error",
          description: "Failed to copy to clipboard",
          variant: "destructive",
        });
      }
    });
    
    // Handle case where utility returns false but doesn't call onError
    if (!success) {
      console.error('[Playground] Copy failed silently');
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Export conversation to Markdown
  const exportConversation = () => {
    if (messages.length === 0) {
      toast({
        title: "No conversation to export",
        description: "Start a conversation first",
        variant: "destructive",
      });
      return;
    }

    const markdown = messages.map((message) => {
      const role = message.role === 'user' ? '**You**' : '**Assistant**';
      const timestamp = message.timestamp.toLocaleString();
      return `${role} (${timestamp}):\n\n${message.content}\n\n---\n`;
    }).join('\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported!",
      description: "Conversation exported as Markdown file",
    });
  };

  // Open save prompt modal
  const openSaveModal = () => {
    setSavePromptTitle('');
    setSavePromptDescription('');
    setSavePromptContent(systemPrompt); // Use clean text directly
    setSavePromptCategory('General');
    setSavePromptTags([]);
    setTagInput('');
    setShowSaveModal(true);
  };

  // Add tag
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !savePromptTags.includes(trimmedTag) && savePromptTags.length < 5) {
      setSavePromptTags([...savePromptTags, trimmedTag]);
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setSavePromptTags(savePromptTags.filter(tag => tag !== tagToRemove));
  };

  // Handle tag input
  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    }
  };

  // Save prompt
  const savePrompt = async () => {
    if (!savePromptTitle.trim() || !savePromptDescription.trim() || !savePromptContent.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: savePromptTitle,
          description: savePromptDescription,
          content: savePromptContent,
          category: savePromptCategory,
          tags: savePromptTags,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save prompt');
      }

      toast({
        title: "Success!",
        description: "Prompt saved successfully",
      });
      
      setShowSaveModal(false);
      setSavePromptTitle('');
      setSavePromptDescription('');
      setSavePromptContent('');
      setSavePromptCategory('General');
      setSavePromptTags([]);
      setTagInput('');
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save prompt",
        variant: "destructive",
      });
    }
  };

  // Extract template variables from both input text and system prompt
  const inputVars = extractTemplateVariables(inputText);
  const systemVars = extractTemplateVariables(systemPrompt); // Use clean text directly
  const templateVars = [...new Set([...inputVars, ...systemVars])];

  const form = useForm<PlaygroundFormData>({
    resolver: zodResolver(playgroundSchema),
    defaultValues: {
      model: "gpt-3.5-turbo",
      prompt: "",
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
  });

  return (
    <div className="min-h-screen bg-background transition-[background-color] duration-300">
      <Navigation />
      
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-8rem)] sm:min-h-[calc(100vh-12rem)] bg-card rounded-xl overflow-hidden shadow-2xl shadow-black/10 dark:shadow-black/50">
          {/* Left Panel - Conversation */}
          <div className="w-full lg:w-3/5 flex flex-col bg-card order-1 lg:order-1 min-h-[60vh] lg:min-h-0">
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="border-b border-border">
                <div className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      <h1 className="text-lg font-semibold text-foreground">Conversation</h1>
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Estimated tokens: {estimatedTokens}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {messages.length > 0 && (
                        <Button variant="outline" size="sm" onClick={clearConversation}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Clear
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={exportConversation}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={openSaveModal}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Prompt
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 flex flex-col min-h-0">
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto scroll-smooth"
                  style={{ maxHeight: 'calc(100vh - 300px)' }}
                >
                  <div className="px-3 sm:px-6 py-4">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full min-h-[200px] sm:min-h-[400px]">
                        <div className="text-center text-muted-foreground">
                          <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-muted" />
                          <p className="text-base sm:text-lg font-medium mb-2">No messages yet</p>
                          <p className="text-sm sm:text-base">Start a conversation by typing below</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 sm:space-y-8">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className="relative group">
                              {/* Message Bubble */}
                              <div
                                className={`max-w-[85vw] sm:max-w-[70vw] min-w-[60px] rounded-lg px-3 sm:px-4 py-2 sm:py-3 shadow-sm relative ${
                                  message.role === 'user'
                                    ? 'bg-slate-100 text-slate-900 border border-slate-200 rounded-br-none dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                                    : 'bg-muted text-foreground border border-border rounded-bl-none'
                                }`}
                                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                              >
                                <div className="prose max-w-none text-xs sm:text-sm leading-relaxed">
                                  <PromptContentRenderer content={message.content.trim()} />
                                </div>
                                
                                {/* Copy Button - appears on hover */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyMessage(message.content)}
                                  className={`absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                                    message.role === 'user' 
                                      ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700' 
                                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                  }`}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {loading && (
                          <div className="flex justify-start">
                            <div className="bg-muted border border-border rounded-lg rounded-bl-none p-3 sm:p-4 shadow-sm">
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                <span className="text-xs sm:text-sm text-muted-foreground">Generating response...</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Scroll anchor */}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Advanced Features Displays */}
                {(streamingMode || structuredOutputMode) && (
                  <div className="border-t border-border bg-muted/10">
                    <div className="px-3 sm:px-6 py-4 space-y-4">
                      {/* Streaming Display */}
                      {streamingMode && (
                        <StreamingDisplay
                          isStreaming={isStreaming}
                          content={streamingContent}
                          metrics={streamingMetrics}
                          onPause={pauseStream}
                          onResume={resumeStream}
                          onStop={stopStream}
                        />
                      )}
                      
                      {/* Structured Output Display */}
                      {structuredOutputMode && lastResponse && (
                        <StructuredOutputDisplay content={lastResponse} />
                      )}
                    </div>
                  </div>
                )}

                {/* Error Alert */}
                {error && (
                  <div className="border-t border-border bg-muted/30">
                    <div className="px-3 sm:px-6 py-4">
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="border-t border-border bg-card">
                  <div className="p-3 sm:p-6">
                    <div className="relative">
                      <Textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your message..."
                        className="pr-12 sm:pr-16 min-h-[50px] sm:min-h-[60px] resize-none rounded-lg border-border focus:border-red-500 focus:ring-red-500 bg-background text-foreground text-sm sm:text-base"
                        rows={2}
                      />
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSendMessage();
                        }}
                        disabled={loading || !inputText.trim()}
                        size="icon"
                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white rounded-lg h-8 w-8 sm:h-10 sm:w-10 transition-transform active:scale-95"
                        type="button"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Press Enter to send, Shift + Enter for new line.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Settings */}
          <div className="w-full lg:w-2/5 bg-muted/30 border-t lg:border-t-0 lg:border-l border-border order-2 lg:order-2">
            <TooltipProvider>
                              <div className="h-full max-h-[40vh] lg:max-h-none overflow-y-auto">
                <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                  <Accordion type="multiple" defaultValue={["system-prompt", "model-settings"]} className="w-full space-y-3 sm:space-y-4">
                    <AccordionItem value="system-prompt" className="border border-border rounded-lg bg-card shadow-sm">
                      <AccordionTrigger className="px-3 sm:px-4 py-2.5 sm:py-3 hover:no-underline hover:bg-muted/50 rounded-t-lg touch-manipulation">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                            <span className="font-semibold text-sm sm:text-base">System Prompt</span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Define the AI's role, personality, and instructions.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 sm:px-4 pt-2 sm:pt-3 pb-3 sm:pb-4">
                        <div className="space-y-3">
                          <Textarea
                            value={systemPrompt} // Use clean text directly
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="Enter your system prompt..."
                            className="w-full min-h-[80px] sm:min-h-[100px] max-h-[300px] sm:max-h-[600px] text-xs sm:text-sm rounded-md border border-input bg-background px-2 sm:px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-red-500"
                            style={{
                              whiteSpace: 'pre-wrap'
                            }}
                          />
                          {/* Display processed content with filled variables if any */}
                          {systemPromptDisplay && Object.keys(variables).some(key => variables[key].trim()) && (
                            <div className="mt-2 p-2 sm:p-3 bg-muted/50 rounded-md border">
                              <p className="text-xs text-muted-foreground mb-2">Preview with filled variables:</p>
                              <div 
                                className="text-xs sm:text-sm [&_mark.filled-variable]:font-bold [&_mark.filled-variable]:text-red-600 [&_mark.filled-variable]:bg-red-50 [&_mark.filled-variable]:px-1 [&_mark.filled-variable]:py-0.5 [&_mark.filled-variable]:rounded [&_mark.filled-variable]:dark:bg-red-950 [&_mark.filled-variable]:dark:text-red-400"
                                dangerouslySetInnerHTML={{ __html: systemPromptDisplay }}
                              />
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="model-settings" className="border border-border rounded-lg bg-card shadow-sm">
                      <AccordionTrigger className="px-3 sm:px-4 py-2.5 sm:py-3 hover:no-underline hover:bg-muted/50 rounded-t-lg touch-manipulation">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                          <span className="font-semibold text-sm sm:text-base">Model Settings</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="ai-model" className="text-xs sm:text-sm font-medium text-muted-foreground">
                              AI Model
                            </Label>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {!modelPrefsLoading ? availableModels.length : '...'} available
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowModelPreferences(true)}
                                    className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                                  >
                                    <Settings className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Configure model preferences</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          <Select value={selectedModel} onValueChange={setSelectedModel}>
                            <SelectTrigger id="ai-model" className="w-full border-border bg-background text-foreground text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {!modelPrefsLoading && availableModels.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-xs sm:text-sm">{model.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">{model.provider.toLowerCase()}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="generation-settings" className="border border-border rounded-lg bg-card shadow-sm">
                      <AccordionTrigger className="px-3 sm:px-4 py-2.5 sm:py-3 hover:no-underline hover:bg-muted/50 rounded-t-lg touch-manipulation">
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                          <span className="font-semibold text-sm sm:text-base">Generation Settings</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                        <div className="space-y-3">
                          {/* Temperature - First */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <Label htmlFor="temperature" className="text-xs font-medium text-muted-foreground">
                                Temperature
                              </Label>
                                                          <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Temperature (0-2): Controls randomness - lower = more focused, higher = more creative</p>
                              </TooltipContent>
                            </Tooltip>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Slider
                                id="temperature"
                                min={0}
                                max={2}
                                step={0.01}
                                value={[temperature]}
                                onValueChange={([value]) => setTemperature(value)}
                                className="flex-1"
                              />
                              <span className="text-xs text-foreground w-10 text-center border border-border rounded-md py-0.5 bg-muted">
                                {temperature.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Max Tokens - Second */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <Label htmlFor="maxTokens" className="text-xs font-medium text-muted-foreground">
                                Max Tokens
                              </Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Max Tokens: Limits response length</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Input
                              id="maxTokens"
                              type="number"
                              value={maxTokens}
                              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
                              min={1}
                              max={4000}
                              className="w-full h-8 border-border bg-background text-foreground text-xs"
                            />
                          </div>

                          {/* Other parameters as sliders */}
                          {[
                            {
                              id: "topP",
                              label: "Top P",
                              value: topP,
                              setValue: setTopP,
                              min: 0,
                              max: 1,
                              step: 0.01,
                              desc: "Top P (0-1): Controls diversity - lower = more focused vocabulary"
                            },
                            {
                              id: "frequencyPenalty",
                              label: "Frequency Penalty",
                              value: frequencyPenalty,
                              setValue: setFrequencyPenalty,
                              min: 0,
                              max: 2,
                              step: 0.01,
                              desc: "Frequency Penalty: Reduces repetition of tokens based on frequency"
                            },
                            {
                              id: "presencePenalty",
                              label: "Presence Penalty",
                              value: presencePenalty,
                              setValue: setPresencePenalty,
                              min: 0,
                              max: 2,
                              step: 0.01,
                              desc: "Presence Penalty: Reduces repetition of topics/concepts"
                            }
                          ].map((param) => (
                            <div key={param.id} className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <Label htmlFor={param.id} className="text-xs font-medium text-muted-foreground">
                                  {param.label}
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{param.desc}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Slider
                                  id={param.id}
                                  min={param.min}
                                  max={param.max}
                                  step={param.step}
                                  value={[param.value]}
                                  onValueChange={([value]) => param.setValue(value)}
                                  className="flex-1"
                                />
                                <span className="text-xs text-foreground w-10 text-center border border-border rounded-md py-0.5 bg-muted">
                                  {param.value.toFixed(param.step < 1 ? 2 : 0)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="advanced-features" className="border border-border rounded-lg bg-card shadow-sm">
                      <AccordionTrigger className="px-3 sm:px-4 py-2.5 sm:py-3 hover:no-underline hover:bg-muted/50 rounded-t-lg touch-manipulation">
                        <div className="flex items-center gap-2">
                          <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                          <span className="font-semibold text-sm sm:text-base">Advanced Features</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                        <div className="space-y-4">
                          {/* Streaming Mode */}
                          <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-1">
                              <Label htmlFor="streaming-mode" className="text-xs font-medium text-muted-foreground">
                                Real-time Streaming
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                See responses generate token by token
                              </p>
                            </div>
                            <Switch
                              id="streaming-mode"
                              checked={streamingMode}
                              onCheckedChange={setStreamingMode}
                              disabled={loading || isStreaming}
                            />
                          </div>

                          {/* Structured Output Mode */}
                          <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-1">
                              <Label htmlFor="structured-output" className="text-xs font-medium text-muted-foreground">
                                Structured Output
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Enhanced parsing for JSON, XML formats
                              </p>
                            </div>
                            <Switch
                              id="structured-output"
                              checked={structuredOutputMode}
                              onCheckedChange={setStructuredOutputMode}
                            />
                          </div>

                          {/* Output Format Selection */}
                          {structuredOutputMode && (
                            <div className="space-y-2 pt-2 border-t border-border">
                              <Label className="text-xs font-medium text-muted-foreground">
                                Preferred Output Format
                              </Label>
                              <Select defaultValue="auto">
                                <SelectTrigger className="w-full text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="auto">Auto-detect</SelectItem>
                                  <SelectItem value="json">JSON</SelectItem>
                                  <SelectItem value="xml">XML</SelectItem>
                                  <SelectItem value="markdown">Markdown</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Save Prompt Modal */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Save className="h-5 w-5" />
              Submit a New Prompt
            </DialogTitle>
            <p className="text-sm text-muted-foreground">All fields marked with * are required</p>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="prompt-title" className="text-sm font-medium">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="prompt-title"
                placeholder="e.g., 'SEO-Optimized Blog Post Generator'"
                value={savePromptTitle}
                onChange={(e) => setSavePromptTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">A clear, concise title (max 100 characters)</p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="prompt-description" className="text-sm font-medium">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="prompt-description"
                placeholder="Explain what your prompt does and when someone would use it..."
                value={savePromptDescription}
                onChange={(e) => setSavePromptDescription(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">Brief description of your prompt. Drag the bottom-right corner to resize.</p>
            </div>

            {/* Prompt Content */}
            <div className="space-y-2">
              <Label htmlFor="prompt-content" className="text-sm font-medium">
                Prompt Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="prompt-content"
                placeholder="Enter your full prompt content here. You can use markdown for formatting."
                value={savePromptContent}
                onChange={(e) => setSavePromptContent(e.target.value)}
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">The full prompt content with markdown formatting support. Drag the bottom-right corner to resize.</p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Category <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {['Productivity', 'General', 'Development', 'Data Analysis', 'Marketing', 'Sales', 'HR', 'Finance', 'Legal', 'Customer Support', 'Research'].map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant={savePromptCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSavePromptCategory(category)}
                    className={savePromptCategory === category ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                  >
                    {category}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Choose the most appropriate category for your prompt or create a new one</p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Tags <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-2">
                <Input
                  placeholder="Type to search or add tags..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInput}
                />
                {savePromptTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {savePromptTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Add relevant tags to help others find your prompt. Press Enter to add a tag.</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSaveModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={savePrompt}
              disabled={!savePromptTitle || !savePromptDescription || !savePromptContent || savePromptTags.length === 0}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Submit Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Model Preferences Modal */}
      <ModelPreferences 
        open={showModelPreferences} 
        onOpenChange={setShowModelPreferences} 
      />
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex h-[calc(100vh-64px)]">
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-red-600" />
              <span className="text-lg text-muted-foreground">Loading playground...</span>
            </div>
          </div>
        </div>
      </div>
    }>
      <PlaygroundContent />
    </Suspense>
  );
}