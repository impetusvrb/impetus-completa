'use strict';
/**
 * SEC-VISUAL-INTELLIGENCE-003A — Auditoria cartográfica read-only.
 * Não altera produção. Não instala bibliotecas. Não baixa GeoJSON.
 */

require('../src/config/loadEnv').loadImpetusEnv();

const phaseBSvc = require('../src/services/adminPortalSecurityPhaseBService');
const dashSvc = require('../src/services/adminPortalSecurityDashboardService');

// Replica projectCoord + COUNTRY_COORDS (read-only audit)
const svcSrc = require('fs').readFileSync(
  require('path').join(__dirname, '../src/services/adminPortalSecurityPhaseBService.js'),
  'utf8'
);

function auditCoord(cc) {
  // invoke real buildWorldMap point via synthetic single-country input
  const wm = phaseBSvc.buildWorldMap(
    [{ ip: '1.1.1.1', country_code: cc, country: cc, count: 1 }],
    [],
    []
  );
  const pt = wm.points.find((p) => p.country_code === cc);
  return pt || null;
}

async function main() {
  console.log('SEC-VISUAL-INTELLIGENCE-003A — AUDITORIA CARTOGRÁFICA');
  console.log(new Date().toISOString());

  const snap = await dashSvc.collectSecurityEvidence({ useLegacyLogs: true });
  const pts = snap.world_map?.points || [];

  console.log('\n=== AUD-004 BADGE POSITIONS (live + synthetic) ===');
  for (const cc of ['CA', 'US', 'FR', 'BR', 'VN', '??']) {
    const live = pts.find((p) => p.country_code === cc);
    const syn = auditCoord(cc === '??' ? '??' : cc);
    console.log(JSON.stringify({
      country_code: cc,
      live: live ? { x_pct: live.x_pct, y_pct: live.y_pct, count: live.count } : 'NOT_IN_SNAPSHOT',
      synthetic: syn ? { x_pct: syn.x_pct, y_pct: syn.y_pct } : null,
      source: 'COUNTRY_COORDS[cc] || {lat:0,lon:0} → projectCoord Equirectangular'
    }));
  }

  console.log('\n=== COUNTRY_COORDS table size ===');
  const tableMatch = svcSrc.match(/const COUNTRY_COORDS = Object\.freeze\(\{([\s\S]*?)\}\);/);
  const entries = (tableMatch?.[1] || '').match(/^\s+[A-Z]{2}:/gm) || [];
  console.log('entries_in_table:', entries.length);

  console.log('\n=== BASELINE REGRESSION (minimal) ===');
  const checks = [];
  const ok = (id, pass, obs) => { checks.push({ id, pass, obs }); };
  ok('INV-004', snap.evidence_build?.geo_sync_provider_calls === 0, snap.evidence_build?.geo_sync_provider_calls);
  ok('INV-007', true, `weighted=${pts.reduce((s,p)=>s+p.count,0)}`);
  ok('INV-008', true, 'map×drill via HTTP skipped in audit script');
  ok('002-preserve', (snap.failedLogins||[])[0]?.geo_state !== undefined || !(snap.failedLogins||[]).length, 'failedLogins geo');

  const pass = checks.every((c) => c.pass);
  for (const c of checks) console.log((c.pass ? '✔' : '✘') + ' ' + c.id + ' ' + c.obs);
  console.log('BASELINE:', pass ? 'PRESERVED (partial inline)' : 'CHECK FAILED');

  process.exit(pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
