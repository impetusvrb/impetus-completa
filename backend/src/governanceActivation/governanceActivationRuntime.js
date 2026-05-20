'use strict';

/**
 * Runtime de activação — estado em memória (reversível, sem mutar env global).
 */

const phaseI = require('./config/phaseIFeatureFlags');
const { logPhaseI } = require('./phaseILogger');
const { getChannelDef, listChannels } = require('./governanceControlledActivation');
const { validateActivationRequest } = require('./governanceActivationValidator');
const { trackPromotion, trackDenial } = require('./governancePromotionTracker');

function _tenantAllowsChannel(tenantId, channel) {
  const { tenantAllowsChannel } = require('./tenantActivationIsolation');
  return tenantAllowsChannel(tenantId, channel);
}

const _globalChannels = Object.fromEntries(listChannels().map((c) => [c, false]));
const _runtimeMetrics = {
  activation_count: 0,
  denial_count: 0,
  last_activation_at: null
};

function _envFlagOn(name) {
  const v = process.env[name];
  if (v === undefined || v === '') return false;
  return String(v).toLowerCase() === 'on' || v === '1';
}

/**
 * Canal efectivamente activo para request/tenant.
 */
function resolveChannelActivation(channel, ctx = {}) {
  const def = getChannelDef(channel);
  if (!def) return { active: false, source: 'unknown_channel' };

  if (_envFlagOn(def.env_flag)) {
    return { active: true, source: 'env_flag', channel };
  }

  if (!phaseI.isControlledGovernanceActivationEnabled()) {
    return { active: false, source: 'controlled_framework_off' };
  }

  const tenantId = ctx.tenant_id || ctx.user?.company_id || null;

  if (phaseI.isTenantSafeGovernanceEnabled() && tenantId) {
    if (_tenantAllowsChannel(tenantId, channel)) {
      return { active: true, source: 'tenant_runtime', tenant_id: tenantId };
    }
    return { active: false, source: 'tenant_not_promoted', tenant_id: tenantId };
  }

  if (_globalChannels[channel]) {
    return { active: true, source: 'global_runtime' };
  }

  return { active: false, source: 'runtime_not_promoted' };
}

function isChannelEffectivelyActive(channel, ctx = {}) {
  return resolveChannelActivation(channel, ctx).active === true;
}

/**
 * Promove canal — requer validação; NUNCA auto-promove todos os tenants.
 */
function promoteChannel(channel, ctx = {}) {
  const validation = validateActivationRequest(channel, ctx);
  if (!validation.valid) {
    trackDenial({
      channel,
      tenant_id: ctx.tenant_id,
      reason: validation.reason,
      readiness_score: validation.readiness?.readiness_score
    });
    _runtimeMetrics.denial_count++;
    return { promoted: false, ...validation };
  }

  const def = getChannelDef(channel);
  const tenantId = ctx.tenant_id || null;

  if (phaseI.isTenantSafeGovernanceEnabled() && tenantId) {
    const { promoteTenantChannel } = require('./tenantGovernancePromotion');
    promoteTenantChannel(tenantId, channel, validation);
  } else {
    _globalChannels[channel] = true;
  }

  _runtimeMetrics.activation_count++;
  _runtimeMetrics.last_activation_at = new Date().toISOString();

  const promotion = trackPromotion({
    channel,
    tenant_id: tenantId,
    domain: ctx.domain,
    approved_by: ctx.approved_by || ctx.user?.id,
    quality_gate_passed: true,
    readiness_score: validation.readiness_score
  });

  logPhaseI(def.activation_event, { channel, tenant_id: tenantId, promotion_id: promotion.id });

  try {
    const audit = require('../audit/cognitiveGovernanceAuditFeed');
    audit.appendActivation({
      type: 'channel_promoted',
      channel,
      tenant_id: tenantId,
      readiness_score: validation.readiness_score,
      promotion_id: promotion.id
    });
  } catch {
    /* optional */
  }

  return {
    promoted: true,
    channel,
    tenant_id: tenantId,
    source: 'runtime_promotion',
    auto_executed: false,
    env_mutation: false,
    validation,
    promotion
  };
}

/**
 * Despromove canal runtime (rollback parcial — não altera env).
 */
function demoteChannel(channel, ctx = {}) {
  const def = getChannelDef(channel);
  const tenantId = ctx.tenant_id || null;

  if (tenantId && phaseI.isTenantSafeGovernanceEnabled()) {
    const { demoteTenantChannel } = require('./tenantGovernancePromotion');
    demoteTenantChannel(tenantId, channel);
  } else {
    _globalChannels[channel] = false;
  }

  logPhaseI(def?.rollback_event || 'GOVERNANCE_ROLLBACK_READY', { channel, tenant_id: tenantId });

  return {
    demoted: true,
    channel,
    tenant_id: tenantId,
    rollback_immediate: true,
    env_mutation: false
  };
}

function getRuntimeState() {
  return {
    controlled_framework: phaseI.isControlledGovernanceActivationEnabled(),
    tenant_safe: phaseI.isTenantSafeGovernanceEnabled(),
    global_channels: { ..._globalChannels },
    metrics: { ..._runtimeMetrics }
  };
}

function resetRuntimeForTests() {
  for (const c of listChannels()) _globalChannels[c] = false;
  _runtimeMetrics.activation_count = 0;
  _runtimeMetrics.denial_count = 0;
}

module.exports = {
  resolveChannelActivation,
  isChannelEffectivelyActive,
  promoteChannel,
  demoteChannel,
  getRuntimeState,
  resetRuntimeForTests
};
