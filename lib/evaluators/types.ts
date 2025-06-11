// Evaluator types and interfaces

export interface EvaluationResult {
  score: number; // 0-1 scale
  reasoning: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface EvaluationMetrics {
  relevance?: number;
  coherence?: number;
  helpfulness?: number;
  accuracy?: number;
  safety?: number;
  [key: string]: number | undefined;
}

export interface EvaluatorConfig {
  name: string;
  description: string;
  version: string;
  metrics: string[];
  thresholds?: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

export interface EvaluationRequest {
  prompt: string;
  response: string;
  context?: string;
  expectedOutput?: string;
  evaluatorId: string;
  metadata?: Record<string, any>;
}

export interface BatchEvaluationRequest {
  evaluations: EvaluationRequest[];
  evaluatorId: string;
}

export interface EvaluationComparison {
  promptId: string;
  variantA: {
    id: string;
    response: string;
    evaluation: EvaluationResult;
  };
  variantB: {
    id: string;
    response: string;
    evaluation: EvaluationResult;
  };
  winner: 'A' | 'B' | 'tie';
  confidence: number;
}

export abstract class BaseEvaluator {
  constructor(protected config: EvaluatorConfig) {}

  abstract evaluate(request: EvaluationRequest): Promise<EvaluationResult>;

  async batchEvaluate(requests: EvaluationRequest[]): Promise<EvaluationResult[]> {
    return Promise.all(requests.map(req => this.evaluate(req)));
  }

  getConfig(): EvaluatorConfig {
    return this.config;
  }
}

export interface EvaluatorRegistry {
  register(evaluator: BaseEvaluator): void;
  get(evaluatorId: string): BaseEvaluator | undefined;
  list(): EvaluatorConfig[];
}