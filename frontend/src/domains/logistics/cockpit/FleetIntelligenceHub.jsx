import React, { useMemo } from 'react';
import LogisticsHubShell from './LogisticsHubShell.jsx';
import { resolveLogisticsHubView } from './logisticsRuntimeHubAdapter.js';

export default function FleetIntelligenceHub({ hubContext }) {
  const view = useMemo(() => resolveLogisticsHubView('fleet', hubContext), [hubContext]);
  return <LogisticsHubShell title="Inteligência frota" hubKey="fleet" view={view} />;
}
