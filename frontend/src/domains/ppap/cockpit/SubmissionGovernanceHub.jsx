import React, { useMemo } from 'react';
import PpapHubShell from './PpapHubShell.jsx';
import { resolvePpapHubView } from './ppapRuntimeHubAdapter.js';

export default function SubmissionGovernanceHub({ hubContext }) {
  const view = useMemo(() => resolvePpapHubView('submission_governance', hubContext), [hubContext]);
  return <PpapHubShell title="Governança Submissões" hubKey="submission_governance" view={view} />;
}
