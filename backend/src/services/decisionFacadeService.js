'use strict';

/**
 * Fachada oficial de decisão — envolve unifiedDecisionEngine sem alterar o motor.
 * USE_DECISION_FACADE controla adopção nos consumidores.
 * DECISION_FACADE_VALIDATE=true — logs [DECISION_FACADE_COHERENCE] / violações de contrato.
 */

const { decideWithPipeline } = require('../eventPipeline/pipeline');
const {
  isAdaptiveTuningEnabled,
  adjustConfidence
} = require('./adaptiveTuningService');

function extractMetricsFromFacadeContext(context) {
  if (!context || typeof context !== 'object') {
    return { data_state: undefined, completeness: undefined };
  }
  const pack =
    context.contextual_pack && typeof context.contextual_pack === 'object'
      ? context.contextual_pack
      : context;
  const m =
    pack.metrics && typeof pack.metrics === 'object'
      ? pack.metrics
      : typeof context.metrics === 'object'
        ? context.metrics
        : {};
  return {
    data_state: m.data_state != null ? m.data_state : undefined,
    completeness: typeof m.completeness === 'number' ? m.completeness : undefined
  };
}

/**
 * Ajusta apenas `confidence` exposto na fachada (escala preservada: 0–1 ou 0–100).
 * Não altera unified_result nem decisão.
 */
function applyAdaptiveConfidencePayload(payload, context) {
  if (!isAdaptiveTuningEnabled() || !payload || typeof payload !== 'object') return payload;
  if (payload.confidence == null) return payload;
  const { data_state, completeness } = extractMetricsFromFacadeContext(context);
  const before = payload.confidence;
  payload.confidence = adjustConfidence({
    baseScore: before,
    data_state,
    completeness
  });
  try {
    console.log('[ADAPTIVE_TUNING]', {
      confidence: payload.confidence,
      confidence_before: before,
      data_state: data_state ?? null,
      source: 'decision_facade'
    });
  } catch (_e) {}
  return payload;
}

function decisionFingerprint(d) {
  if (!d || typeof d !== 'object') return 'null';
  try {
    return JSON.stringify({
      label: d.label,
      justification: d.justification,
      reason: d.reason,
      humanRisk: d.humanRisk,
      scores: d.scores && typeof d.scores === 'object' ? d.scores : {}
    });
  } catch (_e) {
    return 'error';
  }
}

/**
 * Compara exposição do facade com o retorno bruto do unified (não altera dados).
 * @param {object} payload — objeto devolvido pelo facade (antes do return)
 * @param {object|null|undefined} result — saída de unifiedDecisionEngine.decide
 * @param {string} source
 */
function logFacadeCoherence(payload, result, source) {
  if (
    process.env.DECISION_FACADE_VALIDATE !== 'true' &&
    process.env.DECISION_FACADE_COHERENCE_LOG !== 'true'
  ) {
    return;
  }

  const issues = [];
  const notes = [];

  const dFacade = payload.decision;
  const dUnified =
    result && typeof result === 'object' && result.decision !== undefined ? result.decision : null;

  if (dFacade != null && dUnified != null && dFacade !== dUnified) {
    issues.push('decision_reference_mismatch');
  }
  if (decisionFingerprint(dFacade) !== decisionFingerprint(dUnified)) {
    issues.push('decision_deep_mismatch');
  }

  const expectedResolved = !!(result && result.ok !== false && !result.skipped);
  if (payload.metadata && payload.metadata.engine_resolved !== expectedResolved) {
    issues.push('engine_resolved_mismatch');
  }

  const rawFallback = !!(result?.meta?.fallback_used ?? result?.fallback_used);
  if (payload.metadata && payload.metadata.cognitive_escalation !== !!result?.meta?.cognitive_escalation) {
    issues.push('cognitive_escalation_mismatch');
  }

  if (payload.metadata && payload.metadata.used_fallback !== rawFallback) {
    issues.push('used_fallback_mismatch');
  }

  if (expectedResolved && rawFallback) {
    notes.push('fallback_true_while_engine_resolved');
  }
  if (!expectedResolved && result && !result.skipped && result.ok === false && !rawFallback) {
    notes.push('engine_not_resolved_without_fallback_flag');
  }

  const ok = issues.length === 0;
  const row = {
    source,
    ok,
    issues,
    notes,
    engine_resolved: payload.metadata?.engine_resolved,
    used_fallback: payload.metadata?.used_fallback,
    cognitive_escalation_facade: payload.metadata?.cognitive_escalation,
    cognitive_escalation_unified: !!(result && result.meta && result.meta.cognitive_escalation)
  };

  try {
    if (!ok) {
      console.warn('[DECISION_FACADE_COHERENCE]', JSON.stringify(row));
      console.warn('[DECISION_FACADE_CONTRACT_VIOLATION]', JSON.stringify({ source, issues }));
    } else {
      console.info('[DECISION_FACADE_COHERENCE]', JSON.stringify(row));
    }
  } catch (_e) {}

  return { ok, issues, notes };
}

