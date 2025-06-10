'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Beaker, Variable, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TemplateVariable {
  name: string
  defaultValue?: string
  description?: string
}

interface TemplateVariablesProps {
  content: string
  promptId?: string | number
  className?: string
  onContentChange?: (content: string | undefined) => void
  variables: Record<string, string>
  onVariableChange: (varName: string, value: string) => void
  onVariablesFilled?: () => void
}

// Import centralized clipboard utility
import { copyToClipboard } from '@/lib/clipboard'

export function TemplateVariables({ content, promptId, className, onContentChange, variables, onVariableChange, onVariablesFilled }: TemplateVariablesProps) {
  const [processedContent, setProcessedContent] = useState(content)
  const router = useRouter()
  const { toast } = useToast()
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Extract template variables from content
  useEffect(() => {
    const extractVariables = () => {
      const variablePattern = /\{\{([^}|]+)(?:\|([^}]*))?\}\}/g
      const foundVariables = new Map<string, TemplateVariable>()
      
      let match
      while ((match = variablePattern.exec(content)) !== null) {
        const name = match[1].trim()
        const defaultValue = match[2]?.trim()
        
        if (!foundVariables.has(name)) {
          foundVariables.set(name, {
            name,
            defaultValue,
            description: `Value for ${name}`
          })
        }
      }
      
      // Update variables state
      // This is a placeholder implementation. You might want to update this part
      // to actually set the state with the extracted variables
    }
    
    extractVariables()
  }, [content])

  // Update processed content when variable values change
  useEffect(() => {
    let newContent = content
    const hasAnyFilledVariables = Object.keys(variables).some(
      key => variables[key] && variables[key] !== ''
    )
    
    if (hasAnyFilledVariables) {
      // Update processed content with filled variables
      newContent = content.replace(/\{\{([^}|]+)(?:\|([^}]*))?\}\}/g, (match, p1, p2) => {
        const value = variables[p1] || p2 || `{{${p1}}}`
        return `<mark class="filled-variable">${value}</mark>`
      })
      
      setProcessedContent(newContent)
      onContentChange?.(newContent)
    } else {
      setProcessedContent(content)
      onContentChange?.(undefined)
    }
  }, [content, variables, onContentChange])

  const handleInputChange = useCallback((varName: string, value: string) => {
    // Clear error when user starts typing
    if (errors[varName]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[varName]
        return newErrors
      })
    }

    onVariableChange(varName, value)
  }, [onVariableChange, errors])

  const validateVariable = (varName: string, value: string): string | null => {
    if (!value.trim()) {
      return "This field is required"
    }
    if (value.length > 500) {
      return "Value must be less than 500 characters"
    }
    return null
  }

  const handleBlur = (varName: string, value: string) => {
    const error = validateVariable(varName, value)
    if (error) {
      setErrors((prev) => ({ ...prev, [varName]: error }))
    }
  }

  const clearVariable = (varName: string) => {
    onVariableChange(varName, "")
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[varName]
      return newErrors
    })
  }

  const fillAllVariables = () => {
    const newErrors: Record<string, string> = {}
    let hasErrors = false

    Object.keys(variables).forEach((varName) => {
      const value = variables[varName]
      const error = validateVariable(varName, value)
      if (error) {
        newErrors[varName] = error
        hasErrors = true
      }
    })

    setErrors(newErrors)

    if (!hasErrors && onVariablesFilled) {
      onVariablesFilled()
    }
  }

  const filledCount = Object.keys(variables).filter((varName) => variables[varName]?.trim()).length
  const totalCount = Object.keys(variables).length
  const allFilled = filledCount === totalCount

  const handleCopyProcessed = async () => {
    // Create clean content without highlight markers for copying
    let cleanContent = content
    let hasFilledVars = false
    
    Object.keys(variables).forEach(varName => {
      const value = variables[varName] || variables[varName] || `{{${varName}}}`
      
      // Check if this variable has been customized (not just using default)
      if (variables[varName] && variables[varName] !== '') {
        hasFilledVars = true
      }
      
      const patterns = [
        new RegExp(`\\{\\{\\s*${varName}\\s*\\|[^}]*\\}\\}`, 'g'),
        new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g')
      ]
      patterns.forEach(pattern => {
        cleanContent = cleanContent.replace(pattern, value)
      })
    })
    
    const success = await copyToClipboard(cleanContent, {
      onSuccess: () => {
        // Only show notification if variables were actually customized
        if (hasFilledVars) {
          toast({
            title: "Copied!",
            description: "Customized prompt copied to clipboard",
          })
        } else {
          toast({
            title: "Copied!",
            description: "Prompt copied to clipboard",
          })
        }
      },
      onError: (error) => {
        console.error('Template variables copy error:', error)
        toast({
          title: "Error",
          description: "Failed to copy to clipboard",
          variant: "destructive",
        })
      }
    })
    
    // Handle case where utility returns false but doesn't call onError
    if (!success) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const handleTestInPlayground = () => {
    if (!promptId) return
    
    let processedContentWithHighlights = content
    Object.keys(variables).forEach(varName => {
      const value = variables[varName] || variables[varName] || `{{${varName}}}`
      
      const pattern = new RegExp(`\\{\\{\\s*${varName}(?:\\s*\\|[^}]*)?\\s*\\}\\}`, 'g')

      if (value && value !== `{{${varName}}}`) {
        // If the variable is filled, wrap it in the styled mark tag
        processedContentWithHighlights = processedContentWithHighlights.replace(pattern, `<mark class="filled-variable">${value}</mark>`)
      } else {
        // Otherwise, just replace it with the placeholder itself
        processedContentWithHighlights = processedContentWithHighlights.replace(pattern, value)
      }
    })
    
    // Store the HTML-rich content in localStorage
    localStorage.setItem('playground-processed-content', processedContentWithHighlights)
    localStorage.setItem('playground-prompt-id', promptId.toString())
    
    // Navigate to playground
    router.push(`/playground?promptId=${promptId}&processed=true`)
  }

  if (Object.keys(variables).length === 0) {
    return null
  }

  return (
    <Card className={cn("mb-4 sm:mb-6", className)}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <CardTitle className="text-lg">Customize Variables</CardTitle>
          <div className="flex flex-wrap gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fillAllVariables}
              disabled={!allFilled}
              className="text-xs h-8 px-3 flex-1 sm:flex-none min-w-0"
            >
              <Variable className="w-3 h-3 mr-1 shrink-0" />
              <span className="truncate">Validate All</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleCopyProcessed}
              className="text-xs h-8 px-3 flex-1 sm:flex-none min-w-0"
            >
              <Copy className="w-3 h-3 mr-1 shrink-0" />
              <span className="truncate">Copy</span>
            </Button>
            {promptId && (
              <Button
                variant="default"
                size="sm"
                className="text-xs h-8 px-3 flex-1 sm:flex-none min-w-0"
                onClick={handleTestInPlayground}
              >
                <Beaker className="w-3 h-3 mr-1 shrink-0" />
                <span className="truncate sm:inline">Test</span>
                <span className="hidden sm:inline"> in Playground</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!allFilled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fill in all template variables before using this prompt.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {Object.keys(variables).map((varName) => {
            const value = variables[varName] || ""
            const hasError = !!errors[varName]
            const isFilled = value.trim().length > 0

            return (
              <div key={varName} className="space-y-2">
                <Label
                  htmlFor={`var-${varName}`}
                  className="flex items-center justify-between"
                >
                  <span className="font-medium">
                    {varName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                  {isFilled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearVariable(varName)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Variable className="h-3 w-3" />
                    </Button>
                  )}
                </Label>
                <Input
                  id={`var-${varName}`}
                  type="text"
                  value={value}
                  onChange={(e) => handleInputChange(varName, e.target.value)}
                  onBlur={(e) => handleBlur(varName, e.target.value)}
                  placeholder={`Enter value for ${varName}...`}
                  className={hasError ? "border-red-500 focus:ring-red-500" : ""}
                />
                {hasError && (
                  <p className="text-sm text-red-600">{errors[varName]}</p>
                )}
              </div>
            )
          })}
        </div>

        {allFilled && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <Variable className="h-4 w-4" />
              All template variables have been filled!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}