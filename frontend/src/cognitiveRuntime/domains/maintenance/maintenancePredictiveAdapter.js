export function adaptMaintenancePredictive(runtime = {}) {
  const gov = runtime.predictive_governance || {};
  return {
    supervised: gov.predictive_supervised !== false,
    autoMaintenanceBlocked: gov.auto_maintenance_blocked !== false,
    autoOrderBlocked: gov.auto_order_blocked !== false,
    autoShutdownBlocked: gov.auto_shutdown_blocked !== false
  };
}

export default adaptMaintenancePredictive;
