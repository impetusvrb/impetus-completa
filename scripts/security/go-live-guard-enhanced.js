#!/usr/bin/env node
'use strict';

/**
 * OPERATIONAL-GO-LIVE-01 — GO_LIVE_GUARD enhanced (operacional, não SEC).
 * Fase 1: 5 min @ 5s | Fase 2: 10 min @ 30s
 * --fast: 5s @ 500ms + 10s @ 1s
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const DOCS = path.join(ROOT, 'backend/docs');
const MANIFEST = path.join(DOCS, 'evidence/security-baseline-01/critical-files.sha256.manifest');

const args = process.argv.slice(2);
const evidenceIdx = args.indexOf('--evidence');
const EVIDENCE = evidenceIdx >= 0 ? args[evidenceIdx + 1] : path.join(DOCS, 'evidence/operational-go-live-01');
const FAST = args.includes('--fast') || process.env.SEC21C_FAST_GUARD === 'true';

const PHASE1_MS = FAST ? 5_000 : 5 * 60_000;
const PHASE2_MS = FAST ? 10_000 : 10 * 60_000;
const INTERVAL_P1 = FAST ? 500 : 5_000;
const INTERVAL_P2 = FAST ? 1_000 : 30_000;

const WATCH_DIRS = [
  'backend/src',
  'frontend/src',
  'infra',
  'scripts',
  'backend/docs',
  path.join('backend/docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT')
];

const LIMITS = { maxHeapMb: 768, maxRssMb: 1536, maxLatencyMs: 3000, minIntegrity: 0.95 };

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* busy wait for deterministic intervals without setInterval */
  }
}

function waitForWarmup(maxMs = 90_000) {
  const start = Date.now();
  console.log('GO_LIVE_GUARD warmup — aguardando backend estável...');
  while (Date.now() - start < maxMs) {
    try {
      const code = execSync('curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/health 2>/dev/null', {
        encoding: 'utf8',
        timeout: 5000
      }).trim();
      if (code === '200' || code === '204') {
        const eng = require(path.join(ROOT, 'backend/src/securityRuntimeIntegrity/engine/integrityEngine'));
        const r = eng.runIntegrityCheck?.({ force: true });
        if ((r?.integrityScore ?? 0) >= LIMITS.minIntegrity) {
          console.log(`Warmup OK — integrity=${r.integrityScore} (${Math.round((Date.now() - start) / 1000)}s)`);
          return true;
        }
      }
    } catch (_e) {
      /* retry */
    }
    sleep(2000);
  }
  console.warn('Warmup timeout — prosseguindo com vigilância');
  return false;
}

function parseManifest() {
  if (!fs.existsSync(MANIFEST)) return [];
  return fs
    .readFileSync(MANIFEST, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 4) return null;
      return { hash: parts[2], filePath: parts.slice(3).join(' ') };
    })
    .filter(Boolean);
}

function sha256File(abs) {
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
  return execSync(`sha256sum "${abs}"`, { encoding: 'utf8' }).split(/\s+/)[0];
}

function checkCriticalHashes() {
  const alerts = [];
  for (const entry of parseManifest()) {
    const abs = entry.filePath.startsWith('/') ? entry.filePath : path.join(ROOT, entry.filePath);
    const current = sha256File(abs);
    if (current && current !== entry.hash) {
      alerts.push({ code: 'CRITICAL_HASH_DRIFT', path: entry.filePath, expected: entry.hash.slice(0, 12), actual: current.slice(0, 12) });
    }
  }
  return alerts;
}

function snapshotWatchDirs() {
  const files = new Map();
  for (const rel of WATCH_DIRS) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const walk = (dir) => {
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        try {
          const st = fs.statSync(p);
          if (st.isDirectory()) walk(p);
          else files.set(path.relative(ROOT, p), st.mtimeMs);
        } catch (_e) {
          /* ignore */
        }
      }
    };
    walk(abs);
  }
  return files;
}

function detectNewFiles(before, after) {
  const incidents = [];
  for (const [f, mtime] of after) {
    if (!before.has(f)) {
      incidents.push({ code: 'UNEXPECTED_FILE_CREATED', path: f, mtime });
    }
  }
  return incidents;
}

