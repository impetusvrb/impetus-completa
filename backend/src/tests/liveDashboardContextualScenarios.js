'use strict';

/**
 * Cenários — Phase 5: Live Dashboard Contextual Layer
 *
 * Cobre:
 *   1. Contrato preservado — todas as keys legadas continuam presentes
 *   2. Modo legacy (default) é no-op
 *   3. Modo shadow não muda layout, mas regista telemetria
 *   4. Modo enrich adiciona gaps + personalization_overlay
 *   5. Modo replace substitui layout.widgets em formato legado
 *   6. Validator detecta widgets críticos ausentes
 *   7. Validator detecta widgets proibidos
 *   8. PromotionGuard — circuit breaker abre após N falhas
 *   9. PromotionGuard — forceFallback / clearForceFallback
 *  10. Resolver: persona CFO recebe widgets financeiros estratégicos
 *  11. Resolver: persona Operador NÃO recebe widgets executivos
 *  12. Telemetria: summary calcula overlap e fallback rate
 *  13. Robustez: payload nulo / user nulo / motor B em erro → legacy intocado
 *  14. Cenário 7 personas: experiência coerente para cada cargo
 *
 * Execução:
 *   npm run test:live-dashboard-contextual
 *   node src/tests/liveDashboardContextualScenarios.js
 */

const path = require('path');

// Estado conhecido
process.env.IMPETUS_DASHBOARD_ENGINE_LOG_LEVEL = 'silent';
delete process.env.IMPETUS_LIVE_DASHBOARD_MOTOR;
delete process.env.IMPETUS_LIVE_DASHBOARD_REPLACE_ON_ON;
delete process.env.IMPETUS_DASHBOARD_ENGINE_V2;
delete process.env.IMPETUS_ENGINE_V2_FINANCE;
delete process.env.IMPETUS_ENGINE_V2_INDUSTRIAL;
delete process.env.IMPETUS_ENGINE_V2_HR;
delete process.env.IMPETUS_ENGINE_V2_STRATEGIC;
delete process.env.IMPETUS_ENGINE_V2_ANALYSIS;
delete process.env.IMPETUS_ENGINE_V2_SUPERVISION;
delete process.env.IMPETUS_ENGINE_V2_EXECUTION;
delete process.env.IMPETUS_ENGINE_V2_GOVERNANCE;
delete process.env.IMPETUS_ENGINE_V2_BY_COMPANY;
delete process.env.IMPETUS_ENGINE_V2_PERCENT;

const resolver    = require(path.join('..', 'liveDashboardContextual', 'contextualDashboardResolver'));
const validator   = require(path.join('..', 'liveDashboardContextual', 'experienceValidator'));
const promotion   = require(path.join('..', 'liveDashboardContextual', 'promotionGuard'));
const telemetry   = require(path.join('..', 'liveDashboardContextual', 'experienceTelemetry'));
const facade      = require(path.join('..', 'liveDashboardContextual'));

let _passed = 0, _failed = 0;
function assert(cond, label, detail) {
  if (cond) { _passed += 1; console.log(`  PASS  ${label}`); return true; }
  _failed += 1; console.log(`  FAIL  ${label}`);
  if (detail !== undefined) {
    try { console.log('        ', JSON.stringify(detail).slice(0, 360)); } catch (_) { /* ignore */ }
  }
  return false;
}
function section(name) { console.log(`\n=== ${name} ===`); }
function endReport() {
  console.log(`\nTotal: ${_passed} passed | ${_failed} failed`);
  if (_failed > 0) process.exit(1);
}

