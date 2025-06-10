'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { MessageSquare, Send, X, CheckCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

// Form validation schema
const feedbackSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  content: z.string()
    .min(10, 'Feedback must be at least 10 characters')
    .max(2000, 'Feedback must be less than 2000 characters'),
  feedback_type: z.enum(['bug', 'feature', 'general', 'improvement']),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
})

type FeedbackFormData = z.infer<typeof feedbackSchema>

interface FeedbackFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValues?: Partial<FeedbackFormData>
}

export function FeedbackForm({ open, onOpenChange, initialValues }: FeedbackFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()
  
  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      title: initialValues?.title || '',
      content: initialValues?.content || '',
      feedback_type: initialValues?.feedback_type || 'general',
      email: initialValues?.email || '',
    },
  })

  const onSubmit = async (data: FeedbackFormData) => {
    try {
      setIsSubmitting(true)
      
      // Add current page URL for context
      const feedbackData = {
        ...data,
        page_url: window.location.href,
      }
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit feedback')
      }
      
      setSubmitted(true)
      form.reset()
      
      toast({
        title: "Feedback Submitted!",
        description: "Thank you for your feedback. We appreciate your input!",
      })
      
      // Close form after success message
      setTimeout(() => {
        setSubmitted(false)
        onOpenChange(false)
      }, 2000)
      
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit feedback. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setSubmitted(false)
      onOpenChange(false)
      form.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <MessageSquare className="h-5 w-5" />
            Send Feedback
          </DialogTitle>
        </DialogHeader>
        
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-green-700">Feedback Submitted!</h3>
              <p className="text-sm text-muted-foreground">
                Thank you for helping us improve the SambaTV AI Platform.
              </p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Feedback Type */}
              <FormField
                control={form.control}
                name="feedback_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select feedback type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General Feedback</SelectItem>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="improvement">Improvement Suggestion</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief summary of your feedback"
                        {...field}
                        maxLength={200}
                      />
                    </FormControl>
                    <FormDescription>
                      A concise title that summarizes your feedback ({field.value?.length || 0}/200)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Content */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Details <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please provide detailed feedback. Include steps to reproduce if reporting a bug."
                        className="min-h-[120px] resize-y"
                        {...field}
                        maxLength={2000}
                      />
                    </FormControl>
                    <FormDescription>
                      Detailed description of your feedback ({field.value?.length || 0}/2000)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email (optional) */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide your email if you'd like us to follow up on your feedback
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Send className="h-4 w-4 mr-2 animate-pulse" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Simple floating feedback button
interface FeedbackButtonProps {
  className?: string
}

export function FeedbackButton({ className }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className={className}
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Feedback
      </Button>
      <FeedbackForm open={open} onOpenChange={setOpen} />
    </>
  )
}