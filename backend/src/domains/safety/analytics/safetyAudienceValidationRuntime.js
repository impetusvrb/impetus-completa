'use strict';

const navFlags = require('../navigation/safetyNavigationFlags');

/**
 * SafetyAudienceValidationRuntime — valida publication/visibility por perfil simulado ou amostra real.
 */

/**
 * @param {object} ctx
 * @param {string} ctx.expected_band
 * @param {string} ctx.resolved_band
 * @param {boolean} ctx.module_licensed
 * @param {boolean} ctx.should_publish_menu
 * @param {number} ctx.visible_menu_count
 * @param {string[]} [ctx.visible_routes]
 * @param {string[]} [ctx.denied_routes]
 */
function validateAudienceSample(ctx) {
  const failures = [];
  const expected = String(ctx.expected_band || '');
  const resolved = String(ctx.resolved_band || '');

  if (expected && resolved && expected !== resolved) {
    failures.push({ code: 'band_mismatch', expected, resolved });
  }
  if (ctx.module_licensed === false && ctx.should_publish_menu === true) {
    failures.push({ code: 'unlicensed_but_published' });
  }
  if (ctx.module_licensed === true && ctx.should_publish_menu === false && navFlags.isPublicationEnabled()) {
    failures.push({ code: 'licensed_but_unpublished' });
  }
  const menuCount = Number(ctx.visible_menu_count) || 0;
  if (resolved === 'production' && menuCount > 2) {
    failures.push({ code: 'production_menu_overflow', menuCount });
  }
  if (resolved === 'operator' && menuCount > 8) {
    failures.push({ code: 'operator_menu_overflow', menuCount });
  }
  if (Array.isArray(ctx.denied_routes) && ctx.denied_routes.length > 5) {
    failures.push({ code: 'excessive_denied_routes', count: ctx.denied_routes.length });
  }

  return {
    ok: failures.length === 0,
    failures,
    publication_consistent: failures.length === 0,
    flags: navFlags.snapshot()
  };
}

/**
 * @param {Array<object>} samples
 */
function validateAudienceMatrix(samples) {
  if (!Array.isArray(samples)) return { ok: false, error: 'samples_required' };
  const results = samples.map((s) => validateAudienceSample(s));
  const failureCount = results.filter((r) => !r.ok).length;
  return {
    ok: true,
    sample_count: samples.length,
    failure_count: failureCount,
    failure_rate: samples.length ? failureCount / samples.length : 0,
    results
  };
}

module.exports = {
  validateAudienceSample,
  validateAudienceMatrix
};
