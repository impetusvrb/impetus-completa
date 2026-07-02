#!/usr/bin/env node
/**
 * Fase 1.1 — Validação de produção e stress controlado.
 * Uso: node scripts/validateProductionBoot.js [--users=1,2,3,5]
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { JWT_SECRET, JWT_ALGORITHMS } = require('../src/middleware/auth');
const db = require('../src/db');

const BASE = `http://127.0.0.1:${process.env.PORT || 4000}/api`;
const USER_CONCURRENCY = (process.argv.find((a) => a.startsWith('--users=')) || '--users=1,2,3,5')
  .split('=')[1]
  .split(',')
  .map((n) => parseInt(n, 10))
  .filter((n) => n > 0);

const TEST_USERS = [
  { email: 'admin@impetus.com', label: 'admin' },
  { email: 'jucileiaj5san@gmail.com', label: 'ceo' },
  { email: 'GabrielZonta@Impetusvrb.com.br', label: 'coordenador_manutencao' },
  { email: 'operadoresenvase@gmail.com', label: 'operador' },
  { email: 'GabrielZonta@Impetusvrb.com.br', label: 'coordenador_dup' }
];

const WAVE1 = [{ method: 'GET', path: '/dashboard/me', label: 'dashboard_me' }];
const WAVE2 = [
  { method: 'GET', path: '/companies/me', label: 'companies_me' },
  { method: 'GET', path: '/app-communications/notifications/unread-count', label: 'notif_count' },
  { method: 'GET', path: '/dashboard/cognitive-pulse', label: 'cognitive_pulse' },
  { method: 'GET', path: '/live-dashboard/state', label: 'live_state' },
  { method: 'GET', path: '/quality-navigation/context', label: 'nav_quality' },
  { method: 'GET', path: '/safety-navigation/context', label: 'nav_safety' }
];
const WAVE3 = [
  { method: 'GET', path: '/live-dashboard/snapshots', params: { limit: 24 }, label: 'live_snapshots' },
  { method: 'GET', path: '/logistics-navigation/context', label: 'nav_logistics' },
  { method: 'GET', path: '/environment-navigation/context', label: 'nav_environment' },
  { method: 'GET', path: '/pulse/me/prompt', label: 'pulse_prompt' },
  { method: 'GET', path: '/dashboard/maintenance/summary', label: 'maint_summary' }
];

function pct(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
  return Math.round(s[i]);
}

function summarizeLatencies(rows) {
  const ms = rows.map((r) => r.ms).filter((n) => Number.isFinite(n));
  if (!ms.length) return { count: 0, mean_ms: 0, p50_ms: 0, p95_ms: 0, p99_ms: 0, max_ms: 0 };
  const sum = ms.reduce((a, b) => a + b, 0);
  return {
    count: ms.length,
    mean_ms: Math.round(sum / ms.length),
    p50_ms: pct(ms, 50),
    p95_ms: pct(ms, 95),
    p99_ms: pct(ms, 99),
    max_ms: Math.max(...ms)
  };
}

async function fetchBootMetrics() {
  try {
    const r = await axios.get(`${BASE}/system/boot-metrics`, { timeout: 5000 });
    return r.data;
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function pgSnapshot() {
  const [byState, nodeConns, pool] = await Promise.all([
    db.query(`SELECT state, count(*)::int AS c FROM pg_stat_activity WHERE datname = current_database() GROUP BY state`),
    db.query(`SELECT count(*)::int AS c FROM pg_stat_activity WHERE datname = current_database() AND application_name LIKE '%node%'`),
    Promise.resolve(db.getPoolStats())
  ]);
  return {
    pool,
    pgActivityByState: byState.rows,
    pgNodeConnections: nodeConns.rows[0]?.c ?? 0
  };
}

async function tokenForUser(email) {
  const u = (await db.query('SELECT id, email, role, company_id FROM users WHERE email = $1 AND active = true LIMIT 1', [email])).rows[0];
  if (!u) return null;
  const token = jwt.sign(
    { id: u.id, email: u.email, role: u.role, company_id: u.company_id },
    JWT_SECRET,
    { expiresIn: '1h', algorithm: (JWT_ALGORITHMS && JWT_ALGORITHMS[0]) || 'HS256' }
  );
  return { token, user: u };
}

async function hitEndpoint(token, ep) {
  const started = Date.now();
  try {
    const res = await axios({
      method: ep.method,
      url: BASE + ep.path,
      headers: { Authorization: `Bearer ${token}` },
      params: ep.params,
      data: ep.method === 'POST' ? {} : undefined,
      validateStatus: () => true,
      timeout: 30000
    });
    return { label: ep.label, path: ep.path, status: res.status, ms: Date.now() - started, ok: res.status >= 200 && res.status < 300 };
  } catch (e) {
    return { label: ep.label, path: ep.path, status: e.response?.status || 0, ms: Date.now() - started, ok: false, error: e.code || e.message };
  }
}

/** Simula boot pós-Fase 1 (ondas). */
async function simulateWavedBoot(token) {
  const t0 = Date.now();
  let peakConcurrent = 0;
  let current = 0;
  const all = [];

  async function wave(eps) {
    const results = await Promise.all(
      eps.map(async (ep) => {
        current += 1;
        peakConcurrent = Math.max(peakConcurrent, current);
        try {
          return await hitEndpoint(token, ep);
        } finally {
          current -= 1;
        }
      })
    );
    all.push(...results);
    return results;
  }

  const w1 = await wave(WAVE1);
  await new Promise((r) => setTimeout(r, 80));
  const w2 = await wave(WAVE2);
  await new Promise((r) => setTimeout(r, 120));
  await wave(WAVE3.slice(0, 2));
  await new Promise((r) => setTimeout(r, 120));
  await wave(WAVE3.slice(2));

  const failures = all.filter((r) => !r.ok);
  const status503 = all.filter((r) => r.status === 503);
  return {
    totalMs: Date.now() - t0,
    peakConcurrent,
    requestCount: all.length,
    failures,
    status503,
    dashboardMe: all.find((r) => r.label === 'dashboard_me'),
    liveState: all.find((r) => r.label === 'live_state'),
    liveSnapshots: all.find((r) => r.label === 'live_snapshots'),
    all,
    wave1: summarizeLatencies(w1),
    wave2: summarizeLatencies(w2)
  };
}

