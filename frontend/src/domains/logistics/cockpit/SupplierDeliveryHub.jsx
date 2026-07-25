import React, { useMemo } from 'react';
import LogisticsHubShell from './LogisticsHubShell.jsx';
import { resolveLogisticsHubView } from './logisticsRuntimeHubAdapter.js';

export default function SupplierDeliveryHub({ hubContext }) {
  const view = useMemo(() => resolveLogisticsHubView('supplier', hubContext), [hubContext]);
  return <LogisticsHubShell title="Fornecedores / rastreio" hubKey="supplier" view={view} />;
}
