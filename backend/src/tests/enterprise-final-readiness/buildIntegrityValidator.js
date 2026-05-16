'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { check, phaseResult } = require('./common/readinessResult');

const SRC = path.resolve(__dirname, '../..');
const BACKEND = path.resolve(__dirname, '../../..');
const REPO = path.resolve(__dirname, '../../../..');

function validate() {
  const checks = [];

  const pq = path.join(REPO, 'frontend/package.json');
  checks.push(check('frontend_package_json', fs.existsSync(pq)));
  const bq = path.join(BACKEND, 'package.json');
  checks.push(check('backend_package_json', fs.existsSync(bq)));

  try {
    require.resolve(path.join(SRC, 'server.js'));
    checks.push(check('backend_entry_resolvable', true));
  } catch (e) {
    checks.push(check('backend_entry_resolvable', false, 'fail', e.message));
  }

  const runFull = process.env.IMPETUS_FINAL_READINESS_RUN_BUILD === 'true';
  if (runFull) {
    try {
      execSync('npm run build', { cwd: path.join(REPO, 'frontend'), stdio: 'pipe', timeout: 600000 });
      checks.push(check('frontend_vite_build', true));
    } catch (e) {
      checks.push(check('frontend_vite_build', false, 'fail', (e.message || '').slice(0, 200)));
    }
  } else {
    checks.push(
      check(
        'frontend_vite_build',
        false,
        'warn',
        'Build frontend não executado (definir IMPETUS_FINAL_READINESS_RUN_BUILD=true para validar).'
      )
    );
  }

  return phaseResult('P13', 'Build Integrity', checks);
}

module.exports = { validate };
