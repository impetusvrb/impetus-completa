'use strict';

function buildPermitGovernanceCenter(bindings = []) {
  const pt = bindings.find((b) => b.block_id === 'sst.permit_governance');
  return {
    center_id: 'safety_permit_governance',
    label: 'Governança APR/PT/LOTO',
    layer: 'governance',
    weight: 0.22,
    render_slot: 'alertas',
    metrics: {
      permits_overdue: pt?.metrics?.permits_overdue ?? 0,
      permits_critical: pt?.metrics?.permits_critical ?? 0,
      loto_pending: pt?.metrics?.loto_pending ?? 0,
      compliance_operational: pt?.metrics?.compliance_operational ?? 100,
      blocked_areas: pt?.metrics?.permits_critical > 0 ? 1 : 0
    },
    summary: pt?.summary || 'APR/PT/LOTO monitoradas',
    ok: true
  };
}

module.exports = { buildPermitGovernanceCenter };
