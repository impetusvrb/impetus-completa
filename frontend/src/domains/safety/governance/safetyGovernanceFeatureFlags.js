function envTrue(v) {
  return v === 'true' || v === '1' || v === 'yes';
}

export function isSafetyGovernanceRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_SAFETY_GOVERNANCE_RUNTIME_ENABLED);
}
