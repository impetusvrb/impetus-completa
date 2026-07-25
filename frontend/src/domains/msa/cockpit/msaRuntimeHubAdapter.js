/**
 * GF-011 — Adapter read-only hub msa_native (sem BD, sem recálculo).
 */

const HUB_CENTER_KEYS = {
  study_governance: ['msa_study_governance_ops'],
  gauge_management: ['msa_gauge_management_ops'],
  variable_grr: ['msa_variable_grr_ops'],
  attribute_agreement: ['msa_attribute_agreement_ops'],
  calibration: ['msa_calibration_ops'],
  cognitive: ['msa_cognitive_ops']
};

export function buildMsaHubContext(payload = {}) {
  const runtime = payload.msa_cognitive_runtime || {};
  const centers = payload.msa_cognitive_centers || runtime.centers || [];
  const signalLoader = payload.msa_signal_loader || {};
  return {
    runtime,
    centers,
    signalLoader,
    binding_ratio: runtime.binding_ratio ?? signalLoader.binding_ratio ?? 0,
    bound_blocks: runtime.bound_blocks || signalLoader.bound_blocks || [],
    missing_blocks: runtime.missing_blocks || signalLoader.missing_blocks || []
  };
}

export function resolveMsaHubView(hubKey, hubContext = {}) {
  const centerIds = HUB_CENTER_KEYS[hubKey] || [];
  const centers = (hubContext.centers || []).filter((c) => centerIds.includes(c.center_id));
  const hasBlocks = centers.some((c) => (c.blocks || []).length > 0);
  const metrics = centers.flatMap((c) =>
    (c.metrics || []).slice(0, 2).map((m) => ({
      label: m.block_id || 'signal',
      value: JSON.stringify(m).slice(0, 48)
    }))
  );

  return {
    state: hasBlocks ? 'REAL_DATA' : 'INSUFFICIENT_DATA',
    binding_ratio: hubContext.binding_ratio,
    metrics,
    hubKey
  };
}
