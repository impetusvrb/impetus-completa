/**
 * REG-001 — Navigation Audit (read-only).
 */
export const REG_NAVIGATION_AUDIT = Object.freeze([
  Object.freeze({
    menuLabel: 'Mapa de Vazamento',
    menuSource: 'Layout.jsx CEO menu + contextual losses_map',
    appearsInUi: true,
    registeredRoute: '/app/mapa-vazamento-financeiro',
    routeMounted: true,
    componentLoads: true,
    component: 'MapaVazamentoFinanceiro',
    httpOk: false,
    rendersCorrectly: 'partial — page shell OK, data fetch 404',
    consoleErrors: 'API 404 financial-leakage/*',
    status: 'broken_data_layer'
  }),
  Object.freeze({
    menuLabel: 'Mapa Industrial',
    menuSource: 'Layout.jsx INDUSTRIAL_CORE + MENU_BLOCO_INDUSTRIAL',
    appearsInUi: true,
    registeredRoute: '/app/centro-operacoes-industrial',
    routeMounted: true,
    componentLoads: true,
    component: 'IndustrialOperationsCenter',
    httpOk: false,
    rendersCorrectly: 'partial — page shell OK, industrial API 404',
    consoleErrors: 'API 404 /dashboard/industrial/*',
    status: 'broken_data_layer',
    guardIssue: 'diretor genérico: menu sim, App canAccessIndustrialCore → Navigate /app'
  }),
  Object.freeze({
    menuLabel: 'Insights operacionais',
    menuSource: 'Layout.jsx INDUSTRIAL_CORE',
    appearsInUi: true,
    registeredRoute: '/app/insights',
    routeMounted: true,
    componentLoads: true,
    component: 'InsightsPage',
    httpOk: true,
    rendersCorrectly: 'yes (may show mock defaults)',
    consoleErrors: 'none expected on happy path',
    status: 'guard_risk',
    guardIssue: 'mesmo mismatch menu↔rota para diretor não-industrial'
  }),
  Object.freeze({
    menuLabel: 'Cérebro operacional',
    menuSource: 'Layout.jsx INDUSTRIAL_CORE + CentralAIPanel navigate',
    appearsInUi: true,
    registeredRoute: '/app/cerebro-operacional',
    routeMounted: true,
    componentLoads: true,
    component: 'OperationalIntelligencePanel',
    httpOk: true,
    rendersCorrectly: 'yes when guard allows',
    consoleErrors: 'none on happy path',
    status: 'guard_risk',
    guardIssue: 'mesmo mismatch; widget CC "Cérebro" = chat sem deep-link'
  }),
  Object.freeze({
    menuLabel: 'CenterWidget Abrir (leak_map)',
    menuSource: 'CenterWidget.jsx ROUTES.leak_map',
    appearsInUi: true,
    registeredRoute: '/app/mapa-vazamento-financeiro',
    routeMounted: true,
    componentLoads: true,
    httpOk: false,
    status: 'navigates_then_data_fails'
  }),
  Object.freeze({
    menuLabel: 'CenterWidget Abrir (industrial_map)',
    menuSource: 'CenterWidget.jsx ROUTES.industrial_map',
    appearsInUi: true,
    registeredRoute: '/app/centro-operacoes-industrial',
    routeMounted: true,
    componentLoads: true,
    httpOk: false,
    status: 'navigates_then_data_fails'
  }),
  Object.freeze({
    menuLabel: 'CenterWidget id desconhecido',
    menuSource: 'CenterWidget.jsx path="#"',
    appearsInUi: true,
    registeredRoute: null,
    routeMounted: false,
    componentLoads: false,
    httpOk: null,
    status: 'dead_click',
    note: 'onClick no-op quando id ∉ ROUTES'
  }),
  Object.freeze({
    menuLabel: 'KPI /app/industrial',
    menuSource: 'dashboardKPIs / production adapters',
    appearsInUi: 'via KPI card',
    registeredRoute: '/app/industrial',
    routeMounted: false,
    componentLoads: false,
    httpOk: null,
    status: 'orphan_route_reference'
  })
]);

export function listBrokenNavigation() {
  return REG_NAVIGATION_AUDIT.filter((n) =>
    ['broken_data_layer', 'dead_click', 'orphan_route_reference', 'guard_risk'].includes(n.status)
  );
}

export function validateNavigationAudit() {
  return {
    valid: REG_NAVIGATION_AUDIT.length >= 6,
    issues: [],
    count: REG_NAVIGATION_AUDIT.length,
    broken: listBrokenNavigation().length
  };
}
