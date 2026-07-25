/**
 * REG-001 — Root Cause Analysis.
 */
export const REG_ROOT_CAUSE_ANALYSIS = Object.freeze({
  hypothesis: Object.freeze({
    statement:
      'Evolução Logística (EOX, OPM, CPL, registries) introduziu regressões em módulos corporativos já existentes',
    verdict: 'partially_confirmed',
    nuance:
      'Os gaps HTTP (leakage, industrial, forecasting) são desmontagem/não-montagem de rotas — padrão activação em falta. O mismatch de guards é endurecimento RBAC divergente menu↔rota. CPL/EOX não são causa directa dos 4 paths legacy, mas a janela temporal (pós 18/07) coincide com intensa alteração de App/Layout/registries.'
  }),

  causesByFeature: Object.freeze({
    mapa_vazamentos: Object.freeze({
      primary: 'route_not_mounted',
      secondary: null,
      evidence: 'rg financial-leakage em backend/src/routes = 0; service + api.js + UI existem',
      introducedAround: 'pós Jun/2026 — inventários M1 stale afirmam montada'
    }),
    mapa_industrial: Object.freeze({
      primary: 'route_not_mounted',
      secondary: 'rbac_guard_mismatch',
      evidence: '0 rotas /industrial/*; industrialOperationalMapService existe; Layout≠App guard',
      introducedAround: 'docs Jun/2026 marcam machines API como feito — código HTTP ausente'
    }),
    operational_insights: Object.freeze({
      primary: 'rbac_guard_mismatch',
      secondary: 'other',
      evidence: 'API montada; mock fallback mascara falhas; guard redireciona diretor genérico',
      introducedAround: 'endurecimento canAccessIndustrialCore em App.jsx'
    }),
    cerebro_operacional: Object.freeze({
      primary: 'rbac_guard_mismatch',
      secondary: 'dead_click',
      evidence: 'HTTP íntegro; widget CC = chat sem navigate; guard mismatch',
      introducedAround: 'layout Centro Comando + guard App'
    })
  }),

  systemicPatterns: Object.freeze([
    Object.freeze({
      pattern: 'service_without_http_mount',
      description: 'Service + api.js + UI existem; router handlers ausentes',
      instances: Object.freeze(['financial-leakage', 'industrial', 'forecasting partial'])
    }),
    Object.freeze({
      pattern: 'menu_route_guard_divergence',
      description: 'Sidebar mais permissivo que Route guard',
      instances: Object.freeze(['mapa_industrial', 'insights', 'cerebro'])
    }),
    Object.freeze({
      pattern: 'stale_inventory_docs',
      description: 'BACKEND_INVENTORY / M1 docs afirmam montado — código não confirma',
      risk: 'falsos positivos de readiness'
    }),
    Object.freeze({
      pattern: 'widget_without_deeplink',
      description: 'Widgets Centro Comando mostram dados mas não navegam para a página canónica',
      instances: Object.freeze(['WidgetDiagramaIndustrial', 'WidgetMapaVazamentos', 'PERGUNTE_IA as Cérebro'])
    })
  ]),

  notRootCause: Object.freeze([
    'CPL-001/002/003 — não alteram dashboard.js mounts',
    'OPM-003–008 logistics modules — paths /app/logistics/* separados',
    'WMS-REF-001 / OPM-GOV-001 — contratos operacionais intactos'
  ])
});

export function validateRootCauseAnalysis() {
  return {
    valid: REG_ROOT_CAUSE_ANALYSIS.hypothesis.verdict === 'partially_confirmed',
    patterns: REG_ROOT_CAUSE_ANALYSIS.systemicPatterns.length,
    featuresAnalyzed: Object.keys(REG_ROOT_CAUSE_ANALYSIS.causesByFeature).length
  };
}
