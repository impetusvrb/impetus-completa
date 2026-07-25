'use strict';

/**
 * SEC-FLOW-002 — Radar Volumétrico Global / País / IP
 *
 * Evolução do SEC-FLOW-001. Motor único, três escopos:
 *   scope = GLOBAL  → todos os eventos da janela
 *   scope = ORIGIN  → filtrado por country_code
 *   scope = IP      → filtrado por IP individual
 *
 * Fontes integradas (prioridade de deduplicação):
 *   1. THREAT_WATCH  — alertas individuais com timestamp ISO UTC
 *   2. CRITICAL_EVENT — subset HIGH/CRITICAL já enriquecido com geo
 *   3. ADMIN_LOG      — failedLogins com created_at SQL
 *   4. NGINX          — hits suspeitos com timestamp nginx
 *
 * Deduplicação: por chave ip+segundo+tipo. Prioridade: THREAT_WATCH > CRITICAL_EVENT > ADMIN_LOG > NGINX
 * Bucketing adaptativo por janela temporal.
 * Nenhum mock. Nenhuma invenção de timestamp.
 */

const dashboardSvc = require('./adminPortalSecurityDashboardService');

// ─── Fases de ataque ──────────────────────────────────────────────────────────
const PHASES = [
  {
    id: 'RECONHECIMENTO',
    label: 'Reconhecimento / Varredura',
    description: 'Descoberta de superfície, scan de portas, enumeração de rotas',
    match: (t) => /SCANNER|404_FLOOD|PROBE|PATH_DISCOVERY|SCAN|ENUM/i.test(t),
  },
  {
    id: 'AUTENTICACAO',
    label: 'Tentativas de Autenticação',
    description: 'Força bruta, credential stuffing, login flood',
    match: (t) => /CREDENTIAL|BRUTE|AUTH_FAIL|LOGIN_FLOOD|PASSWORD|AUTH_FAILURE/i.test(t),
  },
  {
    id: 'EXPLORACAO',
    label: 'Exploração de Rotas',
    description: 'Injeção, traversal, tentativa de escrita ou execução',
    match: (t) => /WRITE_ATTEMPT|INJECT|INJECTION|LFI|RFI|TRAVERSAL|EXPLOIT|XSS|SSRF/i.test(t),
  },
  {
    id: 'BLOQUEIO',
    label: 'Bloqueios Activos',
    description: 'Atividade contida por fail2ban, UFW ou rate limit',
    match: (t) => /FAIL2BAN|BLOCKED|BANNED|RATE_LIMIT|THROTTLE/i.test(t),
  },
  {
    id: 'IMPACTO',
    label: 'Tentativa de Impacto',
    description: 'SSH brute force, tentativa de comprometimento de sessão/dados',
    match: (t) => /SSH_BRUTE|IMPACT|COMMAND|EXECUTE|PRIV_ESC|TAKEOVER/i.test(t),
  },
];

const PHASE_TO_LAYERS = {
  RECONHECIMENTO: ['NGINX', 'CLOUDFLARE', 'RATE_LIMIT', 'OBSERVATORY'],
  AUTENTICACAO:   ['AUTH_GUARD', 'BOT_DETECT', 'CORRELATION', 'OBSERVATORY', 'INCIDENT'],
  EXPLORACAO:     ['INPUT_VAL', 'INJECT_PROT', 'NGINX', 'OBSERVATORY', 'AUDIT'],
  BLOQUEIO:       ['FAIL2BAN', 'UFW', 'NGINX', 'INCIDENT'],
  IMPACTO:        ['AUTH_GUARD', 'RBAC', 'TENANT_ISO', 'DB_PROTECT', 'INCIDENT', 'GOVERNANCE'],
};

const SEV_WEIGHT = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

// Prioridade de fonte para deduplicação
const SOURCE_PRIORITY = { THREAT_WATCH: 4, CRITICAL_EVENT: 3, ADMIN_LOG: 2, NGINX: 1 };

function classifyPhase(type) {
  const t = String(type || '').toUpperCase();
  for (const p of PHASES) {
    if (p.match(t)) return p.id;
  }
  if (/HTTP_404|HTTP_403|HTTP_401|HTTP_444/.test(t)) return 'RECONHECIMENTO';
  if (/AUTH|LOGIN/.test(t)) return 'AUTENTICACAO';
  return 'RECONHECIMENTO';
}

