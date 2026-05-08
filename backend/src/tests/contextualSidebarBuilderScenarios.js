'use strict';

/**
 * Cenários — Phase 8: Frontend Hybrid Sidebar Builder
 *
 * Testa a função pura `buildHybridMenu` (núcleo CommonJS partilhado entre
 * frontend e testes Node).
 *
 * Cobre:
 *   1.  Sem contextualModules → legacy intacto (fallback total)
 *   2.  contextualModules vazio → legacy intacto
 *   3.  CFO recebe Centro de Custos / Mapa de Vazamento / Centro de Previsão
 *   4.  CEO recebe módulos executivos sem duplicar /app
 *   5.  Operador (legacy curto) NÃO recebe módulos executivos quando
 *       contextualModules vazio
 *   6.  Sem duplicação: módulo cujo path já está no legacy é descartado
 *   7.  Score abaixo do mínimo é descartado
 *   8.  Categorias whitelist (allowCategories) restringe correctamente
 *   9.  Items inseridos imediatamente após /app preservando ordem
 *  10.  Items contextuais marcados com `_contextual: true`
 *  11.  Tolerância: legacyMenu null/undefined não rebenta
 *  12.  Module desconhecido (sem decorationMap) cai em fallback paths[0]
 *
 * Execução:
 *   npm run test:contextual-sidebar
 *   node src/tests/contextualSidebarBuilderScenarios.js
 */

const path = require('path');

const corePath = path.join(
  '..', '..', '..',
  'frontend', 'src', 'utils', 'contextualSidebarBuilder.core.cjs'
);
const { buildHybridMenu } = require(corePath);

// Mapa de decoração mínimo (espelha o real, sem ícones — apenas paths/labels).
const DECORATION = Object.freeze({
  cost_center:                 { icon: 'DollarSign',     label: 'Centro de Custos',         path: '/app/centro-custos-industriais' },
  losses_map:                  { icon: 'TrendingDown',   label: 'Mapa de Vazamento',        path: '/app/mapa-vazamento-financeiro' },
  centro_previsao_operacional: { icon: 'TrendingUp',     label: 'Centro de Previsão',       path: '/app/centro-previsao-operacional' },
  financial_intelligence:      { icon: 'DollarSign',     label: 'Inteligência Financeira',  path: '/app/centro-custos-industriais' },
  cerebro_operacional:         { icon: 'Brain',          label: 'Cérebro operacional',      path: '/app/cerebro-operacional' },
  insights:                    { icon: 'TrendingUp',     label: 'Insights operacionais',    path: '/app/insights' },
  audit:                       { icon: 'ScrollText',     label: 'Logs de Auditoria',        path: '/app/admin/audit-logs' }
});

const LEGACY_DIRETOR = [
  { path: '/app',               label: 'Centro de Comando' },
  { path: '/app/operacional',   label: 'Operacional' },
  { path: '/app/proacao',       label: 'Pró-Ação' },
  { path: '/app/biblioteca',    label: 'Biblioteca' },
  { path: '/app/chatbot',       label: 'Impetus IA' },
  { path: '/app/settings',      label: 'Configurações' }
];

const LEGACY_OPERADOR = [
  { path: '/app/dashboard-vivo', label: 'Dashboard Vivo' },
  { path: '/app/proacao',        label: 'Pró-Ação' },
  { path: '/app/biblioteca',     label: 'Biblioteca' },
  { path: '/app/chatbot',        label: 'Impetus IA' },
  { path: '/app/settings',       label: 'Configurações' }
];

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

function pathsOf(arr) {
  return Array.isArray(arr) ? arr.map((it) => (it && it.path) || '') : [];
}

// ───────────────────────────────────────────────────────────────────────────
// 1) Sem contextualModules → legacy intacto
// ───────────────────────────────────────────────────────────────────────────
(function _scenario1() {
  console.log('\n[1] Sem contextualModules → legacy intacto');
  const out = buildHybridMenu(LEGACY_DIRETOR, null, DECORATION);
  assert(out.length === LEGACY_DIRETOR.length, 'mantém número de items');
  assert(JSON.stringify(pathsOf(out)) === JSON.stringify(pathsOf(LEGACY_DIRETOR)), 'preserva ordem exacta');
})();

// ───────────────────────────────────────────────────────────────────────────
// 2) contextualModules vazio → legacy intacto
// ───────────────────────────────────────────────────────────────────────────
(function _scenario2() {
  console.log('\n[2] contextualModules vazio → legacy intacto');
  const out = buildHybridMenu(LEGACY_DIRETOR, [], DECORATION);
  assert(out.length === LEGACY_DIRETOR.length, 'tamanho preservado');
  assert(JSON.stringify(pathsOf(out)) === JSON.stringify(pathsOf(LEGACY_DIRETOR)), 'ordem preservada');
})();

