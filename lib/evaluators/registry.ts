import { BaseEvaluator, EvaluatorConfig, EvaluatorRegistry } from './types';

class EvaluatorRegistryImpl implements EvaluatorRegistry {
  private evaluators = new Map<string, BaseEvaluator>();

  register(evaluator: BaseEvaluator): void {
    const config = evaluator.getConfig();
    this.evaluators.set(config.name, evaluator);
  }

  get(evaluatorId: string): BaseEvaluator | undefined {
    return this.evaluators.get(evaluatorId);
  }

  list(): EvaluatorConfig[] {
    return Array.from(this.evaluators.values()).map(e => e.getConfig());
  }
}

// Singleton instance
export const evaluatorRegistry = new EvaluatorRegistryImpl();