/** OPM-008 — Scenario simulation (what-if · in-memory · sem efeitos colaterais). */
export const CL_SCENARIO_CATALOG = Object.freeze([
  {
    id: 'rcv_volume_up_20',
    label: 'Recebimentos +20%',
    description: 'Aumento hipotético de 20% no volume inbound',
    params: { receivingMultiplier: 1.2 }
  },
  {
    id: 'dock_unavailable',
    label: 'Doca indisponível',
    description: 'Simula indisponibilidade de uma doca de recebimento',
    params: { dockCapacityReduction: 0.25 }
  },
  {
    id: 'zone_capacity_down',
    label: 'Capacidade zona -30%',
    description: 'Redução de capacidade em zona crítica',
    params: { zoneCapacityReduction: 0.3 }
  },
  {
    id: 'picking_demand_up',
    label: 'Demanda picking +25%',
    description: 'Aumento hipotético da demanda de separação',
    params: { pickingMultiplier: 1.25 }
  }
]);

export function runScenarioSimulation(scenarioId, { snapshot = {}, wiAnalytics = {} } = {}) {
  const scenario = CL_SCENARIO_CATALOG.find((s) => s.id === scenarioId);
  if (!scenario) return null;

  const { receiving = [], picking = [], capacity = [], flow } = wiAnalytics;
  const baseQueues = flow?.summary?.totalOpenQueues ?? 0;
  const baseOcc = capacity.length
    ? Math.round(capacity.reduce((s, c) => s + (c.occupancy_pct || 0), 0) / capacity.length)
    : 50;

  let projectedQueues = baseQueues;
  let projectedOcc = baseOcc;
  let projectedRisk = wiAnalytics.riskScore ?? 30;
  const impacts = [];

  if (scenario.params.receivingMultiplier) {
    const extra = Math.round(receiving.length * (scenario.params.receivingMultiplier - 1));
    projectedQueues += extra;
    projectedOcc += Math.round(extra * 2);
    impacts.push({ area: 'Receiving', delta: `+${extra} filas estimadas`, severity: extra > 3 ? 'high' : 'medium' });
  }

  if (scenario.params.dockCapacityReduction) {
    projectedQueues += Math.ceil(receiving.length * scenario.params.dockCapacityReduction);
    impacts.push({ area: 'Docas', delta: `-${Math.round(scenario.params.dockCapacityReduction * 100)}% capacidade`, severity: 'high' });
  }

  if (scenario.params.zoneCapacityReduction) {
    projectedOcc = Math.min(100, Math.round(projectedOcc * (1 + scenario.params.zoneCapacityReduction)));
    impacts.push({ area: 'Zona', delta: `Ocupação → ${projectedOcc}%`, severity: projectedOcc > 90 ? 'high' : 'medium' });
  }

  if (scenario.params.pickingMultiplier) {
    const extra = Math.round(picking.length * (scenario.params.pickingMultiplier - 1));
    projectedQueues += extra;
    impacts.push({ area: 'Picking', delta: `+${extra} ordens estimadas`, severity: extra > 5 ? 'high' : 'medium' });
  }

  projectedRisk = Math.min(100, projectedRisk + impacts.filter((i) => i.severity === 'high').length * 12);
  const projectedHealth = Math.max(0, 100 - projectedRisk);

  return Object.freeze({
    scenarioId,
    label: scenario.label,
    description: scenario.description,
    params: scenario.params,
    baseline: Object.freeze({ queues: baseQueues, occupancy: baseOcc, risk: wiAnalytics.riskScore, health: wiAnalytics.healthScore }),
    projected: Object.freeze({ queues: projectedQueues, occupancy: projectedOcc, risk: projectedRisk, health: projectedHealth }),
    impacts: Object.freeze(impacts),
    sideEffects: false,
    advisory: true
  });
}
