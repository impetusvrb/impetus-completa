'use strict';

/**
 * Camada de política — governança adaptativa, resolução de políticas da organização,
 * bloqueios antecipados e enforcement sobre a síntese final.
 */

const { PIPELINE_VERSION } = require('../aiRoles');
const {
  redactForPersistence,
  sanitizeLayersForHttpResponse
} = require('../cognitiveDossier');
const cognitiveAudit = require('../cognitiveAudit');
const aiAnalytics = require('../../services/aiAnalyticsService');
const aiProviderService = require('../../services/aiProviderService');
const dataClassificationService = require('../../services/dataClassificationService');
const aiLegalAuditService = require('../../services/aiLegalAuditService');
const policyEngineService = require('../../services/policyEngineService');
const policyEnforcementService = require('../../services/policyEnforcementService');
const adaptiveGovernanceEngine = require('../../services/adaptiveGovernanceEngine');
const aiComplianceEngine = require('../../services/aiComplianceEngine');
const observabilityService = require('../../services/observabilityService');
const behavioralIntelligenceService = require('../../services/behavioralIntelligenceService');

const AI_POLICY_ENGINE_ON = process.env.AI_POLICY_ENGINE_ENABLED !== 'false';

function buildStagesArray(dossier) {
  return (dossier.logs || []).map((l) => ({
    name: l.stage,
    provider: l.provider,
    summary: l.summary,
    at: l.ts
  }));
}

/** Contexto mínimo para criptografia em repouso (policy.rules.force_encryption). */
function traceEncryptionPolicyHint(rules) {
  if (!rules || typeof rules !== 'object' || rules.force_encryption !== true) return undefined;
  return { force_encryption: true };
}

