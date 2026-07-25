/**
 * REG-001 — Registry Audit (Navigation / Domain / EOX / Cognitive / Module).
 */
export const REG_REGISTRY_AUDIT = Object.freeze([
  Object.freeze({
    registry: 'EOX_DOMAIN_REGISTRY',
    location: 'frontend/src/presentation/eox/eoxRegistry.js',
    financeEntry: 'active: false, /app/finance PLANNED',
    impactOnSuspects: 'none_direct',
    note: 'EOX afecta hubs Quality/Safety/Environment/Logistics — não os 4 paths legacy /app/*'
  }),
  Object.freeze({
    registry: 'OPERATIONAL_DOMAIN_REGISTRY',
    location: 'frontend/src/presentation/eox/eoxRegistry.js (alias)',
    impactOnSuspects: 'none_direct'
  }),
  Object.freeze({
    registry: 'contextualModules.moduleRegistry',
    location: 'backend/src/contextualModules/moduleRegistry.js',
    entries: Object.freeze(['financial_intelligence', 'cost_center', 'losses_map', 'centro_previsao_operacional']),
    impactOnSuspects: 'sidebar_paths_correct',
    note: 'losses_map → /app/mapa-vazamento-financeiro — path OK; API gap downstream'
  }),
  Object.freeze({
    registry: 'domainAuthority.domainRegistry',
    location: 'backend/src/domainAuthority/registry/domainRegistry.js',
    financePipelines: Object.freeze(['financial_intelligence', 'cost_center', 'budget', 'cashflow']),
    impactOnSuspects: 'metadata_only',
    inconsistency: 'budget/cashflow declared without runtime'
  }),
  Object.freeze({
    registry: 'CPL Cognitive Platform Registry',
    location: 'frontend/src/platform/cognitive/registry/',
    impactOnSuspects: 'none',
    note: 'CPL-001/002/003 não montam rotas HTTP dashboard — não causa directa dos gaps'
  }),
  Object.freeze({
    registry: 'useVisibleModules / CEO_STABLE_MENU_PATHS',
    location: 'frontend/src/hooks/useVisibleModules.js',
    impactOnSuspects: 'menu_visibility',
    note: 'CEO menu estável inclui os 4 paths — UI aparece; dados/guards falham depois'
  }),
  Object.freeze({
    registry: 'CenterWidget.ROUTES',
    location: 'frontend/src/features/dashboard/widgets/CenterWidget.jsx',
    mapped: Object.freeze([
      'center_predictions',
      'industrial_map',
      'cost_center',
      'leak_map',
      'central_ai'
    ]),
    missing: Object.freeze(['cerebro_operacional', 'insights']),
    inconsistency: 'ids sem mapa → dead click (path=#)'
  }),
  Object.freeze({
    registry: 'Layout vs App industrial guard',
    location: 'Layout.jsx vs App.jsx',
    inconsistency: 'canAccessIndustrialCoreModules ≠ canAccessIndustrialCore',
    impactOnSuspects: 'mapa_industrial, operational_insights, cerebro_operacional',
    severity: 'high'
  })
]);

export function listRegistryInconsistencies() {
  return REG_REGISTRY_AUDIT.filter((r) => r.inconsistency || r.missing?.length);
}

export function validateRegistryAudit() {
  return {
    valid: REG_REGISTRY_AUDIT.length >= 6,
    inconsistencies: listRegistryInconsistencies().length,
    count: REG_REGISTRY_AUDIT.length
  };
}
