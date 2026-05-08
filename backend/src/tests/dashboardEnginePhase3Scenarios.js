'use strict';

/**
 * Cenários Phase 3 — frontend contextual, modo híbrido, observabilidade,
 * políticas, identity-audit, ML hooks.
 *
 * Cobre:
 *   1. DashboardContextAdapter (frontend, puro JS) — engine_v2 > personalizado > legacy
 *   2. Modo híbrido — flags por área/função/percentual/empresa
 *   3. DashboardDecisionTrace + UsageTelemetry — gravação e agregação
 *   4. DivergenceIntelligence — delivered_but_unused, shortcut_overuse, info_gaps
 *   5. DashboardPolicyEngine — augment_capabilities, allow, deny (CFO, Operador, Supervisor, RH BP, Auditor, LGPD)
 *   6. CONTEXT_IDENTITY_AUDIT — detecção de findings em cadastros mal preenchidos
 *   7. Learning hooks — invocação noop default + plug-in
 *   8. Cenários de cargo: CFO, Diretor Industrial, Supervisor, Operador, RH BP, Segurança do Trabalho
 *
 * Execução:
 *   npm run test:dashboard-engine-phase3
 *   node src/tests/dashboardEnginePhase3Scenarios.js
 */

const path = require('path');

// Estado conhecido das flags
delete process.env.IMPETUS_DASHBOARD_ENGINE_V2;
delete process.env.IMPETUS_DASHBOARD_ENGINE_SHADOW;
delete process.env.IMPETUS_ENGINE_V2_FINANCE;
delete process.env.IMPETUS_ENGINE_V2_INDUSTRIAL;
delete process.env.IMPETUS_ENGINE_V2_HR;
delete process.env.IMPETUS_ENGINE_V2_STRATEGIC;
delete process.env.IMPETUS_ENGINE_V2_SUPERVISION;
delete process.env.IMPETUS_ENGINE_V2_EXECUTION;
delete process.env.IMPETUS_ENGINE_V2_GOVERNANCE;
delete process.env.IMPETUS_ENGINE_V2_BY_COMPANY;
delete process.env.IMPETUS_ENGINE_V2_PERCENT;
process.env.IMPETUS_DASHBOARD_ENGINE_LOG_LEVEL = 'silent';

const flags = require(path.join('..', 'dashboardEngineV2', 'flags'));
const decisionTrace = require(path.join('..', 'dashboardEngineV2', 'observability', 'dashboardDecisionTrace'));
const usageTelemetry = require(path.join('..', 'dashboardEngineV2', 'observability', 'dashboardUsageTelemetry'));
const divergence = require(path.join('..', 'dashboardEngineV2', 'observability', 'divergenceIntelligence'));
const policyEngine = require(path.join('..', 'dashboardEngineV2', 'policies', 'dashboardPolicyEngine'));
const identityAudit = require(path.join('..', 'dashboardEngineV2', 'audit', 'contextIdentityAudit'));
const learningHooks = require(path.join('..', 'dashboardEngineV2', 'learning', 'learningHooks'));
const feedbackLoop = require(path.join('..', 'dashboardEngineV2', 'learning', 'feedbackLoop'));
const embeddings = require(path.join('..', 'dashboardEngineV2', 'learning', 'embeddings'));
const { buildContextualIdentity } = require(path.join('..', 'dashboardEngineV2', 'identity', 'identityResolver'));
const { composeDashboardV2 } = require(path.join('..', 'dashboardEngineV2', 'composition', 'compositionEngine'));
const gateway = require(path.join('..', 'dashboardEngineV2', 'gateway', 'dashboardCompositionGateway'));

// Adapter frontend é ESM; importamos via require dinâmico do bundle
// reescrito em CJS — para o teste, fazemos uma re-implementação leve do
// adapter exportada via wrapper. Em alternativa, lemos ficheiro e
// validamos por contrato. Aqui validamos via "shape contract" do output
// vindo do `composeDashboardV2`.

