import React, { useMemo } from 'react';
import PpapHubShell from './PpapHubShell.jsx';
import { resolvePpapHubView } from './ppapRuntimeHubAdapter.js';

export default function DimensionalHub({ hubContext }) {
  const view = useMemo(() => resolvePpapHubView('dimensional', hubContext), [hubContext]);
  return <PpapHubShell title="Validação Dimensional" hubKey="dimensional" view={view} />;
}
