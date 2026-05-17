import { isLogisticsOperationalRuntimeEnabled } from '../operational-runtime/logisticsOperationalFeatureFlags.js';
import {
  isLogisticsNavigationRuntimeEnabled,
  isLogisticsPublicationRuntimeEnabled
} from './logisticsPublicationFeatureFlags.js';
import { noteLogisticsNavigationDenied } from '../../../observability/logisticsOperationalTelemetry.js';

export function assertLogisticsRouteAccess(ctx = {}) {
  if (!isLogisticsOperationalRuntimeEnabled()) {
    noteLogisticsNavigationDenied('operational_off');
    return { allowed: false, reason: 'operational_runtime_off' };
  }
  const pubOn = isLogisticsNavigationRuntimeEnabled() && isLogisticsPublicationRuntimeEnabled();
  if (!pubOn && ctx.requirePublication) {
    noteLogisticsNavigationDenied('publication_off');
    return { allowed: false, reason: 'publication_runtime_off' };
  }
  return { allowed: true, reason: null };
}
