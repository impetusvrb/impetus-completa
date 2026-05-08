'use strict';

/**
 * Cenários — Phase 7: Hierarchy Synchronization
 *
 * Cobre:
 *   1.  hierarchyResolver: prioridade canónica (cr → users → role → default)
 *   2.  applyCanonicalHierarchy: enriquecimento idempotente do snapshot
 *   3.  isHierarchyDrifted: detecção precisa de divergência
 *   4.  resolveLevelForPersistence: prefere company_roles em CREATE/UPDATE
 *   5.  syncHierarchyFromCompanyRole (mocked db): idempotência + invalidação
 *   6.  userIdentityCacheBus: dispatch correcto + skip por fields irrelevantes
 *   7.  7 personas canónicas:
 *       - CEO     (cr=0)  recebe gates executivos liberados
 *       - CFO     (cr=1)  recebe gates de liderança
 *       - DirInd  (cr=1)  idem
 *       - Supervisor (cr=4) mantém nível operacional
 *       - Operador  (cr=5) mantém nível operacional
 *       - RH BP   (cr=3)  intermediário
 *       - Inconsistente legado (sem cr) cai em fallback role/default
 *   8.  Drift: CEO com users.hierarchy_level=5 e cr=0 ⇒ canonical=0 + warn
 *   9.  Compatibilidade: utilizador sem company_role_id devolve users.value
 *  10.  Compat backwards: utilizador 100% legado (sem cr, sem hl) cai em role
 *  11.  Determinístico em runtime: chamar 1000x não muta input nem o
 *       resultado (puro)
 *
 * Execução:
 *   node src/tests/hierarchySyncScenarios.js
 *   npm run test:hierarchy-sync
 */

const path = require('path');

let _passed = 0;
let _failed = 0;
function assert(cond, label, detail) {
  if (cond) { _passed += 1; console.log(`  PASS  ${label}`); return true; }
  _failed += 1; console.log(`  FAIL  ${label}`);
  if (detail !== undefined) {
    try { console.log('        ', JSON.stringify(detail).slice(0, 480)); } catch (_) { /* ignore */ }
  }
  return false;
}
function section(name) { console.log(`\n=== ${name} ===`); }

// Silenciar console.warn/log do resolver durante os testes para output limpo
const _origWarn = console.warn;
const _origLog = console.log;
let _capturedDriftWarnings = 0;
let _capturedSyncLogs = 0;
console.warn = function silenced(label) {
  if (typeof label === 'string' && label.startsWith('[HIERARCHY_DRIFT]')) {
    _capturedDriftWarnings += 1;
    return;
  }
  _origWarn.apply(console, arguments);
};
const _silencedLog = function silencedLog(label) {
  if (typeof label === 'string' && (label.startsWith('[IDENTITY_SYNC]') || label.startsWith('[IDENTITY_CACHE_INVALIDATE]'))) {
    _capturedSyncLogs += 1;
    return;
  }
  _origLog.apply(console, arguments);
};

const resolverPath = path.join('..', 'services', 'hierarchyResolver');
const syncPath     = path.join('..', 'services', 'userIdentitySync');
const cachePath    = path.join('..', 'services', 'userIdentityCacheBus');

const resolver = require(resolverPath);
// Carregar a cache bus AGORA (antes de mockarmos `db`) e re-stubar mais à frente.
const cacheBus = require(cachePath);

const { resolveHierarchyLevel, applyCanonicalHierarchy, isHierarchyDrifted, ROLE_TO_LEVEL_FALLBACK } = resolver;

// ──────────────────────────────────────────────────────────────────────────
// PARTE 1 — hierarchyResolver: prioridade canónica
// ──────────────────────────────────────────────────────────────────────────
section('1) hierarchyResolver — prioridade canónica');
console.log = _silencedLog;

assert(resolveHierarchyLevel({ company_role_hierarchy_level: 0, hierarchy_level: 5, role: 'colaborador' }, { silent: true }) === 0,
  'cr (0) sobrepõe users (5) e role (colaborador)');
