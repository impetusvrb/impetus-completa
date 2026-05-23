'use strict';

function buildQualityActionCenter(bindings = []) {
  const capa = bindings.find((b) => b.block_id === 'quality.capa_engine');
  const rec = bindings.find((b) => b.block_id === 'quality.recurrence_analysis');

  const pending = capa?.metrics?.capa_pending ?? 0;
  const openNc = capa?.metrics?.open_nc ?? 0;
  const overdue = Math.max(0, Math.round(pending * 0.4));

  return {
    center_id: 'quality_action_capa',
    label: 'Centro CAPA',
    layer: 'operational',
    weight: 0.22,
    render_slot: 'insights_ia',
    metrics: {
      capa_pending: pending,
      capa_overdue: overdue,
      capa_effectiveness_proxy: pending === 0 ? 95 : Math.max(55, 90 - pending * 4),
      dominant_root_cause: rec?.metrics?.dominant_key || 'processo',
      recurrence_linked: rec?.metrics?.recurrence_count ?? 0,
      critical_actions: Math.min(pending, 5),
      capa_by_sector_count: rec?.metrics?.sector_count ?? 1
    },
    summary: capa?.summary || `CAPA pendentes: ${pending}`,
    ok: true
  };
}

module.exports = { buildQualityActionCenter };
