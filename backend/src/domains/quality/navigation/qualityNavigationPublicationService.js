'use strict';

const navFlags = require('./qualityNavigationFlags');
const obs = require('../../../services/operational/enterpriseObservabilityRuntime');

/**
 * @param {object} user — req.user (JWT)
 * @param {object} [opts]
 * @param {string} [opts.companyId]
 */
function buildPublicationContext(user, opts = {}) {
  const t0 = Date.now();
  const flags = navFlags.snapshot();
  const companyId = opts.companyId || user?.company_id || null;
  const publicationAllowed =
    flags.operational && flags.navigation && flags.publication && !!companyId;

  obs.recordMetric('quality_navigation_publication_ms', Date.now() - t0, {
    tenant: companyId ? String(companyId).slice(0, 8) : 'none'
  });

  return {
    ok: true,
    publication_allowed: publicationAllowed,
    denied_reason: publicationAllowed ? null : 'flags_or_tenant',
    rollout_shadow: flags.rollout_shadow,
    audience_preview: flags.audience_preview,
    flags
  };
}

module.exports = { buildPublicationContext };
