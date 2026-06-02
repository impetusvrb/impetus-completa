'use strict';

/**
 * FASE 45 — Limites para padrões operacionais recorrentes (observados, sem previsão).
 */
module.exports = {
  min_occurrences_recurring: 2,
  min_occurrences_stable: 2,
  min_windows_multi_bonus: 2,
  pattern_confidence: {
    base: 20,
    per_occurrence: 10,
    per_window: 8,
    max_score: 100,
    severity_consistency_bonus: 12
  },
  severity_map: {
    STABLE_OPERATION_PATTERN: 'informational',
    OBSERVED_REPETITIVE_BEHAVIOR: 'informational',
    RECURRING_TELEMETRY_DEGRADATION: 'attention',
    RECURRING_SIGNAL_INSTABILITY: 'attention',
    RECURRING_ATTENTION_EVENT: 'warning',
    RECURRING_ALARM_ESCALATION: 'warning',
    RECURRING_CORRELATED_DEVIATION: 'warning'
  },
  severity_by_frequency: {
    low_max: 2,
    medium_max: 4
  },
  history_windows: ['24h', '7d', '30d', '90d'],
  event_windows: ['24h', '7d', '30d'],
  feed: { max_patterns: 5 }
};
