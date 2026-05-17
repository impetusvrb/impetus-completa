import { publicationFramework } from '../../../shared/domain-publication/frameworkBridge.js';

/**
 * Score 0–100 de prontidão para publicação (cliente ecoa backend).
 */
export function scorePublicationReadiness(ctx = {}) {
  const r = publicationFramework.evaluatePublicationReadiness({
    operationalRuntime: !!ctx.operational,
    navigationRuntime: !!ctx.navigation,
    publicationRuntime: !!ctx.publication,
    moduleLicensed: ctx.moduleLicensed !== false,
    tenantId: ctx.tenantId || null
  });
  const penalties = r.reasons.length * 18;
  return {
    score: Math.max(0, 100 - penalties),
    ready: r.ready,
    reasons: r.reasons
  };
}
