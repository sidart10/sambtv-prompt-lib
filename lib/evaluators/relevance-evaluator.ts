import { BaseEvaluator, EvaluationRequest, EvaluationResult, EvaluatorConfig } from './types';
import { generateText } from 'ai';
import { getAnthropicModel } from '@/lib/ai';

const RELEVANCE_PROMPT = `You are an expert evaluator assessing the relevance of an AI response to a given prompt.

Evaluate based on these criteria:
1. Direct addressing of the prompt's requirements
2. Completeness of the response
3. Absence of irrelevant information
4. Contextual appropriateness

Prompt: {prompt}
Response: {response}
{context}

Provide a score from 0 to 1 where:
- 1.0 = Perfectly relevant and complete
- 0.8-0.9 = Highly relevant with minor gaps
- 0.6-0.7 = Generally relevant but missing key elements
- 0.4-0.5 = Partially relevant
- Below 0.4 = Mostly irrelevant

Return your evaluation in JSON format:
{
  "score": <number between 0 and 1>,
  "reasoning": "<brief explanation of your scoring>"
}`;

export class RelevanceEvaluator extends BaseEvaluator {
  constructor() {
    super({
      name: 'relevance',
      description: 'Evaluates how relevant and complete an AI response is to the given prompt',
      version: '1.0.0',
      metrics: ['relevance', 'completeness'],
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
      const contextStr = request.context ? `Context: ${request.context}` : '';
      const evaluationPrompt = RELEVANCE_PROMPT
        .replace('{prompt}', request.prompt)
        .replace('{response}', request.response)
        .replace('{context}', contextStr);

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
        // Fallback if JSON parsing fails
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