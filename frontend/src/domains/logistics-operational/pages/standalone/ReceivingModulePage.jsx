import React from 'react';
import ReceivingOperationalModule from '../../modules/receiving/ReceivingOperationalModule.jsx';
import { useReceivingFoundation } from '../../modules/receiving/useReceivingFoundation.js';
import { WMS_OPERATIONAL_MODULES } from '../../routes/wmsModuleRegistry.js';

const meta = WMS_OPERATIONAL_MODULES.find((m) => m.id === 'receiving');

/**
 * OPM-003 — Receiving Operations & Inbound Logistics (porta de entrada WMS).
 */
export default function ReceivingModulePage() {
  const foundation = useReceivingFoundation();
  return (
    <ReceivingOperationalModule
      title={meta?.label || 'Recebimento'}
      description={meta?.description || 'Porta de entrada operacional · inbound logistics · WMS-003 v1'}
      {...foundation}
    />
  );
}