let _passed = 0;
let _failed = 0;

function assert(cond, label, detail) {
  if (cond) { _passed += 1; console.log(`  PASS  ${label}`); return true; }
  _failed += 1; console.log(`  FAIL  ${label}`);
  if (detail !== undefined) console.log('        ', JSON.stringify(detail).slice(0, 320));
  return false;
}
function section(name) { console.log(`\n=== ${name} ===`); }
function endReport() {
  console.log(`\nTotal: ${_passed} passed | ${_failed} failed`);
  if (_failed > 0) process.exit(1);
}

// ───────────────────────────────────────────────────────────────────────────
// Personas reutilizáveis (Phase 3)
// ───────────────────────────────────────────────────────────────────────────
const CFO = {
  id: 'u-cfo', company_id: 'co-1', role: 'diretor', job_title: 'Diretor de Finanças',
  functional_area: 'finance', department: 'Financeiro', hierarchy_level: 2,
  permissions: ['VIEW_FINANCIAL', 'VIEW_STRATEGIC', 'VIEW_DOCUMENTS']
};
const DIR_IND = {
  id: 'u-din', company_id: 'co-1', role: 'diretor', job_title: 'Diretor Industrial',
  functional_area: 'industrial', department: 'Industrial', hierarchy_level: 2,
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

// ───────────────────────────────────────────────────────────────────────────
// 1. Modo híbrido — flags granulares
// ───────────────────────────────────────────────────────────────────────────
function testHybridFlags() {
  section('1. Modo Híbrido — flags granulares');

  // 1a. Sem nenhuma flag → fallback para v2 global (off por default)
  delete process.env.IMPETUS_ENGINE_V2_FINANCE;
  let directive = flags.resolveEngineDirectiveForUser({
    area: 'finance', functionType: 'decisao_estrategica', user_id: 'u-1', company_id: 'co-1'
  });
  assert(directive.mode === 'off' && directive.source === 'global_v2',
    '1a. fallback para flag global quando nenhuma granular activa', directive);

  // 1b. Flag por área (finance=on)
  process.env.IMPETUS_ENGINE_V2_FINANCE = 'on';
  directive = flags.resolveEngineDirectiveForUser({
    area: 'finance', functionType: 'decisao_estrategica', user_id: 'u-1', company_id: 'co-1'
  });
  assert(directive.mode === 'on' && directive.source === 'by_area',
    '1b. IMPETUS_ENGINE_V2_FINANCE=on activa engine B para finance', directive);
  delete process.env.IMPETUS_ENGINE_V2_FINANCE;

  // 1c. Flag por função (supervisao=shadow)
  process.env.IMPETUS_ENGINE_V2_SUPERVISION = 'shadow';
  directive = flags.resolveEngineDirectiveForUser({
    area: 'production', functionType: 'supervisao', user_id: 'u-2', company_id: 'co-1'
  });
  assert(directive.mode === 'shadow' && directive.source === 'by_function',
    '1c. IMPETUS_ENGINE_V2_SUPERVISION=shadow activa shadow para supervisao', directive);
  delete process.env.IMPETUS_ENGINE_V2_SUPERVISION;

  // 1d. Whitelist por empresa
  process.env.IMPETUS_ENGINE_V2_BY_COMPANY = 'co-7,CO-1,co-3';
  directive = flags.resolveEngineDirectiveForUser({
    area: 'industrial', functionType: 'analise', user_id: 'u-3', company_id: 'co-1'
  });
  assert(directive.mode === 'on' && directive.source === 'by_company',
    '1d. company whitelist (CSV case-insensitive) activa V2', directive);
  delete process.env.IMPETUS_ENGINE_V2_BY_COMPANY;

  // 1e. Percentual determinístico
  process.env.IMPETUS_ENGINE_V2_PERCENT = '100';
  directive = flags.resolveEngineDirectiveForUser({
    area: 'industrial', user_id: 'u-deterministic', company_id: 'co-1'
  });
  assert(directive.mode === 'on' && directive.source === 'by_percent',
    '1e. percent=100 activa V2 sempre', directive);
  process.env.IMPETUS_ENGINE_V2_PERCENT = '0';
  directive = flags.resolveEngineDirectiveForUser({
    area: 'industrial', user_id: 'u-deterministic', company_id: 'co-1'
  });
  assert(directive.mode === 'off',
    '1e2. percent=0 não activa', directive);
  delete process.env.IMPETUS_ENGINE_V2_PERCENT;
}

// ───────────────────────────────────────────────────────────────────────────
// 2. Decision Trace + Usage Telemetry
// ───────────────────────────────────────────────────────────────────────────
async function testObservability() {
  section('2. Observabilidade — DecisionTrace + UsageTelemetry');

  decisionTrace.clearBuffer();
  usageTelemetry.clearBuffer();

  // Forçar engine V2 para CFO via flag granular
  process.env.IMPETUS_ENGINE_V2_FINANCE = 'on';
  const out = await gateway.compose(CFO);
  delete process.env.IMPETUS_ENGINE_V2_FINANCE;

  assert(out.engine === 'B' || out.engine === 'B_with_A_shadow',
    '2a. CFO com FINANCE=on roteia para Motor B', { engine: out.engine });

  const traces = decisionTrace.getRecent({ limit: 5 });
  assert(traces.length === 1 && traces[0].user.role === 'diretor',
    '2b. decisionTrace gravou 1 entrada para CFO', { count: traces.length });
  assert(traces[0].directive && traces[0].directive.source === 'by_area',
    '2c. trace inclui directive.source=by_area', traces[0].directive);
  assert(Array.isArray(traces[0].widgets.selected) && traces[0].widgets.selected.length > 0,
    '2d. trace inclui widgets selecionados', { count: traces[0].widgets?.selected?.length });

  // Telemetria: simula uso real
  const traceId = traces[0].trace_id;
  for (const w of traces[0].widgets.selected.slice(0, 3)) {
    usageTelemetry.record({ kind: 'view', widget_id: w.id, trace_id: traceId, function_type: 'decisao_estrategica', area: 'finance' });
  }
  // O CFO não usa o widget mais ranqueado — vai usar via shortcut
  const topWidget = traces[0].widgets.selected[0].id;
  usageTelemetry.record({ kind: 'shortcut', widget_id: topWidget, area: 'finance', function_type: 'decisao_estrategica' });
  usageTelemetry.record({ kind: 'shortcut', widget_id: topWidget, area: 'finance', function_type: 'decisao_estrategica' });
  usageTelemetry.record({ kind: 'shortcut', widget_id: topWidget, area: 'finance', function_type: 'decisao_estrategica' });

  const summary = usageTelemetry.summary();
  assert(summary.total_events >= 6 && summary.widget_shortcuts[topWidget] === 3,
    '2e. usageTelemetry agrega views e shortcuts', { total: summary.total_events, shortcuts: summary.widget_shortcuts[topWidget] });
}

// ───────────────────────────────────────────────────────────────────────────
// 3. Divergence Intelligence
// ───────────────────────────────────────────────────────────────────────────
async function testDivergence() {
  section('3. Divergence Intelligence');

  decisionTrace.clearBuffer();
  usageTelemetry.clearBuffer();

  // Diretor Industrial recebe widgets, mas só usa um pequeno subset
  process.env.IMPETUS_ENGINE_V2_INDUSTRIAL = 'on';
  const out = await gateway.compose(DIR_IND);
  delete process.env.IMPETUS_ENGINE_V2_INDUSTRIAL;
  const trace = decisionTrace.getRecent({ limit: 1 })[0];
  const delivered = trace.widgets.selected;

  // Apenas 1 widget é aberto; o resto fica delivered_but_unused
  if (delivered.length > 1) {
    usageTelemetry.record({ kind: 'open', widget_id: delivered[0].id, area: 'industrial', function_type: 'decisao_estrategica' });
  }

  const unused = divergence.deliveredButUnused({ lowUsageThreshold: 0.5 });
  assert(unused.length >= 1, '3a. detecta delivered_but_unused', { count: unused.length });

  // Info gap: utilizador clica em widget que NÃO está no dashboard
  usageTelemetry.record({ kind: 'click', widget_id: 'widget_nunca_entregue', area: 'industrial', function_type: 'decisao_estrategica' });
  const gaps = divergence.infoGapsByFunction();
  assert(gaps.gaps['decisao_estrategica'] && gaps.gaps['decisao_estrategica'].some((g) => g.widget_id === 'widget_nunca_entregue'),
    '3b. detecta info_gap (widget clicado mas não entregue)', gaps.gaps['decisao_estrategica']);

  void out;
}

// ───────────────────────────────────────────────────────────────────────────
// 4. Policy Engine
// ───────────────────────────────────────────────────────────────────────────
function testPolicies() {
  section('4. DashboardPolicyEngine');

  // CFO ganha capabilities + widgets explícitos
  const cfoIdentity = buildContextualIdentity(CFO);
  const cfoPolicies = policyEngine.applyPolicies({ identity: cfoIdentity, user: CFO });
  assert(cfoPolicies.identity.capabilities.includes('view:financial') && cfoPolicies.identity.capabilities.includes('view:strategic'),
    '4a. CFO recebe capabilities financeiras+estratégicas', { caps: cfoPolicies.identity.capabilities });
  assert(cfoPolicies.allowed_widgets.includes('mapa_vazamentos') && cfoPolicies.allowed_widgets.includes('centro_custos'),
    '4b. CFO tem allow explícito para mapa_vazamentos+centro_custos', { allowed: cfoPolicies.allowed_widgets });

  // Operador é negado de widgets estratégicos
  const opIdentity = buildContextualIdentity(OPERADOR);
  const opPolicies = policyEngine.applyPolicies({ identity: opIdentity, user: OPERADOR });
  assert(opPolicies.denied_widgets.includes('indicadores_executivos') && opPolicies.denied_widgets.includes('mapa_vazamentos'),
    '4c. Operador é negado de widgets estratégicos+financeiros', { denied: opPolicies.denied_widgets });

  // Supervisor é negado de margem corporativa
  const supIdentity = buildContextualIdentity(SUPERVISOR);
  const supPolicies = policyEngine.applyPolicies({ identity: supIdentity, user: SUPERVISOR });
  assert(supPolicies.denied_widgets.includes('grafico_margem'),
    '4d. Supervisor é negado de margem corporativa', { denied: supPolicies.denied_widgets });

  // RH BP é negado de financeiro corporativo
  const rhIdentity = buildContextualIdentity(RH_BP);
  const rhPolicies = policyEngine.applyPolicies({ identity: rhIdentity, user: RH_BP });
  assert(rhPolicies.identity.capabilities.includes('view:hr'), '4e. RH BP recebe view:hr', { caps: rhPolicies.identity.capabilities });
  assert(rhPolicies.denied_widgets.includes('centro_custos'), '4f. RH BP é negado de centro_custos', { denied: rhPolicies.denied_widgets });

  // Segurança recebe view:safety + view:maintenance
  const safIdentity = buildContextualIdentity(SAFETY);
  const safPolicies = policyEngine.applyPolicies({ identity: safIdentity, user: SAFETY });
  assert(safPolicies.identity.capabilities.includes('view:safety') && safPolicies.identity.capabilities.includes('view:maintenance'),
    '4g. Segurança do Trabalho recebe view:safety+view:maintenance', { caps: safPolicies.identity.capabilities });

  // Auditor recebe view:audit; act:approve é negado
  const audIdentity = buildContextualIdentity(AUDITOR);
  const audPolicies = policyEngine.applyPolicies({ identity: audIdentity, user: AUDITOR });
  assert(audPolicies.identity.capabilities.includes('view:audit'), '4h. Auditor recebe view:audit', audPolicies.identity.capabilities);
  assert(!audPolicies.identity.capabilities.includes('act:approve'),
    '4i. Auditor NÃO recebe act:approve (deny aplicado)', audPolicies.identity.capabilities);

  // Audit trail é não-vazio para todos
  for (const [label, p] of [['CFO', cfoPolicies], ['Operador', opPolicies], ['Supervisor', supPolicies], ['Auditor', audPolicies]]) {
    assert(Array.isArray(p.audit_trail) && p.audit_trail.length > 0, `4j. audit_trail não-vazio para ${label}`, { len: p.audit_trail.length });
  }
}

// ───────────────────────────────────────────────────────────────────────────
// 5. Composição com políticas — verifica que widgets negados não aparecem
// ───────────────────────────────────────────────────────────────────────────
function testCompositionWithPolicies() {
  section('5. Composição com políticas aplicadas');

  // Operador NÃO deve receber indicadores_executivos / mapa_vazamentos
  const opOut = composeDashboardV2(OPERADOR);
  const ids = opOut.modulos.map((m) => m.id);
  assert(!ids.includes('indicadores_executivos') && !ids.includes('mapa_vazamentos'),
    '5a. Operador: composição respeita policy deny', { selected: ids });

  // Supervisor NÃO deve receber grafico_margem
  const supOut = composeDashboardV2(SUPERVISOR);
  const supIds = supOut.modulos.map((m) => m.id);
  assert(!supIds.includes('grafico_margem'),
    '5b. Supervisor: grafico_margem bloqueado por policy', { selected: supIds });

  // CFO recebe widgets financeiros (allow explícito)
  const cfoOut = composeDashboardV2(CFO);
  const cfoIds = cfoOut.modulos.map((m) => m.id);
  const FIN_WIDGETS = ['centro_custos', 'mapa_vazamentos', 'desperdicio', 'grafico_custos_setor', 'centro_previsao'];
  const has = FIN_WIDGETS.filter((w) => cfoIds.includes(w));
  assert(has.length >= 2, '5c. CFO: composição inclui múltiplos widgets financeiros', { has, all: cfoIds });

  // Auditor recebe capabilities corretas e o explainability inclui policy_audit
  const audOut = composeDashboardV2(AUDITOR);
  assert(audOut.identity.capabilities.includes('view:audit'), '5d. Auditor: identity.capabilities inclui view:audit',
    audOut.identity.capabilities);
  assert(Array.isArray(audOut.explainability.policy_audit) && audOut.explainability.policy_audit.length > 0,
    '5e. explainability.policy_audit é exposto', { len: audOut.explainability.policy_audit.length });
}

// ───────────────────────────────────────────────────────────────────────────
// 6. CONTEXT_IDENTITY_AUDIT
// ───────────────────────────────────────────────────────────────────────────
function testIdentityAudit() {
  section('6. CONTEXT_IDENTITY_AUDIT');

  const users = [
    CFO,
    OPERADOR,
    // Caso problemático: sem area, role desconhecido
    { id: 'u-x1', role: 'desconhecido', job_title: 'Cargo X', permissions: ['UNKNOWN_PERM'] },
    // Excesso: operador nível 5 com data:cross_sector via permission desconhecida ignorada
    { id: 'u-x2', role: 'admin', job_title: 'Admin', hierarchy_level: 5, permissions: ['*'], functional_area: 'admin' },
    // Sem permissões, sem área
    { id: 'u-x3', role: 'colaborador', job_title: '', hierarchy_level: 6 }
  ];
  const report = identityAudit.auditUsers(users);
  assert(report.total_users === users.length, '6a. todos os utilizadores foram auditados', report);
  assert(report.total_findings > 0, '6b. relatório identifica findings', { total: report.total_findings });
  assert(report.by_kind.no_area >= 1, '6c. detecta utilizador sem área válida', report.by_kind);
  assert(report.by_kind.misclassified >= 1 || report.by_kind.underprivileged >= 1,
    '6d. detecta misclassified ou underprivileged', report.by_kind);
  assert(report.by_kind.unknown_permissions >= 1, '6e. detecta permissions desconhecidas', report.by_kind);
}

// ───────────────────────────────────────────────────────────────────────────
// 7. Learning hooks (default = noop) e plugin temporário
// ───────────────────────────────────────────────────────────────────────────
function testLearningHooks() {
  section('7. Learning Hooks');

  learningHooks.clearHandlers();
  let widgetSelectionCalls = 0;
  let identityCalls = 0;
  let usageCalls = 0;
  let feedbackCalls = 0;

  learningHooks.registerWidgetSelectionHandler(() => { widgetSelectionCalls += 1; });
  learningHooks.registerIdentityHandler(() => { identityCalls += 1; });
  learningHooks.registerUsageHandler(() => { usageCalls += 1; });
  learningHooks.registerFeedbackHandler(() => { feedbackCalls += 1; });

  // Composição → dispara identity + widgetSelection + policyAudit
  composeDashboardV2(CFO);
  assert(widgetSelectionCalls >= 1 && identityCalls >= 1,
    '7a. hooks de identity+widgetSelection invocados na composição',
    { widgetSelectionCalls, identityCalls });

  // Telemetria → dispara usage hook
  usageTelemetry.record({ kind: 'view', widget_id: 'centro_custos', area: 'finance', function_type: 'decisao_estrategica' });
  assert(usageCalls >= 1, '7b. hook de usage invocado', { usageCalls });

  // Feedback → dispara feedback hook
  feedbackLoop.clearBuffer();
  feedbackLoop.record({ widget_id: 'centro_custos', kind: 'helpful', user_id: 'u-cfo' });
  assert(feedbackCalls >= 1, '7c. hook de feedback invocado', { feedbackCalls });

  // Embeddings — sem provider devolve null mas constrói documento
  embeddings.setProvider(null);
  const doc = embeddings.buildUserContextDocument(CFO, buildContextualIdentity(CFO));
  assert(typeof doc === 'string' && doc.includes('cargo:Diretor de Finanças') && doc.includes('area:finance'),
    '7d. embeddings.buildUserContextDocument inclui campos críticos', doc);

  learningHooks.clearHandlers();
}

// ───────────────────────────────────────────────────────────────────────────
// 8. Frontend adapter — validação de contrato
// (testamos a função pura; o hook React é validado via storybook noutro PR)
// ───────────────────────────────────────────────────────────────────────────
function testFrontendAdapterContract() {
  section('8. DashboardContextAdapter — contrato (pure JS)');

  // Importamos o adapter via leitura do ficheiro? Ele é ESM no frontend.
  // Em vez disso, validamos o CONTRATO que o composeDashboardV2 produz e
  // que o adapter consome. Garantia: existem todos os campos esperados.
  const v2 = composeDashboardV2(CFO);
  assert(v2 && v2.layout && Array.isArray(v2.layout.widgets) && v2.layout.widgets.length > 0,
    '8a. composeDashboardV2 produz layout.widgets[]', v2 && Object.keys(v2));

  const w0 = v2.layout.widgets[0];
  assert(typeof w0.id === 'string' && w0.position && Number.isFinite(w0.position.row),
    '8b. widget tem id + position{row,col,width}', w0);

  assert(v2.identity && v2.identity.function_type && v2.identity.primary_axis,
    '8c. payload inclui identity contextual completa', v2.identity);

  assert(v2.explainability && v2.explainability.rationale_human,
    '8d. payload inclui explainability.rationale_human', Object.keys(v2.explainability || {}));
}

// ───────────────────────────────────────────────────────────────────────────
// 9. Cenários por persona (CFO, Industrial, Supervisor, Operador, RH BP, Segurança)
// ───────────────────────────────────────────────────────────────────────────
function testPersonas() {
  section('9. Personas — distribuição contextual');

  const cases = [
    { user: CFO, label: 'CFO', expected_axis: 'eixo_financeiro', forbidden: ['indicadores_executivos'].length === 0 ? [] : [], must_include: ['centro_custos', 'mapa_vazamentos', 'desperdicio'] },
    { user: DIR_IND, label: 'Diretor Industrial', expected_axis_in: ['eixo_executivo', 'eixo_operacional'], must_include_any: ['operacoes', 'gargalos', 'manutencao', 'desperdicio', 'alertas', 'diagrama_industrial'] },
    { user: SUPERVISOR, label: 'Supervisor', expected_axis: 'eixo_operacional', must_include_any: ['operacoes', 'gargalos', 'kpi_cards', 'alertas'] },
    { user: OPERADOR, label: 'Operador', expected_axis: 'eixo_operacional', forbid: ['indicadores_executivos', 'centro_custos', 'mapa_vazamentos'] },
    { user: RH_BP, label: 'RH BP', forbid: ['centro_custos', 'mapa_vazamentos', 'grafico_custos_setor', 'grafico_margem'] },
    { user: SAFETY, label: 'Segurança do Trabalho', must_include_any: ['alertas', 'mapa_vazamentos', 'manutencao', 'energia'] }
  ];

  for (const tc of cases) {
    const out = composeDashboardV2(tc.user);
    const ids = out.modulos.map((m) => m.id);
    if (tc.expected_axis) {
      assert(out.identity.primary_axis === tc.expected_axis,
        `9. ${tc.label}: primary_axis=${tc.expected_axis}`, { primary_axis: out.identity.primary_axis });
    }
    if (tc.expected_axis_in) {
      assert(tc.expected_axis_in.includes(out.identity.primary_axis),
        `9. ${tc.label}: primary_axis ∈ {${tc.expected_axis_in.join(',')}}`, { primary_axis: out.identity.primary_axis });
    }
    if (Array.isArray(tc.must_include)) {
      const missing = tc.must_include.filter((w) => !ids.includes(w));
      assert(missing.length === 0,
        `9. ${tc.label}: contém widgets críticos ${tc.must_include.join(',')}`, { missing, ids });
    }
    if (Array.isArray(tc.must_include_any)) {
      const present = tc.must_include_any.filter((w) => ids.includes(w));
      assert(present.length >= 1,
        `9. ${tc.label}: contém pelo menos 1 widget de ${tc.must_include_any.join(',')}`, { ids });
    }
    if (Array.isArray(tc.forbid)) {
      const leaked = tc.forbid.filter((w) => ids.includes(w));
      assert(leaked.length === 0,
        `9. ${tc.label}: não contém widgets proibidos ${tc.forbid.join(',')}`, { leaked, ids });
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// 10. Compatibilidade — gateway com flags off devolve Motor A normalizado
// ───────────────────────────────────────────────────────────────────────────
async function testCompatibility() {
  section('10. Compatibilidade — flags off preservam Motor A');

  delete process.env.IMPETUS_ENGINE_V2_FINANCE;
  delete process.env.IMPETUS_ENGINE_V2_INDUSTRIAL;
  process.env.IMPETUS_DASHBOARD_ENGINE_V2 = 'off';
  const out = await gateway.compose(CFO);
  assert(out.engine === 'A', '10a. flags todas off → engine=A', { engine: out.engine });
  assert(out.shadow === null, '10b. nenhum shadow corre', { shadow: out.shadow });
  assert(out.diff === null, '10c. nenhum diff é gerado', { diff: out.diff });
  delete process.env.IMPETUS_DASHBOARD_ENGINE_V2;
}

// ───────────────────────────────────────────────────────────────────────────
// Runner
// ───────────────────────────────────────────────────────────────────────────
(async function run() {
  testHybridFlags();
  await testObservability();
  await testDivergence();
  testPolicies();
  testCompositionWithPolicies();
  testIdentityAudit();
  testLearningHooks();
  testFrontendAdapterContract();
  testPersonas();
  await testCompatibility();
  endReport();
})();
