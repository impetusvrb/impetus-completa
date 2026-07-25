'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const db = require('../db');

const PLAYBOOKS_PATH = path.join(__dirname, '../data/security-playbooks.json');
const HARDENING_DIR = '/var/lib/impetus/hardening-queue';
const HARDENING_PENDING = path.join(HARDENING_DIR, 'pending.json');
const HARDENING_HISTORY = path.join(HARDENING_DIR, 'history.json');
const BASELINE_PATH = '/var/lib/impetus/security-baseline/latest.json';
const INCIDENT_DIR = '/var/lib/impetus/incidents';

const COUNTRY_COORDS = Object.freeze({
  US: { lat: 37.09, lon: -95.71 },
  BR: { lat: -14.24, lon: -51.93 },
  CN: { lat: 35.86, lon: 104.19 },
  RU: { lat: 61.52, lon: 105.32 },
  IN: { lat: 20.59, lon: 78.96 },
  DE: { lat: 51.17, lon: 10.45 },
  FR: { lat: 46.23, lon: 2.21 },
  GB: { lat: 55.38, lon: -3.44 },
  NL: { lat: 52.13, lon: 5.29 },
  UA: { lat: 48.38, lon: 31.17 },
  VN: { lat: 14.06, lon: 108.28 },
  ID: { lat: -0.79, lon: 113.92 },
  KR: { lat: 35.91, lon: 127.77 },
  JP: { lat: 36.2, lon: 138.25 },
  AU: { lat: -25.27, lon: 133.78 },
  CA: { lat: 56.13, lon: -106.35 },
  MX: { lat: 23.63, lon: -102.55 },
  AR: { lat: -38.42, lon: -63.62 },
  PL: { lat: 51.92, lon: 19.15 },
  IT: { lat: 41.87, lon: 12.57 },
  ES: { lat: 40.46, lon: -3.75 },
  PT: { lat: 39.4, lon: -8.22 },
  TR: { lat: 38.96, lon: 35.24 },
  IR: { lat: 32.43, lon: 53.69 },
  RO: { lat: 45.94, lon: 24.97 },
  SE: { lat: 60.13, lon: 18.64 },
  SG: { lat: 1.35, lon: 103.82 },
  HK: { lat: 22.4, lon: 114.11 },
  TW: { lat: 23.7, lon: 120.96 },
  ZA: { lat: -30.56, lon: 22.94 },
  NG: { lat: 9.08, lon: 8.68 },
  EG: { lat: 26.82, lon: 30.8 },
  CO: { lat: 4.57, lon: -74.3 },
  CL: { lat: -35.68, lon: -71.54 },
  LO: { lat: 0, lon: 0 }
});

const THREAT_TYPE_MAP = Object.freeze({
  SCANNER_UA: { event_type: 'BOT_ACTIVITY', classification: 'GENERIC_SCANNER' },
  HTTP_404_FLOOD: { event_type: 'HTTP_SCAN', classification: 'GENERIC_SCANNER' },
  HTTP_CREDENTIAL_PROBE: { event_type: 'AUTH_ATTEMPT', classification: 'CREDENTIAL_SCAN' },
  HTTP_WRITE_ATTEMPT: { event_type: 'ENUMERATION', classification: 'ENUMERATION' },
  INVASION_SENSITIVE_200: { event_type: 'PATH_DISCOVERY', classification: 'ENUMERATION' },
  SSH_BRUTE_FORCE: { event_type: 'SSH_EVENT', classification: 'GENERIC_SCANNER' },
  MULTI_LAYER_BREACH: { event_type: 'PATH_DISCOVERY', classification: 'ENUMERATION' },
  AUTH_SUCCESS_AFTER_BREACH: { event_type: 'AUTH_ATTEMPT', classification: 'CREDENTIAL_SCAN' },
  ADMIN_LOGIN_AFTER_FAILS: { event_type: 'AUTH_ATTEMPT', classification: 'ENUMERATION' }
});

function projectCoord(countryCode) {
  const cc = String(countryCode || '??').toUpperCase();
  const c = COUNTRY_COORDS[cc] || { lat: 0, lon: 0 };
  return {
    x_pct: Math.round(((c.lon + 180) / 360) * 1000) / 10,
    y_pct: Math.round(((90 - c.lat) / 180) * 1000) / 10
  };
}

function loadPlaybooks() {
  try {
    return JSON.parse(fs.readFileSync(PLAYBOOKS_PATH, 'utf8'));
  } catch {
    return { schema_version: 'security_playbooks_v1', playbooks: [] };
  }
}

