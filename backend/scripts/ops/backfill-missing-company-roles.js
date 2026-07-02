#!/usr/bin/env node
'use strict';

/**
 * Atribui company_role_id a utilizadores activos sem cargo formal (best-effort por role).
 * Uso: node backend/scripts/ops/backfill-missing-company-roles.js <company_id> [--dry-run]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../../src/db');
const sync = require('../../src/services/userIdentitySync');

const companyId = process.argv[2];
const DRY = process.argv.includes('--dry-run');

const ROLE_PICK = {
  ceo: (roles) => roles.find((r) => r.hierarchy_level === 0) || roles[0],
  diretor: (roles) =>
    roles.find((r) => /diretor/i.test(r.name) && r.hierarchy_level === 1) ||
    roles.find((r) => r.hierarchy_level === 1),
  gerente: (roles) =>
    roles.find((r) => /gerente de produ/i.test(r.name)) ||
    roles.find((r) => /gerente/i.test(r.name) && r.hierarchy_level === 2),
  coordenador: (roles) =>
    roles.find((r) => /coordenador de produ/i.test(r.name)) ||
    roles.find((r) => /coordenador/i.test(r.name) && r.hierarchy_level === 3),
  supervisor: (roles) =>
    roles.find((r) => /supervisor de produ/i.test(r.name)) ||
    roles.find((r) => /supervisor/i.test(r.name)),
  colaborador: (roles) =>
    roles.find((r) => /operador de produ/i.test(r.name)) ||
    roles.find((r) => /mecânico/i.test(r.name)) ||
    roles.find((r) => r.hierarchy_level >= 5)
};

async function main() {
  if (!companyId) {
    console.error('Uso: node backfill-missing-company-roles.js <company_id> [--dry-run]');
    process.exit(1);
  }

  const { rows: roles } = await db.query(
    `SELECT id, name, hierarchy_level FROM company_roles
     WHERE company_id = $1 AND active = true ORDER BY hierarchy_level, name`,
    [companyId]
  );
  const { rows: users } = await db.query(
    `SELECT id, email, role, company_role_id FROM users
     WHERE company_id = $1 AND deleted_at IS NULL AND active = true AND company_role_id IS NULL`,
    [companyId]
  );

  console.log(`[backfill] ${users.length} utilizador(es) sem cargo · ${roles.length} cargos disponíveis`);
  let updated = 0;

  for (const u of users) {
    const pick = ROLE_PICK[u.role];
    const role = pick ? pick(roles) : null;
    if (!role) {
      console.log(`  SKIP ${u.email} (${u.role}) — sem correspondência`);
      continue;
    }
    console.log(`  ${DRY ? 'DRY' : 'SET'} ${u.email} → ${role.name}`);
    if (!DRY) {
      await db.query(
        `UPDATE users SET company_role_id = $1, updated_at = now() WHERE id = $2`,
        [role.id, u.id]
      );
      await sync.syncHierarchyFromCompanyRole({ userId: u.id, companyRoleId: role.id, reason: 'backfill' });
    }
    updated++;
  }

  console.log(`\nConcluído: ${updated} atribuição(ões)${DRY ? ' (dry-run)' : ''}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
