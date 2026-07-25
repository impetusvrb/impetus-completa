/**
 * UX-001 — Merge unified presentation navigation into sidebar menu.
 */
import { buildPresentationNavigationSections } from './presentationNavigationRegistry.js';

const PUBLICATION_MARKERS = [
  '_quality_publication',
  '_safety_publication',
  '_logistics_publication',
  '_environment_publication'
];

function _isPublicationFlatItem(item) {
  if (!item || typeof item !== 'object') return false;
  return PUBLICATION_MARKERS.some((k) => item[k]);
}

function _sectionToNavItems(section) {
  return section.items.map((it) => ({
    path: it.path,
    icon: it.icon,
    label: it.label,
    _presentation_layer: true,
    _presentation_domain: section.domainId,
    _presentation_id: it.id
  }));
}

/**
 * Reorganiza menu com secções por domínio (Presentation Layer only).
 * Remove entradas flat duplicadas das publication engines quando secção UX-001 activa.
 *
 * @param {Array<object>} menuItems
 * @param {object} ctx
 */
export function mergePresentationNavigationIntoMenu(menuItems, ctx = {}) {
  if (!Array.isArray(menuItems)) return menuItems;

  const sections = buildPresentationNavigationSections(ctx);
  if (!sections.length) return menuItems;

  const coveredDomains = new Set(sections.map((s) => s.domainId));
  const stripPublication =
    coveredDomains.has('quality') ||
    coveredDomains.has('safety') ||
    coveredDomains.has('environment') ||
    coveredDomains.has('logistics_wms');

  const base = stripPublication ? menuItems.filter((it) => !_isPublicationFlatItem(it)) : menuItems.slice();

  const insertAt = (() => {
    const idx = base.findIndex((it) => String(it.path || '').replace(/\/+$/, '') === '/app');
    return idx >= 0 ? idx + 1 : base.length;
  })();

  /** @type {Array<object>} */
  const presentationBlock = [];
  for (const section of sections) {
    presentationBlock.push({
      presentationType: 'divider',
      _presentation_id: `div-${section.domainId}`
    });
    presentationBlock.push({
      presentationType: 'section-header',
      label: section.title,
      _presentation_id: `hdr-${section.domainId}`
    });
    presentationBlock.push(..._sectionToNavItems(section));
  }

  const out = base.slice();
  out.splice(insertAt, 0, ...presentationBlock);
  return out;
}

export function safeMergePresentationNavigationIntoMenu(menuItems, ctx) {
  try {
    return mergePresentationNavigationIntoMenu(menuItems, ctx);
  } catch {
    return menuItems;
  }
}
