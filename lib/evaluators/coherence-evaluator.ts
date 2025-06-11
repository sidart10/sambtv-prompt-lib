import { BaseEvaluator, EvaluationRequest, EvaluationResult, EvaluatorConfig } from './types';
import { generateText } from 'ai';
import { getAnthropicModel } from '@/lib/ai';

const COHERENCE_PROMPT = `You are an expert evaluator assessing the coherence and logical flow of an AI response.

Evaluate based on these criteria:
1. Logical structure and organization
2. Consistency of ideas and arguments
3. Smooth transitions between concepts
4. Clarity of expression
5. Absence of contradictions

Prompt: {prompt}
Response: {response}

Provide a score from 0 to 1 where:
- 1.0 = Perfectly coherent and well-structured
- 0.8-0.9 = Very coherent with minor issues
- 0.6-0.7 = Generally coherent but some confusion
- 0.4-0.5 = Somewhat incoherent
- Below 0.4 = Mostly incoherent

Return your evaluation in JSON format:
{
  "score": <number between 0 and 1>,
  "reasoning": "<brief explanation of your scoring>"
}`;

export class CoherenceEvaluator extends BaseEvaluator {
  constructor() {
    super({
      name: 'coherence',
      description: 'Evaluates the logical flow, consistency, and clarity of an AI response',
      version: '1.0.0',
      metrics: ['coherence', 'clarity', 'consistency'],
      thresholds: {
        excellent: 0.9,
        good: 0.7,
        fair: 0.5,
        poor: 0.3
      }
    });
  }

  async evaluate(request: EvaluationRequest): Promise<EvaluationResult> {
    try {
      const evaluationPrompt = COHERENCE_PROMPT
        .replace('{prompt}', request.prompt)
        .replace('{response}', request.response);

      const model = getAnthropicModel('claude-3-7-sonnet-20250219');
      const result = await generateText({
        model,
        prompt: evaluationPrompt,
        temperature: 0.1,
        maxTokens: 500
      });

      try {
        const parsed = JSON.parse(result.text);
        return {
          score: Math.max(0, Math.min(1, parsed.score)),
          reasoning: parsed.reasoning || 'No reasoning provided',
          metadata: {
            evaluator: this.config.name,
            version: this.config.version,
            model: 'claude-3-7-sonnet-20250219'
          },
          timestamp: new Date()
        };
      } catch (parseError) {
        return {
          score: 0.5,
          reasoning: 'Failed to parse evaluation result',
          metadata: {
            error: 'JSON parse error',
            rawResponse: result.text
          },
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        score: 0,
        reasoning: `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }
}