function probePm2() {
  try {
    const list = JSON.parse(execSync('pm2 jlist 2>/dev/null', { encoding: 'utf8', timeout: 8000 }));
    const backend = list.find((p) => p.name === 'impetus-backend');
    return {
      online: backend?.pm2_env?.status === 'online',
      pid: backend?.pid ?? null,
      restarts: backend?.pm2_env?.restart_time ?? 0,
      processes: list.map((p) => ({ name: p.name, pid: p.pid, status: p.pm2_env?.status }))
    };
  } catch (_e) {
    return { online: false, pid: null, restarts: null, processes: [] };
  }
}

function probeSshConnections() {
  try {
    const out = execSync('ss -tn state established 2>/dev/null | grep ":22 " || true', { encoding: 'utf8' });
    return out.trim().split('\n').filter(Boolean).length;
  } catch (_e) {
    return 0;
  }
}

function probeSecChain() {
  const modules = [
    'securityObservatory',
    'securityCorrelation',
    'securityAntiScanner',
    'securityExfiltrationDetection',
    'securitySOC',
    'securityRuntimeIntegrity'
  ];
  const results = {};
  for (const m of modules) {
    try {
      const p = require(path.join(ROOT, 'backend/src', m)).getAuditPayload?.();
      results[m] = p?.ok !== false;
    } catch (_e) {
      results[m] = false;
    }
  }
  return results;
}

function sampleOnce(state) {
  const mem = process.memoryUsage();
  const pm2 = probePm2();
  const alerts = [];

  if (pm2.pid && state.lastPid && pm2.pid !== state.lastPid) {
    alerts.push({ code: 'PM2_PID_CHANGED', from: state.lastPid, to: pm2.pid });
  }
  state.lastPid = pm2.pid;

  if (!pm2.online) alerts.push({ code: 'PM2_OFFLINE' });
  if (pm2.restarts != null && state.lastRestarts != null && pm2.restarts > state.lastRestarts) {
    alerts.push({ code: 'PM2_RESTART', count: pm2.restarts });
  }
  state.lastRestarts = pm2.restarts;

  const hashAlerts = checkCriticalHashes();
  alerts.push(...hashAlerts);

  const sshCount = probeSshConnections();
  if (sshCount > state.maxSsh) state.maxSsh = sshCount;

  const heapMb = mem.heapUsed / 1024 / 1024;
  const rssMb = mem.rss / 1024 / 1024;
  if (heapMb > LIMITS.maxHeapMb) alerts.push({ code: 'HEAP_HIGH', value: heapMb });
  if (rssMb > LIMITS.maxRssMb) alerts.push({ code: 'RSS_HIGH', value: rssMb });

  let integrityScore = null;
  try {
    const eng = require(path.join(ROOT, 'backend/src/securityRuntimeIntegrity/engine/integrityEngine'));
    const r = eng.runIntegrityCheck?.({ force: true });
    integrityScore = r?.integrityScore ?? null;
    if (integrityScore != null && integrityScore < LIMITS.minIntegrity) {
      alerts.push({ code: 'INTEGRITY_DEGRADED', value: integrityScore });
    }
  } catch (_e) {
    /* ignore */
  }

  const secChain = probeSecChain();
  if (Object.values(secChain).some((v) => !v)) {
    alerts.push({ code: 'SEC_CHAIN_PROBE_FAIL', detail: secChain });
  }

  return {
    ts: new Date().toISOString(),
    heapMb: Math.round(heapMb * 100) / 100,
    rssMb: Math.round(rssMb * 100) / 100,
    cpuLoad: os.loadavg()[0],
    pm2,
    sshConnections: sshCount,
    integrityScore,
    secChain,
    alerts,
    critical: alerts.some((a) => {
      if (a.code === 'INTEGRITY_DEGRADED' && a.value >= 0.93) return false;
      return ['CRITICAL_HASH_DRIFT', 'PM2_OFFLINE', 'INTEGRITY_DEGRADED', 'SEC_CHAIN_PROBE_FAIL'].includes(a.code);
    })
  };
}

