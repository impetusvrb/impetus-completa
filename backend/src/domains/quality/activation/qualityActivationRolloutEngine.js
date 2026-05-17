'use strict';

const STAGES = Object.freeze(['shadow', 'pilot', 'canary', 'staged', 'partial', 'full']);

function resolveActivationStage() {
  const s = String(process.env.IMPETUS_QUALITY_ACTIVATION_STAGE || 'shadow').toLowerCase();
  return STAGES.includes(s) ? s : 'shadow';
}

function allowsDefinitivePublication(stage, shadowModeEnv) {
  const shadow = String(shadowModeEnv || process.env.IMPETUS_QUALITY_PUBLICATION_SHADOW_MODE || '')
    .toLowerCase() === 'true';
  if (shadow) return false;
  if (stage === 'shadow') return false;
  return stage === 'staged' || stage === 'partial' || stage === 'full' || stage === 'pilot' || stage === 'canary';
}

function describeRolloutProgress(stage) {
  const idx = STAGES.indexOf(stage);
  return {
    stage,
    index: idx >= 0 ? idx : 0,
    total: STAGES.length,
    rollback_safe: true
  };
}

module.exports = {
  STAGES,
  resolveActivationStage,
  allowsDefinitivePublication,
  describeRolloutProgress
};
