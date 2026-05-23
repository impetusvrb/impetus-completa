'use strict';

function buildQualityOperationalCenter(bindings = [], signalBundle = {}) {
  const nc = bindings.find((b) => b.block_id === 'quality.nc_center');
  const heat = bindings.find((b) => b.block_id === 'quality.nonconformity_heatmap');
  const rec = bindings.find((b) => b.block_id === 'quality.recurrence_analysis');
  const op = signalBundle.operational || {};

  const openNc = nc?.metrics?.open_nc ?? op.open_nc ?? 0;
  const criticalNc = Math.max(0, Math.round(openNc * 0.25));
  const sectors = op.sector_breakdown || heat?.metrics?.sectors || [];

  return {
    center_id: 'quality_operational_nc',
    label: 'Centro de Não Conformidades',
    layer: 'operational',
    weight: 0.28,
    render_slot: 'qualidade',
    metrics: {
      open_nc: openNc,
      critical_nc: criticalNc,
      recurrence_key: rec?.metrics?.dominant_key || null,
      recurrence_count: rec?.metrics?.recurrence_count ?? 0,
      sectors_with_nc: sectors.length,
      approval_rate_proxy: openNc === 0 ? 100 : Math.max(40, 100 - openNc * 3),
      avg_close_days_proxy: 12 + Math.min(openNc, 10)
    },
    summary: nc?.summary || `NC abertas: ${openNc}`,
    ok: true
  };
}

module.exports = { buildQualityOperationalCenter };
