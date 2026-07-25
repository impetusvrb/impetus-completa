'use strict';
/**
 * SEC-VISUAL-INTELLIGENCE-001G-R1 — Medição controlada não perturbativa.
 * Script diagnóstico isolado. Não altera código de produção.
 *
 * Uso: node scripts/sec001g-r1-controlled-measurement.js
 * Flags:
 *   --proof=1|2|both|equiv   (default: both + equiv)
 *   --wait-ms=N              (espera entre prova 1 e 2, default: auto)
 */

require('../src/config/loadEnv').loadImpetusEnv();

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const db = require('../src/db');
const logWindowSvc = require('../src/services/adminPortalSecurityEvidenceLogWindow');
const phaseBSvc = require('../src/services/adminPortalSecurityPhaseBService');
const intelligenceSvc = require('../src/services/adminPortalSecurityIntelligenceService');

const execFileAsync = promisify(execFile);

const THREAT_LOG = process.env.IMPETUS_THREAT_WATCH_LOG || '/var/log/impetus-threat-watch.log';
const NGINX_ACCESS = process.env.IMPETUS_NGINX_ACCESS || '/var/log/nginx/access.log';
const NGINX_WINDOW_MAX = 4000;
const THREAT_WINDOW_MAX = 3000;

const GEO_SUCCESS_TTL_MS = 86_400_000;
const GEO_FAIL_TTL_MS = 300_000;
const GEO_RESOLVE_BUDGET = 30;
const GEO_CONCURRENCY = 5;

const ALERT_RE =
  /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\]\s+ALERT\s+(LOW|MEDIUM|HIGH|CRITICAL)\s+(\S+)\s+([0-9a-fA-F:.]+)\s+—\s+(.+)$/;
const NGINX_LINE_RE =
  /^(\S+)\s+-\s+-\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s+[^"]*"\s+(\d{3})\s/;
const PRIVATE_IP_RE =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc00:|fe80:)/i;
const IP_FORMAT_RE = /^(?:(?:\d{1,3}\.){3}\d{1,3}|[0-9a-fA-F]{0,4}(?::[0-9a-fA-F]{0,4}){2,7})$/;

const hrtime = process.hrtime.bigint;
const toMs = (start) => Number(hrtime() - start) / 1e6;

// ─── Geo state (diagnostic only — same semantics as production) ─────────────
const geoCache = new Map();
let frozenGeoMap = null;

function classifyIp(ip) {
  if (!ip || typeof ip !== 'string' || ip.length < 2) return 'INVALID';
  if (PRIVATE_IP_RE.test(ip)) return 'PRIVATE';
  if (!IP_FORMAT_RE.test(ip)) return 'INVALID';
  return 'VALID';
}

function getCachedGeo(ip) {
  const entry = geoCache.get(ip);
  if (!entry || !entry.at) return null;
  const ttl = entry.geo_state === 'GEO_RESOLVED' ? GEO_SUCCESS_TTL_MS : GEO_FAIL_TTL_MS;
  if (Date.now() - entry.at > ttl) {
    geoCache.delete(ip);
    return null;
  }
  return entry;
}

function snapshotGeoCache() {
  const snap = new Map();
  for (const [ip, v] of geoCache.entries()) {
    snap.set(ip, { ...v });
  }
  return snap;
}

function restoreGeoCache(snap) {
  geoCache.clear();
  for (const [ip, v] of snap.entries()) {
    geoCache.set(ip, { ...v });
  }
}

const geoTelemetry = {
  reset() {
    Object.assign(this, {
      received: 0,
      unique_ips: 0,
      budget: GEO_RESOLVE_BUDGET,
      selected_for_resolution: 0,
      cache_hit_success: 0,
      cache_hit_failure: 0,
      cache_miss: 0,
      geo_invalid: 0,
      geo_not_enriched: 0,
      provider_calls: 0,
      provider_success: 0,
      provider_unresolved: 0,
      provider_timeout: 0,
      provider_rate_limit: 0,
      provider_network_error: 0,
      provider_wait_ms: [],
      max_inflight_observed: 0,
      current_inflight: 0,
      configured_concurrency: GEO_CONCURRENCY
    });
  }
};
geoTelemetry.reset();

async function execSafe(cmd, args, timeoutMs = 8000) {
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024 });
    return String(stdout || '').trim();
  } catch {
    return '';
  }
}

