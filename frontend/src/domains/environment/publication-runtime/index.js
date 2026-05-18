/**
 * ENVIRONMENT Publication Runtime — Etapa 6 (facade sobre navigation + enterprise guards).
 */
import { resolveEnvironmentNavigationPublication } from '../navigation/environmentNavigationResolver.js';

export {
  safeMergeEnvironmentPublicationIntoMenu,
  mergeEnvironmentPublicationIntoMenu
} from '../navigation/environmentMenuPublicationEngine.js';
export { fetchEnvironmentPublicationContext, invalidateEnvironmentPublicationCache } from '../navigation/environmentDomainPublicationRuntime.js';
export { resolveEnvironmentNavigationPublication } from '../navigation/environmentNavigationResolver.js';
export {
  resolveEnvironmentVisibilityContext,
  resolveVisibleEnvironmentManifestItems,
  isManifestItemVisible
} from '../navigation/environmentVisibilityResolver.js';
export { resolveEnvironmentAudienceBand, resolveEnvironmentUxDensity } from '../navigation/environmentAudienceNavigation.js';
export { ENVIRONMENT_PUBLICATION_MANIFEST } from './environmentPublicationManifest.js';
export { resolveEnvironmentCapabilities, ENVIRONMENT_CAPABILITY_MATRIX } from './environmentCapabilityResolver.js';
export { validateEnvironmentContextualUx } from './environmentContextualUxValidation.js';
export { runEnvironmentPublicationPipelineCheck } from './environmentPublicationPipelineCheck.js';

export function environmentOperationalNavigationRuntime(ctx) {
  return resolveEnvironmentNavigationPublication(ctx);
}

export function environmentExecutiveNavigationRuntime(ctx) {
  const pub = resolveEnvironmentNavigationPublication(ctx);
  return {
    ...pub,
    items: (pub.menuItems || []).filter((m) =>
      ['environment_executive', 'environment_sustainability', 'environment_carbon', 'environment_intelligence'].includes(
        m.id
      )
    )
  };
}
