'use strict';

/**
 * Conselho Cognitivo IMPETUS — orquestrador central.
 *
 * Princípios:
 * - Sem conversação livre entre modelos; apenas dossiê compartilhado + etapas ordenadas.
 * - Papéis fixos: Gemini (única classificação de intenção + percepção), Claude (análise técnica + plano interno),
 *   GPT/OpenAI (única resposta final). Orquestração: vertex_central_sim (controlo de etapas; Gemini pode usar Vertex).
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
const {
  detectIntentWithContext,
  detectIntentAdvanced,
  inferImplicitOperationalIntent
} = require('../services/intentDetectionService');
const { retrieveContextualData } = require('../services/dataRetrievalService');
const { mergeContextualData } = require('../services/contextualDataMergeService');
const { recordOperationalOutcome } = require('../services/operationalLearningService');
const { getUnifiedSessionContext, updateUnifiedSessionContext } = require('../services/unifiedSessionContextService');
const { shouldTriggerProactiveRetrieval } = require('../services/proactiveRetrievalService');

const ingressLayer = require('./layers/ingressLayer');
const policyLayer = require('./layers/policyLayer');
const complianceLayer = require('./layers/complianceLayer');
const executionLayer = require('./layers/executionLayer');
const vertexCentralOrchestrator = require('./vertexCentralOrchestrator');

/** Mínimo de intenções com confiança para agregação multi (máx. 3 pedidos a retrieveContextualData). */
const AUTO_DATA_MULTI_CONFIDENCE_MIN = 0.5;
const AUTO_DATA_MULTI_MAX_INTENTS = 3;

/**
 * Condição alinhada ao contrato de API: nenhum payload explícito em `data` nem em `context`
 * (após normalização, `data` adquire sempre chaves por omissão — não pode usar só Object.keys(data)).
 */
function hasNoExplicitClientData(params) {
  if (!params) return true;
  const d = params.data;
  const c = params.context;
  const noData =
    d == null || (typeof d === 'object' && !Array.isArray(d) && Object.keys(d).length === 0);
  const noContext =
    c == null || (typeof c === 'object' && !Array.isArray(c) && Object.keys(c).length === 0);
  return noData && noContext;
}

/**
 * Intenção operacional ampla: mesmo que a heurística de intent falhe, capturar frases de visão geral.
 */
