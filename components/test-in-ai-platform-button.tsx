"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface TestInAIPlatformButtonProps {
  promptContent: string;
  promptId: number;
  className?: string;
}

export function TestInAIPlatformButton({ promptContent, promptId, className }: TestInAIPlatformButtonProps) {
  const handleClick = () => {
    const params = new URLSearchParams({
      prompt: promptContent,
      promptId: promptId.toString(),
      model: 'claude-3-5-sonnet'
    });
    window.open(`https://ai.sambatv.com/playground?${params}`, '_blank');
  };

  return (
    <Button
      variant="outline"
      size="default"
      className={className}
      onClick={handleClick}
    >
      <ExternalLink className="w-4 h-4 mr-2" />
      Test in AI Platform
    </Button>
  );
}