/**
 * @param {object} params
 * @param {object|null} [params.user]
 * @param {object} [params.context]
 * @param {object[]|null} [params.options]
 * @param {string} [params.source]
 * @param {boolean} [params.skipCognitiveInvocation]
 * @returns {Promise<object>}
 */
async function decideWithFacade({ user, context, options, source, skipCognitiveInvocation }) {
  const src = source != null ? String(source) : 'unknown';
  const usePipeline = process.env.IMPETUS_PIPELINE_PRIMARY === 'true';
  let pipelineResult = null;

  if (usePipeline) {
    try {
      const message =
        context && context.message != null
          ? String(context.message)
          : '';
      const pack =
        context && context.contextual_pack && typeof context.contextual_pack === 'object'
          ? context.contextual_pack
          : context && typeof context === 'object'
            ? context
            : {};
      pipelineResult = await decideWithPipeline({
        user,
        message,
        context: pack
      });
    } catch (err) {
      console.error('[PIPELINE_FALLBACK]', err);
    }
    console.log('[PIPELINE_DECISION]', {
      used: usePipeline,
      fallback: !pipelineResult
    });
    if (pipelineResult) {
      return applyAdaptiveConfidencePayload(pipelineResult, context);
    }
  }

  try {
    console.info('[DECISION_FACADE_START]', { source: src });

    const unifiedDecisionEngine = require('./unifiedDecisionEngine');
    const result = await unifiedDecisionEngine.decide({
      user: user != null ? user : null,
      context: context && typeof context === 'object' ? context : {},
      options: Array.isArray(options) ? options : undefined,
      source: src,
      skipCognitiveInvocation: !!skipCognitiveInvocation
    });

    try {
      console.info('[DECISION_FACADE_RESULT]', {
        source: src,
        decision: result?.decision,
        score: result?.meta?.decision_score,
        ok: result?.ok,
        skipped: result?.skipped
      });
    } catch (_log) {}

    const engineResolved = !!(result && result.ok !== false && !result.skipped);

    const payload = {
      success: true,
      decision: result?.decision || null,
      reasoning: result?.reasoning || '',
      confidence: result?.meta?.decision_score ?? null,
      risk_level: result?.meta?.risk_level ?? 'unknown',
      pipeline: result?.meta?.pipeline_recommended ?? 'unknown',
      signals: {
        requires_attention: result?.control_signals?.requires_attention ?? false,
        should_alert: result?.control_signals?.should_alert ?? false
      },
      metadata: {
        source_engine: 'unified',
        used_fallback: result?.meta?.fallback_used ?? result?.fallback_used ?? false,
        cognitive_escalation: !!(result && result.meta && result.meta.cognitive_escalation),
        engine_resolved: engineResolved,
        skipped_engine: !!(result && result.skipped),
        reason: result?.reason != null ? String(result.reason) : undefined
      },
      /** Saída bruta do motor — apenas para consumidores internos (ex. tríade no dashboard). */
      unified_result: result
    };

    logFacadeCoherence(payload, result, src);

    applyAdaptiveConfidencePayload(payload, context);

    setImmediate(() => {
      (async () => {
        try {
          if (process.env.UNIFIED_DECISION_AUDIT === 'true') {
            const auditSvc = require('./unifiedDecisionAuditService');
            const companyId =
              user && user.company_id != null
                ? user.company_id
                : context && typeof context === 'object' && context.company_id != null
                  ? context.company_id
                  : null;
            await auditSvc.auditDecision({
              facadeResult: payload,
              unifiedResult: result,
              outcome: null,
              context: { source: src, company_id: companyId, companyId }
            });
          }
        } catch (_a) {}
      })();
    });

    return payload;
  } catch (err) {
    console.warn('[DECISION_FACADE_FAIL]', err?.message || err);
    return {
      success: false,
      decision: null,
      reasoning: 'Decision unavailable',
      confidence: null,
      risk_level: 'unknown',
      pipeline: 'unknown',
      signals: {
        requires_attention: false,
        should_alert: false
      },
      metadata: {
        source_engine: 'unified',
        used_fallback: true,
        cognitive_escalation: false,
        engine_resolved: false
      },
      fallback: true,
      unified_result: undefined
    };
  }
}

