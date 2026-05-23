'use strict';

function buildIncidentIntelligenceCenter(bindings = [], signalBundle = {}) {
  const inc = bindings.find((b) => b.block_id === 'sst.incident_intelligence');
  const op = signalBundle.operational || {};
  const sectors = op.sector_breakdown || [];

  return {
    center_id: 'safety_incident_intelligence',
    label: 'Inteligência de Incidentes',
    layer: 'operational',
    weight: 0.3,
    render_slot: 'alertas',
    metrics: {
      open_incidents: inc?.metrics?.open_incidents ?? op.open_incidents ?? 0,
      near_miss: inc?.metrics?.near_miss ?? op.near_miss ?? 0,
      critical_incidents: inc?.metrics?.critical_incidents ?? op.critical_incidents ?? 0,
      recurrence_sectors: sectors.filter((s) => s.count >= 2).length,
      sectors_with_incidents: sectors.length,
      weekly_trend_up: inc?.metrics?.weekly_trend_up === true,
      top_sector: sectors[0]?.sector || null
    },
    summary: inc?.summary || `Incidentes abertos: ${op.open_incidents ?? 0}`,
    ok: true
  };
}

module.exports = { buildIncidentIntelligenceCenter };
