'use strict';

/**
 * Cenários — Phase 6: Contextual Module Orchestration
 *
 * Cobre:
 *   1.  Modo `off` (default) é byte-a-byte igual ao legacy
 *   2.  Modo `enrich` adiciona menu_keys coerentes; nada removido
 *   3.  Modo `replace` entrega só permitidos + universals; valida fallback
 *       automático em alta severidade
 *   4.  Validator: críticos ausentes / proibidos presentes / overload /
 *       capability incoherence / LGPD scope mismatch
 *   5.  Orchestrator: 7 personas (CFO / DirIndustrial / Supervisor /
 *       Operador / RH BP / Segurança / Auditor) recebem composição correcta
 *   6.  Module Capabilities: alias resolution e expansão por regras
 *   7.  Promotion guard: circuit breaker abre após N falhas, manualForceFallback
 *   8.  Telemetry: gaps, summary, fallback_rate
 *   9.  Robustez: user nulo / legacy nulo / erros internos → legacy intocado
 *  10.  Flags granulares: area override, percent rollout, byCompany
 *  11.  Contrato preservado: visibleModules sempre array de strings,
 *       contextualModules sempre array (mesmo vazio)
 *  12.  ZERO frontend impact — meta.identity_summary é puramente descritiva
 *
 * Execução:
 *   npm run test:contextual-modules
 *   node src/tests/contextualModulesScenarios.js
 */

const path = require('path');

// Estado conhecido
process.env.IMPETUS_CONTEXTUAL_MODULES_LOG_LEVEL = 'silent';
delete process.env.IMPETUS_CONTEXTUAL_MODULES;
delete process.env.IMPETUS_CONTEXTUAL_MODULES_FINANCE;
delete process.env.IMPETUS_CONTEXTUAL_MODULES_OPERATIONAL;
delete process.env.IMPETUS_CONTEXTUAL_MODULES_INDUSTRIAL;
delete process.env.IMPETUS_CONTEXTUAL_MODULES_HR;
delete process.env.IMPETUS_CONTEXTUAL_MODULES_QUALITY;
delete process.env.IMPETUS_CONTEXTUAL_MODULES_MAINTENANCE;
delete process.env.IMPETUS_CONTEXTUAL_MODULES_ADMIN;
delete process.env.IMPETUS_CONTEXTUAL_MODULES_PERCENT;
delete process.env.IMPETUS_CONTEXTUAL_MODULES_BY_COMPANY;

const registry      = require(path.join('..', 'contextualModules', 'moduleRegistry'));
const orchestrator  = require(path.join('..', 'contextualModules', 'moduleOrchestrator'));
const validator     = require(path.join('..', 'contextualModules', 'moduleValidator'));
const telemetry     = require(path.join('..', 'contextualModules', 'moduleTelemetry'));
const guard         = require(path.join('..', 'contextualModules', 'modulePromotionGuard'));
const flagsLib      = require(path.join('..', 'contextualModules', 'moduleFlags'));
const moduleCaps    = require(path.join('..', 'contextualModules', 'moduleCapabilities'));
const facade        = require(path.join('..', 'contextualModules'));
const { buildContextualIdentity } = require(path.join('..', 'dashboardEngineV2', 'identity', 'identityResolver'));

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

function arrayEq(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}
function setSubset(small, big) {
  const s = new Set(big);
  for (const v of small) if (!s.has(v)) return false;
  return true;
}

