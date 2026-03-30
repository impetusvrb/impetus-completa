#!/usr/bin/env node
/**
 * Smoke test: GET /api/manutencao-ia/app/dashboard com JWT de técnico de manutenção.
 * Uso:
 *   MANUIA_SMOKE_TOKEN="eyJ..." MANUIA_SMOKE_URL="http://127.0.0.1:4000/api/manutencao-ia/app/dashboard" node scripts/smoke-manuia-app.js
 * Ou: npm run smoke:manuia-app (usa variáveis acima)
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const https = require('https');
const { URL } = require('url');

const token = process.env.MANUIA_SMOKE_TOKEN || '';
const rawUrl =
  process.env.MANUIA_SMOKE_URL ||
  `http://127.0.0.1:${process.env.PORT || 4000}/api/manutencao-ia/app/dashboard`;

if (!token) {
  console.error('[smoke-manuia-app] Defina MANUIA_SMOKE_TOKEN com JWT de utilizador (perfil manutenção).');
  process.exit(1);
}

const u = new URL(rawUrl);
const lib = u.protocol === 'https:' ? https : http;

const req = lib.request(
  {
    hostname: u.hostname,
    port: u.port || (u.protocol === 'https:' ? 443 : 80),
    path: u.pathname + u.search,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  },
  (res) => {
    let body = '';
    res.on('data', (c) => {
      body += c;
    });
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error('[smoke-manuia-app] HTTP', res.statusCode, body.slice(0, 500));
        process.exit(2);
      }
      try {
        const j = JSON.parse(body);
        if (!j.ok) {
          console.error('[smoke-manuia-app] Resposta inesperada:', body.slice(0, 500));
          process.exit(3);
        }
        console.log('[smoke-manuia-app] OK — dashboard:', JSON.stringify(j.summary || {}, null, 0));
        process.exit(0);
      } catch (e) {
        console.error('[smoke-manuia-app] JSON inválido:', e.message);
        process.exit(4);
      }
    });
  }
);

req.on('error', (e) => {
  console.error('[smoke-manuia-app]', e.message);
  process.exit(5);
});

req.end();