function shouldAutoInjectBroadOperational(requestText, intentData) {
  if (intentData && intentData.intent === 'operational_overview') return true;
  const t = (requestText || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (t.includes('situacao') || t.includes('status geral')) return true;
  if (t.includes('o que esta acontecendo')) return true;
  return false;
}

/**
 * Persiste no contexto de sessão só metadados (intenção, entidades resumidas, chaves de contextual_data).
 * @param {object|undefined} user
 * @param {{ intentData: object, multiIntentList: object[]|null, enrichedData: object }} s
 * @returns {void}
 */
function commitContextSessionFromCouncil(user, s) {
  if (!user?.company_id || !user?.id) {
    return;
  }
  const { intentData, multiIntentList, enrichedData } = s || {};
  const intents =
    multiIntentList && multiIntentList.length
      ? multiIntentList.map((m) => m && m.intent).filter(Boolean)
      : intentData && intentData.intent
        ? [String(intentData.intent)]
        : [];
  updateUnifiedSessionContext(user, {
    intents,
    entities: intentData && intentData.entities,
    contextual_data: enrichedData && enrichedData.contextual_data
  });
}

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
  const vertexRunTrace = vertexCentralOrchestrator.createCouncilRunTrace(traceId, {
    entrada_preview: rt
  });
  vertexCentralOrchestrator.traceStage(vertexRunTrace, 'entrada_recebida', {
    module: module || 'cognitive_council'
  });

  observabilityService.markCouncilStart({
    traceId,
    companyId: user?.company_id,
    userId: user?.id,
    module: module || 'cognitive_council',
    orchestration: vertexCentralOrchestrator.getOrchestrationContext()
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
    try {
    const sessionCtx =
      user?.company_id && user?.id ? await getUnifiedSessionContext(user) : null;
    const advPipeline = detectIntentAdvanced(rt);
    const implicitOperational = inferImplicitOperationalIntent(rt, sessionCtx, advPipeline);
    const willMultiIntent =
      hasNoExplicitClientData(params) &&
      user?.company_id &&
      (() => {
        const m = (advPipeline.intents || [])
          .filter(
            (x) =>
              x &&
              x.confidence > AUTO_DATA_MULTI_CONFIDENCE_MIN &&
              x.intent &&
              x.intent !== 'generic'
          )
          .slice(0, AUTO_DATA_MULTI_MAX_INTENTS);
        return m.length >= 2;
      })();
    let intentData = detectIntentWithContext(rt, sessionCtx, advPipeline);
    if (
      implicitOperational &&
      hasNoExplicitClientData(params) &&
      user?.company_id &&
      !willMultiIntent
    ) {
      const top0 = advPipeline.intents && advPipeline.intents[0] ? advPipeline.intents[0] : null;
      intentData = { intent: 'operational_overview', entities: {} };
      console.info('[AUTO_INFERRED_INTENT]', {
        ok: true,
        intent: 'operational_overview',
        reason: implicitOperational.reason,
        top_before: top0
          ? { intent: top0.intent, confidence: top0.confidence }
          : null
      });
    }
    let enrichedData = data;
    let didAutoInjectOperational = false;
    let didMultiIntent = false;
    let multiIntentList = null;

    if (hasNoExplicitClientData(params) && user?.company_id) {
      try {
        const advanced = advPipeline;
        const entMerged = {
          ...(sessionCtx && sessionCtx.last_entities ? sessionCtx.last_entities : {}),
          ...((advanced.entities && typeof advanced.entities === 'object' && !Array.isArray(advanced.entities)
            ? advanced.entities
            : {}) || {})
        };
        const multi = (advanced.intents || [])
          .filter(
            (x) =>
              x &&
              x.confidence > AUTO_DATA_MULTI_CONFIDENCE_MIN &&
              x.intent &&
              x.intent !== 'generic'
          )
          .slice(0, AUTO_DATA_MULTI_MAX_INTENTS);
        if (multi.length >= 2) {
          const parts = await Promise.all(
            multi.map((it) =>
              retrieveContextualData({
                user,
                intent: it.intent,
                entities: entMerged
              })
            )
          );
          const merged = mergeContextualData(parts);
          enrichedData = {
            ...data,
            ...merged,
            contextual_data: {
              ...(data.contextual_data || {}),
              ...(merged.contextual_data || {})
            }
          };
          didMultiIntent = true;
          multiIntentList = multi;
          if (multi.some((i) => i.intent === 'operational_overview')) {
            didAutoInjectOperational = true;
          }
          intentData = { intent: multi[0].intent, entities: entMerged };
          console.info('[AUTO_DATA_MULTI_INTENT]', {
            ok: true,
            intents: multi.map((m) => ({ intent: m.intent, confidence: m.confidence }))
          });
        }
      } catch (autoErr) {
        console.warn('[AUTO_DATA_MULTI_INTENT]', {
          ok: false,
          reason: autoErr && autoErr.message ? String(autoErr.message) : 'unknown'
        });
      }
    }

    if (!didMultiIntent) {
      if (
        hasNoExplicitClientData(params) &&
        shouldAutoInjectBroadOperational(rt, intentData) &&
        user?.company_id
      ) {
        try {
          const autoData = await retrieveContextualData({
            user,
            intent: 'operational_overview',
            entities: {}
          });
          enrichedData = {
            ...data,
            ...autoData,
            contextual_data: {
              ...(data.contextual_data || {}),
              ...(autoData.contextual_data || {})
            }
          };
          didAutoInjectOperational = true;
          console.info('[AUTO_DATA_INJECTION]', { intent: 'operational_overview' });
        } catch (autoErr) {
          console.warn('[AUTO_DATA_INJECTION_FAILED]', {
            reason: autoErr && autoErr.message ? String(autoErr.message) : 'unknown'
          });
        }
      }

      try {
        if (
          intentData.intent !== 'generic' &&
          !(didAutoInjectOperational && intentData.intent === 'operational_overview')
        ) {
          const retrieved = await retrieveContextualData({
            user,
            intent: intentData.intent,
            entities: intentData.entities
          });
          enrichedData = {
            ...enrichedData,
            ...retrieved,
            contextual_data: {
              ...(enrichedData.contextual_data || {}),
              ...(retrieved.contextual_data || {})
            }
          };
        }
      } catch (err) {
        console.warn('[DATA_RETRIEVAL_FAILED]', {
          reason: err && err.message ? String(err.message) : 'unknown'
        });
      }
    }

    let proactiveRetrievalUsed = false;
    if (hasNoExplicitClientData(params) && user?.company_id) {
      const proactiveDecision = shouldTriggerProactiveRetrieval({
        hasExplicitClientData: !hasNoExplicitClientData(params),
        companyId: user.company_id,
        user,
        intentData,
        enrichedData,
        sessionContext: sessionCtx,
        requestText: rt,
        didMultiIntent,
        didAutoInjectOperational,
        proactiveRetrievalUsed: false
      });
      if (proactiveDecision.trigger) {
        try {
          const proactivePack = await retrieveContextualData({
            user,
            intent: 'operational_overview',
            entities: {}
          });
          const mergedPro = mergeContextualData([
            {
              kpis: Array.isArray(enrichedData.kpis) ? enrichedData.kpis : [],
              events: Array.isArray(enrichedData.events) ? enrichedData.events : [],
              assets: Array.isArray(enrichedData.assets) ? enrichedData.assets : [],
              contextual_data:
                enrichedData.contextual_data && typeof enrichedData.contextual_data === 'object'
                  ? enrichedData.contextual_data
                  : {}
            },
            proactivePack
          ]);
          enrichedData = {
            ...enrichedData,
            kpis: mergedPro.kpis,
            events: mergedPro.events,
            assets: mergedPro.assets,
            contextual_data: mergedPro.contextual_data
          };
          proactiveRetrievalUsed = true;
          console.info('[PROACTIVE_RETRIEVAL]', {
            ok: true,
            reason: proactiveDecision.reason
          });
        } catch (prErr) {
          console.warn('[PROACTIVE_RETRIEVAL]', {
            ok: false,
            reason: prErr && prErr.message ? String(prErr.message) : 'unknown'
          });
        }
      }
    }

    enrichedData = {
      ...enrichedData,
      contextual_data: {
        ...(data.contextual_data || {}),
        ...(enrichedData.contextual_data || {}),
        detected_intent: intentData.intent,
        ...(multiIntentList
          ? {
              detected_intents: multiIntentList.map((m) => ({
                intent: m.intent,
                confidence: m.confidence
              }))
            }
          : {})
      }
    };

    const uPref = options && options.impetusUnifiedDecision;
    if (uPref) {
      try {
        const ud = require('../services/unifiedDecisionEngine');
        enrichedData = {
          ...enrichedData,
          contextual_data: {
            ...(enrichedData.contextual_data || {}),
            impetus_unified_decision: ud.stripForDossier(uPref)
          }
        };
      } catch (mergeErr) {
        console.warn('[UNIFIED_DECISION_MERGE]', mergeErr?.message || mergeErr);
      }
    } else if (
      process.env.UNIFIED_DECISION_ENGINE === 'true' &&
      !(options && options.skipRecursiveUnified)
    ) {
      try {
        const ud = require('../services/unifiedDecisionEngine');
        const snap = await ud.decide({
          user,
          context: {
            message: rt,
            module,
            type: options && options.decisionContextType
          },
          options: options && Array.isArray(options.decisionCandidateOptions) ? options.decisionCandidateOptions : null,
          source: 'cognitive_orchestrator',
          skipCognitiveInvocation: true
        });
        if (snap && snap.ok === true && snap.fallback_used !== true) {
          enrichedData = {
            ...enrichedData,
            contextual_data: {
              ...(enrichedData.contextual_data || {}),
              impetus_unified_decision: ud.stripForDossier(snap)
            }
          };
        }
      } catch (uErr) {
        console.warn('[UNIFIED_DECISION_ORCHESTRATOR]', uErr?.message || uErr);
      }
    }

    const { sanitized, scope, dossier, limitations, risk: riskIngress } =
      await ingressLayer.prepareCouncilIngress({
        user,
        requestText: rt,
        data: enrichedData,
        module,
        options: { ...options, vertex_run_trace: vertexRunTrace },
        traceId
      });

    dossier.meta.vertex_run_trace = vertexRunTrace;
    dossier.meta.strict_pipeline = vertexCentralOrchestrator.isStrictAiPipeline();
    dossier.meta.orchestration = vertexCentralOrchestrator.getOrchestrationContext();

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
      commitContextSessionFromCouncil(user, { intentData, multiIntentList, enrichedData });
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
      options: { ...options, vertex_run_trace: vertexRunTrace },
      scope,
      module,
      user,
      data: enrichedData,
      adaptiveResponseMode,
      traceId,
      vertexRunTrace,
      strictPipeline: dossier.meta.strict_pipeline
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
        impetus_flow:
          dossier.meta.orchestration || vertexCentralOrchestrator.getOrchestrationContext(),
        vertex_run_trace: dossier.meta.vertex_run_trace || null,
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
    } catch (err) {
      console.warn('[ai/cognitiveOrchestrator][processing_transparency]', err?.message ?? err);
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
            result: { success: null, confidence: 'auto_generated' },
            company_id: user.company_id
          });
        }
      }
    } catch (learnErr) {
      console.warn('[OPERATIONAL_LEARNING_OUTCOME]', learnErr && learnErr.message);
    }

    commitContextSessionFromCouncil(user, { intentData, multiIntentList, enrichedData });

    vertexCentralOrchestrator.traceStage(vertexRunTrace, 'trace_concluido', {
      models: dossier.meta.models_touched || []
    });
    vertexCentralOrchestrator.traceComplete(vertexRunTrace, true, null);

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
      degraded: dossier.meta.degraded,
      vertex_run_trace: vertexRunTrace
    };
    } catch (pipeErr) {
      const c = pipeErr && pipeErr.code != null ? String(pipeErr.code) : '';
      if (c.startsWith('STRICT_')) {
        try {
          const execGate = require('./orchestratorExecutionGate');
          execGate.recordCouncilFailure(c, pipeErr && pipeErr.message ? String(pipeErr.message) : c);
        } catch (_e) {
          /* ignore */
        }
        vertexCentralOrchestrator.traceComplete(vertexRunTrace, false, c);
        observabilityService.markCouncilException({
          traceId,
          companyId: user?.company_id,
          userId: user?.id,
          err: pipeErr
        });
        return {
          ok: false,
          traceId,
          trace_id: traceId,
          error_code: c,
          error_message: pipeErr && pipeErr.message ? String(pipeErr.message) : c,
          vertex_run_trace: vertexRunTrace,
          result: null,
          stages: vertexRunTrace && vertexRunTrace.stages ? vertexRunTrace.stages : [],
          degraded: true
        };
      }
      throw pipeErr;
    }
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
