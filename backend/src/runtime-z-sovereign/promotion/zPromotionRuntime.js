'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');
const { emitSZ1 } = require('../observability/zSovereignObservability');

/**
 * Stages possíveis e o que cada um significa em termos de soberania.
 *
 *  - LEGACY_PRIMARY:               Motor A sustenta tudo; Z só observa.
 *  - Z_SHADOW:                     Z produz payload em paralelo, comparado mas
 *                                  nunca entregue ao frontend.
 *  - Z_ASSISTIVE:                  Z enriquece payload Motor A (estado actual
 *                                  C0–C6).
 *  - Z_PRIMARY_WITH_A_FALLBACK:    Z fornece payload primário; Motor A
 *                                  permanece sincronamente em standby para
 *                                  fallback automático.
 *  - Z_SOVEREIGN:                  Z fornece payload primário sem invocar
 *                                  Motor A para bootstrap (mas o módulo
 *                                  continua disponível em código).
 *  - LEGACY_COMPATIBILITY_ONLY:    Motor A só corre quando explicitamente
 *                                  pedido para compatibilidade/rollback.
 *
 * Esta promoção é SEMPRE governada — nunca automática.
 */
function resolveStageForTenant(user = {}, ctx = {}) {
  if (!flags.isPromotionEnabled()) {
    return { stage: 'LEGACY_PRIMARY', reason: 'promotion_disabled' };
  }

  const tenantId = user?.company_id ? String(user.company_id) : null;
  const promotedSet = new Set(flags.promotedTenants());
  if (tenantId && promotedSet.has(tenantId)) {
    return {
      stage: flags.promotedTenantStage(),
      reason: 'tenant_explicitly_promoted',
      tenant_id: tenantId
    };
  }

  if (ctx.force_stage && flags.STAGES.includes(String(ctx.force_stage).toUpperCase())) {
    return { stage: String(ctx.force_stage).toUpperCase(), reason: 'ctx_force_stage' };
  }

  return {
    stage: flags.defaultStage(),
    reason: 'default_stage',
    tenant_id: tenantId
  };
}

function isShadowOnly(stage) {
  return stage === 'LEGACY_PRIMARY' || stage === 'Z_SHADOW';
}

function isZPrimary(stage) {
  return stage === 'Z_PRIMARY_WITH_A_FALLBACK' || stage === 'Z_SOVEREIGN' || stage === 'LEGACY_COMPATIBILITY_ONLY';
}

function isZEnriching(stage) {
  return stage === 'Z_ASSISTIVE' || isZPrimary(stage);
}

function reportStage(stageInfo) {
  emitSZ1('STAGE_RESOLVED', stageInfo);
  return stageInfo;
}

module.exports = {
  resolveStageForTenant,
  isShadowOnly,
  isZPrimary,
  isZEnriching,
  reportStage,
  STAGES: flags.STAGES
};
