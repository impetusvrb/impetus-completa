#!/usr/bin/env node
'use strict';

/**
 * CERT-03 — Readiness report (observability, backup, runtime, matriz).
 * Uso: npm run cert:03
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');

const REPO = path.resolve(__dirname, '..', '..', '..');
const BACKEND = path.join(REPO, 'backend');
const DOCS_IECP = path.join(BACKEND, 'docs', 'iecp');
const OUT_JSON = path.join(DOCS_IECP, 'CERT-03_READINESS_REPORT.json');
const OUT_MD = path.join(DOCS_IECP, 'CERT-03_READINESS_REPORT.md');

function sh(cmd, cwd = REPO) {
  try {
    const out = execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
    return { ok: true, out };
  } catch (err) {
    return { ok: false, out: (err.stdout || '').toString(), err: (err.stderr || err.message || '').toString() };
  }
}

function httpGet(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode, body: body.slice(0, 300) }));
    });
    req.on('error', (e) => resolve({ ok: false, status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, error: 'timeout' }); });
  });
}

function pm2Status(name) {
  const r = sh(`pm2 jlist 2>/dev/null`);
  if (!r.ok) return { online: false };
  try {
    const list = JSON.parse(r.out || '[]');
    const app = list.find((a) => a.name === name);
    if (!app) return { online: false };
    return {
      online: app.pm2_env?.status === 'online',
      node_env: app.pm2_env?.NODE_ENV || null,
      uptime_s: app.pm2_env?.pm_uptime ? Math.floor((Date.now() - app.pm2_env.pm_uptime) / 1000) : 0
    };
  } catch {
    return { online: false };
  }
}

function readMatrixStats() {
  const p = path.join(BACKEND, 'docs/FUNCTIONAL_MATRIX.json');
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  const dist = m.stats?.statusDist || {};
  const verde = (dist.VERDE || 0) + (dist.SCENARIO_VERDE || 0);
  const greenScreens = dist.VERDE || 0;
  const redirect = dist.REDIRECT || 0;
  return {
    screenCount: m.stats?.screenCount || m.rows?.length || 0,
    endpointCount: m.stats?.endpointCount || 0,
    statusDist: dist,
    matrix_green: greenScreens >= 72 && redirect === 5 && (dist.AMARELO || 0) === 0
  };
}

async function main() {
  fs.mkdirSync(DOCS_IECP, { recursive: true });

  const pm2Backend = pm2Status('impetus-backend');
  const pm2Frontend = pm2Status('impetus-frontend');
  const nodeEnvProd = sh("grep '^NODE_ENV=production' backend/.env").ok;

  const healthBackend = await httpGet('http://127.0.0.1:4000/health');
  const healthFrontend = await httpGet('http://127.0.0.1:3000/');

  const drift = sh('npm run cert:drift', BACKEND);
  const matrix = readMatrixStats();

  const obsFiles = {
    compose: path.join(REPO, 'infra/observability/docker-compose.yml'),
    prometheus: path.join(REPO, 'infra/observability/prometheus/prometheus.yml'),
    grafana_dashboards: path.join(REPO, 'infra/observability/grafana/provisioning/dashboards/dashboards.yml')
  };
  const observability_stack_files = Object.values(obsFiles).every((f) => fs.existsSync(f));

  const backupDir = path.join(BACKEND, 'backups');
  const backup_snapshot = fs.existsSync(backupDir) && fs.readdirSync(backupDir).some((f) => f.endsWith('.sql'));

  const p0ePath = path.join(BACKEND, 'docs/P0E_GO_LIVE_MONITORING.md');
  let p0eGoLive = false;
  if (fs.existsSync(p0ePath)) {
    p0eGoLive = /"go_live_detected":\s*true/.test(fs.readFileSync(p0ePath, 'utf8'));
  }

  const checks = {
    runtime_pm2: pm2Backend.online && pm2Frontend.online,
    runtime_node_env_prod: nodeEnvProd,
    health_backend: healthBackend.ok,
    health_frontend: healthFrontend.ok,
    drift_gate: drift.ok,
    observability_stack_files,
    backup_snapshot,
    matrix_green: matrix.matrix_green,
    p0e_go_live: p0eGoLive
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  const readiness = passed === total ? 'READY' : passed >= total - 1 ? 'READY_WITH_MINOR_GAPS' : 'NOT_READY';

  const report = {
    generated_at: new Date().toISOString(),
    phase: 'CERT-03',
    readiness,
    score: `${passed}/${total}`,
    checks,
    pm2: { 'impetus-backend': pm2Backend, 'impetus-frontend': pm2Frontend },
    health: { backend: healthBackend, frontend: healthFrontend },
    matrix,
    evidence: {
      drift_command_ok: drift.ok,
      backup_snapshot_ok: backup_snapshot,
      observability_files: obsFiles,
      p0e_go_live: p0eGoLive
    },
    next_steps: [
      'Subir stack observability com docker compose em infra/observability',
      'Aplicar token interno em Prometheus para /api/internal/observability/metrics',
      'Executar drill de restore DB em ambiente controlado e anexar evidência',
      'Iniciar janela CERT-04 (72h) com evidências por domínio'
    ]
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  const md = `# CERT-03 Readiness Report

**Gerado em:** ${report.generated_at}

## Resultado

- Estado: **${readiness}**
- Score: **${passed}/${total}**

## Checks

| Check | Status |
|---|---|
| PM2 backend/frontend online | ${checks.runtime_pm2 ? '✅' : '❌'} |
| NODE_ENV produção | ${checks.runtime_node_env_prod ? '✅' : '❌'} |
| Health backend | ${checks.health_backend ? '✅' : '❌'} |
| Health frontend | ${checks.health_frontend ? '✅' : '❌'} |
| Drift gate | ${checks.drift_gate ? '✅' : '❌'} |
| Arquivos observability | ${checks.observability_stack_files ? '✅' : '❌'} |
| Snapshot backup supervisionado | ${checks.backup_snapshot ? '✅' : '❌'} |
| Matriz 72 VERDE + 5 REDIRECT | ${checks.matrix_green ? '✅' : '❌'} |
| P0E go-live detectado | ${checks.p0e_go_live ? '✅' : '❌'} |

## Próximos passos (CERT-03 → CERT-04)

${report.next_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
`;
  fs.writeFileSync(OUT_MD, md);

  console.log(JSON.stringify({ readiness, score: report.score, checks }, null, 2));
  process.exit(readiness === 'NOT_READY' ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
