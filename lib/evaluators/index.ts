import { evaluatorRegistry } from './registry';
import { RelevanceEvaluator } from './relevance-evaluator';
import { CoherenceEvaluator } from './coherence-evaluator';
import { HelpfulnessEvaluator } from './helpfulness-evaluator';
import { SafetyEvaluator } from './safety-evaluator';
import { CompositeEvaluator } from './composite-evaluator';

// Initialize and register all evaluators
export function initializeEvaluators() {
  // Register individual evaluators
  evaluatorRegistry.register(new RelevanceEvaluator());
  evaluatorRegistry.register(new CoherenceEvaluator());
  evaluatorRegistry.register(new HelpfulnessEvaluator());
  evaluatorRegistry.register(new SafetyEvaluator());
  
  // Register composite evaluator with default configuration
  evaluatorRegistry.register(new CompositeEvaluator());
  
  // Register a custom weighted composite for quality assessment
  const qualityEvaluator = new CompositeEvaluator(
    ['relevance', 'coherence', 'helpfulness'],
    {
      relevance: 0.4,
      coherence: 0.3,
      helpfulness: 0.3
    }
  );
  // Override the name for the quality evaluator
  (qualityEvaluator as any).config.name = 'quality';
  (qualityEvaluator as any).config.description = 'Weighted quality assessment focusing on relevance, coherence, and helpfulness';
  evaluatorRegistry.register(qualityEvaluator);
}

// Initialize evaluators on module load
initializeEvaluators();

// Export everything for external use
export { evaluatorRegistry } from './registry';
export * from './types';
export { RelevanceEvaluator } from './relevance-evaluator';
export { CoherenceEvaluator } from './coherence-evaluator';
export { HelpfulnessEvaluator } from './helpfulness-evaluator';
export { SafetyEvaluator } from './safety-evaluator';
export { CompositeEvaluator } from './composite-evaluator';