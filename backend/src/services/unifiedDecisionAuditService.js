'use strict';

/**
 * Auditoria aditiva: Facade × Unified × Outcome (memória por processo).
 * UNIFIED_DECISION_AUDIT=true — registo e logs; sem efeitos externos.
 */

const MAX_AUDIT_BUFFER = Math.min(
  800,
  Math.max(50, parseInt(process.env.UNIFIED_AUDIT_BUFFER_SIZE || '500', 10))
);

/** @type {Map<string, object[]>} */
const auditBuffers = new Map();

function cidKey(companyId) {
  if (companyId == null || companyId === '') return '_global';
  return String(companyId).trim();
}

function getBuf(companyId) {
  const k = cidKey(companyId);
  if (!auditBuffers.has(k)) auditBuffers.set(k, []);
  return auditBuffers.get(k);
}

function decisionFingerprint(d) {
  if (!d || typeof d !== 'object') return 'null';
  try {
    return JSON.stringify({
      label: d.label,
      justification: d.justification,
      reason: d.reason,
      humanRisk: d.humanRisk,
      scores: d.scores && typeof d.scores === 'object' ? d.scores : {}
    });
  } catch (_e) {
    return 'error';
  }
}

function outcomeType(o) {
  if (!o || typeof o !== 'object') return null;
  const t = o.type != null ? String(o.type).toLowerCase() : '';
  if (t === 'bad' || t === 'good' || t === 'neutral') return t;
  const ot = o.outcome != null ? String(o.outcome).toLowerCase() : '';
  if (ot === 'bad' || ot === 'good' || ot === 'neutral') return ot;
  return null;
}

/**
 * @param {string|null|undefined} companyId
 * @param {object} rec
 */
function upsertAuditRecord(companyId, rec) {
  const buf = getBuf(companyId);
  const id = rec.unified_decision_id;
  const fromFacade = !!rec.from_facade;

  if (!id) {
    buf.push(rec);
    while (buf.length > MAX_AUDIT_BUFFER) buf.shift();
    return;
  }

  if (fromFacade) {
    const weakIdx = buf.findIndex((r) => r.unified_decision_id === id && !r.from_facade);
    if (weakIdx >= 0) buf.splice(weakIdx, 1);
    const sameIdx = buf.findIndex((r) => r.unified_decision_id === id && r.from_facade);
    if (sameIdx >= 0) buf[sameIdx] = rec;
    else buf.push(rec);
  } else {
    const hasFacade = buf.some((r) => r.unified_decision_id === id && r.from_facade);
    if (hasFacade) {
      return;
    }
    const uniIdx = buf.findIndex((r) => r.unified_decision_id === id && !r.from_facade);
    if (uniIdx >= 0) buf[uniIdx] = rec;
    else buf.push(rec);
  }

  while (buf.length > MAX_AUDIT_BUFFER) buf.shift();
}

/**
 * @param {object} params
 * @param {object|null} [params.facadeResult]
 * @param {object|null} [params.unifiedResult]
 * @param {object|null} [params.outcome]
 * @param {object|null} [params.context]
 */
