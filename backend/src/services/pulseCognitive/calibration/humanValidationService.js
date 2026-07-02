/**
 * CERT-PULSE-04 FASE 10 — Validação Human-in-the-Loop (não altera pesos).
 */
'use strict';

const db = require('../../../db');
const calObs = require('./calibrationObservability');

const VALID_STATUSES = ['confirmed', 'partial', 'rejected'];

async function validationsTableReady() {
  try {
    await db.query(`SELECT 1 FROM pulse_cognitive_insight_validation LIMIT 1`);
    return true;
  } catch (_) {
    return false;
  }
}

async function submitInsightValidation(companyId, validatorUserId, insightId, body = {}) {
  const status = String(body.validation_status || '').toLowerCase();
  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: 'validation_status inválido (confirmed|partial|rejected)' };
  }

  const ready = await validationsTableReady();
  if (!ready) {
    return {
      ok: false,
      migration_required: true,
      message: 'Execute backend/src/models/pulse_cognitive_cert04_migration.sql'
    };
  }

  try {
    const ins = await db.query(
      `SELECT id FROM pulse_cognitive_insights WHERE id = $1 AND company_id = $2`,
      [insightId, companyId]
    );
    if (!ins.rows?.length) return { ok: false, error: 'Insight não encontrado' };

    const r = await db.query(
      `
      INSERT INTO pulse_cognitive_insight_validation (
        company_id, insight_id, validator_user_id, validation_status, notes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [companyId, insightId, validatorUserId, status, body.notes || null]
    );

    if (status === 'confirmed') calObs.recordConfirmedInsight();
    else if (status === 'rejected') calObs.recordRejectedInsight();
    calObs.recordHumanValidation();

    return {
      ok: true,
      validation: r.rows[0],
      governance: {
        assistive_only: true,
        weights_not_modified: true,
        purpose: 'quality_metrics_only'
      }
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

async function listInsightValidations(companyId, limit = 50) {
  const ready = await validationsTableReady();
  if (!ready) return { ok: true, validations: [], migration_required: true };

  try {
    const r = await db.query(
      `
      SELECT v.*, i.title AS insight_title, u.name AS validator_name
      FROM pulse_cognitive_insight_validation v
      JOIN pulse_cognitive_insights i ON i.id = v.insight_id
      LEFT JOIN users u ON u.id = v.validator_user_id
      WHERE v.company_id = $1
      ORDER BY v.created_at DESC LIMIT $2
    `,
      [companyId, limit]
    );
    return { ok: true, validations: r.rows || [] };
  } catch (_) {
    return { ok: true, validations: [] };
  }
}

module.exports = { submitInsightValidation, listInsightValidations, VALID_STATUSES };