// ─── Parser de timestamp nginx ─────────────────────────────────────────────────
// Formato: "14/Jul/2026:00:12:48 +0000"
const MONTH_IDX = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
const NGINX_TS_RE = /^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s+([+-])(\d{2})(\d{2})$/;

function parseNginxTimestamp(s) {
  if (!s) return null;
  const m = NGINX_TS_RE.exec(s.trim());
  if (!m) return null;
  const [, day, mon, year, h, mi, sec, sign, tzH, tzM] = m;
  const monthIdx = MONTH_IDX[mon];
  if (monthIdx === undefined) return null;
  const tzOffsetMs = (sign === '-' ? -1 : 1) * (parseInt(tzH, 10) * 60 + parseInt(tzM, 10)) * 60000;
  const utcMs = Date.UTC(+year, monthIdx, +day, +h, +mi, +sec) - tzOffsetMs;
  return Number.isFinite(utcMs) ? utcMs : null;
}

function toTimestampMs(val) {
  if (!val) return null;
  // ISO/SQL format first
  const iso = new Date(val).getTime();
  if (Number.isFinite(iso) && !isNaN(iso)) return iso;
  // Nginx format fallback
  return parseNginxTimestamp(val);
}

// ─── Parser de janela temporal ────────────────────────────────────────────────
const WINDOW_MS = { '1h': 3_600_000, '6h': 21_600_000, '24h': 86_400_000 };

function parseWindow(w) {
  return WINDOW_MS[w] || WINDOW_MS['24h'];
}

function getBucketConfig(windowMs) {
  if (windowMs <= 3_600_000)  return { bucketMs: 300_000,    labelFmt: 'HH:MM' };  // 1h  → 5min (12 buckets)
  if (windowMs <= 21_600_000) return { bucketMs: 900_000,    labelFmt: 'HH:MM' };  // 6h  → 15min (24 buckets)
  return                              { bucketMs: 3_600_000,  labelFmt: 'HH:MM' };  // 24h → 1h (24 buckets)
}

function formatBucketLabel(tsMs, bucketMs) {
  const d = new Date(tsMs);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  if (bucketMs < 3_600_000) return `${h}:${mi}`;
  return `${h}h`;
}

// ─── Lookup geográfico por IP ─────────────────────────────────────────────────
function buildGeoLookup(evidence) {
  const map = {};
  const sources = [
    evidence.attack_origins || [],
    evidence.blocked_ips || [],
    evidence.recent_alerts_analytical || [],
    evidence.critical_events || [],
    evidence.failedLogins || [],
  ];
  for (const list of sources) {
    for (const item of list) {
      if (item.ip && item.country_code && !map[item.ip]) {
        map[item.ip] = { country_code: item.country_code, country: item.country || item.country_code };
      }
    }
  }
  return map;
}