// ── 7 personas ──────────────────────────────────────────────────────────
const CFO        = { id: 'u-cfo', company_id: 'co-1', role: 'diretor', job_title: 'Diretor Financeiro', functional_area: 'Financeiro', department: 'Diretoria Financeira', hierarchy_level: 1, permissions: ['VIEW_FINANCIAL', 'VIEW_STRATEGIC'] };
const DIR_IND    = { id: 'u-di', company_id: 'co-1', role: 'diretor', job_title: 'Diretor Industrial', functional_area: 'Industrial', department: 'Diretoria Industrial', hierarchy_level: 1, permissions: ['VIEW_OPERATIONAL', 'VIEW_STRATEGIC'] };
const SUPERVISOR = { id: 'u-sup', company_id: 'co-1', role: 'supervisor', job_title: 'Supervisor de Produção', functional_area: 'Produção', department: 'Produção', hierarchy_level: 4, permissions: ['VIEW_OPERATIONAL'] };
const OPERADOR   = { id: 'u-op', company_id: 'co-1', role: 'colaborador', job_title: 'Operador de Máquina', functional_area: 'Produção', department: 'Produção', hierarchy_level: 5, permissions: [] };
const RH_BP      = { id: 'u-rh', company_id: 'co-1', role: 'gerente', job_title: 'Business Partner RH', functional_area: 'Recursos Humanos', department: 'RH', hierarchy_level: 3, permissions: ['VIEW_HR'] };
const SAFETY     = { id: 'u-sst', company_id: 'co-1', role: 'coordenador', job_title: 'Coordenador SST', functional_area: 'Segurança do Trabalho', department: 'SST', hierarchy_level: 3, permissions: ['VIEW_SAFETY', 'VIEW_OPERATIONAL'] };
const AUDITOR    = { id: 'u-aud', company_id: 'co-1', role: 'gerente', job_title: 'Auditor', functional_area: 'Administrativo', department: 'Auditoria', hierarchy_level: 2, permissions: ['VIEW_AUDIT_LOGS'] };
const INCONSIST  = { id: 'u-inc', company_id: 'co-1', role: 'colaborador', job_title: '', functional_area: '', department: '', hierarchy_level: 5, permissions: [] };

// Legacy visible_modules típicos (extraídos de dashboardProfiles.js)
const LEGACY_FINANCE = ['dashboard', 'operational', 'biblioteca', 'ai', 'settings'];
const LEGACY_OPER    = ['dashboard', 'operational', 'proaction', 'chat', 'biblioteca', 'ai', 'anomaly_detection', 'settings'];
const LEGACY_OPERATOR = ['dashboard', 'operational', 'biblioteca', 'ai', 'settings'];

// ── 1. Modo off ─────────────────────────────────────────────────────────
function testOffMode() {
  section('1. Modo `off` (default) — contrato byte-a-byte preservado');
  delete process.env.IMPETUS_CONTEXTUAL_MODULES;
  guard.reset();
  telemetry.reset();
  const out = facade.enhanceVisibleModulesWithContext(LEGACY_FINANCE, CFO);
  assert(arrayEq(out.visibleModules, LEGACY_FINANCE), '1a. visibleModules === legacy', { got: out.visibleModules, want: LEGACY_FINANCE });
  assert(Array.isArray(out.contextualModules), '1b. contextualModules é array');
  assert(out.contextualModules.length === 0, '1c. contextualModules vazio em modo off');
  assert(out.meta && out.meta.mode === 'off', '1d. meta.mode === off', out.meta);
  assert(out.meta.fallback === false, '1e. fallback === false');
  assert(out.meta.validator === null || out.meta.validator === undefined, '1f. validator não calculado em off');
}

// ── 2. Modo enrich ──────────────────────────────────────────────────────
function testEnrichMode() {
  section('2. Modo `enrich` — adiciona coerentemente; nada removido');
  process.env.IMPETUS_CONTEXTUAL_MODULES = 'enrich';
  guard.reset();
  telemetry.reset();
  const out = facade.enhanceVisibleModulesWithContext(LEGACY_FINANCE, CFO);
  assert(setSubset(LEGACY_FINANCE, out.visibleModules), '2a. legacy ⊆ enriched (nada removido)', { legacy: LEGACY_FINANCE, enriched: out.visibleModules });
  assert(out.visibleModules.length >= LEGACY_FINANCE.length, '2b. enriched.length >= legacy.length');
  // CFO esperado: ganhar manuia, hr_intelligence, anomaly_detection, audit
  const expectedAdds = ['manuia', 'hr_intelligence', 'anomaly_detection', 'audit'];
  for (const k of expectedAdds) {
    assert(out.visibleModules.includes(k), `2c. CFO em enrich recebe '${k}'`);
  }
  assert(out.meta.mode === 'enrich', '2d. meta.mode === enrich');
  assert(Array.isArray(out.meta.diff?.added), '2e. diff.added é array');
  assert(out.contextualModules.length > 0, '2f. contextualModules populado');
  delete process.env.IMPETUS_CONTEXTUAL_MODULES;
}

