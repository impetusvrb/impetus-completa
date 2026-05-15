/**
 * Smoke: governança tenant_admins (Fase 1)
 * node src/tests/tenantAdminGovernanceSmoke.js
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });

const svc = require('../services/tenantAdminService');
const db = require('../db');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  assert(svc.ADMIN_TYPES.includes('primary'), 'ADMIN_TYPES primary');
  assert(svc.ADMIN_TYPES.includes('recovery'), 'ADMIN_TYPES recovery');

  const dbUrl = (process.env.DATABASE_URL || '').trim();
  if (!dbUrl) {
    console.log('[TENANT_ADMIN_SMOKE] skip DB tests (DATABASE_URL vazio)');
    console.log('[TENANT_ADMIN_SMOKE] ok (sanity only)');
    return;
  }

  const t = await db.query(`SELECT to_regclass('public.tenant_admins') AS reg`);
  if (!t.rows[0].reg) {
    console.log('[TENANT_ADMIN_SMOKE] skip: execute migrations/tenant_admins_migration.sql primeiro');
    console.log('[TENANT_ADMIN_SMOKE] ok (sanity only)');
    return;
  }

  const companies = await db.query('SELECT id FROM companies WHERE active = true LIMIT 3');
  for (const row of companies.rows) {
    await svc.runBootstrapForCompany(row.id);
  }

  const sample = await db.query(
    `SELECT ta.id, ta.company_id, ta.user_id FROM tenant_admins ta WHERE ta.status = 'active' LIMIT 1`
  );
  if (sample.rows.length) {
    const { company_id, user_id, id } = sample.rows[0];
    const gate = await svc.assertNotLastGovernanceAdmin(company_id, user_id);
    const cnt = await db.query(
      `SELECT COUNT(*)::int AS c FROM tenant_admins WHERE company_id = $1 AND status = 'active'`,
      [company_id]
    );
    if ((cnt.rows[0].c || 0) === 1) {
      assert(!gate.ok && gate.code === 'LAST_ADMIN_PROTECTION', 'deve bloquear último admin');
    }
  }

  console.log('[TENANT_ADMIN_SMOKE] ok');
}

main().catch((e) => {
  console.error('[TENANT_ADMIN_SMOKE] fail', e.message);
  process.exit(1);
});
