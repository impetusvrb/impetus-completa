'use strict';

/**
 * FASE 47 — Pesos explícitos para priority_score (importância operacional observável).
 * Soma dos pesos = 1.0 — sem cálculos ocultos.
 */
module.exports = {
  weights: {
    attention_score: 0.3,
    risk_score: 0.2,
    event_confidence: 0.2,
    pattern_confidence: 0.2,
    telemetry_health: 0.1
  },
  levels: {
    low_max: 25,
    medium_max: 50,
    high_max: 75
  },
  queue: {
    max_equipment: 20,
    max_events: 15,
    max_patterns: 10
  },
  feed: { max_items: 6 }
};
