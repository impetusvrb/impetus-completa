'use strict';

const matrix = require('./audiencePilotMatrix');
const protection = require('./operationalAudienceProtection');

/**
 * Liberação contextual de audiência por wave (sem governance escalation).
 */
function evaluateAudienceRelease(ctx = {}) {
  const tenantId = String(ctx.tenant_id || '');
  const band = String(ctx.audience_band || 'operator');
  const domain = String(ctx.domain || 'quality');
  const pilot = matrix.getAudiencePilotMatrix(tenantId, ctx.pilot_wave);

  const inMatrix =
    pilot.allowed_bands.includes(band) && pilot.allowed_domains.includes(domain);
  const prot = protection.checkOperationalAudienceProtection({
    ...ctx,
    tenant_id: tenantId,
    audience_band: band,
    domain
  });

  const released = inMatrix && prot.allowed && !ctx.audience_frozen;
  return {
    ok: true,
    released,
    pilot_wave: pilot.current_wave,
    matrix: pilot,
    protection: prot,
    reason: released ? null : prot.reason || (inMatrix ? null : 'band_or_domain_not_in_wave')
  };
}

module.exports = { evaluateAudienceRelease };
