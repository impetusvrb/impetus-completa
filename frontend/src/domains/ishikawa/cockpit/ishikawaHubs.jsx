import React, { useMemo } from 'react';
import IshikawaHubShell from './IshikawaHubShell.jsx';
import { resolveIshikawaHubView } from './ishikawaRuntimeHubAdapter.js';

function makeHub(hubKey, title) {
  return function IshikawaHub({ hubContext }) {
    const view = useMemo(() => resolveIshikawaHubView(hubKey, hubContext), [hubContext]);
    return <IshikawaHubShell title={title} hubKey={hubKey} view={view} />;
  };
}

export const InvestigationOverviewHub = makeHub('investigation_overview', 'Investigation Overview');
export const FishboneHub = makeHub('fishbone', 'Fishbone');
export const FiveWhyHub = makeHub('five_why', 'Five Why');
export const CorrectiveActionsHub = makeHub('corrective_actions', 'Corrective Actions');
export const PreventiveActionsHub = makeHub('preventive_actions', 'Preventive Actions');
export const EvidenceHub = makeHub('evidence', 'Evidence');
export const ApprovalsHub = makeHub('approvals', 'Approvals');
export const RecurrenceHub = makeHub('recurrence', 'Recurrence');
export const OrganizationalLearningHub = makeHub('organizational_learning', 'Organizational Learning');
export const NarrativeHub = makeHub('narrative', 'Narrative');
