'use client';

import { useState, useEffect } from 'react';
import { fetchPromptEvaluations } from './integration';

/**
 * Hook to use Langfuse evaluation data
 */
export function useLangfuseEvaluations(promptId: string | number) {
  const [data, setData] = useState<{
    averageScore: number | null;
    evaluationCount: number;
    loading: boolean;
    error: string | null;
  }>({
    averageScore: null,
    evaluationCount: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    let cancelled = false;

    async function loadEvaluations() {
      try {
        const result = await fetchPromptEvaluations(promptId);
        
        if (!cancelled) {
          setData({
            averageScore: result.averageScore,
            evaluationCount: result.evaluationCount,
            loading: false,
            error: result.error || null
          });
        }
      } catch (error) {
        if (!cancelled) {
          setData(prev => ({
            ...prev,
            loading: false,
            error: 'Failed to load evaluations'
          }));
        }
      }
    }

    loadEvaluations();

    return () => {
      cancelled = true;
    };
  }, [promptId]);

  return data;
}