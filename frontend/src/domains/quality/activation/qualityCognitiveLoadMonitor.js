/**
 * Pressão cognitiva estimada (menus + vistas simultâneas).
 */

let _loadScore = 0;

export function addCognitiveLoadPoints(delta) {
  _loadScore = Math.max(0, Math.min(100, _loadScore + Number(delta) || 0 ));
}

export function getCognitiveLoadSnapshot() {
  return { score_0_100: _loadScore, saturated: _loadScore >= 85 };
}

export function resetCognitiveLoad() {
  _loadScore = 0;
}
