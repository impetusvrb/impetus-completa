import React, { useMemo } from 'react';
import PpapHubShell from './PpapHubShell.jsx';
import { resolvePpapHubView } from './ppapRuntimeHubAdapter.js';

export default function EngineeringHub({ hubContext }) {
  const view = useMemo(() => resolvePpapHubView('engineering', hubContext), [hubContext]);
  return <PpapHubShell title="Alterações Engenharia" hubKey="engineering" view={view} />;
}
