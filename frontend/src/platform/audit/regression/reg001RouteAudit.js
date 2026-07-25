/**
 * REG-001 — Route Audit (read-only).
 */
export const REG_ROUTE_AUDIT = Object.freeze({
  reactRoutesVerified: Object.freeze([
    Object.freeze({
      path: '/app/mapa-vazamento-financeiro',
      file: 'frontend/src/App.jsx',
      lazy: true,
      component: 'MapaVazamentoFinanceiro',
      guard: 'CEORouteGuard',
      status: 'mounted'
    }),
    Object.freeze({
      path: '/app/centro-operacoes-industrial',
      file: 'frontend/src/App.jsx',
      lazy: true,
      component: 'IndustrialOperationsCenter',
      guard: 'canAccessIndustrialCore()',
      status: 'mounted'
    }),
    Object.freeze({
      path: '/app/monitored-points',
      file: 'frontend/src/App.jsx',
      note: 'alias → IndustrialOperationsCenter',
      status: 'mounted'
    }),
    Object.freeze({
      path: '/app/insights',
      file: 'frontend/src/App.jsx',
      component: 'InsightsPage',
      guard: 'canAccessIndustrialCore()',
      status: 'mounted'
    }),
    Object.freeze({
      path: '/app/cerebro-operacional',
      file: 'frontend/src/App.jsx',
      component: 'OperationalIntelligencePanel',
      guard: 'canAccessIndustrialCore()',
      status: 'mounted'
    }),
    Object.freeze({
      path: '/app/industrial',
      file: null,
      status: 'orphan_reference',
      note: 'Referenciado em KPIs — sem <Route>'
    })
  ]),

  backendRoutesVerified: Object.freeze([
    Object.freeze({
      path: '/api/dashboard/financial-leakage/*',
      mountFile: 'backend/src/routes/dashboard.js',
      status: 'not_mounted',
      serviceExists: true
    }),
    Object.freeze({
      path: '/api/dashboard/industrial/*',
      mountFile: 'backend/src/routes/dashboard.js',
      status: 'not_mounted',
      serviceExists: true,
      service: 'industrialOperationalMapService.js'
    }),
    Object.freeze({
      path: '/api/dashboard/operational-brain/*',
      mountFile: 'backend/src/routes/dashboard.js → dashboardOperationalBrain.js',
      status: 'mounted',
      serviceExists: true
    }),
    Object.freeze({
      path: '/api/dashboard/insights',
      mountFile: 'backend/src/routes/dashboard.js',
      status: 'mounted',
      serviceExists: true
    }),
    Object.freeze({
      path: '/api/dashboard/forecasting/*',
      mountFile: 'backend/src/routes/dashboard.js',
      status: 'partial',
      mounted: Object.freeze(['projections', 'alerts', 'health']),
      missing: Object.freeze([
        'simulation',
        'ask',
        'extended-projections',
        'profit-loss',
        'critical-factors',
        'simulate-decision',
        'config'
      ])
    }),
    Object.freeze({
      path: '/api/dashboard/costs/*',
      mountFile: 'backend/src/routes/dashboard.js',
      status: 'mounted',
      note: 'FIN-AUD-001 — intacto'
    })
  ]),

  conflicts: Object.freeze([
    Object.freeze({
      id: 'industrial_core_guard_divergence',
      description:
        'Layout.jsx canAccessIndustrialCoreModules (operational + ceo|diretor) ≠ App.jsx canAccessIndustrialCore (diretor só se profile/area industrial)',
      impact: 'Click menu → Navigate to /app — parece dead click',
      type: 'rbac_guard_mismatch'
    })
  ]),

  orphanRoutes: Object.freeze(['/app/industrial']),
  duplicateAliases: Object.freeze([
    Object.freeze({
      paths: ['/app/centro-operacoes-industrial', '/app/monitored-points'],
      component: 'IndustrialOperationsCenter'
    })
  ])
});

export function listUnmountedBackendRoutes() {
  return REG_ROUTE_AUDIT.backendRoutesVerified.filter(
    (r) => r.status === 'not_mounted' || r.status === 'partial'
  );
}

export function validateRouteAudit() {
  const unmounted = listUnmountedBackendRoutes();
  return {
    valid: unmounted.length >= 2,
    issues: [],
    reactCount: REG_ROUTE_AUDIT.reactRoutesVerified.length,
    backendGaps: unmounted.length,
    conflicts: REG_ROUTE_AUDIT.conflicts.length
  };
}