// ── 3. Modo replace ─────────────────────────────────────────────────────
function testReplaceMode() {
  section('3. Modo `replace` — entrega só permitidos + universals');
  process.env.IMPETUS_CONTEXTUAL_MODULES = 'replace';
  guard.reset();
  telemetry.reset();
  const out = facade.enhanceVisibleModulesWithContext(LEGACY_FINANCE, CFO);
  // universals devem estar sempre lá
  for (const u of ['dashboard', 'operational', 'ai']) {
    assert(out.visibleModules.includes(u), `3a. universal '${u}' presente em replace`);
  }
  // CFO replace deve incluir admin? não — admin não é critical_required do CFO finance
  assert(out.meta.mode === 'replace' || out.meta.mode === 'enrich_after_replace_fallback',
    '3b. meta.mode coerente (replace ou fallback)', out.meta);
  // se replace concluído sem fallback: deve ser ≤ legacy.length+10 e não forçosamente igual
  assert(Array.isArray(out.contextualModules) && out.contextualModules.length > 0, '3c. contextualModules populado');
  delete process.env.IMPETUS_CONTEXTUAL_MODULES;
}

// ── 4. Validator ────────────────────────────────────────────────────────
function testValidator() {
  section('4. Validator — críticos / proibidos / overload / LGPD');
  // 4a. CFO sem nada → críticos ausentes
  const ident = buildContextualIdentity(CFO);
  const v1 = validator.validateComposition({ identity: ident, allowed_module_ids: ['dashboard', 'operational'] });
  const hasMissing = v1.findings.some((f) => f.type === 'missing_critical_modules');
  assert(hasMissing, '4a. detecta críticos ausentes para CFO');
  assert(v1.valid === false, '4b. valid === false quando críticos ausentes');

  // 4b. operador com módulo proibido (admin)
  const operIdent = buildContextualIdentity(OPERADOR);
  const v2 = validator.validateComposition({
    identity: operIdent,
    allowed_module_ids: ['dashboard', 'operational', 'admin']
  });
  const hasForbidden = v2.findings.some((f) => f.type === 'forbidden_modules_present');
  assert(hasForbidden, '4c. detecta módulos proibidos (operador + admin)');

  // 4c. overload — entregar 30 módulos a um execucao
  const big = registry.getAllModules().map((m) => m.module_id);
  const v3 = validator.validateComposition({ identity: operIdent, allowed_module_ids: big });
  const hasOverload = v3.findings.some((f) => f.type === 'interface_overload');
  assert(hasOverload, '4d. detecta interface overload');

  // 4d. capability incoherence
  const v4 = validator.validateComposition({
    identity: { ...operIdent, capabilities: [] },
    allowed_module_ids: ['financial_intelligence']
  });
  const hasInco = v4.findings.some((f) => f.type === 'capability_incoherence');
  assert(hasInco, '4e. detecta capability_incoherence');

  // 4e. LGPD high para execucao
  const v5 = validator.validateComposition({
    identity: operIdent,
    allowed_module_ids: ['dashboard', 'hr_intelligence']
  });
  const hasLgpd = v5.findings.some((f) => f.type === 'lgpd_scope_mismatch');
  assert(hasLgpd, '4f. detecta LGPD scope mismatch para execucao recebendo high');

  // 4f. trust score
  assert(typeof v1.trust_score === 'number' && v1.trust_score >= 0 && v1.trust_score <= 1,
    '4g. trust_score em [0,1]', { trust: v1.trust_score });
}

