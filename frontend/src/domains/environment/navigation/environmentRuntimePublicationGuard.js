import { isEnvironmentOperationalRuntimeEnabled } from '../operational-runtime/environmentOperationalFeatureFlags.js';
import {
  isEnvironmentNavigationRuntimeEnabled,
  isEnvironmentPublicationRuntimeEnabled
} from './environmentPublicationFeatureFlags.js';
import { noteEnvironmentNavigationDenied } from '../../../observability/environmentOperationalTelemetry.js';

export function assertEnvironmentRouteAccess(ctx = {}) {
  if (!isEnvironmentOperationalRuntimeEnabled()) {
    noteEnvironmentNavigationDenied('operational_off');
    return { allowed: false, reason: 'operational_runtime_off' };
  }
  const pubOn = isEnvironmentNavigationRuntimeEnabled() && isEnvironmentPublicationRuntimeEnabled();
  if (!pubOn && ctx.requirePublication) {
    noteEnvironmentNavigationDenied('publication_off');
    return { allowed: false, reason: 'publication_runtime_off' };
  }
  return { allowed: true, reason: null };
}
