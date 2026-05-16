'use strict';

/**
 * WAVE 3 — planeamento de compressão (sem ALTER em tabelas legadas).
 */

const PLANNED = Object.freeze([
  { logical_name: 'telemetry_v1', tier_code: 'warm', method: 'timescale_compression', segment_by: 'company_id', order_by: 'recorded_at DESC' },
  { logical_name: 'industrial_telemetry_samples', tier_code: 'warm', method: 'timescale_compression', segment_by: 'company_id,domain', order_by: 'recorded_at DESC' },
  { logical_name: 'ai_decision_audit', tier_code: 'cold', method: 'external_archive_only', segment_by: null, order_by: 'created_at DESC', notes: 'Imutável — nunca comprimir in-place' },
  { logical_name: 'system_metrics_legacy', tier_code: 'warm', method: 'postgres_brin_optional', segment_by: 'metric_key', order_by: 'created_at DESC' }
]);

async function listPlans() {
  try {
    const db = require('../db');
    const r = await db.query(
      `SELECT logical_name, tier_code, method, segment_by, order_by, status, notes
       FROM impetus_compression_plan ORDER BY logical_name`
    );
    if (r.rows && r.rows.length) return { plans: r.rows, source: 'database' };
  } catch (_e) {}

  return { plans: PLANNED.map((p) => Object.assign({ status: 'planned' }, p)), source: 'builtin' };
}

async function seedPlansIfEmpty() {
  try {
    const db = require('../db');
    const c = await db.query(`SELECT COUNT(*)::int AS n FROM impetus_compression_plan`);
    if (c.rows && c.rows[0] && c.rows[0].n > 0) return { seeded: false };
    for (const p of PLANNED) {
      await db.query(
        `INSERT INTO impetus_compression_plan (logical_name, tier_code, method, segment_by, order_by, status, notes)
         SELECT $1, $2, $3, $4, $5, 'planned', $6
         WHERE NOT EXISTS (SELECT 1 FROM impetus_compression_plan WHERE logical_name = $1 AND tier_code = $2)`,
        [p.logical_name, p.tier_code, p.method, p.segment_by, p.order_by, p.notes || null]
      );
    }
    return { seeded: true, count: PLANNED.length };
  } catch (_e) {
    return { seeded: false };
  }
}

module.exports = {
  PLANNED,
  listPlans,
  seedPlansIfEmpty
};
