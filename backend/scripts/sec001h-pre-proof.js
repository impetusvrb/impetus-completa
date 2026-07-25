'use strict';
/**
 * SEC-VISUAL-INTELLIGENCE-001H — Prova pré-implementação Modelo A (X × Y congelado).
 * Não altera produção. Simula snapshot imediato + enrichment entre snapshots.
 */
require('../src/config/loadEnv').loadImpetusEnv();

const phaseBSvc = require('../src/services/adminPortalSecurityPhaseBService');

const PRIVATE_IP_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc00:|fe80:)/i;
const IP_FORMAT_RE = /^(?:(?:\d{1,3}\.){3}\d{1,3}|[0-9a-fA-F]{0,4}(?::[0-9a-fA-F]{0,4}){2,7})$/;

function classifyIp(ip) {
  if (!ip || typeof ip !== 'string') return 'INVALID';
  if (PRIVATE_IP_RE.test(ip)) return 'PRIVATE';
  if (!IP_FORMAT_RE.test(ip)) return 'VALID';
  return 'VALID';
}

function lookupGeo(ip, geoMap) {
  const cls = classifyIp(ip);
  if (cls === 'INVALID') return { country_code: '??', geo_state: 'GEO_INVALID', country: 'Inválido' };
  if (cls === 'PRIVATE') return { country_code: 'LO', geo_state: 'GEO_RESOLVED', country: 'Local' };
  const g = geoMap.get(ip);
  if (g) return g;
  return { country_code: '??', geo_state: 'GEO_NOT_ENRICHED', country: 'Desconhecido' };
}

function enrich(items, geoMap, ipKey = 'ip') {
  return items.map((item) => {
    const g = lookupGeo(item[ipKey], geoMap);
    return { ...item, country: g.country, country_code: g.country_code, geo_state: g.geo_state };
  });
}

function buildSnapshot(id, geoMap) {
  const attack_origins = [
    { ip: '203.0.113.10', count: 5 },
    { ip: '198.51.100.20', count: 3 },
    { ip: '192.0.2.30', count: 2 },
    { ip: '203.0.113.40', count: 4 },
    { ip: '198.51.100.50', count: 1 },
    { ip: '192.0.2.99', count: 8 }
  ];
  const blocked_ips = [
    { ip: '203.0.113.10', source: 'ufw' },
    { ip: '198.51.100.20', source: 'fail2ban' },
    { ip: '192.0.2.60', source: 'ufw' },
    { ip: '203.0.113.70', source: 'fail2ban' }
  ];
  const recent_alerts_analytical = [
    { ip: '203.0.113.10', type: 'SCANNER_UA' },
    { ip: '198.51.100.20', type: 'HTTP_404_FLOOD' },
    { ip: '192.0.2.30', type: 'SSH_BRUTE_FORCE' },
    { ip: '192.0.2.99', type: 'HTTP_CREDENTIAL_PROBE' },
    { ip: '192.0.2.99', type: 'HTTP_CREDENTIAL_PROBE' }
  ];

  const origins = enrich(attack_origins, geoMap);
  const blocked = enrich(blocked_ips, geoMap);
  const alerts = enrich(recent_alerts_analytical, geoMap);
  const world_map = phaseBSvc.buildWorldMap(origins, blocked, alerts);

  return {
    snapshot_id: id,
    attack_origins: origins,
    blocked_ips: blocked,
    recent_alerts_analytical: alerts,
    recent_alerts_display: alerts.slice(0, 20),
    critical_events: [],
    world_map
  };
}

function globalWeightedTotal(snap) {
  return (snap.world_map?.points || []).reduce((s, p) => s + p.count, 0);
}

function badgeTable(snap) {
  const rows = [];
  for (const pt of snap.world_map?.points || []) {
    const cc = pt.country_code;
    const nx = snap.attack_origins.filter((o) => o.country_code === cc).reduce((s, o) => s + (o.count || 1), 0);
    const bl = snap.blocked_ips.filter((b) => b.country_code === cc).length * 2;
    const al = snap.recent_alerts_analytical.filter((a) => a.country_code === cc).length;
    rows.push({ cc, nx, bl, al, total: nx + bl + al, badge: pt.count });
  }
  return rows;
}

