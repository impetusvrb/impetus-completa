'use strict';

/**
 * Conselho Cognitivo IMPETUS — orquestrador central.
 *
 * Princípios:
 * - Sem conversação livre entre modelos; apenas dossiê compartilhado + etapas ordenadas.
 * - Papéis fixos: Gemini (percepção), Claude (análise profunda), GPT (interface final).
 * - Auditoria em ai_decision_logs; HITL em cognitive_hitl_feedback.
 * - Nenhuma IA invoca outra: só o backend encadeia chamadas com estado explícito.
 *
 * Modularização inicial: camadas em ./layers/{ingress,policy,compliance,execution}Layer.js
 */

const { v4: uuidv4 } = require('uuid');
const { PIPELINE_VERSION, INTENT } = require('./aiRoles');
const {
  finalizeLayerFinal,
  redactForPersistence,
  sanitizeLayersForHttpResponse
} = require('./cognitiveDossier');
const cognitiveAudit = require('./cognitiveAudit');
const aiAnalytics = require('../services/aiAnalyticsService');
const aiProviderService = require('../services/aiProviderService');
const adaptiveGovernanceEngine = require('../services/adaptiveGovernanceEngine');
const observabilityService = require('../services/observabilityService');
const behavioralIntelligenceService = require('../services/behavioralIntelligenceService');
const { detectIntent } = require('../services/intentDetectionService');
const { retrieveContextualData } = require('../services/dataRetrievalService');
const { recordOperationalOutcome } = require('../services/operationalLearningService');

const ingressLayer = require('./layers/ingressLayer');
const policyLayer = require('./layers/policyLayer');
const complianceLayer = require('./layers/complianceLayer');
const executionLayer = require('./layers/executionLayer');

