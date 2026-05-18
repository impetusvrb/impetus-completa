/**
 * Matriz de capacidades ENVIRONMENT (publication-safe, shadow-aware).
 */
export const ENVIRONMENT_CAPABILITY_KEYS = Object.freeze([
  'environment_intelligence',
  'environment_operational',
  'environment_governance',
  'environment_telemetry',
  'environment_cognitive',
  'environment_executive'
]);

export const ENVIRONMENT_CAPABILITY_MATRIX = Object.freeze({
  environment_intelligence: { module: 'environment_intelligence' },
  environment_operational: { requires: { operational: true } },
  environment_governance: { requires: { governance: true } },
  environment_telemetry: { manifestIds: ['environment_telemetry'] },
  environment_cognitive: { requires: { cognitive: true } },
  environment_executive: { requires: { executive: true } }
});
