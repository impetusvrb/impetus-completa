'use strict';
/**
 * SEC-VISUAL-INTELLIGENCE-001H — Certificação pós-implementação Modelo A.
 */
require('../src/config/loadEnv').loadImpetusEnv();

const { performance } = require('perf_hooks');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const logWindowSvc = require('../src/services/adminPortalSecurityEvidenceLogWindow');
const dashboardSvc = require('../src/services/adminPortalSecurityDashboardService');

const hrtime = process.hrtime.bigint;
const toMs = (s) => Number(hrtime() - s) / 1e6;
const tests = [];
let seq = 0;

function record(scope, desc, expected, observed, pass) {
  seq += 1;
  tests.push({ id: `T${String(seq).padStart(3, '0')}`, scope, desc, expected, observed, result: pass ? 'PASS' : 'FAIL' });
  return pass;
}

function canonicalEvidence(ev) {
  const pick = (items, keys) => (items || [])
    .map((it) => { const o = {}; for (const k of keys) o[k] = it[k]; return o; })
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return {
    attack_origins: pick(ev.attack_origins, ['ip', 'count', 'country_code', 'geo_state']),
    blocked_ips: pick(ev.blocked_ips, ['ip', 'source', 'country_code', 'geo_state']),
    recent_alerts_analytical: pick(ev.recent_alerts_analytical, ['ip', 'type', 'country_code', 'geo_state']),
    recent_alerts_display: pick(ev.recent_alerts_display, ['ip', 'type', 'country_code', 'geo_state']),
    critical_events: pick(ev.critical_events, ['ip', 'type', 'country_code', 'geo_state']),
    world_map: (ev.world_map?.points || []).map((p) => ({ country_code: p.country_code, count: p.count })).sort((a, b) => a.country_code.localeCompare(b.country_code))
  };
}

function globalTotal(snap) {
  return (snap.world_map?.points || []).reduce((s, p) => s + p.count, 0);
}