async function buildAdaptiveBlockedCouncilResult({
  traceId,
  user,
  scope,
  module,
  sanitized,
  dossier,
  options,
  adaptivePolicy,
  policyOperationType,
  t0,
  risk
}) {
  const duration = Date.now() - t0;
  const blockMsg =
    adaptivePolicy.block_reason_pt ||
    'Política IMPETUS: a resposta assistida não está disponível neste contexto de segurança. Contacte o supervisor técnico ou o apoio IMPETUS.';
  const synthesis = {
    content: blockMsg,
    answer: blockMsg,
    confidence: 0,
    confidence_score: 0,
    explanation_layer: {
      limitations: [
        'Interação bloqueada pela governança adaptativa IMPETUS antes do encadeamento completo dos modelos.'
      ],
      orchestration_context: { adaptive_block: true }
    },
    warnings: ['ADAPTIVE_GOVERNANCE_BLOCK'],
    based_on: [],
    requires_action: true,
    degraded: true,
    explanation: null
  };
  const legalBasisAdaptive = aiComplianceEngine.resolveLegalBasis(module);
  const classifAdaptive = dataClassificationService.classifyData({
    prompt: sanitized,
    context: aiAnalytics.summarizeDossierData(dossier.data),
    model_answer: blockMsg
  });
  synthesis.explanation_layer = {
    ...(synthesis.explanation_layer && typeof synthesis.explanation_layer === 'object'
      ? synthesis.explanation_layer
      : {}),
    compliance: {
      data_classification: classifAdaptive,
      legal_basis: legalBasisAdaptive,
      compliance_action: 'blocked',
      justification:
        'Resposta não gerada: bloqueio pela governança adaptativa IMPETUS (pré-pipeline). Trilha legal registada.'
    }
  };
  aiLegalAuditService.enqueueLegalAudit({
    trace_id: traceId,
    company_id: user.company_id,
    user_id: user.id,
    action_type: 'PROCESS',
    data_classification: classifAdaptive,
    legal_basis: legalBasisAdaptive,
    risk_level: classifAdaptive.risk_level,
    decision_summary:
      'Interrupção pela governança adaptativa antes do encadeamento de modelos; classificação de dados registada para LGPD.'
  });

  const explanationLayer = {
    trace_id: traceId,
    ...synthesis.explanation_layer,
    orchestration: {
      intent: dossier.context.intent,
      cross_validation_requested: false,
      risk_level: risk,
      based_on: [],
      adaptive_governance: {
        blocked: true,
        risk_level: adaptivePolicy.risk_level
      }
    }
  };
  const stages = buildStagesArray(dossier);
  const layersPublic = sanitizeLayersForHttpResponse(dossier);

  try {
    await cognitiveAudit.insertDecisionLog({
      trace_id: traceId,
      company_id: user.company_id,
      user_id: user.id,
      pipeline_version: PIPELINE_VERSION,
      module,
      intent: dossier.context.intent,
      risk_level: risk,
      models_used: [],
      dossier_summary: redactForPersistence(dossier),
      stages_detail: {
        logs: dossier.logs || [],
        adaptive_governance_block: true,
        degraded: true
      },
      final_output: synthesis,
      explanation_layer: explanationLayer,
      confidence: 0,
      requires_human_validation: true,
      requires_cross_validation: false,
      degraded_mode: true,
      duration_ms: duration
    });
  } catch (err) {
    console.warn('[COGNITIVE_AUDIT_BLOCK]', err.message);
  }

  const internalGov = {
    risk_level: adaptivePolicy.risk_level,
    allow_response: false,
    combined_score: adaptivePolicy._internal?.combined_score,
    user_risk_score: adaptivePolicy._internal?.user_risk_score,
    company_risk_score: adaptivePolicy._internal?.company_risk_score
  };

  aiAnalytics.enqueueAiTrace({
    trace_id: traceId,
    user_id: user.id,
    company_id: user.company_id,
    module_name: module || 'cognitive_council',
    input_payload: {
      user_prompt: sanitized,
      intent: dossier.context.intent,
      pipeline_version: PIPELINE_VERSION,
      data_lineage: dossier.meta?.data_lineage_snapshot || [],
      user_scope: {
        role: scope.role,
        hierarchy_level: scope.hierarchy_level,
        department: scope.department || null
      },
      context_snapshot: aiAnalytics.summarizeDossierData(dossier.data),
      options: {
        adaptive_blocked: true,
        keys: Object.keys(options || {}).slice(0, 20)
      }
    },
    output_response: {
      content: blockMsg,
      answer: blockMsg,
      explanation_layer: synthesis.explanation_layer,
      adaptive_governance_block: true
    },
    model_info: {
      pipeline_version: PIPELINE_VERSION,
      duration_ms: duration,
      risk_level: risk,
      operation_type: policyOperationType,
      adaptive_governance: internalGov,
      learning_feedback: adaptivePolicy._internal?.learning_feedback || null
    },
    governance_tags: ['ADAPTIVE_GOVERNANCE_BLOCK'],
    human_validation_status: 'PENDING',
    validation_modality: null,
    validation_evidence: null,
    validated_at: null,
    legal_basis: legalBasisAdaptive,
    data_classification: classifAdaptive
  });

  let processing_transparency = null;
  try {
    if (user.company_id) {
      processing_transparency = await aiProviderService.getCognitivePipelineDisclosure(user.company_id);
    }
  } catch (err) {
    console.warn('[ai/layers/policyLayer][processing_transparency]', err?.message ?? err);
  }

  const dossierForClient = redactForPersistence(dossier);

  return {
    ok: true,
    traceId,
    trace_id: traceId,
    processing_transparency,
    result: {
      content: synthesis.content,
      answer: synthesis.answer,
      confidence: synthesis.confidence,
      confidence_score: synthesis.confidence_score,
      explanation_layer: synthesis.explanation_layer,
      warnings: synthesis.warnings,
      based_on: synthesis.based_on,
      requires_action: synthesis.requires_action,
      degraded: true,
      explanation: synthesis.explanation
    },
    stages,
    layers: layersPublic,
    dossier: dossierForClient,
    synthesis,
    explanation_layer: explanationLayer,
    duration_ms: duration,
    degraded: true
  };
}

