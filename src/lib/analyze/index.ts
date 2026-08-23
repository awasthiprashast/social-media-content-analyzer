import type {
  AnalysisResult, Category, CategoryScore, PlatformId, Suggestion,
} from '../types';
import { computeMetrics } from './metrics';
import { PLATFORMS } from './platforms';
import { CATEGORY_LABELS, SCORERS, WEIGHTS } from './rules';

export { PLATFORMS, PLATFORM_LIST } from './platforms';
export type { PlatformProfile } from './platforms';
export { CATEGORY_LABELS, WEIGHTS } from './rules';
export { computeMetrics } from './metrics';

/** Order used when sorting the suggestion list: act on the red ones first. */
const SEVERITY_RANK: Record<Suggestion['severity'], number> = {
  critical: 0,
  warning: 1,
  tip: 2,
  praise: 3,
};

function toGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Run every category scorer over the text and fold the results into a single
 * weighted score plus a prioritised list of suggestions.
 *
 * The analysis is pure and synchronous: same text in, same result out, which
 * makes it trivial to test and instant to re-run when the platform changes.
 */
export function analyze(text: string, platformId: PlatformId): AnalysisResult {
  const platform = PLATFORMS[platformId];
  const metrics = computeMetrics(text);
  const context = { text, metrics, platform };

  const categories: CategoryScore[] = [];
  const suggestions: Suggestion[] = [];

  for (const category of Object.keys(SCORERS) as Category[]) {
    const outcome = SCORERS[category](context);
    categories.push({
      category,
      score: Math.round(outcome.score),
      weight: WEIGHTS[category],
    });
    suggestions.push(...outcome.suggestions);
  }

  const score = Math.round(
    categories.reduce((sum, c) => sum + c.score * c.weight, 0),
  );

  suggestions.sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (bySeverity !== 0) return bySeverity;
    // Within a severity, surface the categories that count for most first.
    return WEIGHTS[b.category] - WEIGHTS[a.category];
  });

  return {
    platform: platformId,
    score,
    grade: toGrade(score),
    metrics,
    categories: categories.sort((a, b) => a.score - b.score),
    suggestions,
  };
}

export function categoryLabel(category: Category): string {
  return CATEGORY_LABELS[category];
}
