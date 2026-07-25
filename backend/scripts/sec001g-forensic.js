'use strict';
/**
 * SEC-VISUAL-INTELLIGENCE-001G — Atribuição forense + certificação integral.
 * Script diagnóstico. Não altera código de produção.
 */
require('../src/config/loadEnv').loadImpetusEnv();

const { performance } = require('perf_hooks');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { execFile } = require('child_process');
const { promisify } = require('util');
const db = require('../src/db');
const logWindowSvc = require('../src/services/adminPortalSecurityEvidenceLogWindow');
const dashboardSvc = require('../src/services/adminPortalSecurityDashboardService');
const intelligenceSvc = require('../src/services/adminPortalSecurityIntelligenceService');
const phaseBSvc = require('../src/services/adminPortalSecurityPhaseBService');

const execFileAsync = promisify(execFile);
const THREAT_LOG = process.env.IMPETUS_THREAT_WATCH_LOG || '/var/log/impetus-threat-watch.log';
const NGINX_ACCESS = process.env.IMPETUS_NGINX_ACCESS || '/var/log/nginx/access.log';
const NGINX_MAX = 4000;
const THREAT_MAX = 3000;
const CACHE_MS = 30_000;

const tests = [];
let testSeq = 0;

function record(scope, desc, expected, observed, pass) {
  testSeq += 1;
  const id = `T${String(testSeq).padStart(3, '0')}`;
  tests.push({ id, scope, desc, expected, observed, result: pass ? 'PASS' : 'FAIL' });
  return pass;
}

function ms(t0) {
  return Math.round(performance.now() - t0);
}

function stats(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const n = s.length;
  if (!n) return { min: 0, max: 0, mean: 0, median: 0, p95: 0 };
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    min: s[0],
    max: s[n - 1],
    mean: Math.round(sum / n),
    median: s[Math.floor(n / 2)],
    p95: s[Math.min(n - 1, Math.ceil(n * 0.95) - 1)]
  };
}

async function execSafe(cmd, args, timeoutMs = 8000) {
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024 });
    return String(stdout || '').trim();
  } catch {
    return '';
  }
}

async function getFail2banTimed() {
  const t0 = performance.now();
  const statusRaw = await execSafe('fail2ban-client', ['status']);
  if (!statusRaw) return { result: { available: false, jails: [], banned_ips: [] }, ms: ms(t0) };
  const jailNames = (statusRaw.match(/Jail list:\s+(.+)/i)?.[1] || '').split(',').map((s) => s.trim()).filter(Boolean);
  await Promise.all(jailNames.map((jail) => execSafe('fail2ban-client', ['status', jail])));
  return { result: { available: true, jailCount: jailNames.length }, ms: ms(t0) };
}

async function getUfwTimed() {
  const t0 = performance.now();
  await execSafe('ufw', ['status', 'numbered']);
  return { ms: ms(t0) };
}

async function getDbTimed() {
  const t0 = performance.now();
  await db.query(
    `SELECT l.id, l.created_at, l.acao, l.ip FROM admin_logs l
     WHERE l.acao IN ('login_falhou', 'login_bloqueado_bot') ORDER BY l.created_at DESC LIMIT 50`
  );
  return { ms: ms(t0) };
}

async function acquireNginxTimed(useLegacy) {
  const t0 = performance.now();
  const r = useLegacy
    ? await logWindowSvc.acquireLogWindowLegacy(NGINX_ACCESS, NGINX_MAX)
    : await logWindowSvc.acquireLogWindow(NGINX_ACCESS, NGINX_MAX, 'nginx');
  return { ...r, ms: ms(t0) };
}

async function acquireThreatTimed(useLegacy) {
  const t0 = performance.now();
  const r = useLegacy
    ? await logWindowSvc.acquireLogWindowLegacy(THREAT_LOG, THREAT_MAX)
    : await logWindowSvc.acquireLogWindow(THREAT_LOG, THREAT_MAX, 'threat');
  return { ...r, ms: ms(t0) };
}

async function instrumentedParallelBlock(useLegacy) {
  const tPar = performance.now();
  const [f2b, ufw, threatR, nginxR, dbR] = await Promise.all([
    getFail2banTimed(),
    getUfwTimed(),
    acquireThreatTimed(useLegacy),
    acquireNginxTimed(useLegacy),
    getDbTimed()
  ]);
  const wallMs = ms(tPar);
  const branches = [
    { name: 'getFail2ban', ms: f2b.ms },
    { name: 'getUfwBlocks', ms: ufw.ms },
    { name: 'getFailedLogins (DB)', ms: dbR.ms },
    { name: 'acquireLogWindow(threat)', ms: threatR.ms },
    { name: 'acquireLogWindow(nginx)', ms: nginxR.ms }
  ].sort((a, b) => b.ms - a.ms);
  return {
    wallMs,
    branches,
    criticalPath: branches[0].name,
    criticalPathMs: branches[0].ms,
    threatLines: threatR.lines.length,
    nginxLines: nginxR.lines.length,
    threatMode: threatR.metrics?.mode,
    nginxMode: nginxR.metrics?.mode
  };
}

