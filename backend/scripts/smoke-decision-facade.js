#!/usr/bin/env node
/**
 * Validação controlada do decisionFacade vs unifiedDecisionEngine.
 *
 * Pré-requisitos (ambiente de staging / dev):
 *   UNIFIED_DECISION_ENGINE=true
 *   USE_DECISION_FACADE=true   (opcional para o script; o facade chama sempre o motor)
 *   DECISION_FACADE_VALIDATE=true — emite [DECISION_FACADE_COHERENCE] detalhado
 *
 * Uso (na pasta backend):
 *   UNIFIED_DECISION_ENGINE=true DECISION_FACADE_VALIDATE=true node scripts/smoke-decision-facade.js
 *
 * Opcional: SMOKE_COMPANY_ID=uuid SMOKE_USER_ID=123
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

process.env.UNIFIED_DECISION_ENGINE = process.env.UNIFIED_DECISION_ENGINE || 'true';
process.env.DECISION_FACADE_VALIDATE = process.env.DECISION_FACADE_VALIDATE || 'true';

const { decideWithFacade, decisionFingerprint } = require('../src/services/decisionFacadeService');

const companyId = process.env.SMOKE_COMPANY_ID || process.env.TEST_COMPANY_ID || null;
const userId = process.env.SMOKE_USER_ID || 'smoke_facade_user';

const mockUser = {
  id: userId,
  company_id: companyId,
  role: 'admin'
};

const CASES = [
  {
    name: 'simples',
    context: {
      message: 'Bom dia. O sistema está ligado?',
      company_id: companyId,
      module: 'smoke_facade'
    },
    source: 'smoke_facade_simple',
    skipCognitiveInvocation: true
  },
  {
    name: 'ambíguo',
    context: {
      message:
        'Temos queda de pressão no compressor A, atraso na ordem 4402 e equipa a pedir priorização — o que fazer primeiro?',
      company_id: companyId,
      module: 'smoke_facade'
    },
    source: 'smoke_facade_ambiguous',
    skipCognitiveInvocation: true
  },
  {
    name: 'crítico_humano',
    context: {
      message:
        'Emergência: possível incêndio elétrico na zona da prensa — preciso de evacuação e corte de energia.',
      company_id: companyId,
      module: 'smoke_facade'
    },
    source: 'smoke_facade_critical',
    skipCognitiveInvocation: true
  }
];

function compareFacadeVsUnified(facaded, caseName) {
  const ur = facaded.unified_result;
  const issues = [];
  const fp1 = decisionFingerprint(facaded.decision);
  const fp2 = decisionFingerprint(ur?.decision);
  if (fp1 !== fp2) issues.push('fingerprint_mismatch');
  if (facaded.decision != null && ur?.decision != null && facaded.decision !== ur.decision) {
    issues.push('reference_mismatch');
  }
  return { caseName, issues, fp_ok: issues.length === 0 };
}

async function main() {
  if (process.env.UNIFIED_DECISION_ENGINE !== 'true') {
    console.error('[smoke-decision-facade] Defina UNIFIED_DECISION_ENGINE=true');
    process.exit(1);
  }

  console.info('[smoke-decision-facade] Início — 3 cenários (simples, ambíguo, crítico).');
  const summaries = [];

  for (const c of CASES) {
    console.info(`\n--- Cenário: ${c.name} ---`);
    const facaded = await decideWithFacade({
      user: mockUser,
      context: c.context,
      source: c.source,
      skipCognitiveInvocation: c.skipCognitiveInvocation
    });

    const ur = facaded.unified_result;
    const row = {
      scenario: c.name,
      success: facaded.success,
      engine_resolved: facaded.metadata?.engine_resolved,
      used_fallback: facaded.metadata?.used_fallback,
      cognitive_escalation_facade: facaded.metadata?.cognitive_escalation,
      cognitive_escalation_unified: !!(ur && ur.meta && ur.meta.cognitive_escalation),
      score: facaded.confidence,
      risk_level: facaded.risk_level,
      pipeline: facaded.pipeline,
      skipped_engine: facaded.metadata?.skipped_engine
    };
    console.info('[smoke-decision-facade] Resumo', JSON.stringify(row));

    const cmp = compareFacadeVsUnified(facaded, c.name);
    summaries.push({ ...row, coherence: cmp });

    if (cmp.issues.length) {
      console.warn('[smoke-decision-facade] COERÊNCIA', JSON.stringify(cmp));
    }
  }

  const failed = summaries.filter((s) => s.coherence && !s.coherence.fp_ok);
  if (failed.length) {
    console.error('[smoke-decision-facade] Falhou coerência em:', failed.map((f) => f.scenario).join(', '));
    process.exit(2);
  }

  console.info('\n[smoke-decision-facade] Concluído — coerência facade vs unified OK nos 3 cenários.');
}

main().catch((e) => {
  console.error('[smoke-decision-facade]', e?.message || e);
  process.exit(1);
});
