'use strict';

function buildHazardHeatmapCenter(bindings = [], signalBundle = {}) {
  const hm = bindings.find((b) => b.block_id === 'sst.hazard_heatmap');
  const sectors = signalBundle.operational?.sector_breakdown || [];
  return {
    center_id: 'safety_hazard_heatmap',
    label: 'Heatmap de Risco SST',
    layer: 'operational',
    weight: 0.2,
    render_slot: 'rastreabilidade',
    metrics: {
      hotspot_count: hm?.metrics?.hotspot_count ?? sectors.length,
      top_sector: hm?.metrics?.top_sector ?? sectors[0]?.sector,
      risk_escalation: hm?.metrics?.risk_escalation === true,
      unsafe_zones: hm?.metrics?.unsafe_zones ?? 0,
      critical_zones: sectors.filter((s) => s.count >= 3).map((s) => s.sector)
    },
    summary: hm?.summary || 'Mapa de risco operacional',
    ok: sectors.length > 0 || hm?.ok === true
  };
}

module.exports = { buildHazardHeatmapCenter };
