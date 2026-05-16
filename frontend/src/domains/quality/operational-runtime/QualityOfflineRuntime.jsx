import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useOfflineStatus } from '../../../offline/useOfflineStatus.js';
import { isQualityOfflineRuntimeEnabled } from './qualityOperationalFeatureFlags.js';
import { syncQualityOfflineQueue, qualityOfflineQueueDepth } from '../offline/qualityOfflineSync.js';
import { qualityOperational } from '../../../services/api.js';

export function QualityOfflineRuntime({ companyId: companyIdProp }) {
  const ctx = useOutletContext() || {};
  const companyId = companyIdProp ?? ctx.companyId;
  const { isOnline, queueSize, drainQueue } = useOfflineStatus();
  const [qDepth, setQDepth] = useState(0);

  const refresh = useCallback(async () => {
    if (!isQualityOfflineRuntimeEnabled()) return;
    setQDepth(await qualityOfflineQueueDepth(companyId));
  }, [companyId]);

  useEffect(() => {
    refresh();
  }, [refresh, queueSize]);

  useEffect(() => {
    if (!isQualityOfflineRuntimeEnabled() || !isOnline) return;
    (async () => {
      try {
        await qualityOperational.publishEvent({
          event_name: 'quality.offline.sync_started',
          payload: { scope: 'quality_operational' }
        });
      } catch {
        /* ignore */
      }
      await syncQualityOfflineQueue(companyId);
      await drainQueue?.();
      try {
        await qualityOperational.publishEvent({
          event_name: 'quality.offline.sync_completed',
          payload: { scope: 'quality_operational' }
        });
      } catch {
        /* ignore */
      }
      await refresh();
    })();
  }, [companyId, isOnline, drainQueue, refresh]);

  if (!isQualityOfflineRuntimeEnabled()) return null;

  if (!companyId) return null;

  return (
    <div className="impetus-card" style={{ borderRadius: 4, padding: 10, borderLeft: `3px solid ${isOnline ? 'var(--green)' : 'var(--amber)'}` }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
        Offline queue (qualidade): <strong style={{ color: 'var(--cyan)' }}>{qDepth}</strong> · rede: {isOnline ? 'online' : 'degradada'}
      </div>
    </div>
  );
}

export default QualityOfflineRuntime;
