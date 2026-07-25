import React, { useMemo } from 'react';
import MsaHubShell from './MsaHubShell.jsx';
import { resolveMsaHubView } from './msaRuntimeHubAdapter.js';

export default function CalibrationHub({ hubContext }) {
  const view = useMemo(() => resolveMsaHubView('calibration', hubContext), [hubContext]);
  return <MsaHubShell title="Calibração" hubKey="calibration" view={view} />;
}
