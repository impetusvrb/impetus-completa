'use strict';

/**
 * Validação automática de qualidade de decisão (observabilidade only).
 * Não altera decisões, não bloqueia pipelines, não invoca ODE.
 */

const unifiedMetricsAggregatorService = require('./unifiedMetricsAggregatorService');
const unifiedDegradationService = require('./unifiedDegradationService');
const unifiedLearningFeedbackService = require('./unifiedLearningFeedbackService');

const DEFAULT_BUFFER_MAX = 500;

function bufferMax() {
  const n = parseInt(process.env.UNIFIED_VALIDATION_BUFFER || String(DEFAULT_BUFFER_MAX), 10);
  if (!Number.isFinite(n) || n < 50) return DEFAULT_BUFFER_MAX;
  return Math.min(5000, n);
}

/** @type {Map<string, object[]>} */
const UNIFIED_VALIDATION_BUFFER = new Map();

function cidKey(companyId) {
  if (companyId == null || companyId === '') return '_global';
  return String(companyId).trim();
}

function pushBuffer(companyId, entry) {
  const k = cidKey(companyId);
  if (!UNIFIED_VALIDATION_BUFFER.has(k)) UNIFIED_VALIDATION_BUFFER.set(k, []);
  const buf = UNIFIED_VALIDATION_BUFFER.get(k);
  buf.push(entry);
  const cap = bufferMax();
  while (buf.length > cap) buf.shift();
}

function normMetaUnified(unifiedResult) {
  const u = unifiedResult && typeof unifiedResult === 'object' ? unifiedResult : {};
  const meta = u.meta && typeof u.meta === 'object' ? u.meta : {};
  const rawScore = meta.decision_score ?? meta.score ?? u.decision_score ?? u.score;
  const decision_score = Number(rawScore);
  const fallback_used = Boolean(
    meta.fallback_used === true ||
      meta.fallback === true ||
      u.fallback_used === true ||
      u.fallback === true
  );
  const pipeline =
    meta.pipeline_recommended != null
      ? String(meta.pipeline_recommended)
      : meta.pipeline != null
        ? String(meta.pipeline)
        : null;
  return {
    decision_score: Number.isFinite(decision_score) ? decision_score : null,
    fallback_used,
    pipeline
  };
}

function normFacade(facadeResult) {
  const f = facadeResult && typeof facadeResult === 'object' ? facadeResult : {};
  const md = f.metadata && typeof f.metadata === 'object' ? f.metadata : {};
  const used =
    md.used_fallback != null
      ? Boolean(md.used_fallback)
      : f.used_fallback != null
        ? Boolean(f.used_fallback)
        : null;
  return { used_fallback: used };
}

function severityTo01(sev) {
  const s = sev != null ? String(sev).toLowerCase() : 'low';
  if (s === 'high') return 0.9;
  if (s === 'medium') return 0.55;
  return 0.25;
}

function computeErrorConfidence({ decision_score, learning_bad_rate, degradationSeverity }) {
  const ds = Number.isFinite(decision_score) ? Math.min(1, Math.max(0, decision_score)) : 0.5;
  const lr = Number.isFinite(learning_bad_rate) ? Math.min(1, Math.max(0, learning_bad_rate)) : 0;
  const dg = severityTo01(degradationSeverity);
  return Math.round(((ds * 0.4 + lr * 0.35 + dg * 0.25) * 1000)) / 1000;
}

/**
 * @param {object} params
 * @param {string} [params.decisionId]
 * @param {string|null} [params.companyId]
 * @param {'good'|'neutral'|'bad'} [params.outcome]
 * @param {object} [params.row] — linha do learning buffer (fallback, latency, …)
 * @param {object} [params.unifiedResult]
 * @param {object} [params.facadeResult]
 * @param {object} [params.metrics]
 * @param {object} [params.validationContext] — { unifiedResult?, facadeResult?, metrics?, avg_latency_cognitive? }
 * @returns {Promise<object|null>}
 */