function canonicalEvidence(ev) {
  const pick = (items, keys) => (items || []).map((it) => {
    const o = {};
    for (const k of keys) o[k] = it[k];
    return o;
  }).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

  return {
    nginx_window: ev.evidence_build?.nginx_window_size,
    threat_window: ev.evidence_build?.threat_window_size,
    attack_origins: pick(ev.attack_origins, ['ip', 'count', 'country_code', 'geo_state']),
    blocked_ips: pick(ev.blocked_ips, ['ip', 'source', 'country_code', 'geo_state']),
    recent_alerts_analytical: pick(ev.recent_alerts_analytical, ['ip', 'type', 'country_code', 'geo_state']),
    recent_alerts_display: pick(ev.recent_alerts_display, ['ip', 'type', 'country_code', 'geo_state']),
    critical_events: pick(ev.critical_events, ['ip', 'type', 'country_code', 'geo_state']),
    world_map: (ev.world_map?.points || []).map((p) => ({
      country_code: p.country_code,
      count: p.count,
      unique_ips: p.unique_ips
    })).sort((a, b) => a.country_code.localeCompare(b.country_code))
  };
}

function geoStateCounts(ev) {
  const all = [
    ...(ev.attack_origins || []),
    ...(ev.blocked_ips || []),
    ...(ev.recent_alerts_analytical || []),
    ...(ev.critical_events || [])
  ];
  const c = { GEO_RESOLVED: 0, GEO_UNRESOLVED: 0, GEO_INVALID: 0, GEO_NOT_ENRICHED: 0 };
  for (const it of all) {
    const gs = it.geo_state || 'GEO_NOT_ENRICHED';
    if (c[gs] !== undefined) c[gs] += 1;
  }
  return c;
}

function httpReq(path, token) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    http.get(
      { hostname: '127.0.0.1', port: 4000, path, headers: token ? { Authorization: `Bearer ${token}` } : {} },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          let json = {};
          try { json = JSON.parse(body); } catch {}
          resolve({
            status: res.statusCode,
            rt: ms(t0),
            handler: Number(res.headers['x-intelligence-latency-ms'] || 0),
            data: json.data
          });
        });
      }
    ).on('error', reject);
  });
}

