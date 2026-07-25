import React from 'react';
import InventoryOperationalModule from '../../modules/inventory/InventoryOperationalModule.jsx';
import { useInventoryFoundation } from '../../modules/inventory/useInventoryFoundation.js';
import { WMS_OPERATIONAL_MODULES } from '../../routes/wmsModuleRegistry.js';

const meta = WMS_OPERATIONAL_MODULES.find((m) => m.id === 'inventory');

/**
 * OPM-002A — Inventário · Reference Module WMS (fundação operacional reutilizável).
 */
export default function InventoryModulePage() {
  const foundation = useInventoryFoundation();
  return (
    <InventoryOperationalModule
      title={meta?.label || 'Inventário'}
      description={meta?.description || 'Gestão operacional de inventário · WMS-003 v1'}
      {...foundation}
    />
  );
}
