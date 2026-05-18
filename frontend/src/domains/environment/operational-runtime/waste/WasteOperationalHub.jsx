import React from 'react';
import { EnvironmentOperationalHubBase } from '../shared/EnvironmentOperationalHubBase.jsx';

export function WasteOperationalHub() {
  return (
    <EnvironmentOperationalHubBase
      area="waste"
      title="Resíduos"
      subtitle="Geração, classificação, MTR e rastreabilidade."
      eventName="environment.waste.manifest_created"
      recordLabel="Criar MTR"
      fields={[
        { key: 'waste_class', label: 'Classe', placeholder: 'IIB' },
        { key: 'mtr_ref', label: 'MTR', placeholder: 'MTR-2026-0001' },
        { key: 'quantity_kg', label: 'Quantidade (kg)', type: 'number', inputMode: 'decimal' },
        { key: 'destination', label: 'Destinador', placeholder: 'Empresa licenciada' }
      ]}
    />
  );
}

export function WasteManifestWorkspace() {
  return <WasteOperationalHub />;
}

export function WasteTrackingWorkspace() {
  return <WasteOperationalHub />;
}

export function WasteInventoryWorkspace() {
  return <WasteOperationalHub />;
}

export default WasteOperationalHub;