// ───────────────────────────────────────────────────────────────────────────
// 3) CFO recebe módulos financeiros
// ───────────────────────────────────────────────────────────────────────────
(function _scenario3() {
  console.log('\n[3] CFO recebe Centro de Custos / Mapa de Vazamento / Centro de Previsão');
  const cfoCtx = [
    { module_id: 'cost_center',                 category: 'financial',   score: 0.85, paths: ['/app/centro-custos-industriais'] },
    { module_id: 'losses_map',                  category: 'financial',   score: 0.85, paths: ['/app/mapa-vazamento-financeiro'] },
    { module_id: 'centro_previsao_operacional', category: 'operational', score: 0.85, paths: ['/app/centro-previsao-operacional'] },
    { module_id: 'financial_intelligence',      category: 'financial',   score: 0.85, paths: ['/app/centro-custos-industriais'] }
  ];
  const out = buildHybridMenu(LEGACY_DIRETOR, cfoCtx, DECORATION);
  const ps = pathsOf(out);
  assert(ps.includes('/app/centro-custos-industriais'), 'inclui /app/centro-custos-industriais');
  assert(ps.includes('/app/mapa-vazamento-financeiro'), 'inclui /app/mapa-vazamento-financeiro');
  assert(ps.includes('/app/centro-previsao-operacional'), 'inclui /app/centro-previsao-operacional');
  assert(out.length === LEGACY_DIRETOR.length + 3, 'inseriu 3 items (4º é dedupe de path)');
  // dedupe: financial_intelligence partilha path com cost_center
  const occurrences = ps.filter((p) => p === '/app/centro-custos-industriais').length;
  assert(occurrences === 1, 'sem duplicação de /app/centro-custos-industriais');
})();

// ───────────────────────────────────────────────────────────────────────────
// 4) CEO recebe módulos executivos sem duplicar /app
// ───────────────────────────────────────────────────────────────────────────
(function _scenario4() {
  console.log('\n[4] CEO sem duplicar /app');
  const ceoCtx = [
    { module_id: 'cerebro_operacional', category: 'operational', score: 0.9, paths: ['/app/cerebro-operacional'] },
    { module_id: 'insights',            category: 'operational', score: 0.8, paths: ['/app/insights'] }
  ];
  const out = buildHybridMenu(LEGACY_DIRETOR, ceoCtx, DECORATION);
  const ps = pathsOf(out);
  const dashboardOccurrences = ps.filter((p) => p === '/app').length;
  assert(dashboardOccurrences === 1, '/app aparece exactamente 1 vez');
  assert(ps.includes('/app/cerebro-operacional'), 'inclui cérebro operacional');
})();

// ───────────────────────────────────────────────────────────────────────────
// 5) Operador NÃO recebe módulos executivos quando contextualModules vazio
// ───────────────────────────────────────────────────────────────────────────
(function _scenario5() {
  console.log('\n[5] Operador → contextual vazio → menu legacy intacto');
  const out = buildHybridMenu(LEGACY_OPERADOR, [], DECORATION);
  assert(out.length === LEGACY_OPERADOR.length, 'menu operador tamanho preservado');
  assert(!pathsOf(out).includes('/app/centro-custos-industriais'), 'sem cost center');
  assert(!pathsOf(out).includes('/app/cerebro-operacional'), 'sem cérebro operacional');
})();

// ───────────────────────────────────────────────────────────────────────────
// 6) Dedupe contra legacy (path já presente)
// ───────────────────────────────────────────────────────────────────────────
(function _scenario6() {
  console.log('\n[6] Dedupe — módulo cujo path já está no legacy');
  const legacyComCustos = LEGACY_DIRETOR.concat([
    { path: '/app/centro-custos-industriais', label: 'Centro de Custos (legacy)' }
  ]);
  const ctx = [
    { module_id: 'cost_center', category: 'financial', score: 0.85, paths: ['/app/centro-custos-industriais'] }
  ];
  const out = buildHybridMenu(legacyComCustos, ctx, DECORATION);
  const ps = pathsOf(out);
  const ocorr = ps.filter((p) => p === '/app/centro-custos-industriais').length;
  assert(ocorr === 1, 'sem duplicação contra legacy');
  assert(out.length === legacyComCustos.length, 'tamanho preservado');
})();

// ───────────────────────────────────────────────────────────────────────────
// 7) Score abaixo do mínimo é descartado
// ───────────────────────────────────────────────────────────────────────────
(function _scenario7() {
  console.log('\n[7] Score < minScore é descartado');
  const ctx = [
    { module_id: 'cost_center', category: 'financial', score: 0.2, paths: ['/app/centro-custos-industriais'] }
  ];
  const out = buildHybridMenu(LEGACY_DIRETOR, ctx, DECORATION);
  assert(!pathsOf(out).includes('/app/centro-custos-industriais'), 'descartado por score');
  assert(out.length === LEGACY_DIRETOR.length, 'legacy intacto');
  // Override do minScore
  const out2 = buildHybridMenu(LEGACY_DIRETOR, ctx, DECORATION, { minScore: 0.1 });
  assert(pathsOf(out2).includes('/app/centro-custos-industriais'), 'minScore=0.1 aceita score=0.2');
})();