async function validateDecisionQuality({
  decisionId,
  companyId,
  outcome,
  row,
  unifiedResult,
  facadeResult,
  metrics: metricsParam,
  validationContext
} = {}) {
  if (process.env.UNIFIED_DECISION_VALIDATION !== 'true') {
    return null;
  }

  const ctx =
    validationContext && typeof validationContext === 'object' ? validationContext : {};
  const uRes = unifiedResult != null ? unifiedResult : ctx.unifiedResult;
  const fRes = facadeResult != null ? facadeResult : ctx.facadeResult;

  let metrics = metricsParam != null ? metricsParam : ctx.metrics;
  if (!metrics || typeof metrics !== 'object') {
    try {
      metrics = unifiedMetricsAggregatorService.getMetricsSnapshot(companyId);
    } catch (_e) {
      metrics = {};
    }
  }

  const um = normMetaUnified(uRes);
  const outcomeNorm =
    outcome != null
      ? String(outcome).toLowerCase()
      : row && row.outcome != null
        ? String(row.outcome).toLowerCase()
        : '';

  const rowFb = row && row.fallback === true;
  const decision_score =
    um.decision_score != null
      ? um.decision_score
      : Number.isFinite(Number(metrics.avg_score))
        ? Number(metrics.avg_score)
        : null;

  const fallback_used = um.fallback_used || rowFb;

  let degrad;
  try {
    degrad = unifiedDegradationService.detectDegradation(metrics, companyId);
  } catch (_d) {
    degrad = { severity: 'low', degraded: false };
  }

  let learning_bad_rate = 0;
  try {
    const ls = unifiedLearningFeedbackService.getLearningStats(companyId);
    learning_bad_rate = Number(ls.bad_rate) || 0;
  } catch (_l) {
    learning_bad_rate = 0;
  }

  const issue_types = [];

  if (outcomeNorm === 'bad' && decision_score != null && decision_score > 0.7) {
    issue_types.push('HIGH_CONFIDENCE_FAILURE');
  }

  if (fallback_used && decision_score != null && decision_score > 0.6) {
    issue_types.push('UNEXPECTED_FALLBACK');
  }

  const fac = normFacade(fRes);
  if (fRes && fac.used_fallback != null && um.fallback_used !== fac.used_fallback) {
    issue_types.push('FACADE_MISMATCH');
  }

  const latCog = Number(metrics.avg_latency?.cognitive);
  const latFlat = Number(metrics.avg_latency_cognitive);
  const fr = Number(metrics.fallback_rate);
  const perfLat =
    (Number.isFinite(latCog) && latCog > 3000) ||
    (Number.isFinite(latFlat) && latFlat > 3000) ||
    Number(ctx.avg_latency_cognitive) > 3000;
  const perfFr = Number.isFinite(fr) && fr > 0.3;
  if (perfLat || perfFr) {
    issue_types.push('PERFORMANCE_DEGRADATION');
  }

  if (!issue_types.length) {
    pushBuffer(companyId, {
      decisionId: decisionId != null ? String(decisionId) : null,
      ts: Date.now(),
      issue_types: [],
      skipped: false
    });
    return { issues: [] };
  }

  const error_confidence = computeErrorConfidence({
    decision_score: decision_score != null ? decision_score : 0.5,
    learning_bad_rate,
    degradationSeverity: degrad && degrad.severity ? degrad.severity : 'low'
  });

  for (const issue_type of issue_types) {
    try {
      console.warn(
        '[UNIFIED_DECISION_VALIDATION]',
        JSON.stringify({
          decisionId: decisionId != null ? String(decisionId) : null,
          companyId: companyId != null ? String(companyId) : null,
          issue_type,
          error_confidence,
          decision_score,
          outcome: outcomeNorm,
          pipeline: um.pipeline,
          fallback_used
        })
      );
    } catch (_log) {
      console.warn('[UNIFIED_DECISION_VALIDATION]', issue_type, decisionId);
    }
  }

  pushBuffer(companyId, {
    decisionId: decisionId != null ? String(decisionId) : null,
    ts: Date.now(),
    issue_types,
    error_confidence,
    decision_score,
    outcome: outcomeNorm
  });

  return { issues: issue_types, error_confidence };
}

/**
 * Invocação assíncrona sem await no chamador; erros engolidos.
 * @param {object} params
 */
function validateDecisionQualitySafe(params) {
  setImmediate(() => {
    Promise.resolve()
      .then(() => validateDecisionQuality(params))
      .catch((err) => {
        try {
          console.warn('[UNIFIED_DECISION_VALIDATION_FAIL]', err?.message ?? err);
        } catch (_e) {
          /* ignore */
        }
      });
  });
}

/**
 * @param {string|null|undefined} companyId
 * @returns {{
 *   error_rate: number,
 *   high_confidence_failure_rate: number,
 *   total_validated: number,
 *   issue_counts: Record<string, number>
 * }}
 */
function getValidationStats(companyId) {
  const buf = UNIFIED_VALIDATION_BUFFER.get(cidKey(companyId)) || [];
  const total_validated = buf.length;
  if (!total_validated) {
    return {
      error_rate: 0,
      high_confidence_failure_rate: 0,
      total_validated: 0,
      issue_counts: {}
    };
  }

  let with_issue = 0;
  let hcf = 0;
  const issue_counts = {};

  for (const e of buf) {
    const types = Array.isArray(e.issue_types) ? e.issue_types : [];
    if (types.length) with_issue += 1;
    for (const t of types) {
      issue_counts[t] = (issue_counts[t] || 0) + 1;
      if (t === 'HIGH_CONFIDENCE_FAILURE') hcf += 1;
    }
  }

  return {
    error_rate: Math.round((with_issue / total_validated) * 1000) / 1000,
    high_confidence_failure_rate: Math.round((hcf / total_validated) * 1000) / 1000,
    total_validated,
    issue_counts
  };
}

module.exports = {
  validateDecisionQuality,
  validateDecisionQualitySafe,
  getValidationStats,
  __test: { UNIFIED_VALIDATION_BUFFER, cidKey }
};
