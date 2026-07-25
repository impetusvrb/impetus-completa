'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const db = require('../db');
const scoreSvc = require('./adminPortalSecurityScoreService');
const phaseBSvc = require('./adminPortalSecurityPhaseBService');
const phaseCSvc = require('./adminPortalSecurityPhaseCService');
const logWindowSvc = require('./adminPortalSecurityEvidenceLogWindow');

const execFileAsync = promisify(execFile);

const { getNginxAccessLogPath } = require('../security/config/nginxAccessLogPath');
const THREAT_LOG = process.env.IMPETUS_THREAT_WATCH_LOG || '/var/log/impetus-threat-watch.log';
const NGINX_ACCESS = getNginxAccessLogPath();
const NGINX_WINDOW_MAX = 4000;
const THREAT_WINDOW_MAX = 3000;
const CF_GUARD = '/etc/nginx/snippets/impetus-cloudflare-proxy-guard.conf';
const CF_REAL_IP = '/etc/nginx/cloudflare-real-ip.conf';
const CERT_DIR = '/etc/letsencrypt/live/plataformaimpetus.com';
const NGINX_SITE_CONF = process.env.IMPETUS_NGINX_SITE_CONF || '/etc/nginx/sites-enabled/impetus';
const NGINX_ERROR_LOG = process.env.IMPETUS_NGINX_ERROR_LOG || '/var/log/nginx/error.log';
const RATE_LIMIT_WINDOW_MAX = 2000;
const RATE_LIMIT_LINE_RE =
  /limiting requests,\s*excess:\s*[\d.]+\s+by zone "([^"]+)",\s*client:\s*([0-9a-fA-F:.]+)/i;

const ALERT_RE =
  /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\]\s+ALERT\s+(LOW|MEDIUM|HIGH|CRITICAL)\s+(\S+)\s+([0-9a-fA-F:.]+)\s+—\s+(.+)$/;

const NGINX_LINE_RE =
  /^(\S+)\s+-\s+-\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s+[^"]*"\s+(\d{3})\s/;

const PRIVATE_IP_RE =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc00:|fe80:)/i;

let cache = { at: 0, payload: null };
let evidenceCache = { at: 0, payload: null };
const CACHE_MS = 30_000;

// ── INT-01D: Consumo do estado consolidado do Motor de Integridade ───────────
// Leitura via API de consumo (IntegrityStateStore.readStateFile).
// Nenhuma lógica de integridade aqui — apenas leitura e normalização.
const _IntegrityStateStore = (() => {
  try { return require('./integrity/IntegrityStateStore'); } catch { return null; }
})();

// Observabilidade interna (para SEC-OBS-002)
const _integrityObs = { reads: 0, fallbacks: 0, errors: 0, total_read_ms: 0, last_read_ms: 0 };

function getIntegrityState() {
  const t0 = Date.now();
  _integrityObs.reads++;
  const sensorEnabled = process.env.INTEGRITY_SENSOR_ENABLED === 'true';

  if (!sensorEnabled || !_IntegrityStateStore) {
    _integrityObs.fallbacks++;
    return { available: false, reason: sensorEnabled ? 'module_not_found' : 'sensor_disabled', read_ms: 0 };
  }

  try {
    const raw = _IntegrityStateStore.readStateFile();
    const elapsed = Date.now() - t0;
    _integrityObs.total_read_ms += elapsed;
    _integrityObs.last_read_ms = elapsed;

    // Fallback se: ficheiro ausente (sensor_active=false sem motor), corrompido, stale
    if (!raw || raw.error || raw.stale || !raw.sensor_active) {
      _integrityObs.fallbacks++;
      const reason = raw?.stale ? 'stale' : (raw?.reason || 'read_error');
      return { available: false, reason, read_ms: elapsed };
    }

    return {
      available:           true,
      sensor_active:       raw.sensor_active === true,
      mode:                raw.mode           || 'UNKNOWN',
      ok:                  raw.ok             === true,
      violations:          raw.violations     || 0,
      violations_last_24h: raw.violations_last_24h || 0,
      assets_monitored:    raw.assets_monitored    || 0,
      baseline_id:         raw.baseline_id    || null,
      last_check:          raw.last_check     || null,
      stats:               raw.stats          || null,
      metrics:             raw.metrics        || null,
      last_error:          raw.last_error     || null,
      read_ms:             elapsed,
    };
  } catch (e) {
    _integrityObs.errors++;
    _integrityObs.fallbacks++;
    return { available: false, reason: 'exception', error: e.message, read_ms: Date.now() - t0 };
  }
}