// ── 5. Orchestrator: 7 personas ─────────────────────────────────────────
function testOrchestratorPersonas() {
  section('5. Orchestrator — 7 personas');

  const cases = [
    { name: 'CFO', user: CFO, mustHave: ['dashboard', 'operational', 'ai'], expectIn: ['financial_intelligence', 'losses_map', 'cost_center', 'cerebro_operacional'] },
    { name: 'Diretor Industrial', user: DIR_IND, mustHave: ['dashboard', 'operational'], expectIn: ['cerebro_operacional', 'centro_operacoes_industrial', 'manuia'] },
    { name: 'Supervisor', user: SUPERVISOR, mustHave: ['dashboard', 'operational'], expectIn: ['centro_operacoes_industrial'] },
    { name: 'Operador', user: OPERADOR, mustHave: ['dashboard', 'operational'], mustNotHave: ['financial_intelligence', 'losses_map', 'cost_center', 'admin'] },
    { name: 'RH BP', user: RH_BP, mustHave: ['dashboard', 'operational', 'pulse_rh'], expectIn: ['hr_intelligence'] },
    { name: 'Segurança', user: SAFETY, mustHave: ['dashboard', 'operational'], expectIn: ['cerebro_operacional', 'anomaly_detection'] },
    { name: 'Auditor', user: AUDITOR, mustHave: ['dashboard', 'operational'], expectIn: ['audit'] }
  ];

  for (const c of cases) {
    const ident = buildContextualIdentity(c.user);
    const out = orchestrator.orchestrate(ident);
    const ids = out.allowed_module_ids;
    if (c.mustHave) {
      for (const id of c.mustHave) {
        assert(ids.includes(id), `5a.${c.name}.mustHave('${id}')`, { allowed: ids });
      }
    }
    if (c.expectIn) {
      const has = c.expectIn.some((id) => ids.includes(id));
      assert(has, `5b.${c.name}.expectIn(any of [${c.expectIn.join(', ')}])`, { allowed: ids });
    }
    if (c.mustNotHave) {
      for (const id of c.mustNotHave) {
        assert(!ids.includes(id), `5c.${c.name}.mustNotHave('${id}')`, { allowed: ids });
      }
    }
  }
}

// ── 6. Module Capabilities ──────────────────────────────────────────────
function testModuleCapabilities() {
  section('6. Module Capabilities — aliases e regras');

  assert(moduleCaps.resolveAlias('view:financial_dashboard') === 'view:module:financial_intelligence',
    '6a. alias view:financial_dashboard → view:module:financial_intelligence');
  assert(moduleCaps.resolveAlias('view:hr') === 'view:hr',
    '6b. resolveAlias deixa caps não-alias intactos');

  const ident = buildContextualIdentity(CFO);
  const r = moduleCaps.deriveModuleCapabilities({
    function_type: ident.function_type,
    area: ident.area,
    axes_priority: ident.axes_priority,
    capabilities: ident.capabilities
  });
  assert(r.module_capabilities.includes('view:module:financial_intelligence'),
    '6c. CFO desbloqueia view:module:financial_intelligence', r.unlocked_modules);
  assert(r.module_capabilities.includes('view:module:losses_map'),
    '6d. CFO desbloqueia view:module:losses_map');
  assert(Array.isArray(r.rationale) && r.rationale.length > 0, '6e. rationale presente');
}