async function buildPolicyBlockedCouncilResult({
  traceId,
  user,
  scope,
  module,
  sanitized,
  dossier,
  options,
  t0,
  risk,
  effectivePolicyBundle,
  adaptivePolicy,
  policyOperationType
}) {
  const duration = Date.now() - t0;
  const blockMsg = policyEnforcementService.POLICY_BLOCK_MSG;
  const synthesis = {
    content: blockMsg,
    answer: blockMsg,
    confidence: 0,
    confidence_score: 0,
    explanation_layer: {
      limitations: ['Interação bloqueada pelas políticas de IA da organização (módulo não autorizado).'],
      orchestration_context: { policy_block: true }
    },
    warnings: ['AI_POLICY_MODULE_BLOCK'],
    based_on: [],
    requires_action: true,
    degraded: true,
    explanation: null
  };
  const legalBasisPol = aiComplianceEngine.resolveLegalBasis(module);
  const classifPol = dataClassificationService.classifyData({
    prompt: sanitized,
    context: aiAnalytics.summarizeDossierData(dossier.data),
    model_answer: blockMsg
  });
  synthesis.explanation_layer = {
    ...(synthesis.explanation_layer && typeof synthesis.explanation_layer === 'object'
      ? synthesis.explanation_layer
      : {}),
    compliance: {
      data_classification: classifPol,
      legal_basis: legalBasisPol,
      compliance_action: 'allowed',
      justification: 'Pré-checagem de política: resposta não gerada (módulo).'
    },
    policy: {
      policy_applied: true,
      policy_source: (effectivePolicyBundle?.layers || []).map((l) => l.scope),
      policy_effect: 'blocked',
      violation: true,
      violation_reason: 'module_not_allowed'
    }
  };
  aiLegalAuditService.enqueueLegalAudit({
    trace_id: traceId,
    company_id: user.company_id,
    user_id: user.id,
    action_type: 'BLOCK',
    data_classification: classifPol,
    legal_basis: legalBasisPol,
    risk_level: classifPol.risk_level,
    decision_summary: 'Bloqueio por política de IA: módulo fora de allowed_modules.'
  });

  const explanationLayer = {
    trace_id: traceId,
    ...synthesis.explanation_layer,
    orchestration: {
      intent: dossier.context.intent,
      cross_validation_requested: false,
      risk_level: risk,
      based_on: [],
      policy_engine: { module_blocked: true }
    }
  };
  const stages = buildStagesArray(dossier);
  const layersPublic = sanitizeLayersForHttpResponse(dossier);

  try {
    await cognitiveAudit.insertDecisionLog({
      trace_id: traceId,
      company_id: user.company_id,
      user_id: user.id,
      pipeline_version: PIPELINE_VERSION,
      module,
      intent: dossier.context.intent,
      risk_level: risk,
      models_used: [],
      dossier_summary: redactForPersistence(dossier),
      stages_detail: {
        logs: dossier.logs || [],
        policy_engine_block: true,
        degraded: true
      },
      final_output: synthesis,
      explanation_layer: explanationLayer,
      confidence: 0,
      requires_human_validation: true,
      requires_cross_validation: false,
      degraded_mode: true,
      duration_ms: duration
    });
  } catch (err) {
    console.warn('[COGNITIVE_AUDIT_POLICY]', err.message);
  }

  aiAnalytics.enqueueAiTrace({
    trace_id: traceId,
    user_id: user.id,
    company_id: user.company_id,
    module_name: module || 'cognitive_council',
    input_payload: {
      user_prompt: sanitized,
      intent: dossier.context.intent,
      pipeline_version: PIPELINE_VERSION,
      data_lineage: dossier.meta?.data_lineage_snapshot || [],
      user_scope: {
        role: scope.role,
        hierarchy_level: scope.hierarchy_level,
        department: scope.department || null
      },
      context_snapshot: aiAnalytics.summarizeDossierData(dossier.data),
      options: {
        policy_module_blocked: true,
        keys: Object.keys(options || {}).slice(0, 20)
      }
    },
    output_response: {
      content: blockMsg,
      answer: blockMsg,
      explanation_layer: synthesis.explanation_layer,
      policy_engine_block: true
    },
    model_info: {
      pipeline_version: PIPELINE_VERSION,
      duration_ms: duration,
      risk_level: risk,
      operation_type: policyOperationType || null,
      policy_resolution: {
        layers: effectivePolicyBundle?.layers || [],
        rules_keys: Object.keys(effectivePolicyBundle?.rules || {})
      },
      learning_feedback: adaptivePolicy?._internal?.learning_feedback || null
    },
    governance_tags: ['AI_POLICY_BLOCK'],
    human_validation_status: 'PENDING',
    validation_modality: null,
    validation_evidence: null,
    validated_at: null,
    legal_basis: legalBasisPol,
    data_classification: classifPol,
    trace_policy_rules: traceEncryptionPolicyHint(effectivePolicyBundle?.rules),
    policy_incident: {
      severity: 'HIGH',
      summary: `[POLICY_VIOLATION] Módulo não permitido pelas políticas da organização.`
    }
  });

  let processing_transparency = null;
  try {
    if (user.company_id) {
      processing_transparency = await aiProviderService.getCognitivePipelineDisclosure(user.company_id);
    }
  } catch (err) {
    console.warn('[ai/layers/policyLayer][processing_transparency]', err?.message ?? err);
  }

  const dossierForClient = redactForPersistence(dossier);

  return {
    ok: true,
    traceId,
    trace_id: traceId,
    processing_transparency,
    result: {
      content: synthesis.content,
      answer: synthesis.answer,
      confidence: synthesis.confidence,
      confidence_score: synthesis.confidence_score,
      explanation_layer: synthesis.explanation_layer,
      warnings: synthesis.warnings,
      based_on: synthesis.based_on,
      requires_action: synthesis.requires_action,
      degraded: true,
      explanation: synthesis.explanation
    },
    stages,
    layers: layersPublic,
    dossier: dossierForClient,
    synthesis,
    explanation_layer: explanationLayer,
    duration_ms: duration,
    degraded: true
  };
}

