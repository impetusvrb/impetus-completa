'use strict';

const { auditLegacyInjectors, findReinjectionPoints } = require('./legacyInjectionTrace');
const { buildPipelineOrderTrace } = require('./runtimePipelineOrderTrace');

function consolidateGovernanceAudit(parts = {}) {
  const sidebar = parts.sidebar || {};
  const kpi = parts.kpi || {};
  const summary = parts.summary || {};
  const legacy = auditLegacyInjectors();
  const pipeline = buildPipelineOrderTrace(sidebar.stages || []);

  const governance_conflicts = [
    ...(sidebar.overwrites || []),
    ...(kpi.kpi_delivery_audit?.governance_conflicts || []),
    ...(summary.summary_delivery_audit?.cross_domain_hints || []).map((h) => ({ type: 'summary', hint: h }))
  ];

  const reinjection_points = [
    ...(sidebar.reinjection_points || []),
    ...findReinjectionPoints(sidebar.stages || [], parts.denied_publications || [])
  ];

  const leakage_points = [];
  if (sidebar.leakage_detected) leakage_points.push({ channel: 'sidebar', modules: sidebar.leakage_modules });
  if (kpi.kpi_delivery_audit?.leakage_detected) leakage_points.push({ channel: 'kpi' });
  if (summary.summary_delivery_audit?.leakage_detected) leakage_points.push({ channel: 'summary' });

  const highest_risk = legacy.highest_risk || [];
  const recommendations = [];
  if (reinjection_points.length) {
    recommendations.push('Desactivar enrich contextual ou filtrar contextual_modules antes do frontend');
  }
  if (highest_risk.includes('safeMergeSafetyPublicationIntoMenu')) {
    recommendations.push('Garantir shouldBlockPublicationMerge(safety) com denied_publications do Z.14');
  }
  if (!sidebar.governance_applied) {
    recommendations.push('Activar piloto Z.13+Z.14 ou flags IMPETUS_SIDEBAR_GOVERNANCE_RUNTIME');
  }

  return {
    governance_conflicts,
    reinjection_points,
    leakage_points,
    stale_merges: pipeline.stale_contextual_risk ? [{ risk: 'contextual_after_governance' }] : [],
    duplicate_sources: kpi.kpi_delivery_audit?.duplicate_sources || [],
    highest_risk_components: highest_risk,
    stabilization_recommendations: recommendations,
    pipeline_order_stable: pipeline.order_stable
  };
}

module.exports = { consolidateGovernanceAudit };
