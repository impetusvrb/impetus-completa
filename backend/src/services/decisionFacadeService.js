'use strict';

/**
 * Fachada oficial de decisão — envolve unifiedDecisionEngine sem alterar o motor.
 * USE_DECISION_FACADE controla adopção nos consumidores.
 * DECISION_FACADE_VALIDATE=true — logs [DECISION_FACADE_COHERENCE] / violações de contrato.
 */

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

module.exports = {
  decideWithFacade,
  decisionFingerprint,
  logFacadeCoherence
};
