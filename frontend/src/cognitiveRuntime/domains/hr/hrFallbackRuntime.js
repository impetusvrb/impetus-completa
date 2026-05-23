export function shouldUseHrFallback(meData = {}) {
  const rt = meData?.hr_cognitive_runtime;
  if (!rt) return true;
  return rt.consolidation_applied !== true && rt.fallback_preserved !== false;
}

export default shouldUseHrFallback;
