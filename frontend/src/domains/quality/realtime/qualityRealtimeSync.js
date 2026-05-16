/**
 * Sincronização leve inspeção ↔ canal unificado (shadow, sem authority).
 */
import { emitQualityOperational, subscribeQualityOperations } from './qualityRealtimeChannel.js';
import { isQualityRealtimeCollectionEnabled } from '../operational-runtime/qualityOperationalFeatureFlags.js';

export function pushInspectionDelta(inspectionId, patch) {
  if (!isQualityRealtimeCollectionEnabled()) return;
  emitQualityOperational('quality_inspection_delta', {
    inspection_id: inspectionId,
    patch,
    ts: new Date().toISOString()
  });
}

export function onInspectionRemoteSync(handler) {
  return subscribeQualityOperations((msg) => {
    if (msg?.event === 'quality_inspection_delta') handler(msg.data);
  });
}
