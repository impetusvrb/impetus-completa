/**
 * Audiência × estágio de rollout.
 */

export const QUALITY_ROLLOUT_AUDIENCE_MATRIX = Object.freeze([
  { stage: 'shadow', audiences: ['auditor', 'director'] },
  { stage: 'pilot', audiences: ['coordinator', 'director', 'auditor', 'operator'] },
  { stage: 'canary', audiences: ['coordinator', 'director', 'operator', 'production'] },
  { stage: 'full', audiences: ['*'] }
]);

export function audiencesForStage(stage) {
  const row = QUALITY_ROLLOUT_AUDIENCE_MATRIX.find((r) => r.stage === stage);
  return row ? row.audiences : ['auditor'];
}
