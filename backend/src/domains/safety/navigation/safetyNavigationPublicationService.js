'use strict';

const navFlags = require('./safetyNavigationFlags');
const obs = require('../../../services/operational/enterpriseObservabilityRuntime');

/**
 * Contexto de publicação SST para o frontend (assistivo, sem authority).
 * @param {object} user — req.user
 * @param {object} [opts]
 */
function buildPublicationContext(user, opts = {}) {
  const t0 = Date.now();
  const flags = navFlags.snapshot();
  const companyId = opts.companyId || user?.company_id || null;
  const publicationAllowed =
    flags.operational && flags.navigation && flags.publication && !!companyId;

  try {
    obs.recordMetric('safety_navigation_publication_ms', Date.now() - t0, {
      tenant: companyId ? String(companyId).slice(0, 8) : 'none'
    });
  } catch (_e) {
    /* observability must not throw */
  }

  return {
    ok: true,
    domain: 'safety',
    publication_allowed: publicationAllowed,
    denied_reason: publicationAllowed ? null : 'flags_or_tenant',
    rollout_shadow: flags.rollout_shadow,
    audience_preview: flags.audience_preview,
    flags
  };
}

module.exports = { buildPublicationContext };
