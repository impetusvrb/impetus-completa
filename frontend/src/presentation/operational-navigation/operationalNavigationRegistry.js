/**
 * NAV-002 — Re-export compat; registo canónico em eoxRegistry.js (ARC-003).
 */
export {
  EOX_DOMAIN_REGISTRY,
  OPERATIONAL_DOMAIN_REGISTRY,
  LOGISTICS_MODULE_PHASES,
  buildEoxNavigationConfig,
  buildOperationalNavigationConfig,
  resolveLogisticsOperationalNavigation,
  resolveLogisticsHubNavigation,
  resolveQualityOperationalNavigation,
  resolveSafetyOperationalNavigation,
  resolveEnvironmentOperationalNavigation,
  resolveProductionOperationalNavigation
} from '../eox/eoxRegistry.js';
