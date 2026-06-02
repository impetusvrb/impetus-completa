'use strict';

/**
 * FASE 44 — Limites para eventos operacionais observáveis.
 */
module.exports = {
  attention_threshold: 26,
  critical_attention_threshold: 51,
  telemetry_health_degraded: 75,
  telemetry_health_recovered: 90,
  correlation_strong_min: 0.6,
  event_confidence: {
    base_per_evidence: 12,
    max_score: 100,
    anomaly_critical_bonus: 20,
    correlation_strong_bonus: 15,
    alarm_bonus: 15,
    trend_change_bonus: 10
  },
  severity_map: {
    NORMAL_OPERATION: 'informational',
    TELEMETRY_RECOVERY: 'informational',
    OBSERVED_OPERATIONAL_CHANGE: 'informational',
    TELEMETRY_DEGRADATION: 'attention',
    SIGNAL_INSTABILITY: 'attention',
    CORRELATED_DEVIATION: 'warning',
    ALARM_ESCALATION: 'warning',
    EQUIPMENT_ATTENTION_REQUIRED: 'warning',
    EQUIPMENT_ATTENTION_CRITICAL: 'critical'
  },
  windows: ['24h', '7d', '30d'],
  feed: { max_events: 6 }
};
