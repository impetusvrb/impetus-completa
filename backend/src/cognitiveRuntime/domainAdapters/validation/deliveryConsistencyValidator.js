'use strict';

function validateDeliveryConsistency(enriched = {}, qualityPilot = {}) {
  const issues = [];
  const shadowIds = new Set(
    (qualityPilot.shadow_cognitive_cockpit?.blocks || []).map((b) => b.block_id)
  );
  const specializedKpis = enriched.kpis_specialized || [];

  if (specializedKpis.length && shadowIds.size === 0) {
    issues.push({ code: 'kpis_without_shadow_cockpit' });
  }

  const report = enriched.specialized_delivery || {};
  if (report.promotion_applied && !report.channels_enriched?.length) {
    issues.push({ code: 'promotion_without_channels' });
  }

  if (enriched.kpis_legacy && enriched.kpis) {
    if (enriched.kpis.length < (enriched.kpis_specialized || []).length) {
      issues.push({ code: 'merged_kpis_shorter_than_specialized' });
    }
  }

  return {
    consistent: issues.length === 0,
    issues,
    phase: 'Z.21'
  };
}

module.exports = { validateDeliveryConsistency };
