'use strict';

const navFlags = require('./environmentNavigationFlags');
const obs = require('../../../services/operational/enterpriseObservabilityRuntime');

function buildPublicationContext(user, opts = {}) {
  const t0 = Date.now();
  const flags = navFlags.snapshot();
  const companyId = opts.companyId || user?.company_id || null;
  const publicationAllowed =
    flags.operational && flags.navigation && flags.publication && !!companyId;

  let audience_band = null;
  let capabilities = null;
  if (opts.enrich === true) {
    try {
      const audienceResolver = require('../publication/environmentAudienceResolver');
      const capabilityResolver = require('../publication/environmentCapabilityResolver');
      audience_band = audienceResolver.resolveEnvironmentAudienceBand(user);
      capabilities = capabilityResolver.resolveEnvironmentCapabilities({
        hasEnvironmentIntelligenceModule: opts.hasEnvironmentIntelligenceModule !== false
      });
    } catch (_e) {
      /* enrichment optional */
    }
  }

  try {
    obs.recordMetric('environment_publication_resolution_ms', Date.now() - t0, {
      tenant: companyId ? String(companyId).slice(0, 8) : 'none'
    });
  } catch (_e) {
    /* observability must not throw */
  }

  return {
    ok: true,
    domain: 'environment',
    publication_allowed: publicationAllowed,
    denied_reason: publicationAllowed ? null : 'flags_or_tenant',
    rollout_shadow: flags.rollout_shadow,
    audience_preview: flags.audience_preview,
    audience_band,
    capabilities,
    flags,
    bounded_context: true,
    assistive_only: true,
    shadow_only: flags.rollout_shadow
  };
}

module.exports = { buildPublicationContext };