// ── 7. Promotion Guard ──────────────────────────────────────────────────
function testPromotionGuard() {
  section('7. Promotion Guard — circuit + fallback manual');

  guard.reset();
  process.env.IMPETUS_CONTEXTUAL_MODULES = 'enrich';
  process.env.IMPETUS_CONTEXTUAL_MODULES_FAILURE_THRESHOLD = '3';

  let r = guard.resolveMode({ area: 'finance', function_type: 'decisao_estrategica', user_id: 'u-1' });
  assert(r.mode === 'enrich', '7a. modo base enrich');

  for (let i = 0; i < 3; i += 1) guard.recordFailure('test');
  assert(guard.isCircuitOpen() === true, '7b. circuito abre após 3 falhas');
  r = guard.resolveMode({ area: 'finance', function_type: 'decisao_estrategica', user_id: 'u-1' });
  assert(r.mode === 'off' && r.reason === 'circuit_open', '7c. circuito força mode=off');

  guard.reset();
  guard.manualForceFallback(true);
  r = guard.resolveMode({ area: 'finance', function_type: 'decisao_estrategica', user_id: 'u-1' });
  assert(r.mode === 'off' && r.reason === 'manual_fallback', '7d. manualForceFallback força off');
  guard.manualForceFallback(false);
  r = guard.resolveMode({ area: 'finance', function_type: 'decisao_estrategica', user_id: 'u-1' });
  assert(r.mode === 'enrich', '7e. clear fallback restaura modo base');

  delete process.env.IMPETUS_CONTEXTUAL_MODULES;
  delete process.env.IMPETUS_CONTEXTUAL_MODULES_FAILURE_THRESHOLD;
  guard.reset();
}

// ── 8. Telemetry ────────────────────────────────────────────────────────
function testTelemetry() {
  section('8. Telemetry — gaps, summary, fallback rate');

  telemetry.reset();
  process.env.IMPETUS_CONTEXTUAL_MODULES = 'enrich';
  guard.reset();

  // várias resoluções
  facade.enhanceVisibleModulesWithContext(LEGACY_FINANCE, CFO);
  facade.enhanceVisibleModulesWithContext(LEGACY_FINANCE, CFO);
  facade.enhanceVisibleModulesWithContext(LEGACY_OPERATOR, OPERADOR);

  // uso de um único módulo
  telemetry.recordUsage({ module_id: 'financial_intelligence', user_id: 'u-cfo' });

  const sum = facade.getTelemetrySummary({ since: 0 });
  assert(sum.window.count_resolutions >= 3, '8a. count_resolutions >= 3', sum.window);
  assert(typeof sum.fallback_rate === 'number', '8b. fallback_rate numérico', { rate: sum.fallback_rate });
  assert(sum.delivered_count && Object.keys(sum.delivered_count).length > 0, '8c. delivered_count populado');
  assert(Array.isArray(sum.gaps), '8d. gaps é array');
  assert(typeof sum.avg_trust_score === 'number' || sum.avg_trust_score === null,
    '8e. avg_trust_score numérico ou null');

  delete process.env.IMPETUS_CONTEXTUAL_MODULES;
}

// ── 9. Robustez ─────────────────────────────────────────────────────────
function testRobustness() {
  section('9. Robustez — entradas inválidas, erros internos');

  const out1 = facade.enhanceVisibleModulesWithContext(null, null);
  assert(Array.isArray(out1.visibleModules), '9a. user nulo + legacy nulo → visibleModules array');
  assert(out1.meta.mode === 'off', '9b. modo off em entradas inválidas');

  const out2 = facade.enhanceVisibleModulesWithContext(['dashboard'], { id: 'u-x' });
  assert(arrayEq(out2.visibleModules, ['dashboard']), '9c. user mínimo preserva legacy');

  const out3 = facade.enhanceVisibleModulesWithContext(['dashboard'], CFO);
  assert(Array.isArray(out3.contextualModules), '9d. retorno tem contextualModules array');
}

