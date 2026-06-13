'use strict';

/**
 * AIOI-P12.5 — Human Review Safety Service
 *
 * Regras de segurança para revisão humana — READ ONLY.
 * Spec: backend/docs/AIOI_HUMAN_REVIEW_SAFETY_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const humanDecisionAssistance = require('./aioiHumanDecisionAssistanceService');
const humanAuthorityBoundary = require('./aioiHumanAuthorityBoundaryService');
const authorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_HUMAN_REVIEW_SAFETY';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');

const UNSAFE_PATTERNS = [
  /\bauto.?exec/i,
  /\bauto.?approv/i,
  /\bauto.?decis/i,
  /\bauto.?modif/i,
  /\bmutate state\b/i,
  /\boverride decision\b/i
];

/**
 * Valida regras HRS-01..HRS-08.
 * @returns {Promise<object>}
 */
async function validateHumanReviewSafety() {
  const [assistance, boundaries, authState] = await Promise.all([
    humanDecisionAssistance.generateHumanDecisionAssistance(),
    humanAuthorityBoundary.validateHumanAuthorityBoundaries(),
    Promise.resolve(authorization.getAuthorizationState())
  ]);

  const metaPath = path.join(BACKEND_ROOT, 'src/modules/aioi/aiAssistantRuntimeService.metadata.js');
  let runtimeMetaOk = true;
  if (fs.existsSync(metaPath)) {
    const meta = fs.readFileSync(metaPath, 'utf8');
    runtimeMetaOk = !/"cognitive_execution_allowed"\s*:\s*true/.test(meta);
  }

  const unsafeTexts = [];
  for (const pkg of assistance.packages) {
    const texts = [
      ...pkg.observations.map(o => o.observation_text),
      ...pkg.recommendations.map(r => r.recommendation_text)
    ];
    for (const text of texts) {
      for (const pattern of UNSAFE_PATTERNS) {
        if (pattern.test(text)) {
          unsafeTexts.push({ assistance_id: pkg.assistance_id, pattern: pattern.source });
        }
      }
    }
  }

  const checks = [
    { id: 'HRS-01', name: 'sem_auto_execucao', pass: unsafeTexts.filter(t => /exec/i.test(t.pattern)).length === 0 },
    { id: 'HRS-02', name: 'sem_auto_aprovacao', pass: unsafeTexts.filter(t => /approv/i.test(t.pattern)).length === 0 },
    { id: 'HRS-03', name: 'sem_auto_decisao', pass: unsafeTexts.filter(t => /decis/i.test(t.pattern)).length === 0 },
    { id: 'HRS-04', name: 'sem_alteracao_estados', pass: assistance.packages.every(p => p.is_execution === false) },
    { id: 'HRS-05', name: 'sem_alteracao_workflow', pass: boundaries.checks.find(c => c.id === 'HAB-05')?.pass !== false },
    { id: 'HRS-06', name: 'sem_alteracao_compliance', pass: boundaries.checks.find(c => c.id === 'HAB-06')?.pass !== false },
    { id: 'HRS-07', name: 'sem_alteracao_soberanos', pass: boundaries.checks.find(c => c.id === 'HAB-07')?.pass !== false },
    { id: 'HRS-08', name: 'sem_runtime_cognitivo', pass: runtimeMetaOk && !authState.invariants.cognitive_execution_allowed }
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
  validateHumanReviewSafety,
  LAYER
};
