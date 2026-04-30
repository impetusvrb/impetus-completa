'use strict';

/**
 * Registo leve de impacto estimado pós-avaliação ODE (somente leitura upstream).
 * Alimenta o loop de aprendizado sem executar ações operacionais.
 */

const MAX_EVENTS = Math.min(
  400,
  Math.max(80, parseInt(process.env.UNIFIED_OPERATIONAL_FEEDBACK_BUFFER || '200', 10))
);

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

function normImpact(level) {
  const s = level != null ? String(level).toLowerCase() : '';
  if (s === 'high' || s === 'medium' || s === 'low') return s;
  return 'low';
}

/**
 * @param {object} payload
 * @param {string} payload.decisionId
 * @param {'low'|'medium'|'high'} payload.impactLevel
 * @param {string|null} [payload.companyId]
 */
function recordOperationalOutcome(payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  const decisionId = p.decisionId != null ? String(p.decisionId) : '';
  const impactLevel = normImpact(p.impactLevel);
  const companyId = p.companyId != null ? p.companyId : null;
  if (!decisionId) return { ok: false, reason: 'missing_decision_id' };

  const row = {
    decisionId,
    impactLevel,
    ts: Date.now()
  };
  const buf = getBuf(companyId);
  buf.push(row);
  while (buf.length > MAX_EVENTS) buf.shift();

  try {
    console.info(
      '[UNIFIED_OPERATIONAL_FEEDBACK]',
      JSON.stringify({
        decisionId,
        company_id: companyId,
        impact_level: impactLevel
      })
    );
  } catch (_e) {
    console.info('[UNIFIED_OPERATIONAL_FEEDBACK]', row);
  }

  return { ok: true, ...row };
}

/**
 * Partilhas recentes de impacto alto (stress operacional inferido).
 * @param {string|null|undefined} companyId
 */
function getOperationalImpactStats(companyId) {
  const buf = getBuf(companyId);
  const n = buf.length;
  if (!n) {
    return { high_rate: 0, medium_rate: 0, low_rate: 0, n: 0 };
  }
  let h = 0;
  let m = 0;
  let l = 0;
  for (const r of buf) {
    if (r.impactLevel === 'high') h += 1;
    else if (r.impactLevel === 'medium') m += 1;
    else l += 1;
  }
  return {
    high_rate: Math.round((h / n) * 1000) / 1000,
    medium_rate: Math.round((m / n) * 1000) / 1000,
    low_rate: Math.round((l / n) * 1000) / 1000,
    n
  };
}

module.exports = {
  recordOperationalOutcome,
  getOperationalImpactStats,
  __test: { buffers, cidKey }
};
