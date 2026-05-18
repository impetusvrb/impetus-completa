import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useOfflineStatus } from '../../../../offline/useOfflineStatus.js';
import { isEnvironmentOfflineRuntimeEnabled } from '../environmentOperationalFeatureFlags.js';
import { syncEnvironmentOfflineQueue, environmentOfflineQueueDepth } from '../../offline/environmentOfflineSync.js';
import { environmentOperational } from '../../../../services/api.js';
import { labelStyle } from './operationalUi.js';

export function EnvironmentOfflineRuntime({ companyId: companyIdProp }) {
  const ctx = useOutletContext() || {};
  const companyId = companyIdProp ?? ctx.companyId;
  const { isOnline, queueSize, drainQueue } = useOfflineStatus();
  const [qDepth, setQDepth] = useState(0);

  const refresh = useCallback(async () => {
    if (!isEnvironmentOfflineRuntimeEnabled()) return;
    setQDepth(await environmentOfflineQueueDepth(companyId));
  }, [companyId]);

  useEffect(() => {
    refresh();
  }, [refresh, queueSize]);

  useEffect(() => {
    if (!isEnvironmentOfflineRuntimeEnabled() || !isOnline) return;
    (async () => {
      try {
        await environmentOperational.publishEvent({
          event_name: 'environment.offline.sync_started',
          payload: { scope: 'environment_operational' }
        });
      } catch {
        /* ignore */
      }
      await syncEnvironmentOfflineQueue(companyId);
      await drainQueue?.();
      try {
        await environmentOperational.publishEvent({
          event_name: 'environment.offline.sync_completed',
          payload: { scope: 'environment_operational' }
        });
      } catch {
        /* ignore */
      }
      await refresh();
    })();
  }, [companyId, isOnline, drainQueue, refresh]);

  if (!isEnvironmentOfflineRuntimeEnabled() || !companyId) return null;

  return (
    <div className="impetus-card" style={{ borderRadius: 4, padding: 10, marginTop: 12, borderLeft: `3px solid ${isOnline ? 'var(--green)' : 'var(--amber)'}` }}>
      <div style={labelStyle}>Fila offline ambiental</div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
        {isOnline ? 'Online' : 'Offline'} · fila: {qDepth}
      </p>
    </div>
  );
}
