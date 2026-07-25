/**
 * UX-001 — Adaptador Quality (read-only resolver existente).
 */
import { Shield, ClipboardList, Activity, Brain } from 'lucide-react';
import { resolveQualityNavigationPublication } from '../../../domains/quality/navigation/qualityNavigationResolver.js';
import { isPresentationDomainAllowed } from '../domainNavigationResolver.js';

const ICON_BY_ID = {
  quality_operational: ClipboardList,
  quality_inspections: ClipboardList,
  quality_ncr_workspace: Shield,
  quality_spc_governance: Shield,
  quality_supplier: Shield,
  quality_telemetry: Activity,
  quality_cognitive: Brain,
  quality_rollout: Shield,
  quality_executive: Shield,
  quality_widgets_only: ClipboardList
};

/**
 * @param {object} ctx
 * @returns {import('../presentationNavigationRegistry.js').PresentationSection|null}
 */
export function buildQualityPresentationSection(ctx) {
  if (!isPresentationDomainAllowed('quality', ctx)) return null;
  const pub = resolveQualityNavigationPublication({
    user: ctx.user,
    visibleModules: ctx.visibleModules,
    serverPublication: ctx.qualityPublication || ctx.serverPublication?.quality || null
  });
  if (!pub.shouldPublishMenu || !pub.menuItems?.length) return null;

  return {
    domainId: 'quality',
    title: 'QUALIDADE',
    items: pub.menuItems.map((m) => ({
      id: `quality_${m.id}`,
      label: m.label,
      path: m.path,
      icon: ICON_BY_ID[m.id] || Shield
    }))
  };
}
