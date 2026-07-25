import React from 'react';
import WarehouseOperationalModule from '../../modules/warehouse/WarehouseOperationalModule.jsx';
import { useWarehouseFoundation } from '../../modules/warehouse/useWarehouseFoundation.js';
import { WMS_OPERATIONAL_MODULES } from '../../routes/wmsModuleRegistry.js';

const meta = WMS_OPERATIONAL_MODULES.find((m) => m.id === 'warehouses');

/**
 * OPM-001B — Armazéns · fundação operacional (framework OPM-001A).
 * Outros módulos WMS continuam em WmsStandaloneModuleFrame (WMS-007A).
 */
export default function WarehouseModulePage() {
  const foundation = useWarehouseFoundation();
  return (
    <WarehouseOperationalModule
      title={meta?.label || 'Armazéns'}
      description={meta?.description || 'Gestão operacional de armazéns · WMS-003 v1'}
      {...foundation}
    />
  );
}
