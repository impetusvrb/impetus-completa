import { ENVIRONMENT_CAPABILITY_MATRIX } from './environmentCapabilityMatrix.js';

export { ENVIRONMENT_CAPABILITY_MATRIX };
import {
  getEnvironmentPublicationFlagSnapshot,
  isEnvironmentExecutiveVisibilityEnabled,
  isEnvironmentGovernanceVisibilityEnabled,
  isEnvironmentOperationalVisibilityEnabled,
  isEnvironmentPublicationRuntimeEnabled,
  isEnvironmentNavigationRuntimeEnabled
} from '../navigation/environmentPublicationFeatureFlags.js';

export function resolveEnvironmentCapabilities(ctx = {}) {
  const flags = getEnvironmentPublicationFlagSnapshot();
  const moduleLicensed =
    ctx.hasEnvironmentIntelligenceModule !== false &&
    (ctx.visibleModules || []).includes('environment_intelligence');
  const navOn = isEnvironmentNavigationRuntimeEnabled() && isEnvironmentPublicationRuntimeEnabled();
  const granted = {};

  for (const key of Object.keys(ENVIRONMENT_CAPABILITY_MATRIX)) {
    let allowed = moduleLicensed && navOn;
    if (key === 'environment_intelligence') allowed = moduleLicensed;
    else if (key === 'environment_operational') allowed = allowed && isEnvironmentOperationalVisibilityEnabled();
    else if (key === 'environment_governance' || key === 'environment_telemetry')
      allowed = allowed && isEnvironmentGovernanceVisibilityEnabled();
    else if (key === 'environment_cognitive') allowed = allowed && flags.governance_visible;
    else if (key === 'environment_executive') allowed = allowed && isEnvironmentExecutiveVisibilityEnabled();
    if (ctx.rollout_shadow) {
      if (key === 'environment_executive' || key === 'environment_cognitive') allowed = false;
    }
    granted[key] = allowed;
  }

  return { capabilities: granted, moduleLicensed, flags, assistive_only: true };
}
