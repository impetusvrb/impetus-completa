import React, { useMemo } from 'react';
import LogisticsHubShell from './LogisticsHubShell.jsx';
import { resolveLogisticsHubView } from './logisticsRuntimeHubAdapter.js';

export default function InventoryCognitiveHub({ hubContext }) {
  const view = useMemo(() => resolveLogisticsHubView('inventory_cognitive', hubContext), [hubContext]);
  return <LogisticsHubShell title="Inventário cognitivo" hubKey="inventory_cognitive" view={view} />;
}
