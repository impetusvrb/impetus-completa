'use strict';

const db = require('../db');

async function insertDecisionLog(row) {
  const q = `
    INSERT INTO ai_decision_logs (
      trace_id, company_id, user_id, pipeline_version, module, intent, risk_level,
      models_used, dossier_summary, stages_detail, final_output, explanation_layer,
      confidence, requires_human_validation, requires_cross_validation, degraded_mode, duration_ms
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14,$15,$16,$17
    )
    RETURNING id
  `;
  const params = [
    row.trace_id,
    row.company_id,
    row.user_id,
    row.pipeline_version,
    row.module || null,
    row.intent || null,
    row.risk_level || null,
    row.models_used || [],
    JSON.stringify(row.dossier_summary || {}),
    JSON.stringify(row.stages_detail || {}),
    JSON.stringify(row.final_output || {}),
    JSON.stringify(row.explanation_layer || {}),
    row.confidence != null ? row.confidence : null,
    row.requires_human_validation !== false,
    !!row.requires_cross_validation,
    !!row.degraded_mode,
    row.duration_ms != null ? row.duration_ms : null
  ];
  const r = await db.query(q, params);
  return r.rows[0]?.id;
}

async function insertHitlFeedback(row) {
  const q = `
    INSERT INTO cognitive_hitl_feedback (trace_id, user_id, action, comment, adjusted_answer, metadata)
    VALUES ($1,$2,$3,$4,$5,$6::jsonb)
    RETURNING id
  `;
  const params = [
    row.trace_id,
    row.user_id,
    row.action,
    row.comment || null,
    row.adjusted_answer || null,
    JSON.stringify(row.metadata || {})
  ];
  const r = await db.query(q, params);
  return r.rows[0]?.id;
}

async function getTraceForCompany(traceId, companyId) {
  const r = await db.query(
    `SELECT trace_id, company_id, user_id, final_output, dossier_summary, stages_detail, created_at
     FROM ai_decision_logs WHERE trace_id = $1 AND company_id = $2`,
    [traceId, companyId]
  );
  return r.rows[0] || null;
}

module.exports = {
  insertDecisionLog,
  insertHitlFeedback,
  getTraceForCompany
};
