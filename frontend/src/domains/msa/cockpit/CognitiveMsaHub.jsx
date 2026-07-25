import React, { useMemo } from 'react';
import MsaHubShell from './MsaHubShell.jsx';
import { resolveMsaHubView } from './msaRuntimeHubAdapter.js';

export default function CognitiveMsaHub({ hubContext }) {
  const view = useMemo(() => resolveMsaHubView('cognitive', hubContext), [hubContext]);
  return <MsaHubShell title="Contexto MSA" hubKey="cognitive" view={view} />;
}
