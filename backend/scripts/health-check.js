#!/usr/bin/env node
'use strict';

/**
 * Health-check operacional — BD, schema core, cifra e (opcional) HTTP /health.
 * Uso: npm run health-check [-- --http-only] [-- --offline]
 */

require('../src/config/loadEnv').loadImpetusEnv();

const http = require('http');
const systemReadiness = require('../src/services/systemReadinessService');

const PORT = process.env.PORT || 4000;
const HOST = process.env.LISTEN_HOST || '127.0.0.1';
const args = process.argv.slice(2);
const httpOnly = args.includes('--http-only');
const offline = args.includes('--offline');

let failed = 0;

function fail(label, detail) {
  console.error('  FAIL', label, detail ? `— ${detail}` : '');
  failed++;
}

function ok(label, detail) {
  console.log('  OK', label, detail ? `— ${detail}` : '');
}

function probeHttpHealth() {
  return new Promise((resolve) => {
    const req = http.get(`http://${HOST}:${PORT}/health`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ error: 'timeout' });
    });
  });
}

async function checkReadiness() {
  const r = await systemReadiness.checkSystemReadiness();
  if (r.ready) {
    ok('system readiness', 'BD + schema core');
  } else {
    fail('system readiness', (r.issues || []).join('; ') || 'not ready');
  }
  for (const issue of r.issues || []) {
    console.log('    ', issue);
  }
  return r;
}

async function checkHttp() {
  const h = await probeHttpHealth();
  if (h.error) {
    fail('HTTP /health', h.error);
    return false;
  }
  if (h.status === 200 && h.body && h.body.status === 'ok') {
    ok('HTTP /health', h.body.service || `status ${h.status}`);
    return true;
  }
  fail('HTTP /health', `status=${h.status}`);
  return false;
}

(async () => {
  console.log('=== health-check ===');

  if (!httpOnly) {
    await checkReadiness();
  }

  if (!offline) {
    await checkHttp();
  }

  if (failed) {
    console.error(`\n${failed} verificação(ões) falharam.`);
    process.exit(1);
  }
  console.log('\nTodas as verificações passaram.');
  process.exit(0);
})().catch((e) => {
  console.error('[health-check] erro fatal:', e.message);
  process.exit(1);
});
