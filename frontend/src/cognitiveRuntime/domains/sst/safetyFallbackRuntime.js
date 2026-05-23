/**
 * Z.25 — Preserva fallback legacy quando consolidação SST não aplica
 */

export function shouldUseSafetyFallback(meData = {}) {
  const rt = meData?.sst_cognitive_runtime;
  if (!rt) return true;
  return rt.consolidation_applied !== true && rt.fallback_preserved !== false;
}

export default shouldUseSafetyFallback;
