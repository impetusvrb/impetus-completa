import React, { useMemo } from 'react';
import PpapHubShell from './PpapHubShell.jsx';
import { resolvePpapHubView } from './ppapRuntimeHubAdapter.js';

export default function CapabilityHub({ hubContext }) {
  const view = useMemo(() => resolvePpapHubView('capability', hubContext), [hubContext]);
  return <PpapHubShell title="Capacidade de Processo" hubKey="capability" view={view} />;
}