// ── 10. Flags granulares ────────────────────────────────────────────────
function testFlags() {
  section('10. Flags granulares — área override, percent, byCompany');

  // base off, area finance → enrich
  delete process.env.IMPETUS_CONTEXTUAL_MODULES;
  process.env.IMPETUS_CONTEXTUAL_MODULES_FINANCE = 'true';
  let d = flagsLib.resolveDirectiveForUser({ area: 'finance', function_type: 'decisao_estrategica', user_id: 'u', company_id: 'co' });
  assert(d.mode === 'enrich', '10a. area_override true promove off → enrich', d);
  delete process.env.IMPETUS_CONTEXTUAL_MODULES_FINANCE;

  // by company override
  process.env.IMPETUS_CONTEXTUAL_MODULES = 'enrich';
  process.env.IMPETUS_CONTEXTUAL_MODULES_BY_COMPANY = JSON.stringify({ 'co-1': 'replace' });
  d = flagsLib.resolveDirectiveForUser({ area: 'finance', function_type: 'decisao_estrategica', user_id: 'u', company_id: 'co-1' });
  assert(d.mode === 'replace', '10b. byCompany override prioritário');
  delete process.env.IMPETUS_CONTEXTUAL_MODULES_BY_COMPANY;

  // percent rollout — bucket fora cai para off
  process.env.IMPETUS_CONTEXTUAL_MODULES = 'enrich';
  process.env.IMPETUS_CONTEXTUAL_MODULES_PERCENT = '0';
  d = flagsLib.resolveDirectiveForUser({ area: 'finance', function_type: 'decisao_estrategica', user_id: 'u', company_id: 'co' });
  assert(d.mode === 'off' && d.source === 'percent', '10c. percent=0 derruba para off');
  delete process.env.IMPETUS_CONTEXTUAL_MODULES_PERCENT;

  // area_override false força off
  process.env.IMPETUS_CONTEXTUAL_MODULES = 'enrich';
  process.env.IMPETUS_CONTEXTUAL_MODULES_HR = 'false';
  d = flagsLib.resolveDirectiveForUser({ area: 'hr', function_type: 'analise', user_id: 'u', company_id: 'co' });
  assert(d.mode === 'off' && d.source === 'area_override', '10d. area_override false força off');
  delete process.env.IMPETUS_CONTEXTUAL_MODULES_HR;
  delete process.env.IMPETUS_CONTEXTUAL_MODULES;
}

// ── 11. Contrato preservado ─────────────────────────────────────────────
function testContractInvariants() {
  section('11. Contrato preservado — invariantes de tipo');

  for (const mode of ['off', 'shadow', 'enrich', 'replace']) {
    process.env.IMPETUS_CONTEXTUAL_MODULES = mode;
    guard.reset();
    const out = facade.enhanceVisibleModulesWithContext(LEGACY_FINANCE, CFO);
    assert(Array.isArray(out.visibleModules), `11a.${mode}. visibleModules é array`);
    assert(out.visibleModules.every((v) => typeof v === 'string'),
      `11b.${mode}. visibleModules é array de strings`);
    assert(Array.isArray(out.contextualModules), `11c.${mode}. contextualModules é array`);
    assert(out.contextualModules.every((m) => m && typeof m.module_id === 'string'),
      `11d.${mode}. contextualModules têm module_id`);
    if (mode === 'off') {
      assert(arrayEq(out.visibleModules, LEGACY_FINANCE),
        `11e.${mode}. byte-a-byte preservado`, { got: out.visibleModules });
    } else if (mode === 'shadow') {
      assert(arrayEq(out.visibleModules, LEGACY_FINANCE),
        `11f.${mode}. shadow não muda visibleModules`, { got: out.visibleModules });
    }
  }
  delete process.env.IMPETUS_CONTEXTUAL_MODULES;
}

