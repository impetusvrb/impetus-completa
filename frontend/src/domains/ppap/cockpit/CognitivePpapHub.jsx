import React, { useMemo } from 'react';
import PpapHubShell from './PpapHubShell.jsx';
import { resolvePpapHubView } from './ppapRuntimeHubAdapter.js';

export default function CognitivePpapHub({ hubContext }) {
  const view = useMemo(() => resolvePpapHubView('cognitive', hubContext), [hubContext]);
  return <PpapHubShell title="Contexto PPAP" hubKey="cognitive" view={view} />;
}
