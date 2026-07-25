import React, { useMemo } from 'react';
import MsaHubShell from './MsaHubShell.jsx';
import { resolveMsaHubView } from './msaRuntimeHubAdapter.js';

export default function StudyGovernanceHub({ hubContext }) {
  const view = useMemo(() => resolveMsaHubView('study_governance', hubContext), [hubContext]);
  return <MsaHubShell title="Governança de Estudos" hubKey="study_governance" view={view} />;
}
