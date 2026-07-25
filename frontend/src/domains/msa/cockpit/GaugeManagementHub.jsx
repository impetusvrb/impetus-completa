import React, { useMemo } from 'react';
import MsaHubShell from './MsaHubShell.jsx';
import { resolveMsaHubView } from './msaRuntimeHubAdapter.js';

export default function GaugeManagementHub({ hubContext }) {
  const view = useMemo(() => resolveMsaHubView('gauge_management', hubContext), [hubContext]);
  return <MsaHubShell title="Gestão de Instrumentos" hubKey="gauge_management" view={view} />;
}