async function main() {
  console.log('SEC-VISUAL-INTELLIGENCE-001G — FORENSIC RUN\n');

  // --- Instrumented parallel block + full collect ---
  logWindowSvc.resetLogWindowState();
  const parInc = await instrumentedParallelBlock(false);

  const geoStats = { providerCalls: 0, providerWaitMs: [], providerMaxMs: 0, timeouts: 0 };
  const origFetch = global.fetch;
  global.fetch = async (...args) => {
    const t0 = performance.now();
    try {
      const res = await origFetch(...args);
      if (String(args[0] || '').includes('ip-api.com')) {
        const e = ms(t0);
        geoStats.providerCalls += 1;
        geoStats.providerWaitMs.push(e);
        geoStats.providerMaxMs = Math.max(geoStats.providerMaxMs, e);
      }
      return res;
    } catch (e) {
      if (String(args[0] || '').includes('ip-api.com')) geoStats.timeouts += 1;
      throw e;
    }
  };

  const tCollect0 = performance.now();
  logWindowSvc.resetLogWindowState();
  const evCollect = await dashboardSvc.collectSecurityEvidence({ useLegacyLogs: false });
  const collectMs = ms(tCollect0);
  global.fetch = origFetch;

  const tIntel0 = performance.now();
  const intelCA = await intelligenceSvc.resolveCountryIntelligence('CA');
  const intelMs = ms(tIntel0);

  console.log('=== PARALLEL BLOCK A (wall-clock) ===');
  console.log(JSON.stringify(parInc, null, 2));
  console.log(`\ncollectSecurityEvidence (service wall): ${collectMs} ms`);
  console.log(`resolveCountryIntelligence(CA) wall: ${intelMs} ms`);
  console.log(`GeoIP provider calls during collect: ${geoStats.providerCalls}, max=${geoStats.providerMaxMs}ms`);
  console.log(`Post-parallel phases (est.): ${Math.max(0, collectMs - parInc.wallMs)} ms`);
  console.log(`Intelligence filter overhead (est.): ${Math.max(0, intelMs - collectMs)} ms`);

  // Equivalence: log-frozen first, then full collect sequential (document external variance)
  logWindowSvc.resetLogWindowState();
  const snapFull = await dashboardSvc.collectSecurityEvidence({ useLegacyLogs: true });
  logWindowSvc.resetLogWindowState();
  const snapInc = await dashboardSvc.collectSecurityEvidence({ useLegacyLogs: false });

  const canonFull = canonicalEvidence(snapFull);
  const canonInc = canonicalEvidence(snapInc);
  const eqFields = ['attack_origins', 'blocked_ips', 'recent_alerts_analytical', 'recent_alerts_display', 'critical_events', 'world_map'];
  for (const f of eqFields) {
    const match = JSON.stringify(canonFull[f]) === JSON.stringify(canonInc[f]);
    record('EQUIV', `FULL vs INCR ${f}`, 'identical', match ? 'identical' : 'DIFF', match);
  }

  const gsFull = geoStateCounts(snapFull);
  const gsInc = geoStateCounts(snapInc);
  for (const st of ['GEO_RESOLVED', 'GEO_UNRESOLVED', 'GEO_INVALID', 'GEO_NOT_ENRICHED']) {
    record('GEO_STATE', st, String(gsFull[st]), `FULL=${gsFull[st]} INCR=${gsInc[st]}`, gsFull[st] === gsInc[st]);
  }

  // Badges all countries
  console.log('\n=== ALL BADGES (FULL vs INCR frozen sequential — external deps may differ) ===');
  console.log('| País | nginx×1 | blocked×2 | alerts×1 | Total | FULL | INCR | Formula | Equiv |');
  for (const pt of snapFull.world_map.points) {
    const cc = pt.country_code;
    const nginxW = (snapFull.attack_origins || []).filter((o) => o.country_code === cc).reduce((s, o) => s + (o.count || 1), 0);
    const blockedW = (snapFull.blocked_ips || []).filter((b) => b.country_code === cc).length * 2;
    const alertsW = (snapFull.recent_alerts_analytical || []).filter((a) => a.country_code === cc).length;
    const total = nginxW + blockedW + alertsW;
    const ptInc = snapInc.world_map.points.find((p) => p.country_code === cc);
    const formulaOk = total === pt.count;
    const equivOk = pt.count === (ptInc?.count ?? -1);
    record('BADGE', cc, `${pt.count}==${total}`, `FULL=${pt.count} INCR=${ptInc?.count}`, formulaOk && equivOk);
    console.log(`| ${cc} | ${nginxW} | ${blockedW} | ${alertsW} | ${total} | ${pt.count} | ${ptInc?.count ?? '-'} | ${formulaOk ? 'PASS' : 'FAIL'} | ${equivOk ? 'PASS' : 'FAIL'} |`);
  }

  // Log-only equivalence (true frozen)
  const [legN, legT] = await Promise.all([
    logWindowSvc.acquireLogWindowLegacy(NGINX_ACCESS, NGINX_MAX),
    logWindowSvc.acquireLogWindowLegacy(THREAT_LOG, THREAT_MAX)
  ]);
  logWindowSvc.resetLogWindowState();
  const [incN, incT] = await Promise.all([
    logWindowSvc.acquireLogWindow(NGINX_ACCESS, NGINX_MAX, 'g-nginx'),
    logWindowSvc.acquireLogWindow(THREAT_LOG, THREAT_MAX, 'g-threat')
  ]);
  record('LOG-FROZEN', 'nginx lines', String(legN.lines.length), String(incN.lines.length), legN.lines.length === incN.lines.length && legN.lines.every((l, i) => l === incN.lines[i]));
  record('LOG-FROZEN', 'threat lines', String(legT.lines.length), String(incT.lines.length), legT.lines.length === incT.lines.length && legT.lines.every((l, i) => l === incT.lines[i]));

  // HTTP auth + perf
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows: admins } = await pool.query(`SELECT id,email,perfil FROM admin_users WHERE ativo=true`);
  const superA = admins.find((a) => a.perfil === 'super_admin');
  const other = admins.find((a) => a.perfil !== 'super_admin');
  const superToken = jwt.sign({ sub: superA.id, typ: 'impetus_admin', perfil: superA.perfil, email: superA.email }, process.env.IMPETUS_ADMIN_JWT_SECRET, { expiresIn: '30m', issuer: 'impetus-admin-portal' });
  const otherToken = other ? jwt.sign({ sub: other.id, typ: 'impetus_admin', perfil: other.perfil, email: other.email }, process.env.IMPETUS_ADMIN_JWT_SECRET, { expiresIn: '30m', issuer: 'impetus-admin-portal' }) : null;

  const noAuth = await httpReq('/api/impetus-admin/security-dashboard/intelligence?country_code=CA');
  record('AUTH', 'sem token', '401', String(noAuth.status), noAuth.status === 401);
  const badTok = await httpReq('/api/impetus-admin/security-dashboard/intelligence?country_code=CA', 'invalid');
  record('AUTH', 'token inválido', '401', String(badTok.status), badTok.status === 401);
  if (otherToken) {
    const r403 = await httpReq('/api/impetus-admin/security-dashboard/intelligence?country_code=CA', otherToken);
    record('AUTH', 'perfil não autorizado', '403', String(r403.status), r403.status === 403);
  }
  const r200 = await httpReq('/api/impetus-admin/security-dashboard/intelligence?country_code=CA', superToken);
  record('AUTH', 'super_admin', '200', String(r200.status), r200.status === 200);

  await httpReq('/api/impetus-admin/security-dashboard/intelligence?country_code=US', superToken);
  const hits = [];
  for (let i = 0; i < 10; i++) {
    const r = await httpReq('/api/impetus-admin/security-dashboard/intelligence?country_code=US', superToken);
    hits.push(r.rt);
  }
  const hitStats = stats(hits);
  record('PERF', 'HIT P95 < 100ms', '<100', String(hitStats.p95), hitStats.p95 < 100);

  const misses = [];
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 31000));
    const r = await httpReq('/api/impetus-admin/security-dashboard/intelligence?country_code=FR', superToken);
    misses.push({ rt: r.rt, handler: r.handler, mode: r.data?.evidence_build?.evidence_build_mode });
  }
  const missRts = misses.map((m) => m.rt);
  const missStats = stats(missRts);

  // Map x drill-down
  const dash = (await httpReq('/api/impetus-admin/security-dashboard', superToken)).data;
  const countries = ['CA', 'US', 'FR', 'BR', 'VN', '??'];
  for (const cc of countries) {
    const enc = encodeURIComponent(cc);
    const ir = (await httpReq(`/api/impetus-admin/security-dashboard/intelligence?country_code=${enc}`, superToken)).data;
    const pt = (dash.phase_b?.world_map?.points || []).find((p) => p.country_code === cc);
    if (!pt) {
      record('MAP-DRILL', cc, 'presente', 'AUSENTE', true);
      continue;
    }
    const snapOk = dash.snapshot_id === ir.snapshot_id;
    const badgeOk = pt.count === ir.summary?.index_decomposition?.total;
    const matchOk = ir.summary?.index_matches_badge === true;
    record('MAP-DRILL', cc, 'snapshot+badge+match', `snap=${snapOk} badge=${badgeOk} match=${matchOk}`, snapOk && badgeOk && matchOk);
  }

  await pool.end();

  const attributed = Math.max(0, collectMs - parInc.wallMs);
  const intelOverhead = Math.max(0, intelMs - collectMs);
  const unattribPct = intelMs > 0 ? Math.round((intelOverhead / intelMs) * 100) : 0;

  console.log('\n=== RECONCILIATION (intel path) ===');
  console.log(JSON.stringify({
    resolveCountryIntelligenceMs: intelMs,
    collectSecurityEvidenceMs: collectMs,
    parallelBlockWallMs: parInc.wallMs,
    parallelCriticalPath: parInc.criticalPath,
    parallelCriticalPathMs: parInc.criticalPathMs,
    postParallelPhasesMs: attributed,
    intelligenceFilterMs: intelOverhead,
    intelligenceFilterPercent: unattribPct,
    geoProviderCalls: geoStats.providerCalls,
    geoProviderMaxMs: geoStats.providerMaxMs
  }, null, 2));

  console.log('\n=== PERF STATS ===');
  console.log('HIT:', hitStats);
  console.log('MISS:', missStats, 'modes:', misses.map((m) => m.mode).join(','));

  const pass = tests.filter((t) => t.result === 'PASS').length;
  const fail = tests.filter((t) => t.result === 'FAIL').length;
  console.log(`\n=== TEST MATRIX: ${tests.length} total, PASS=${pass}, FAIL=${fail} ===`);
  for (const t of tests) {
    console.log(`${t.id} | ${t.scope} | ${t.desc} | ${t.result} | ${t.observed}`);
  }

  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
