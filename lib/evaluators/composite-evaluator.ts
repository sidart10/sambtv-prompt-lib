import { BaseEvaluator, EvaluationRequest, EvaluationResult, EvaluatorConfig, EvaluationMetrics } from './types';
import { evaluatorRegistry } from './registry';

export class CompositeEvaluator extends BaseEvaluator {
  private evaluatorNames: string[];
  private weights: Record<string, number>;

  constructor(
    evaluatorNames: string[] = ['relevance', 'coherence', 'helpfulness', 'safety'],
    weights?: Record<string, number>
  ) {
    super({
      name: 'composite',
      description: 'Combines multiple evaluators for comprehensive assessment',
      version: '1.0.0',
      metrics: evaluatorNames,
      thresholds: {
        excellent: 0.85,
        good: 0.7,
        fair: 0.5,
        poor: 0.3
      }
    });

    this.evaluatorNames = evaluatorNames;
    
    // Default equal weights if not provided
    this.weights = weights || {};
    if (!weights) {
      const equalWeight = 1 / evaluatorNames.length;
      evaluatorNames.forEach(name => {
        this.weights[name] = equalWeight;
      });
    }

    // Normalize weights
    const totalWeight = Object.values(this.weights).reduce((sum, w) => sum + w, 0);
    Object.keys(this.weights).forEach(key => {
      this.weights[key] = this.weights[key] / totalWeight;
    });
  }

  async evaluate(request: EvaluationRequest): Promise<EvaluationResult> {
    const evaluationPromises = this.evaluatorNames.map(async (evaluatorName) => {
      const evaluator = evaluatorRegistry.get(evaluatorName);
      if (!evaluator) {
        console.warn(`Evaluator ${evaluatorName} not found in registry`);
        return null;
      }
      
      try {
        const result = await evaluator.evaluate(request);
        return { name: evaluatorName, result };
      } catch (error) {
        console.error(`Error running evaluator ${evaluatorName}:`, error);
        return null;
      }
    });

    const results = await Promise.all(evaluationPromises);
    const validResults = results.filter(r => r !== null) as { name: string; result: EvaluationResult }[];

    if (validResults.length === 0) {
      return {
        score: 0,
        reasoning: 'All evaluators failed',
        metadata: { error: true },
        timestamp: new Date()
      };
    }

    // Calculate weighted average
    let totalScore = 0;
    const metrics: EvaluationMetrics = {};
    const reasonings: string[] = [];

    validResults.forEach(({ name, result }) => {
      const weight = this.weights[name] || 0;
      totalScore += result.score * weight;
      metrics[name] = result.score;
      reasonings.push(`${name}: ${result.reasoning}`);
    });

    // Adjust total score if some evaluators failed
    const successfulWeight = validResults.reduce((sum, { name }) => sum + (this.weights[name] || 0), 0);
    if (successfulWeight > 0) {
      totalScore = totalScore / successfulWeight;
    }

    return {
      score: Math.max(0, Math.min(1, totalScore)),
      reasoning: reasonings.join(' | '),
      metadata: {
        evaluator: this.config.name,
        version: this.config.version,
        metrics,
        weights: this.weights,
        evaluatorsRun: validResults.map(r => r.name)
      },
      timestamp: new Date()
    };
  }
}