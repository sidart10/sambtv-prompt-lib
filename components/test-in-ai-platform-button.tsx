'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface TestInAIPlatformButtonProps {
  promptId: string;
  promptContent: string;
  defaultModel?: string;
  className?: string;
}

export function TestInAIPlatformButton({ 
  promptId, 
  promptContent, 
  defaultModel = 'claude-3-5-sonnet',
  className 
}: TestInAIPlatformButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTestInPlatform = async (e: React.MouseEvent) => {
    // Prevent event propagation to parent Link
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setIsLoading(true);
      
      // Build URL for local SambaTV AI Platform (Langfuse fork)  
      const aiPlatformUrl = new URL('http://localhost:3002');
      // Add prompt data as URL params for easy access
      aiPlatformUrl.searchParams.set('prompt', encodeURIComponent(promptContent));
      aiPlatformUrl.searchParams.set('promptId', promptId);
      aiPlatformUrl.searchParams.set('model', defaultModel);
      
      // Open in new tab with proper authentication flow
      const newTab = window.open(aiPlatformUrl.toString(), '_blank', 'noopener,noreferrer');
      
      if (!newTab) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site to test in AI Platform",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Opening SambaTV AI Platform",
        description: "Navigate to the Playground to test your prompt with the provided data",
      });
      
    } catch (error) {
      console.error('Error opening AI Platform:', error);
      toast({
        title: "Error",
        description: "Failed to open AI Platform. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleTestInPlatform}
      variant="outline" 
      size="sm"
      className={`gap-2 ${className || ''}`}
      disabled={isLoading}
    >
      <ExternalLink className="h-4 w-4" />
      {isLoading ? 'Opening...' : 'Test in AI Platform'}
    </Button>
  );
}