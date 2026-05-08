'use strict';

/**
 * Cenários de validação para o Dashboard Engine V2 (migração Motor B).
 *
 * Cobre:
 *   1. Diretor de Finanças → eixo financeiro/executivo, capabilities
 *      view:financial+strategic, widgets esperados (mapa_vazamentos,
 *      centro_custos, indicadores_executivos, desperdicio).
 *   2. Diretor Industrial → eixo executivo/operacional, widgets
 *      operacionais.
 *   3. Supervisor de Produção → função supervisao, eixo operacional,
 *      granularidade horária.
 *   4. Operador → função execucao, widgets simples, max_widgets reduzido.
 *   5. Permissões / LGPD: widgets financeiros bloqueados sem
 *      view:financial.
 *   6. Diff A vs B: cenário Diretor de Finanças deve apresentar
 *      divergência crítica entre A (motor textual) e B (motor por eixos).
 *   7. Estabilidade do contrato: gateway com flag=off retorna apenas
 *      Motor A normalizado, sem ruído.
 *
 * Execução:
 *   node src/tests/dashboardEngineV2Scenarios.js
 *   npm run test:dashboard-engine-v2
 */

const path = require('path');

// Garantir flags em estado conhecido para os testes — sem mexer no .env real.
delete process.env.IMPETUS_DASHBOARD_ENGINE_V2;
delete process.env.IMPETUS_DASHBOARD_ENGINE_SHADOW;
process.env.IMPETUS_DASHBOARD_ENGINE_LOG_LEVEL = 'silent';

const { buildContextualIdentity } = require(path.join('..', 'dashboardEngineV2', 'identity', 'identityResolver'));
const { normalizeRole, FUNCTION_TYPES } = require(path.join('..', 'dashboardEngineV2', 'identity', 'functionResolver'));
const { resolveAreaId, getAxesPriority, AXES } = require(path.join('..', 'dashboardEngineV2', 'axes', 'axesPriorityCatalog'));
const { deriveCapabilities, hasAllCapabilities } = require(path.join('..', 'dashboardEngineV2', 'axes', 'capabilitiesDeriver'));
const { composeDashboardV2 } = require(path.join('..', 'dashboardEngineV2', 'composition', 'compositionEngine'));
const { computeDiff } = require(path.join('..', 'dashboardEngineV2', 'gateway', 'diffAnalyzer'));
const motorAdapter = require(path.join('..', 'dashboardEngineV2', 'gateway', 'motorAdapter'));
const gateway = require(path.join('..', 'dashboardEngineV2', 'gateway', 'dashboardCompositionGateway'));

let _passed = 0;
let _failed = 0;

function assert(cond, label, detail) {
  if (cond) {
    _passed += 1;
    console.log(`  PASS  ${label}`);
    return true;
  }
  _failed += 1;
  console.log(`  FAIL  ${label}`);
  if (detail !== undefined) console.log('        ', JSON.stringify(detail));
  return false;
}

