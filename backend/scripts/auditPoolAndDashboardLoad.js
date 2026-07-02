#!/usr/bin/env node
/**
 * Auditoria pré-alteração: pool PostgreSQL, carga /app, consultas lentas.
 * Não altera produção. Uso: node scripts/auditPoolAndDashboardLoad.js [email]
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { JWT_SECRET, JWT_ALGORITHMS } = require('../src/middleware/auth');
const db = require('../src/db');

const BASE = `http://127.0.0.1:${process.env.PORT || 4000}/api`;
const EMAIL = process.argv[2] || 'GabrielZonta@Impetusvrb.com.br';

/** Endpoints disparados na abertura típica de /app (coordenador manutenção). */
const DASHBOARD_BOOT_ENDPOINTS = [
  { method: 'GET', path: '/dashboard/me', label: 'useVisibleModules' },
  { method: 'GET', path: '/companies/me', label: 'Layout subscription' },
  { method: 'GET', path: '/app-communications/notifications/unread-count', label: 'NotificationCenter' },
  { method: 'GET', path: '/app-communications/notifications', params: { limit: 15, offset: 0 }, label: 'NotificationCenter list' },
  { method: 'GET', path: '/live-dashboard/state', label: 'Máquina do Tempo / painel vivo' },
  { method: 'GET', path: '/live-dashboard/snapshots', params: { limit: 24 }, label: 'Máquina do Tempo snapshots' },
  { method: 'GET', path: '/dashboard/cognitive-pulse', label: 'CognitivePulse' },
  { method: 'GET', path: '/quality-navigation/context', label: 'Layout menu publication' },
  { method: 'GET', path: '/safety-navigation/context', label: 'Layout menu publication' },
  { method: 'GET', path: '/logistics-navigation/context', label: 'Layout menu publication' },
  { method: 'GET', path: '/environment-navigation/context', label: 'Layout menu publication' },
  { method: 'GET', path: '/pulse/supervisor/pending', label: 'Pulse supervisor' },
  { method: 'GET', path: '/pulse/me/prompt', label: 'Impetus Pulse' },
  { method: 'GET', path: '/dashboard/maintenance/summary', label: 'DashboardMecanico' },
  { method: 'GET', path: '/dashboard/maintenance/cards', label: 'DashboardMecanico' },
  { method: 'GET', path: '/dashboard/maintenance/my-tasks', label: 'DashboardMecanico' },
  { method: 'GET', path: '/dashboard/maintenance/machines-attention', label: 'DashboardMecanico' },
  { method: 'GET', path: '/dashboard/maintenance/interventions', label: 'DashboardMecanico' },
  { method: 'GET', path: '/dashboard/maintenance/preventives-board', label: 'DashboardMecanico' },
  { method: 'GET', path: '/dashboard/maintenance/recurring-failures', label: 'DashboardMecanico' },
  { method: 'POST', path: '/anam/prepare', label: 'Anam prepare' },
  { method: 'GET', path: '/anam/public-config', label: 'Anam config' }
];

function poolConfig() {
  return {
    DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX, 10) || 20,
    DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN, 10) || 2,
    DB_POOL_CONNECT_TIMEOUT_MS: parseInt(process.env.DB_POOL_CONNECT_TIMEOUT, 10) || 10000
  };
}

async function pgSnapshot(label) {
  const [settings, byState, impetusConns, pool] = await Promise.all([
    db.query(`SELECT name, setting::int AS value FROM pg_settings WHERE name IN ('max_connections','superuser_reserved_connections')`),
    db.query(`SELECT state, count(*)::int AS c FROM pg_stat_activity WHERE datname = current_database() GROUP BY state ORDER BY c DESC`),
    db.query(`SELECT count(*)::int AS c FROM pg_stat_activity WHERE datname = current_database() AND application_name LIKE '%node%'`),
    Promise.resolve(db.getPoolStats())
  ]);
  return {
    label,
    at: new Date().toISOString(),
    poolConfig: poolConfig(),
    poolStats: pool,
    pgMaxConnections: settings.rows.find((r) => r.name === 'max_connections')?.value,
    pgActivityByState: byState.rows,
    pgNodeConnections: impetusConns.rows[0]?.c ?? 0
  };
}

async function slowQueriesTop(limit = 15) {
  try {
    const ext = await db.query(`SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'`);
    if (!ext.rows.length) return { available: false, rows: [] };
    const r = await db.query(
      `SELECT
         LEFT(query, 120) AS query_sample,
         calls::int,
         ROUND(mean_exec_time::numeric, 2) AS mean_ms,
         ROUND(max_exec_time::numeric, 2) AS max_ms,
         ROUND(total_exec_time::numeric, 2) AS total_ms
       FROM pg_stat_statements
       WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
       ORDER BY mean_exec_time DESC
       LIMIT $1`,
      [limit]
    );
    return { available: true, rows: r.rows };
  } catch (e) {
    return { available: false, error: e.message, rows: [] };
  }
}