// ─── Normalização de fontes para modelo canônico ──────────────────────────────
function normalizeEvents(evidence, geoLookup) {
  const events = [];

  // Fonte 1 — THREAT_WATCH (alertas individuais com timestamp ISO)
  // Usa recent_alerts_analytical (últimos 80 com geo) + threatAlerts para histórico sem geo
  const analyticalSet = new Set((evidence.recent_alerts_analytical || []).map(a => `${a.ip}:${a.at}:${a.type}`));
  for (const a of (evidence.recent_alerts_analytical || [])) {
    const ts = toTimestampMs(a.at);
    if (!ts) continue;
    events.push({
      ts,
      source: 'THREAT_WATCH',
      ip: a.ip || '?',
      country_code: a.country_code || geoLookup[a.ip]?.country_code || '??',
      country: a.country || geoLookup[a.ip]?.country || 'Desconhecido',
      event_type: a.type || 'ALERT',
      severity: (a.severity || 'MEDIUM').toUpperCase(),
      path: null,
      status_code: null,
      blocked: false,
      phase: classifyPhase(a.type),
      detail: String(a.detail || '').slice(0, 80),
      dedup_key: `${a.ip}:${Math.floor(ts / 1000)}:${a.type || 'ALERT'}`,
    });
  }

  // Adicionar alertas mais antigos do threatAlerts que não estão em recent_alerts_analytical
  for (const a of (evidence.threatAlerts || [])) {
    if (analyticalSet.has(`${a.ip}:${a.at}:${a.type}`)) continue;
    const ts = toTimestampMs(a.at);
    if (!ts) continue;
    const geo = geoLookup[a.ip] || {};
    events.push({
      ts,
      source: 'THREAT_WATCH',
      ip: a.ip || '?',
      country_code: geo.country_code || '??',
      country: geo.country || 'Desconhecido',
      event_type: a.type || 'ALERT',
      severity: (a.severity || 'MEDIUM').toUpperCase(),
      path: null,
      status_code: null,
      blocked: false,
      phase: classifyPhase(a.type),
      detail: String(a.detail || '').slice(0, 80),
      dedup_key: `${a.ip}:${Math.floor(ts / 1000)}:${a.type || 'ALERT'}`,
    });
  }

  // Fonte 2 — ADMIN_LOG (failedLogins com created_at SQL)
  for (const l of (evidence.failedLogins || [])) {
    const ts = toTimestampMs(l.created_at || l.at);
    if (!ts) continue;
    const geo = geoLookup[l.ip] || {};
    events.push({
      ts,
      source: 'ADMIN_LOG',
      ip: l.ip || '?',
      country_code: l.country_code || geo.country_code || '??',
      country: l.country || geo.country || 'Desconhecido',
      event_type: 'AUTH_FAILURE',
      severity: 'HIGH',
      path: null,
      status_code: 401,
      blocked: false,
      phase: 'AUTENTICACAO',
      detail: String(l.acao || l.detalhes || '').slice(0, 80),
      dedup_key: `${l.ip}:${Math.floor(ts / 1000)}:AUTH_FAILURE`,
    });
  }

  // Fonte 3 — NGINX (hits suspeitos com timestamp nginx — maior volume bruto)
  for (const hit of (evidence.nginx_suspicious_hits || [])) {
    const ts = parseNginxTimestamp(hit.at);
    if (!ts) continue;
    const geo = geoLookup[hit.ip] || {};
    const status = hit.status;
    const phase = (status === 401 || status === 403) ? 'AUTENTICACAO' : 'RECONHECIMENTO';
    const sev = (status === 444 || status === 403) ? 'HIGH' : 'MEDIUM';
    events.push({
      ts,
      source: 'NGINX',
      ip: hit.ip || '?',
      country_code: geo.country_code || '??',
      country: geo.country || 'Desconhecido',
      event_type: `HTTP_${status}`,
      severity: sev,
      path: String(hit.path || '').slice(0, 120),
      status_code: status,
      blocked: status === 444 || status === 403,
      phase,
      detail: `${hit.path || ''} → ${status}`,
      dedup_key: `${hit.ip}:${Math.floor(ts / 1000)}:HTTP_${status}`,
    });
  }

  return events;
}