/** Simula boot legado (tudo paralelo) para comparativo. */
async function simulateLegacyParallelBoot(token) {
  const allEps = [...WAVE1, ...WAVE2, ...WAVE3];
  const t0 = Date.now();
  const results = await Promise.all(allEps.map((ep) => hitEndpoint(token, ep)));
  const failures = results.filter((r) => !r.ok);
  return {
    totalMs: Date.now() - t0,
    peakConcurrent: allEps.length,
    requestCount: results.length,
    failures,
    status503: results.filter((r) => r.status === 503),
    dashboardMe: results.find((r) => r.label === 'dashboard_me'),
    all: results
  };
}

async function runConcurrencyLevel(nUsers) {
  const users = [];
  for (let i = 0; i < nUsers; i++) {
    const spec = TEST_USERS[i % TEST_USERS.length];
    const t = await tokenForUser(spec.email);
    if (t) users.push({ ...t, label: spec.label });
  }
  if (!users.length) throw new Error('Nenhum utilizador de teste encontrado');

  const before = await pgSnapshot();
  const bootMetricsBefore = await fetchBootMetrics();
  const t0 = Date.now();

  const runs = await Promise.all(users.map((u) => simulateWavedBoot(u.token)));
  const after = await pgSnapshot();
  const bootMetricsAfter = await fetchBootMetrics();

  const allResults = runs.flatMap((r) => r.all);
  const all503 = runs.flatMap((r) => r.status503);
  const dashboardMeTimes = runs.map((r) => r.dashboardMe?.ms).filter(Boolean);

  return {
    concurrentUsers: nUsers,
    users: users.map((u) => ({ email: u.user.email, role: u.user.role, label: u.label })),
    elapsedMs: Date.now() - t0,
    peakConcurrentPerUser: Math.max(...runs.map((r) => r.peakConcurrent)),
    totalRequests: runs.reduce((a, r) => a + r.requestCount, 0),
    failures: runs.flatMap((r) => r.failures),
    http503Count: all503.length,
    dashboardMe: summarizeLatencies(dashboardMeTimes.map((ms) => ({ ms }))),
    liveState: summarizeLatencies(runs.map((r) => r.liveState).filter(Boolean)),
    liveSnapshots: summarizeLatencies(runs.map((r) => r.liveSnapshots).filter(Boolean)),
    bootTotalMs: summarizeLatencies(runs.map((r) => ({ ms: r.totalMs }))),
    poolBefore: before.pool,
    poolAfter: after.pool,
    pgNodeConnectionsBefore: before.pgNodeConnections,
    pgNodeConnectionsAfter: after.pgNodeConnections,
    bootMetricsBefore,
    bootMetricsAfter
  };
}

