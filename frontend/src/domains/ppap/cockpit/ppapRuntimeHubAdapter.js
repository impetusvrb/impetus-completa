/**
 * GF-004 — Adapter read-only hub ppap_native (sem BD, sem recálculo).
 */

const HUB_CENTER_KEYS = {
  submission_governance: ['ppap_submission_governance'],
  supplier_approval: ['ppap_supplier_approval_ops'],
  dimensional: ['ppap_dimensional_ops'],
  capability: ['ppap_capability_ops'],
  engineering: ['ppap_engineering_ops'],
  cognitive: ['ppap_cognitive_ops']
};

export function buildPpapHubContext(payload = {}) {
  const runtime = payload.ppap_cognitive_runtime || {};
  const centers = payload.ppap_cognitive_centers || runtime.centers || [];
  const signalLoader = payload.ppap_signal_loader || {};
  return {
    runtime,
    centers,
    signalLoader,
    binding_ratio: runtime.binding_ratio ?? signalLoader.binding_ratio ?? 0,
    bound_blocks: runtime.bound_blocks || signalLoader.bound_blocks || [],
    missing_blocks: runtime.missing_blocks || signalLoader.missing_blocks || []
  };
}

export function resolvePpapHubView(hubKey, hubContext = {}) {
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