// ─── Deduplicação por chave + prioridade de fonte ─────────────────────────────
function deduplicateEvents(events) {
  const seen = new Map();
  for (const ev of events) {
    const key = ev.dedup_key;
    if (!seen.has(key)) {
      seen.set(key, ev);
    } else {
      const existing = seen.get(key);
      if ((SOURCE_PRIORITY[ev.source] || 0) > (SOURCE_PRIORITY[existing.source] || 0)) {
        seen.set(key, ev);
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.ts - b.ts);
}

// ─── Bucketing adaptativo ─────────────────────────────────────────────────────
function bucketEvents(events, windowMs, { countryCode = null, ipFilter = null } = {}) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const { bucketMs } = getBucketConfig(windowMs);
  const numBuckets = Math.ceil(windowMs / bucketMs);

  const buckets = [];
  for (let i = numBuckets - 1; i >= 0; i--) {
    const ts = now - (i + 1) * bucketMs;
    buckets.push({
      ts,
      ts_end: ts + bucketMs,
      label: formatBucketLabel(ts, bucketMs),
      total: 0,
      weighted: 0,
      unique_ips_s: new Set(),
      active_countries_s: new Set(),
      blocked: 0,
      critical: 0,
      by_phase: {},
      by_severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
      by_country: {},
      by_ip: {},
      top_events: [],
    });
  }

  for (const ev of events) {
    if (ev.ts < windowStart || ev.ts > now) continue;
    if (countryCode && ev.country_code !== countryCode) continue;
    if (ipFilter && ev.ip !== ipFilter) continue;

    const elapsed = now - ev.ts;
    const bucketIdx = Math.min(numBuckets - 1, Math.floor(elapsed / bucketMs));
    // Bucket idx 0 = oldest; buckets array is oldest-first
    const realIdx = numBuckets - 1 - bucketIdx;
    if (realIdx < 0 || realIdx >= numBuckets) continue;

    const b = buckets[realIdx];
    const sev = (ev.severity || 'LOW').toUpperCase();
    const weight = SEV_WEIGHT[sev] || 1;

    b.total++;
    b.weighted += weight;
    b.unique_ips_s.add(ev.ip);
    if (ev.country_code && ev.country_code !== '??') b.active_countries_s.add(ev.country_code);
    if (ev.blocked) b.blocked++;
    if (sev === 'CRITICAL' || sev === 'HIGH') b.critical++;
    b.by_phase[ev.phase] = (b.by_phase[ev.phase] || 0) + 1;
    if (Object.prototype.hasOwnProperty.call(b.by_severity, sev)) b.by_severity[sev]++;
    if (ev.country_code && ev.country_code !== '??') {
      b.by_country[ev.country_code] = (b.by_country[ev.country_code] || 0) + 1;
    }
    if (ev.ip) b.by_ip[ev.ip] = (b.by_ip[ev.ip] || 0) + 1;

    if (b.top_events.length < 5) {
      b.top_events.push({
        at: new Date(ev.ts).toISOString(),
        ip: ev.ip,
        type: ev.event_type,
        phase: ev.phase,
        severity: sev,
        detail: ev.detail || '',
        country_code: ev.country_code,
        source: ev.source,
        path: ev.path || null,
      });
    }
  }

  return buckets.map((b) => ({
    ts: b.ts,
    ts_end: b.ts_end,
    label: b.label,
    total: b.total,
    weighted: b.weighted,
    unique_ips: b.unique_ips_s.size,
    active_countries: b.active_countries_s.size,
    blocked: b.blocked,
    critical: b.critical,
    by_phase: b.by_phase,
    by_severity: b.by_severity,
    by_country: b.by_country,
    by_ip: b.by_ip,
    top_events: b.top_events,
    is_peak: false,
    peak_severity: null,
  }));
}

// ─── Detecção de picos ────────────────────────────────────────────────────────
function detectPeaks(buckets) {
  const counts = buckets.map((b) => b.total);
  const WIN = 4;
  return buckets.map((b, i) => {
    if (b.total === 0) return { ...b, is_peak: false, peak_severity: null };
    const lo = Math.max(0, i - WIN);
    const hi = Math.min(counts.length, i + WIN + 1);
    const neighbors = counts.slice(lo, hi).filter((_, j) => lo + j !== i);
    const mean = neighbors.length > 0
      ? neighbors.reduce((s, v) => s + v, 0) / neighbors.length
      : 0;
    const isPeak = mean === 0 ? b.total > 1 : b.total >= mean * 1.5 && b.total > mean + 1;
    let peakSev = null;
    if (isPeak) {
      if (b.by_severity.CRITICAL > 0) peakSev = 'critical';
      else if (b.by_severity.HIGH > 0 || b.critical > 0) peakSev = 'high';
      else peakSev = 'medium';
    }
    return { ...b, is_peak: isPeak, peak_severity: peakSev };
  });
}

// ─── Contribuição por país ────────────────────────────────────────────────────
function buildCountryContribution(events, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const halfStart = now - windowMs / 2;

  const map = {};
  let globalTotal = 0;

  for (const ev of events) {
    if (ev.ts < windowStart) continue;
    globalTotal++;
    const cc = ev.country_code || '??';
    if (!map[cc]) {
      map[cc] = { country_code: cc, country: ev.country || cc, total: 0, recent: 0, ips: new Set() };
    }
    map[cc].total++;
    if (ev.ts >= halfStart) map[cc].recent++;
    map[cc].ips.add(ev.ip);
  }

  return Object.values(map)
    .filter((c) => c.country_code !== '??')
    .sort((a, b) => b.total - a.total)
    .slice(0, 15)
    .map((c) => {
      const prevCount = c.total - c.recent;
      const delta =
        prevCount > 0
          ? Math.round(((c.recent - prevCount) / prevCount) * 100)
          : c.recent > 0 ? 100 : 0;
      return {
        country_code: c.country_code,
        country: c.country,
        total: c.total,
        pct_global: globalTotal > 0 ? +(c.total / globalTotal * 100).toFixed(1) : 0,
        unique_ips: c.ips.size,
        delta_pct: delta,
      };
    });
}

// ─── Contribuição por IP ──────────────────────────────────────────────────────
function buildIpContribution(events, { countryCode = null, globalTotal = 0, windowMs } = {}) {
  const now = Date.now();
  const windowStart = now - windowMs;

  const map = {};
  let scopeTotal = 0;

  for (const ev of events) {
    if (ev.ts < windowStart) continue;
    if (countryCode && ev.country_code !== countryCode) continue;
    scopeTotal++;
    const ip = ev.ip || '?';
    if (!map[ip]) {
      map[ip] = {
        ip,
        country_code: ev.country_code || '??',
        total: 0,
        blocked: 0,
        first_ts: ev.ts,
        last_ts: ev.ts,
        phases: new Set(),
        sources: new Set(),
      };
    }
    map[ip].total++;
    if (ev.blocked) map[ip].blocked++;
    if (ev.ts < map[ip].first_ts) map[ip].first_ts = ev.ts;
    if (ev.ts > map[ip].last_ts) map[ip].last_ts = ev.ts;
    map[ip].phases.add(ev.phase);
    map[ip].sources.add(ev.source);
  }

  return Object.values(map)
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)
    .map((ip) => ({
      ip: ip.ip,
      country_code: ip.country_code,
      total: ip.total,
      pct_scope: scopeTotal > 0 ? +(ip.total / scopeTotal * 100).toFixed(1) : 0,
      pct_global: globalTotal > 0 ? +(ip.total / globalTotal * 100).toFixed(1) : 0,
      blocked: ip.blocked,
      first_seen: new Date(ip.first_ts).toISOString(),
      last_seen: new Date(ip.last_ts).toISOString(),
      phases: [...ip.phases],
      sources: [...ip.sources],
    }));
}

