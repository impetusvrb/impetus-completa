export function renderMaintenanceReliabilityMetrics(centers = []) {
  const rel = centers.find((c) => c.center_id === 'maintenance_reliability');
  if (!rel?.metrics?.length) return null;
  return rel.metrics.map((m) => ({ key: m.key, value: m.value, label: m.key }));
}

export default renderMaintenanceReliabilityMetrics;
