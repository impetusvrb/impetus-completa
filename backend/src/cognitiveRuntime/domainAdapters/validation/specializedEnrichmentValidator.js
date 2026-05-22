'use strict';

const { isGenericKpi } = require('../quality/qualityKpiAdapter');

function validateSpecializedEnrichment(payload = {}, ctx = {}) {
  const errors = [];
  const warnings = [];
  const specialized = payload.kpis_specialized || [];
  const merged = payload.kpis || [];

  if (ctx.channels_enriched?.includes('kpis')) {
    if (specialized.length === 0) {
      warnings.push({ code: 'no_specialized_kpis' });
    }
    const genericInFront = merged.slice(0, specialized.length).some((k) => isGenericKpi(k));
    if (genericInFront && specialized.length > 0) {
      warnings.push({ code: 'generic_before_specialized_in_merge_order' });
    }
  }

  if (payload.replace_render === true) {
    errors.push({ code: 'replace_render_forbidden_z21' });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    specialized_delivery_ready: specialized.length >= 3,
    channels_enriched: ctx.channels_enriched || []
  };
}

module.exports = { validateSpecializedEnrichment };
