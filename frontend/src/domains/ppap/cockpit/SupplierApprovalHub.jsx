import React, { useMemo } from 'react';
import PpapHubShell from './PpapHubShell.jsx';
import { resolvePpapHubView } from './ppapRuntimeHubAdapter.js';

export default function SupplierApprovalHub({ hubContext }) {
  const view = useMemo(() => resolvePpapHubView('supplier_approval', hubContext), [hubContext]);
  return <PpapHubShell title="Aprovação Fornecedor" hubKey="supplier_approval" view={view} />;
}