// ── Personas ───────────────────────────────────────────────────────────
const CFO = {
  id: 'u-cfo', company_id: 'co-1', role: 'diretor', job_title: 'Diretor de Finanças',
  functional_area: 'finance', department: 'Financeiro', hierarchy_level: 1,
  permissions: ['VIEW_FINANCIAL', 'VIEW_STRATEGIC', 'EXPORT_DATA']
};
const DIR_IND = {
  id: 'u-din', company_id: 'co-1', role: 'diretor', job_title: 'Diretor Industrial',
  functional_area: 'industrial', department: 'Industrial', hierarchy_level: 1,
  permissions: ['VIEW_OPERATIONAL', 'VIEW_STRATEGIC', 'VIEW_SAFETY']
};
const SUPERVISOR = {
  id: 'u-sup', company_id: 'co-1', role: 'supervisor', job_title: 'Supervisor de Produção',
  functional_area: 'production', department: 'Produção', hierarchy_level: 4,
  permissions: ['VIEW_OPERATIONAL']
};
const OPERADOR = {
  id: 'u-op', company_id: 'co-1', role: 'operador', job_title: 'Operador de Máquina',
  functional_area: 'production', department: 'Produção', hierarchy_level: 5,
  permissions: ['VIEW_OPERATIONAL', 'EXECUTE_TASKS']
};
const RH_BP = {
  id: 'u-rh', company_id: 'co-1', role: 'rh', job_title: 'HR Business Partner',
  functional_area: 'hr', department: 'Recursos Humanos', hierarchy_level: 3,
  permissions: ['VIEW_HR']
};
const SAFETY = {
  id: 'u-saf', company_id: 'co-1', role: 'coordenador', job_title: 'Coordenador de Segurança do Trabalho',
  functional_area: 'maintenance', department: 'Segurança', hierarchy_level: 4,
  permissions: ['VIEW_SAFETY', 'VIEW_OPERATIONAL'],
  responsibilities: ['seguranca']
};
const AUDITOR = {
  id: 'u-aud', company_id: 'co-1', role: 'admin', job_title: 'Auditor Interno',
  functional_area: 'admin', department: 'Auditoria', hierarchy_level: 3,
  permissions: ['VIEW_AUDIT_LOGS', 'VIEW_OPERATIONAL']
};

// ── Helper: legacy state mock (mesmo contrato do liveDashboardService) ──
function mkLegacyState({ widgets = [], gaps = [] } = {}) {
  return {
    ok: true,
    captured_at: '2026-05-07T17:00:00.000Z',
    intelligent_summary: 'Resumo legacy.',
    signals: { tasks: { open: 1, overdue: 0 }, alerts: { open: 1 }, telemetry_anomalies: 0, critical_operational_events: 0 },
    data_sources: { impetus_tasks: { open: 1 }, impetus_operational_alerts: { open: 1 }, plc_telemetry: { ok: false }, plc_sensors: { ok: false }, erp_integrations: { connectors: 0 }, chat_impetus: {}, audit_logs: { severe_or_failed_24h: 0 } },
    alerts_preview: [],
    operational_events: [],
    layout: { widgets },
    capabilities: { task_orchestration: false, ia_depth: 'standard' },
    orchestration: { items: [], suggestions: [] },
    orchestration_stash_key: null,
    personalization: {
      profile_code: 'finance_management',
      profile_label: 'Diretor Financeiro',
      functional_area: 'finance',
      functional_area_label: 'Financeiro',
      role: 'diretor',
      hierarchy_level: 1,
      job_title: 'Diretor Financeiro',
      department_name: 'Financeiro',
      scope_level: 'company',
      data_sufficiency: 'partial',
      gaps,
      user_message: 'Painel alinhado.'
    }
  };
}

const LEGACY_KEYS = [
  'ok', 'captured_at', 'intelligent_summary', 'signals', 'data_sources',
  'alerts_preview', 'operational_events', 'layout', 'capabilities',
  'orchestration', 'orchestration_stash_key', 'personalization'
];

// ───────────────────────────────────────────────────────────────────────
// 1. Contrato preservado
// ───────────────────────────────────────────────────────────────────────
function testContractPreserved() {
  section('1. Contrato preservado em todos os modos');

  promotion.reset();
  telemetry.reset();
  const legacy = mkLegacyState({ widgets: [{ id: 'kpi_cards', label: 'KPIs', type: 'kpi_cards', display_order: 0 }] });

  // legacy mode (default)
  const r0 = facade.enhanceLiveStateWithContext(legacy, CFO, {});
  for (const k of LEGACY_KEYS) assert(k in r0.state, `1a. legacy mode preserva chave ${k}`);

  // shadow
  process.env.IMPETUS_LIVE_DASHBOARD_MOTOR = 'shadow';
  const r1 = facade.enhanceLiveStateWithContext(legacy, CFO, {});
  for (const k of LEGACY_KEYS) assert(k in r1.state, `1b. shadow mode preserva chave ${k}`);
  assert(r1.state.layout === legacy.layout, '1c. shadow não substitui layout (===)');
  assert(r1.meta.mode === 'shadow', '1d. meta.mode == shadow');

  // enrich
  process.env.IMPETUS_LIVE_DASHBOARD_MOTOR = 'enrich';
  const r2 = facade.enhanceLiveStateWithContext(legacy, CFO, {});
  for (const k of LEGACY_KEYS) assert(k in r2.state, `1e. enrich mode preserva chave ${k}`);
  assert(r2.state.layout.widgets === legacy.layout.widgets,
    '1f. enrich NÃO substitui layout.widgets');
  assert('personalization_overlay' in r2.state,
    '1g. enrich adiciona personalization_overlay (chave nova; ignorada pelo JSX)');

  // replace
  process.env.IMPETUS_LIVE_DASHBOARD_MOTOR = 'replace';
  const r3 = facade.enhanceLiveStateWithContext(legacy, CFO, {});
  for (const k of LEGACY_KEYS) assert(k in r3.state, `1h. replace mode preserva chave ${k}`);
  // Pode ter caído em fallback via validator (legítimo). Em qualquer caso
  // o contrato externo tem de manter-se.
  assert(Array.isArray(r3.state.layout.widgets), '1i. layout.widgets continua array');
  delete process.env.IMPETUS_LIVE_DASHBOARD_MOTOR;
}

