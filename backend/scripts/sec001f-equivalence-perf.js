'use strict';

/**
 * SEC-VISUAL-INTELLIGENCE-001F — Prova de equivalência legado × incremental + regressão.
 */
require('../src/config/loadEnv').loadImpetusEnv();

const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const http = require('http');
const logWindowSvc = require('../src/services/adminPortalSecurityEvidenceLogWindow');
const dashboardSvc = require('../src/services/adminPortalSecurityDashboardService');
const phaseBSvc = require('../src/services/adminPortalSecurityPhaseBService');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function stableJson(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function compareField(name, a, b) {
  const sa = stableJson(a);
  const sb = stableJson(b);
  return { name, match: sa === sb, legacy: a, optimized: b };
}

function req(path, token) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    http.get(
      { hostname: '127.0.0.1', port: 4000, path, headers: { Authorization: `Bearer ${token}` } },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          let json = {};
          try { json = JSON.parse(body); } catch {}
          resolve({
            status: res.statusCode,
            rt: Date.now() - t0,
            handler: Number(res.headers['x-intelligence-latency-ms'] || 0),
            json
          });
        });
      }
    ).on('error', reject);
  });
}

function worldMapSignature(wm) {
  return (wm?.points || [])
    .map((p) => `${p.country_code}:${p.count}:${p.unique_ips}`)
    .sort()
    .join('|');
}

(async () => {
  logWindowSvc.resetLogWindowState();

  console.log('=== EQUIVALÊNCIA LEGADO × INCREMENTAL ===\n');
  const legacy = await dashboardSvc.collectSecurityEvidence({ useLegacyLogs: true });
  logWindowSvc.resetLogWindowState();
  const optimized1 = await dashboardSvc.collectSecurityEvidence({ useLegacyLogs: false });
  const optimized2 = await dashboardSvc.collectSecurityEvidence({ useLegacyLogs: false });

  const checks = [
    compareField('attack_origins', legacy.attack_origins, optimized1.attack_origins),
    compareField('blocked_ips', legacy.blocked_ips, optimized1.blocked_ips),
    compareField('recent_alerts_analytical', legacy.recent_alerts_analytical, optimized1.recent_alerts_analytical),
    compareField('recent_alerts_display', legacy.recent_alerts_display, optimized1.recent_alerts_display),
    compareField('critical_events', legacy.critical_events, optimized1.critical_events),
    compareField('world_map', worldMapSignature(legacy.world_map), worldMapSignature(optimized1.world_map))
  ];

  for (const c of checks) {
    console.log(`${c.match ? 'PASS' : 'FAIL'} — ${c.name}`);
  }

  console.log(`\n2º snapshot incremental: mode=${optimized2.evidence_build?.evidence_build_mode} nginx_new_lines=${optimized2.evidence_build?.nginx_new_lines} threat_new_lines=${optimized2.evidence_build?.threat_new_lines}`);

  // Token for HTTP tests
  const { rows } = await pool.query(`SELECT id,email,perfil FROM admin_users WHERE perfil='super_admin' AND ativo=true LIMIT 1`);
  const token = jwt.sign({ sub: rows[0].id, typ: 'impetus_admin', perfil: rows[0].perfil, email: rows[0].email }, process.env.IMPETUS_ADMIN_JWT_SECRET, { expiresIn: '30m', issuer: 'impetus-admin-portal' });
  await pool.end();

  // Warm HTTP cache
  await req('/api/impetus-admin/security-dashboard/intelligence?country_code=US', token);

  console.log('\n=== PERFORMANCE HIT (10 amostras) ===');
  const hits = [];
  for (let i = 0; i < 10; i++) {
    const r = await req('/api/impetus-admin/security-dashboard/intelligence?country_code=US', token);
    hits.push(r.rt);
  }
  hits.sort((a, b) => a - b);
  const hitP50 = hits[Math.floor(hits.length * 0.5)];
  const hitP95 = hits[Math.ceil(hits.length * 0.95) - 1];
  console.log(`min=${hits[0]} P50=${hitP50} P95=${hitP95} max=${hits[hits.length - 1]} avg=${Math.round(hits.reduce((a, b) => a + b, 0) / hits.length)}`);

  console.log('\n=== PERFORMANCE INCREMENTAL MISS (5 amostras, 31s) ===');
  const incMiss = [];
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 31000));
    const r = await req('/api/impetus-admin/security-dashboard/intelligence?country_code=FR', token);
    const mode = r.json.data?.evidence_build?.evidence_build_mode;
    incMiss.push({ rt: r.rt, handler: r.handler, mode });
    console.log(`  #${i + 1}: rt=${r.rt}ms handler=${r.handler}ms mode=${mode}`);
  }
  incMiss.sort((a, b) => a.rt - b.rt);
  console.log(`  P95=${incMiss[Math.ceil(incMiss.length * 0.95) - 1].rt}ms modes=${incMiss.map((m) => m.mode).join(',')}`);

  // Badge reconciliation via HTTP
  console.log('\n=== BADGES ===');
  const dash = (await req('/api/impetus-admin/security-dashboard', token)).json.data;
  const pts = dash.phase_b?.world_map?.points || [];
  let allMatch = true;
  console.log('| País | nginx×1 | blocked×2 | alerts×1 | total | badge | match |');
  for (const pt of pts) {
    const ir = (await req(`/api/impetus-admin/security-dashboard/intelligence?country_code=${encodeURIComponent(pt.country_code)}`, token)).json.data;
    const ix = ir.summary?.index_decomposition || {};
    const match = ix.total === pt.count;
    if (!match) allMatch = false;
    console.log(`| ${pt.country_code} | ${ix.nginx_hits_x1 || 0} | ${ix.blocked_ips_x2 || 0} | ${ix.threat_alerts_x1 || 0} | ${ix.total || 0} | ${pt.count} | ${match ? 'YES' : 'NO'} |`);
  }
  console.log(`\nAll badges match: ${allMatch}`);
  console.log(`snapshot_id dash=${dash.snapshot_id}`);

  const fails = checks.filter((c) => !c.match);
  if (fails.length || !allMatch) process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
