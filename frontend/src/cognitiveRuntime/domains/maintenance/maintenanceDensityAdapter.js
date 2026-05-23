export function adaptMaintenanceDensity(runtime = {}) {
  const d = runtime.density || {};
  return {
    overloadDetected: d.overload_detected === true,
    limits: d.limits || { maxCenters: 6, maxWidgets: 8, maxAlerts: 3 }
  };
}

export default adaptMaintenanceDensity;
