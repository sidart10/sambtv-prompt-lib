'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Pause, 
  Play, 
  Square, 
  Copy, 
  Zap, 
  Clock,
  TrendingUp 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StreamingDisplayProps {
  isStreaming: boolean;
  content?: string;
  metrics?: {
    totalTokens: number;
    tokensPerSecond: number;
    elapsed: number;
  };
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  className?: string;
}

interface StreamChunk {
  id: string;
  content: string;
  timestamp: number;
  tokenCount?: number;
}

interface StreamMetrics {
  totalTokens: number;
  tokensPerSecond: number;
  startTime: number;
  elapsed: number;
}

export function StreamingDisplay({ 
  isStreaming,
  content = '',
  metrics,
  onPause, 
  onResume, 
  onStop,
  className 
}: StreamingDisplayProps) {
  const { toast } = useToast();
  const [chunks, setChunks] = useState<StreamChunk[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [internalMetrics, setInternalMetrics] = useState<StreamMetrics>({
    totalTokens: 0,
    tokensPerSecond: 0,
    startTime: Date.now(),
    elapsed: 0
  });
  const [fullContent, setFullContent] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const metricsInterval = useRef<NodeJS.Timeout>();
  
  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };
  
  // Update metrics every second during streaming
  useEffect(() => {
    if (isStreaming && !isPaused) {
      metricsInterval.current = setInterval(() => {
        setInternalMetrics(prev => {
          const now = Date.now();
          const elapsed = (now - prev.startTime) / 1000;
          const tokensPerSecond = elapsed > 0 ? prev.totalTokens / elapsed : 0;
          
          return {
            ...prev,
            elapsed,
            tokensPerSecond
          };
        });
      }, 1000);
    } else {
      if (metricsInterval.current) {
        clearInterval(metricsInterval.current);
      }
    }
    
    return () => {
      if (metricsInterval.current) {
        clearInterval(metricsInterval.current);
      }
    };
  }, [isStreaming, isPaused]);
  
  // Scroll to bottom when new chunks arrive or content changes
  useEffect(() => {
    if (chunks.length > 0) {
      scrollToBottom();
      setFullContent(chunks.map(chunk => chunk.content).join(''));
    }
  }, [chunks]);

  // Update fullContent when content prop changes
  useEffect(() => {
    if (content && content !== fullContent) {
      setFullContent(content);
    }
  }, [content]);
  
  // Reset when streaming starts
  useEffect(() => {
    if (isStreaming) {
      setChunks([]);
      setInternalMetrics({
        totalTokens: 0,
        tokensPerSecond: 0,
        startTime: Date.now(),
        elapsed: 0
      });
      setFullContent('');
      setIsPaused(false);
    }
  }, [isStreaming]);
  
  // Simulate streaming (in real implementation, this would come from the API)
  const addChunk = (content: string, tokenCount: number = 1) => {
    const chunk: StreamChunk = {
      id: `chunk-${Date.now()}-${Math.random()}`,
      content,
      timestamp: Date.now(),
      tokenCount
    };
    
    setChunks(prev => [...prev, chunk]);
    setInternalMetrics(prev => ({
      ...prev,
      totalTokens: prev.totalTokens + tokenCount
    }));
  };
  
  const handlePause = () => {
    setIsPaused(true);
    onPause?.();
  };
  
  const handleResume = () => {
    setIsPaused(false);
    onResume?.();
  };
  
  const handleStop = () => {
    setIsPaused(false);
    onStop?.();
  };
  
  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(fullContent);
      toast({
        title: "Copied!",
        description: "Streaming content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };
  
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  // Use provided metrics if available, otherwise use internal metrics
  const displayMetrics = metrics || internalMetrics;
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4" />
            Real-time Streaming
            {isStreaming && (
              <Badge variant="secondary" className="text-xs animate-pulse">
                {isPaused ? 'Paused' : 'Live'}
              </Badge>
            )}
          </CardTitle>
          
          {isStreaming && (
            <div className="flex items-center gap-2">
              {!isPaused ? (
                <Button variant="outline" size="sm" onClick={handlePause}>
                  <Pause className="h-3 w-3 mr-1" />
                  Pause
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleResume}>
                  <Play className="h-3 w-3 mr-1" />
                  Resume
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleStop}>
                <Square className="h-3 w-3 mr-1" />
                Stop
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Streaming Metrics */}
        {isStreaming && (
          <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-muted/30 rounded-md">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" />
                Tokens
              </div>
              <div className="text-sm font-medium">{displayMetrics.totalTokens}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Zap className="h-3 w-3" />
                Speed
              </div>
              <div className="text-sm font-medium">
                {displayMetrics.tokensPerSecond.toFixed(1)} t/s
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Clock className="h-3 w-3" />
                Time
              </div>
              <div className="text-sm font-medium">
                {formatDuration(displayMetrics.elapsed)}
              </div>
            </div>
          </div>
        )}
        
        {/* Streaming Content */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {isStreaming ? 'Streaming Response' : 'Response'}
            </span>
            {fullContent && (
              <Button variant="outline" size="sm" onClick={copyContent}>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            )}
          </div>
          
          <ScrollArea 
            ref={scrollAreaRef}
            className="h-[300px] w-full border border-border rounded-md p-3"
          >
            <div className="space-y-1">
              {!fullContent && !isStreaming ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-muted" />
                  <p>Real-time streaming will appear here</p>
                  <p className="text-xs mt-1">
                    See AI responses generated token by token
                  </p>
                </div>
              ) : (
                <>
                  {chunks.length > 0 ? (
                    // Show chunks when streaming with chunk data
                    chunks.map((chunk, index) => (
                      <span
                        key={chunk.id}
                        className={`text-sm text-foreground ${
                          isStreaming && index === chunks.length - 1 
                            ? 'animate-pulse' 
                            : ''
                        }`}
                      >
                        {chunk.content}
                      </span>
                    ))
                  ) : (
                    // Show full content when provided via props
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {fullContent}
                    </div>
                  )}
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Streaming Progress */}
        {isStreaming && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {isPaused ? 'Stream paused' : 'Streaming in real-time'}
              </div>
              <div className="flex-1 text-right">
                {chunks.length} chunks received
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for managing streaming state
export function useStreaming() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  const startStream = (url: string, onChunk?: (data: any) => void, onComplete?: () => void) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setIsStreaming(true);
    setIsPaused(false);
    
    eventSourceRef.current = new EventSource(url);
    
    eventSourceRef.current.onmessage = (event) => {
      if (!isPaused) {
        try {
          const data = JSON.parse(event.data);
          onChunk?.(data);
        } catch (error) {
          console.error('Failed to parse streaming data:', error);
        }
      }
    };
    
    eventSourceRef.current.onerror = (error) => {
      console.error('Streaming error:', error);
      stopStream();
    };
    
    eventSourceRef.current.addEventListener('complete', () => {
      onComplete?.();
      stopStream();
    });
  };
  
  const pauseStream = () => {
    setIsPaused(true);
  };
  
  const resumeStream = () => {
    setIsPaused(false);
  };
  
  const stopStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    setIsPaused(false);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
  
  return {
    isStreaming,
    isPaused,
    startStream,
    pauseStream,
    resumeStream,
    stopStream
  };
}