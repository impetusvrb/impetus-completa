'use strict';

/**
 * Buffer de outcomes de decisões unificadas por empresa — memória só de processo (reversível).
 * Fecha o loop aprendizado → ajuste futuro de pesos no motor unificado.
 */

const crypto = require('crypto');

const MAX_PER_COMPANY = Math.min(
  600,
  Math.max(100, parseInt(process.env.UNIFIED_LEARNING_BUFFER_SIZE || '400', 10))
);

const BAD_LAT = Math.max(
  3000,
  parseInt(process.env.UNIFIED_LEARNING_BAD_LATENCY_MS || '9000', 10)
);
const NEU_LAT = Math.max(2000, Math.floor(BAD_LAT * 0.55));

/** @type {Map<string, object[]>} */
const buffers = new Map();

function cidKey(companyId) {
  if (companyId == null || companyId === '') return '_global';
  return String(companyId).trim();
}

function getBuf(companyId) {
  const k = cidKey(companyId);
  if (!buffers.has(k)) buffers.set(k, []);
  return buffers.get(k);
}

/**
 * @param {{ fallback?: boolean, latency?: number, outcome?: string, outcome_type?: string }} p
 * @returns {'good'|'neutral'|'bad'}
 */
function inferOutcome(p) {
  const ot = p.outcome_type != null ? String(p.outcome_type).toLowerCase() : '';
  if (ot === 'success' || ot === 'failure' || ot === 'neutral') {
    if (ot === 'success') return 'good';
    if (ot === 'failure') return 'bad';
    return 'neutral';
  }
  const o = p.outcome != null ? String(p.outcome).toLowerCase() : '';
  if (o === 'good' || o === 'neutral' || o === 'bad') return o;
  if (p.fallback === true) return 'bad';
  const lat = Number(p.latency);
  if (Number.isFinite(lat)) {
    if (lat >= BAD_LAT) return 'bad';
    if (lat >= NEU_LAT) return 'neutral';
  }
  return 'good';
}

/**
 * @param {object} payload
 * @param {string} [payload.decisionId]
 * @param {string|null} [payload.companyId]
 * @param {'good'|'neutral'|'bad'} [payload.outcome]
 * @param {'success'|'failure'|'neutral'} [payload.outcome_type]
 * @param {string} [payload.source] — ex.: real_world, heuristic
 * @param {number} [payload.latency]
 * @param {boolean} [payload.fallback]
 */
function recordDecisionOutcome(payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  let decisionId = p.decisionId != null ? String(p.decisionId) : '';
  if (!decisionId) {
    try {
      decisionId = crypto.randomUUID();
    } catch (_e) {
      decisionId = `ud_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
  }
  const companyId = p.companyId != null ? p.companyId : null;
  const outcome = inferOutcome({
    outcome: p.outcome,
    outcome_type: p.outcome_type,
    fallback: p.fallback,
    latency: p.latency
  });
  const sourceTag = p.source != null ? String(p.source) : 'heuristic';
  const row = {
    decisionId,
    outcome,
    outcome_type: p.outcome_type != null ? String(p.outcome_type) : null,
    source: sourceTag,
    latency: Number(p.latency) || 0,
    fallback: !!p.fallback,
    ts: Date.now()
  };
  const buf = getBuf(companyId);
  buf.push(row);
  while (buf.length > MAX_PER_COMPANY) buf.shift();

  try {
    console.info(
      '[UNIFIED_LEARNING_UPDATE]',
      JSON.stringify({
        decisionId,
        company_id: companyId,
        outcome,
        source: sourceTag,
        latency_ms: row.latency,
        fallback: row.fallback
      })
    );
  } catch (_e) {
    console.info('[UNIFIED_LEARNING_UPDATE]', row);
  }

  return { decisionId, outcome: row.outcome };
}

/**
 * @param {string|null|undefined} companyId
 * @returns {{ good_rate: number, bad_rate: number, neutral_rate: number, n: number }}
 */
function getLearningStats(companyId) {
  const buf = getBuf(companyId);
  const n = buf.length;
  if (!n) {
    return { good_rate: 0, bad_rate: 0, neutral_rate: 0, n: 0 };
  }
  let g = 0;
  let b = 0;
  let u = 0;
  for (const r of buf) {
    if (r.outcome === 'bad') b += 1;
    else if (r.outcome === 'neutral') u += 1;
    else g += 1;
  }
  return {
    good_rate: Math.round((g / n) * 1000) / 1000,
    bad_rate: Math.round((b / n) * 1000) / 1000,
    neutral_rate: Math.round((u / n) * 1000) / 1000,
    n
  };
}

module.exports = {
  recordDecisionOutcome,
  getLearningStats,
  inferOutcome,
  __test: { buffers, cidKey, MAX_PER_COMPANY }
};