// ───────────────────────────────────────────────────────────────────────────
// 8) allowCategories restringe correctamente
// ───────────────────────────────────────────────────────────────────────────
(function _scenario8() {
  console.log('\n[8] allowCategories whitelist');
  const ctx = [
    { module_id: 'cost_center', category: 'financial',   score: 0.85, paths: ['/app/centro-custos-industriais'] },
    { module_id: 'audit',       category: 'audit',       score: 0.85, paths: ['/app/admin/audit-logs'] }
  ];
  const out = buildHybridMenu(LEGACY_DIRETOR, ctx, DECORATION, { allowCategories: ['financial'] });
  const ps = pathsOf(out);
  assert(ps.includes('/app/centro-custos-industriais'), 'financial passa');
  assert(!ps.includes('/app/admin/audit-logs'), 'audit é descartado');
})();

// ───────────────────────────────────────────────────────────────────────────
// 9) Items inseridos imediatamente após /app
// ───────────────────────────────────────────────────────────────────────────
(function _scenario9() {
  console.log('\n[9] Inserção logo após /app');
  const ctx = [
    { module_id: 'cost_center', category: 'financial', score: 0.85, paths: ['/app/centro-custos-industriais'] }
  ];
  const out = buildHybridMenu(LEGACY_DIRETOR, ctx, DECORATION);
  const ps = pathsOf(out);
  const idxApp     = ps.indexOf('/app');
  const idxCustos  = ps.indexOf('/app/centro-custos-industriais');
  assert(idxApp >= 0 && idxCustos === idxApp + 1, 'item contextual está logo após /app');
})();

// ───────────────────────────────────────────────────────────────────────────
// 10) Items contextuais marcados com _contextual=true
// ───────────────────────────────────────────────────────────────────────────
(function _scenario10() {
  console.log('\n[10] Items contextuais carregam metadado _contextual');
  const ctx = [
    { module_id: 'cost_center', category: 'financial', score: 0.85, paths: ['/app/centro-custos-industriais'] }
  ];
  const out = buildHybridMenu(LEGACY_DIRETOR, ctx, DECORATION);
  const inj = out.find((it) => it.path === '/app/centro-custos-industriais');
  assert(!!inj, 'item presente');
  assert(inj && inj._contextual === true, 'flag _contextual presente');
  assert(inj && inj._module_id === 'cost_center', 'metadado module_id presente');
  assert(inj && inj._score === 0.85, 'metadado score presente');
  // O item legacy /app NÃO carrega _contextual
  const legacyApp = out.find((it) => it.path === '/app');
  assert(!legacyApp || legacyApp._contextual !== true, 'legacy não é marcado contextual');
})();

// ───────────────────────────────────────────────────────────────────────────
// 11) Tolerância a inputs inválidos
// ───────────────────────────────────────────────────────────────────────────
(function _scenario11() {
  console.log('\n[11] Tolerância — inputs nulos/inválidos');
  let ok = true;
  try {
    const a = buildHybridMenu(null, null, DECORATION);
    const b = buildHybridMenu(undefined, undefined, DECORATION);
    const c = buildHybridMenu(LEGACY_DIRETOR, 'not-array', DECORATION);
    const d = buildHybridMenu(LEGACY_DIRETOR, [{ junk: true }], DECORATION);
    assert(Array.isArray(a) && a.length === 0, 'legacy null → []');
    assert(Array.isArray(b) && b.length === 0, 'legacy undefined → []');
    assert(Array.isArray(c) && c.length === LEGACY_DIRETOR.length, 'contextual non-array → legacy');
    assert(Array.isArray(d) && d.length === LEGACY_DIRETOR.length, 'item sem module_id/paths → ignorado');
  } catch (e) {
    ok = false;
    console.log('  FAIL  exception lançada:', e && e.message);
  }
  assert(ok, 'nenhuma excepção propagou-se');
})();

// ───────────────────────────────────────────────────────────────────────────
// 12) module_id desconhecido → fallback paths[0] do backend
// ───────────────────────────────────────────────────────────────────────────
(function _scenario12() {
  console.log('\n[12] module_id desconhecido → fallback paths[0]');
  const ctx = [
    { module_id: 'novo_modulo_x', category: 'operational', score: 0.85, label: 'Novo X', paths: ['/app/novo-x'] }
  ];
  const out = buildHybridMenu(LEGACY_DIRETOR, ctx, DECORATION);
  const inj = out.find((it) => it.path === '/app/novo-x');
  assert(!!inj, 'fallback inseriu item via paths[0]');
  assert(inj && inj.label === 'Novo X', 'label vem do backend');
  assert(inj && inj.icon === null, 'sem ícone (sem decoração)');
  // Sem paths[] → ignorado
  const ctx2 = [{ module_id: 'sem_path', category: 'operational', score: 0.85 }];
  const out2 = buildHybridMenu(LEGACY_DIRETOR, ctx2, DECORATION);
  assert(out2.length === LEGACY_DIRETOR.length, 'sem paths[] → ignorado');
})();

console.log(`\n[contextualSidebarBuilder] passed=${_passed} failed=${_failed}`);
if (_failed > 0) process.exit(1);
process.exit(0);
