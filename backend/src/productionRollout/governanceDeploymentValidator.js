'use strict';

const fs = require('fs');
const path = require('path');

function validateDeployment(ctx = {}) {
  const checks = [];

  const distPath = path.join(__dirname, '..', '..', '..', 'frontend', 'dist');
  const distExists = fs.existsSync(distPath);
  checks.push({
    id: 'frontend_dist',
    passed: distExists || ctx.skip_build_check === true,
    note: distExists ? 'dist present' : 'verify build before deploy'
  });

  checks.push({
    id: 'shadow_mode',
    passed: _envOn('IMPETUS_GOVERNANCE_SHADOW_MODE', true),
    note: 'shadow required'
  });
  checks.push({
    id: 'failsafe',
    passed: _envOn('IMPETUS_FAILSAFE_GOVERNANCE', true),
    note: 'failsafe required'
  });
  checks.push({
    id: 'no_global_channel_env',
    passed: !['IMPETUS_KPI_GOVERNANCE', 'IMPETUS_SUMMARY_GOVERNANCE', 'IMPETUS_CHAT_GOVERNANCE', 'IMPETUS_COGNITIVE_BOUNDARY_GUARD']
      .some((f) => _envOn(f)),
    note: 'channel flags should use runtime promotion'
  });

  let migration = { passed: true, note: 'no_pending_migrations_assumed' };
  if (ctx.migration_pending === true) {
    migration = { passed: false, note: 'migrations must complete first' };
  }
  checks.push({ id: 'migration_safety', ...migration });

  const passed = checks.every((c) => c.passed);

  return {
    passed,
    checks,
    pm2_process_health: 'manual_verify',
    backend_runtime: 'manual_verify',
    auto_deploy: false
  };
}

function _envOn(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || v === '1';
}

module.exports = { validateDeployment };
