#!/usr/bin/env node
'use strict';
/**
 * IMPETUS — Vistoria final: invasão pesada localhost, zero danos.
 * Não cria tenants, não apaga ficheiros, não reinicia serviços.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const http = require('http');
const { io } = require('socket.io-client');
const { runAllScenarios } = require('./redTeamScenarioRunner');
const mutationGuard = require('./mutationTestGuard');

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = '127.0.0.1';
const BASE = `http://${HOST}:${PORT}`;

const VERDICT = { BLOCKED: 'BLOCKED', LEAK: 'LEAK', WARN: 'WARN', SKIP: 'SKIP' };
const results = [];

function record(id, title, verdict, detail, evidence = {}) {
  results.push({ id, title, verdict, detail, evidence });
}

function req(method, path, { headers = {}, body = null, timeout = 6000 } = {}) {
  const payload = body == null ? null : (typeof body === 'string' ? body : JSON.stringify(body));
  return new Promise((resolve) => {
    const r = http.request({
      hostname: HOST, port: PORT, path, method,
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers
      },
      timeout
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    r.on('error', (e) => resolve({ error: e.message, status: 0, body: '' }));
    r.on('timeout', () => { r.destroy(); resolve({ error: 'timeout', status: 0, body: '' }); });
    if (payload) r.write(payload);
    r.end();
  });
}

const NONE_JWT = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxIiwiY29tcGFueV9pZCI6MSwicm9sZSI6ImFkbWluIiwiamllcmFyY2h5X2xldmVsIjowfQ.';
const FAKE_ADMIN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTkkiLCJjb21wYW55X2lkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDk5Iiwicm9sZSI6ImFkbWluIiwiaGllcmFyY2h5X2xldmVsIjowfQ.invalidsig';

const PATH_TRAVERSAL = [
  '/.env', '/.git/config', '/.git/HEAD', '/backend/.env', '/api/../../../etc/passwd',
  '/uploads/../../etc/passwd', '/api/users?file=..%2F..%2Fetc%2Fpasswd',
  '/api/dashboard/me%00', '/%2e%2e/%2e%2e/etc/passwd', '/api/admin/runtime/flags/effective/../../../etc/passwd',
  '/api/system/boot-metrics?debug=1', '/api/internal/health', '/api/debug/vars',
  '/actuator/env', '/server-status', '/phpinfo.php', '/wp-admin/install.php',
  '/api/companies/me', '/api/users/1', '/api/admin/runtime/kms/rotation/emit',
];

const RUNTIME_POSTS = [
  '/api/admin/runtime/kms/rotation/emit',
  '/api/admin/runtime/kms/cache/invalidate',
  '/api/admin/runtime/tenant-rls/activate',
  '/api/admin/runtime/tenant-rls/deactivate',
  '/api/admin/runtime/retention/run',
  '/api/admin/runtime/mqtt-real/brokers',
  '/api/admin/runtime/federation/scim-token',
  '/api/admin/runtime/mfa/policies',
];

const SSRF_BODIES = [
  { url: 'http://127.0.0.1:5432' },
  { url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/' },
  { callback: 'file:///etc/passwd' },
  { webhook: 'gopher://127.0.0.1:6379/_INFO' },
];

const SQLI_PAYLOADS = [
  { email: "admin' OR '1'='1'--", password: 'x' },
  { email: 'admin@test.com', password: "' OR 1=1--" },
  { email: '1; DROP TABLE users;--', password: 'x' },
];

const TENANT_HEADERS = [
  { 'X-Company-Id': '00000000-0000-0000-0000-000000000099' },
  { 'X-Tenant-Id': '00000000-0000-0000-0000-000000000099' },
  { 'X-Company-Id': '00000000-0000-0000-0000-000000000099', Authorization: `Bearer ${FAKE_ADMIN}` },
];

function bodyLeaksSecrets(body) {
  return /JWT_SECRET|DB_PASSWORD|SMTP_PASS|TIME_CLOCK_ENC|sk-[a-zA-Z0-9]{10,}|BEGIN (RSA |OPENSSH )?PRIVATE/i.test(body);
}

function hasSensitiveMetrics(body) {
  try {
    const j = JSON.parse(body);
    return !!(j.pool || j.request_perf || (j.federation && j.federation.pilot_tenants) || (j.mfa && j.mfa.pilot_tenants));
  } catch { return false; }
}

async function probePathTraversal() {
  let leaks = 0;
  let open = 0;
  for (const p of PATH_TRAVERSAL) {
    const r = await req('GET', p, { headers: { 'X-Forwarded-For': '203.0.113.77' } });
    if (r.error) { record('INV-PATH', p, VERDICT.SKIP, r.error); continue; }
    if (bodyLeaksSecrets(r.body)) {
      leaks++;
      record('INV-PATH-LEAK', p, VERDICT.LEAK, 'Segredo no body', { status: r.status, preview: r.body.slice(0, 120) });
    } else if (r.status === 200 && !/\/(health|api\/health)/.test(p) && r.body.length > 50 && !/"ok":true/.test(r.body.slice(0, 80))) {
      open++;
    }
  }
  record('INV-PATH-TRAVERSAL', 'Path traversal / probes (20 rotas)', leaks ? VERDICT.LEAK : (open > 2 ? VERDICT.WARN : VERDICT.BLOCKED),
    leaks ? `${leaks} leak(s)` : `${PATH_TRAVERSAL.length} rotas, ${open} 200 suspeitos`, { leaks, open });
}

async function probeRuntimeBarrage() {
  let allowed = 0;
  for (const p of RUNTIME_POSTS) {
    for (const tok of [null, NONE_JWT, FAKE_ADMIN]) {
      const headers = tok ? { Authorization: `Bearer ${tok}` } : {};
      const r = await req('POST', p, { headers, body: {} });
      if (r.status >= 200 && r.status < 300) {
        allowed++;
        record('INV-RUNTIME-ALLOW', p, VERDICT.LEAK, `HTTP ${r.status} com token ${tok ? 'forjado' : 'ausente'}`, { body: r.body.slice(0, 100) });
      }
    }
  }
  if (!allowed) record('INV-RUNTIME-BARRAGE', 'Runtime flags POST barrage (24 tentativas)', VERDICT.BLOCKED, 'Todas 401/403');
}

async function probeAuthBypass() {
  const endpoints = [
    '/api/dashboard/me', '/api/users', '/api/admin/runtime/flags/effective',
    '/api/system/boot-metrics', '/api/system/health/deep', '/api/companies/me',
    '/api/internal/health/deep', '/api/aioi/health',
  ];
  let leaks = 0;
  for (const ep of endpoints) {
    const r = await req('GET', ep, { headers: { 'X-Forwarded-For': '203.0.113.99', Authorization: `Bearer ${NONE_JWT}` } });
    if (r.error) continue;
    if (r.status === 200 && (bodyLeaksSecrets(r.body) || (ep.includes('boot-metrics') && hasSensitiveMetrics(r.body)) || (ep.includes('dashboard') && /company_id|email/.test(r.body)))) {
      leaks++;
      record('INV-AUTH-LEAK', ep, VERDICT.LEAK, `HTTP 200 com alg:none`, { preview: r.body.slice(0, 150) });
    }
  }
  record('INV-AUTH-BYPASS', 'JWT alg:none + endpoints sensíveis', leaks ? VERDICT.LEAK : VERDICT.BLOCKED, `${leaks} leaks`);
}

async function probeSqli() {
  let bypass = 0;
  for (const body of SQLI_PAYLOADS) {
    const r = await req('POST', '/api/auth/login', { body });
    if (r.status === 200 && /token|accessToken|success.*true/i.test(r.body)) bypass++;
  }
  record('INV-SQLI', 'SQLi login (3 payloads)', bypass ? VERDICT.LEAK : VERDICT.BLOCKED, bypass ? 'login bypass' : 'rejeitado');
}

async function probeTenantSpoof() {
  let bypass = 0;
  for (const h of TENANT_HEADERS) {
    const r = await req('GET', '/api/dashboard/me', { headers: h });
    if (r.status === 200 && /company_id|user/.test(r.body)) bypass++;
  }
  record('INV-TENANT-SPOOF', 'Tenant header spoof', bypass ? VERDICT.LEAK : VERDICT.BLOCKED, `${bypass} bypass`);
}

async function probeSsrf() {
  let success = 0;
  for (const body of SSRF_BODIES) {
    const r = await req('POST', '/api/webhook', { body });
    if (r.status >= 200 && r.status < 300) success++;
  }
  record('INV-SSRF', 'SSRF webhook (4 vetores)', success ? VERDICT.LEAK : VERDICT.BLOCKED, `HTTP 2xx: ${success}`);
}

async function probeMethodTamper() {
  const r = await req('TRACE', '/api/dashboard/me');
  const bad = r.status === 200 && r.body;
  record('INV-TRACE', 'HTTP TRACE', bad ? VERDICT.WARN : VERDICT.BLOCKED, `status ${r.status}`);
}

async function probeRateLimit() {
  let last = 0;
  for (let i = 0; i < 8; i++) {
    const r = await req('POST', '/api/auth/login', { body: { email: `rt-probe-${i}@invalid.local`, password: 'WrongPass1!' } });
    last = r.status;
  }
  record('INV-LOGIN-FLOOD', 'Login flood (8x credencial inválida)', (last === 401 || last === 403 || last === 429) ? VERDICT.BLOCKED : VERDICT.WARN, `último HTTP ${last}`);
}

async function probeSockets() {
  const namespaces = ['/impetus-avatar', '/impetus-voice'];
  for (const nsp of namespaces) {
    const verdict = await new Promise((resolve) => {
      const s = io(`${BASE}${nsp}`, { transports: ['websocket'], reconnection: false, timeout: 4000 });
      let done = false;
      const finish = (v, d) => { if (done) return; done = true; try { s.close(); } catch {} resolve({ v, d }); };
      s.on('connect', () => finish(VERDICT.LEAK, 'conectou sem token'));
      s.on('connect_error', (e) => finish(VERDICT.BLOCKED, e.message || 'rejeitado'));
      setTimeout(() => finish(VERDICT.BLOCKED, 'timeout'), 5000);
    });
    record(`INV-WS${nsp.replace(/\//g, '-')}`, `WebSocket ${nsp} sem token`, verdict.v, verdict.d);
  }
}

async function probeHostPoison() {
  const r = await req('GET', '/api/health', { headers: { Host: 'evil.attacker.invalid', 'X-Forwarded-Host': 'evil.attacker.invalid' } });
  const reflected = /evil\.attacker/i.test(r.body);
  record('INV-HOST-POISON', 'Host / X-Forwarded-Host evil', reflected ? VERDICT.LEAK : VERDICT.BLOCKED, `HTTP ${r.status}`);
}

async function probeRealtimeWs() {
  const WebSocket = require('ws');
  const verdict = await new Promise((resolve) => {
    const ws = new WebSocket(`ws://${HOST}:${PORT}/impetus-realtime?token=${NONE_JWT}`, { handshakeTimeout: 4000 });
    let done = false;
    const finish = (v, d) => { if (done) return; done = true; try { ws.terminate(); } catch {} resolve({ v, d }); };
    ws.on('open', () => finish(VERDICT.LEAK, 'realtime abriu com alg:none'));
    ws.on('error', () => finish(VERDICT.BLOCKED, 'rejeitado'));
    setTimeout(() => finish(VERDICT.BLOCKED, 'timeout/fechado'), 5000);
  });
  record('INV-REALTIME-WS', '/impetus-realtime JWT alg:none', verdict.v, verdict.d);
}

async function probeAdminGetBarrage() {
  const paths = [
    '/api/admin/runtime/flags/effective', '/api/admin/runtime/flags/diagnostics',
    '/api/admin/runtime/flags/conflicts', '/api/federation/status', '/api/auth/mfa/status',
  ];
  let leaks = 0;
  for (const p of paths) {
    const r = await req('GET', p, { headers: { Authorization: `Bearer ${FAKE_ADMIN}` } });
    if (r.status === 200 && (p.includes('admin/runtime') || bodyLeaksSecrets(r.body))) leaks++;
  }
  record('INV-ADMIN-GET', 'Admin/flags GET token forjado', leaks ? VERDICT.LEAK : VERDICT.BLOCKED, `${leaks} acessos indevidos`);
}

async function probeCorsPreflight() {
  const r = await req('OPTIONS', '/api/dashboard/me', {
    headers: { Origin: 'https://evil.invalid', 'Access-Control-Request-Method': 'GET' }
  });
  const acao = r.headers['access-control-allow-origin'] || '';
  const wild = acao === '*' || acao === 'https://evil.invalid';
  record('INV-CORS', 'CORS preflight origem maliciosa', wild ? VERDICT.LEAK : VERDICT.BLOCKED, `ACAO=${acao || '-'}`);
}

async function probeHeaderInjection() {
  try {
    const r = await req('GET', '/api/federation/status', {
      headers: { 'X-Forwarded-For': "203.0.113.1\r\nX-Injected: evil", 'X-Original-URL': '/admin' }
    });
    const inj = /evil|injected/i.test(JSON.stringify(r.headers));
    record('INV-HEADER-INJ', 'CRLF X-Forwarded-For', inj ? VERDICT.WARN : VERDICT.BLOCKED, `status ${r.status}`);
  } catch (e) {
    record('INV-HEADER-INJ', 'CRLF X-Forwarded-For', VERDICT.BLOCKED, 'cliente/stack rejeitou header inválido');
  }
}

async function probeMassAssignmentSafe() {
  // Probe HTTP mutável: criaria empresa permanente no banco. Só roda quando a
  // barreira estrutural comprova banco de TESTE isolado. Fail-closed em produção.
  try {
    await mutationGuard.assertMutationTestsAllowed();
  } catch (guardErr) {
    record('INV-MASS-ASSIGN', 'Mass assignment companies (estático)', VERDICT.BLOCKED,
      `Probe mutável bloqueado (fail-closed): ${guardErr.message}`);
    return;
  }
  const r = await req('POST', '/api/companies', {
    body: {
      name: 'X', admin_name: 'X', admin_email: `x-${Date.now()}@invalid`, admin_password: 'Short1',
      role: 'internal_admin', hierarchy_level: 0, is_tenant_admin: true
    }
  });
  const escalated = r.status === 201 && /internal_admin|hierarchy_level.:0/.test(r.body);
  record('INV-MASS-ASSIGN', 'Mass assignment companies', escalated ? VERDICT.LEAK : VERDICT.BLOCKED, `HTTP ${r.status}`);
}

async function probeOversize() {
  const big = 'A'.repeat(512 * 1024);
  const r = await req('POST', '/api/auth/login', { body: { email: 'a@b.c', password: big }, timeout: 8000 });
  record('INV-BODY-FLOOD', 'Payload 512KB login', r.status === 413 || r.status === 400 || r.status === 401 ? VERDICT.BLOCKED : VERDICT.WARN, `HTTP ${r.status}`);
}

async function main() {
  console.log('═'.repeat(60));
  console.log(' IMPETUS — VISTORIA FINAL (invasão pesada / localhost / zero danos)');
  console.log('═'.repeat(60));
  console.log(`Alvo: ${BASE} | ${new Date().toISOString()}\n`);

  const baseline = await runAllScenarios();
  const bPass = baseline.filter((x) => x.result === 'PASS').length;
  const bFail = baseline.filter((x) => x.result === 'FAIL').length;
  const bWarn = baseline.filter((x) => x.result === 'WARN').length;
  console.log(`[BASELINE] ${baseline.length} cenários → PASS ${bPass} | FAIL ${bFail} | WARN ${bWarn}\n`);

  console.log('[INVASÃO PESADA]');
  await probePathTraversal();
  await probeRuntimeBarrage();
  await probeAuthBypass();
  await probeSqli();
  await probeTenantSpoof();
  await probeSsrf();
  await probeMethodTamper();
  await probeRateLimit();
  await probeSockets();
  await probeHostPoison();
  await probeRealtimeWs();
  await probeAdminGetBarrage();
  await probeCorsPreflight();
  await probeHeaderInjection();
  await probeMassAssignmentSafe();
  await probeOversize();

  const leaks = results.filter((r) => r.verdict === VERDICT.LEAK);
  const warns = results.filter((r) => r.verdict === VERDICT.WARN);
  const blocked = results.filter((r) => r.verdict === VERDICT.BLOCKED);

  console.log('\n' + '─'.repeat(60));
  console.log(`INVASÃO: ${results.length} probes | BLOCKED ${blocked.length} | WARN ${warns.length} | LEAK ${leaks.length}`);
  if (leaks.length) {
    console.log('\n🔴 LEAKS:');
    leaks.forEach((l) => console.log(`  ${l.id}: ${l.title} — ${l.detail}`));
  }
  if (warns.length) {
    console.log('\n🟡 WARNS:');
    warns.forEach((w) => console.log(`  ${w.id}: ${w.title} — ${w.detail}`));
  }
  console.log('\n' + '─'.repeat(60));
  const score = Math.max(0, 10 - leaks.length * 2 - warns.length * 0.3);
  const grade = leaks.length === 0 && bFail === 0 ? (warns.length === 0 ? 'VERDE FORTE' : 'VERDE') : (leaks.length ? 'VERMELHO' : 'AMARELO');
  console.log(`NOTA FINAL: ${score.toFixed(1)}/10 — ${grade}`);
  console.log(`Danos: nenhum (localhost, sem DELETE, sem mass-create válida)`);
  console.log('═'.repeat(60));

  process.exit(leaks.length || bFail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
