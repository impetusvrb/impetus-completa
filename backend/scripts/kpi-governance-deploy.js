#!/usr/bin/env node
'use strict';

/**
 * Fase T — KPI governance safe deploy
 * npm run kpi-governance:deploy [-- --dry-run] [-- --skip-build] [-- --skip-pm2]
 */

const { executeKpiGovernanceDeploy, createBackup } = require('../src/kpiRollout/kpiSafeDeploy');
const { assessKpiRolloutReadiness } = require('../src/kpiRollout/kpiGovernanceActivationEngine');

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_BUILD = process.argv.includes('--skip-build');
const SKIP_PM2 = process.argv.includes('--skip-pm2');

function log(msg) {
  console.log(`[kpi-governance-deploy] ${msg}`);
}

function main() {
  log('Pre-deploy KPI readiness (synthetic)');
  const readiness = assessKpiRolloutReadiness(
    { functional_axis: 'quality', company_id: 1 },
    { kpis: [{ id: 'q1', domain: 'quality' }] },
    { force: true }
  );
  console.log(
    JSON.stringify(
      { readiness_ok: readiness.readiness_ok, score: readiness.readiness_score },
      null,
      2
    )
  );

  if (!DRY_RUN) {
    const bk = createBackup('kpi-governance-rollout');
    log(`Backup: ${bk.backup_path}`);
  }

  const result = executeKpiGovernanceDeploy({
    dry_run: DRY_RUN,
    skip_build: SKIP_BUILD,
    skip_pm2: SKIP_PM2 || DRY_RUN,
    skip_backup: DRY_RUN
  });

  console.log(JSON.stringify(result, null, 2));
  const failed = result.steps?.some((s) => s.result?.ok === false);
  if (failed) process.exit(1);
}

main();