function section(name) {
  console.log(`\n=== ${name} ===`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 1 — Diretor de Finanças
// ─────────────────────────────────────────────────────────────────────────────
async function scenario_DiretorFinancas() {
  section('Cenário 1 — Diretor de Finanças');
  const user = {
    id: 'u_finance_director',
    company_id: 'c1',
    role: 'diretor',
    job_title: 'Diretor de Finanças',
    functional_area: 'finance',
    department: 'Diretoria Financeira',
    hierarchy_level: 2,
    permissions: []
  };

  const identity = buildContextualIdentity(user);
  assert(identity.area === 'finance',
    'área resolvida = finance', identity);
  assert(identity.function_type === FUNCTION_TYPES.DECISAO_ESTRATEGICA,
    'função = decisao_estrategica', { fn: identity.function_type });
  assert(identity.primary_axis === AXES.FINANCEIRO,
    'eixo primário = eixo_financeiro', { primary: identity.primary_axis });
  assert(identity.axes_priority[0] === AXES.FINANCEIRO &&
         identity.axes_priority.includes(AXES.EXECUTIVO),
    'prioridade de eixos contém financeiro+executivo',
    identity.axes_priority);

  // Capabilities implicit
  assert(identity.capabilities.includes('view:financial'),
    'capabilities ⊃ view:financial');
  assert(identity.capabilities.includes('view:strategic'),
    'capabilities ⊃ view:strategic');
  assert(identity.capabilities.includes('act:approve'),
    'capabilities ⊃ act:approve');
  assert(identity.capabilities.includes('data:cross_sector'),
    'capabilities ⊃ data:cross_sector');

  // Widgets esperados
  const v2 = composeDashboardV2(user);
  const ids = v2.modulos.map((m) => m.id);
  const expected = ['centro_custos', 'mapa_vazamentos', 'indicadores_executivos', 'desperdicio'];
  for (const w of expected) {
    assert(ids.includes(w), `widgets ⊃ ${w}`, { ids });
  }
  assert(v2.layout.widgets.length === v2.modulos.length,
    'layout.widgets.length === modulos.length');
  assert(v2.explainability.primary_axis === AXES.FINANCEIRO,
    'explainability.primary_axis = eixo_financeiro');
  assert(Array.isArray(v2.explainability.identity_trace) &&
         v2.explainability.identity_trace.length > 0,
    'explainability.identity_trace presente');
  assert(v2.explainability.widgets_selected.every(
    (w) => Number.isFinite(w.score) && w.score > 0
  ), 'todos os widgets selecionados têm score > 0');
}

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 2 — Diretor Industrial
// ─────────────────────────────────────────────────────────────────────────────
function scenario_DiretorIndustrial() {
  section('Cenário 2 — Diretor Industrial');
  const user = {
    id: 'u_industrial_director',
    company_id: 'c1',
    role: 'diretor',
    job_title: 'Diretor Industrial',
    functional_area: 'industrial',
    department: 'Diretoria Industrial',
    hierarchy_level: 2,
    permissions: []
  };

  const identity = buildContextualIdentity(user);
  assert(identity.area === 'industrial', 'área = industrial', identity);
  assert(identity.function_type === FUNCTION_TYPES.DECISAO_ESTRATEGICA,
    'função = decisao_estrategica');
  assert(identity.axes_priority.includes(AXES.OPERACIONAL),
    'eixos ⊃ eixo_operacional');
  assert(identity.axes_priority.includes(AXES.MANUTENCAO),
    'eixos ⊃ eixo_manutencao');
  assert(identity.capabilities.includes('view:operational'),
    'capabilities ⊃ view:operational');
  assert(identity.capabilities.includes('view:maintenance'),
    'capabilities ⊃ view:maintenance');

  const v2 = composeDashboardV2(user);
  const ids = v2.modulos.map((m) => m.id);
  const expected = ['operacoes', 'gargalos', 'manutencao', 'alertas'];
  for (const w of expected) {
    assert(ids.includes(w), `widgets ⊃ ${w}`, { ids });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 3 — Supervisor de Produção
// ─────────────────────────────────────────────────────────────────────────────
function scenario_SupervisorProducao() {
  section('Cenário 3 — Supervisor de Produção');
  const user = {
    id: 'u_supervisor_prod',
    company_id: 'c1',
    role: 'supervisor',
    job_title: 'Supervisor de Produção',
    functional_area: 'production',
    department: 'Linha 3',
    hierarchy_level: 4,
    permissions: []
  };

  const identity = buildContextualIdentity(user);
  assert(identity.function_type === FUNCTION_TYPES.SUPERVISAO,
    'função = supervisao', identity);
  assert(identity.primary_axis === AXES.OPERACIONAL,
    'eixo primário = eixo_operacional');
  assert(identity.scope === 'team', 'scope = team');
  assert(identity.function_defaults.granularity.includes('hour'),
    'granularidade inclui hora');

  const v2 = composeDashboardV2(user);
  const ids = v2.modulos.map((m) => m.id);
  // Esperados para supervisor de produção: dados operacionais e alertas
  for (const w of ['kpi_cards', 'alertas']) {
    assert(ids.includes(w), `widgets ⊃ ${w}`, { ids });
  }
  // Não esperamos resumo executivo no top — granularity_bias penaliza
  // categoria 'consolidated' para função supervisao.
  const top3 = ids.slice(0, 3);
  assert(!top3.includes('resumo_executivo'),
    'top-3 não contém resumo_executivo (correctamente despriorizado)',
    { top3 });
  assert(v2.modulos.length <= identity.function_defaults.max_widgets + 1,
    'respeita max_widgets (com tolerância de 1 para pergunte_ia universal)');
}

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 4 — Operador
// ─────────────────────────────────────────────────────────────────────────────
function scenario_Operador() {
  section('Cenário 4 — Operador');
  const user = {
    id: 'u_op',
    company_id: 'c1',
    role: 'colaborador',
    job_title: 'Operador de Linha',
    functional_area: 'production',
    department: 'Linha 1',
    hierarchy_level: 5,
    permissions: []
  };

  const identity = buildContextualIdentity(user);
  assert(identity.function_type === FUNCTION_TYPES.EXECUCAO,
    'função = execucao', identity);
  assert(identity.scope === 'individual', 'scope = individual');
  assert(identity.capabilities.includes('act:execute'),
    'capabilities ⊃ act:execute');

  const v2 = composeDashboardV2(user);
  assert(v2.modulos.length <= identity.function_defaults.max_widgets + 1,
    'execucao respeita max_widgets (≤ ' +
    (identity.function_defaults.max_widgets + 1) + ')',
    { count: v2.modulos.length });
  // Não deve receber widgets estratégicos (filtrados por capabilities)
  const ids = v2.modulos.map((m) => m.id);
  assert(!ids.includes('indicadores_executivos'),
    'operador NÃO recebe indicadores_executivos (capability bloqueia)',
    { ids });
  assert(!ids.includes('mapa_vazamentos'),
    'operador NÃO recebe mapa_vazamentos (capability bloqueia)',
    { ids });
}

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 5 — Permissões / LGPD
// ─────────────────────────────────────────────────────────────────────────────
function scenario_PermissionsLgpd() {
  section('Cenário 5 — Permissões / LGPD (capabilities barram widgets)');

  // Coordenador de produção SEM view:financial deve ser barrado em
  // widgets financeiros.
  const user = {
    id: 'u_coord_prod',
    company_id: 'c1',
    role: 'coordenador',
    job_title: 'Coordenador de Produção',
    functional_area: 'production',
    department: 'Linha 2',
    hierarchy_level: 3,
    permissions: []
  };
  const identity = buildContextualIdentity(user);
  assert(!identity.capabilities.includes('view:financial'),
    'coordenador de produção NÃO tem view:financial implícita');
  const v2 = composeDashboardV2(user);
  const ids = v2.modulos.map((m) => m.id);
  for (const blocked of ['centro_custos', 'mapa_vazamentos', 'grafico_custos_setor']) {
    assert(!ids.includes(blocked),
      `widget ${blocked} bloqueado por ausência de capability`,
      { ids });
  }
  const denied = v2.explainability.widgets_denied.map((d) => d.id);
  assert(denied.length > 0,
    'lista widgets_denied não-vazia (auditável)', { denied });

  // Helper hasAllCapabilities sanity
  assert(hasAllCapabilities(['view:financial'], ['view:financial']) === true,
    'hasAllCapabilities positivo');
  assert(hasAllCapabilities(['view:financial'], ['view:financial', 'view:strategic']) === false,
    'hasAllCapabilities negativo quando falta capability');

  // Concedendo VIEW_FINANCIAL via permissions, widgets financeiros voltam
  // a ser elegíveis (não necessariamente todos — bias da função supervisao
  // pode ainda penalizar 'consolidated' como centro_custos, mas o utilizador
  // deve ver pelo menos um widget financeiro a mais que não via antes).
  const userWithCap = { ...user, permissions: ['VIEW_FINANCIAL'] };
  const idsWithCap = composeDashboardV2(userWithCap).modulos.map((m) => m.id);
  const FINANCEIROS = ['centro_custos', 'mapa_vazamentos', 'desperdicio', 'grafico_custos_setor'];
  const newFinanceiros = idsWithCap.filter((id) => FINANCEIROS.includes(id));
  assert(newFinanceiros.length > 0,
    'com VIEW_FINANCIAL, pelo menos um widget financeiro entra na lista',
    { idsWithCap, newFinanceiros });

  // E que nenhum dos widgets financeiros aparece sem capability (regressão).
  const baselineIds = composeDashboardV2(user).modulos.map((m) => m.id);
  const baselineFin = baselineIds.filter((id) => FINANCEIROS.includes(id));
  assert(baselineFin.length === 0,
    'sem VIEW_FINANCIAL, NENHUM widget financeiro aparece (sanity)',
    { baselineIds, baselineFin });
}

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 6 — Diff A vs B (Diretor de Finanças)
// ─────────────────────────────────────────────────────────────────────────────
function scenario_DiffAvsB() {
  section('Cenário 6 — Diff A vs B (Diretor de Finanças)');
  const user = {
    id: 'u_finance_director_diff',
    company_id: 'c1',
    role: 'diretor',
    job_title: 'Diretor de Finanças',
    functional_area: 'finance',
    department: 'Diretoria Financeira',
    hierarchy_level: 2,
    permissions: []
  };

  let normalizedA;
  try {
    normalizedA = motorAdapter.composeFromMotorASync(user);
  } catch (err) {
    assert(false, 'motorAdapter.composeFromMotorASync executou', err.message);
    return;
  }
  const normalizedB = composeDashboardV2(user);
  const diff = computeDiff(normalizedA, normalizedB);

  assert(typeof diff.jaccard_widgets === 'number',
    'diff.jaccard_widgets é número', diff);
  assert(diff.signature_a !== diff.signature_b,
    'A e B têm assinaturas diferentes (esperado)');
  // Em Motor A, area_finance pode não ser resolvida; em Motor B sim.
  assert(diff.area_b === 'finance',
    'Motor B resolve área = finance');
  // Top widget de B deve ser um widget financeiro/estratégico
  // (centro_custos, mapa_vazamentos ou indicadores_executivos —
  // qualquer um deles confirma que B vê o utilizador como financeiro).
  const topAcceptable = ['centro_custos', 'mapa_vazamentos', 'indicadores_executivos', 'resumo_executivo'];
  assert(topAcceptable.includes(normalizedB.modulos[0]?.id),
    'top widget B é financeiro/estratégico',
    { topB: normalizedB.modulos[0]?.id });
  // E pergunte_ia (universal) NÃO domina o top — sinal de que a
  // penalidade de generalidade está a funcionar.
  assert(normalizedB.modulos[0]?.id !== 'pergunte_ia',
    'pergunte_ia não monopoliza o top (penalty generality activa)');

  console.log('  INFO  jaccard A∩B =', diff.jaccard_widgets,
    '| top3_changes =', diff.top3_changes,
    '| critical =', diff.critical_divergence);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 7 — Gateway flag=off é byte-compatível e não corre B
// ─────────────────────────────────────────────────────────────────────────────
async function scenario_GatewayOff() {
  section('Cenário 7 — Gateway flag=off (preservar comportamento)');
  const user = {
    id: 'u_off',
    company_id: 'c1',
    role: 'gerente',
    job_title: 'Gerente de Produção',
    functional_area: 'production',
    department: 'Produção',
    hierarchy_level: 3,
    permissions: []
  };

  // Sem flag: gateway não corre Motor B em paralelo (sample=0 default off)
  delete process.env.IMPETUS_DASHBOARD_ENGINE_V2;
  delete process.env.IMPETUS_DASHBOARD_ENGINE_SHADOW;

  const result = await gateway.compose(user); // mode default = off → engine A
  assert(result.engine === 'A',
    'engine primário = A quando flag desligada', { engine: result.engine });
  assert(result.shadow === null,
    'shadow não corre por default', { shadow: !!result.shadow });
  assert(result.diff === null,
    'diff é null quando shadow não correu');
  assert(result.primary && Array.isArray(result.primary.modulos),
    'resposta primária tem .modulos array');
}

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 8 — Gateway shadow corre B em paralelo e produz diff
// ─────────────────────────────────────────────────────────────────────────────
async function scenario_GatewayShadow() {
  section('Cenário 8 — Gateway shadow (A primário + B paralelo)');
  const user = {
    id: 'u_shadow',
    company_id: 'c1',
    role: 'diretor',
    job_title: 'Diretor de Finanças',
    functional_area: 'finance',
    hierarchy_level: 2,
    permissions: []
  };

  process.env.IMPETUS_DASHBOARD_ENGINE_V2 = 'shadow';
  process.env.IMPETUS_DASHBOARD_ENGINE_SHADOW = 'true';

  const result = await gateway.compose(user);
  assert(result.engine === 'A_with_B_shadow',
    'engine = A_with_B_shadow', { engine: result.engine });
  assert(result.shadow && result.shadow.engine === 'B',
    'shadow é Motor B');
  assert(result.diff && typeof result.diff.jaccard_widgets === 'number',
    'diff foi computado');

  delete process.env.IMPETUS_DASHBOARD_ENGINE_V2;
  delete process.env.IMPETUS_DASHBOARD_ENGINE_SHADOW;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 9 — Gateway on: B primário, A redundante
// ─────────────────────────────────────────────────────────────────────────────
async function scenario_GatewayOn() {
  section('Cenário 9 — Gateway on (B primário)');
  const user = {
    id: 'u_on',
    company_id: 'c1',
    role: 'diretor',
    job_title: 'Diretor de Finanças',
    functional_area: 'finance',
    hierarchy_level: 2,
    permissions: []
  };

  process.env.IMPETUS_DASHBOARD_ENGINE_V2 = 'on';
  process.env.IMPETUS_DASHBOARD_ENGINE_SHADOW = 'true';

  const result = await gateway.compose(user);
  assert(result.engine === 'B_with_A_shadow' || result.engine === 'B',
    'engine = B (primário)', { engine: result.engine });
  assert(result.primary && result.primary.engine === 'B',
    'primary é Motor B');
  // Top widget de B deve ser financeiro
  assert(
    ['centro_custos', 'mapa_vazamentos', 'indicadores_executivos']
      .includes(result.primary.modulos[0]?.id),
    'top widget é financeiro estratégico',
    { top: result.primary.modulos[0]?.id }
  );

  delete process.env.IMPETUS_DASHBOARD_ENGINE_V2;
  delete process.env.IMPETUS_DASHBOARD_ENGINE_SHADOW;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 10 — Robustez: utilizador parcial / nulo
// ─────────────────────────────────────────────────────────────────────────────
function scenario_Robustness() {
  section('Cenário 10 — Robustez (utilizador parcial/nulo)');
  const v2null = composeDashboardV2(null);
  assert(v2null.engine === 'B', 'composeDashboardV2(null) não lança');
  assert(Array.isArray(v2null.modulos), 'modulos é array mesmo com null');

  const partial = { id: 'x', role: 'unknown_role' };
  const idPartial = buildContextualIdentity(partial);
  assert(idPartial.function_type === FUNCTION_TYPES.EXECUCAO,
    'role desconhecido cai em execucao com hierarchy=null',
    idPartial);

  // Sanity de utility
  assert(normalizeRole('Director') === 'diretor', 'normalize Director → diretor');
  assert(normalizeRole('Diretora') === 'diretor', 'normalize Diretora → diretor');
  assert(normalizeRole('CEO') === 'ceo', 'normalize CEO → ceo (lowercased)');

  // resolveAreaId — alias com acento
  assert(resolveAreaId({ functional_area: 'Financeiro' }) === 'finance',
    'alias "Financeiro" resolve para finance');
  assert(resolveAreaId({ functional_area: 'manutenção' }) === 'maintenance',
    'alias "manutenção" resolve para maintenance');

  // axes priority não vazia
  const ax = getAxesPriority({ area: 'finance', functionType: 'decisao_estrategica' });
  assert(ax.length >= 3, 'finance.decisao_estrategica devolve ≥3 eixos');

  // capabilities derivação
  const cap = deriveCapabilities({ functionType: 'decisao_estrategica', area: 'finance', role: 'diretor', permissions: [] });
  assert(cap.capabilities.includes('view:financial'), 'cap finance.diretor ⊃ view:financial');
}

async function main() {
  scenario_DiretorIndustrial();
  await scenario_DiretorFinancas();
  scenario_SupervisorProducao();
  scenario_Operador();
  scenario_PermissionsLgpd();
  scenario_DiffAvsB();
  await scenario_GatewayOff();
  await scenario_GatewayShadow();
  await scenario_GatewayOn();
  scenario_Robustness();

  console.log(`\nResultado: ${_passed} pass / ${_failed} fail`);
  if (_failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Falha catastrófica nos cenários:', err);
  process.exit(2);
});
