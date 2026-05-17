'use strict';

const STAGES = Object.freeze(['shadow', 'pilot', 'controlled', 'canary', 'staged', 'partial', 'full']);

function resolveActivationStage() {
  const s = String(process.env.IMPETUS_LOGISTICS_ACTIVATION_STAGE || 'shadow').toLowerCase();
  if (s === 'controlled') return 'controlled';
  return STAGES.includes(s) ? s : 'shadow';
}

function allowsDefinitivePublication(stage, shadowModeEnv) {
  const shadow =
    String(shadowModeEnv || process.env.IMPETUS_LOGISTICS_PUBLICATION_SHADOW_MODE || '').toLowerCase() ===
    'true';
  if (shadow) return false;
  if (stage === 'shadow') return false;
  return ['staged', 'partial', 'full', 'pilot', 'controlled', 'canary'].includes(stage);
}

function describeRolloutProgress(stage) {
  const idx = STAGES.indexOf(stage);
  return {
    stage,
    index: idx >= 0 ? idx : 0,
    total: STAGES.length,
    rollback_safe: true,
    auto_promotion: false
  };
}

module.exports = {
  STAGES,
  resolveActivationStage,
  allowsDefinitivePublication,
  describeRolloutProgress
};
