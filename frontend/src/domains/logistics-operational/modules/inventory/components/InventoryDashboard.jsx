import React from 'react';
import IndustrialKpiPanel from '../../../../../presentation/industrial-module/IndustrialKpiPanel.jsx';

/**
 * OPM-002A Reference Module — painel de KPIs operacionais reutilizável.
 * Herdado por Receiving, Picking, Shipping, Transfers (OPM-003+).
 */
export default function InventoryDashboard({ kpis = [], columns = 4 }) {
  if (!kpis.length) return null;
  return <IndustrialKpiPanel items={kpis} columns={columns} />;
}
