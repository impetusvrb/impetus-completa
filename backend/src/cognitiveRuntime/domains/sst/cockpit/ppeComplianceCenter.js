'use strict';

function buildPpeComplianceCenter(bindings = [], signalBundle = {}) {
  const ppe = bindings.find((b) => b.block_id === 'sst.ppe_compliance');
  const op = signalBundle.operational || {};
  return {
    center_id: 'safety_ppe_compliance',
    label: 'Compliance EPI/EPC',
    layer: 'operational',
    weight: 0.18,
    render_slot: 'kpi_cards',
    metrics: {
      compliance_pct: ppe?.metrics?.compliance_pct ?? op.ppe_compliance_pct ?? 90,
      deviations: ppe?.metrics?.deviations ?? 0,
      recurrence_areas: (ppe?.metrics?.recurrence_areas || []).length,
      behavioral_trend: (op.open_incidents ?? 0) > 2 ? 'attention' : 'stable'
    },
    summary: ppe?.summary || 'EPI/EPC em monitorização',
    ok: true
  };
}

module.exports = { buildPpeComplianceCenter };
