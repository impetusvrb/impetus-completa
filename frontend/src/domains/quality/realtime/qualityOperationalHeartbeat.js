/**
 * Heartbeat operacional — bounded (não promove authority).
 */
import { emitOperationalPresence } from './qualityPresenceRuntime.js';
import { isQualityRealtimeCollectionEnabled } from '../operational-runtime/qualityOperationalFeatureFlags.js';

export function startQualityOperationalHeartbeat(ctx, intervalMs = 60000) {
  if (!isQualityRealtimeCollectionEnabled()) return () => {};
  const id = setInterval(() => {
    emitOperationalPresence({
      stationId: ctx.stationId,
      userId: ctx.userId,
      state: 'heartbeat'
    });
  }, intervalMs);
  return () => clearInterval(id);
}
