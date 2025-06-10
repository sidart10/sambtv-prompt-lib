'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Code2, 
  Copy, 
  ChevronDown, 
  ChevronRight, 
  FileJson, 
  FileCode, 
  FileText,
  AlertTriangle 
} from 'lucide-react';
import { parseOutput, ParsedOutput } from '@/lib/outputParser';
import { useToast } from '@/hooks/use-toast';

interface StructuredOutputDisplayProps {
  content: string;
  className?: string;
}

interface JsonTreeNodeProps {
  data: any;
  keyName?: string;
  depth?: number;
}

function JsonTreeNode({ data, keyName, depth = 0 }: JsonTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(depth < 2); // Auto-open first 2 levels
  
  const isObject = typeof data === 'object' && data !== null && !Array.isArray(data);
  const isArray = Array.isArray(data);
  const isPrimitive = !isObject && !isArray;
  
  const getValueType = (value: any): string => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  };
  
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'string': return 'text-green-600 dark:text-green-400';
      case 'number': return 'text-blue-600 dark:text-blue-400';
      case 'boolean': return 'text-purple-600 dark:text-purple-400';
      case 'null': return 'text-gray-500 dark:text-gray-400';
      case 'array': return 'text-orange-600 dark:text-orange-400';
      case 'object': return 'text-cyan-600 dark:text-cyan-400';
      default: return 'text-foreground';
    }
  };
  
  if (isPrimitive) {
    const type = getValueType(data);
    return (
      <div className="flex items-center gap-2 py-1">
        {keyName && (
          <span className="text-sm font-medium text-muted-foreground">{keyName}:</span>
        )}
        <span className={`text-sm ${getTypeColor(type)}`}>
          {type === 'string' ? `"${data}"` : String(data)}
        </span>
        <Badge variant="outline" className="text-xs">
          {type}
        </Badge>
      </div>
    );
  }
  
  const childKeys = Object.keys(data);
  const hasChildren = childKeys.length > 0;
  
  return (
    <div className="space-y-1">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 justify-start hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              {hasChildren ? (
                isOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )
              ) : null}
              {keyName && (
                <span className="text-sm font-medium text-muted-foreground">{keyName}:</span>
              )}
              <Badge variant="outline" className="text-xs">
                {isArray ? `array[${childKeys.length}]` : `object{${childKeys.length}}`}
              </Badge>
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-4 border-l border-border pl-3 space-y-1">
            {childKeys.map((key) => (
              <JsonTreeNode
                key={key}
                data={data[key]}
                keyName={isArray ? `[${key}]` : key}
                depth={depth + 1}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function StructuredOutputDisplay({ content, className }: StructuredOutputDisplayProps) {
  const { toast } = useToast();
  const [parsedOutput, setParsedOutput] = useState<ParsedOutput | null>(null);
  
  React.useEffect(() => {
    if (content) {
      const parsed = parseOutput(content);
      setParsedOutput(parsed);
    }
  }, [content]);
  
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };
  
  if (!parsedOutput) {
    return null;
  }
  
  const getFormatIcon = (type: string) => {
    switch (type) {
      case 'json': return <FileJson className="h-4 w-4" />;
      case 'xml': return <FileCode className="h-4 w-4" />;
      case 'markdown': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };
  
  // Only show structured output display if it's actually structured
  if (!parsedOutput.isStructured) {
    return null;
  }
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {getFormatIcon(parsedOutput.type)}
          Structured Output
          <Badge variant="secondary" className="text-xs">
            {parsedOutput.type.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {parsedOutput.errors && parsedOutput.errors.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Parsing Warnings:</span>
            </div>
            <ul className="mt-1 ml-6 text-sm text-yellow-700 dark:text-yellow-300">
              {parsedOutput.errors.map((error, index) => (
                <li key={index} className="list-disc">{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        <Tabs defaultValue="parsed" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="parsed">Parsed</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
          </TabsList>
          
          <TabsContent value="parsed" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Structured Data
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(parsedOutput.formatted, 'Structured data')}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              
              <ScrollArea className="h-[300px] w-full border border-border rounded-md p-3">
                {parsedOutput.type === 'json' ? (
                  <JsonTreeNode data={parsedOutput.data} />
                ) : (
                  <pre className="text-xs text-foreground whitespace-pre-wrap">
                    {parsedOutput.formatted}
                  </pre>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="raw" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Raw Output
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(content, 'Raw output')}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              
              <ScrollArea className="h-[300px] w-full border border-border rounded-md p-3">
                <pre className="text-xs text-foreground whitespace-pre-wrap">
                  {content}
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}