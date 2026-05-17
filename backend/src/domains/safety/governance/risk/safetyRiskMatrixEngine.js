'use strict';

/**
 * Matriz de risco SST (GHE / APR / PT) — determinística, multi-tenant via company_id do chamador.
 * Escala: severidade (1–5) × probabilidade (1–5) → nível e prioridade.
 */

const LEVELS = Object.freeze([
  { max: 4, level: 'trivial', label: 'Trivial', color: 'green' },
  { max: 8, level: 'low', label: 'Baixo', color: 'green' },
  { max: 12, level: 'medium', label: 'Médio', color: 'amber' },
  { max: 20, level: 'high', label: 'Alto', color: 'orange' },
  { max: 25, level: 'critical', label: 'Crítico', color: 'red' }
]);

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, Math.round(x)));
}

function scoreRisk(severity, probability) {
  const s = clamp(severity, 1, 5);
  const p = clamp(probability, 1, 5);
  return s * p;
}

function resolveLevel(score) {
  for (const band of LEVELS) {
    if (score <= band.max) return { ...band, score };
  }
  return { ...LEVELS[LEVELS.length - 1], score };
}

/**
 * @param {Array<{ id?: string, hazard?: string, severity?: number, probability?: number, ghe_id?: string }>} rows
 */
function evaluateRiskMatrix(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return { ok: false, error: 'rows_required' };
  }
  const evaluated = rows.map((r, i) => {
    const score = scoreRisk(r.severity, r.probability);
    const level = resolveLevel(score);
    return {
      index: i,
      id: r.id || `risk_${i}`,
      hazard: r.hazard || r.description || '',
      ghe_id: r.ghe_id || null,
      severity: clamp(r.severity, 1, 5),
      probability: clamp(r.probability, 1, 5),
      score,
      level: level.level,
      level_label: level.label,
      requires_pt: score >= 12,
      requires_loto: score >= 16,
      escalate: score >= 20
    };
  });
  const critical = evaluated.filter((e) => e.escalate);
  return {
    ok: true,
    rows: evaluated,
    critical_count: critical.length,
    critical,
    matrix_version: 'safety_risk_v1'
  };
}

/**
 * GHE — agrupamento homogêneo de exposição (estrutura mínima).
 * @param {Array<{ ghe_id: string, label: string, exposure_hours?: number, hazards?: string[] }>} groups
 */
function summarizeGheExposure(groups) {
  if (!Array.isArray(groups)) return { ok: false, error: 'groups_required' };
  return {
    ok: true,
    groups: groups.map((g) => ({
      ghe_id: g.ghe_id,
      label: g.label,
      exposure_hours: Number(g.exposure_hours) || 0,
      hazard_count: Array.isArray(g.hazards) ? g.hazards.length : 0
    })),
    total_ghe: groups.length
  };
}

module.exports = {
  LEVELS,
  scoreRisk,
  resolveLevel,
  evaluateRiskMatrix,
  summarizeGheExposure
};
