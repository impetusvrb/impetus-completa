/**
 * REG-001 — Service Connectivity Matrix.
 * UI → API → Service → Runtime → Data
 */
export const REG_CONNECTIVITY_MATRIX = Object.freeze([
  Object.freeze({
    feature: 'Mapa Vazamento',
    chain: Object.freeze([
      Object.freeze({ layer: 'UI', ok: true, detail: 'MapaVazamentoFinanceiro.jsx' }),
      Object.freeze({ layer: 'Route', ok: true, detail: '/app/mapa-vazamento-financeiro' }),
      Object.freeze({ layer: 'api.js', ok: true, detail: 'dashboard.financialLeakage' }),
      Object.freeze({ layer: 'dashboard.js mount', ok: false, detail: 'financial-leakage/* NOT mounted' }),
      Object.freeze({ layer: 'Service', ok: true, detail: 'financialLeakageDetectorService.js' }),
      Object.freeze({ layer: 'Data/Runtime', ok: 'unknown', detail: 'unreachable until mount' })
    ]),
    breakAt: 'dashboard.js mount',
    expectedHttp: '200 OK after remount'
  }),
  Object.freeze({
    feature: 'Mapa Industrial',
    chain: Object.freeze([
      Object.freeze({ layer: 'UI', ok: true, detail: 'IndustrialOperationsCenter.jsx' }),
      Object.freeze({ layer: 'Route', ok: true, detail: '/app/centro-operacoes-industrial' }),
      Object.freeze({ layer: 'Guard', ok: 'conditional', detail: 'canAccessIndustrialCore — diretor genérico blocked' }),
      Object.freeze({ layer: 'api.js', ok: true, detail: 'dashboard.industrial' }),
      Object.freeze({ layer: 'dashboard.js mount', ok: false, detail: 'industrial/* NOT mounted' }),
      Object.freeze({ layer: 'Service', ok: true, detail: 'industrialOperationalMapService.js' }),
      Object.freeze({ layer: 'Data/Runtime', ok: 'unknown', detail: 'unreachable until mount' })
    ]),
    breakAt: 'dashboard.js mount (+ guard for some roles)',
    expectedHttp: '200 OK after remount + guard align'
  }),
  Object.freeze({
    feature: 'Operational Insights',
    chain: Object.freeze([
      Object.freeze({ layer: 'UI', ok: true, detail: 'InsightsPage.jsx' }),
      Object.freeze({ layer: 'Route', ok: true, detail: '/app/insights' }),
      Object.freeze({ layer: 'Guard', ok: 'conditional', detail: 'canAccessIndustrialCore mismatch' }),
      Object.freeze({ layer: 'api.js', ok: true, detail: 'getInsights' }),
      Object.freeze({ layer: 'dashboard.js mount', ok: true, detail: 'GET /insights' }),
      Object.freeze({ layer: 'Service', ok: true, detail: 'personalizedInsightsService' }),
      Object.freeze({ layer: 'Data/Runtime', ok: 'partial', detail: 'mock fallback em InsightsList' })
    ]),
    breakAt: 'Guard (diretor) / mock masking',
    expectedHttp: '200 OK when guard allows'
  }),
  Object.freeze({
    feature: 'Cérebro Operacional',
    chain: Object.freeze([
      Object.freeze({ layer: 'UI', ok: true, detail: 'OperationalIntelligencePanel.jsx' }),
      Object.freeze({ layer: 'Route', ok: true, detail: '/app/cerebro-operacional' }),
      Object.freeze({ layer: 'Guard', ok: 'conditional', detail: 'canAccessIndustrialCore mismatch' }),
      Object.freeze({ layer: 'api.js', ok: true, detail: 'operationalBrain.*' }),
      Object.freeze({ layer: 'dashboard.js mount', ok: true, detail: 'router.use(/operational-brain)' }),
      Object.freeze({ layer: 'Service', ok: true, detail: 'operationalBrainEngine.js' }),
      Object.freeze({ layer: 'Data/Runtime', ok: true, detail: 'chain íntegra para CEO' })
    ]),
    breakAt: 'Guard (diretor) / widget CC without deep-link',
    expectedHttp: '200 OK when guard allows'
  }),
  Object.freeze({
    feature: 'Centro Previsão (forecasting)',
    chain: Object.freeze([
      Object.freeze({ layer: 'UI', ok: true, detail: 'CentroPrevisaoOperacional.jsx' }),
      Object.freeze({ layer: 'Route', ok: true, detail: '/app/centro-previsao-operacional' }),
      Object.freeze({ layer: 'api.js', ok: true, detail: 'forecasting.* (8+ methods)' }),
      Object.freeze({ layer: 'dashboard.js mount', ok: 'partial', detail: 'só projections/alerts/health' }),
      Object.freeze({ layer: 'Service', ok: true, detail: 'operationalForecastingService.js' }),
      Object.freeze({ layer: 'Data/Runtime', ok: 'partial', detail: 'painel semi-morto' })
    ]),
    breakAt: 'dashboard.js mount (partial)',
    expectedHttp: '200 for remaining endpoints after remount'
  })
]);

export function listBrokenChains() {
  return REG_CONNECTIVITY_MATRIX.filter((c) =>
    c.chain.some((l) => l.ok === false || l.ok === 'partial' || l.ok === 'conditional')
  );
}

export function validateConnectivityMatrix() {
  return {
    valid: REG_CONNECTIVITY_MATRIX.length >= 4,
    brokenChains: listBrokenChains().length,
    count: REG_CONNECTIVITY_MATRIX.length
  };
}
