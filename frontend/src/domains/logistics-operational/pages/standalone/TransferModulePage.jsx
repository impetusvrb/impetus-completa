import React from 'react';
import TransferOperationalModule from '../../modules/transfers/TransferOperationalModule.jsx';
import { useTransferFoundation } from '../../modules/transfers/useTransferFoundation.js';
import { WMS_OPERATIONAL_MODULES } from '../../routes/wmsModuleRegistry.js';

const meta = WMS_OPERATIONAL_MODULES.find((m) => m.id === 'transfers');

/**
 * OPM-006 — Transfer Management & Internal Logistics.
 * Camada transversal — não substitui Warehouse, Picking ou Inventory.
 */
export default function TransferModulePage() {
  const foundation = useTransferFoundation();
  return (
    <TransferOperationalModule
      title={meta?.label || 'Transferências'}
      description={
        meta?.description ||
        'Logística interna · camada transversal · transfer · relocation · replenishment · cross-dock · WMS-003 v1'
      }
      {...foundation}
    />
  );
}