async function runCognitiveCouncil(params) {
  const norm = ingressLayer.normalizeRunInput(params);
  const {
    user,
    requestText: rt,
    data,
    module,
    options
  } = norm;

  const t0 = Date.now();
  const traceId = uuidv4();
  observabilityService.markCouncilStart({
    traceId,
    companyId: user?.company_id,
    userId: user?.id,
    module: module || 'cognitive_council'
  });
  if (user?.company_id && user?.id) {
    behavioralIntelligenceService.trackUserAction('ACCESS_ATTEMPT', {
      userId: user.id,
      companyId: user.company_id,
      traceId,
      module: module || 'cognitive_council'
    });
  }

  const executeCouncil = async () => {
    const intentData = detectIntent(rt);
    let enrichedData = data;
    try {
      if (intentData.intent !== 'generic') {
        const retrieved = await retrieveContextualData({
          user,
          intent: intentData.intent,
          entities: intentData.entities
        });
        enrichedData = {
          ...data,
          ...retrieved
        };
      }
    } catch (err) {
      console.warn('[DATA_RETRIEVAL_FAILED]', { reason: err && err.message ? String(err.message) : 'unknown' });
    }

    enrichedData = {
      ...enrichedData,
      contextual_data: {
        ...(data.contextual_data || {}),
        ...(enrichedData.contextual_data || {}),
        detected_intent: intentData.intent
      }
    };

    const { sanitized, scope, dossier, limitations, risk: riskIngress } =
      await ingressLayer.prepareCouncilIngress({
        user,
        requestText: rt,
        data: enrichedData,
        module,
        options,
        traceId
      });

    let risk = riskIngress;

    const policyGate = await policyLayer.runPolicyGates({
      user,
      scope,
      module,
      options,
      traceId,
      sanitized,
      dossier,
      t0,
      risk
    });
    if (policyGate.type === 'early') {
      return policyGate.result;
    }

    const {
      risk: riskAfterPolicy,
      adaptivePolicy,
      adaptiveResponseMode,
      effectivePolicyBundle,
      policyOperationType
    } = policyGate;
    risk = riskAfterPolicy;

    const billing = user?.company_id ? { companyId: user.company_id, userId: user.id } : null;

    const { synthesis, wantCross, egress } = await executionLayer.runCouncilExecution({
      dossier,
      billing,
      limitations,
      risk,
      options,
      scope,
      module,
      user,
      data: enrichedData,
      adaptiveResponseMode,
      traceId
    });

    const { compliancePack } = await complianceLayer.applyComplianceAfterExecution({
      traceId,
      user,
      synthesis,
      dossier,
      sanitized,
      data: enrichedData,
      module,
      adaptiveResponseMode,
      effectivePolicyBundle,
      AI_POLICY_ENGINE_ON: policyLayer.AI_POLICY_ENGINE_ON
    });

    const { policyEnforcementResult } = policyLayer.applyOutputPolicyEnforcement({
      user,
      scope,
      module,
      options,
      traceId,
      synthesis,
      dossier,
      effectivePolicyBundle
    });

    dossier.decision.recommendation = synthesis.answer;
    dossier.decision.confidence = synthesis.confidence;
    finalizeLayerFinal(dossier, { synthesis, finalText: synthesis.answer });

    const explanationLayer = {
      trace_id: traceId,
      ...synthesis.explanation_layer,
      orchestration: {
        intent: dossier.context.intent,
        cross_validation_requested: wantCross,
        risk_level: risk,
        based_on: synthesis.based_on,
        ...(adaptiveGovernanceEngine.ADAPTIVE_ENABLED
          ? {
              adaptive_governance: {
                response_mode: adaptiveResponseMode,
                policy_risk_level: adaptivePolicy.risk_level
              }
            }
          : {})
      }
    };

    const duration = Date.now() - t0;
    const stages = executionLayer.buildStagesArray(dossier);
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
        models_used: dossier.meta.models_touched,
        dossier_summary: redactForPersistence(dossier),
        stages_detail: {
          logs: dossier.logs,
          cross_validation: dossier.analysis.cross_validation || null,
          degraded: dossier.meta.degraded,
          layers: layersPublic
        },
        final_output: synthesis,
        explanation_layer: explanationLayer,
        confidence: synthesis.confidence,
        requires_human_validation: dossier.decision.requires_human_validation !== false,
        requires_cross_validation: wantCross,
        degraded_mode: dossier.meta.degraded,
        duration_ms: duration
      });
    } catch (err) {
      console.warn('[COGNITIVE_AUDIT]', err.message);
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
        context_snapshot: aiAnalytics.summarizeDossierData(enrichedData),
        options: {
          forceCrossValidation: !!options.forceCrossValidation,
          keys: Object.keys(options || {}).slice(0, 20)
        }
      },
      output_response: {
        content: typeof synthesis.content === 'string' ? synthesis.content.slice(0, 12000) : synthesis.content,
        answer: typeof synthesis.answer === 'string' ? synthesis.answer.slice(0, 12000) : synthesis.answer,
        confidence: synthesis.confidence,
        confidence_score: synthesis.confidence_score,
        explanation_layer: synthesis.explanation_layer,
        warnings: synthesis.warnings,
        based_on: synthesis.based_on,
        requires_action: synthesis.requires_action,
        degraded: dossier.meta.degraded,
        stages: executionLayer.buildStagesArray(dossier),
        orchestration: explanationLayer.orchestration,
        related_operational_insight_id:
          options.related_operational_insight_id != null
            ? options.related_operational_insight_id
            : undefined
      },
      model_info: {
        pipeline_version: PIPELINE_VERSION,
        duration_ms: duration,
        stages: (dossier.logs || []).map((l) => ({
          stage: l.stage,
          provider: l.provider,
          model_hint: l.model_hint || null,
          at: l.ts
        })),
        models_touched: dossier.meta.models_touched || [],
        risk_level: risk,
        cross_validation: wantCross,
        operation_type: policyOperationType || null,
        learning_feedback: adaptivePolicy._internal?.learning_feedback || null,
        ...(adaptiveGovernanceEngine.ADAPTIVE_ENABLED
          ? {
              adaptive_governance: {
                response_mode: adaptiveResponseMode,
                policy_risk_level: adaptivePolicy.risk_level,
                combined_score: adaptivePolicy._internal?.combined_score,
                user_risk_score: adaptivePolicy._internal?.user_risk_score,
                company_risk_score: adaptivePolicy._internal?.company_risk_score
              }
            }
          : {}),
        ...(egress.blocked || egress.redacted ? { egress_filter: egress.reasons || [] } : {}),
        ...(policyEnforcementResult && policyEnforcementResult.policy_trace
          ? { policy_enforcement: policyEnforcementResult.policy_trace }
          : {})
      },
      governance_tags: (() => {
        const tags = egress.blocked ? ['SECURITY_ALERT'] : [];
        if (compliancePack.governance_tags?.length) {
          for (const t of compliancePack.governance_tags) {
            if (!tags.includes(t)) tags.push(t);
          }
        }
        if (policyEnforcementResult?.violation) tags.push('POLICY_VIOLATION');
        return tags.length ? tags : undefined;
      })(),
      system_fingerprint: null,
      human_validation_status: 'PENDING',
      validation_modality: null,
      validation_evidence: null,
      validated_at: null,
      legal_basis: compliancePack.legal_basis,
      data_classification: compliancePack.data_classification,
      trace_policy_rules: policyLayer.traceEncryptionPolicyHint(effectivePolicyBundle?.rules),
      compliance_incident: compliancePack.compliance_incident,
      policy_incident: policyEnforcementResult?.policy_incident || null
    });

    const dossierForClient = redactForPersistence(dossier);

    let processing_transparency = null;
    try {
      if (user.company_id) {
        processing_transparency = await aiProviderService.getCognitivePipelineDisclosure(user.company_id);
      }
    } catch (_) {
      /* aditivo */
    }

    observabilityService.markPolicyApplied({
      traceId,
      companyId: user?.company_id,
      userId: user?.id,
      policyEffect: policyEnforcementResult?.policy_trace?.policy_effect,
      riskLevel: risk,
      responseMode: adaptiveResponseMode,
      violation: !!policyEnforcementResult?.violation
    });
    observabilityService.markCouncilSuccess({
      traceId,
      companyId: user?.company_id,
      userId: user?.id,
      durationMs: duration,
      riskLevel: risk,
      responseMode: adaptiveResponseMode,
      policyEffect: policyEnforcementResult?.policy_trace?.policy_effect || 'none',
      policyViolation: !!policyEnforcementResult?.violation,
      complianceIncident: !!compliancePack.compliance_incident,
      degraded: dossier.meta.degraded,
      module: module || 'cognitive_council'
    });

    try {
      const pa = enrichedData?.contextual_data?.prioritized_actions;
      if (Array.isArray(pa) && pa.length > 0) {
        const seen = new Set();
        for (const row of pa) {
          const machine_id =
            row && row.machine_id != null ? String(row.machine_id).trim() : '';
          if (!machine_id || seen.has(machine_id)) continue;
          seen.add(machine_id);
          recordOperationalOutcome({
            action: {
              machine_id,
              action_type: 'auto_analysis'
            },
            result: { success: null, confidence: 'auto_generated' }
          });
        }
      }
    } catch (learnErr) {
      console.warn('[OPERATIONAL_LEARNING_OUTCOME]', learnErr && learnErr.message);
    }

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
        degraded: dossier.meta.degraded,
        explanation: synthesis.explanation
      },
      stages,
      layers: layersPublic,
      dossier: dossierForClient,
      synthesis,
      explanation_layer: explanationLayer,
      duration_ms: duration,
      degraded: dossier.meta.degraded
    };
  };

  try {
    return await executeCouncil();
  } catch (err) {
    if (user?.company_id && user?.id && err && err.code === 'PROMPT_SECURITY_INGRESS') {
      behavioralIntelligenceService.trackUserAction('POLICY_BLOCK', {
        userId: user.id,
        companyId: user.company_id,
        traceId,
        reason: 'ingress_security',
        module: module || 'cognitive_council'
      });
    }
    observabilityService.markCouncilException({
      traceId,
      companyId: user?.company_id,
      userId: user?.id,
      err
    });
    throw err;
  }
}

function exampleMaintenancePayload() {
  return {
    input: {
      text:
        'Linha 3 parou com alarme de temperatura no redutor da esteira; cheiro leve de óleo queimado.'
    },
    context: {
      assets: [{ tag: 'EST-03', linha: 'L3' }],
      events: [{ tipo: 'alarme', codigo: 'TMP-HI', timestamp: new Date().toISOString() }],
      kpis: [{ id: 'oee_l3', valor: 0.62 }]
    },
    module: 'manutencao_ia',
    options: { forceCrossValidation: true },
    requestText:
      'Linha 3 parou com alarme de temperatura no redutor da esteira; cheiro leve de óleo queimado.',
    data: {
      assets: [{ tag: 'EST-03', linha: 'L3' }],
      events: [{ tipo: 'alarme', codigo: 'TMP-HI', timestamp: new Date().toISOString() }],
      kpis: [{ id: 'oee_l3', valor: 0.62 }],
      images: []
    }
  };
}

module.exports = {
  runCognitiveCouncil,
  classifyIntent: ingressLayer.classifyIntent,
  exampleMaintenancePayload,
  normalizeRunInput: ingressLayer.normalizeRunInput,
  INTENT
};
