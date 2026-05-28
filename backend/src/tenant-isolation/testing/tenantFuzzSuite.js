'use strict';

const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const db = require('../../db');
const rls = require('../runtime/tenantRlsRuntime');
const gov = require('../governance/tenantRlsGovernanceService');
const flags = require('../config/tenantRlsFlags');

// Non-superuser pool for RLS enforcement testing.
// PostgreSQL bypasses RLS for superusers even with FORCE ROW LEVEL SECURITY.
function _getAppPool() {
  const appUser = process.env.DB_APP_USER || process.env.DB_USER;
  const appPwd = process.env.DB_APP_PASSWORD || process.env.DB_PASSWORD;
  return new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || process.env.DB_DATABASE,
    user: appUser,
    password: appPwd,
    max: 3,
  });
}

async function _queryWithTenantContextAsAppRole(tenantId, text, params) {
  const pool = _getAppPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(tenantId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);
    const result = await client.query(text, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    pool.end().catch(() => {});
  }
}

async function recordFuzz(traceId, event, outcome, meta = {}) {
  try {
    await db.query(
      `INSERT INTO tenant_rls_audit_events
       (trace_id, event, outcome, table_name, tenant_expected, tenant_attempted, metadata)
       VALUES ($1, $2, $3, $4, $5::uuid, $6::uuid, $7::jsonb)`,
      [
        traceId,
        event,
        outcome,
        meta.table_name || null,
        meta.tenant_expected || null,
        meta.tenant_attempted || null,
        JSON.stringify(meta),
      ]
    );
  } catch { /* non-blocking */ }
}

async function fuzzTableIsolation(tableName, tenantColumn, tenantA, tenantB, traceId) {
  if (!(await rls.listRegistry()).find((r) => r.table_name === tableName)) {
    return { skipped: true, reason: 'not_in_registry' };
  }

  const exists = await db.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1) AS ok`,
    [tableName]
  );
  if (!exists.rows[0]?.ok) return { skipped: true, reason: 'table_missing' };

  let countA = 0;
  try {
    const bypass = await rls.queryBypass(
      `SELECT COUNT(*)::int AS cnt FROM ${tableName} WHERE ${tenantColumn} = $1::uuid`,
      [tenantA]
    );
    countA = bypass.rows[0]?.cnt || 0;
  } catch (err) {
    return { skipped: true, reason: err.message };
  }

  if (countA === 0) {
    return { skipped: true, reason: 'no_seed_data_tenant_a' };
  }

  const mode = flags.rlsMode();
  let leaked = 0;

  if (gov.shouldEnforceRls(mode)) {
    // Use a non-superuser pool so FORCE ROW LEVEL SECURITY is effective.
    // PostgreSQL always bypasses RLS for superusers regardless of FORCE RLS.
    const scoped = await _queryWithTenantContextAsAppRole(
      tenantB,
      `SELECT COUNT(*)::int AS cnt FROM ${tableName} WHERE ${tenantColumn} = $1::uuid`,
      [tenantA]
    );
    leaked = scoped.rows[0]?.cnt || 0;
  } else {
    return {
      table: tableName,
      mode,
      skipped: true,
      reason: 'audit_mode_rls_not_enforced',
      note: 'Use POST /tenant-rls/chaos for cross-tenant simulation',
    };
  }

  const passed = leaked === 0;
  await recordFuzz(traceId, 'fuzz_rls_isolation', passed ? 'ok' : 'LEAK', {
    table_name: tableName,
    tenant_expected: tenantB,
    tenant_attempted: tenantA,
    rows: leaked,
  });

  return { table: tableName, passed, rows_leaked: leaked, count_a: countA };
}

async function runFullSuite(options = {}) {
  const traceId = options.trace_id || uuidv4();
  const tenantA = options.tenant_a || flags.rlsPilotTenants()[0];
  const tenantB = options.tenant_b || '00000000-0000-4000-8000-000000000099';

  if (!tenantA) {
    return { ok: false, error: 'NO_PILOT_TENANT' };
  }

  const registry = await rls.listRegistry();
  const results = [];

  for (const row of registry) {
    const r = await fuzzTableIsolation(
      row.table_name,
      row.tenant_column,
      tenantA,
      tenantB,
      traceId
    );
    results.push(r);
  }

  const tested = results.filter((r) => !r.skipped);
  const passed = tested.filter((r) => r.passed !== false && !r.app_would_leak);
  const failed = tested.filter((r) => r.passed === false || r.app_would_leak);

  return {
    ok: failed.length === 0,
    trace_id: traceId,
    mode: flags.rlsMode(),
    summary: {
      total: results.length,
      tested: tested.length,
      passed: passed.length,
      failed: failed.length,
      skipped: results.length - tested.length,
    },
    results,
  };
}

module.exports = { runFullSuite, fuzzTableIsolation, recordFuzz };
