/**
 * Flags Vite — Quality Rollout Runtime (Etapa 6).
 */
function envTrue(v) {
  return v === 'true' || v === '1' || v === 'yes';
}

export function isQualityRolloutRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_ROLLOUT_RUNTIME_ENABLED);
}

export function getQualityRolloutFlagSnapshot() {
  return { rollout: isQualityRolloutRuntimeEnabled() };
}
