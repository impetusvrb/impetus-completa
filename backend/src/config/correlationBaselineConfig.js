'use strict';

/**
 * FASE 43 — Limites para classificação de correlação observável (determinístico).
 */
module.exports = {
  /** |r| mínimo para considerar par (abaixo = none, não reportar) */
  min_report_abs: 0.15,
  /** Amostras alinhadas mínimas por par */
  min_sample_size: 30,
  /** Máximo de pontos por janela (performance) */
  max_samples_per_window: 8000,
  classification: {
    none_max: 0.2,
    weak_max: 0.4,
    moderate_max: 0.6,
    strong_max: 0.8
  },
  windows: {
    hours_24: { key: '24h', hours: 24 },
    days_7: { key: '7d', hours: 7 * 24 },
    days_30: { key: '30d', hours: 30 * 24 }
  },
  interaction_score: {
    very_strong_points: 25,
    strong_points: 15,
    moderate_points: 8,
    max_pairs_counted: 6,
    levels: { normal_max: 25, elevated_max: 60 }
  },
  feed: { max_events: 4 }
};
