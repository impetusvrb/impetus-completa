/**
 * Pressão de navegação cognitiva (excesso de entradas de menu QUALITY).
 */

export function estimateNavigationPressure(menuExtraCount, viewCount) {
  const m = Math.max(0, Number(menuExtraCount) || 0);
  const v = Math.max(0, Number(viewCount) || 0);
  const score = Math.min(100, m * 6 + v * 4);
  return {
    score,
    risk: score >= 72 ? 'high' : score >= 45 ? 'medium' : 'low',
    suggest_simplify: score >= 60
  };
}
