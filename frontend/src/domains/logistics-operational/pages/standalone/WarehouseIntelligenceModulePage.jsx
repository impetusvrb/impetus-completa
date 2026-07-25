import React from 'react';
import WarehouseIntelligenceModule from '../../modules/warehouse-intelligence/WarehouseIntelligenceModule.jsx';
import { useWarehouseIntelligenceFoundation } from '../../modules/warehouse-intelligence/useWarehouseIntelligenceFoundation.js';
import { WMS_OPERATIONAL_MODULES } from '../../routes/wmsModuleRegistry.js';

const meta = WMS_OPERATIONAL_MODULES.find((m) => m.id === 'warehouse_intelligence');

/**
 * OPM-007 — Warehouse Intelligence & Operational Optimization.
 * Camada analítica — não executa operações.
 */
export default function WarehouseIntelligenceModulePage() {
  const foundation = useWarehouseIntelligenceFoundation();
  return (
    <WarehouseIntelligenceModule
      title={meta?.label || 'Inteligência Operacional'}
      description={
        meta?.description ||
        'Warehouse Intelligence · optimização operacional · read-only · WMS-003 v1'
      }
      {...foundation}
    />
  );
}