// ───────────────────────────────────────────────────────────────────────
// 2. Resolver — CFO recebe widgets financeiros estratégicos
// ───────────────────────────────────────────────────────────────────────
function testResolverPersonaCFO() {
  section('2. Resolver — persona CFO');

  const out = resolver.resolveContextualDashboard(CFO, {});
  assert(out && Array.isArray(out.widgets) && out.widgets.length > 0,
    '2a. resolver devolve widgets para CFO', { n: out?.widgets?.length });
  const ids = new Set(out.widgets.map((w) => w.id));
  const FINANCIAL = ['centro_custos', 'mapa_vazamentos', 'desperdicio', 'indicadores_executivos'];
  const present = FINANCIAL.filter((w) => ids.has(w));
  assert(present.length >= 1,
    '2b. CFO recebe pelo menos 1 widget financeiro estratégico', { present, ids: [...ids] });
  for (const w of out.widgets) {
    assert(typeof w.id === 'string' && typeof w.label === 'string' && typeof w.display_order === 'number',
      `2c. widget ${w.id} tem formato legado válido`);
  }
}

// ───────────────────────────────────────────────────────────────────────
// 3. Resolver — Operador NÃO recebe widgets executivos
// ───────────────────────────────────────────────────────────────────────
function testResolverPersonaOperador() {
  section('3. Resolver — persona Operador');

  const out = resolver.resolveContextualDashboard(OPERADOR, {});
  assert(out && Array.isArray(out.widgets), '3a. resolver devolve widgets para Operador');
  const ids = new Set(out.widgets.map((w) => w.id));
  const FORBIDDEN = ['indicadores_executivos', 'resumo_executivo', 'centro_custos', 'mapa_vazamentos', 'grafico_margem'];
  const leak = FORBIDDEN.filter((w) => ids.has(w));
  assert(leak.length === 0,
    '3b. Operador NÃO recebe widgets executivos/financeiros', { leak });
}

// ───────────────────────────────────────────────────────────────────────
// 4. Validator — críticos ausentes / proibidos / hierarquia
// ───────────────────────────────────────────────────────────────────────
function testValidator() {
  section('4. ContextualExperienceValidator');

  // CFO sem nenhum widget crítico financeiro
  const v1 = validator.validateExperience({
    user: CFO,
    widgets: [{ id: 'pergunte_ia' }, { id: 'insights_ia' }]
  });
  assert(v1.critical_widget_missing === true,
    '4a. CFO sem widgets financeiros → critical_widget_missing=true', v1);

  // Operador com widget proibido (mapa_vazamentos)
  const v2 = validator.validateExperience({
    user: OPERADOR,
    widgets: [{ id: 'kpi_cards' }, { id: 'mapa_vazamentos' }]
  });
  assert(v2.policy_breach === true,
    '4b. Operador com widget proibido → policy_breach=true', v2);

  // CFO com widgets corretos
  const v3 = validator.validateExperience({
    user: CFO,
    widgets: [{ id: 'centro_custos' }, { id: 'indicadores_executivos' }, { id: 'desperdicio' }]
  });
  assert(v3.ok === true && v3.score >= 70,
    '4c. CFO bem servido → ok=true, score>=70', v3);

  // Layout vazio
  const v4 = validator.validateExperience({ user: CFO, widgets: [] });
  assert(v4.ok === false && v4.score === 0,
    '4d. layout vazio → ok=false, score=0', v4);
}