function parseFail2banStatus(raw) {
  const jails = [];
  const jailNames = (raw.match(/Jail list:\s+(.+)/i)?.[1] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const jail of jailNames) {
    const block = raw.split(`--- ${jail} ---`)[1] || '';
    const banned = block.match(/Banned IP list:\s*(.*)/)?.[1]?.trim() || '';
    const ips = banned ? banned.split(/\s+/).filter(Boolean) : [];
    jails.push({ jail, banned_ips: ips });
  }
  return { jails, banned_ips: [...new Set(jails.flatMap((j) => j.banned_ips))] };
}

async function getFail2ban() {
  const statusRaw = await execSafe('fail2ban-client', ['status']);
  if (!statusRaw) return { available: false, jails: [], banned_ips: [] };
  const jailNames = (statusRaw.match(/Jail list:\s+(.+)/i)?.[1] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const jailDetails = await Promise.all(
    jailNames.map(async (jail) => {
      const detail = await execSafe('fail2ban-client', ['status', jail]);
      return detail ? `\n--- ${jail} ---\n${detail}` : '';
    })
  );
  return { available: true, ...parseFail2banStatus(statusRaw + jailDetails.join('')) };
}

async function getUfwBlocks() {
  const raw = await execSafe('ufw', ['status', 'numbered']);
  if (!raw) return [];
  return raw
    .split('\n')
    .filter((line) => /DENY IN/i.test(line))
    .map((line) => {
      const ipMatch = line.match(/DENY IN\s+([0-9a-fA-F:.]+)|DENY IN\s+([0-9a-fA-F:.]+)\s+#/);
      const ip = ipMatch?.[1] || ipMatch?.[2] || '';
      return { ip, reason: (line.match(/#\s*(.+)$/)?.[1] || 'UFW DENY').trim(), source: 'ufw' };
    })
    .filter((r) => r.ip);
}

async function getFailedLogins() {
  const r = await db.query(
    `SELECT l.id, l.created_at, l.acao, l.ip FROM admin_logs l
     WHERE l.acao IN ('login_falhou', 'login_bloqueado_bot')
     ORDER BY l.created_at DESC LIMIT 50`
  );
  return r.rows;
}

function parseThreatAlerts(lines) {
  const alerts = [];
  for (const line of lines) {
    const m = line.match(ALERT_RE);
    if (!m) continue;
    alerts.push({ at: m[1], severity: m[2], type: m[3], ip: m[4], detail: m[5] });
  }
  return alerts;
}

function countNginxSuspicious(lines) {
  const suspicious = [];
  for (const line of lines) {
    const m = line.match(NGINX_LINE_RE);
    if (!m) continue;
    const status = Number(m[5]);
    if (status === 444 || status === 403 || status === 401) {
      suspicious.push({ ip: m[1], status, path: m[4], at: m[2] });
    } else if (status === 404 && /wp-|\.env|\.git|phpmyadmin|admin\.php/i.test(m[4])) {
      suspicious.push({ ip: m[1], status, path: m[4], at: m[2] });
    }
  }
  return suspicious;
}

async function resolveCountry(ip) {
  const cls = classifyIp(ip);
  if (cls === 'INVALID') {
    geoTelemetry.geo_invalid += 1;
    return { country: 'Inválido', country_code: '??', geo_state: 'GEO_INVALID' };
  }
  if (cls === 'PRIVATE') {
    return { country: 'Local', country_code: 'LO', geo_state: 'GEO_RESOLVED' };
  }

  const cached = getCachedGeo(ip);
  if (cached) {
    if (cached.geo_state === 'GEO_RESOLVED') geoTelemetry.cache_hit_success += 1;
    else geoTelemetry.cache_hit_failure += 1;
    return cached;
  }

  if (frozenGeoMap && frozenGeoMap.has(ip)) {
    const g = { ...frozenGeoMap.get(ip), at: Date.now() };
    geoCache.set(ip, g);
    if (g.geo_state === 'GEO_RESOLVED') geoTelemetry.cache_hit_success += 1;
    else geoTelemetry.cache_hit_failure += 1;
    return g;
  }

  geoTelemetry.cache_miss += 1;
  geoTelemetry.current_inflight += 1;
  geoTelemetry.max_inflight_observed = Math.max(
    geoTelemetry.max_inflight_observed,
    geoTelemetry.current_inflight
  );

  const t0 = hrtime();
  try {
    geoTelemetry.provider_calls += 1;
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,message`,
      { signal: AbortSignal.timeout(2500) }
    );
    const wait = toMs(t0);
    geoTelemetry.provider_wait_ms.push(wait);

    if (res.status === 429) {
      geoTelemetry.provider_rate_limit += 1;
      const out = { country: 'Desconhecido', country_code: '??', geo_state: 'GEO_UNRESOLVED', at: Date.now() };
      geoCache.set(ip, out);
      return out;
    }

    const data = await res.json().catch(() => ({}));
    if (data.status === 'success') {
      geoTelemetry.provider_success += 1;
      const out = {
        country: data.country || 'Desconhecido',
        country_code: data.countryCode || '??',
        geo_state: 'GEO_RESOLVED',
        at: Date.now()
      };
      geoCache.set(ip, out);
      return out;
    }

    if (/limit|rate|too many/i.test(String(data.message || ''))) {
      geoTelemetry.provider_rate_limit += 1;
    }
    geoTelemetry.provider_unresolved += 1;
    const out = { country: 'Desconhecido', country_code: '??', geo_state: 'GEO_UNRESOLVED', at: Date.now() };
    geoCache.set(ip, out);
    return out;
  } catch (e) {
    geoTelemetry.provider_wait_ms.push(toMs(t0));
    if (e?.name === 'TimeoutError' || /timeout/i.test(String(e?.message || ''))) {
      geoTelemetry.provider_timeout += 1;
    } else {
      geoTelemetry.provider_network_error += 1;
    }
    const out = { country: 'Desconhecido', country_code: '??', geo_state: 'GEO_UNRESOLVED', at: Date.now() };
    geoCache.set(ip, out);
    return out;
  } finally {
    geoTelemetry.current_inflight -= 1;
  }
}

async function resolveIpsBounded(ipCountEntries) {
  const t0 = hrtime();
  geoTelemetry.received = ipCountEntries.length;
  geoTelemetry.unique_ips = new Set(ipCountEntries.map((e) => e.ip)).size;

  const toResolve = [];
  for (const { ip, count } of ipCountEntries) {
    if (classifyIp(ip) !== 'VALID') continue;
    const cached = getCachedGeo(ip);
    if (cached) {
      if (cached.geo_state === 'GEO_RESOLVED') geoTelemetry.cache_hit_success += 1;
      else geoTelemetry.cache_hit_failure += 1;
      continue;
    }
    if (frozenGeoMap && frozenGeoMap.has(ip)) {
      const g = frozenGeoMap.get(ip);
      if (g.geo_state === 'GEO_RESOLVED') geoTelemetry.cache_hit_success += 1;
      else geoTelemetry.cache_hit_failure += 1;
      continue;
    }
    toResolve.push({ ip, count });
  }
  toResolve.sort((a, b) => b.count - a.count);
  const batch = toResolve.slice(0, GEO_RESOLVE_BUDGET);
  geoTelemetry.selected_for_resolution = batch.length;

  if (batch.length === 0) {
    return { attempted: 0, budget_used: 0, total_ms: toMs(t0) };
  }

  let idx = 0;
  async function worker() {
    while (idx < batch.length) {
      const { ip } = batch[idx++];
      await resolveCountry(ip);
    }
  }
  const workers = Math.min(GEO_CONCURRENCY, batch.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));

  return { attempted: batch.length, budget_used: batch.length, total_ms: toMs(t0) };
}

function lookupGeoEntry(ip) {
  const cls = classifyIp(ip);
  if (cls === 'INVALID') return { country: 'Inválido', country_code: '??', geo_state: 'GEO_INVALID' };
  if (cls === 'PRIVATE') return { country: 'Local', country_code: 'LO', geo_state: 'GEO_RESOLVED' };
  const cached = getCachedGeo(ip);
  if (cached) return cached;
  geoTelemetry.geo_not_enriched += 1;
  return { country: 'Desconhecido', country_code: '??', geo_state: 'GEO_NOT_ENRICHED' };
}

function enrichWithCountries(items, ipKey = 'ip') {
  return items.map((item) => {
    const g = lookupGeoEntry(item[ipKey]);
    return {
      ...item,
      country: g?.country || '—',
      country_code: g?.country_code || '??',
      geo_state: g?.geo_state || 'GEO_NOT_ENRICHED'
    };
  });
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(s.length * p) - 1)];
}

async function instrumentedCollect(useLegacyLogs, frozenExternal = null) {
  geoTelemetry.reset();

  const logAcquire = useLegacyLogs
    ? (filePath, max, key) => logWindowSvc.acquireLogWindowLegacy(filePath, max)
    : (filePath, max, key) => logWindowSvc.acquireLogWindow(filePath, max, key);

  const timings = {};
  const totalT0 = hrtime();

  const parT0 = hrtime();
  const tF2b = hrtime();
  const pFail2ban = getFail2ban().then((r) => {
    timings.fail2ban = toMs(tF2b);
    return r;
  });
  const tUfw = hrtime();
  const pUfw = getUfwBlocks().then((r) => {
    timings.ufw = toMs(tUfw);
    return r;
  });
  const tDb = hrtime();
  const pDb = getFailedLogins().then((r) => {
    timings.db = toMs(tDb);
    return r;
  });
  const tThreat = hrtime();
  const pThreat = logAcquire(THREAT_LOG, THREAT_WINDOW_MAX, useLegacyLogs ? 'r1-threat-leg' : 'r1-threat').then((r) => {
    timings.logThreat = toMs(tThreat);
    return r;
  });
  const tNginx = hrtime();
  const pNginx = logAcquire(NGINX_ACCESS, NGINX_WINDOW_MAX, useLegacyLogs ? 'r1-nginx-leg' : 'r1-nginx').then((r) => {
    timings.logNginx = toMs(tNginx);
    return r;
  });

  const [fail2ban, ufwBlocks, threatResult, nginxResult, failedLogins] = await Promise.all([
    frozenExternal?.fail2ban ? Promise.resolve(frozenExternal.fail2ban) : pFail2ban,
    frozenExternal?.ufwBlocks ? Promise.resolve(frozenExternal.ufwBlocks) : pUfw,
    frozenExternal?.threatLines
      ? Promise.resolve({ lines: frozenExternal.threatLines, metrics: { mode: 'FROZEN', window_size: frozenExternal.threatLines.length } })
      : pThreat,
    frozenExternal?.nginxLines
      ? Promise.resolve({ lines: frozenExternal.nginxLines, metrics: { mode: 'FROZEN', window_size: frozenExternal.nginxLines.length } })
      : pNginx,
    frozenExternal?.failedLogins ? Promise.resolve(frozenExternal.failedLogins) : pDb
  ]);
  timings.parallelWall = toMs(parT0);

  const tParse = hrtime();
  const threatLines = threatResult.lines;
  const nginxLines = nginxResult.lines;
  const threatAlerts = parseThreatAlerts(threatLines);
  const recentAlerts = threatAlerts.slice(-80).reverse();
  const nginxSuspicious = countNginxSuspicious(nginxLines);
  const ipCounts = new Map();
  for (const s of nginxSuspicious) ipCounts.set(s.ip, (ipCounts.get(s.ip) || 0) + 1);
  const topAttackIps = [...ipCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([ip, count]) => ({ ip, count }));

  const allBlockedIps = [
    ...ufwBlocks.map((b) => ({ ip: b.ip, source: 'ufw', reason: b.reason })),
    ...fail2ban.banned_ips.map((ip) => ({ ip, source: 'fail2ban', reason: 'fail2ban jail' }))
  ];
  const blockedUnique = [];
  const seen = new Set();
  for (const b of allBlockedIps) {
    if (seen.has(b.ip)) continue;
    seen.add(b.ip);
    blockedUnique.push(b);
  }

  const criticalTypes = new Set(['HTTP_CREDENTIAL_PROBE', 'SSH_BRUTE_FORCE', 'HTTP_404_FLOOD', 'SCANNER_UA', 'HTTP_WRITE_ATTEMPT']);
  const criticalEvents = recentAlerts.filter(
    (a) => a.severity === 'HIGH' || a.severity === 'CRITICAL' || criticalTypes.has(a.type)
  );
  timings.parseClassify = toMs(tParse);

  const tResolve = hrtime();
  const ipCountMap = new Map();
  const addIps = (items, ipKey = 'ip', weight = 1) => {
    for (const item of items) {
      const ip = item[ipKey];
      if (ip) ipCountMap.set(ip, (ipCountMap.get(ip) || 0) + weight);
    }
  };
  addIps(criticalEvents, 'ip', 3);
  addIps(topAttackIps, 'ip', 2);
  addIps(blockedUnique, 'ip', 2);
  addIps(recentAlerts, 'ip', 1);
  const resolveResult = await resolveIpsBounded([...ipCountMap.entries()].map(([ip, count]) => ({ ip, count })));
  timings.resolveIpsBounded = resolveResult.total_ms;

  const tEnrich = hrtime();
  const blockedWithGeo = enrichWithCountries(blockedUnique.slice(0, 25));
  const originsWithGeo = enrichWithCountries(topAttackIps);
  const alertsForWorldMap = enrichWithCountries(recentAlerts);
  const criticalEventsEnriched = enrichWithCountries(criticalEvents.slice(0, 30));
  timings.enrichWithCountries = toMs(tEnrich);

  const tAgg = hrtime();
  const alertsForPayload = alertsForWorldMap.slice(0, 20);
  timings.aggregation = toMs(tAgg);

  const tWorld = hrtime();
  const worldMap = phaseBSvc.buildWorldMap(originsWithGeo, blockedWithGeo, alertsForWorldMap);
  timings.buildWorldMap = toMs(tWorld);

  timings.collectTotal = toMs(totalT0);

  const attributed =
    timings.parallelWall +
    timings.parseClassify +
    timings.resolveIpsBounded +
    timings.enrichWithCountries +
    timings.aggregation +
    timings.buildWorldMap;

  timings.unattributed = Math.max(0, timings.collectTotal - attributed);
  timings.unattributedPct = timings.collectTotal > 0
    ? Math.round((timings.unattributed / timings.collectTotal) * 1000) / 10
    : 0;

  const parallelBranches = [
    { name: 'getFail2ban', ms: timings.fail2ban || 0 },
    { name: 'getUfwBlocks', ms: timings.ufw || 0 },
    { name: 'getFailedLogins', ms: timings.db || 0 },
    { name: 'acquireLogWindow(threat)', ms: timings.logThreat || 0 },
    { name: 'acquireLogWindow(nginx)', ms: timings.logNginx || 0 }
  ].sort((a, b) => b.ms - a.ms);

  const providerWaits = geoTelemetry.provider_wait_ms;
  const geoStats = {
    ...geoTelemetry,
    provider_wait_ms_total: Math.round(providerWaits.reduce((a, b) => a + b, 0)),
    provider_wait_ms_max: providerWaits.length ? Math.max(...providerWaits) : 0,
    provider_wait_ms_p50: percentile(providerWaits, 0.5),
    provider_wait_ms_p95: percentile(providerWaits, 0.95),
    resolveIpsBounded_pct: Math.round((timings.resolveIpsBounded / timings.collectTotal) * 1000) / 10
  };
  delete geoStats.provider_wait_ms;

  return {
    mode: useLegacyLogs ? 'FULL_REBUILD' : 'INCREMENTAL',
    timings,
    parallelBranches,
    criticalPathParallel: parallelBranches[0].name,
    criticalPathGlobal:
      timings.resolveIpsBounded >= timings.parallelWall ? 'resolveIpsBounded' : parallelBranches[0].name,
    geoStats,
    frozenSnapshot: {
      fail2ban,
      ufwBlocks,
      nginxLines,
      threatLines,
      failedLogins
    },
    evidence: {
      attack_origins: originsWithGeo,
      blocked_ips: blockedWithGeo,
      recent_alerts_analytical: alertsForWorldMap,
      recent_alerts_display: alertsForPayload,
      critical_events: criticalEventsEnriched,
      world_map: worldMap,
      nginx_lines: nginxLines.length,
      threat_lines: threatLines.length,
      evidence_build_mode: threatResult.metrics?.mode
    }
  };
}

function canonicalEvidence(ev) {
  const pick = (items, keys) => (items || [])
    .map((it) => {
      const o = {};
      for (const k of keys) o[k] = it[k];
      return o;
    })
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

  return {
    nginx_window: ev.nginx_lines,
    threat_window: ev.threat_lines,
    attack_origins: pick(ev.attack_origins, ['ip', 'count', 'country_code', 'geo_state']),
    blocked_ips: pick(ev.blocked_ips, ['ip', 'source', 'country_code', 'geo_state']),
    recent_alerts_analytical: pick(ev.recent_alerts_analytical, ['ip', 'type', 'country_code', 'geo_state']),
    recent_alerts_display: pick(ev.recent_alerts_display, ['ip', 'type', 'country_code', 'geo_state']),
    critical_events: pick(ev.critical_events, ['ip', 'type', 'country_code', 'geo_state']),
    world_map: (ev.world_map?.points || [])
      .map((p) => ({ country_code: p.country_code, count: p.count, unique_ips: p.unique_ips }))
      .sort((a, b) => a.country_code.localeCompare(b.country_code))
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

function badgeTable(ev) {
  const rows = [];
  for (const pt of ev.world_map?.points || []) {
    const cc = pt.country_code;
    const nx = (ev.attack_origins || []).filter((o) => o.country_code === cc).reduce((s, o) => s + (o.count || 1), 0);
    const bl = (ev.blocked_ips || []).filter((b) => b.country_code === cc).length * 2;
    const al = (ev.recent_alerts_analytical || []).filter((a) => a.country_code === cc).length;
    const total = nx + bl + al;
    rows.push({ cc, nx, bl, al, total, badge: pt.count, formulaOk: total === pt.count });
  }
  return rows.sort((a, b) => a.cc.localeCompare(b.cc));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runEquivalenceFrozen() {
  console.log('\n=== EQUIVALÊNCIA CONGELADA FULL × INCREMENTAL ===');

  const [legN, legT] = await Promise.all([
    logWindowSvc.acquireLogWindowLegacy(NGINX_ACCESS, NGINX_WINDOW_MAX),
    logWindowSvc.acquireLogWindowLegacy(THREAT_LOG, THREAT_WINDOW_MAX)
  ]);

  const frozenExternal = {
    nginxLines: legN.lines,
    threatLines: legT.lines,
    fail2ban: { available: true, jails: [], banned_ips: [] },
    ufwBlocks: [],
    failedLogins: []
  };

  const geoSnap = snapshotGeoCache();
  frozenGeoMap = geoSnap;

  logWindowSvc.resetLogWindowState();
  geoCache.clear();
  frozenGeoMap = geoSnap;
  const full = await instrumentedCollect(true, frozenExternal);

  logWindowSvc.resetLogWindowState();
  geoCache.clear();
  frozenGeoMap = geoSnap;
  const incr = await instrumentedCollect(false, frozenExternal);

  const cf = canonicalEvidence(full.evidence);
  const ci = canonicalEvidence(incr.evidence);
  const fields = Object.keys(cf);
  for (const f of fields) {
    const match = JSON.stringify(cf[f]) === JSON.stringify(ci[f]);
    console.log(`  ${f}: ${match ? 'PASS' : 'FAIL'}`);
  }

  const gsF = geoStateCounts(full.evidence);
  const gsI = geoStateCounts(incr.evidence);
  console.log('  geo_states FULL:', gsF);
  console.log('  geo_states INCR:', gsI);
  console.log('  geo_states match:', JSON.stringify(gsF) === JSON.stringify(gsI));

  console.log('\n  BADGES:');
  for (const row of badgeTable(full.evidence)) {
    const incPt = incr.evidence.world_map.points.find((p) => p.country_code === row.cc);
    console.log(
      `  ${row.cc}: nx=${row.nx} bl=${row.bl} al=${row.al} tot=${row.total} FULL=${row.badge} INCR=${incPt?.count} formula=${row.formulaOk ? 'PASS' : 'FAIL'} equiv=${row.badge === incPt?.count ? 'PASS' : 'FAIL'}`
    );
  }

  const countries = ['CA', 'US', 'FR', 'BR', 'VN', '??'];
  console.log('\n  MAP × DRILL (congelado):');
  for (const cc of countries) {
    const pt = full.evidence.world_map.points.find((p) => p.country_code === cc);
    if (!pt) {
      console.log(`  ${cc}: AUSENTE`);
      continue;
    }
    const decomp = {
      nginx: (full.evidence.attack_origins || []).filter((o) => o.country_code === cc).reduce((s, o) => s + (o.count || 1), 0),
      blocked: (full.evidence.blocked_ips || []).filter((b) => b.country_code === cc).length * 2,
      alerts: (full.evidence.recent_alerts_analytical || []).filter((a) => a.country_code === cc).length
    };
    decomp.total = decomp.nginx + decomp.blocked + decomp.alerts;
    console.log(
      `  ${cc}: badge=${pt.count} total=${decomp.total} match=${decomp.total === pt.count ? 'PASS' : 'FAIL'}`
    );
  }

  frozenGeoMap = null;
  return { full, incr, cf, ci };
}

function printProof(label, result) {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify({
    mode: result.mode,
    timings: result.timings,
    parallelBranches: result.parallelBranches,
    criticalPathParallel: result.criticalPathParallel,
    criticalPathGlobal: result.criticalPathGlobal,
    geoStats: result.geoStats,
    evidence_build: result.evidence.evidence_build_mode,
    nginx_lines: result.evidence.nginx_lines,
    threat_lines: result.evidence.threat_lines
  }, null, 2));
}

function compareProofs(p1, p2) {
  console.log('\n=== COMPARAÇÃO PROVA 1 × PROVA 2 ===');
  const rows = [
    ['collect TOTAL', p1.timings.collectTotal, p2.timings.collectTotal],
    ['parallel block', p1.timings.parallelWall, p2.timings.parallelWall],
    ['fail2ban', p1.timings.fail2ban, p2.timings.fail2ban],
    ['UFW', p1.timings.ufw, p2.timings.ufw],
    ['DB', p1.timings.db, p2.timings.db],
    ['log nginx', p1.timings.logNginx, p2.timings.logNginx],
    ['log threat', p1.timings.logThreat, p2.timings.logThreat],
    ['parse/classify', p1.timings.parseClassify, p2.timings.parseClassify],
    ['resolveIpsBounded', p1.timings.resolveIpsBounded, p2.timings.resolveIpsBounded],
    ['cache hits (success)', p1.geoStats.cache_hit_success, p2.geoStats.cache_hit_success],
    ['cache misses', p1.geoStats.cache_miss, p2.geoStats.cache_miss],
    ['provider calls', p1.geoStats.provider_calls, p2.geoStats.provider_calls],
    ['provider wait total', p1.geoStats.provider_wait_ms_total, p2.geoStats.provider_wait_ms_total],
    ['unattributed', p1.timings.unattributed, p2.timings.unattributed]
  ];
  console.log('| Métrica | Coleta 1 | Coleta 2 | Delta |');
  for (const [name, a, b] of rows) {
    console.log(`| ${name} | ${Math.round(a)} | ${Math.round(b)} | ${Math.round(b - a)} |`);
  }

  const deltaCollect = p2.timings.collectTotal - p1.timings.collectTotal;
  const deltaResolve = p2.timings.resolveIpsBounded - p1.timings.resolveIpsBounded;

  console.log('\nPergunta A — GeoIP quente na Coleta 2?');
  console.log(`  provider_calls: ${p1.geoStats.provider_calls} → ${p2.geoStats.provider_calls}`);
  console.log(`  cache_hit_success: ${p1.geoStats.cache_hit_success} → ${p2.geoStats.cache_hit_success}`);
  console.log(`  cache_miss: ${p1.geoStats.cache_miss} → ${p2.geoStats.cache_miss}`);
  const warm = p2.geoStats.provider_calls === 0 && p2.geoStats.cache_hit_success > 0;
  console.log(`  Resposta: ${warm ? 'SIM — cache quente comprovado por contadores' : 'NÃO/PARCIAL'}`);

  console.log('\nPergunta B — resolveIpsBounded caiu materialmente?');
  console.log(`  ${p1.timings.resolveIpsBounded} ms → ${p2.timings.resolveIpsBounded} ms (delta ${deltaResolve} ms)`);
  console.log(`  Resposta: ${deltaResolve < -50 ? 'SIM' : 'NÃO'}`);

  console.log('\nPergunta C — queda de resolve explica queda de collect?');
  console.log(`  delta collect: ${deltaCollect} ms | delta resolve: ${deltaResolve} ms`);
  const reconciled = Math.abs(deltaCollect - deltaResolve) <= Math.max(100, Math.abs(deltaCollect) * 0.15);
  console.log(`  Resposta: ${reconciled ? 'SIM — reconciliação causal forte' : 'NÃO — investigar migração de tempo'}`);
}

async function runWarmCacheProofFrozen() {
  console.log('\n=== PROVA 2b — GEO QUENTE COM ENTRADA EXTERNA CONGELADA ===');
  logWindowSvc.resetLogWindowState();
  geoCache.clear();
  frozenGeoMap = null;

  const cold = await instrumentedCollect(false);
  const frozenExternal = {
    fail2ban: cold.frozenSnapshot.fail2ban,
    ufwBlocks: cold.frozenSnapshot.ufwBlocks,
    nginxLines: cold.frozenSnapshot.nginxLines,
    threatLines: cold.frozenSnapshot.threatLines,
    failedLogins: cold.frozenSnapshot.failedLogins
  };

  // geoCache still warm from cold run — same IP universe
  logWindowSvc.resetLogWindowState();
  await sleep(2000);
  console.log('SAFE_SECOND_COLLECTION_REASON = Entrada fail2ban/ufw/logs congelada da Coleta fria; geoCache in-process retém resoluções da mesma Coleta; espera 2s anti-rajada.');
  const warm = await instrumentedCollect(false, frozenExternal);
  compareProofs(cold, warm);
  return { cold, warm };
}

async function main() {
  const args = process.argv.slice(2);
  const proofArg = args.find((a) => a.startsWith('--proof='))?.split('=')[1] || 'both';
  const waitArg = Number(args.find((a) => a.startsWith('--wait-ms='))?.split('=')[1] || 0);

  console.log('SEC-VISUAL-INTELLIGENCE-001G-R1 — MEDIÇÃO CONTROLADA');
  console.log(`Relógio: process.hrtime.bigint()`);
  console.log(`PID: ${process.pid} | ${new Date().toISOString()}`);

  if (proofArg === 'warm-frozen') {
    await runWarmCacheProofFrozen();
    await db.end?.().catch(() => {});
    return;
  }

  let proof1 = null;
  let proof2 = null;

  if (proofArg === '1' || proofArg === 'both') {
    logWindowSvc.resetLogWindowState();
    geoCache.clear();
    frozenGeoMap = null;
    console.log('\n--- PROVA 1: coleta isolada (geoCache frio no processo) ---');
    proof1 = await instrumentedCollect(false);
    printProof('PROVA 1', proof1);
  }

  if (proofArg === '2' || proofArg === 'both') {
    let waitMs = waitArg;
    let reason = '';
    if (proof1) {
      if (proof1.geoStats.provider_calls > 0) {
        // ip-api.com free tier: 45 req/min — após N calls, aguardar janela deslizante
        const minWait = Math.max(5000, Math.ceil((proof1.geoStats.provider_calls / 45) * 60_000) + 2000);
        waitMs = waitMs || minWait;
        reason = `Coleta 1 fez ${proof1.geoStats.provider_calls} chamadas ao provider. Política ip-api.com free ≈45 req/min. Aguardar ${waitMs} ms para evitar rate-limit artificial na Coleta 2, embora geoCache in-process (TTL 24h success) deva eliminar novas chamadas se quente.`;
      } else {
        waitMs = waitMs || 3000;
        reason = 'Coleta 1 não contactou provider; geoCache in-process disponível. Espera mínima 3s apenas para separação de wall-clock.';
      }
    } else {
      waitMs = waitMs || 0;
      reason = 'Prova 2 isolada — geoCache do processo.';
    }

    console.log(`\nSAFE_SECOND_COLLECTION_REASON = ${reason}`);
    if (waitMs > 0) {
      console.log(`Aguardando ${waitMs} ms antes da Prova 2...`);
      await sleep(waitMs);
    }

    logWindowSvc.resetLogWindowState();
    console.log('\n--- PROVA 2: coleta controlada (geoCache quente no mesmo processo) ---');
    proof2 = await instrumentedCollect(false);
    printProof('PROVA 2', proof2);
  }

  if (proof1 && proof2) compareProofs(proof1, proof2);

  if (proofArg === 'equiv' || proofArg === 'both') {
    await runEquivalenceFrozen();
  }

  await db.end?.().catch(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
