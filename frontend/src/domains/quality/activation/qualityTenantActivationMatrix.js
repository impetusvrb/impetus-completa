/**
 * Matriz tenant × estágio de rollout (declarativa).
 */

export const QUALITY_TENANT_ACTIVATION_MATRIX = Object.freeze([
  { stage: 'shadow', tenant_scope: 'all', menu_live: false, api_live: true },
  { stage: 'pilot', tenant_scope: 'allowlist', menu_live: true, api_live: true },
  { stage: 'canary', tenant_scope: 'percentage', menu_live: true, api_live: true },
  { stage: 'staged', tenant_scope: 'cohort', menu_live: true, api_live: true },
  { stage: 'partial', tenant_scope: 'majority', menu_live: true, api_live: true },
  { stage: 'full', tenant_scope: 'all', menu_live: true, api_live: true }
]);

export function describeTenantActivation(stage) {
  return QUALITY_TENANT_ACTIVATION_MATRIX.find((r) => r.stage === stage) || QUALITY_TENANT_ACTIVATION_MATRIX[0];
}
