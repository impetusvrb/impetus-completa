/**
 * UX-001 — Adaptador Environment (read-only resolver existente).
 */
import { Leaf, Activity, Shield } from 'lucide-react';
import { resolveEnvironmentNavigationPublication } from '../../../domains/environment/navigation/environmentNavigationResolver.js';
import { isPresentationDomainAllowed } from '../domainNavigationResolver.js';

const ICON_BY_ID = {
  environment_operational: Leaf,
  environment_telemetry: Activity,
  environment_governance: Shield,
  environment_executive: Leaf,
  environment_widgets_only: Leaf
};

/**
 * @param {object} ctx
 * @returns {import('../presentationNavigationRegistry.js').PresentationSection|null}
 */
export function buildEnvironmentPresentationSection(ctx) {
  if (!isPresentationDomainAllowed('environment', ctx)) return null;
  const pub = resolveEnvironmentNavigationPublication({
    user: ctx.user,
    visibleModules: ctx.visibleModules,
    serverPublication: ctx.environmentPublication || ctx.serverPublication?.environment || null
  });
  if (!pub.shouldPublishMenu || !pub.menuItems?.length) return null;

  return {
    domainId: 'environment',
    title: 'MEIO AMBIENTE',
    items: pub.menuItems.map((m) => ({
      id: `environment_${m.id}`,
      label: m.label,
      path: m.path,
      icon: ICON_BY_ID[m.id] || Leaf
    }))
  };
}