async function countLogPatterns() {
  const { execSync } = require('child_process');
  const patterns = {
    pool_pressure: 'POOL_PRESSURE',
    session_timeout: 'VALIDATE_SESSION_ERROR.*timeout',
    slo_burn: 'SLO_BURN_CRITICAL'
  };
  const out = {};
  const errLog = '/root/.pm2/logs/impetus-backend-error.log';
  for (const [key, pat] of Object.entries(patterns)) {
    try {
      out[key] = parseInt(execSync(`rg -c "${pat}" "${errLog}" 2>/dev/null || echo 0`, { encoding: 'utf8' }).trim(), 10) || 0;
    } catch {
      out[key] = 0;
    }
  }
  try {
    out.nginx_503_608 = parseInt(execSync(`rg -c ' 503 608' /var/log/nginx/access.log 2>/dev/null || echo 0`, { encoding: 'utf8' }).trim(), 10) || 0;
  } catch {
    out.nginx_503_608 = null;
  }
  return out;
}

async function main() {
  const health = await axios.get(`${BASE.replace('/api', '')}/health`, { timeout: 5000, validateStatus: () => true }).catch(() => null);
  if (!health || health.status >= 500) {
    console.error(JSON.stringify({ ok: false, error: 'Backend indisponível em ' + BASE }));
    process.exit(2);
  }

  const baselineLogs = await countLogPatterns();
  const baselinePool = await pgSnapshot();
  const baselineBootMetrics = await fetchBootMetrics();

  // Comparativo legado vs ondas (1 utilizador)
  const primary = await tokenForUser('GabrielZonta@Impetusvrb.com.br');
  let legacyCompare = null;
  let wavedSingle = null;
  if (primary) {
    await new Promise((r) => setTimeout(r, 1500));
    legacyCompare = await simulateLegacyParallelBoot(primary.token);
    await new Promise((r) => setTimeout(r, 2000));
    wavedSingle = await simulateWavedBoot(primary.token);
  }

  const concurrencyResults = [];
  for (const n of USER_CONCURRENCY) {
    const r = await runConcurrencyLevel(n);
    concurrencyResults.push(r);
    await new Promise((res) => setTimeout(res, 2500));
  }

  const postLogs = await countLogPatterns();

  const report = {
    ok: true,
    auditedAt: new Date().toISOString(),
    phase: '1.1_production_validation',
    dbPoolMax: parseInt(process.env.DB_POOL_MAX, 10) || 20,
    baseline: {
      pool: baselinePool.pool,
      pgNodeConnections: baselinePool.pgNodeConnections,
      bootMetrics: baselineBootMetrics,
      logs: baselineLogs
    },
    singleUserCompare: primary
      ? {
          legacyParallel: {
            totalMs: legacyCompare.totalMs,
            peakConcurrent: legacyCompare.peakConcurrent,
            http503: legacyCompare.status503.length,
            dashboardMeMs: legacyCompare.dashboardMe?.ms,
            failures: legacyCompare.failures.length
          },
          wavedBoot: {
            totalMs: wavedSingle.totalMs,
            peakConcurrent: wavedSingle.peakConcurrent,
            http503: wavedSingle.status503.length,
            dashboardMeMs: wavedSingle.dashboardMe?.ms,
            failures: wavedSingle.failures.length
          }
        }
      : null,
    concurrencyTests: concurrencyResults,
    logsAfter: postLogs,
    logsDelta: {
      pool_pressure: postLogs.pool_pressure - baselineLogs.pool_pressure,
      session_timeout: postLogs.session_timeout - baselineLogs.session_timeout,
      slo_burn: postLogs.slo_burn - baselineLogs.slo_burn,
      nginx_503_608: postLogs.nginx_503_608 != null && baselineLogs.nginx_503_608 != null
        ? postLogs.nginx_503_608 - baselineLogs.nginx_503_608
        : null
    }
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message, stack: e.stack }));
  process.exit(1);
});
