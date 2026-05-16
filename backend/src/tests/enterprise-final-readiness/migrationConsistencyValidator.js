'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { check, phaseResult } = require('./common/readinessResult');

const BACKEND = path.resolve(__dirname, '../../..');

function validate() {
  const checks = [];
  checks.push(check('migrate_script_present', fs.existsSync(path.join(BACKEND, 'scripts/run-all-migrations.js'))));
  checks.push(check('migrate_status_script_present', fs.existsSync(path.join(BACKEND, 'package.json'))));

  const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND, 'package.json'), 'utf8'));
  checks.push(check('npm_migrate_defined', typeof pkg.scripts?.migrate === 'string'));
  checks.push(check('npm_migrate_status_defined', typeof pkg.scripts?.['migrate:status'] === 'string'));

  const dry = process.env.IMPETUS_FINAL_READINESS_MIGRATION_DRY === 'true';
  if (dry) {
    try {
      execSync('node scripts/run-all-migrations.js --dry-run', { cwd: BACKEND, stdio: 'pipe', timeout: 120000 });
      checks.push(check('migrate_dry_run_executed', true));
    } catch (e) {
      checks.push(check('migrate_dry_run_executed', false, 'fail', (e.message || '').slice(0, 240)));
    }
  } else {
    checks.push(
      check(
        'migrate_dry_run_executed',
        false,
        'warn',
        'Dry-run de migrações não executado (definir IMPETUS_FINAL_READINESS_MIGRATION_DRY=true).'
      )
    );
  }

  return phaseResult('P15', 'Migration Consistency (tooling)', checks);
}

module.exports = { validate };
