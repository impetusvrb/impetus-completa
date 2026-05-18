import React from 'react';
import { EnvironmentOperationalHubBase } from '../shared/EnvironmentOperationalHubBase.jsx';

export function WaterOperationalHub() {
  return (
    <EnvironmentOperationalHubBase
      area="water"
      title="Água & ETA"
      subtitle="Consumo, captação, hidrômetros, reservatórios e coletas."
      eventName="environment.water.sample_collected"
      recordLabel="Registrar coleta"
      fields={[
        { key: 'meter_id', label: 'Hidrômetro / ponto', placeholder: 'ETA-01' },
        { key: 'consumption_m3', label: 'Consumo (m³)', type: 'number', inputMode: 'decimal' },
        { key: 'ph', label: 'pH', type: 'number', inputMode: 'decimal' },
        { key: 'turbidity', label: 'Turbidez', type: 'number', inputMode: 'decimal' }
      ]}
    />
  );
}

export function WaterInspectionWorkspace() {
  return <WaterOperationalHub />;
}

export function WaterCollectionRuntime() {
  return <WaterOperationalHub />;
}

export function WaterQualityRuntime() {
  return <WaterOperationalHub />;
}

export default WaterOperationalHub;
