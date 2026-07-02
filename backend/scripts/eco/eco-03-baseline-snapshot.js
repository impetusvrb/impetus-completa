'use strict';

/**
 * ECO-03 PARTE 1 — snapshot baseline pré/pós migração bypasses.
 * Read-only: health, métricas, flags, PM2 (se disponível).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const EVIDENCE_DIR = path.join(DOCS, 'evidence/eco-03');

function loadEnvFile() {
  const envPath = path.join(BACKEND_ROOT, '.env');
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function fetchJson(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode < 400, status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ ok: false, status: res.statusCode, body: data.slice(0, 500) });
        }
      });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

function pm2Snapshot() {
  try {
    const raw = execSync('pm2 jlist 2>/dev/null || pm2 list --json 2>/dev/null', {
      encoding: 'utf8',
      timeout: 10000
    });
    const parsed = JSON.parse(raw);
    return {
      available: true,
      processes: Array.isArray(parsed)
        ? parsed.map((p) => ({
            name: p.name,
            status: p.pm2_env?.status,
            restarts: p.pm2_env?.restart_time
          }))
        : parsed
    };
  } catch (err) {
    return { available: false, error: err.message };
  }
}

async function main() {
  const port = process.env.PORT || loadEnvFile().PORT || 3001;
  const base = `http://127.0.0.1:${port}`;

  const observability = require(path.join(BACKEND_ROOT, 'src/services/observabilityService'));
  const ecoFlags = require(path.join(BACKEND_ROOT, 'src/services/ecoConvergenceFlags'));
  const eventGovernance = require(path.join(BACKEND_ROOT, 'src/services/eventGovernanceService'));
  const eventGovernanceExecution = require(path.join(BACKEND_ROOT, 'src/services/eventGovernanceExecutionService'));

  const snapshot = {
    certification: 'ECO-03-BASELINE',
    capturedAt: new Date().toISOString(),
    health: await fetchJson(`${base}/health`),
    deepHealth: await fetchJson(`${base}/api/system/health/deep`),
    pm2: pm2Snapshot(),
    eventGovernance: {
      enabled: eventGovernance.isEnabled(),
      executionEnabled: eventGovernanceExecution.isExecutionEnabled(),
      audit: eventGovernance.getAuditStatus?.() || null,
      executionAudit: eventGovernanceExecution.getAuditStatus?.() || null
    },
    ecoConvergence: ecoFlags.getAuditStatus(),
    metrics: observability.getMetricsSnapshot(),
    envFlags: {
      ECO_OAE_VIA_EG: loadEnvFile().ECO_OAE_VIA_EG || 'false',
      ECO_CHAT_VIA_EG: loadEnvFile().ECO_CHAT_VIA_EG || 'false',
      ECO_ORG_AI_VIA_EG: loadEnvFile().ECO_ORG_AI_VIA_EG || 'false'
    }
  };

  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const outFile = path.join(EVIDENCE_DIR, `baseline-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2));

  console.log('\n  ECO-03 BASELINE SNAPSHOT\n');
  console.log(`  Health: ${snapshot.health.ok ? 'OK' : 'UNAVAILABLE'}`);
  console.log(`  Deep health: ${snapshot.deepHealth.ok ? 'OK' : 'UNAVAILABLE'}`);
  console.log(`  PM2: ${snapshot.pm2.available ? 'OK' : 'N/A'}`);
  console.log(`  Evidência: ${outFile}\n`);

  return snapshot;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
