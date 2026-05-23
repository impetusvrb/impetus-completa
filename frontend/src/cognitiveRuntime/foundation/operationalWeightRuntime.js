/**
 * Z.24 — Operational Weight Runtime (frontend).
 * Aplica pesos operacionais do backend para priorizar a visualização de blocos.
 */

export function applyOperationalWeights(blocks = [], blendedWeights = {}) {
  const layerWeightMap = {
    operational: blendedWeights.operational ?? 0.7,
    management: blendedWeights.governance ?? 0.2,
    governance: blendedWeights.governance ?? 0.2,
    strategic: blendedWeights.strategic ?? 0.1,
    cognitive: blendedWeights.operational ?? 0.5
  };

  return [...blocks]
    .map((b) => ({
      ...b,
      display_weight: (b.weight ?? 0.5) * (layerWeightMap[b.semantic_layer] ?? 0.5)
    }))
    .sort((a, b) => b.display_weight - a.display_weight);
}
