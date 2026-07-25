import React, { useMemo } from 'react';
import LogisticsHubShell from './LogisticsHubShell.jsx';
import { resolveLogisticsHubView } from './logisticsRuntimeHubAdapter.js';

export default function WarehouseGovernanceHub({ hubContext }) {
  const view = useMemo(() => resolveLogisticsHubView('warehouse_governance', hubContext), [hubContext]);
  return <LogisticsHubShell title="Governança WMS" hubKey="warehouse_governance" view={view} />;
}