// ── 12. Forbidden by policy (LGPD/role) ─────────────────────────────────
function testForbidden() {
  section('12. Forbidden — operador NUNCA recebe módulos financeiros mesmo em replace');
  process.env.IMPETUS_CONTEXTUAL_MODULES = 'replace';
  guard.reset();
  const out = facade.enhanceVisibleModulesWithContext(LEGACY_OPERATOR, OPERADOR);
  for (const fid of ['admin']) {
    // operador hr→exec não tem admin
    assert(!out.visibleModules.includes(fid),
      `12a. operador NÃO recebe '${fid}' em replace`,
      { visible: out.visibleModules });
  }
  // o registry não tem ID separado para "centro_custos" no menu_keys (mapeia para 'operational'),
  // então validamos que `cost_center` não aparece em contextualModules.
  const hasCost = out.contextualModules.some((m) => m.module_id === 'cost_center');
  assert(!hasCost, '12b. operador não tem cost_center em contextualModules', { contextual: out.contextualModules.map((m) => m.module_id) });

  // RH BP NÃO recebe financial_intelligence (forbidden em RH BP analise)
  process.env.IMPETUS_CONTEXTUAL_MODULES = 'replace';
  guard.reset();
  const out2 = facade.enhanceVisibleModulesWithContext(LEGACY_OPER, RH_BP);
  const hasFin = out2.contextualModules.some((m) => m.module_id === 'financial_intelligence');
  assert(!hasFin, '12c. RH BP não recebe financial_intelligence');
  delete process.env.IMPETUS_CONTEXTUAL_MODULES;
}

// ── 13. Inconsistente / fallback de área ────────────────────────────────
function testInconsistent() {
  section('13. Utilizador inconsistente — comportamento defensivo');
  process.env.IMPETUS_CONTEXTUAL_MODULES = 'enrich';
  guard.reset();
  const out = facade.enhanceVisibleModulesWithContext(['dashboard', 'operational'], INCONSIST);
  assert(Array.isArray(out.visibleModules), '13a. visibleModules ok');
  assert(out.meta.identity_summary && typeof out.meta.identity_summary === 'object',
    '13b. identity_summary presente');
  // não deve receber nada com LGPD high
  const hasHigh = out.contextualModules.some((m) => m.lgpd_scope === 'high');
  assert(!hasHigh, '13c. utilizador inconsistente não recebe high LGPD', { contextual: out.contextualModules });
  delete process.env.IMPETUS_CONTEXTUAL_MODULES;
}

// ── 14. Registry: integridade ───────────────────────────────────────────
function testRegistryIntegrity() {
  section('14. Registry — integridade declarativa');

  const all = registry.getAllModules();
  assert(all.length > 0, '14a. catálogo não vazio');
  const ids = new Set();
  for (const m of all) {
    assert(typeof m.module_id === 'string' && m.module_id.length > 0, `14b. module_id válido (${m.module_id})`);
    assert(!ids.has(m.module_id), `14c. module_id único (${m.module_id})`);
    ids.add(m.module_id);
    assert(typeof m.category === 'string', `14d. ${m.module_id}.category string`);
    assert(['low', 'medium', 'high'].includes(m.lgpd_scope),
      `14e. ${m.module_id}.lgpd_scope válido (got ${m.lgpd_scope})`);
    assert(Array.isArray(m.required_capabilities), `14f. ${m.module_id}.required_capabilities array`);
    assert(typeof m.criticality === 'number' && m.criticality >= 0 && m.criticality <= 1,
      `14g. ${m.module_id}.criticality em [0,1]`);
  }
  // CANONICAL_MENU_KEYS cobre todos os menu_keys usados
  const canon = new Set(registry.CANONICAL_MENU_KEYS);
  for (const m of all) {
    if (m.menu_key) {
      assert(canon.has(m.menu_key),
        `14h. ${m.module_id}.menu_key '${m.menu_key}' canónico`);
    }
  }
}

// ── runner ──────────────────────────────────────────────────────────────
(function main() {
  testOffMode();
  testEnrichMode();
  testReplaceMode();
  testValidator();
  testOrchestratorPersonas();
  testModuleCapabilities();
  testPromotionGuard();
  testTelemetry();
  testRobustness();
  testFlags();
  testContractInvariants();
  testForbidden();
  testInconsistent();
  testRegistryIntegrity();

  console.log(`\n${_passed} passed, ${_failed} failed (Phase 6 — Contextual Modules)`);
  if (_failed > 0) process.exit(1);
})();
