import React, { useMemo } from 'react';
import LogisticsHubShell from './LogisticsHubShell.jsx';
import { resolveLogisticsHubView } from './logisticsRuntimeHubAdapter.js';

export default function WarehouseTelemetryHub({ hubContext }) {
  const view = useMemo(() => resolveLogisticsHubView('telemetry', hubContext), [hubContext]);
  return <LogisticsHubShell title="Telemetria docas" hubKey="telemetry" view={view} />;
}
