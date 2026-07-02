#!/usr/bin/env node
'use strict';

/**
 * Valida prontidão estrutural de um tenant antes de Go Live.
 * Uso: node backend/scripts/ops/validate-structural-readiness.js [company_id]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../../src/db');

const args = process.argv.slice(2);
const structuralOnly = args.includes('--structural-only');
const companyId = args.find((a) => !a.startsWith('--'));

async function main() {
  if (!companyId) {
    console.error('Uso: node validate-structural-readiness.js <company_id> [--structural-only]');
    process.exit(1);
  }

  const users = await db.query(
    `SELECT u.id, u.email, u.name, u.role, u.company_role_id, u.active,
            cr.name AS cargo_name, cr.department_id, cr.sector_id
     FROM users u
     LEFT JOIN company_roles cr ON cr.id = u.company_role_id
     WHERE u.company_id = $1 AND u.deleted_at IS NULL AND u.active = true
     ORDER BY u.email`,
    [companyId]
  );

  const depts = await db.query(
    `SELECT COUNT(*)::int AS c FROM departments WHERE company_id = $1`,
    [companyId]
  );
  const sectors = await db.query(
    `SELECT COUNT(*)::int AS c FROM company_sectors s
     JOIN departments d ON d.id = s.department_id
     WHERE d.company_id = $1 AND s.active = true`,
    [companyId]
  );
  const roles = await db.query(
    `SELECT COUNT(*)::int AS c FROM company_roles WHERE company_id = $1`,
    [companyId]
  );

  let failed = 0;
  const issues = [];

  if (depts.rows[0].c < 1) {
    failed++;
    issues.push('Sem departamentos cadastrados');
  }
  if (sectors.rows[0].c < 1) {
    failed++;
    issues.push('Sem setores cadastrados');
  }
  if (roles.rows[0].c < 1) {
    failed++;
    issues.push('Sem cargos (company_roles) cadastrados');
  }

  const withoutRole = users.rows.filter((u) => !u.company_role_id);
  const incompleteRoles = users.rows.filter(
    (u) => u.company_role_id && (!u.department_id || !u.sector_id)
  );

  if (!structuralOnly) {
    if (withoutRole.length) {
      failed += withoutRole.length;
      withoutRole.forEach((u) =>
        issues.push(`Utilizador sem company_role_id: ${u.email} (${u.role})`)
      );
    }
    if (incompleteRoles.length) {
      failed += incompleteRoles.length;
      incompleteRoles.forEach((u) =>
        issues.push(`Cargo incompleto (dept/setor): ${u.email} → ${u.cargo_name}`)
      );
    }
  } else {
    if (withoutRole.length) {
      failed += withoutRole.length;
      withoutRole.forEach((u) =>
        issues.push(`Utilizador sem company_role_id: ${u.email} (${u.role})`)
      );
    }
    if (incompleteRoles.length) {
      console.log('\nAviso (--structural-only):', incompleteRoles.length, 'cargo(s) sem dept/setor na company_roles');
    }
  }

  console.log('\n=== Validação Base Estrutural ===');
  console.log('Company:', companyId);
  console.log('Departamentos:', depts.rows[0].c);
  console.log('Setores:', sectors.rows[0].c);
  console.log('Cargos:', roles.rows[0].c);
  console.log('Utilizadores activos:', users.rows.length);
  console.log('Sem company_role_id:', withoutRole.length);
  console.log('Cargos incompletos:', incompleteRoles.length);

  if (issues.length) {
    console.log('\nProblemas:');
    issues.forEach((i) => console.log('  -', i));
    console.log(`\nRESULTADO: FALHOU (${failed} issue(s))\n`);
    process.exit(1);
  }

  console.log('\nRESULTADO: OK — pronto para piloto / Go Live\n');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
