export interface PlanningSuggestion {
  title: string;
  startsAt?: string;
  reason: string;
}

export function buildRulesBasedNowPlan(items: PlanningSuggestion[]) {
  return items.slice(0, 3);
}
