#!/usr/bin/env node
'use strict';

const { createBackup } = require('../src/kpiRollout/kpiSafeDeploy');
const { executeSummaryGovernanceDeploy } = require('../src/summaryRollout/summarySafeDeploy');
const { assessSummaryRolloutReadiness } = require('../src/summaryRollout/summaryGovernanceActivationEngine');

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_BUILD = process.argv.includes('--skip-build');
const SKIP_PM2 = process.argv.includes('--skip-pm2');

function log(msg) {
  console.log(`[summary-governance-deploy] ${msg}`);
}

function main() {
  log('Pre-deploy summary readiness');
  const readiness = assessSummaryRolloutReadiness(
    { functional_axis: 'quality', company_id: 1 },
    { summary: 'Resumo operacional de qualidade: taxa de NC estável com recomendação de verificação na linha 2.' },
    { force: true, skip_kpi_prerequisite: true }
  );
  console.log(JSON.stringify({ readiness_ok: readiness.readiness_ok, score: readiness.readiness_score }, null, 2));

  if (!DRY_RUN) {
    const bk = createBackup('summary-governance-rollout');
    log(`Backup: ${bk.backup_path}`);
  }

  const result = executeSummaryGovernanceDeploy({
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
