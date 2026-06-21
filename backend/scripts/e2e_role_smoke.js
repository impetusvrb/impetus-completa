'use strict';
/**
 * E2E smoke por perfil (read-only). Cria sessões reais para um utilizador de cada
 * role e testa endpoints GET core, caçando respostas 5xx (crashes).
 * Não cria dados de negócio. Limpa as sessões de teste no fim.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const db = require('../src/db');
const auth = require('../src/middleware/auth');

const HOST = '127.0.0.1';
const PORT = parseInt(process.env.PORT, 10) || 4000;
const UA = 'e2e-smoke';

const ROLES = ['ceo', 'admin', 'diretor', 'gerente', 'supervisor', 'coordenador', 'colaborador'];

// Endpoints GET representativos dos fluxos principais.
const ENDPOINTS = [
  '/api/dashboard/me',
  '/api/dashboard/kpis',
  '/api/dashboard/trend',
  '/api/app-communications/notifications',
  '/api/app-communications/notifications/unread-count',
  '/api/lgpd/data-requests',
  '/api/admin/users',
  '/api/admin/audio-logs',
  '/api/admin/nexus-custos',
  '/api/mes/health'
];

function get(path, token) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: HOST, port: PORT, path, method: 'GET', headers: { Authorization: `Bearer ${token}` }, timeout: 12000 },
      (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve(res.statusCode));
      }
    );
    req.on('error', () => resolve(0));
    req.on('timeout', () => { req.destroy(); resolve(-1); });
    req.end();
  });
}

(async () => {
  const failures = [];
  const lines = [];
  // Cabeçalho da matriz
  const head = 'ROLE'.padEnd(12) + ENDPOINTS.map((_, i) => String(i + 1).padStart(4)).join('');
  lines.push(head);

  for (const role of ROLES) {
    const u = await db.query(
      'SELECT id, company_id, name FROM users WHERE role=$1 AND active IS NOT FALSE AND deleted_at IS NULL LIMIT 1',
      [role]
    );
    if (!u.rows.length) { lines.push(role.padEnd(12) + '  (sem utilizador)'); continue; }
    const user = u.rows[0];
    let token;
    try {
      const s = await auth.createSession(user.id, HOST, UA, 1);
      token = s.token;
    } catch (e) {
      lines.push(role.padEnd(12) + '  ERRO createSession: ' + e.message);
      continue;
    }

    const codes = [];
    for (const ep of ENDPOINTS) {
      const code = await get(ep, token);
      codes.push(code);
      if (code >= 500 || code === 0 || code === -1) {
        failures.push({ role, endpoint: ep, code });
      }
    }
    lines.push(role.padEnd(12) + codes.map((c) => String(c).padStart(4)).join(''));
  }

  // Legenda de endpoints
  lines.push('');
  lines.push('Legenda endpoints:');
  ENDPOINTS.forEach((ep, i) => lines.push('  ' + String(i + 1).padStart(2) + '. ' + ep));

  // Limpeza das sessões de teste
  let cleaned = 0;
  try {
    const del = await db.query('DELETE FROM sessions WHERE user_agent=$1', [UA]);
    cleaned = del.rowCount || 0;
  } catch (_e) { /* ignore */ }

  console.log(lines.join('\n'));
  console.log('\nSessões de teste removidas: ' + cleaned);
  console.log('\n=== RESULTADO ===');
  if (failures.length === 0) {
    console.log('OK — nenhum 5xx/timeout nos fluxos testados (' + (ROLES.length * ENDPOINTS.length) + ' chamadas).');
  } else {
    console.log('FALHAS (' + failures.length + '):');
    failures.forEach((f) => console.log('  [' + f.code + '] ' + f.role + ' -> ' + f.endpoint));
  }
  process.exit(0);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
