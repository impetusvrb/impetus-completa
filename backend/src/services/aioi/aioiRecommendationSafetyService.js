'use strict';

/**
 * AIOI-P11.5 — Recommendation Safety Service
 *
 * Regras de segurança para recomendações — READ ONLY.
 * Spec: backend/docs/AIOI_RECOMMENDATION_SAFETY_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const cognitiveRecommendation = require('./aioiCognitiveRecommendationService');
const recommendationBoundary = require('./aioiRecommendationBoundaryService');
const authorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_RECOMMENDATION_SAFETY';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');

const UNSAFE_PATTERNS = [
  /\bauto.?exec/i,
  /\bauto.?approv/i,
  /\bauto.?escal/i,
  /\bauto.?modif/i,
  /\bmutate state\b/i,
  /\boverride decision\b/i
];

/**
 * Valida regras RS-01..RS-08.
 * @returns {Promise<object>}
 */
async function validateRecommendationSafety() {
  const [recResult, boundaries, authState] = await Promise.all([
    cognitiveRecommendation.generateStructuredRecommendations(),
    recommendationBoundary.validateRecommendationBoundaries(),
    Promise.resolve(authorization.getAuthorizationState())
  ]);

  const metaPath = path.join(BACKEND_ROOT, 'src/modules/aioi/aiAssistantRuntimeService.metadata.js');
  let runtimeMetaOk = true;
  if (fs.existsSync(metaPath)) {
    const meta = fs.readFileSync(metaPath, 'utf8');
    runtimeMetaOk = !/"cognitive_execution_allowed"\s*:\s*true/.test(meta);
  }

  const unsafeTexts = [];
  for (const rec of recResult.recommendations) {
    for (const pattern of UNSAFE_PATTERNS) {
      if (pattern.test(rec.recommendation_text)) {
        unsafeTexts.push({ recommendation_id: rec.recommendation_id, pattern: pattern.source });
      }
    }
  }

  const checks = [
    { id: 'RS-01', name: 'sem_auto_execucao', pass: unsafeTexts.filter(t => /exec/i.test(t.pattern)).length === 0 },
    { id: 'RS-02', name: 'sem_auto_aprovacao', pass: unsafeTexts.filter(t => /approv/i.test(t.pattern)).length === 0 },
    { id: 'RS-03', name: 'sem_auto_escalacao', pass: unsafeTexts.filter(t => /escal/i.test(t.pattern)).length === 0 },
    { id: 'RS-04', name: 'sem_auto_modificacao', pass: unsafeTexts.filter(t => /modif/i.test(t.pattern)).length === 0 },
    { id: 'RS-05', name: 'sem_alteracao_estados', pass: recResult.recommendations.every(r => r.is_execution === false) },
    { id: 'RS-06', name: 'sem_alteracao_decisoes', pass: recResult.recommendations.every(r => r.is_decision === false) },
    { id: 'RS-07', name: 'sem_alteracao_soberanos', pass: boundaries.checks.find(c => c.id === 'RB-06')?.pass !== false },
    { id: 'RS-08', name: 'sem_execucao_cognitiva', pass: runtimeMetaOk && !authState.invariants.cognitive_execution_allowed }
  ];

  const passCount = checks.filter(c => c.pass).length;
  const allPass = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    safety_valid: allPass,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    unsafe_texts: unsafeTexts,
    invariants: authState.invariants,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateRecommendationSafety,
  LAYER
};
