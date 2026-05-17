'use strict';

const navFlags = require('./logisticsNavigationFlags');
const obs = require('../../../services/operational/enterpriseObservabilityRuntime');

function buildPublicationContext(user, opts = {}) {
  const t0 = Date.now();
  const flags = navFlags.snapshot();
  const companyId = opts.companyId || user?.company_id || null;
  const publicationAllowed =
    flags.operational && flags.navigation && flags.publication && !!companyId;

  try {
    obs.recordMetric('logistics_publication_resolution_ms', Date.now() - t0, {
      tenant: companyId ? String(companyId).slice(0, 8) : 'none'
    });
  } catch (_e) {
    /* observability must not throw */
  }

  return {
    ok: true,
    domain: 'logistics',
    publication_allowed: publicationAllowed,
    denied_reason: publicationAllowed ? null : 'flags_or_tenant',
    rollout_shadow: flags.rollout_shadow,
    audience_preview: flags.audience_preview,
    flags,
    bounded_context: true,
    assistive_only: true
  };
}

module.exports = { buildPublicationContext };
