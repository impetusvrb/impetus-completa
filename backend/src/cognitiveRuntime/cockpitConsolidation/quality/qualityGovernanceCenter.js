'use strict';

function buildQualityGovernanceCenter(bindings = [], signalBundle = {}) {
  const audit = bindings.find((b) => b.block_id === 'quality.audit_governance');
  const supplier = bindings.find((b) => b.block_id === 'quality.supplier_intelligence');
  const spc = bindings.find((b) => b.block_id === 'quality.spc_monitor');

  return {
    center_id: 'quality_governance',
    label: 'Governança de Qualidade',
    layer: 'governance',
    weight: 0.18,
    render_slot: 'alertas',
    metrics: {
      open_audits_proxy: audit?.metrics?.sectors_audited ?? 0,
      iso_compliance_score: audit?.metrics?.compliance_proxy_score ?? 72,
      supplier_score: supplier?.metrics?.supplier_score ?? supplier?.metrics?.score ?? null,
      supplier_risk: supplier?.metrics?.risk_level || 'unknown',
      critical_deviations: signalBundle.operational?.open_nc ?? 0,
      spc_trend: spc?.metrics?.drift_severity || 'stable',
      compliance_score: audit?.metrics?.compliance_proxy_score ?? 72
    },
    summary: audit?.summary || 'Governança e conformidade de qualidade',
    ok: true
  };
}

module.exports = { buildQualityGovernanceCenter };