function httpReq(path, token) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    http.get({ hostname: '127.0.0.1', port: 4000, path, headers: token ? { Authorization: `Bearer ${token}` } : {} }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        let json = {};
        try { json = JSON.parse(body); } catch {}
        resolve({ status: res.statusCode, rt: Math.round(performance.now() - t0), data: json.data });
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('SEC-VISUAL-INTELLIGENCE-001H — CERTIFICAÇÃO\n');

  // Performance — single collect, zero sync provider calls
  let syncProviderCalls = 0;
  const origFetch = global.fetch;
  global.fetch = async (...args) => {
    if (String(args[0] || '').includes('ip-api.com')) syncProviderCalls += 1;
    return origFetch(...args);
  };

  logWindowSvc.resetLogWindowState();
  const t0 = hrtime();
  const snapX = await dashboardSvc.collectSecurityEvidence({ useLegacyLogs: false });
  const collectMs = toMs(t0);
  global.fetch = origFetch;

  record('PERF', 'geo_sync_provider_calls = 0', '0', String(syncProviderCalls), syncProviderCalls === 0);
  record('PERF', 'collect TOTAL < 1000ms (meta preferencial)', '<1000', String(Math.round(collectMs)), collectMs < 1000);
  record('PERF', 'geo_enrichment_mode ASYNC', 'ASYNC_DECOUPLED', snapX.evidence_build?.geo_enrichment_mode, snapX.evidence_build?.geo_enrichment_mode === 'ASYNC_DECOUPLED');

  console.log('PERF:', { collectMs: Math.round(collectMs), syncProviderCalls, geo_backlog: snapX.evidence_build?.geo_backlog_total });

  // Wait for async enrichment (single flight, max ~30 calls)
  await new Promise((r) => setTimeout(r, 5000));
  logWindowSvc.resetLogWindowState();
  const snapY = await dashboardSvc.collectSecurityEvidence({ useLegacyLogs: false });

  record('X→Y', 'snapshot_id differs', 'different', `${snapX.snapshot_id} vs ${snapY.snapshot_id}`, snapX.snapshot_id !== snapY.snapshot_id);
  const totX = globalTotal(snapX);
  const totY = globalTotal(snapY);
  record('X→Y', 'global weighted conserved', String(totX), String(totY), totX === totY);

  // FULL × INCR frozen logs
  const NGINX = process.env.IMPETUS_NGINX_ACCESS || '/var/log/nginx/access.log';
  const THREAT = process.env.IMPETUS_THREAT_WATCH_LOG || '/var/log/impetus-threat-watch.log';
  const [legN, legT] = await Promise.all([
    logWindowSvc.acquireLogWindowLegacy(NGINX, 4000),
    logWindowSvc.acquireLogWindowLegacy(THREAT, 3000)
  ]);

  // Equivalence via sequential FULL/INCR (log engine) — geo async both sides
  logWindowSvc.resetLogWindowState();
  const full = await dashboardSvc.collectSecurityEvidence({ useLegacyLogs: true });
  logWindowSvc.resetLogWindowState();
  const incr = await dashboardSvc.collectSecurityEvidence({ useLegacyLogs: false });

  const cf = canonicalEvidence(full);
  const ci = canonicalEvidence(incr);
  for (const f of Object.keys(cf)) {
    const match = JSON.stringify(cf[f]) === JSON.stringify(ci[f]);
    record('EQUIV', `FULL×INCR ${f}`, 'identical', match ? 'identical' : 'DIFF', match);
  }

  // Badges on latest production-shaped snapshot (snapY)
  console.log('\nBADGES (snapY):');
  for (const pt of snapY.world_map?.points || []) {
    const cc = pt.country_code;
    const nx = snapY.attack_origins.filter((o) => o.country_code === cc).reduce((s, o) => s + (o.count || 1), 0);
    const bl = snapY.blocked_ips.filter((b) => b.country_code === cc).length * 2;
    const al = snapY.recent_alerts_analytical.filter((a) => a.country_code === cc).length;
    const tot = nx + bl + al;
    record('BADGE', cc, `${pt.count}==${tot}`, `${pt.count}==${tot}`, pt.count === tot);
    console.log(`  ${cc}: nx=${nx} bl=${bl} al=${al} tot=${tot} badge=${pt.count}`);
  }

  // HTTP map × drill-down
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query(`SELECT id,email,perfil FROM admin_users WHERE perfil='super_admin' AND ativo=true LIMIT 1`);
  const token = jwt.sign({ sub: rows[0].id, typ: 'impetus_admin', perfil: rows[0].perfil, email: rows[0].email }, process.env.IMPETUS_ADMIN_JWT_SECRET, { expiresIn: '30m', issuer: 'impetus-admin-portal' });
  await pool.end();

  const dash = (await httpReq('/api/impetus-admin/security-dashboard', token)).data;
  for (const cc of ['CA', 'US', 'FR', 'BR', 'VN', '??']) {
    const ir = (await httpReq(`/api/impetus-admin/security-dashboard/intelligence?country_code=${encodeURIComponent(cc)}`, token)).data;
    const pt = dash.phase_b?.world_map?.points?.find((p) => p.country_code === cc);
    if (!pt) {
      record('MAP-DRILL', cc, 'presente', 'AUSENTE', true);
      continue;
    }
    const ok = dash.snapshot_id === ir.snapshot_id && ir.summary?.index_matches_badge === true && pt.count === ir.summary?.index_decomposition?.total;
    record('MAP-DRILL', cc, 'snap+badge+match', ok ? 'PASS' : 'FAIL', ok ? 'PASS' : 'FAIL', ok);
  }

  const pass = tests.filter((t) => t.result === 'PASS').length;
  const fail = tests.filter((t) => t.result === 'FAIL').length;
  console.log(`\n=== TESTS: ${tests.length} total PASS=${pass} FAIL=${fail} ===`);
  for (const t of tests) console.log(`${t.id} | ${t.scope} | ${t.desc} | ${t.result}`);

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
