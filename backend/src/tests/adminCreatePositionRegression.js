'use strict';

/**
 * Regressão — criação de cargos via POST /api/admin/structural/roles
 * Execução: node src/tests/adminCreatePositionRegression.js
 */

const http = require('http');
const crypto = require('crypto');
const db = require('../db');

const API = process.env.API_BASE || 'http://127.0.0.1:4000';
let passed = 0;
let failed = 0;

function ok(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API);
    const req = http.request({
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { /* ok */ }
        resolve({ status: res.statusCode, json, raw: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function createAdminSession() {
  const r = await db.query(`
    SELECT u.id, u.company_id FROM users u
    WHERE u.deleted_at IS NULL AND u.active = true AND u.hierarchy_level <= 1
    ORDER BY u.hierarchy_level ASC LIMIT 1
  `);
  const admin = r.rows[0];
  if (!admin) throw new Error('Nenhum admin encontrado');

  const token = crypto.randomBytes(32).toString('hex');
  await db.query(
    `INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
     VALUES ($1, $2, '127.0.0.1', 'adminCreatePositionRegression', $3)`,
    [admin.id, token, new Date(Date.now() + 2 * 60 * 60 * 1000)]
  );
  return { token, admin };
}

async function getDeptAndSector(companyId) {
  const d = await db.query(
    `SELECT id FROM departments WHERE company_id = $1::uuid AND active = true LIMIT 1`,
    [companyId]
  );
  const deptId = d.rows[0]?.id;
  if (!deptId) return { deptId: null, sectorId: null };

  const s = await db.query(
    `SELECT id FROM company_sectors WHERE company_id = $1::uuid AND department_id = $2::uuid AND active = true LIMIT 1`,
    [companyId, deptId]
  );
  return { deptId, sectorId: s.rows[0]?.id || null };
}

async function getSuperiorRole(companyId, maxLevel = 3) {
  const r = await db.query(
    `SELECT id, name, hierarchy_level FROM company_roles
     WHERE company_id = $1::uuid AND active = true AND hierarchy_level <= $2
     ORDER BY hierarchy_level ASC LIMIT 1`,
    [companyId, maxLevel]
  );
  return r.rows[0] || null;
}

function basePayload(name, hierarchyLevel, deptId, sectorId, superiorId = null) {
  return {
    name,
    hierarchy_level: hierarchyLevel,
    department_id: deptId,
    sector_id: sectorId,
    operational_scope: 'operacional',
    organizational_function: `Função de teste ${name}`,
    main_responsibilities: ['Responsabilidade teste'],
    direct_superior_role_id: superiorId
  };
}

async function deactivateRole(roleId, companyId) {
  await db.query(
    `UPDATE company_roles SET active = false, updated_at = now()
     WHERE id = $1::uuid AND company_id = $2::uuid`,
    [roleId, companyId]
  );
}

async function run() {
  console.log('adminCreatePositionRegression — início\n');
  const { token, admin } = await createAdminSession();
  const headers = { Authorization: `Bearer ${token}` };
  const ts = Date.now();
  const { deptId, sectorId } = await getDeptAndSector(admin.company_id);

  ok('Departamento disponível', !!deptId, deptId || 'nenhum');
  ok('Setor disponível', !!sectorId, sectorId || 'nenhum');
  if (!deptId || !sectorId) {
    console.log(`\nResumo: ${passed} pass, ${failed} fail`);
    process.exit(1);
  }

  const scenarios = [
    { label: 'Cenário 1 — Operacional', level: 6, name: `Operador Regressão ${ts}` },
    { label: 'Cenário 2 — Supervisor', level: 4, name: `Supervisor Regressão ${ts}` },
    { label: 'Cenário 3 — Coordenador', level: 3, name: `Coordenador Regressão ${ts}` },
    { label: 'Cenário 4 — Gerente', level: 2, name: `Gerente Regressão ${ts}` },
  ];

  const createdIds = [];

  for (const sc of scenarios) {
    const payload = basePayload(sc.name, sc.level, deptId, sectorId);
    const res = await request('POST', '/api/admin/structural/roles', payload, headers);
    const roleId = res.json?.data?.id;
    if (roleId) createdIds.push(roleId);
    ok(sc.label, res.status === 201 && res.json?.success === true,
      `status=${res.status} error=${res.json?.error || ''}`);
  }

  // Cenário 5: sem superior
  const noSup = await request('POST', '/api/admin/structural/roles', basePayload(
    `Sem Superior ${ts}`, 5, deptId, sectorId, null
  ), headers);
  if (noSup.json?.data?.id) createdIds.push(noSup.json.data.id);
  ok('Cenário 5 — cargo sem superior', noSup.status === 201, `status=${noSup.status}`);

  // Cenário 6: com superior
  const superior = await getSuperiorRole(admin.company_id, 2);
  if (superior?.id) {
    const withSup = await request('POST', '/api/admin/structural/roles', basePayload(
      `Com Superior ${ts}`, 5, deptId, sectorId, superior.id
    ), headers);
    if (withSup.json?.data?.id) createdIds.push(withSup.json.data.id);
    ok('Cenário 6 — cargo com superior', withSup.status === 201,
      `status=${withSup.status} superior=${superior.name}`);
  } else {
    ok('Cenário 6 — cargo com superior', true, 'skip (sem cargo superior disponível)');
  }

  // Validação: departamento inválido
  const badDept = await request('POST', '/api/admin/structural/roles', basePayload(
    `Dept Inválido ${ts}`, 5, '00000000-0000-0000-0000-000000000099', sectorId
  ), headers);
  ok('Departamento inválido rejeitado', badDept.status === 400, `status=${badDept.status}`);

  // Validação: nome vazio
  const noName = await request('POST', '/api/admin/structural/roles', {
    name: '',
    hierarchy_level: 5,
    department_id: deptId,
    sector_id: sectorId
  }, headers);
  ok('Nome vazio rejeitado', noName.status === 400, `status=${noName.status}`);

  // Impacto: cargo disponível na listagem
  if (createdIds.length > 0) {
    const list = await request('GET', '/api/admin/structural/roles', null, headers);
    const ids = (list.json?.data || []).map((r) => r.id);
    const found = createdIds.some((id) => ids.includes(id));
    ok('Cargo visível na listagem (impacto cadastro usuários)', found, `criados=${createdIds.length}`);
  }

  for (const id of createdIds) {
    await deactivateRole(id, admin.company_id);
  }

  console.log(`\nResumo: ${passed} pass, ${failed} fail`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