function getIntegrityObservability() {
  return {
    ..._integrityObs,
    avg_read_ms: _integrityObs.reads > 0
      ? parseFloat((_integrityObs.total_read_ms / _integrityObs.reads).toFixed(3))
      : 0,
  };
}

// ─── GeoIP cache com estados semânticos explícitos ───────────────────────────
// Entrada: { country, country_code, geo_state, at }
// geo_state: 'GEO_RESOLVED' | 'GEO_UNRESOLVED' | 'GEO_INVALID'
// GEO_NOT_ENRICHED é estado implícito — IP válido, ausente do cache por budget
const geoCache = new Map();

const GEO_SUCCESS_TTL_MS = 86_400_000; // 24h — resoluções bem-sucedidas
const GEO_FAIL_TTL_MS    = 300_000;    // 5min — falhas transitórias (rate-limit, timeout)
const GEO_RESOLVE_BUDGET = 30;          // máx. novos IPs por ciclo de enrichment assíncrono
const GEO_CONCURRENCY    = 5;           // máx. chamadas paralelas ao provider

// Enrichment assíncrono (001H) — single-flight, mesmo processo, sem worker PM2
let geoEnrichmentInflight = null;
let geoEnrichmentLastStats = null;

// Formato válido para IPv4 e IPv6 (heurístico — rejeita strings claramente inválidas)
const IP_FORMAT_RE = /^(?:(?:\d{1,3}\.){3}\d{1,3}|[0-9a-fA-F]{0,4}(?::[0-9a-fA-F]{0,4}){2,7})$/;

function classifyIp(ip) {
  if (!ip || typeof ip !== 'string' || ip.length < 2) return 'INVALID';
  if (PRIVATE_IP_RE.test(ip)) return 'PRIVATE';
  if (!IP_FORMAT_RE.test(ip)) return 'INVALID';
  return 'VALID';
}

function getCachedGeo(ip) {
  const entry = geoCache.get(ip);
  if (!entry || !entry.at) return null; // entrada antiga sem TTL → expirada
  const ttl = entry.geo_state === 'GEO_RESOLVED' ? GEO_SUCCESS_TTL_MS : GEO_FAIL_TTL_MS;
  if (Date.now() - entry.at > ttl) {
    geoCache.delete(ip);
    return null;
  }
  return entry;
}

/** Retorna o estado GeoIP de um IP (para uso externo pelo intelligence service) */
function getGeoState(ip) {
  const cls = classifyIp(ip);
  if (cls === 'INVALID') return 'GEO_INVALID';
  if (cls === 'PRIVATE') return 'GEO_RESOLVED';
  const cached = getCachedGeo(ip);
  if (!cached) return 'GEO_NOT_ENRICHED';
  return cached.geo_state; // 'GEO_RESOLVED' | 'GEO_UNRESOLVED'
}

async function execSafe(cmd, args, timeoutMs = 8000) {
  try {
    const { stdout } = await execFileAsync(cmd, args, {
      timeout: timeoutMs,
      maxBuffer: 2 * 1024 * 1024
    });
    return String(stdout || '').trim();
  } catch {
    return '';
  }
}