function geoStates(snap) {
  const c = { GEO_RESOLVED: 0, GEO_UNRESOLVED: 0, GEO_INVALID: 0, GEO_NOT_ENRICHED: 0 };
  for (const it of [...snap.attack_origins, ...snap.blocked_ips, ...snap.recent_alerts_analytical]) {
    c[it.geo_state || 'GEO_NOT_ENRICHED']++;
  }
  return c;
}

// G1 — cache parcial: CA e US resolvidos; FR/BR/VN pendentes; 192.0.2.99 pendente
const GEO_G1 = new Map([
  ['203.0.113.10', { country_code: 'CA', country: 'Canada', geo_state: 'GEO_RESOLVED' }],
  ['198.51.100.20', { country_code: 'US', country: 'United States', geo_state: 'GEO_RESOLVED' }]
]);

// G2 — enriquecido
const GEO_G2 = new Map([
  ...GEO_G1,
  ['192.0.2.30', { country_code: 'FR', country: 'France', geo_state: 'GEO_RESOLVED' }],
  ['203.0.113.40', { country_code: 'BR', country: 'Brazil', geo_state: 'GEO_RESOLVED' }],
  ['198.51.100.50', { country_code: 'VN', country: 'Vietnam', geo_state: 'GEO_RESOLVED' }],
  ['192.0.2.99', { country_code: 'CA', country: 'Canada', geo_state: 'GEO_RESOLVED' }],
  ['192.0.2.60', { country_code: 'US', country: 'United States', geo_state: 'GEO_RESOLVED' }],
  ['203.0.113.70', { country_code: 'FR', country: 'France', geo_state: 'GEO_RESOLVED' }]
]);

const snapX = buildSnapshot('SNAPSHOT-X', GEO_G1);
const snapY = buildSnapshot('SNAPSHOT-Y', GEO_G2);

const totalX = globalWeightedTotal(snapX);
const totalY = globalWeightedTotal(snapY);

console.log('=== SEC-001H PRE-PROOF MODEL A ===\n');
console.log('Snapshot X global weighted:', totalX);
console.log('Snapshot Y global weighted:', totalY);
console.log('Conservation SUM badges X==Y:', totalX === totalY ? 'PASS' : 'FAIL');

console.log('\nGeo states X:', geoStates(snapX));
console.log('Geo states Y:', geoStates(snapY));

console.log('\nBadge table X:');
for (const r of badgeTable(snapX)) {
  console.log(`  ${r.cc}: nx=${r.nx} bl=${r.bl} al=${r.al} tot=${r.total} badge=${r.badge} match=${r.total === r.badge}`);
}

console.log('\nBadge table Y:');
for (const r of badgeTable(snapY)) {
  console.log(`  ${r.cc}: nx=${r.nx} bl=${r.bl} al=${r.al} tot=${r.total} badge=${r.badge} match=${r.total === r.badge}`);
}

const ipZ = '192.0.2.99';
const zX = snapX.recent_alerts_analytical.find((a) => a.ip === ipZ);
const zY = snapY.recent_alerts_analytical.find((a) => a.ip === ipZ);
console.log('\nIP Z migration:');
console.log(`  X: ${ipZ} → ${zX?.geo_state} → ${zX?.country_code}`);
console.log(`  Y: ${ipZ} → ${zY?.geo_state} → ${zY?.country_code}`);

const required = ['CA', 'US', 'FR', 'BR', 'VN', '??'];
console.log('\nRequired countries in Y:');
for (const cc of required) {
  const pt = snapY.world_map.points.find((p) => p.country_code === cc);
  console.log(`  ${cc}: ${pt ? `badge=${pt.count}` : 'AUSENTE'}`);
}

const xFrozen = JSON.stringify(snapX);
const pass =
  totalX === totalY &&
  zX?.geo_state === 'GEO_NOT_ENRICHED' &&
  zY?.geo_state === 'GEO_RESOLVED' &&
  xFrozen.includes('SNAPSHOT-X') &&
  !JSON.stringify(snapY).includes('"snapshot_id":"SNAPSHOT-X"');

console.log('\nPRE-PROOF VERDICT:', pass ? 'PASS — safe to implement Model A' : 'FAIL — STOP');
process.exit(pass ? 0 : 1);
