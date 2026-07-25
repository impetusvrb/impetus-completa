import React, { useMemo } from 'react';
import MsaHubShell from './MsaHubShell.jsx';
import { resolveMsaHubView } from './msaRuntimeHubAdapter.js';

export default function VariableGrrHub({ hubContext }) {
  const view = useMemo(() => resolveMsaHubView('variable_grr', hubContext), [hubContext]);
  return <MsaHubShell title="GRR Variável" hubKey="variable_grr" view={view} />;
}