async function tailFile(filePath, maxLines = 2500) {
  try {
    await fsp.access(filePath, fs.constants.R_OK);
  } catch {
    return [];
  }
  try {
    const { stdout } = await execFileAsync('tail', ['-n', String(maxLines), filePath], {
      timeout: 12_000,
      maxBuffer: 4 * 1024 * 1024
    });
    return String(stdout || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
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
    const ips = banned ? banned.split(/\s+/).filter((ip) => ip && ip !== '') : [];
    const currentlyBanned = Number.parseInt(block.match(/Currently banned:\s+(\d+)/)?.[1] || '0', 10);
    const totalBanned = Number.parseInt(block.match(/Total banned:\s+(\d+)/)?.[1] || '0', 10);
    jails.push({ jail, currently_banned: currentlyBanned, total_banned: totalBanned, banned_ips: ips });
  }

  const allIps = [...new Set(jails.flatMap((j) => j.banned_ips))];
  return { jails, banned_ips: allIps };
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

  const combined = statusRaw + jailDetails.join('');
  const parsed = parseFail2banStatus(combined);
  return { available: true, ...parsed };
}

async function getUfwBlocks() {
  const raw = await execSafe('ufw', ['status', 'numbered']);
  // SEC-COVERAGE-001: distinguir UFW activo-sem-DENY de UFW inactivo/indisponível
  const active = /status:\s*active/i.test(raw || '');
  if (!raw || !active) return { active, blocks: [] };

  const blocks = raw
    .split('\n')
    .filter((line) => /DENY IN/i.test(line))
    .map((line) => {
      const ipMatch = line.match(
        /DENY IN\s+([0-9a-fA-F:.]+)|DENY IN\s+([0-9a-fA-F:.]+)\s+#/
      );
      const ip = ipMatch?.[1] || ipMatch?.[2] || '';
      const reason = (line.match(/#\s*(.+)$/)?.[1] || 'UFW DENY').trim();
      const idx = line.match(/^\[\s*(\d+)\]/)?.[1];
      return { rule_index: idx ? Number(idx) : null, ip, reason, source: 'ufw' };
    })
    .filter((r) => r.ip);

  return { active, blocks };
}

function parseThreatAlerts(lines) {
  const alerts = [];
  for (const line of lines) {
    const m = line.match(ALERT_RE);
    if (!m) continue;
    alerts.push({
      at: m[1],
      severity: m[2],
      type: m[3],
      ip: m[4],
      detail: m[5]
    });
  }
  return alerts;
}

function bucketSeries(alerts, hours = 24) {
  const now = Date.now();
  const buckets = new Map();
  for (let i = hours - 1; i >= 0; i -= 1) {
    const d = new Date(now - i * 3600_000);
    const key = d.toISOString().slice(0, 13);
    buckets.set(key, { label: `${String(d.getUTCHours()).padStart(2, '0')}h`, count: 0 });
  }
  for (const a of alerts) {
    const key = a.at.slice(0, 13);
    if (buckets.has(key)) buckets.get(key).count += 1;
  }
  return [...buckets.values()];
}

function bucketDaily(alerts, days = 7) {
  const now = Date.now();
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { label: key.slice(5), count: 0 });
  }
  for (const a of alerts) {
    const key = a.at.slice(0, 10);
    if (buckets.has(key)) buckets.get(key).count += 1;
  }
  return [...buckets.values()];
}

function countNginxSuspicious(lines) {
  const suspicious = [];
  for (const line of lines) {
    const m = line.match(NGINX_LINE_RE);
    if (!m) continue;
    const ip = m[1];
    const status = Number(m[5]);
    if (status === 444 || status === 403 || status === 401) {
      suspicious.push({ ip, status, path: m[4], at: m[2] });
    } else if (status === 404 && /wp-|\.env|\.git|phpmyadmin|admin\.php/i.test(m[4])) {
      suspicious.push({ ip, status, path: m[4], at: m[2] });
    }
  }
  return suspicious;
}

async function resolveCountry(ip) {
  const cls = classifyIp(ip);

  // IP inválido/malformado — nunca enviar ao provider
  if (cls === 'INVALID') {
    return { country: 'Inválido', country_code: '??', geo_state: 'GEO_INVALID' };
  }
  // IP privado — resolvido localmente
  if (cls === 'PRIVATE') {
    return { country: 'Local', country_code: 'LO', geo_state: 'GEO_RESOLVED' };
  }

  // Verificar cache com TTL
  const cached = getCachedGeo(ip);
  if (cached) return cached;

  // Consultar provider
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode`,
      { signal: AbortSignal.timeout(2500) }
    );
    const data = await res.json().catch(() => ({}));

    if (data.status === 'success') {
      const out = {
        country: data.country || 'Desconhecido',
        country_code: data.countryCode || '??',
        geo_state: 'GEO_RESOLVED',
        at: Date.now()
      };
      geoCache.set(ip, out);
      return out;
    }

    // Provider retornou status != success (rate-limit, IP privado, etc.)
    const out = { country: 'Desconhecido', country_code: '??', geo_state: 'GEO_UNRESOLVED', at: Date.now() };
    geoCache.set(ip, out); // cachear com TTL curto para evitar hammer no provider
    return out;
  } catch {
    // Timeout ou erro de rede
    const out = { country: 'Desconhecido', country_code: '??', geo_state: 'GEO_UNRESOLVED', at: Date.now() };
    geoCache.set(ip, out);
    return out;
  }
}

/**
 * Resolução bounded de IPs: passo único antes dos enrichWithCountries.
 * Prioriza IPs mais frequentes, respeita budget e concorrência limitada.
 * Após este passo, os enrichWithCountries tornam-se lookups puros ao geoCache.
 */
async function resolveIpsBounded(ipCountEntries) {
  // Selecionar IPs que precisam de resolução (válidos e fora do cache)
  const toResolve = [];
  for (const { ip, count } of ipCountEntries) {
    if (classifyIp(ip) !== 'VALID') continue;
    if (!getCachedGeo(ip)) toResolve.push({ ip, count });
  }

  // Ordenar por frequência desc (IPs mais frequentes primeiro)
  toResolve.sort((a, b) => b.count - a.count);

  // Aplicar budget — não consultar mais de GEO_RESOLVE_BUDGET IPs por ciclo
  const batch = toResolve.slice(0, GEO_RESOLVE_BUDGET);
  if (batch.length === 0) return { attempted: 0, budget_used: 0 };

  // Resolução com concorrência bounded
  let idx = 0;
  async function worker() {
    while (idx < batch.length) {
      const { ip } = batch[idx++];
      await resolveCountry(ip); // resultado vai direto ao geoCache
    }
  }
  const workers = Math.min(GEO_CONCURRENCY, batch.length);
  await Promise.all(Array.from({ length: workers }, worker));

  return {
    attempted: batch.length,
    budget_used: batch.length,
    provider_calls: batch.length
  };
}

/** Estatísticas do universo GeoIP no instante da construção (sem I/O externo). */
function computeGeoUniverseStats(ipCountEntries) {
  let geo_known_total = 0;
  let geo_not_enriched_total = 0;
  let geo_backlog_total = 0;
  let geo_invalid_total = 0;

  for (const { ip } of ipCountEntries) {
    const cls = classifyIp(ip);
    if (cls === 'INVALID') {
      geo_invalid_total += 1;
      continue;
    }
    if (cls === 'PRIVATE') {
      geo_known_total += 1;
      continue;
    }
    const cached = getCachedGeo(ip);
    if (cached) {
      geo_known_total += 1;
    } else {
      geo_not_enriched_total += 1;
      geo_backlog_total += 1;
    }
  }

  return {
    geo_known_total,
    geo_not_enriched_total,
    geo_backlog_total,
    geo_invalid_total,
    geo_universe_total: ipCountEntries.length
  };
}

/**
 * Agenda enrichment do backlog GeoIP fora do caminho crítico síncrono.
 * Single-flight: lote concorrente não inicia se outro estiver em curso.
 */
function scheduleGeoBacklogEnrichment(ipCountEntries) {
  if (geoEnrichmentInflight) {
    return geoEnrichmentInflight;
  }

  const t0 = Date.now();
  geoEnrichmentInflight = resolveIpsBounded(ipCountEntries)
    .then((result) => {
      geoEnrichmentLastStats = {
        ...result,
        geo_enrichment_duration_ms: Date.now() - t0,
        geo_enrichment_success: true,
        geo_enrichment_failure: false,
        completed_at: new Date().toISOString()
      };
      return result;
    })
    .catch(() => {
      geoEnrichmentLastStats = {
        attempted: 0,
        budget_used: 0,
        provider_calls: 0,
        geo_enrichment_duration_ms: Date.now() - t0,
        geo_enrichment_success: false,
        geo_enrichment_failure: true,
        completed_at: new Date().toISOString()
      };
      return { attempted: 0, budget_used: 0, provider_calls: 0 };
    })
    .finally(() => {
      geoEnrichmentInflight = null;
    });

  return geoEnrichmentInflight;
}

function lookupGeoEntry(ip) {
  const cls = classifyIp(ip);
  if (cls === 'INVALID') {
    return { country: 'Inválido', country_code: '??', geo_state: 'GEO_INVALID' };
  }
  if (cls === 'PRIVATE') {
    return { country: 'Local', country_code: 'LO', geo_state: 'GEO_RESOLVED' };
  }
  const cached = getCachedGeo(ip);
  if (cached) return cached;
  return { country: 'Desconhecido', country_code: '??', geo_state: 'GEO_NOT_ENRICHED' };
}

async function enrichWithCountries(items, ipKey = 'ip') {
  // Após resolveIpsBounded, lookup síncrono ao geoCache — sem await sequencial por IP.
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

async function getFailedLogins() {
  const r = await db.query(
    `SELECT l.id, l.created_at, l.acao, l.ip, l.detalhes, u.email AS admin_email
     FROM admin_logs l
     LEFT JOIN admin_users u ON u.id = l.admin_user_id
     WHERE l.acao IN ('login_falhou', 'login_bloqueado_bot')
     ORDER BY l.created_at DESC
     LIMIT 50`
  );
  return r.rows;
}

function readCertExpiry() {
  try {
    const { execFileSync } = require('child_process');
    const out = execFileSync('openssl', ['x509', '-enddate', '-noout', '-in', path.join(CERT_DIR, 'cert.pem')], {
      encoding: 'utf8',
      timeout: 5000
    });
    const dateStr = out.replace('notAfter=', '').trim();
    return { valid: true, expires_at: new Date(dateStr).toISOString(), domain: 'plataformaimpetus.com' };
  } catch {
    return { valid: false, expires_at: null, domain: 'plataformaimpetus.com' };
  }
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function detectNginxRateLimitConfigured() {
  try {
    const conf = fs.readFileSync(NGINX_SITE_CONF, 'utf8');
    return /limit_req_zone\s+/.test(conf) && /limit_req\s+zone=/.test(conf);
  } catch {
    return false;
  }
}

/**
 * SEC-OBS-001 — Telemetria de rate-limit a partir do error.log do Nginx.
 * Fonte: linhas "limiting requests … client: <ip>" (não aparece como 429/503 no access.log).
 * Leitura limitada e independente do pipeline incremental access/threat (INV-SVI).
 */
function collectNginxRateLimitHits(maxLines = RATE_LIMIT_WINDOW_MAX) {
  const candidates = [NGINX_ERROR_LOG, `${NGINX_ERROR_LOG}.1`];
  const byIp = new Map();

  for (const filePath of candidates) {
    let raw = '';
    try {
      const st = fs.statSync(filePath);
      if (!st.isFile() || st.size === 0) continue;
      const maxBytes = Math.min(st.size, 512 * 1024);
      const fd = fs.openSync(filePath, 'r');
      try {
        const buf = Buffer.alloc(maxBytes);
        fs.readSync(fd, buf, 0, maxBytes, Math.max(0, st.size - maxBytes));
        raw = buf.toString('utf8');
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      continue;
    }

    const lines = raw.split('\n');
    const start = Math.max(0, lines.length - maxLines);
    for (let i = start; i < lines.length; i += 1) {
      const line = lines[i];
      const m = line.match(RATE_LIMIT_LINE_RE);
      if (!m) continue;
      const zone = m[1];
      const ip = m[2];
      if (!ip || PRIVATE_IP_RE.test(ip)) continue;
      const tsMatch = line.match(/^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/);
      const prev = byIp.get(ip) || { ip, count: 0, zones: new Set(), last_at: null };
      prev.count += 1;
      prev.zones.add(zone);
      if (tsMatch) prev.last_at = tsMatch[1];
      byIp.set(ip, prev);
    }

    if (byIp.size > 0) break; // janela actual (ou .1) já tem telemetria
  }

  return [...byIp.values()]
    .map((h) => ({
      ip: h.ip,
      count: h.count,
      zones: [...h.zones],
      last_at: h.last_at,
      source: 'nginx_rate_limit'
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);
}

function getInfrastructureStatus() {
  const site = (process.env.ADMIN_PORTAL_TURNSTILE_SITE_KEY || '').trim();
  const secret = (process.env.ADMIN_PORTAL_TURNSTILE_SECRET_KEY || '').trim();
  return {
    cloudflare_proxy_guard: fileExists(CF_GUARD),
    cloudflare_real_ip: fileExists(CF_REAL_IP) || fileExists('/etc/nginx/conf.d/cloudflare-real-ip.conf'),
    ssl: readCertExpiry(),
    turnstile: !!(site && secret),
    admin_mfa_enabled: process.env.IMPETUS_ADMIN_PORTAL_MFA_ENABLED === 'true',
    threat_watch_config: fileExists('/etc/impetus/threat-watch.env'),
    security_observatory: process.env.SECURITY_OBSERVATORY === 'true',
    security_mode: process.env.SECURITY_PROTECTION_MODE || 'observe',
    fail2ban_expected: true,
    nginx_rate_limit: detectNginxRateLimitConfigured()
  };
}

function getAiDetections(observatoryPayload) {
  const events = observatoryPayload?.recent_events || [];
  const timeline = observatoryPayload?.dashboard?.timeline || [];
  const classifications = observatoryPayload?.dashboard?.top_classifications || [];

  return {
    enabled: !!observatoryPayload?.observatory_enabled,
    mode: observatoryPayload?.mode || 'observational_only',
    health: observatoryPayload?.dashboard?.security_health || 'unknown',
    recent_events: events.slice(0, 25).map((e) => ({
      at: e.observed_at || e.window_end || e.created_at,
      classification: e.classification,
      event_type: e.event_type,
      source_ip: e.source_ip,
      path_prefix: e.path_prefix,
      request_count: e.request_count
    })),
    top_classifications: classifications,
    timeline: timeline.slice(0, 20)
  };
}

async function collectSecurityEvidence(options = {}) {
  const useLegacyLogs = options.useLegacyLogs === true;

  const logAcquire = useLegacyLogs
    ? async (filePath, max, key) => logWindowSvc.acquireLogWindowLegacy(filePath, max)
    : async (filePath, max, key) => logWindowSvc.acquireLogWindow(filePath, max, key);

  const [fail2ban, ufwResult, threatResult, nginxResult, failedLogins] = await Promise.all([
    getFail2ban(),
    getUfwBlocks(),
    logAcquire(THREAT_LOG, THREAT_WINDOW_MAX, 'threat'),
    logAcquire(NGINX_ACCESS, NGINX_WINDOW_MAX, 'nginx'),
    getFailedLogins()
  ]);

  // SEC-COVERAGE-001: getUfwBlocks agora retorna { active, blocks }
  const ufwBlocks = ufwResult.blocks;
  const ufwActive = ufwResult.active;

  const threatLines = threatResult.lines;
  const nginxLines = nginxResult.lines;

  const evidenceBuild =
    threatResult.metrics.mode === 'INCREMENTAL' && nginxResult.metrics.mode === 'INCREMENTAL'
      ? 'INCREMENTAL'
      : 'FULL_REBUILD';

  const evidenceBuildBase = {
    evidence_build_mode: evidenceBuild,
    evidence_build_reason:
      evidenceBuild === 'INCREMENTAL'
        ? [threatResult.metrics.reason, nginxResult.metrics.reason].filter(Boolean).join(';') || null
        : [threatResult.metrics.reason, nginxResult.metrics.reason].filter(Boolean).join(';') || 'FULL_REBUILD',
    nginx_new_bytes: nginxResult.metrics.new_bytes,
    nginx_new_lines: nginxResult.metrics.new_lines,
    nginx_window_size: nginxResult.metrics.window_size,
    threat_new_bytes: threatResult.metrics.new_bytes,
    threat_new_lines: threatResult.metrics.new_lines,
    threat_window_size: threatResult.metrics.window_size
  };

  const threatAlerts = parseThreatAlerts(threatLines);
  const recentAlerts = threatAlerts.slice(-80).reverse();
  const hourlySeries = bucketSeries(threatAlerts, 24);
  const dailySeries = bucketDaily(threatAlerts, 7);

  // SEC-OBS-001: telemetria de rate-limit (error.log) — independente do access.log
  const rateLimitHitsRaw = collectNginxRateLimitHits();

  const nginxSuspicious = countNginxSuspicious(nginxLines);
  const ipCounts = new Map();
  for (const s of nginxSuspicious) {
    ipCounts.set(s.ip, (ipCounts.get(s.ip) || 0) + 1);
  }
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

  const criticalTypes = new Set([
    'HTTP_CREDENTIAL_PROBE',
    'SSH_BRUTE_FORCE',
    'HTTP_404_FLOOD',
    'SCANNER_UA',
    'HTTP_WRITE_ATTEMPT'
  ]);
  const criticalEvents = recentAlerts.filter(
    (a) => a.severity === 'HIGH' || a.severity === 'CRITICAL' || criticalTypes.has(a.type)
  );

  let geoUniverseStats = { geo_backlog_total: 0, geo_known_total: 0, geo_not_enriched_total: 0 };
  let ipEntriesForAsyncEnrichment = [];
  {
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
    // 002: candidatos de enrichment contextual — prioridade operacional de resolução GeoIP,
    // NÃO peso de risco (INV-SVI2-001). Não entram em world_map nem badges.
    addIps(failedLogins, 'ip', 1);
    addIps(rateLimitHitsRaw, 'ip', 1);
    try {
      const sec01 = require('../securityObservatory');
      const obsEvents = (sec01.getAuditPayload()?.recent_events || []).slice(0, 25);
      addIps(obsEvents, 'source_ip', 1);
    } catch {
      /* observatório indisponível — backlog 002 parcial */
    }
    ipEntriesForAsyncEnrichment = [...ipCountMap.entries()].map(([ip, count]) => ({ ip, count }));
    geoUniverseStats = computeGeoUniverseStats(ipEntriesForAsyncEnrichment);
  }

  const evidenceBuildMeta = {
    ...evidenceBuildBase,
    geo_enrichment_mode: 'ASYNC_DECOUPLED',
    geo_sync_provider_calls: 0,
    geo_backlog_total: geoUniverseStats.geo_backlog_total,
    geo_known_total: geoUniverseStats.geo_known_total,
    geo_not_enriched_total: geoUniverseStats.geo_not_enriched_total,
    geo_enrichment_inflight: !!geoEnrichmentInflight,
    geo_enrichment_selected: geoEnrichmentLastStats?.attempted ?? null,
    geo_enrichment_provider_calls: geoEnrichmentLastStats?.provider_calls ?? null,
    geo_enrichment_duration_ms: geoEnrichmentLastStats?.geo_enrichment_duration_ms ?? null
  };

  const [
    blockedWithGeo,
    originsWithGeo,
    alertsForWorldMap,
    criticalEventsEnriched,
    failedLoginsWithGeo,
    rateLimitHitsWithGeo
  ] = await Promise.all([
    enrichWithCountries(blockedUnique.slice(0, 25)),
    enrichWithCountries(topAttackIps),
    enrichWithCountries(recentAlerts),
    enrichWithCountries(criticalEvents.slice(0, 30)),
    enrichWithCountries(failedLogins),
    enrichWithCountries(rateLimitHitsRaw)
  ]);

  const alertsForPayload = alertsForWorldMap.slice(0, 20);
  const worldMap = phaseBSvc.buildWorldMap(originsWithGeo, blockedWithGeo, alertsForWorldMap);
  const generatedAt = new Date().toISOString();

  const summary = {
    blocked_ips_total: blockedUnique.length,
    fail2ban_banned: fail2ban.banned_ips.length,
    ufw_denies: ufwBlocks.length,
    failed_logins_24h: failedLogins.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return Date.now() - t < 86_400_000;
    }).length,
    alerts_24h: threatAlerts.filter((a) => Date.now() - new Date(a.at).getTime() < 86_400_000).length,
    critical_open: criticalEvents.length,
    recent_alerts_analytical: alertsForWorldMap.length,
    recent_alerts_display: alertsForPayload.length
  };

  const payload = {
    schema_version: 'admin_security_evidence_v1',
    snapshot_id: generatedAt,
    generated_at: generatedAt,
    fail2ban,
    ufwBlocks,
    ufw_active: ufwActive,
    threatAlerts,
    recentAlerts,
    hourlySeries,
    dailySeries,
    failedLogins: failedLoginsWithGeo,
    attack_origins: originsWithGeo,
    blocked_ips: blockedWithGeo,
    recent_alerts_analytical: alertsForWorldMap,
    recent_alerts_display: alertsForPayload,
    critical_events: criticalEventsEnriched,
    // SEC-FLOW-002: hits nginx individuais com timestamps para radar volumétrico.
    // Já computados em countNginxSuspicious; exportados aqui para evitar re-leitura de disco.
    nginx_suspicious_hits: nginxSuspicious,
    rate_limit_hits: rateLimitHitsWithGeo,
    world_map: worldMap,
    infrastructure: getInfrastructureStatus(),
    summary,
    evidence_build: evidenceBuildMeta
  };

  // 001H: enrichment após snapshot publicado — zero provider no critical path
  if (ipEntriesForAsyncEnrichment.length > 0) {
    setImmediate(() => scheduleGeoBacklogEnrichment(ipEntriesForAsyncEnrichment));
  }

  return payload;
}

async function getSecurityEvidence(force = false) {
  const now = Date.now();
  if (!force && evidenceCache.payload && now - evidenceCache.at < CACHE_MS) {
    return {
      ...evidenceCache.payload,
      from_cache: true,
      evidence_build: {
        ...(evidenceCache.payload.evidence_build || {}),
        evidence_build_mode: 'CACHE_HIT'
      }
    };
  }
  const payload = await collectSecurityEvidence();
  evidenceCache = { at: now, payload };
  return { ...payload, from_cache: false };
}

async function buildDashboard() {
  const evidence = await getSecurityEvidence(false);

  let observatoryPayload = null;
  try {
    const sec01 = require('../securityObservatory');
    observatoryPayload = sec01.getAuditPayload();
  } catch {
    observatoryPayload = null;
  }

  const lockdownActive = scoreSvc.isLockdownActive();
  let lockdownState = null;
  if (lockdownActive) {
    try {
      lockdownState = JSON.parse(fs.readFileSync('/var/lib/impetus/lockdown/active.json', 'utf8'));
    } catch {
      lockdownState = { active: true };
    }
  }

  const infra = evidence.infrastructure;
  const summary = evidence.summary;
  const fail2ban = evidence.fail2ban;
  const threatAlerts = evidence.threatAlerts;
  const criticalEvents = evidence.recentAlerts.filter(
    (a) => a.severity === 'HIGH' || a.severity === 'CRITICAL'
      || ['HTTP_CREDENTIAL_PROBE', 'SSH_BRUTE_FORCE', 'HTTP_404_FLOOD', 'SCANNER_UA', 'HTTP_WRITE_ATTEMPT'].includes(a.type)
  );

  const [securityScore, autoAudit, fileIncidents] = await Promise.all([
    scoreSvc.computeSecurityScore1000({
      infrastructure: infra,
      fail2ban,
      summary,
      lockdownActive
    }),
    scoreSvc.runAutoAudit(infra, fail2ban),
    scoreSvc.loadRecentIncidents(12)
  ]);

  const riskLevel = scoreSvc.computeRiskLevel(threatAlerts, summary, lockdownActive);

  const graphSources = [
    ...fileIncidents.slice(0, 8),
    ...criticalEvents.slice(0, 5).map((e, i) => ({
      id: `alert-${i}`,
      ip: e.ip,
      type: e.type,
      detail: e.detail,
      at: e.at
    }))
  ];
  const attackGraphs = graphSources
    .filter((g, idx, arr) => arr.findIndex((x) => x.ip === g.ip && x.type === g.type) === idx)
    .slice(0, 10)
    .map((inc) => scoreSvc.buildAttackGraph(inc));

  const phaseB = await phaseBSvc.buildPhaseBPayload({
    attack_origins: evidence.attack_origins,
    blocked_ips: evidence.blocked_ips,
    recent_alerts: evidence.recent_alerts_analytical,
    failed_logins: evidence.failedLogins,
    threat_alerts: threatAlerts
  });

  const phaseC = await phaseCSvc.buildPhaseCPayload({ runSimulation: false });

  return {
    schema_version: 'admin_security_dashboard_v4',
    snapshot_id: evidence.snapshot_id,
    generated_at: evidence.generated_at,
    refresh_interval_sec: 30,
    summary,
    risk_level: riskLevel,
    security_score: securityScore,
    auto_audit: autoAudit,
    lockdown: { active: lockdownActive, state: lockdownState },
    attack_graphs: attackGraphs,
    phase_b: {
      ...phaseB,
      world_map: evidence.world_map
    },
    phase_c: phaseC,
    infrastructure: infra,
    fail2ban,
    blocked_ips: evidence.blocked_ips,
    failed_logins: evidence.failedLogins,
    attack_origins: evidence.attack_origins,
    charts: {
      attacks_per_hour: evidence.hourlySeries,
      attacks_per_day: evidence.dailySeries
    },
    critical_events: evidence.critical_events,
    recent_alerts: evidence.recent_alerts_display,
    recent_alerts_analytical_count: evidence.recent_alerts_analytical.length,
    ai_detections: await (async () => {
      const ai = getAiDetections(observatoryPayload);
      const recent_events = await enrichWithCountries(ai.recent_events, 'source_ip');
      return { ...ai, recent_events };
    })(),
    // INT-01D: Estado consolidado do Motor de Integridade (leitura apenas).
    // Nenhuma lógica de integridade aqui — geração pertence ao motor.
    integrity_state: getIntegrityState(),
  };
}

async function getSecurityDashboard(force = false) {
  const now = Date.now();
  if (!force && cache.payload && now - cache.at < CACHE_MS) {
    return { ...cache.payload, from_cache: true };
  }
  if (force) {
    evidenceCache = { at: 0, payload: null };
  }
  const payload = await buildDashboard();
  cache = { at: now, payload };
  return { ...payload, from_cache: false };
}

module.exports = {
  getSecurityDashboard,
  getSecurityEvidence,
  buildDashboard,
  collectSecurityEvidence,
  getGeoState,
  explainBlockedIp: scoreSvc.explainBlockedIp,
  approveHardening: phaseBSvc.approveHardeningItem,
  rejectHardening: phaseBSvc.rejectHardeningItem,
  findSimilarAttacks: phaseBSvc.findSimilarAttacks,
  runSimulation: phaseCSvc.runWeeklySimulation,
  approvePromotion: phaseCSvc.approvePromotionItem,
  // INT-01D: API de consumo do estado do Motor de Integridade
  getIntegrityState,
  getIntegrityObservability,
};