/**
 * Governança adaptativa + motor de políticas (pré-execução dos modelos).
 * @returns {Promise<{ type: 'continue', risk, adaptivePolicy, adaptiveResponseMode, effectivePolicyBundle, policyOperationType } | { type: 'early', result }>}
 */
async function runPolicyGates({
  user,
  scope,
  module,
  options,
  traceId,
  sanitized,
  dossier,
  t0,
  risk
}) {
  const policyOperationType =
    options?.operation_type != null
      ? String(options.operation_type).slice(0, 96)
      : options?.policy_operation_type != null
        ? String(options.policy_operation_type).slice(0, 96)
        : null;

  const adaptivePolicy = await adaptiveGovernanceEngine.evaluateRiskContext({
    user,
    companyId: user.company_id,
    module: module || 'cognitive_council',
    heuristicRiskLevel: risk,
    operation_type: policyOperationType
  });
  let riskOut = adaptiveGovernanceEngine.maxRiskLevel(risk, adaptivePolicy.risk_level);
  dossier.decision.risk_level = riskOut;
  if (adaptivePolicy.require_validation) {
    dossier.decision.requires_human_validation = true;
  }
  const adaptiveResponseMode = adaptivePolicy.allow_response
    ? adaptivePolicy.response_mode || 'full'
    : 'none';

  if (!adaptivePolicy.allow_response) {
    if (user?.company_id && user?.id) {
      const beh = adaptivePolicy._internal?.behavioral;
      const govReason =
        beh?.pattern_detected && beh?.behavior_risk === 'CRITICAL'
          ? 'behavioral_critical'
          : 'adaptive_governance';
      behavioralIntelligenceService.trackUserAction('GOVERNANCE_BLOCK', {
        userId: user.id,
        companyId: user.company_id,
        traceId,
        reason: govReason,
        module: module || 'cognitive_council'
      });
    }
    observabilityService.markCouncilBlocked({
      traceId,
      companyId: user?.company_id,
      userId: user?.id,
      reason: 'adaptive_governance',
      riskLevel: riskOut,
      responseMode: adaptiveResponseMode
    });
    const result = await buildAdaptiveBlockedCouncilResult({
      traceId,
      user,
      scope,
      module,
      sanitized,
      dossier,
      options,
      adaptivePolicy,
      policyOperationType,
      t0,
      risk: riskOut
    });
    return { type: 'early', result };
  }

  let effectivePolicyBundle = {
    rules: {},
    layers: [],
    policy_types: [],
    policy_enforcement: { conflict_detected: false, resolved_by: null, affected_rules: [] }
  };
  if (AI_POLICY_ENGINE_ON && user.company_id) {
    const policyCtxEarly = await policyEngineService.getCompanyPolicyContext(user.company_id);
    effectivePolicyBundle = await policyEngineService.resolveEffectivePolicy({
      companyId: user.company_id,
      sector: policyCtxEarly.sector,
      countryCode: policyCtxEarly.countryCode,
      module_name: module || 'cognitive_council',
      user_role: scope.role || null,
      operation_type:
        options?.operation_type != null
          ? String(options.operation_type).slice(0, 96)
          : options?.policy_operation_type != null
            ? String(options.policy_operation_type).slice(0, 96)
            : null
    });
    if (!policyEngineService.isModuleAllowed(module || 'cognitive_council', effectivePolicyBundle.rules)) {
      if (user?.company_id && user?.id) {
        behavioralIntelligenceService.trackUserAction('POLICY_BLOCK', {
          userId: user.id,
          companyId: user.company_id,
          traceId,
          reason: 'module_not_allowed',
          module: module || 'cognitive_council'
        });
      }
      observabilityService.markCouncilBlocked({
        traceId,
        companyId: user?.company_id,
        userId: user?.id,
        reason: 'policy_module_not_allowed',
        riskLevel: riskOut,
        responseMode: adaptiveResponseMode,
        policyEffect: 'blocked'
      });
      const result = await buildPolicyBlockedCouncilResult({
        traceId,
        user,
        scope,
        module,
        sanitized,
        dossier,
        options,
        t0,
        risk: riskOut,
        effectivePolicyBundle,
        adaptivePolicy,
        policyOperationType
      });
      return { type: 'early', result };
    }
  }

  return {
    type: 'continue',
    risk: riskOut,
    adaptivePolicy,
    adaptiveResponseMode,
    effectivePolicyBundle,
    policyOperationType
  };
}

