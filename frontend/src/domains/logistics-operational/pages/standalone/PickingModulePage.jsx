import React from 'react';
import PickingOperationalModule from '../../modules/picking/PickingOperationalModule.jsx';
import { usePickingFoundation } from '../../modules/picking/usePickingFoundation.js';
import { WMS_OPERATIONAL_MODULES } from '../../routes/wmsModuleRegistry.js';

const meta = WMS_OPERATIONAL_MODULES.find((m) => m.id === 'picking');

/**
 * OPM-004 — Picking Operations & Order Fulfillment.
 */
export default function PickingModulePage() {
  const foundation = usePickingFoundation();
  return (
    <PickingOperationalModule
      title={meta?.label || 'Picking'}
      description={meta?.description || 'Separação de materiais · 1ª etapa order fulfillment · WMS-003 v1'}
      {...foundation}
    />
  );
}
