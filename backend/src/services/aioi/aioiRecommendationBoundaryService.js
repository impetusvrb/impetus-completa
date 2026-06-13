'use strict';

/**
 * AIOI-P11.4 — Recommendation Boundary Service
 *
 * Limites cognitivos para recomendações — validação only.
 * Spec: backend/docs/AIOI_RECOMMENDATION_BOUNDARY_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const cognitiveRecommendation = require('./aioiCognitiveRecommendationService');
const authorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_RECOMMENDATION_BOUNDARY';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');

const EXECUTION_PATTERNS = [
  /\bexecute\b/i,
  /\bauto.?approv/i,
  /\bmutate\b/i,
  /\boverride sovereign\b/i,
  /\benable runtime\b/i
];

/**
 * Valida limites RB-01..RB-08.
 * @returns {Promise<object>}
 */
async function validateRecommendationBoundaries() {
  const [recResult, authState] = await Promise.all([
    cognitiveRecommendation.generateStructuredRecommendations(),
    Promise.resolve(authorization.getAuthorizationState())
  ]);

  const metaPath = path.join(BACKEND_ROOT, 'src/modules/aioi/aiAssistantRuntimeService.metadata.js');
  let runtimeMetaOk = true;
  if (fs.existsSync(metaPath)) {
    const meta = fs.readFileSync(metaPath, 'utf8');
    runtimeMetaOk = !/"cognitive_execution_allowed"\s*:\s*true/.test(meta)
      && !/"runtime_enabled"\s*:\s*true/.test(meta);
  }

  const textViolations = [];
  for (const rec of recResult.recommendations) {
    for (const pattern of EXECUTION_PATTERNS) {
      if (pattern.test(rec.recommendation_text)) {
        textViolations.push({ recommendation_id: rec.recommendation_id, pattern: pattern.source });
      }
    }
  }

  const allNotDecision = recResult.recommendations.every(r => r.is_decision === false);
  const allNotExecution = recResult.recommendations.every(r => r.is_execution === false);
  const allNotAuthorized = recResult.recommendations.every(r => r.is_authorized === false);

  const checks = [
    { id: 'RB-01', name: 'recomendacao_nao_decisao', pass: allNotDecision && textViolations.length === 0 },
    { id: 'RB-02', name: 'recomendacao_nao_execucao', pass: allNotExecution },
    { id: 'RB-03', name: 'recomendacao_nao_altera_workflow', pass: !recResult.recommendations.some(r => /alterar workflow/i.test(r.recommendation_text)) },
    { id: 'RB-04', name: 'recomendacao_nao_altera_compliance', pass: !recResult.recommendations.some(r => /alterar compliance/i.test(r.recommendation_text)) },
    { id: 'RB-05', name: 'recomendacao_nao_altera_sla', pass: !recResult.recommendations.some(r => /alterar sla/i.test(r.recommendation_text)) },
    { id: 'RB-06', name: 'recomendacao_nao_altera_soberanos', pass: !recResult.recommendations.some(r => /alterar soberano/i.test(r.recommendation_text)) },
    { id: 'RB-07', name: 'recomendacao_nao_autorizacao', pass: allNotAuthorized && !authState.authorized },
    { id: 'RB-08', name: 'recomendacao_nao_runtime_cognitivo', pass: runtimeMetaOk && authState.level === 'NONE' }
  ];

  const passCount = checks.filter(c => c.pass).length;
  const allPass = passCount === checks.length;

  return {
    ok: allPass,
    layer: LAYER,
    boundaries_valid: allPass,
    pass_count: passCount,
    total_checks: checks.length,
    checks,
    text_violations: textViolations,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateRecommendationBoundaries,
  LAYER
};
