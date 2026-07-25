/**
 * GF-018 — Adapter read-only hub ishikawa_native (sem BD, sem recálculo).
 */

const HUB_CENTER_KEYS = {
  investigation_overview: ['ishikawa_investigation_overview_ops'],
  fishbone: ['ishikawa_fishbone_ops'],
  five_why: ['ishikawa_five_why_ops'],
  corrective_actions: ['ishikawa_corrective_actions_ops'],
  preventive_actions: ['ishikawa_preventive_actions_ops'],
  evidence: ['ishikawa_evidence_ops'],
  approvals: ['ishikawa_approvals_ops'],
  recurrence: ['ishikawa_recurrence_ops'],
  organizational_learning: ['ishikawa_organizational_learning_ops'],
  narrative: ['ishikawa_narrative_ops']
};

export function buildIshikawaHubContext(payload = {}) {
  const runtime = payload.ishikawa_cognitive_runtime || {};
  const centers = payload.ishikawa_cognitive_centers || runtime.centers || [];
  const signalLoader = payload.ishikawa_signal_loader || {};
  return {
    runtime,
    centers,
    signalLoader,
    binding_ratio: runtime.binding_ratio ?? signalLoader.binding_ratio ?? 0,
    bound_blocks: runtime.bound_blocks || signalLoader.bound_blocks || [],
    missing_blocks: runtime.missing_blocks || signalLoader.missing_blocks || [],
    promotion_applied: runtime.promotion_applied === true
  };
}

export function resolveIshikawaHubView(hubKey, hubContext = {}) {
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
