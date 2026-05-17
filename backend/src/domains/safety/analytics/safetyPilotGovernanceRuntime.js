'use strict';

const rolloutEngine = require('../activation/safetyActivationRolloutEngine');

/** @type {Map<string, object>} */
const _pilotMatrix = new Map();

/**
 * @param {object} cfg
 * @param {string} cfg.tenant_id
 * @param {string} [cfg.plant_id]
 * @param {string[]} [cfg.audience_bands]
 * @param {string[]} [cfg.capabilities]
 * @param {string} [cfg.maturity] low|medium|high
 * @param {boolean} [cfg.enabled]
 */
function registerPilotScope(cfg) {
  const tenantId = String(cfg.tenant_id || '');
  if (!tenantId) return { ok: false, error: 'tenant_id_required' };
  const key = `${tenantId}:${cfg.plant_id || '*'}`;
  const row = {
    tenant_id: tenantId,
    plant_id: cfg.plant_id || null,
    audience_bands: Array.isArray(cfg.audience_bands) ? cfg.audience_bands.slice() : ['operator', 'sst_technician'],
    capabilities: Array.isArray(cfg.capabilities) ? cfg.capabilities.slice() : ['safety_intelligence'],
    maturity: cfg.maturity || 'medium',
    enabled: cfg.enabled !== false,
    stage: rolloutEngine.resolveActivationStage(),
    updated_at: new Date().toISOString()
  };
  _pilotMatrix.set(key, row);
  return { ok: true, scope: row };
}

function listPilotScopes(tenantId) {
  const out = [];
  for (const [k, v] of _pilotMatrix) {
    if (!tenantId || v.tenant_id === tenantId) out.push({ key: k, ...v });
  }
  return out;
}

/**
 * @param {object} ctx — { tenant_id, plant_id, audience_band, capability }
 */
function isPilotAllowedForContext(ctx) {
  const tenantId = String(ctx.tenant_id || '');
  const plantId = ctx.plant_id || '*';
  const key = `${tenantId}:${plantId}`;
  const wildcard = `${tenantId}:*`;
  const scope = _pilotMatrix.get(key) || _pilotMatrix.get(wildcard);
  if (!scope || !scope.enabled) {
    return { allowed: false, reason: 'no_pilot_scope' };
  }
  const band = ctx.audience_band || '';
  if (scope.audience_bands.length && !scope.audience_bands.includes(band)) {
    return { allowed: false, reason: 'audience_not_in_pilot' };
  }
  const cap = ctx.capability || 'safety_intelligence';
  if (scope.capabilities.length && !scope.capabilities.includes(cap)) {
    return { allowed: false, reason: 'capability_not_in_pilot' };
  }
  return { allowed: true, scope };
}

module.exports = {
  registerPilotScope,
  listPilotScopes,
  isPilotAllowedForContext
};
