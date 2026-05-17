/**
 * Matriz planta × publicação (placeholder governance-safe).
 */

export const QUALITY_PLANT_PUBLICATION_MATRIX = Object.freeze([
  { plant_maturity: 'low', publication: 'shadow_only' },
  { plant_maturity: 'medium', publication: 'staged' },
  { plant_maturity: 'high', publication: 'full_allowed' }
]);

export function resolvePlantPublication(maturity) {
  const m = String(maturity || 'low').toLowerCase();
  return (
    QUALITY_PLANT_PUBLICATION_MATRIX.find((r) => r.plant_maturity === m) || QUALITY_PLANT_PUBLICATION_MATRIX[0]
  );
}