// ─── Sinais de escalada coordenada ────────────────────────────────────────────
function computeEscalationSignals(buckets, events, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const activeBuckets = buckets.filter((b) => b.total > 0);
  const grandTotal = buckets.reduce((s, b) => s + b.total, 0);

  if (activeBuckets.length < 2 || grandTotal < 5) {
    return {
      status: 'NORMAL',
      reason_codes: [],
      coordination_index: 0,
      detail: 'Volume insuficiente para análise de escalada.',
    };
  }

  const half = Math.floor(buckets.length / 2);
  const firstTotal = buckets.slice(0, half).reduce((s, b) => s + b.total, 0);
  const secondTotal = buckets.slice(half).reduce((s, b) => s + b.total, 0);

  const midpoint = now - windowMs / 2;
  const firstIps = new Set();
  const secondIps = new Set();
  const firstCountries = new Set();
  const secondCountries = new Set();

  for (const ev of events) {
    if (ev.ts < windowStart) continue;
    if (ev.ts < midpoint) {
      firstIps.add(ev.ip);
      if (ev.country_code && ev.country_code !== '??') firstCountries.add(ev.country_code);
    } else {
      secondIps.add(ev.ip);
      if (ev.country_code && ev.country_code !== '??') secondCountries.add(ev.country_code);
    }
  }

  const reason_codes = [];
  let score = 0;

  // VOLUME_ACCELERATION
  if (firstTotal > 0 && secondTotal > firstTotal * 1.5) {
    reason_codes.push('VOLUME_ACCELERATION');
    score += 30;
  }

  // SOURCE_EXPANSION
  const ipDelta = secondIps.size - firstIps.size;
  if (ipDelta >= 3 || (firstIps.size > 0 && ipDelta / firstIps.size > 0.4)) {
    reason_codes.push('SOURCE_EXPANSION');
    score += 25;
  }

  // GEO_EXPANSION
  if (secondCountries.size - firstCountries.size >= 2) {
    reason_codes.push('GEO_EXPANSION');
    score += 20;
  }

  // TEMPORAL_SYNCHRONY — múltiplos países em pico simultâneo
  const avgTotal = grandTotal / buckets.length;
  const syncBuckets = buckets.filter((b) => b.active_countries >= 3 && b.total > avgTotal * 1.3);
  if (syncBuckets.length >= 1) {
    reason_codes.push('TEMPORAL_SYNCHRONY');
    score += 25;
  }

  // CONCENTRATION — top IP > 50% do total
  const ipTotals = {};
  for (const b of buckets) {
    for (const [ip, cnt] of Object.entries(b.by_ip || {})) {
      ipTotals[ip] = (ipTotals[ip] || 0) + cnt;
    }
  }
  const topIpCount = Object.values(ipTotals).length ? Math.max(...Object.values(ipTotals)) : 0;
  if (grandTotal > 0 && topIpCount / grandTotal > 0.5) {
    reason_codes.push('CONCENTRATION');
    score += 10;
  } else if (secondIps.size > 10) {
    reason_codes.push('DISTRIBUTION');
    score += 5;
  }

  // PHASE_SHIFT — reconhecimento seguido de autenticação
  const phasesObs = new Set(buckets.flatMap((b) => Object.keys(b.by_phase || {})));
  if (phasesObs.has('RECONHECIMENTO') && (phasesObs.has('AUTENTICACAO') || phasesObs.has('EXPLORACAO'))) {
    reason_codes.push('PHASE_SHIFT');
    score += 15;
  }

  const idx = Math.min(100, score);
  let status;
  if (idx === 0) status = 'NORMAL';
  else if (idx < 25) status = 'ELEVATED';
  else if (idx < 50) status = 'ESCALATING';
  else if (idx < 75) status = 'COORDINATED_SUSPECTED';
  else {
    // CONFIRMED_INCIDENT exige simultaneidade temporal + múltiplas fases
    status = (reason_codes.includes('TEMPORAL_SYNCHRONY') && reason_codes.includes('PHASE_SHIFT'))
      ? 'CONFIRMED_INCIDENT'
      : 'COORDINATED_SUSPECTED';
  }

  const detail = buildSignalDetail(status, reason_codes, {
    firstTotal, secondTotal, firstIps: firstIps.size, secondIps: secondIps.size,
    firstCountries: firstCountries.size, secondCountries: secondCountries.size,
  });

  return { status, reason_codes, coordination_index: idx, detail };
}

