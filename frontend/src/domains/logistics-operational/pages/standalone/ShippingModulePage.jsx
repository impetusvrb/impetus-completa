import React from 'react';
import ShippingOperationalModule from '../../modules/shipping/ShippingOperationalModule.jsx';
import { useShippingFoundation } from '../../modules/shipping/useShippingFoundation.js';
import { WMS_OPERATIONAL_MODULES } from '../../routes/wmsModuleRegistry.js';

const meta = WMS_OPERATIONAL_MODULES.find((m) => m.id === 'shipping');

/**
 * OPM-005 — Shipping Control & Outbound Logistics.
 */
export default function ShippingModulePage() {
  const foundation = useShippingFoundation();
  return (
    <ShippingOperationalModule
      title={meta?.label || 'Expedição'}
      description={meta?.description || 'Controlo expedição · outbound logistics · WMS-003 v1'}
      {...foundation}
    />
  );
}