async function auditPoolConnectLeaks() {
  const { execSync } = require('child_process');
  const root = path.join(__dirname, '../src');
  let raw = '';
  try {
    raw = execSync(`rg -l "pool\\.connect" "${root}"`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch {
    return { filesWithConnect: 0, suspects: [] };
  }
  const files = raw.trim().split('\n').filter(Boolean);
  const suspects = [];
  for (const f of files) {
    const fs = require('fs');
    const src = fs.readFileSync(f, 'utf8');
    const connects = (src.match(/pool\.connect\(/g) || []).length;
    const releases = (src.match(/\.release\(/g) || []).length;
    const finallyBlocks = (src.match(/finally\s*\{/g) || []).length;
    if (connects > releases) {
      suspects.push({ file: path.relative(path.join(__dirname, '..'), f), connects, releases, finallyBlocks });
    }
  }
  return { filesWithConnect: files.length, suspects };
}

async function simulateDashboardBurst(token) {
  const headers = { Authorization: `Bearer ${token}` };
  const before = await pgSnapshot('before_burst');
  const t0 = Date.now();
  const results = await Promise.all(
    DASHBOARD_BOOT_ENDPOINTS.map(async (ep) => {
      const started = Date.now();
      try {
        const res = await axios({
          method: ep.method,
          url: BASE + ep.path,
          headers,
          params: ep.params,
          data: ep.method === 'POST' ? {} : undefined,
          validateStatus: () => true,
          timeout: 30000
        });
        return {
          label: ep.label,
          path: ep.path,
          status: res.status,
          ms: Date.now() - started,
          ok: res.status >= 200 && res.status < 300
        };
      } catch (e) {
        return {
          label: ep.label,
          path: ep.path,
          status: e.response?.status || 0,
          ms: Date.now() - started,
          ok: false,
          error: e.code || e.message
        };
      }
    })
  );
  const during = await pgSnapshot('after_burst');
  const peakPool = during.poolStats;
  const failures = results.filter((r) => !r.ok);
  const slow = [...results].sort((a, b) => b.ms - a.ms).slice(0, 8);
  return {
    parallelRequests: DASHBOARD_BOOT_ENDPOINTS.length,
    totalMs: Date.now() - t0,
    before,
    during,
    peakWaitingCount: peakPool.waitingCount,
    peakTotalCount: peakPool.totalCount,
    failures,
    slowest: slow,
    statusHistogram: results.reduce((acc, r) => {
      const k = String(r.status);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  };
}

async function main() {
  const userRes = await db.query('SELECT id, email, role, company_id FROM users WHERE email = $1 LIMIT 1', [EMAIL]);
  const user = userRes.rows[0];
  if (!user) throw new Error('User not found: ' + EMAIL);

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, company_id: user.company_id },
    JWT_SECRET,
    { expiresIn: '1h', algorithm: (JWT_ALGORITHMS && JWT_ALGORITHMS[0]) || 'HS256' }
  );
  const expiresAt = new Date(Date.now() + 3600000);
  await db.query('INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt]);

  const baseline = await pgSnapshot('baseline_idle');
  const burst1 = await simulateDashboardBurst(token);
  await new Promise((r) => setTimeout(r, 2000));
  const burst2 = await simulateDashboardBurst(token);
  const leaks = await auditPoolConnectLeaks();
  const slow = await slowQueriesTop(12);

  const report = {
    auditedAt: new Date().toISOString(),
    user: { email: user.email, role: user.role },
    baseline,
    burst1,
    burst2,
    poolConnectAudit: leaks,
    slowQueries: slow,
    dashboardEndpointCount: DASHBOARD_BOOT_ENDPOINTS.length,
    backendBootMetrics: null,
    hypothesis: {}
  };

  try {
    const axios = require('axios');
    const bm = await axios.get(`${BASE.replace(/\/api$/, '')}/api/system/boot-metrics`, { timeout: 5000 });
    report.backendBootMetrics = bm.data;
  } catch (_) { /* optional */ }

  const w1 = burst1.peakWaitingCount || 0;
  const w2 = burst2.peakWaitingCount || 0;
  const maxPool = burst1.before.poolConfig.DB_POOL_MAX;
  const peakTotal = Math.max(burst1.peakTotalCount || 0, burst2.peakTotalCount || 0);
  const had503 = [...(burst1.failures || []), ...(burst2.failures || [])].some((f) => f.status === 503);
  const hadTimeout = [...(burst1.failures || []), ...(burst2.failures || [])].some((f) =>
    String(f.error || '').includes('ECONNABORTED')
  );

  report.hypothesis = {
    poolMaxConfigured: maxPool,
    peakPoolTotalObserved: peakTotal,
    peakWaitingCountObserved: Math.max(w1, w2),
    poolSaturatedDuringBurst: peakTotal >= maxPool || Math.max(w1, w2) > 0,
    observed503InBurst: had503,
    observedClientTimeout: hadTimeout,
    pgNodeConnectionsAtBaseline: baseline.pgNodeConnections,
    leakSuspectsCount: leaks.suspects.length
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
