export function superviseAdaptiveFallback(meData = {}) {
  if (!meData?.adaptive_orchestration) return { mode: 'standard' };
  return { mode: 'adaptive_shadow', supervised: true, mutation: false };
}

export default superviseAdaptiveFallback;
