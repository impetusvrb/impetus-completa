import React, { useMemo } from 'react';
import LogisticsHubShell from './LogisticsHubShell.jsx';
import { resolveLogisticsHubView } from './logisticsRuntimeHubAdapter.js';

export default function CognitiveLogisticsHub({ hubContext }) {
  const view = useMemo(() => resolveLogisticsHubView('cognitive', hubContext), [hubContext]);
  return <LogisticsHubShell title="IA contextual logística" hubKey="cognitive" view={view} />;
}
