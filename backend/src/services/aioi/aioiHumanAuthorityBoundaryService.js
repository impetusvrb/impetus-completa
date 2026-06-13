'use strict';

/**
 * AIOI-P12.4 — Human Authority Boundary Service
 *
 * Limites de autoridade humana — validação only.
 * Spec: backend/docs/AIOI_HUMAN_AUTHORITY_BOUNDARY_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const humanDecisionAssistance = require('./aioiHumanDecisionAssistanceService');
const authorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_HUMAN_AUTHORITY_BOUNDARY';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');

const EXECUTION_PATTERNS = [
  /\bexecute\b/i,
  /\bauto.?approv/i,
  /\bauto.?decis/i,
  /\bmutate\b/i,
  /\boverride sovereign\b/i,
  /\benable runtime\b/i
];

/**
 * Valida limites HAB-01..HAB-08.
 * @returns {Promise<object>}
 */
async function validateHumanAuthorityBoundaries() {
  const [assistance, authState] = await Promise.all([
    humanDecisionAssistance.generateHumanDecisionAssistance(),
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
  for (const pkg of assistance.packages) {
    const texts = [
      ...pkg.observations.map(o => o.observation_text),
      ...pkg.recommendations.map(r => r.recommendation_text)
    ];
    for (const text of texts) {
      for (const pattern of EXECUTION_PATTERNS) {
        if (pattern.test(text)) {
          textViolations.push({ assistance_id: pkg.assistance_id, pattern: pattern.source });
        }
      }
    }
  }

  const allHumanSovereign = assistance.packages.every(p => p.human_sovereign === true);
  const allReviewRequired = assistance.packages.every(p => p.review_required === true);
  const allNotDecision = assistance.packages.every(p => p.is_decision === false);
  const allNotExecution = assistance.packages.every(p => p.is_execution === false);
  const allNotAuthorized = assistance.packages.every(p => p.is_authorized === false);

  const checks = [
    { id: 'HAB-01', name: 'humano_e_soberano', pass: allHumanSovereign && allReviewRequired },
    { id: 'HAB-02', name: 'assistencia_nao_decisao', pass: allNotDecision && textViolations.length === 0 },
    { id: 'HAB-03', name: 'assistencia_nao_execucao', pass: allNotExecution },
    { id: 'HAB-04', name: 'assistencia_nao_autorizacao', pass: allNotAuthorized && !authState.authorized },
    { id: 'HAB-05', name: 'assistencia_nao_altera_workflow', pass: !assistance.packages.some(p =>
      p.recommendations.some(r => /alterar workflow/i.test(r.recommendation_text))
    ) },
    { id: 'HAB-06', name: 'assistencia_nao_altera_compliance', pass: !assistance.packages.some(p =>
      p.recommendations.some(r => /alterar compliance/i.test(r.recommendation_text))
    ) },
    { id: 'HAB-07', name: 'assistencia_nao_altera_soberanos', pass: !assistance.packages.some(p =>
      p.recommendations.some(r => /alterar soberano/i.test(r.recommendation_text))
    ) },
    { id: 'HAB-08', name: 'assistencia_nao_runtime_cognitivo', pass: runtimeMetaOk && authState.level === 'NONE' }
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
  validateHumanAuthorityBoundaries,
  LAYER
};
