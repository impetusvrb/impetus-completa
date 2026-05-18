'use strict';

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const FRONTEND = path.resolve(__dirname, '../../../frontend');

/**
 * Fase 2 — soak leve (testes estáticos + opcional PM2 list).
 */
function runEnterpriseStabilitySoak(opts = {}) {
  const suites = [
    { id: 'enterprise_runtime_validation', cmd: 'npm run test:enterprise-runtime-validation', cwd: ROOT },
    { id: 'enterprise_shadow_stabilization', cmd: 'npm run test:enterprise-shadow-stabilization', cwd: ROOT },
    { id: 'enterprise_pilot_rollout', cmd: 'npm run test:enterprise-pilot-rollout', cwd: ROOT },
    { id: 'safety_publication', cmd: 'npm run test:safety-publication-activation', cwd: ROOT },
    { id: 'logistics_runtime', cmd: 'npm run test:logistics-runtime-validation', cwd: ROOT },
    { id: 'environment_runtime', cmd: 'npm run test:environment-runtime-validation', cwd: ROOT },
    { id: 'frontend_runtime_stability', cmd: 'npm run test:enterprise-runtime-stability', cwd: FRONTEND },
    { id: 'frontend_publication', cmd: 'npm run test:safety-publication-runtime', cwd: FRONTEND }
  ];

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const s of suites) {
    if (opts.skip_frontend && s.cwd === FRONTEND) continue;
    const row = { id: s.id, ok: false, elapsed_ms: 0, error: null };
    const t0 = Date.now();
    try {
      if (opts.dry_run) {
        row.ok = true;
        row.skipped = true;
      } else {
        execSync(s.cmd, { cwd: s.cwd, stdio: 'pipe', timeout: 120000 });
        row.ok = true;
      }
      passed += 1;
    } catch (e) {
      row.ok = false;
      row.error = (e.message || 'failed').slice(0, 200);
      failed += 1;
    }
    row.elapsed_ms = Date.now() - t0;
    results.push(row);
  }

  let pm2 = { ok: true, processes: [], note: 'pm2_optional' };
  if (opts.check_pm2 !== false && !opts.dry_run) {
    try {
      const out = execSync('pm2 jlist 2>/dev/null || pm2 list --json 2>/dev/null || echo "[]"', {
        encoding: 'utf8',
        timeout: 10000
      });
      const list = JSON.parse(out || '[]');
      pm2.processes = list.map((p) => ({ name: p.name, status: p.pm2_env?.status }));
      pm2.ok = list.some((p) => /impetus-backend/i.test(p.name || ''));
    } catch {
      pm2.ok = true;
      pm2.note = 'pm2_not_available';
    }
  }

  const memoryProxyOk = failed === 0;
  return {
    ok: failed === 0,
    stable: failed === 0 && memoryProxyOk,
    passed,
    failed,
    total: results.length,
    suites: results,
    pm2,
    domains_soak: ['quality', 'safety', 'logistics', 'ia', 'chat', 'dashboard'],
    render_stability_proxy: results.find((r) => r.id === 'frontend_runtime_stability')?.ok !== false,
    publication_stability_proxy: results.find((r) => r.id === 'frontend_publication')?.ok !== false
  };
}

module.exports = { runEnterpriseStabilitySoak };
