'use strict';

/**
 * FASE 42 — Limites centralizados para detecção de anomalias (determinístico).
 */
module.exports = {
  deviation: {
    attention_min_percent: 10,
    anomaly_min_percent: 25,
    critical_min_percent: 50,
    abrupt_drop_percent: 25
  },
  mad: {
    attention_multiplier: 2,
    anomaly_multiplier: 3,
    critical_multiplier: 4
  },
  percentile: {
    attention_above_p95: true,
    critical_above_p99_factor: 1.15
  },
  windows: {
    recent_hours: 24,
    baseline_days: 7,
    history_days: 30,
    abrupt_recent_hours: 2
  },
  attention_score: {
    critical_anomaly_points: 40,
    anomaly_points: 25,
    attention_points: 12,
    alarm_signal_points: 20,
    trend_rupture_bonus: 10,
    levels: {
      normal_max: 25,
      elevated_max: 50
    }
  },
  feed: {
    max_events: 5
  }
};