function matchPlaybook(type, classification) {
  const doc = loadPlaybooks();
  const t = String(type || '').toUpperCase();
  const c = String(classification || '').toUpperCase();
  return (doc.playbooks || []).find((pb) =>
    (pb.match_types || []).some((m) => {
      const mu = m.toUpperCase();
      return mu === t || mu === c || t.includes(mu) || c.includes(mu);
    })
  );
}

function buildWorldMap(attackOrigins, blockedIps, recentAlerts) {
  const byCountry = new Map();

  const add = (countryCode, country, ip, weight = 1) => {
    const cc = countryCode || '??';
    const key = cc;
    // Para o grupo ?? usar sempre 'Desconhecido' — evita que GEO_INVALID defina o label
    const displayCountry = cc === '??' ? 'Desconhecido' : (country || cc);
    const prev = byCountry.get(key) || {
      country_code: cc,
      country: displayCountry,
      count: 0,
      ips: new Set()
    };
    prev.count += weight;
    if (ip) prev.ips.add(ip);
    byCountry.set(key, prev);
  };

  for (const row of attackOrigins || []) {
    add(row.country_code, row.country, row.ip, row.count || 1);
  }
  for (const row of blockedIps || []) {
    add(row.country_code, row.country, row.ip, 2);
  }
  // População analítica controlada upstream — sem truncamento adicional aqui
  for (const row of recentAlerts || []) {
    add(row.country_code, row.country, row.ip, 1);
  }

  const points = [...byCountry.values()]
    .map((p) => {
      const coord = projectCoord(p.country_code);
      return {
        country_code: p.country_code,
        country: p.country,
        count: p.count,
        unique_ips: p.ips.size,
        x_pct: coord.x_pct,
        y_pct: coord.y_pct
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  return {
    schema_version: 'world_map_v1',
    total_countries: points.length,
    total_events: points.reduce((s, p) => s + p.count, 0),
    points
  };
}

async function buildBehavioralBaseline(failedLogins, threatAlerts) {
  const now = Date.now();
  const dayMs = 86_400_000;

  const loginByDay = new Map();
  const loginByIp = new Map();
  for (const row of failedLogins || []) {
    const day = String(row.created_at).slice(0, 10);
    loginByDay.set(day, (loginByDay.get(day) || 0) + 1);
    if (row.ip) loginByIp.set(row.ip, (loginByIp.get(row.ip) || 0) + 1);
  }

  const alertByType = new Map();
  const alert24h = (threatAlerts || []).filter((a) => now - new Date(a.at).getTime() < dayMs);
  for (const a of alert24h) {
    alertByType.set(a.type, (alertByType.get(a.type) || 0) + 1);
  }

  const dailyCounts = [...loginByDay.values()];
  const avgLogins =
    dailyCounts.length > 0 ? dailyCounts.reduce((s, n) => s + n, 0) / dailyCounts.length : 0;
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayLogins = loginByDay.get(todayKey) || 0;

  let stored = null;
  try {
    stored = JSON.parse(await fsp.readFile(BASELINE_PATH, 'utf8'));
  } catch {
    stored = null;
  }

  const anomalies = [];
  if (avgLogins > 0 && todayLogins > avgLogins * 2 && todayLogins >= 3) {
    anomalies.push({
      id: 'login_spike',
      severity: 'HIGH',
      label: 'Pico de logins falhados',
      detail: `Hoje ${todayLogins} vs média ${avgLogins.toFixed(1)}/dia (7d)`
    });
  }
  for (const [type, count] of alertByType) {
    const baseline = stored?.alert_baselines?.[type] || 0;
    if (count > Math.max(3, baseline * 2)) {
      anomalies.push({
        id: `alert_${type}`,
        severity: count >= 10 ? 'HIGH' : 'MEDIUM',
        label: `Alerta ${type} acima do baseline`,
        detail: `${count} em 24h vs baseline ${baseline}`
      });
    }
  }

  const topFailedIps = [...loginByIp.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([ip, count]) => ({ ip, count }));

  return {
    schema_version: 'behavioral_baseline_v1',
    window_days: 7,
    login_failed: {
      today: todayLogins,
      daily_avg: Math.round(avgLogins * 10) / 10,
      by_day: [...loginByDay.entries()].slice(-7).map(([day, count]) => ({ day, count })),
      top_ips: topFailedIps
    },
    alerts_24h_by_type: [...alertByType.entries()].map(([type, count]) => ({ type, count })),
    anomalies,
    snapshot_at: stored?.generated_at || null
  };
}

function threatAlertsToSec01Events(alerts) {
  const { createSecurityEventDto } = require('../securityObservatory/dto/securityEventDto');
  return (alerts || []).slice(-60).map((a, i) => {
    const map = THREAT_TYPE_MAP[a.type] || { event_type: 'PATH_DISCOVERY', classification: 'UNKNOWN' };
    return createSecurityEventDto({
      id: `tw-${a.at}-${a.ip}-${i}`,
      event_type: map.event_type,
      classification: map.classification,
      window_start: a.at,
      window_end: a.at,
      source_ip: a.ip,
      path_prefix: extractPath(a.detail),
      request_count: 1,
      metadata: { threat_watch_type: a.type, severity: a.severity, source: 'threat-watch' }
    });
  });
}

function extractPath(detail) {
  const m = String(detail || '').match(/(?:GET|POST|PUT|DELETE)\s+(\S+)/i);
  if (m) return m[1];
  const p = String(detail || '').match(/(\/[\w./-]+)/);
  return p ? p[1] : null;
}

function ingestThreatWatchCorrelation(threatAlerts) {
  try {
    const sec02 = require('../securityCorrelation');
    if (!sec02.isEnabled()) return { ingested: 0, enabled: false };
    const events = threatAlertsToSec01Events(threatAlerts);
    const results = sec02.correlateBatch(events);
    return { ingested: events.length, correlated: results.length, enabled: true };
  } catch (e) {
    return { ingested: 0, enabled: false, error: e.message };
  }
}

function getCorrelationDashboard() {
  try {
    const sec02 = require('../securityCorrelation');
    const dashboard = sec02.buildDashboard();
    const open = (dashboard.incidents || []).filter((i) => i.status === 'OPEN').slice(0, 15);
    return {
      enabled: sec02.isEnabled(),
      open_incidents: dashboard.open_incidents,
      closed_incidents: dashboard.closed_incidents,
      average_risk_score: dashboard.average_risk_score,
      top_classifications: dashboard.top_classifications,
      top_origins: dashboard.top_origins,
      incidents: open,
      metrics: dashboard.metrics_summary
    };
  } catch {
    return { enabled: false, incidents: [] };
  }
}

function getThreatIntelProfiles(limit = 8) {
  try {
    const sec03 = require('../securityThreatIntelligence');
    if (!sec03.isEnabled()) return { enabled: false, profiles: [] };
    const profiles = sec03.analyzeAllIncidents().slice(0, limit);
    return {
      enabled: true,
      profiles: profiles.map((p) => ({
        incident_id: p.incidentId,
        risk_level: p.riskLevel,
        primary_assessment: p.primaryAssessment,
        confidence: p.confidence,
        recommendations: (p.recommendations || []).slice(0, 4),
        historical_similarity: p.historicalSimilarity,
        provider_hints: p.providerHints
      }))
    };
  } catch {
    return { enabled: false, profiles: [] };
  }
}

async function lookupIpThreatIntel(ip) {
  if (!ip) return null;
  let provider = null;
  try {
    const { resolveProvider } = require('../securityThreatIntelligence/engine/providerRegistry');
    provider = resolveProvider(ip);
  } catch {
    provider = null;
  }

  let geo = {};
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,isp,as,proxy,hosting`,
      { signal: AbortSignal.timeout(3500) }
    );
    geo = await res.json();
  } catch {
    geo = {};
  }

  return {
    ip,
    country: geo.country,
    country_code: geo.countryCode,
    isp: geo.isp,
    asn: geo.as,
    is_proxy: geo.proxy,
    is_hosting: geo.hosting,
    cloud_provider: provider
      ? { id: provider.id, name: provider.name, scanner_likelihood: provider.scannerLikelihood }
      : null,
    abuse_score: geo.hosting || geo.proxy ? 'elevated' : 'nominal'
  };
}

async function enrichThreatIntelForIps(ips, limit = 10) {
  const unique = [...new Set((ips || []).filter(Boolean))].slice(0, limit);
  const profiles = [];
  for (const ip of unique) {
    profiles.push(await lookupIpThreatIntel(ip));
  }
  return profiles;
}

function resolvePlaybooksForIncidents(incidents, alerts) {
  const matched = [];
  const seen = new Set();

  for (const inc of incidents || []) {
    const pb = matchPlaybook(inc.classification, inc.classification);
    if (pb && !seen.has(pb.id)) {
      seen.add(pb.id);
      matched.push({ ...pb, matched_incident: inc.incidentId, match_source: 'SEC-02' });
    }
  }

  for (const a of (alerts || []).slice(0, 20)) {
    const pb = matchPlaybook(a.type, a.type);
    if (pb && !seen.has(pb.id)) {
      seen.add(pb.id);
      matched.push({ ...pb, matched_alert: a.type, match_source: 'threat-watch' });
    }
  }

  return matched.slice(0, 8);
}

async function loadSimilarIncidents(type, ip, limit = 5) {
  const results = [];
  try {
    const files = await fsp.readdir(INCIDENT_DIR);
    for (const f of files.filter((x) => x.endsWith('.json') && x !== 'latest.json')) {
      try {
        const doc = JSON.parse(await fsp.readFile(path.join(INCIDENT_DIR, f), 'utf8'));
        const sameType = doc.category === type || (type && String(doc.category || '').includes(type));
        const sameIp = ip && doc.source_ip === ip;
        if (sameType || sameIp) {
          results.push({
            id: f.replace('.json', ''),
            ip: doc.source_ip,
            type: doc.category,
            at: doc.timestamp_utc,
            severity: doc.severity
          });
        }
      } catch {
        /* skip */
      }
    }
  } catch {
    /* empty */
  }
  return results.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, limit);
}

async function ensureHardeningDir() {
  await fsp.mkdir(HARDENING_DIR, { recursive: true });
}

async function readHardeningQueue() {
  await ensureHardeningDir();
  try {
    return JSON.parse(await fsp.readFile(HARDENING_PENDING, 'utf8'));
  } catch {
    return { schema_version: 'hardening_queue_v1', items: [] };
  }
}

async function writeHardeningQueue(queue) {
  await ensureHardeningDir();
  await fsp.writeFile(HARDENING_PENDING, JSON.stringify(queue, null, 2));
}

function buildHardeningItemsFromSec11() {
  try {
    const sec11 = require('../securityAdaptiveProtection');
    const dash = sec11.buildDashboard({ force: true });
    if (!dash) return [];

    const items = [];
    const plan = dash.protectionPlan;
    const recs = plan?.antiScannerRecommendations || [];
    const surface = plan?.surfacePlan?.actions || [];

    if (dash.recommendedProfile && dash.recommendedProfile !== 'NORMAL') {
      items.push({
        id: `hr-profile-${Date.now()}`,
        type: 'protection_profile',
        governance: 'semi_automatic',
        title: `Elevar perfil para ${dash.recommendedProfile}`,
        detail: plan?.summary || dash.recommendedProfile,
        recommended_profile: dash.recommendedProfile,
        rollback: plan?.rollback,
        status: 'PENDING',
        source: 'SEC-11'
      });
    }

    for (const r of recs.slice(0, 5)) {
      items.push({
        id: `hr-scanner-${r.action || `s${items.length}`}`,
        type: 'anti_scanner',
        governance: 'semi_automatic',
        title: r.action || 'Recomendação anti-scanner',
        detail: r.rationale || '',
        priority: r.priority,
        status: 'PENDING',
        source: 'SEC-11'
      });
    }

    const surfaceActions = surface?.recommended_actions || surface?.actions || [];
    for (const a of surfaceActions.slice(0, 4)) {
      items.push({
        id: `hr-surface-${a.id || a.action || `sf${items.length}`}`,
        type: 'surface_reduction',
        governance: 'semi_automatic',
        title: a.label || a.action || 'Reduzir superfície',
        detail: a.rationale || a.description || '',
        status: 'PENDING',
        source: 'SEC-11'
      });
    }

    return items;
  } catch {
    return [];
  }
}

async function syncHardeningQueue() {
  const queue = await readHardeningQueue();
  const fresh = buildHardeningItemsFromSec11();
  const existingIds = new Set((queue.items || []).map((i) => i.id));
  const pending = (queue.items || []).filter((i) => i.status === 'PENDING');

  for (const item of fresh) {
    if (!existingIds.has(item.id)) {
      item.created_at = new Date().toISOString();
      pending.push(item);
      existingIds.add(item.id);
    }
  }

  queue.items = [
    ...pending,
    ...(queue.items || []).filter((i) => i.status !== 'PENDING')
  ].slice(0, 40);

  await writeHardeningQueue(queue);
  return queue;
}

async function appendHardeningHistory(entry) {
  await ensureHardeningDir();
  let hist = { items: [] };
  try {
    hist = JSON.parse(await fsp.readFile(HARDENING_HISTORY, 'utf8'));
  } catch {
    hist = { items: [] };
  }
  hist.items.unshift(entry);
  hist.items = hist.items.slice(0, 100);
  await fsp.writeFile(HARDENING_HISTORY, JSON.stringify(hist, null, 2));
}

async function approveHardeningItem(itemId, adminEmail, reason) {
  const queue = await readHardeningQueue();
  const item = (queue.items || []).find((i) => i.id === itemId);
  if (!item) return { ok: false, error: 'Item não encontrado' };
  if (item.status !== 'PENDING') return { ok: false, error: 'Item já processado' };

  item.status = 'APPROVED';
  item.approved_at = new Date().toISOString();
  item.approved_by = adminEmail;
  item.approval_reason = reason || 'Aprovado no Centro de Segurança';

  await writeHardeningQueue(queue);
  await appendHardeningHistory({ ...item, action: 'APPROVED' });

  return {
    ok: true,
    item,
    note: 'Aprovação registada — execução manual/SEC-12 conforme runbook (sem auto-apply em produção).'
  };
}

async function rejectHardeningItem(itemId, adminEmail, reason) {
  const queue = await readHardeningQueue();
  const item = (queue.items || []).find((i) => i.id === itemId);
  if (!item) return { ok: false, error: 'Item não encontrado' };

  item.status = 'REJECTED';
  item.rejected_at = new Date().toISOString();
  item.rejected_by = adminEmail;
  item.rejection_reason = reason || 'Rejeitado no Centro de Segurança';

  await writeHardeningQueue(queue);
  await appendHardeningHistory({ ...item, action: 'REJECTED' });

  return { ok: true, item };
}

async function buildPhaseBPayload(ctx) {
  const {
    attack_origins,
    blocked_ips,
    recent_alerts,
    failed_logins,
    threat_alerts
  } = ctx;

  const correlationIngest = ingestThreatWatchCorrelation(threat_alerts);
  const correlation = getCorrelationDashboard();
  const threatIntelProfiles = getThreatIntelProfiles(8);

  const topIps = [
    ...(attack_origins || []).map((x) => x.ip),
    ...(blocked_ips || []).map((x) => x.ip),
    ...(recent_alerts || []).map((x) => x.ip)
  ].filter(Boolean);

  const [baseline, ipIntel, hardeningQueue] = await Promise.all([
    buildBehavioralBaseline(failed_logins, threat_alerts),
    enrichThreatIntelForIps(topIps, 8),
    syncHardeningQueue()
  ]);

  const playbooks = resolvePlaybooksForIncidents(correlation.incidents, threat_alerts);
  const worldMap = buildWorldMap(attack_origins, blocked_ips, recent_alerts);

  const pendingHardening = (hardeningQueue.items || []).filter((i) => i.status === 'PENDING');

  return {
    schema_version: 'admin_security_phase_b_v1',
    correlation_ingest: correlationIngest,
    world_map: worldMap,
    behavioral_baseline: baseline,
    correlation,
    threat_intelligence: {
      sec03: threatIntelProfiles,
      ip_lookups: ipIntel
    },
    playbooks,
    hardening_queue: {
      pending: pendingHardening,
      total_pending: pendingHardening.length,
      governance_note: 'Itens 🟡 semi-automáticos — aprovação humana antes de aplicar em produção'
    },
    soc_realtime: {
      open_incidents: correlation.open_incidents || 0,
      risk_avg: correlation.average_risk_score || 0,
      countries_active: worldMap.total_countries,
      events_mapped: worldMap.total_events,
      anomalies: baseline.anomalies?.length || 0
    }
  };
}

async function findSimilarAttacks(type, ip) {
  const similar = await loadSimilarIncidents(type, ip);
  const playbook = matchPlaybook(type, type);
  return { similar, playbook: playbook || null };
}

module.exports = {
  buildPhaseBPayload,
  buildWorldMap,
  buildBehavioralBaseline,
  getCorrelationDashboard,
  getThreatIntelProfiles,
  lookupIpThreatIntel,
  resolvePlaybooksForIncidents,
  syncHardeningQueue,
  approveHardeningItem,
  rejectHardeningItem,
  findSimilarAttacks,
  matchPlaybook,
  ingestThreatWatchCorrelation
};