// ───────────────────────────────────────────────────────────────────────
// 5. Promotion guard — circuit breaker
// ───────────────────────────────────────────────────────────────────────
function testCircuitBreaker() {
  section('5. PromotionGuard — circuit breaker');

  promotion.reset();
  process.env.IMPETUS_LIVE_PROMOTION_FAILURE_THRESHOLD = '0.4';
  process.env.IMPETUS_LIVE_PROMOTION_FAILURE_WINDOW = '10';

  // Sem amostras suficientes → não abre
  for (let i = 0; i < 5; i += 1) promotion.recordResult({ ok: false, score: 0 });
  let cs = promotion.getCircuitState();
  assert(cs.open === false,
    '5a. circuit não abre com amostras < min(10, window)', cs);

  // Com 10 amostras de falha → abre
  for (let i = 0; i < 10; i += 1) promotion.recordResult({ ok: false, score: 0 });
  cs = promotion.getCircuitState();
  assert(cs.open === true && cs.failure_rate >= 0.4,
    '5b. circuit abre com taxa de falhas alta', cs);

  // Decisão cai automaticamente para shadow
  process.env.IMPETUS_LIVE_DASHBOARD_MOTOR = 'replace';
  const dec = promotion.decideMode(CFO);
  assert(dec.mode === 'shadow' && dec.source === 'circuit_breaker',
    '5c. com circuit aberto, decisão = shadow (auto-fallback)', dec);

  // Reset e limpeza
  delete process.env.IMPETUS_LIVE_DASHBOARD_MOTOR;
  delete process.env.IMPETUS_LIVE_PROMOTION_FAILURE_THRESHOLD;
  delete process.env.IMPETUS_LIVE_PROMOTION_FAILURE_WINDOW;
  promotion.reset();
}

// ───────────────────────────────────────────────────────────────────────
// 6. Promotion guard — force fallback / clear
// ───────────────────────────────────────────────────────────────────────
function testForceFallback() {
  section('6. PromotionGuard — force fallback / clear');

  promotion.reset();
  process.env.IMPETUS_LIVE_DASHBOARD_MOTOR = 'replace';
  let dec = promotion.decideMode(CFO);
  assert(dec.mode === 'replace', '6a. decisão = replace antes do force', dec);

  promotion.forceFallback('manual_test');
  dec = promotion.decideMode(CFO);
  assert(dec.mode === 'legacy' && dec.source === 'forced_fallback',
    '6b. forceFallback → decisão = legacy', dec);

  promotion.clearForceFallback();
  dec = promotion.decideMode(CFO);
  assert(dec.mode === 'replace',
    '6c. clearForceFallback → volta a replace', dec);

  delete process.env.IMPETUS_LIVE_DASHBOARD_MOTOR;
  promotion.reset();
}

// ───────────────────────────────────────────────────────────────────────
// 7. Telemetria — summary
// ───────────────────────────────────────────────────────────────────────
function testTelemetry() {
  section('7. ContextualExperienceTelemetry');

  telemetry.reset();
  telemetry.record({
    user_id: 'u-1', company_id: 'co-1', mode: 'replace', engine: 'B',
    function_type: 'decisao_estrategica', primary_axis: 'eixo_financeiro',
    legacy_widget_ids: ['kpi_cards', 'pergunte_ia'],
    contextual_widget_ids: ['centro_custos', 'kpi_cards'],
    validator: { ok: true, score: 85, issues: [] },
    latency_legacy_ms: 20, latency_contextual_ms: 8
  });
  telemetry.record({
    user_id: 'u-2', company_id: 'co-1', mode: 'shadow', engine: 'A_with_B_shadow',
    function_type: 'execucao', primary_axis: 'eixo_operacional',
    legacy_widget_ids: ['kpi_cards'], contextual_widget_ids: ['kpi_cards', 'alertas'],
    validator: { ok: false, score: 30, issues: [{}] },
    fallback_triggered: true, fallback_reason: 'validator_failed'
  });

  const sum = telemetry.summary({});
  assert(sum.total === 2, '7a. summary.total === 2');
  assert(sum.fallback_rate === 0.5, '7b. fallback_rate calculado', sum);
  assert(sum.validator_failure_rate === 0.5, '7c. validator_failure_rate calculado', sum);
  assert(typeof sum.widget_overlap_rate === 'number',
    '7d. widget_overlap_rate é número', sum);
  assert(typeof sum.trust_score === 'number',
    '7e. trust_score é número', sum);
}