function applyOutputPolicyEnforcement(ctx) {
  const {
    user,
    scope,
    module,
    options,
    traceId,
    synthesis,
    dossier,
    effectivePolicyBundle
  } = ctx;

  let policyEnforcementResult = null;
  if (AI_POLICY_ENGINE_ON && user.company_id) {
    policyEnforcementResult = policyEnforcementService.applyPolicy(synthesis, dossier, {
      module: module || 'cognitive_council',
      rules: effectivePolicyBundle.rules,
      policyMeta: {
        layers: effectivePolicyBundle.layers,
        policy_enforcement: effectivePolicyBundle.policy_enforcement || {
          conflict_detected: false,
          resolved_by: null,
          affected_rules: []
        },
        context_applied: {
          module: module || 'cognitive_council',
          role: scope.role || null,
          operation:
            options?.operation_type != null
              ? String(options.operation_type).slice(0, 96)
              : options?.policy_operation_type != null
                ? String(options.policy_operation_type).slice(0, 96)
                : null
        }
      }
    });
    const explPol =
      synthesis.explanation_layer && typeof synthesis.explanation_layer === 'object'
        ? synthesis.explanation_layer
        : {};
    synthesis.explanation_layer = {
      ...explPol,
      policy: {
        ...policyEnforcementResult.policy_trace,
        violation: policyEnforcementResult.violation,
        violation_reason: policyEnforcementResult.violation_reason
      }
    };
    if (user?.company_id && user?.id) {
      if (policyEnforcementResult.violation) {
        behavioralIntelligenceService.trackUserAction('INCIDENT_GENERATED', {
          userId: user.id,
          companyId: user.company_id,
          traceId,
          kind: 'policy_violation',
          reason: policyEnforcementResult.violation_reason || 'policy',
          module: module || 'cognitive_council'
        });
      }
      if (
        policyEnforcementResult.effect === 'blocked' ||
        policyEnforcementResult.policy_trace?.policy_effect === 'blocked'
      ) {
        behavioralIntelligenceService.trackUserAction('POLICY_BLOCK', {
          userId: user.id,
          companyId: user.company_id,
          traceId,
          reason: policyEnforcementResult.violation_reason || 'enforcement_blocked',
          module: module || 'cognitive_council'
        });
      }
    }
  }
  return { policyEnforcementResult };
}

module.exports = {
  AI_POLICY_ENGINE_ON,
  traceEncryptionPolicyHint,
  buildAdaptiveBlockedCouncilResult,
  buildPolicyBlockedCouncilResult,
  runPolicyGates,
  applyOutputPolicyEnforcement
};
