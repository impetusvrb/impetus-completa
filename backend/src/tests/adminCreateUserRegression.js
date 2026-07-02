'use strict';

/**
 * Regressão — criação de usuário via POST /api/admin/users
 * Execução: node src/tests/adminCreateUserRegression.js
 */

const http = require('http');
const crypto = require('crypto');
const db = require('../db');

const API = process.env.API_BASE || 'http://127.0.0.1:4000';
const results = [];
let passed = 0;
let failed = 0;

function ok(name, condition, detail = '') {
  if (condition) {
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  [PASS] ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    results.push({ name, status: 'FAIL', detail });
    console.error(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 15000
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { /* ok */ }
        resolve({ status: res.statusCode, json, raw: data });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function createAdminSession() {
  const r = await db.query(`
    SELECT u.id, u.company_id, u.email
    FROM users u
    WHERE u.deleted_at IS NULL AND u.active = true AND u.hierarchy_level <= 1
    ORDER BY u.hierarchy_level ASC
    LIMIT 1
  `);
  const admin = r.rows[0];
  if (!admin) throw new Error('Nenhum admin encontrado para testes');

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await db.query(
    `INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
     VALUES ($1, $2, '127.0.0.1', 'adminCreateUserRegression', $3)`,
    [admin.id, token, expiresAt]
  );
  return { token, admin };
}

async function getStructuralRole(companyId, preferLevel = null) {
  const params = [companyId];
  let levelFilter = '';
  if (preferLevel != null) {
    params.push(preferLevel);
    levelFilter = `AND cr.hierarchy_level = $2`;
  }
  const r = await db.query(
    `SELECT cr.id, cr.name, cr.hierarchy_level
     FROM company_roles cr
     WHERE cr.company_id = $1::uuid AND cr.active = true ${levelFilter}
     ORDER BY cr.hierarchy_level DESC
     LIMIT 1`,
    params
  );
  return r.rows[0] || null;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function cleanupTestUser(email, companyId) {
  await db.query(
    `UPDATE users SET deleted_at = now(), active = false
     WHERE email = $1 AND company_id = $2::uuid AND deleted_at IS NULL`,
    [email, companyId]
  );
}

async function run() {
  console.log('adminCreateUserRegression — início\n');
  const { token, admin } = await createAdminSession();
  const headers = authHeaders(token);
  const ts = Date.now();
  const baseEmail = `regression.user.${ts}@impetus-test.local`;
  const validPassword = 'TestPass1';

  const operRole = await getStructuralRole(admin.company_id, 6)
    || await getStructuralRole(admin.company_id);
  ok('Cargo estrutural disponível', !!operRole?.id, operRole?.name || 'nenhum');

  if (!operRole?.id) {
    console.log(`\nResumo: ${passed} pass, ${failed} fail`);
    process.exit(failed > 0 ? 1 : 0);
  }

  // Cenário 1: novo usuário comum (operador)
  const create1 = await request('POST', '/api/admin/users', {
    name: 'Usuário Regressão Operador',
    email: baseEmail,
    password: validPassword,
    company_role_id: operRole.id
  }, headers);
  ok('Cenário 1 — criar usuário comum', create1.status === 201 && create1.json?.ok === true,
    `status=${create1.status} error=${create1.json?.error || ''}`);

  // Cenário 9: email duplicado
  const dup = await request('POST', '/api/admin/users', {
    name: 'Duplicado',
    email: baseEmail,
    password: validPassword,
    company_role_id: operRole.id
  }, headers);
  ok('Cenário 9 — email duplicado rejeitado', dup.status === 409 && dup.json?.code === 'EMAIL_ALREADY_EXISTS',
    `status=${dup.status} code=${dup.json?.code}`);

  // Cenário: cargo inexistente
  const badRole = await request('POST', '/api/admin/users', {
    name: 'Cargo Inválido',
    email: `bad.role.${ts}@impetus-test.local`,
    password: validPassword,
    company_role_id: '00000000-0000-0000-0000-000000000099'
  }, headers);
  ok('Cargo inexistente rejeitado', badRole.status === 400 && badRole.json?.code === 'INVALID_STRUCTURAL_ROLE',
    `status=${badRole.status} code=${badRole.json?.code}`);

  // Cenário: sem cargo
  const noRole = await request('POST', '/api/admin/users', {
    name: 'Sem Cargo',
    email: `no.role.${ts}@impetus-test.local`,
    password: validPassword
  }, headers);
  ok('Sem cargo rejeitado', noRole.status === 400 && noRole.json?.code === 'STRUCTURAL_ROLE_REQUIRED',
    `status=${noRole.status} code=${noRole.json?.code}`);

  // Cenário 8: senha inválida
  const badPass = await request('POST', '/api/admin/users', {
    name: 'Senha Fraca',
    email: `weak.pass.${ts}@impetus-test.local`,
    password: '123',
    company_role_id: operRole.id
  }, headers);
  ok('Senha inválida rejeitada', badPass.status === 400 && badPass.json?.code === 'VALIDATION_ERROR',
    `status=${badPass.status} error=${badPass.json?.error || ''}`);

  // Cenário 5: mesmo cargo, outro usuário
  const create2 = await request('POST', '/api/admin/users', {
    name: 'Segundo Usuário Mesmo Cargo',
    email: `second.${ts}@impetus-test.local`,
    password: validPassword,
    company_role_id: operRole.id
  }, headers);
  ok('Cenário 5 — mesmo cargo outro usuário', create2.status === 201,
    `status=${create2.status}`);

  // Cenário 7: cargo diferente (se existir)
  const altRole = await getStructuralRole(admin.company_id, 5);
  if (altRole?.id && altRole.id !== operRole.id) {
    const create3 = await request('POST', '/api/admin/users', {
      name: 'Usuário Cargo Diferente',
      email: `alt.role.${ts}@impetus-test.local`,
      password: validPassword,
      company_role_id: altRole.id
    }, headers);
    ok('Cenário 7 — cargo diferente', create3.status === 201, `status=${create3.status}`);
    await cleanupTestUser(`alt.role.${ts}@impetus-test.local`, admin.company_id);
  } else {
    ok('Cenário 7 — cargo diferente', true, 'skip (cargo alternativo indisponível)');
  }

  // Cleanup
  await cleanupTestUser(baseEmail, admin.company_id);
  await cleanupTestUser(`second.${ts}@impetus-test.local`, admin.company_id);

  console.log(`\nResumo: ${passed} pass, ${failed} fail`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
