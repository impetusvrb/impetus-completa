import React, { useEffect, useState } from 'react';
import { pushInspectionDelta, onInspectionRemoteSync } from '../realtime/qualityRealtimeSync.js';
import { isQualityRealtimeCollectionEnabled } from './qualityOperationalFeatureFlags.js';

export function QualityRealtimeCollection({ inspectionId }) {
  const [last, setLast] = useState(null);

  useEffect(() => {
    if (!isQualityRealtimeCollectionEnabled()) return;
    const off = onInspectionRemoteSync((data) => {
      if (data?.inspection_id === inspectionId) setLast(data);
    });
    return off;
  }, [inspectionId]);

  useEffect(() => {
    if (!isQualityRealtimeCollectionEnabled()) return;
    const id = setInterval(() => {
      pushInspectionDelta(inspectionId, { tick: Date.now() });
    }, 120000);
    return () => clearInterval(id);
  }, [inspectionId]);

  if (!isQualityRealtimeCollectionEnabled()) return null;

  return (
    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginBottom: 8 }}>
      Realtime: {last ? 'delta remoto' : 'local'}
    </div>
  );
}

export default QualityRealtimeCollection;