assert(resolveHierarchyLevel({ cr_hierarchy_level: 1, hierarchy_level: 4 }, { silent: true }) === 1,
  'alias cr_hierarchy_level também serve como canónico');
assert(resolveHierarchyLevel({ hierarchy_level: 3, role: 'colaborador' }, { silent: true }) === 3,
  'sem cr → users.value (3) prevalece sobre role (5)');
assert(resolveHierarchyLevel({ role: 'ceo' }, { silent: true }) === 0,
  'sem cr e sem users → role=ceo cai em ROLE_TO_LEVEL_FALLBACK[ceo]=0');
assert(resolveHierarchyLevel({ role: 'desconhecido' }, { silent: true }) === 5,
  'sem nada → default operador (5)');
assert(resolveHierarchyLevel(null, { silent: true }) === 5,
  'user nulo → default operador (5)');
assert(resolveHierarchyLevel({ company_role_hierarchy_level: '0' }, { silent: true }) === 0,
  'aceita string numérica');
assert(resolveHierarchyLevel({ company_role_hierarchy_level: 'abc' }, { silent: true }) === 5,
  'string não numérica → cai no resto da prioridade');
assert(ROLE_TO_LEVEL_FALLBACK.diretor === 1, 'role diretor → 1');
assert(ROLE_TO_LEVEL_FALLBACK.gerente === 2, 'role gerente → 2');

// ──────────────────────────────────────────────────────────────────────────
// PARTE 2 — applyCanonicalHierarchy: idempotente
// ──────────────────────────────────────────────────────────────────────────
section('2) applyCanonicalHierarchy — idempotente e seguro');

const ceoRaw = {
  id: 'u-ceo',
  email: 'ceo@x',
  hierarchy_level: 5,
  company_role_id: 'cr-ceo',
  company_role_hierarchy_level: 0,
  company_role_name: 'CEO (Diretor Executivo)',
  role: 'ceo'
};
const ceoApplied = applyCanonicalHierarchy(ceoRaw);
assert(ceoApplied.hierarchy_level === 0, 'CEO: canonical=0 substitui users=5', ceoApplied);
assert(ceoApplied.hierarchy_level_users === 5, 'mantém valor antigo em users_value para auditoria');
assert(ceoApplied.hierarchy_level_canonical_source === 'company_roles', 'source=company_roles');
assert(ceoApplied !== ceoRaw, 'devolve novo objecto (não muta input)');
assert(ceoRaw.hierarchy_level === 5, 'input preservado');

const aligned = applyCanonicalHierarchy({ hierarchy_level: 0, company_role_hierarchy_level: 0, role: 'ceo' });
assert(aligned.hierarchy_level === 0 && !aligned.hierarchy_level_users, 'já alinhado: devolve sem enriquecer');

assert(applyCanonicalHierarchy(null) === null, 'user nulo passa intacto');

// ──────────────────────────────────────────────────────────────────────────
// PARTE 3 — isHierarchyDrifted
// ──────────────────────────────────────────────────────────────────────────
section('3) isHierarchyDrifted — detecção precisa');

assert(isHierarchyDrifted({ company_role_hierarchy_level: 0, hierarchy_level: 5 }) === true,
  'CEO Welligton: drift positivo');
assert(isHierarchyDrifted({ company_role_hierarchy_level: 0, hierarchy_level: 0 }) === false,
  'CEO alinhado: sem drift');
assert(isHierarchyDrifted({ hierarchy_level: 5 }) === false,
  'sem cr: não detectável (false)');
assert(isHierarchyDrifted({ company_role_hierarchy_level: 1, hierarchy_level: null }) === false,
  'cr presente mas users null: ainda não considerado drift');

// ──────────────────────────────────────────────────────────────────────────
// PARTE 4 — resolveLevelForPersistence (com mock de db)
// ──────────────────────────────────────────────────────────────────────────
section('4) resolveLevelForPersistence — cargo formal sobrepõe area');