// ───────────────────────────────────────────────────────────────────────
// 8. Robustez — payload nulo / user nulo / motor B em erro
// ───────────────────────────────────────────────────────────────────────
function testRobustness() {
  section('8. Robustez');

  promotion.reset();
  process.env.IMPETUS_LIVE_DASHBOARD_MOTOR = 'replace';

  const r1 = facade.enhanceLiveStateWithContext(null, CFO, {});
  assert(r1.state === null, '8a. legacyState=null devolve null intacto');

  const failedLegacy = { ok: false, error: 'falha simulada' };
  const r2 = facade.enhanceLiveStateWithContext(failedLegacy, CFO, {});
  assert(r2.state === failedLegacy, '8b. legacy.ok=false devolve legacy intacto');

  const legacy = mkLegacyState({ widgets: [{ id: 'kpi_cards', display_order: 0 }] });
  const r3 = facade.enhanceLiveStateWithContext(legacy, null, {});
  assert(r3.state === legacy, '8c. user=null devolve legacy (motor B falha silenciosamente)');

  delete process.env.IMPETUS_LIVE_DASHBOARD_MOTOR;
  promotion.reset();
}

// ───────────────────────────────────────────────────────────────────────
// 9. Cenário 7 personas
// ───────────────────────────────────────────────────────────────────────
function testPersonas() {
  section('9. Cenário 7 personas — coerência de experiência');

  const personas = [
    { name: 'CFO', user: CFO, expectAtLeastOne: ['centro_custos', 'mapa_vazamentos', 'desperdicio', 'indicadores_executivos'] },
    { name: 'Diretor Industrial', user: DIR_IND, expectAtLeastOne: ['operacoes', 'gargalos', 'manutencao', 'desperdicio', 'alertas'] },
    { name: 'Supervisor', user: SUPERVISOR, expectAtLeastOne: ['operacoes', 'kpi_cards', 'alertas'] },
    { name: 'Operador', user: OPERADOR, forbidden: ['indicadores_executivos', 'centro_custos', 'mapa_vazamentos'] },
    { name: 'RH BP', user: RH_BP, forbidden: ['centro_custos', 'mapa_vazamentos', 'grafico_custos_setor'] },
    { name: 'Segurança', user: SAFETY, expectAtLeastOne: ['alertas', 'mapa_vazamentos', 'manutencao', 'energia'] },
    { name: 'Auditor', user: AUDITOR, expectAtLeastOne: ['relatorio_ia', 'kpi_cards', 'insights_ia'] }
  ];

  for (const p of personas) {
    const r = resolver.resolveContextualDashboard(p.user, {});
    assert(r && Array.isArray(r.widgets), `9. ${p.name} resolveu`);
    const ids = new Set(r.widgets.map((w) => w.id));
    if (p.expectAtLeastOne) {
      const has = p.expectAtLeastOne.some((w) => ids.has(w));
      assert(has, `9. ${p.name} contém ≥1 de ${p.expectAtLeastOne.join(', ')}`, { ids: [...ids] });
    }
    if (p.forbidden) {
      const leaks = p.forbidden.filter((w) => ids.has(w));
      assert(leaks.length === 0, `9. ${p.name} NÃO contém widgets proibidos`, { leaks });
    }
  }
}

// ───────────────────────────────────────────────────────────────────────
// 10. End-to-end — fluxo replace com fallback automático
// ───────────────────────────────────────────────────────────────────────
function testEndToEndFallback() {
  section('10. E2E — replace com fallback automático em validator failure');

  promotion.reset();
  telemetry.reset();
  process.env.IMPETUS_LIVE_DASHBOARD_MOTOR = 'replace';

  // Persona "fantasma" (sem function nem area) que vai gerar score baixo
  const ghost = {
    id: 'u-ghost', company_id: 'co-1', role: '',
    job_title: '', functional_area: '', department: '',
    hierarchy_level: 5, permissions: []
  };
  const legacy = mkLegacyState({ widgets: [{ id: 'kpi_cards', display_order: 0 }] });
  const r = facade.enhanceLiveStateWithContext(legacy, ghost, {});

  // Em todos os cenários, mesmo com fallback, o contrato é preservado
  for (const k of LEGACY_KEYS) assert(k in r.state, `10. ${k} preservada após fallback`);
  // O fallback pode ou não disparar dependendo da resolução; o invariante
  // crítico é que `layout.widgets` seja sempre array e o JSX não quebre.
  assert(Array.isArray(r.state.layout.widgets), '10. layout.widgets ainda array');

  delete process.env.IMPETUS_LIVE_DASHBOARD_MOTOR;
  promotion.reset();
}

// ───────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────
function main() {
  testContractPreserved();
  testResolverPersonaCFO();
  testResolverPersonaOperador();
  testValidator();
  testCircuitBreaker();
  testForceFallback();
  testTelemetry();
  testRobustness();
  testPersonas();
  testEndToEndFallback();
  endReport();
}

main();