function buildSignalDetail(status, codes, ctx) {
  const parts = [];
  if (codes.includes('VOLUME_ACCELERATION')) {
    parts.push(`Volume acelerou de ${ctx.firstTotal} para ${ctx.secondTotal} eventos na segunda metade da janela`);
  }
  if (codes.includes('SOURCE_EXPANSION')) {
    parts.push(`IPs únicos cresceram de ${ctx.firstIps} para ${ctx.secondIps}`);
  }
  if (codes.includes('GEO_EXPANSION')) {
    parts.push(`Países ativos expandiram de ${ctx.firstCountries} para ${ctx.secondCountries}`);
  }
  if (codes.includes('TEMPORAL_SYNCHRONY')) {
    parts.push('Múltiplos países com atividade simultânea elevada detectados');
  }
  if (codes.includes('PHASE_SHIFT')) {
    parts.push('Transição de comportamento observada: reconhecimento → autenticação/exploração');
  }
  if (codes.includes('CONCENTRATION')) {
    parts.push('Atividade concentrada em poucos IPs');
  }
  if (codes.includes('DISTRIBUTION')) {
    parts.push('Atividade distribuída entre múltiplos IPs');
  }
  if (parts.length === 0) return 'Sem sinais de escalada na janela observada.';
  return parts.join('. ') + '.';
}

// ─── Qualidade dos dados ──────────────────────────────────────────────────────
function buildDataQuality(events, evidence) {
  const nginxHits = (evidence.nginx_suspicious_hits || []).length;
  const threatAlerts = (evidence.recent_alerts_analytical || []).length;

  if (events.length === 0 && nginxHits === 0 && threatAlerts === 0) {
    return {
      state: 'SEM_ATIVIDADE',
      label: 'SEM ATIVIDADE OBSERVADA',
      note: 'Nenhuma atividade suspeita registada nas fontes disponíveis na janela actual.',
    };
  }

  if (events.length === 0 && (nginxHits > 0 || threatAlerts > 0)) {
    return {
      state: 'AGREGADO_SEM_TEMPORAL',
      label: 'ATIVIDADE AGREGADA SEM TELEMETRIA TEMPORAL INDIVIDUAL',
      note: `${nginxHits + threatAlerts} registos agregados encontrados, mas timestamps individuais não puderam ser extraídos para construção da curva temporal.`,
    };
  }

  const nginxEvents = events.filter((e) => e.source === 'NGINX').length;
  const alertEvents = events.filter((e) => e.source === 'THREAT_WATCH').length;
  const sources = [...new Set(events.map((e) => e.source))];

  if (events.length > 0 && alertEvents === 0 && nginxEvents > 0) {
    return {
      state: 'TELEMETRIA_PARCIAL',
      label: 'TELEMETRIA TEMPORAL PARCIAL',
      note: `${events.length} registos nginx com timestamp individual. Fontes threat-watch sem alertas nesta janela.`,
    };
  }

  return {
    state: 'TELEMETRIA_DISPONIVEL',
    label: 'TELEMETRIA TEMPORAL DISPONÍVEL',
    note: `${events.length} registos normalizados de ${sources.length} fonte(s): ${sources.join(', ')}.`,
  };
}

