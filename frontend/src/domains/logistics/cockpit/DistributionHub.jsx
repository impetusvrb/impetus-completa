import React, { useMemo } from 'react';
import LogisticsHubShell from './LogisticsHubShell.jsx';
import { resolveLogisticsHubView } from './logisticsRuntimeHubAdapter.js';

export default function DistributionHub({ hubContext }) {
  const view = useMemo(() => resolveLogisticsHubView('distribution', hubContext), [hubContext]);
  return <LogisticsHubShell title="Expedição / OTIF" hubKey="distribution" view={view} />;
}