async function auditDecision({ facadeResult, unifiedResult, outcome, context }) {
  const empty = {
    audit_ok: true,
    issues: {
      decisionMismatch: false,
      badHighScore: false,
      fallbackMismatch: false,
      escalationMismatch: false
    },
    severity: 'normal',
    skipped: true
  };

  if (process.env.UNIFIED_DECISION_AUDIT !== 'true') {
    return empty;
  }

  try {
    const ur = unifiedResult && typeof unifiedResult === 'object' ? unifiedResult : null;
    if (!ur || ur.skipped || ur.ok === false) {
      return { ...empty, skipped: true, reason: 'unified_skipped_or_failed' };
    }

    const fr = facadeResult && typeof facadeResult === 'object' ? facadeResult : null;
    const fd = fr?.decision;
    const ud = ur?.decision;

    const decisionMismatch = !!(
      fr &&
      fd != null &&
      ud != null &&
      decisionFingerprint(fd) !== decisionFingerprint(ud)
    );

    const score = Number(ur.meta?.decision_score);
    const ot = outcomeType(outcome);
    const badHighScore =
      Number.isFinite(score) && score > 0.7 && ot === 'bad';

    const umFb = !!(ur.meta?.fallback_used ?? ur.fallback_used);
    const ffFb = fr?.metadata ? !!fr.metadata.used_fallback : null;
    const fallbackMismatch = !!(fr && ffFb !== null && ffFb !== umFb);

    const umEsc = !!(ur.meta && ur.meta.cognitive_escalation);
    const ffEsc = fr?.metadata != null ? !!fr.metadata.cognitive_escalation : null;
    const escalationMismatch = !!(fr && ffEsc !== null && ffEsc !== umEsc);

    const audit_ok =
      !decisionMismatch && !badHighScore && !fallbackMismatch && !escalationMismatch;

    let severity = 'normal';
    if (badHighScore) severity = 'high';
    else if (!audit_ok) severity = 'medium';

    const companyId =
      context && context.company_id != null
        ? context.company_id
        : context && context.companyId != null
          ? context.companyId
          : null;

    const entry = {
      ts: Date.now(),
      unified_decision_id:
        ur.meta && ur.meta.unified_decision_id != null ? String(ur.meta.unified_decision_id) : null,
      from_facade: !!fr,
      audit_ok,
      issues: {
        decisionMismatch,
        badHighScore,
        fallbackMismatch,
        escalationMismatch
      },
      severity,
      score: Number.isFinite(score) ? score : null,
      outcome_type: ot,
      source: context && context.source != null ? String(context.source) : 'unknown'
    };

    upsertAuditRecord(companyId, entry);

    const logRow = {
      company_key: cidKey(companyId),
      ...entry.issues,
      audit_ok,
      severity,
      score: entry.score,
      from_facade: entry.from_facade
    };

    try {
      if (!audit_ok || badHighScore) {
        console.warn('[UNIFIED_DECISION_AUDIT]', JSON.stringify(logRow));
      } else {
        console.info('[UNIFIED_DECISION_AUDIT]', JSON.stringify(logRow));
      }
      if (badHighScore || severity === 'high' || (decisionMismatch && fr)) {
        console.warn('[UNIFIED_DECISION_AUDIT_ALERT]', JSON.stringify(logRow));
      }
    } catch (_e) {}

    return {
      audit_ok,
      issues: entry.issues,
      severity
    };
  } catch (e) {
    try {
      console.warn('[UNIFIED_DECISION_AUDIT_FAIL]', e?.message || e);
    } catch (_e2) {}
    return { ...empty, skipped: true, error: String(e && e.message ? e.message : e) };
  }
}

/**
 * Quando o outcome chega depois (learning), reavalia bad_high_score no último registo.
 * @param {string} decisionId
 * @param {string|null|undefined} companyId
 * @param {{ outcome?: string, outcome_type?: string|null }} row
 */
function applyOutcomeToAudit(decisionId, companyId, row) {
  if (process.env.UNIFIED_DECISION_AUDIT !== 'true') return;
  if (!decisionId) return;

  const buf = getBuf(companyId);
  const id = String(decisionId);
  let target = null;
  for (let i = buf.length - 1; i >= 0; i--) {
    if (buf[i].unified_decision_id === id) {
      target = buf[i];
      break;
    }
  }
  if (!target) return;

  const o = row && typeof row === 'object' ? row : {};
  const inferred =
    o.outcome != null
      ? String(o.outcome).toLowerCase()
      : o.outcome_type === 'failure'
        ? 'bad'
        : o.outcome_type === 'success'
          ? 'good'
          : 'neutral';

  target.outcome_inferred = inferred;
  const score = target.score != null ? Number(target.score) : NaN;
  const badHighScore = Number.isFinite(score) && score > 0.7 && inferred === 'bad';
  target.bad_high_score_outcome = badHighScore;
  if (badHighScore) {
    target.audit_ok = false;
    target.severity = 'high';
    try {
      console.warn(
        '[UNIFIED_DECISION_AUDIT_ALERT]',
        JSON.stringify({
          reason: 'late_outcome_bad_high_score',
          unified_decision_id: id,
          company_key: cidKey(companyId),
          score,
          outcome: inferred
        })
      );
    } catch (_e) {}
  }
}

/**
 * @param {string|null|undefined} companyId
 * @param {number} [limit]
 */
function getRecentAudits(companyId, limit = 100) {
  const buf = getBuf(companyId);
  const n = Math.max(1, Math.min(limit || 100, MAX_AUDIT_BUFFER));
  return buf.slice(-n);
}

module.exports = {
  auditDecision,
  applyOutcomeToAudit,
  getRecentAudits,
  decisionFingerprint,
  __test: { auditBuffers, MAX_AUDIT_BUFFER, cidKey }
};