// ─── Timeline de fases ────────────────────────────────────────────────────────
function buildPhaseTimeline(buckets) {
  const seen = new Map();
  for (const b of buckets) {
    for (const [phaseId, count] of Object.entries(b.by_phase)) {
      if (!count) continue;
      if (!seen.has(phaseId)) seen.set(phaseId, { first_ts: b.ts, last_ts: b.ts, total: 0 });
      const s = seen.get(phaseId);
      s.last_ts = b.ts;
      s.total += count;
    }
  }
  return [...seen.entries()]
    .sort(([, a], [, b]) => a.first_ts - b.first_ts)
    .map(([id, data]) => {
      const def = PHASES.find((p) => p.id === id) || { label: id, description: '' };
      return {
        id,
        label: def.label,
        description: def.description,
        first_ts: data.first_ts,
        last_ts: data.last_ts,
        first_label: new Date(data.first_ts).toISOString().slice(11, 16) + ' UTC',
        last_label: new Date(data.last_ts).toISOString().slice(11, 16) + ' UTC',
        total_events: data.total,
        layers: PHASE_TO_LAYERS[id] || [],
      };
    });
}

// ─── Correlação com camadas de defesa ─────────────────────────────────────────
function buildDefenseCorrelation(phases, evidence) {
  const relevantIds = new Set(phases.flatMap((p) => p.layers));
  if (!relevantIds.size) return [];
  const hasBlocks =
    (evidence.blocked_ips || []).length > 0 ||
    (evidence.ufwBlocks || []).length > 0 ||
    (evidence.fail2ban?.banned_ips || []).length > 0;

  return [...relevantIds].map((lid) => {
    let status = 'OBSERVADA';
    if ((lid === 'FAIL2BAN' || lid === 'UFW' || lid === 'INCIDENT') && hasBlocks) status = 'ATUOU';
    return { layer_id: lid, status };
  });
}

// ─── Resumo operacional ────────────────────────────────────────────────────────
function buildSummary(buckets, events, { countryCode = null, ipFilter = null, windowMs, scope }) {
  const now = Date.now();
  const windowStart = now - windowMs;

  const filtered = events.filter((e) => {
    if (e.ts < windowStart) return false;
    if (countryCode && e.country_code !== countryCode) return false;
    if (ipFilter && e.ip !== ipFilter) return false;
    return true;
  });

  const uniqueIps = new Set(filtered.map((e) => e.ip).filter(Boolean)).size;
  const uniqueCountries = new Set(
    filtered.map((e) => e.country_code).filter((c) => c && c !== '??')
  ).size;
  const critical = filtered.filter((e) => e.severity === 'CRITICAL' || e.severity === 'HIGH').length;
  const blocked = filtered.filter((e) => e.blocked).length;
  const sources = [...new Set(filtered.map((e) => e.source))];

  const timestamps = filtered.map((e) => e.ts).filter(Boolean);
  const first = timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : null;
  const last = timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;

  const peakCount = buckets.filter((b) => b.is_peak).length;
  const totalEvents = buckets.reduce((s, b) => s + b.total, 0);

  return {
    scope,
    scope_id: countryCode || ipFilter || null,
    total_events: totalEvents,
    unique_ips: uniqueIps,
    unique_countries: uniqueCountries,
    critical_high_events: critical,
    blocked_events: blocked,
    peak_buckets: peakCount,
    first_activity: first,
    last_activity: last,
    sources_used: sources,
  };
}

