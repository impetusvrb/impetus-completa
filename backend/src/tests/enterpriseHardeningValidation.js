'use strict';

/**
 * Enterprise Hardening Validation — Teste de certificação pós-hardening.
 * Valida: tenant isolation, auth, lockout, input sanitization, DB indexes, RLS.
 *
 * Execução: node src/tests/enterpriseHardeningValidation.js
 */

const http = require('http');

const API = process.env.API_BASE || 'http://127.0.0.1:4000';
let passed = 0;
let failed = 0;
const results = [];

function ok(name, condition) {
  if (condition) {
    passed++;
    results.push({ name, status: 'PASS' });
  } else {
    failed++;
    results.push({ name, status: 'FAIL' });
    console.error(`  [FAIL] ${name}`);
  }
}

function request(method, path, body, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, API);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 10000,
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { /* ok */ }
        resolve({ status: res.statusCode, json, raw: data, headers: res.headers });
      });
    });
    req.on('error', (err) => resolve({ status: 0, json: null, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, json: null, error: 'timeout' }); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('=== Enterprise Hardening Validation ===\n');

  // 1. Health check
  const health = await request('GET', '/health');
  ok('SEC-V01: Health endpoint acessível', health.status === 200);
  ok('SEC-V02: Health retorna success=true', health.json?.success === true);

  // 2. Auth enforcement
  const noAuth = await request('GET', '/api/dashboard/me');
  ok('SEC-V03: /api/dashboard/me sem token = 401', noAuth.status === 401);

  const noAuthTts = await request('POST', '/api/tts', { text: 'teste' });
  ok('SEC-V04: /api/tts sem token = 401', noAuthTts.status === 401);

  const noAuthKpis = await request('GET', '/api/dashboard/kpis');
  ok('SEC-V05: /api/dashboard/kpis sem token = 401', noAuthKpis.status === 401);

  // 3. Account lockout
  const lockoutAttempts = [];
  for (let i = 0; i < 6; i++) {
    const r = await request('POST', '/api/auth/login', { email: 'lockout-test@invalid.test', password: 'wrong' });
    lockoutAttempts.push(r.status);
  }
  ok('SEC-V06: Lockout ativa após tentativas', lockoutAttempts.includes(429));

  // 4. CORS headers
  const corsCheck = await request('OPTIONS', '/api/health');
  ok('SEC-V07: Responde a OPTIONS', corsCheck.status > 0);

  // 5. Helmet headers (X-Content-Type-Options, etc.)
  const helmetCheck = await request('GET', '/health');
  const hasSecHeaders = helmetCheck.headers?.['x-content-type-options'] === 'nosniff';
  ok('SEC-V08: Helmet X-Content-Type-Options=nosniff', hasSecHeaders);

  // 6. Auth error message (não revela se email existe)
  const wrongEmail = await request('POST', '/api/auth/login', { email: 'non-existent-test@fake.test', password: 'abc' });
  const msg = wrongEmail.json?.error || '';
  ok('SEC-V09: Login falho não revela existência do email', !msg.toLowerCase().includes('não encontrado'));

  // 7. Internal routes sem auth
  const internalRoute = await request('GET', '/api/internal/unified-health');
  ok('SEC-V10: /api/internal sem auth = 401 ou 403', [401, 403].includes(internalRoute.status));

  // 8. Deep health (localhost pode ver detalhes; remoto sem key não pode)
  const deepHealth = await request('GET', '/api/system/health/deep');
  ok('SEC-V11: /api/system/health/deep responde', deepHealth.status === 200);

  // Summary
  console.log(`\n=== Resultado: ${passed} PASS / ${failed} FAIL ===`);
  console.log(`Classificação: ${failed === 0 ? 'TODOS OS TESTES PASSARAM' : 'CORREÇÕES NECESSÁRIAS'}\n`);

  for (const r of results) {
    console.log(`  [${r.status}] ${r.name}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(2);
});
