#!/usr/bin/env node
'use strict';

/**
 * Fase U — KPI stabilization safe deploy
 */

const { executeKpiStabilizationDeploy, createBackup } = require('../src/kpiRollout/kpiSafeDeploy');

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_BUILD = process.argv.includes('--skip-build');
const SKIP_PM2 = process.argv.includes('--skip-pm2');

function log(msg) {
  console.log(`[kpi-stabilization-deploy] ${msg}`);
}

function main() {
  log('Pre-deploy stabilization validation');
  if (!DRY_RUN) {
    const bk = createBackup('kpi-runtime-stabilization');
    log(`Backup: ${bk.backup_path}`);
  }
  const result = executeKpiStabilizationDeploy({
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
