import React from 'react';
import { EnvironmentOperationalHubBase } from '../shared/EnvironmentOperationalHubBase.jsx';

export function EmissionsOperationalHub() {
  return (
    <EnvironmentOperationalHubBase
      area="emissions"
      title="Emissões"
      subtitle="Chaminés, MP, NOx, SOx, CO₂, VOC e flare."
      eventName="environment.emission.alert_triggered"
      recordLabel="Registrar amostra"
      fields={[
        { key: 'stack_id', label: 'Chaminé', placeholder: 'CH-01' },
        { key: 'pm', label: 'Material particulado', type: 'number', inputMode: 'decimal' },
        { key: 'nox', label: 'NOx', type: 'number', inputMode: 'decimal' },
        { key: 'sox', label: 'SOx', type: 'number', inputMode: 'decimal' },
        { key: 'co2', label: 'CO₂ eq.', type: 'number', inputMode: 'decimal' },
        { key: 'voc', label: 'VOC', type: 'number', inputMode: 'decimal' }
      ]}
    />
  );
}

export function EmissionsSamplingWorkspace() {
  return <EmissionsOperationalHub />;
}

export function EmissionsRealtimeWorkspace() {
  return <EmissionsOperationalHub />;
}

export function EmissionsAlertWorkspace() {
  return <EmissionsOperationalHub />;
}

export default EmissionsOperationalHub;
