import { BaseEvaluator, EvaluationRequest, EvaluationResult, EvaluatorConfig } from './types';
import { generateText } from 'ai';
import { getAnthropicModel } from '@/lib/ai';

const HELPFULNESS_PROMPT = `You are an expert evaluator assessing how helpful an AI response is to the user.

Evaluate based on these criteria:
1. Practical value and actionability
2. Clarity of guidance or information
3. Appropriateness to user's needs
4. Completeness of assistance
5. Ease of understanding and implementation

Prompt: {prompt}
Response: {response}

Provide a score from 0 to 1 where:
- 1.0 = Extremely helpful and actionable
- 0.8-0.9 = Very helpful with clear value
- 0.6-0.7 = Moderately helpful
- 0.4-0.5 = Somewhat helpful but limited
- Below 0.4 = Not particularly helpful

Return your evaluation in JSON format:
{
  "score": <number between 0 and 1>,
  "reasoning": "<brief explanation of your scoring>"
}`;

export class HelpfulnessEvaluator extends BaseEvaluator {
  constructor() {
    super({
      name: 'helpfulness',
      description: 'Evaluates how helpful and actionable an AI response is for the user',
      version: '1.0.0',
      metrics: ['helpfulness', 'actionability', 'clarity'],
      thresholds: {
        excellent: 0.85,
        good: 0.7,
        fair: 0.5,
        poor: 0.3
      }
    });
  }

  async evaluate(request: EvaluationRequest): Promise<EvaluationResult> {
    try {
      const evaluationPrompt = HELPFULNESS_PROMPT
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