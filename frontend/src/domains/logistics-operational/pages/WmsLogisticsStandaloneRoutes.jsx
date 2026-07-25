import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import WmsOperationalNavLayout from '../layout/WmsOperationalNavLayout.jsx';
import WarehouseModulePage from './standalone/WarehouseModulePage.jsx';
import InventoryModulePage from './standalone/InventoryModulePage.jsx';
import ReceivingModulePage from './standalone/ReceivingModulePage.jsx';
import PickingModulePage from './standalone/PickingModulePage.jsx';
import ShippingModulePage from './standalone/ShippingModulePage.jsx';
import TransferModulePage from './standalone/TransferModulePage.jsx';
import WarehouseIntelligenceModulePage from './standalone/WarehouseIntelligenceModulePage.jsx';
import CognitiveLogisticsModulePage from './standalone/CognitiveLogisticsModulePage.jsx';

/**
 * WMS-007A — Rotas standalone /app/logistics/* (sem workspace container).
 * NAV-002 — Layout ONX envolve todos os módulos operacionais.
 */
export default function WmsLogisticsStandaloneRoutes() {
  return (
    <Routes>
      <Route element={<WmsOperationalNavLayout />}>
        <Route path="warehouses" element={<WarehouseModulePage />} />
        <Route path="inventory" element={<InventoryModulePage />} />
        <Route path="receiving" element={<ReceivingModulePage />} />
        <Route path="picking" element={<PickingModulePage />} />
        <Route path="shipping" element={<ShippingModulePage />} />
        <Route path="transfers" element={<TransferModulePage />} />
        <Route path="warehouse-intelligence" element={<WarehouseIntelligenceModulePage />} />
        <Route path="cognitive-logistics" element={<CognitiveLogisticsModulePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
