/**
 * NAV-002 — Compat layer sobre ARC-003 EOX (não remover — certificado).
 */
export { default as OperationalNavigationHeader } from './OperationalNavigationHeader.jsx';
export { default as OperationalModuleShell } from './OperationalModuleShell.jsx';
export {
  useLogisticsOperationalNavigation,
  useQualityOperationalNavigation,
  useSafetyOperationalNavigation,
  useEnvironmentOperationalNavigation,
  useLogisticsHubNavigation
} from '../eox/useEoxNavigation.js';
export {
  OPERATIONAL_DOMAIN_REGISTRY,
  LOGISTICS_MODULE_PHASES,
  resolveLogisticsOperationalNavigation,
  resolveQualityOperationalNavigation,
  resolveSafetyOperationalNavigation,
  resolveEnvironmentOperationalNavigation,
  buildOperationalNavigationConfig
} from '../eox/eoxRegistry.js';
export { parseOperationalDeepLink, buildOperationalDeepLinkHref } from './operationalNavigationDeepLink.js';
export { ONX_PHASE, IMPETUS_ROOT, COGNITIVE_CENTER_ROOT } from './operationalNavigationTokens.js';
export { OnxNavigationContext, useOnxNavigation } from '../eox/EoxNavigationContext.jsx';
