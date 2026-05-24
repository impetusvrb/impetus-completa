import { useEffect, useMemo, useState } from 'react';

export default function useOperationalNervousSystemData(payload) {
  const [snapshot, setSnapshot] = useState(payload || null);

  useEffect(() => {
    setSnapshot(payload || null);
  }, [payload]);

  return useMemo(() => {
    const sz4 = snapshot || {};
    return {
      available: !!snapshot,
      stage: sz4.stage || 'SZ4_SHADOW',
      assistive_only: sz4.assistive_only !== false,
      continuity: sz4.continuity || null,
      tasks: Array.isArray(sz4.tasks) ? sz4.tasks : [],
      workflows: Array.isArray(sz4.workflows) ? sz4.workflows : [],
      reminders: Array.isArray(sz4.reminders) ? sz4.reminders : [],
      awareness: sz4.awareness || null,
      observation: sz4.observation || null,
      reintegration: sz4.reintegration || null,
      governance: sz4.governance || null,
      metrics: sz4.metrics || null,
      voice_identity: sz4.voice_identity || null
    };
  }, [snapshot]);
}
