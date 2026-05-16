/**
 * Canal realtime qualidade — isolado do chat; emite heartbeats operacionais opcionais.
 */
import { subscribeToTopic, emitUnified, initUnifiedChannel, getUnifiedSocket } from '../../../realtime/unifiedChannelManager.js';
import { REALTIME_TOPIC } from '../../../realtime/realtimeTopics.js';
import { isQualityRealtimeCollectionEnabled } from '../operational-runtime/qualityOperationalFeatureFlags.js';
import { noteQualityUnifiedReconnect } from '../../../observability/qualityOperationalTelemetry.js';

function bindQualityReconnectTelemetryOnce() {
  if (bindQualityReconnectTelemetryOnce._done) return;
  const socket = getUnifiedSocket();
  if (!socket || !socket.io) {
    bindQualityReconnectTelemetryOnce._attempts = (bindQualityReconnectTelemetryOnce._attempts || 0) + 1;
    if (bindQualityReconnectTelemetryOnce._attempts < 24) {
      queueMicrotask(() => bindQualityReconnectTelemetryOnce());
    }
    return;
  }
  bindQualityReconnectTelemetryOnce._done = true;
  socket.io.on('reconnect', () => {
    try {
      noteQualityUnifiedReconnect();
    } catch {
      /* ignore */
    }
  });
}

export function subscribeQualityOperations(handler) {
  if (!isQualityRealtimeCollectionEnabled()) return () => {};
  const unsub = subscribeToTopic(REALTIME_TOPIC.QUALITY_OPERATIONS, handler);
  initUnifiedChannel();
  queueMicrotask(() => bindQualityReconnectTelemetryOnce());
  return unsub;
}

export function emitQualityOperational(event, data) {
  if (!isQualityRealtimeCollectionEnabled()) return;
  emitUnified(event, { layer: 'operational_quality', ...data });
}

export function ensureQualityChannel() {
  if (!isQualityRealtimeCollectionEnabled()) return null;
  return initUnifiedChannel();
}
