'use strict';

/**
 * CERT-04 — Seed do primeiro IOE para fechar gate P0E (PIPELINE_ENABLED_AWAITING_FIRST_IOE).
 * Uso: node scripts/audit/seed_first_ioe_cert04.js [--company-id UUID]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { v4: uuidv4 } = require('uuid');
const db = require('../../src/db');

const DEFAULT_COMPANY =
  process.env.IMPETUS_INDUSTRIAL_BACKBONE_PILOT_TENANTS?.split(',')[0]?.trim() ||
  '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';

function parseCompanyId() {
  const idx = process.argv.indexOf('--company-id');
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1].trim();
  return DEFAULT_COMPANY;
}

async function main() {
  const companyId = parseCompanyId();
  const force = process.argv.includes('--force');
  const ioeId = uuidv4();
  const eqId = uuidv4();
  const idemKey = force
    ? `cert04:force-ioe:${companyId}:${Date.now()}`
    : `cert04:first-ioe:${companyId}`;
  const corrId = `cert04-corr-${Date.now()}`;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [companyId]);
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);

    if (!force) {
      const recent = await client.query(
        `SELECT COUNT(*)::int AS cnt FROM industrial_operational_events
         WHERE company_id = $1::uuid AND created_at > NOW() - INTERVAL '1 hour'`,
        [companyId]
      );
      if ((recent.rows[0]?.cnt ?? 0) > 0) {
        console.log(
          JSON.stringify({ ok: true, skipped: true, reason: 'RECENT_IOE_EXISTS', company_id: companyId })
        );
        await client.query('ROLLBACK');
        return;
      }
    }

    await client.query(
      `INSERT INTO industrial_operational_events (
         id, company_id, tenant_key, idempotency_key, correlation_id,
         source_type, category, status, truth_state, priority_band, priority_score,
         scores_provisional, entity_type, entity_id, equipment_id,
         audience_key, escalation_level, visibility_scope, evidence_refs, aioi_version
       ) VALUES (
         $1::uuid, $2::uuid, $2::text, $3, $4,
         'manual', 'system_event', 'open', 'grounded', 'low', 5,
         false, 'equipment', $5::uuid, $5::uuid,
         'operational', 0, 'company', '[]'::jsonb, '0.2.0'
       ) ON CONFLICT (company_id, idempotency_key) DO NOTHING
       RETURNING id, created_at`,
      [ioeId, companyId, idemKey, corrId, eqId]
    );

    await client.query('COMMIT');
    console.log(
      JSON.stringify({
        ok: true,
        seeded: true,
        company_id: companyId,
        ioe_id: ioeId,
        idempotency_key: idemKey
      })
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(JSON.stringify({ ok: false, error: err.message }));
    process.exitCode = 1;
  } finally {
    client.release();
    try {
      await db.pool.end();
    } catch {
      /* ignore */
    }
  }
}

main();
