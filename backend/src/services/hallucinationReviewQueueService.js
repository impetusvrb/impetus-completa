'use strict';

/**
 * Human review queue for low-confidence / flagged hallucination assessments.
 * Does NOT mutate ai_interaction_traces by default (additive queue in assessments table).
 */

const db = require('../db');

function _log(event, data) {
  try {
    console.info('[HALLUCINATION_REVIEW_QUEUE]', JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
  } catch { /* noop */ }
}

async function enqueueForReview(assessment, traceRow) {
  if (!assessment?.requires_human_review) return { enqueued: false };

  _log('enqueued', {
    trace_id: assessment.trace_id,
    company_id: assessment.company_id,
    severity: assessment.severity,
    confidence: assessment.confidence_score,
  });

  return { enqueued: true, trace_id: assessment.trace_id };
}

async function listReviewQueue(companyId, opts = {}) {
  const limit = Math.min(200, Math.max(1, parseInt(opts.limit, 10) || 50));
  try {
    const r = await db.query(
      `SELECT h.*, t.module_name AS trace_module, t.created_at AS trace_created_at,
              t.human_validation_status
       FROM ai_hallucination_assessments h
       LEFT JOIN ai_interaction_traces t ON t.trace_id = h.trace_id AND t.company_id = h.company_id
       WHERE h.company_id = $1
         AND h.requires_human_review = true
         AND h.false_positive_marked = false
       ORDER BY h.created_at DESC
       LIMIT $2`,
      [companyId, limit]
    );
    return { items: r.rows, count: r.rows.length };
  } catch (err) {
    if (err.code === '42P01') return { items: [], count: 0, table_missing: true };
    throw err;
  }
}

async function markFalsePositive(traceId, companyId, opts = {}) {
  try {
    const r = await db.query(
      `UPDATE ai_hallucination_assessments
       SET false_positive_marked = true,
           requires_human_review = false,
           governance_metadata = governance_metadata || $3::jsonb
       WHERE trace_id = $1 AND company_id = $2
       RETURNING trace_id`,
      [
        traceId,
        companyId,
        JSON.stringify({
          false_positive_at: new Date().toISOString(),
          marked_by: opts.user_id || 'admin',
          reason: opts.reason || null,
        }),
      ]
    );
    if (r.rowCount === 0) return { ok: false, reason: 'not_found' };

    try {
      const metrics = require('./hallucinationMetricsService');
      metrics.recordFalsePositive();
    } catch { /* noop */ }

    _log('false_positive_marked', { trace_id: traceId, company_id: companyId });
    return { ok: true, trace_id: traceId };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

module.exports = {
  enqueueForReview,
  listReviewQueue,
  markFalsePositive,
};
