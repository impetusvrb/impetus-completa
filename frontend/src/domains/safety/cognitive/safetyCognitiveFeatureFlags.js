function envTrue(v) {
  return v === 'true' || v === '1' || v === 'yes';
}

export function isSafetyCognitiveRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_SAFETY_COGNITIVE_RUNTIME_ENABLED);
}