/**
 * Entrada unificada para consumidores HTTP (ex.: dashboard chat): pipeline primário opcional + facade ou motor directo.
 * @param {object} params
 * @param {object|null} [params.user]
 * @param {string} [params.message]
 * @param {object|null} [params.context] — ex.: pack operational_overview
 * @param {string} [params.source]
 * @param {boolean} [params.skipCognitiveInvocation]
 * @param {number} [params.historyLength]
 * @param {object[]|null} [params.options]
 * @returns {Promise<object>}
 */
async function decide(params = {}) {
  const {
    user,
    message,
    context,
    source = 'dashboard_chat',
    skipCognitiveInvocation = true,
    historyLength = 0,
    options = null
  } = params;

  const ctx = {
    message,
    company_id: user?.company_id,
    module: source,
    dashboard_history_turns: historyLength
  };
  if (context && typeof context === 'object') {
    ctx.contextual_pack = context;
  }

  if (process.env.USE_DECISION_FACADE === 'true') {
    return decideWithFacade({
      user,
      context: ctx,
      options: Array.isArray(options) ? options : undefined,
      source,
      skipCognitiveInvocation
    });
  }

  const usePipeline = process.env.IMPETUS_PIPELINE_PRIMARY === 'true';
  if (usePipeline) {
    try {
      const pipelineResult = await decideWithPipeline({
        user,
        message: message != null ? String(message) : '',
        context: context && typeof context === 'object' ? context : {}
      });
      console.log('[PIPELINE_DECISION]', {
        used: usePipeline,
        fallback: !pipelineResult
      });
      if (pipelineResult) {
        return applyAdaptiveConfidencePayload(pipelineResult, ctx);
      }
    } catch (err) {
      console.error('[PIPELINE_FALLBACK]', err);
      console.log('[PIPELINE_DECISION]', { used: usePipeline, fallback: true });
    }
  }

  const unifiedDecisionEngine = require('./unifiedDecisionEngine');
  const unified_result = await unifiedDecisionEngine.decide({
    user: user != null ? user : null,
    context: ctx,
    options: Array.isArray(options) ? options : undefined,
    source: source != null ? String(source) : 'unknown',
    skipCognitiveInvocation: !!skipCognitiveInvocation
  });

  const engineResolved = !!(unified_result && unified_result.ok !== false && !unified_result.skipped);

  const out = {
    success: engineResolved,
    decision: unified_result?.decision || null,
    reasoning: unified_result?.reasoning || '',
    confidence: unified_result?.meta?.decision_score ?? null,
    risk_level: unified_result?.meta?.risk_level ?? 'unknown',
    pipeline: unified_result?.meta?.pipeline_recommended ?? 'unknown',
    signals: {
      requires_attention: unified_result?.control_signals?.requires_attention ?? false,
      should_alert: unified_result?.control_signals?.should_alert ?? false
    },
    metadata: {
      source_engine: 'unified',
      used_fallback: unified_result?.meta?.fallback_used ?? unified_result?.fallback_used ?? false,
      cognitive_escalation: !!(unified_result && unified_result.meta && unified_result.meta.cognitive_escalation),
      engine_resolved: engineResolved,
      skipped_engine: !!(unified_result && unified_result.skipped)
    },
    unified_result
  };
  return applyAdaptiveConfidencePayload(out, ctx);
}

module.exports = {
  decide,
  decideWithFacade,
  decisionFingerprint,
  logFacadeCoherence
};
