'use strict';

const db = require('../../db');
const flags = require('../config/tenantRlsFlags');
const gov = require('../governance/tenantRlsGovernanceService');

const POLICY_SUFFIX = '_impetus_tenant_isolation';

async function ensureRegistrySchema() {
  const fs = require('fs');
  const path = require('path');
  const sql = fs.readFileSync(
    path.join(__dirname, '../../models/enterprise_rls_migration.sql'),
    'utf8'
  );
  await db.query(sql);
  return { ok: true };
}

async function listRegistry() {
  const r = await db.query(
    'SELECT * FROM tenant_rls_registry ORDER BY table_name'
  );
  return r.rows;
}

async function _tableExists(tableName) {
  const r = await db.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS ok`,
    [tableName]
  );
  return r.rows[0]?.ok === true;
}

async function _columnExists(tableName, columnName) {
  const r = await db.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     ) AS ok`,
    [tableName, columnName]
  );
  return r.rows[0]?.ok === true;
}

async function applyPolicyForTable(tableName, tenantColumn) {
  if (!(await _tableExists(tableName))) {
    return { ok: false, reason: 'table_missing' };
  }
  if (!(await _columnExists(tableName, tenantColumn))) {
    return { ok: false, reason: 'column_missing', tenantColumn };
  }

  const policyName = `${tableName}${POLICY_SUFFIX}`;
  await db.query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
  await db.query(`ALTER TABLE ${tableName} FORCE ROW LEVEL SECURITY`);
  await db.query(`DROP POLICY IF EXISTS ${policyName} ON ${tableName}`);
  await db.query(`
    CREATE POLICY ${policyName} ON ${tableName}
    FOR ALL
    USING (impetus_tenant_row_visible(${tenantColumn}))
    WITH CHECK (impetus_tenant_row_visible(${tenantColumn}))
  `);

  await db.query(
    `UPDATE tenant_rls_registry SET policy_applied = true, enabled = true, updated_at = now()
     WHERE table_name = $1`,
    [tableName]
  );

  return { ok: true, policy: policyName };
}

async function disableRlsForTable(tableName) {
  if (!(await _tableExists(tableName))) return { ok: false };
  const policyName = `${tableName}${POLICY_SUFFIX}`;
  await db.query(`DROP POLICY IF EXISTS ${policyName} ON ${tableName}`);
  await db.query(`ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY`);
  await db.query(
    `UPDATE tenant_rls_registry SET policy_applied = false, enabled = false, updated_at = now()
     WHERE table_name = $1`,
    [tableName]
  );
  return { ok: true };
}

async function activateRlsPolicies(mode) {
  if (!gov.shouldEnforceRls(mode)) {
    return { activated: false, reason: `mode_${mode}` };
  }

  const registry = await listRegistry();
  const results = [];
  for (const row of registry) {
    const r = await applyPolicyForTable(row.table_name, row.tenant_column);
    results.push({ table: row.table_name, ...r });
  }
  return { activated: true, results };
}

async function deactivateAllPolicies() {
  const registry = await listRegistry();
  const results = [];
  for (const row of registry) {
    results.push({ table: row.table_name, ...(await disableRlsForTable(row.table_name)) });
  }
  return { deactivated: true, results };
}

async function queryWithTenantContext(companyId, text, params) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);
    const result = await client.query(text, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function queryBypass(text, params) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);
    const result = await client.query(text, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function emitBootAudit() {
  if (!flags.isRlsEnabled()) return { emitted: false };
  const diag = gov.getDiagnostics();
  const registry = await listRegistry();
  try {
    await db.query(
      `INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
       VALUES ('tenant_rls_boot', 'tenant_isolation', $1, 'system:tenant_rls', NOW(), NULL)`,
      [JSON.stringify({ ...diag, registry_count: registry.length })]
    );
    return { emitted: true };
  } catch (err) {
    return { emitted: false, error: err?.message };
  }
}

async function boot() {
  const schema = await ensureRegistrySchema();
  const mode = flags.rlsMode();
  let activation = { skipped: true };

  if (mode === 'on') {
    activation = await activateRlsPolicies('on');
  } else if (mode === 'off') {
    await deactivateAllPolicies();
  }

  return { schema, mode, activation };
}

module.exports = {
  ensureRegistrySchema,
  listRegistry,
  applyPolicyForTable,
  disableRlsForTable,
  activateRlsPolicies,
  deactivateAllPolicies,
  queryWithTenantContext,
  queryBypass,
  emitBootAudit,
  boot,
};
