#!/usr/bin/env node
/**
 * audit-hierarchy.js — Phase 7
 *
 * Script READ-SAFE para detectar inconsistências entre
 *   `users.hierarchy_level`  (cache persistido)
 *   `company_roles.hierarchy_level`  (fonte canónica)
 *
 * NÃO altera nada no banco. Apenas:
 *   - lê todos os utilizadores activos com `company_role_id`
 *   - cruza com `company_roles`
 *   - mostra divergências
 *   - estima impacto contextual (quantos gates podem ter falhado)
 *   - sugere o comando UPDATE ou JSON com correcções (sem aplicar)
 *
 * Uso:
 *   node scripts/audit-hierarchy.js
 *   node scripts/audit-hierarchy.js --json          # saída JSON p/ pipelines
 *   node scripts/audit-hierarchy.js --company <id>  # filtra por empresa
 *   node scripts/audit-hierarchy.js --emit-fix-sql  # imprime SQL sugerido (não executa)
 *
 * Boas práticas:
 *   - Executar antes de qualquer correcção em massa.
 *   - Ler o output e validar com a liderança da empresa.
 *   - Só então aplicar manualmente o SQL sugerido (ou re-salvar cada
 *     utilizador via UI, que agora dispara `userIdentitySync` automaticamente).
 */

'use strict';

const path = require('path');

// Permitir execução a partir de qualquer cwd.
const root = path.resolve(__dirname, '..');
process.chdir(root);

const db = require('../src/db');

const ARGV = new Set(process.argv.slice(2));
const ASK_JSON = ARGV.has('--json');
const ASK_FIX = ARGV.has('--emit-fix-sql');
const COMPANY_ID = (() => {
  const i = process.argv.indexOf('--company');
  return i >= 0 ? process.argv[i + 1] : null;
})();

// Conhecidos pelos gates do código (busca rg)
const KNOWN_GATES = [
  { route: '/dashboard/me',               threshold: '≤ 4', impactedBelow: 5 },
  { route: '/qualityIntelligence/alerts', threshold: '≤ 2', impactedBelow: 3 },
  { route: '/warehouseIntelligence',      threshold: '≤ 2', impactedBelow: 3 },
  { route: '/operationalAnomalies/ack',   threshold: '≤ 2', impactedBelow: 3 },
  { route: '/intelligentRegistration/leadership', threshold: '≤ 2', impactedBelow: 3 },
  { route: '/logisticsIntelligence',      threshold: '≤ 3', impactedBelow: 4 },
  { route: '/onboardingService',          threshold: '≤ 1', impactedBelow: 2 },
  { route: 'liveDashboardService.canAccessLiveDashboard', threshold: '≤ 4', impactedBelow: 5 },
  { route: 'centro_operacoes_industrial (Phase 6)', threshold: '1..4', impactedBelow: 5 }
];

function _gatesAffectedBy(currentLevel, canonicalLevel) {
  if (currentLevel === canonicalLevel) return [];
  const affected = [];
  for (const g of KNOWN_GATES) {
    const wasBlocked = currentLevel >= g.impactedBelow;
    const wouldUnblock = canonicalLevel < g.impactedBelow;
    if (wasBlocked && wouldUnblock) {
      affected.push(`UNLOCKED:${g.route} (${g.threshold})`);
      continue;
    }
    const wasAllowed = currentLevel < g.impactedBelow;
    const wouldBlock = canonicalLevel >= g.impactedBelow;
    if (wasAllowed && wouldBlock) {
      affected.push(`BLOCKED:${g.route} (${g.threshold})`);
    }
  }
  return affected;
}

function _riskTag(canonicalLevel, drift) {
  if (drift === null) return 'unknown';
  if (canonicalLevel <= 1 && drift >= 3) return 'CRITICAL_EXECUTIVE_BLOCKED';
  if (canonicalLevel <= 2 && drift >= 2) return 'HIGH_LEADERSHIP_BLOCKED';
  if (canonicalLevel >= 3 && drift <= -2) return 'PRIVILEGE_OVER_GRANTED';
  if (Math.abs(drift) >= 1) return 'MEDIUM_INCONSISTENT';
  return 'LOW';
}

