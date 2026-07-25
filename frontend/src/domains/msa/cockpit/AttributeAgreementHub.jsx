import React, { useMemo } from 'react';
import MsaHubShell from './MsaHubShell.jsx';
import { resolveMsaHubView } from './msaRuntimeHubAdapter.js';

export default function AttributeAgreementHub({ hubContext }) {
  const view = useMemo(() => resolveMsaHubView('attribute_agreement', hubContext), [hubContext]);
  return <MsaHubShell title="Concordância Atributo" hubKey="attribute_agreement" view={view} />;
}
