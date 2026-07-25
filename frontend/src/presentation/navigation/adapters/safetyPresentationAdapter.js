/**
 * UX-001 — Adaptador Safety (read-only resolver existente).
 */
import { Shield, AlertTriangle, Activity } from 'lucide-react';
import { resolveSafetyNavigationPublication } from '../../../domains/safety/navigation/safetyNavigationResolver.js';
import { isPresentationDomainAllowed } from '../domainNavigationResolver.js';

const ICON_BY_ID = {
  safety_operational: Shield,
  safety_incidents: AlertTriangle,
  safety_telemetry: Activity,
  safety_governance: Shield,
  safety_widgets_only: Shield
};

/**
 * @param {object} ctx
 * @returns {import('../presentationNavigationRegistry.js').PresentationSection|null}
 */
export function buildSafetyPresentationSection(ctx) {
  if (!isPresentationDomainAllowed('safety', ctx)) return null;
  const pub = resolveSafetyNavigationPublication({
    user: ctx.user,
    visibleModules: ctx.visibleModules,
    serverPublication: ctx.safetyPublication || ctx.serverPublication?.safety || null
  });
  if (!pub.shouldPublishMenu || !pub.menuItems?.length) return null;

  return {
    domainId: 'safety',
    title: 'SEGURANÇA',
    items: pub.menuItems.map((m) => ({
      id: `safety_${m.id}`,
      label: m.label,
      path: m.path,
      icon: ICON_BY_ID[m.id] || Shield
    }))
  };
}
