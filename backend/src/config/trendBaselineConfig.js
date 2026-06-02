'use strict';

/**
 * FASE 41 — Limites centralizados para baseline e tendências (determinístico).
 */
module.exports = {
  /** Variação percentual |Δ| para classificar tendência */
  trend: {
    stable_max_percent: 10,
    increasing_min_percent: 10,
    decreasing_min_percent: 10
  },
  /** Baseline operacional por desvio percentual vs mediana de referência */
  baseline: {
    normal_max_percent: 10,
    warning_max_percent: 25,
    critical_above_percent: 25
  },
  /** MAD — multiplicador para desvio robusto (opcional no score) */
  mad: {
    warning_multiplier: 2,
    critical_multiplier: 3
  },
  /** Risk score observacional (0–100) — pesos */
  risk: {
    vibration_increase_weight: 25,
    temperature_increase_weight: 20,
    alarm_readings_weight: 20,
    telemetry_health_drop_weight: 20,
    coverage_drop_weight: 15,
    levels: {
      normal_max: 25,
      warning_max: 50
    }
  },
  windows: {
    hours_24: 24,
    days_7: 7 * 24,
    days_30: 30 * 24
  }
};
