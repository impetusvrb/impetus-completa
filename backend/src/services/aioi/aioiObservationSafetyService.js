'use strict';

/**
 * AIOI-P10.5 — Observation Safety Service
 *
 * Garante que observações não se transformam em recomendações — READ ONLY.
 * Spec: backend/docs/AIOI_OBSERVATION_SAFETY_SPECIFICATION.md
 */

const fs = require('fs');
const path = require('path');
const cognitiveObservation = require('./aioiCognitiveObservationService');
const authorization = require('./aioiCognitiveAuthorizationService');

const LAYER = 'AIOI_OBSERVATION_SAFETY';
const BACKEND_ROOT = path.resolve(__dirname, '../../..');

const FORBIDDEN_PATTERNS = [
  /\brecommend\b/i,
  /\bsuggest\b/i,
  /\bpredict\b/i,
  /\bshould execute\b/i,
  /\bauto.?priorit/i
];

/**
 * Valida regras OS-01..OS-08.
 * @returns {Promise<object>}
 */
async function validateObservationSafety() {
  const [obsResult, authState] = await Promise.all([
    cognitiveObservation.generateStructuredObservations(),
    Promise.resolve(authorization.getAuthorizationState())
  ]);

  const metaPath = path.join(BACKEND_ROOT, 'src/modules/aioi/aiAssistantRuntimeService.metadata.js');
  let runtimeMetaOk = true;
  if (fs.existsSync(metaPath)) {
    const meta = fs.readFileSync(metaPath, 'utf8');
    runtimeMetaOk = !/"cognitive_execution_allowed"\s*:\s*true/.test(meta);
  }

  const textViolations = [];
  for (const obs of obsResult.observations) {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(obs.observation_text)) {
        textViolations.push({ observation_id: obs.observation_id, pattern: pattern.source });
      }
    }
  }

  const checks = [
    { id: 'OS-01', name: 'sem_sugestao_acao', pass: textViolations.length === 0 },
    { id: 'OS-02', name: 'sem_priorizacao_automatica', pass: !obsResult.observations.some(o => /priorit/i.test(o.observation_text) && /auto/i.test(o.observation_text)) },
    { id: 'OS-03', name: 'sem_recomendacao_executiva', pass: textViolations.filter(v => /recommend|suggest/i.test(v.pattern)).length === 0 },
    { id: 'OS-04', name: 'sem_previsao', pass: !obsResult.observations.some(o => /\bpredict/i.test(o.observation_text)) },
    { id: 'OS-05', name: 'sem_inferencia', pass: obsResult.interpretation_free === true },
    { id: 'OS-06', name: 'sem_alteracao_operacional', pass: obsResult.observations.every(o => o.evidence_sources.length > 0) },
    { id: 'OS-07', name: 'sem_autorizacao_cognitiva', pass: !authState.authorized && authState.level === 'NONE' },
    { id: 'OS-08', name: 'sem_execucao_cognitiva', pass: runtimeMetaOk && !authState.invariants.cognitive_execution_allowed }
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
    text_violations: textViolations,
    invariants: authState.invariants,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  validateObservationSafety,
  LAYER
};