// Stub db no require cache antes de carregar userIdentitySync
const dbModulePath = require.resolve(path.join('..', 'db'));
const _origDbModule = require.cache[dbModulePath] ? require.cache[dbModulePath].exports : null;
const fakeRoles = new Map([
  ['cr-ceo', { hierarchy_level: 0, name: 'CEO (Diretor Executivo)' }],
  ['cr-cfo', { hierarchy_level: 1, name: 'Diretor Financeiro' }],
  ['cr-dirind', { hierarchy_level: 1, name: 'Diretor Industrial' }],
  ['cr-rhbp', { hierarchy_level: 3, name: 'RH Business Partner' }],
  ['cr-sup', { hierarchy_level: 4, name: 'Supervisor de Produção' }],
  ['cr-op', { hierarchy_level: 5, name: 'Operador' }],
  ['cr-broken', { hierarchy_level: null, name: 'Cargo legado sem nível' }]
]);
const fakeUsers = new Map([
  ['u-ceo', { id: 'u-ceo', company_id: 'co-1', company_role_id: 'cr-ceo', hierarchy_level: 5 }],
  ['u-cfo-aligned', { id: 'u-cfo-aligned', company_id: 'co-1', company_role_id: 'cr-cfo', hierarchy_level: 1 }],
  ['u-rhbp', { id: 'u-rhbp', company_id: 'co-1', company_role_id: 'cr-rhbp', hierarchy_level: 5 }],
  ['u-no-cr', { id: 'u-no-cr', company_id: 'co-1', company_role_id: null, hierarchy_level: 4 }],
  ['u-broken', { id: 'u-broken', company_id: 'co-1', company_role_id: 'cr-broken', hierarchy_level: 5 }]
]);
const updatedUsers = new Map();
const fakeDb = {
  query: async (sql, params) => {
    const norm = String(sql).replace(/\s+/g, ' ').trim();
    if (/^SELECT hierarchy_level FROM company_roles WHERE id = \$1$/i.test(norm)) {
      const row = fakeRoles.get(params[0]);
      return { rows: row ? [{ hierarchy_level: row.hierarchy_level }] : [] };
    }
    if (/^SELECT company_id, company_role_id, hierarchy_level FROM users WHERE id = \$1/.test(norm)) {
      const row = fakeUsers.get(params[0]);
      if (!row) return { rows: [] };
      const updated = updatedUsers.get(params[0]);
      return { rows: [{ company_id: row.company_id, company_role_id: row.company_role_id, hierarchy_level: updated !== undefined ? updated : row.hierarchy_level }] };
    }
    if (/^UPDATE users SET hierarchy_level = \$1, updated_at = now\(\) WHERE id = \$2$/i.test(norm)) {
      updatedUsers.set(params[1], params[0]);
      return { rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
};
require.cache[dbModulePath] = { id: dbModulePath, filename: dbModulePath, loaded: true, exports: fakeDb };

// Re-importar sync para usar o db stub
delete require.cache[require.resolve(syncPath)];
const sync = require(syncPath);

(async function partFour() {
  let r = await sync.resolveLevelForPersistence({ companyRoleId: 'cr-ceo', fallbackLevel: 5, role: 'colaborador' });
  assert(r.level === 0 && r.source === 'company_roles', 'company_role_id=ceo override fallback area=5', r);

  r = await sync.resolveLevelForPersistence({ companyRoleId: 'cr-broken', fallbackLevel: 4, role: 'gerente' });
  assert(r.level === 4 && r.source === 'fallback', 'cargo sem hl → cai no fallback do admin (4)', r);

  r = await sync.resolveLevelForPersistence({ fallbackLevel: null, role: 'ceo' });
  assert(r.level === 0 && r.source === 'role', 'sem cargo + sem fallback + role=ceo → 0 via role map', r);

  r = await sync.resolveLevelForPersistence({});
  assert(r.level === 5 && r.source === 'default', 'tudo vazio → 5 default operador', r);

  // ────────────────────────────────────────────────────────────────────────
  // PARTE 5 — syncHierarchyFromCompanyRole (idempotência + cascata)
  // ────────────────────────────────────────────────────────────────────────
  section('5) syncHierarchyFromCompanyRole — idempotente e seguro');

  const r1 = await sync.syncHierarchyFromCompanyRole({ userId: 'u-ceo', reason: 'test_ceo_first_run' });
  assert(r1.changed === true && r1.before === 5 && r1.after === 0, 'CEO sincronizado: 5→0', r1);

  const r2 = await sync.syncHierarchyFromCompanyRole({ userId: 'u-ceo', reason: 'test_ceo_second_run' });
  assert(r2.changed === false && r2.after === 0, 'segunda chamada idempotente (no-op)', r2);

  const r3 = await sync.syncHierarchyFromCompanyRole({ userId: 'u-cfo-aligned', reason: 'test_cfo_already_synced' });
  assert(r3.changed === false && r3.reason === 'already_synced', 'CFO já alinhado → no-op', r3);

  const r4 = await sync.syncHierarchyFromCompanyRole({ userId: 'u-no-cr', reason: 'test_no_cr' });
  assert(r4.changed === false && r4.reason === 'no_company_role', 'sem company_role → no-op gracioso', r4);

  const r5 = await sync.syncHierarchyFromCompanyRole({ userId: 'u-broken', reason: 'test_broken_cr' });
  assert(r5.changed === false && r5.reason === 'company_role_has_no_level', 'cargo sem hl → no-op gracioso', r5);

  const r6 = await sync.syncHierarchyFromCompanyRole({ userId: 'u-not-exists', reason: 'test_missing' });
  assert(r6.ok === false && r6.reason === 'user_not_found', 'utilizador inexistente → erro safe', r6);

  const r7 = await sync.syncHierarchyFromCompanyRole({ reason: 'test_no_id' });
  assert(r7.ok === false && r7.reason === 'missing_user_id', 'sem userId → erro safe', r7);

  // ────────────────────────────────────────────────────────────────────────
  // PARTE 6 — userIdentityCacheBus
  // ────────────────────────────────────────────────────────────────────────
  section('6) userIdentityCacheBus — dispatch e skip');

  const skip = await cacheBus.invalidateUserIdentity({
    userId: 'u-1', companyId: 'co-1', reason: 'test', fieldsChanged: ['name', 'email']
  });
  assert(skip.skipped === true, 'fields irrelevantes → skip', skip);

  const force = await cacheBus.invalidateUserIdentity({
    userId: 'u-1', companyId: 'co-1', reason: 'test_force', force: true
  });
  assert(force.ok === true && force.results, 'force=true sempre executa');
  assert(typeof force.results.dashboard_personalizado === 'string', 'tenta invalidar dashboard_personalizado');
  assert(typeof force.results.structural_org_context === 'string', 'tenta invalidar structural_org_context');

  const noUser = await cacheBus.invalidateUserIdentity({ companyId: 'co-1', reason: 'no_user' });
  assert(noUser.ok === false, 'sem userId → erro safe', noUser);

  const trig = await cacheBus.invalidateUserIdentity({
    userId: 'u-2', companyId: 'co-1', reason: 'role_change', fieldsChanged: ['role']
  });
  assert(trig.ok === true && !trig.skipped, 'fieldsChanged=[role] dispara', trig);

  const trigCr = await cacheBus.invalidateUserIdentity({
    userId: 'u-3', companyId: 'co-1', reason: 'cr_change', fieldsChanged: ['company_role_id']
  });
  assert(trigCr.ok === true && !trigCr.skipped, 'fieldsChanged=[company_role_id] dispara');

  // ────────────────────────────────────────────────────────────────────────
  // PARTE 7 — 7 personas canónicas (resolução estática)
  // ────────────────────────────────────────────────────────────────────────
  section('7) 7 personas canónicas — resolução estática');

  const personas = [
    { tag: 'CEO',          input: { id: 'p-ceo', company_role_hierarchy_level: 0, hierarchy_level: 5, role: 'colaborador' }, expect: 0 },
    { tag: 'CFO',          input: { id: 'p-cfo', company_role_hierarchy_level: 1, hierarchy_level: 5, role: 'diretor' },     expect: 1 },
    { tag: 'DirIndustrial',input: { id: 'p-din', company_role_hierarchy_level: 1, hierarchy_level: 4, role: 'diretor' },     expect: 1 },
    { tag: 'Supervisor',   input: { id: 'p-sup', company_role_hierarchy_level: 4, hierarchy_level: 4, role: 'supervisor' },  expect: 4 },
    { tag: 'Operador',     input: { id: 'p-op',  company_role_hierarchy_level: 5, hierarchy_level: 5, role: 'operador' },    expect: 5 },
    { tag: 'RH BP',        input: { id: 'p-rh',  company_role_hierarchy_level: 3, hierarchy_level: 5, role: 'gerente' },     expect: 3 },
    { tag: 'Inconsistente legado (sem cr)', input: { id: 'p-leg', hierarchy_level: 3, role: 'colaborador' }, expect: 3 }
  ];
  for (const p of personas) {
    const lvl = resolveHierarchyLevel(p.input, { silent: true });
    assert(lvl === p.expect, `${p.tag}: nível canónico = ${p.expect}`, { got: lvl, input: p.input });
  }

  // ────────────────────────────────────────────────────────────────────────
  // PARTE 8 — Drift produz warning observável
  // ────────────────────────────────────────────────────────────────────────
  section('8) Drift produz warning observável');

  _capturedDriftWarnings = 0;
  resolveHierarchyLevel({
    id: 'audit-ceo', email: 'ceo@x',
    company_role_hierarchy_level: 0, hierarchy_level: 5
  });
  assert(_capturedDriftWarnings === 1, 'CEO em drift gera 1 warning [HIERARCHY_DRIFT]');
  resolveHierarchyLevel({
    id: 'audit-ceo', email: 'ceo@x',
    company_role_hierarchy_level: 0, hierarchy_level: 0
  });
  assert(_capturedDriftWarnings === 1, 'CEO alinhado não gera warning extra');

  // ────────────────────────────────────────────────────────────────────────
  // PARTE 9 — Pureza: idempotente + sem mutação
  // ────────────────────────────────────────────────────────────────────────
  section('9) Pureza: idempotente + sem mutação');

  const sample = { id: 'pure', company_role_hierarchy_level: 0, hierarchy_level: 5, role: 'ceo' };
  const sampleSnapshot = JSON.stringify(sample);
  for (let i = 0; i < 1000; i += 1) resolveHierarchyLevel(sample, { silent: true });
  assert(JSON.stringify(sample) === sampleSnapshot, '1000 chamadas não mutam o input');

  // ────────────────────────────────────────────────────────────────────────
  // PARTE 10 — Compatibilidade: utilizador sem company_role_id
  // ────────────────────────────────────────────────────────────────────────
  section('10) Compatibilidade backwards');

  const legacyUser = { hierarchy_level: 4, role: 'gerente' };
  assert(resolveHierarchyLevel(legacyUser, { silent: true }) === 4,
    'utilizador 100% legado: respeita users.hierarchy_level');
  const enriched = applyCanonicalHierarchy(legacyUser);
  assert(enriched.hierarchy_level === 4 && !('hierarchy_level_users' in enriched),
    'aplicar canonical em legacy não muda nada (idempotente)');

  // Restaurar console
  console.log = _origLog;
  console.warn = _origWarn;
  // Restaurar db
  if (_origDbModule) require.cache[dbModulePath] = { id: dbModulePath, filename: dbModulePath, loaded: true, exports: _origDbModule };
  else delete require.cache[dbModulePath];

  console.log(`\n${_failed === 0 ? 'OK' : 'FAIL'}  passed=${_passed}  failed=${_failed}\n`);
  process.exit(_failed === 0 ? 0 : 1);
})().catch((e) => {
  console.log = _origLog;
  console.warn = _origWarn;
  console.error('[hierarchySyncScenarios][fatal]', e && e.stack ? e.stack : e);
  process.exit(2);
});
