/**
 * CERT-01 FIX — Backfill de dashboard_profile + functional_area
 *
 * Executa resolveAndPersistProfile para todos os usuários ativos que
 * não possuem dashboard_profile ou functional_area preenchidos.
 *
 * Efeito: persiste os campos resolvidos pelo motor contextual na BD,
 * eliminando o gap de 72% de usuários sem functional_area.
 *
 * Uso: node backend/scripts/cert01/backfillContextualProfiles.js [--dry-run]
 */
'use strict';

const db = require('../../src/db');
const dashboardProfileResolver = require('../../src/services/dashboardProfileResolver');
const functionalAxisResolver = require('../../src/services/functionalAxisResolver');

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  console.log('[CERT-01] Backfill de perfis contextuais —', DRY_RUN ? 'DRY RUN' : 'LIVE');

  const { rows: users } = await db.query(`
    SELECT
      u.id, u.name, u.email, u.role, u.hierarchy_level,
      u.functional_area, u.dashboard_profile, u.job_title,
      u.area, u.department, u.hr_responsibilities,
      u.company_id, u.active,
      cr.hierarchy_level AS company_role_hierarchy_level,
      cr.name            AS company_role_name,
      cr.dashboard_functional_hint AS company_role_dashboard_hint
    FROM users u
    LEFT JOIN company_roles cr ON cr.id = u.company_role_id AND cr.active = true
    WHERE u.active = true
    ORDER BY u.hierarchy_level ASC NULLS LAST
  `);

  console.log(`[CERT-01] ${users.length} usuários ativos encontrados.`);

  let updated = 0;
  let skipped = 0;
  let errors  = 0;

  for (const user of users) {
    try {
      const axisPack = functionalAxisResolver.resolveFunctionalAxis(user);
      const profileCode = dashboardProfileResolver.resolveDashboardProfile({
        ...user,
        functional_area: axisPack.functional_area
      });

      const needsProfileUpdate = user.dashboard_profile !== profileCode;
      const needsAreaUpdate =
        !user.functional_area && axisPack.functional_area;

      if (!needsProfileUpdate && !needsAreaUpdate) {
        skipped++;
        continue;
      }

      if (!DRY_RUN) {
        await db.query(
          `UPDATE users SET
            dashboard_profile = $1,
            functional_area   = COALESCE(NULLIF($2, ''), functional_area),
            updated_at        = now()
          WHERE id = $3`,
          [profileCode, axisPack.functional_area || null, user.id]
        );
      }

      console.log(
        `  [${DRY_RUN ? 'DRY' : 'UPD'}] ${user.name} (${user.role}) ` +
        `→ profile: ${user.dashboard_profile || 'null'} → ${profileCode} ` +
        `| area: ${user.functional_area || 'null'} → ${axisPack.functional_area || 'null'}`
      );
      updated++;
    } catch (err) {
      console.error(`  [ERR] ${user.email}:`, err.message);
      errors++;
    }
  }

  console.log(`\n[CERT-01] Concluído: ${updated} atualizados, ${skipped} sem alteração, ${errors} erros.`);
  process.exit(errors > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('[CERT-01] FATAL:', e);
  process.exit(1);
});
