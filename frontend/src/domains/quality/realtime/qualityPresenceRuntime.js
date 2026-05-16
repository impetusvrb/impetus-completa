/**
 * Presença operacional (emit only — servidor deve interpretar em modo observe).
 */
import { emitQualityOperational } from './qualityRealtimeChannel.js';
import { isQualityRealtimeCollectionEnabled } from '../operational-runtime/qualityOperationalFeatureFlags.js';

export function emitOperationalPresence({ stationId, userId, state }) {
  if (!isQualityRealtimeCollectionEnabled()) return;
  emitQualityOperational('quality_operational_presence', {
    station_id: stationId,
    user_id: userId,
    state: state || 'active',
    ts: new Date().toISOString()
  });
}
