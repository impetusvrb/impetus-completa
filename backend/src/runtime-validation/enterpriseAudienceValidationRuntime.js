'use strict';

const { ENTERPRISE_BANDS } = require('./enterpriseRuntimeProfiles');

/** Capabilities esperadas por band (bounded — sem governança executiva para operador). */
const BAND_VISIBILITY = Object.freeze({
  operator: { allow_executive_governance: false, allow_audit_rollout: false, max_menu: 8 },
  technician: { allow_executive_governance: false, allow_audit_rollout: false, max_menu: 10 },
  supervisor: { allow_executive_governance: false, allow_audit_rollout: false, max_menu: 11 },
  coordinator: { allow_executive_governance: true, allow_audit_rollout: false, max_menu: 12 },
  manager: { allow_executive_governance: true, allow_audit_rollout: false, max_menu: 10 },
  director: { allow_executive_governance: true, allow_audit_rollout: true, max_menu: 8 },
  auditor: { allow_executive_governance: false, allow_audit_rollout: true, max_menu: 10 },
  production: { allow_executive_governance: false, allow_audit_rollout: false, max_menu: 2 }
});

/**
 * @param {object} ctx
 */
function validateAudienceSample(ctx) {
  const failures = [];
  const band = String(ctx.resolved_band || ctx.audience_band || 'production');
  const rules = BAND_VISIBILITY[band] || BAND_VISIBILITY.production;
  const menuCount = Number(ctx.visible_menu_count) || 0;

  if (ctx.expected_band && ctx.expected_band !== band) {
    failures.push({ code: 'band_mismatch', expected: ctx.expected_band, resolved: band });
  }
  if (band === 'operator' && ctx.visible_executive_governance) {
    failures.push({ code: 'visibility_leak_executive_to_operator' });
  }
  if (band === 'director' && ctx.missing_strategic_dashboard) {
    failures.push({ code: 'missing_visibility_director' });
  }
  if (band === 'technician' && ctx.hybrid_view_missing && ctx.module_licensed) {
    failures.push({ code: 'technician_hybrid_missing' });
  }
  if (band === 'auditor' && ctx.cross_domain_unrestricted) {
    failures.push({ code: 'auditor_cross_domain_leak' });
  }
  if (menuCount > rules.max_menu) {
    failures.push({ code: 'excessive_visibility', menuCount, limit: rules.max_menu });
  }
  if (ctx.module_licensed === false && ctx.should_publish_menu) {
    failures.push({ code: 'publication_mismatch_unlicensed' });
  }
  if (ctx.module_licensed === true && ctx.should_publish_menu === false && ctx.publication_runtime_on) {
    failures.push({ code: 'missing_visibility_licensed' });
  }

  return { ok: failures.length === 0, failures, band, rules };
}

function validateAudienceMatrix(samples) {
  if (!Array.isArray(samples)) return { ok: false, error: 'samples_required' };
  const results = samples.map((s) => validateAudienceSample(s));
  const failureCount = results.filter((r) => !r.ok).length;
  return {
    ok: true,
    bands_supported: ENTERPRISE_BANDS,
    sample_count: samples.length,
    failure_count: failureCount,
    failure_rate: samples.length ? failureCount / samples.length : 0,
    results
  };
}

module.exports = {
  BAND_VISIBILITY,
  validateAudienceSample,
  validateAudienceMatrix
};