// ─── Proveniência ──────────────────────────────────────────────────────────────
function buildProvenance(evidence, dedupedEvents, rawEvents, { scope, scopeId, windowMs, geoLookup }) {
  const nginxHits = (evidence.nginx_suspicious_hits || []).length;
  const threatAlerts = (evidence.recent_alerts_analytical || []).length;
  const allAlerts = (evidence.threatAlerts || []).length;
  const failedLogins = (evidence.failedLogins || []).length;
  const dedupRemoved = rawEvents.length - dedupedEvents.length;
  const geoKnown = Object.keys(geoLookup).length;
  const { bucketMs } = getBucketConfig(windowMs);

  return {
    sources: {
      THREAT_WATCH: { available: allAlerts, used: threatAlerts, note: 'Últimos 80 com geo; histórico sem geo também integrado' },
      NGINX: { available: nginxHits, note: 'Hits suspeitos (403/401/444/404-probe) com timestamp nginx' },
      ADMIN_LOG: { available: failedLogins, note: 'Logins falhados com created_at SQL' },
    },
    deduplication: {
      raw_events: rawEvents.length,
      after_dedup: dedupedEvents.length,
      removed: dedupRemoved,
      strategy: 'Chave: ip+segundo+tipo. Prioridade: THREAT_WATCH > CRITICAL_EVENT > ADMIN_LOG > NGINX',
    },
    geo_lookup: { ips_known: geoKnown, note: 'Lookup construído de attack_origins, blocked_ips, recent_alerts, failedLogins' },
    bucketing: {
      window_ms: windowMs,
      bucket_ms: bucketMs,
      algorithm: 'Janela deslizante ±4 buckets; pico se total ≥ 1.5× média dos vizinhos e variação > 1',
    },
    weight_formula: 'weighted = Σ(CRITICAL×4 + HIGH×3 + MEDIUM×2 + LOW×1)',
    coordination_formula: 'Índice 0–100: VOLUME_ACCELERATION(30) + SOURCE_EXPANSION(25) + GEO_EXPANSION(20) + TEMPORAL_SYNCHRONY(25) + PHASE_SHIFT(15) + CONCENTRATION/DISTRIBUTION(5–10)',
    scope_filter: scope === 'ORIGIN' ? `country_code = ${scopeId}` : scope === 'IP' ? `ip = ${scopeId}` : 'GLOBAL (sem filtro)',
    limitations: [
      'Nginx window máx. 4000 linhas (últimas ~horas do log activo). Eventos históricos em arquivos nginx não acessíveis.',
      'Threat-watch: últimos 80 alertas com geo; máx. ~3000 linhas no histórico sem geo.',
      'UFW/fail2ban: snapshots de estado sem timestamps por evento.',
      'IPs não presentes em attack_origins/blocked_ips/alerts/logins: country_code = ?? (não geocodificado).',
    ],
  };
}

// ─── API principal ─────────────────────────────────────────────────────────────
async function getThreatFlow({ scope = 'GLOBAL', scopeId = null, window: windowParam = '24h' } = {}) {
  const evidence = await dashboardSvc.getSecurityEvidence(false);
  const windowMs = parseWindow(windowParam);

  const geoLookup = buildGeoLookup(evidence);
  const rawEvents = normalizeEvents(evidence, geoLookup);
  const allEvents = deduplicateEvents(rawEvents);

  const countryCode = scope === 'ORIGIN' && scopeId ? String(scopeId).toUpperCase() : null;
  const ipFilter = scope === 'IP' && scopeId ? String(scopeId).trim() : null;

  const rawBuckets = bucketEvents(allEvents, windowMs, { countryCode, ipFilter });
  const buckets = detectPeaks(rawBuckets);
  const phases = buildPhaseTimeline(buckets);
  const defenseCorrelation = buildDefenseCorrelation(phases, evidence);

  const windowEvents = allEvents.filter((e) => e.ts >= Date.now() - windowMs);
  const globalTotal = windowEvents.length;

  const countryContrib = (scope === 'GLOBAL')
    ? buildCountryContribution(allEvents, windowMs)
    : null;

  const ipContrib = (scope === 'ORIGIN' || scope === 'IP')
    ? buildIpContribution(allEvents, { countryCode, globalTotal, windowMs })
    : null;

  const escalation = computeEscalationSignals(buckets, allEvents, windowMs);
  const dataQuality = buildDataQuality(windowEvents, evidence);
  const summary = buildSummary(buckets, allEvents, { countryCode, ipFilter, windowMs, scope });

  return {
    scope,
    scope_id: scopeId,
    window: windowParam,
    generated_at: new Date().toISOString(),
    buckets,
    phases,
    defense_correlation: defenseCorrelation,
    country_contribution: countryContrib,
    ip_contribution: ipContrib,
    escalation_signals: escalation,
    data_quality: dataQuality,
    summary,
    provenance: buildProvenance(evidence, allEvents, rawEvents, { scope, scopeId, windowMs, geoLookup }),
  };
}

module.exports = { getThreatFlow };
