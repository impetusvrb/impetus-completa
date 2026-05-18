import React from 'react';
import { EnvironmentOperationalHubBase } from '../shared/EnvironmentOperationalHubBase.jsx';

export function EnvironmentalFieldHub() {
  return (
    <EnvironmentOperationalHubBase
      area="field"
      title="Campo ambiental"
      subtitle="Inspeções, ocorrências, vazamentos, ruído e condicionantes."
      eventName="environment.field.occurrence_registered"
      recordLabel="Registrar ocorrência"
      fields={[
        { key: 'occurrence_type', label: 'Tipo', placeholder: 'vazamento|ruido|fauna' },
        { key: 'location', label: 'Local', placeholder: 'Área norte' },
        { key: 'description', label: 'Descrição', placeholder: 'Detalhe operacional' }
      ]}
    />
  );
}

export function EnvironmentalInspectionWorkspace() {
  return <EnvironmentalFieldHub />;
}

export function EnvironmentalOccurrenceWorkspace() {
  return <EnvironmentalFieldHub />;
}

export function EnvironmentalEvidenceWorkspace() {
  return <EnvironmentalFieldHub />;
}

export default EnvironmentalFieldHub;