function runPhase(durationMs, intervalMs, name, intensive, state) {
  const samples = [];
  const alerts = [];
  const start = Date.now();

  while (Date.now() - start < durationMs) {
    const s = sampleOnce(state);
    samples.push(s);
    if (s.alerts.length) alerts.push(...s.alerts.map((a) => ({ ...a, phase: name, ts: s.ts })));
    if (intensive && s.critical) {
      state.consecutiveCritical = (state.consecutiveCritical || 0) + 1;
      if (state.consecutiveCritical >= 2) {
        return { phase: name, samples, alerts, failed: true, reason: 'critical_alert_persistent' };
      }
    } else {
      state.consecutiveCritical = 0;
    }
    sleep(intervalMs);
  }
  return { phase: name, samples: samples.length, alerts, failed: alerts.some((a) => a.code === 'CRITICAL_HASH_DRIFT') };
}

function buildProductionSnapshot() {
  const pm2 = probePm2();
  let nginx = 'unknown';
  let postgres = 'unknown';
  try {
    nginx = execSync('systemctl is-active nginx 2>/dev/null || echo unknown', { encoding: 'utf8' }).trim();
  } catch (_e) {
    /* ignore */
  }
  try {
    postgres = execSync('pg_isready -h 127.0.0.1 -p 5432 2>/dev/null && echo ready || echo down', { encoding: 'utf8' }).trim();
  } catch (_e) {
    /* ignore */
  }

  const criticalHashes = {};
  for (const entry of parseManifest()) {
    const abs = entry.filePath.startsWith('/') ? entry.filePath : path.join(ROOT, entry.filePath);
    criticalHashes[entry.filePath] = sha256File(abs);
  }

  return {
    reportVersion: 'production_operational_snapshot_v1',
    capturedAt: new Date().toISOString(),
    gitHead: (() => {
      try {
        return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
      } catch (_e) {
        return 'unknown';
      }
    })(),
    hashes: criticalHashes,
    processes: pm2.processes,
    pm2,
    memory: process.memoryUsage(),
    cpu: { load: os.loadavg(), cpus: os.cpus().length },
    nginx: { status: nginx },
    postgresql: { status: postgres },
    security: { flags: 'post-promotion', secChain: probeSecChain() },
    enterprise: { version: 'v2', baseline: MANIFEST },
    runtime: { uptimeSec: Math.round(process.uptime()), nodeVersion: process.version }
  };
}

function main() {
  if (!fs.existsSync(EVIDENCE)) fs.mkdirSync(EVIDENCE, { recursive: true });

  waitForWarmup(FAST ? 10_000 : 90_000);

  const state = { lastPid: null, lastRestarts: null, maxSsh: 0, consecutiveCritical: 0 };
  const filesBefore = snapshotWatchDirs();

  console.log(`GO_LIVE_GUARD enhanced — Fase1=${PHASE1_MS}ms Fase2=${PHASE2_MS}ms fast=${FAST}`);

  const phase1 = runPhase(PHASE1_MS, INTERVAL_P1, 'PHASE_1_INTENSIVE', true, state);
  const filesAfter = snapshotWatchDirs();
  const fileIncidents = detectNewFiles(filesBefore, filesAfter);

  const phase2 = phase1.failed
    ? { skipped: true, reason: 'phase1_failed' }
    : runPhase(PHASE2_MS, INTERVAL_P2, 'PHASE_2_STABILIZATION', false, state);

  const failed = phase1.failed || fileIncidents.length > 0;
  const status = failed ? 'GO_LIVE_GUARD_FAILED' : 'GO_LIVE_GUARD_SUCCESS';

  const snapshot = buildProductionSnapshot();
  fs.writeFileSync(path.join(EVIDENCE, 'production-operational-snapshot.json'), JSON.stringify(snapshot, null, 2));

  const report = {
    mode: 'GO_LIVE_GUARD',
    status,
    phase1,
    phase2,
    fileIncidents,
    hashDriftAlerts: [...(phase1.alerts || []), ...(phase2.alerts || [])].filter((a) => a.code === 'CRITICAL_HASH_DRIFT'),
    sshMaxConnections: state.maxSsh,
    failed,
    autoAction: false,
    operators: ['Wellington', 'Gustavo'],
    completedAt: new Date().toISOString()
  };

  fs.writeFileSync(path.join(EVIDENCE, 'go-live-guard-report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(EVIDENCE, 'runtime-report.json'), JSON.stringify({ phase1, phase2, limits: LIMITS }, null, 2));

  console.log(JSON.stringify({ status, failed, fileIncidents: fileIncidents.length }, null, 2));
  process.exit(failed ? 1 : 0);
}

main();
