function envTrue(v) {
  return v === 'true' || v === '1' || v === 'yes';
}

export function isSafetyRolloutRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_SAFETY_ROLLOUT_RUNTIME_ENABLED);
}