async function main() {
  const params = [];
  let where = 'WHERE u.deleted_at IS NULL AND u.active = true AND u.company_role_id IS NOT NULL';
  if (COMPANY_ID) {
    params.push(COMPANY_ID);
    where += ` AND u.company_id = $${params.length}`;
  }

  const sql = `
    SELECT u.id, u.email, u.name, u.role, u.area, u.functional_area,
           u.hierarchy_level   AS users_level,
           u.company_role_id,
           cr.name             AS company_role_name,
           cr.hierarchy_level  AS company_roles_level,
           u.company_id
    FROM users u
    LEFT JOIN company_roles cr ON cr.id = u.company_role_id
    ${where}
    ORDER BY u.company_id, cr.hierarchy_level NULLS LAST, u.email
  `;
  const r = await db.query(sql, params);

  const allRows = r.rows || [];
  const inconsistent = allRows.filter((row) =>
    row.company_roles_level !== null &&
    row.users_level !== null &&
    Number(row.users_level) !== Number(row.company_roles_level)
  );

  const report = {
    generated_at: new Date().toISOString(),
    company_id_filter: COMPANY_ID,
    totals: {
      users_with_company_role: allRows.length,
      inconsistent: inconsistent.length,
      missing_cr_level: allRows.filter((r2) => r2.company_roles_level === null).length
    },
    inconsistent: inconsistent.map((row) => {
      const u = Number(row.users_level);
      const c = Number(row.company_roles_level);
      const drift = u - c;
      return {
        user_id: row.id,
        email: row.email,
        name: row.name,
        company_id: row.company_id,
        role: row.role,
        area: row.area,
        functional_area: row.functional_area,
        company_role_id: row.company_role_id,
        company_role_name: row.company_role_name,
        users_level: u,
        company_roles_level: c,
        drift_value: drift,
        drift_direction: drift > 0 ? 'users_higher_than_canonical' : 'users_lower_than_canonical',
        risk: _riskTag(c, drift),
        gates_affected: _gatesAffectedBy(u, c)
      };
    }),
    fix_suggestions: inconsistent.map((row) => ({
      user_id: row.id,
      email: row.email,
      sql: `UPDATE users SET hierarchy_level = ${Number(row.company_roles_level)}, updated_at = now() WHERE id = '${row.id}';`
    }))
  };

  if (ASK_JSON) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    const t = report.totals;
    console.log('====================================================');
    console.log('HIERARCHY DRIFT AUDIT — Phase 7 (READ-SAFE)');
    console.log('====================================================');
    console.log(`Generated at: ${report.generated_at}`);
    if (COMPANY_ID) console.log(`Company filter: ${COMPANY_ID}`);
    console.log('');
    console.log('== Totais ==');
    console.log(`  utilizadores com company_role : ${t.users_with_company_role}`);
    console.log(`  inconsistentes                : ${t.inconsistent}`);
    console.log(`  cargo sem hierarchy_level     : ${t.missing_cr_level}`);
    console.log('');
    if (inconsistent.length === 0) {
      console.log('✓ nenhum drift detectado.');
    } else {
      console.log('== Inconsistências ==');
      for (const i of report.inconsistent) {
        console.log('');
        console.log(`  • ${i.email}  (${i.name || '—'})`);
        console.log(`    cargo formal     : ${i.company_role_name} (canónico = ${i.company_roles_level})`);
        console.log(`    users.hierarchy  : ${i.users_level}  (drift = ${i.drift_value})`);
        console.log(`    risco            : ${i.risk}`);
        if (i.gates_affected.length) {
          console.log(`    gates afectados  :`);
          for (const g of i.gates_affected) console.log(`        - ${g}`);
        }
      }
    }
    if (ASK_FIX && inconsistent.length > 0) {
      console.log('');
      console.log('== SQL sugerido (NÃO executado) ==');
      for (const f of report.fix_suggestions) {
        console.log(`-- ${f.email}`);
        console.log(f.sql);
      }
    }
    console.log('');
    console.log('NOTA: este script NÃO altera o banco.');
    console.log('Para aplicar, ou (a) re-salve cada utilizador via UI');
    console.log('  (já dispara userIdentitySync automaticamente), ou');
    console.log('  (b) execute o SQL sugerido manualmente após validação.');
  }

  process.exit(inconsistent.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('[audit-hierarchy][fatal]', e && e.message ? e.message : e);
  process.exit(2);
});
