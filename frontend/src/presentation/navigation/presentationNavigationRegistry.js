/**
 * UX-001 / NAV-001 — Presentation Navigation Registry (context-aware domains).
 */
import { buildLogisticsWmsPresentationSection } from './adapters/logisticsWmsPresentationAdapter.js';
import { buildSupplyPresentationSection } from './adapters/supplyPresentationAdapter.js';
import { buildQualityPresentationSection } from './adapters/qualityPresentationAdapter.js';
import { buildSafetyPresentationSection } from './adapters/safetyPresentationAdapter.js';
import { buildEnvironmentPresentationSection } from './adapters/environmentPresentationAdapter.js';
import { resolveAllowedPresentationDomains } from './domainNavigationResolver.js';
import { resolveSidebarNavigationContext } from './sidebarContextResolver.js';

export const PRESENTATION_NAV_REGISTRY_ID = 'UX-001-presentation-navigation';
export const PRESENTATION_NAV_PHASE = 'NAV-001';

/** @typedef {{ domainId: string, title: string, items: Array<{ id: string, label: string, path: string, icon?: import('react').ComponentType }> }} PresentationSection */

const BUILDER_BY_DOMAIN = Object.freeze({
  logistics_wms: buildLogisticsWmsPresentationSection,
  supply: buildSupplyPresentationSection,
  quality: buildQualityPresentationSection,
  safety: buildSafetyPresentationSection,
  environment: buildEnvironmentPresentationSection
});

/**
 * @param {object} ctx
 * @param {object|null} [ctx.user]
 * @param {string[]} [ctx.visibleModules]
 * @param {object|null} [ctx.serverPublication]
 * @param {boolean} [ctx.suppressDomainSections]
 */
export function buildPresentationNavigationSections(ctx = {}) {
  const navCtx = resolveSidebarNavigationContext(ctx);
  if (navCtx.suppressDomainSections) return [];

  const allowed = new Set(resolveAllowedPresentationDomains(ctx));
  if (!allowed.size) return [];

  /** @type {PresentationSection[]} */
  const sections = [];
  for (const domainId of allowed) {
    const build = BUILDER_BY_DOMAIN[domainId];
    if (!build) continue;
    try {
      const section = build(ctx);
      if (section && Array.isArray(section.items) && section.items.length > 0) {
        sections.push(section);
      }
    } catch {
      /* fail-closed por domínio */
    }
  }
  return Object.freeze(sections);
}

export function listPresentationRegistryDomains() {
  return Object.freeze(['logistics_wms', 'supply', 'quality', 'safety', 'environment']);
}
