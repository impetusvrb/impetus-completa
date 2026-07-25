'use strict';

/**
 * APPSEC-02A — Operational Restart Validator
 * Snapshots pré/pós restart; read-only checks.
 */

const http = require('http');
const { execSync } = require('child_process');
const path = require('path');

function httpProbe(url, headers = {}) {
  return new Promise((resolve) => {
    const req = http.get(url, { headers, timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ ok: true, status: res.statusCode, body: body.slice(0, 500) }));
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
  });
}

function checkPm2() {
  try {
    const raw = execSync('pm2 jlist 2>/dev/null || echo "[]"', { encoding: 'utf8', timeout: 10000 });
    const list = JSON.parse(raw || '[]');
    return list.map((p) => ({
      name: p.name,
      status: p.pm2_env?.status,
      pid: p.pid,
      memory: p.monit?.memory,
      uptime: p.pm2_env?.pm_uptime
    }));
  } catch (e) {
    return { error: e.message };
  }
}

function checkPostgres() {
  try {
    execSync('pg_isready -q 2>/dev/null', { timeout: 5000 });
    return { ok: true };
  } catch {
    return { ok: false, note: 'pg_isready unavailable or DB down' };
  }
}

function checkRedis() {
  try {
    execSync('redis-cli ping 2>/dev/null | grep -q PONG', { timeout: 3000, shell: '/bin/bash' });
    return { ok: true };
  } catch {
    return { ok: false, optional: true, note: 'Redis não utilizado ou indisponível' };
  }
}

function checkNginx() {
  try {
    execSync('nginx -t 2>&1', { timeout: 5000 });
    return { ok: true };
  } catch (e) {
    return { ok: false, note: String(e.message || e).slice(0, 200) };
  }
}

async function probeHealthEndpoints(baseUrl) {
  const paths = [
    '/api/health',
    '/api/system/health/deep',
    '/api/system/boot-metrics',
    '/api/aioi/health'
  ];
  const results = {};
  for (const p of paths) {
    results[p] = await httpProbe(`${baseUrl}${p}`, { 'X-Forwarded-For': '203.0.113.50' });
  }
  return results;
}

async function probeAppsecEndpoints(baseUrl) {
  return {
    note: 'Endpoints audit requerem auth — validados estaticamente se offline',
    health: await httpProbe(`${baseUrl}/api/health`)
  };
}

/**
 * @param {object} [options]
 */
async function captureRuntimeSnapshot(options = {}) {
  const port = process.env.PORT || process.env.IMPETUS_BACKEND_PORT || '4000';
  const baseUrl = options.baseUrl || `http://127.0.0.1:${port}`;

  const snapshot = {
    schema_version: 'runtime_snapshot_v1',
    captured_at: new Date().toISOString(),
    phase: options.phase || 'pre_restart',
    pm2: checkPm2(),
    postgresql: checkPostgres(),
    redis: checkRedis(),
    nginx: checkNginx(),
    mqtt: { optional: true, note: 'MQTT lab — verificar apenas se industrial-lab activo' },
    tls: { note: 'Validar certificado via nginx/curl externo manualmente' },
    health_endpoints: await probeHealthEndpoints(baseUrl),
    appsec_probe: await probeAppsecEndpoints(baseUrl)
  };

  snapshot.ready =
    (Array.isArray(snapshot.pm2) && snapshot.pm2.some((p) => /impetus-backend/.test(p.name) && p.status === 'online')) ||
    snapshot.health_endpoints['/api/health']?.ok;

  return snapshot;
}

/**
 * @param {object} before
 * @param {object} after
 */
function compareSnapshots(before, after) {
  const regressions = [];
  const improvements = [];

  if (before.health_endpoints && after.health_endpoints) {
    for (const [path, prev] of Object.entries(before.health_endpoints)) {
      const next = after.health_endpoints[path];
      if (prev.ok && !next?.ok) regressions.push({ check: path, before: prev.status, after: next?.status || 'down' });
      if (!prev.ok && next?.ok) improvements.push({ check: path, status: 'recovered' });
    }
  }

  const beforeOnline = Array.isArray(before.pm2) && before.pm2.find((p) => /impetus-backend/.test(p.name))?.status === 'online';
  const afterOnline = Array.isArray(after.pm2) && after.pm2.find((p) => /impetus-backend/.test(p.name))?.status === 'online';
  if (beforeOnline && !afterOnline) regressions.push({ check: 'pm2_impetus_backend', message: 'Backend offline após restart' });

  return {
    schema_version: 'restart_comparison_v1',
    compared_at: new Date().toISOString(),
    regressions,
    improvements,
    stable: regressions.length === 0,
    before_phase: before.phase,
    after_phase: after.phase
  };
}

async function validateRestartReadiness(options = {}) {
  const pre = await captureRuntimeSnapshot({ ...options, phase: 'pre_restart' });
  return {
    schema_version: 'restart_validation_v1',
    generated_at: new Date().toISOString(),
    pre_restart: pre,
    post_restart: null,
    comparison: null,
    note: 'Execute novamente com phase=post_restart após pm2 restart para comparação completa'
  };
}

module.exports = {
  captureRuntimeSnapshot,
  compareSnapshots,
  validateRestartReadiness
};
