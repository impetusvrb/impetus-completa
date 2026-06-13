/**
 * AIOI-P5.9 — Executive Portal Readiness Service (READ ONLY · consolidação soberana)
 *
 * Certifica o Portal Executivo como unidade coesa antes da integração Router (P6.0).
 * Não cria módulos, APIs, view models ou capacidades de negócio.
 */

import { validatePortalNavigation } from './ExecutivePortalNavigationValidator.js';
import {
  PORTAL_MODULE_REGISTRY,
  validateGatewayConsistency,
  validateCacheConsistency,
  validateViewModelConsistency,
  validatePortalModuleComposition
} from './ExecutivePortalConsistencyValidator.js';
import { buildPortalHealthModel } from './ExecutivePortalHealthValidator.js';

/**
 * @param {{ inspectSource?: (relativePath: string) => string }} [options]
 * @returns {object}
 */
export function assessExecutivePortalReadiness(options = {}) {
  const { inspectSource } = options;

  const navigation = validatePortalNavigation();

  let gateway = { ok: true, skipped: true, issues: [] };
  let cache = { ok: true, skipped: true, issues: [] };
  let viewModel = { ok: true, skipped: true, issues: [] };
  let composition = { ok: true, skipped: true, issues: [] };

  if (typeof inspectSource === 'function') {
    gateway = validateGatewayConsistency(inspectSource);
    cache = validateCacheConsistency(inspectSource);
    viewModel = validateViewModelConsistency(inspectSource);
    composition = validatePortalModuleComposition(inspectSource);
  }

  const modulesReady = navigation.activeSections;
  const modulesTotal = PORTAL_MODULE_REGISTRY.length;
  const checksOk =
    navigation.ok && gateway.ok && cache.ok && viewModel.ok && composition.ok;

  const health = buildPortalHealthModel({
    modulesReady,
    modulesTotal,
    checksOk
  });

  return {
    ...health,
    navigation,
    gateway,
    cache,
    viewModel,
    composition,
    modules: PORTAL_MODULE_REGISTRY.map((m) => ({
      id: m.id,
      label: m.label,
      phase: m.phase,
      ready: navigation.navigableSections.includes(m.id)
    }))
  };
}

/**
 * @param {{ inspectSource?: (relativePath: string) => string }} [options]
 * @returns {boolean}
 */
export function isExecutivePortalReady(options = {}) {
  return assessExecutivePortalReadiness(options).portal_ready;
}

export default assessExecutivePortalReadiness;
