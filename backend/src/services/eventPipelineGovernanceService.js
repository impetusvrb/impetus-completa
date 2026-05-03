'use strict';

/**
 * Governação progressiva — sensor do pipeline (sem substituir o controller).
 * Nunca lança para o caller: falhas viram null + log opcional.
 */

const pipelineSnapshotFn = require('../eventPipeline/processEvent');

/**
 * Snapshot leve (processor + refinamento Gemini/fallback), sem publicar no bus.
 * @param {string} text
 * @param {{ traceId?: string, userId?: string|string, priority?: string }} [ctx]
 * @returns {Promise<object|null>}
 */
async function runTextSensor(text, ctx = {}) {
  try {
    const t = text != null ? String(text) : '';
    if (!t.trim()) return null;
    return await pipelineSnapshotFn(t, {
      traceId: ctx.traceId,
      userId: ctx.userId,
      priority: ctx.priority || 'medium'
    });
  } catch (err) {
    console.warn('[PIPELINE_SENSOR_FAIL]', err && err.message ? String(err.message) : err);
    return null;
  }
}

/**
 * Heurística mínima para comparar com intent do pipeline (não é decisão oficial).
 */
function inferControllerIntentLabel(text, moduleName) {
  const t = String(text || '').toLowerCase();
  const m = String(moduleName || '').toLowerCase();
  if (t.includes('manuten') || t.includes('falha') || t.includes('diagnos') || m.includes('maintenance')) {
    return 'analysis';
  }
  if (t.includes('tarefa') || t.includes('task ') || m.includes('task')) return 'task';
  if (t.includes('sensor') || t.includes('alerta') || t.includes('health')) return 'system_health';
  if (t.includes('externo') || t.includes('erp') || t.includes('mes')) return 'external_data';
  return 'conversation';
}

function maybeLogDecisionConflict({ controllerIntent, pipelineIntent, confidence, traceId }) {
  if (process.env.IMPETUS_PIPELINE_CONFLICT_LOG !== 'true') return;
  if (!pipelineIntent || !controllerIntent) return;
  if (controllerIntent === pipelineIntent) return;
  try {
    console.log(
      JSON.stringify({
        tag: '[DECISION_CONFLICT]',
        controllerIntent,
        pipelineIntent,
        confidence: confidence != null ? Number(confidence) : null,
        traceId: traceId || null,
        ts: new Date().toISOString()
      })
    );
  } catch (_e) {
    /* NDJSON nunca deve derrubar */
  }
}

/**
 * @param {{ traceId?: string, companyId?: string, userId?: string, decision?: string, pipelineIntent?: string, confidence?: number, degraded?: boolean }} payload
 */
function logCognitiveImpact(payload) {
  try {
    console.log(
      JSON.stringify({
        tag: '[COGNITIVE_IMPACT]',
        decision: payload.decision != null ? String(payload.decision).slice(0, 256) : null,
        traceId: payload.traceId || null,
        companyId: payload.companyId || null,
        userId: payload.userId || null,
        pipelineIntent: payload.pipelineIntent || null,
        confidence: payload.confidence != null ? Number(payload.confidence) : null,
        degraded: !!payload.degraded,
        ts: new Date().toISOString()
      })
    );
  } catch (_e) {}
}

/**
 * Regra progressiva (observabilidade): quando alinhado e confiante, o pipeline pode
 * ser tratado como autoridade futura; por ora só devolve flags (sem alterar rotas).
 */
function evaluateGovernance({ confidence, conflict }) {
  if (process.env.IMPETUS_PIPELINE_GOVERNOR !== 'true') {
    return { usePipelineAuthority: false, reason: 'governor_off' };
  }
  const c = Number(confidence);
  if (!Number.isFinite(c) || c < 0.7) {
    return { usePipelineAuthority: false, reason: 'low_confidence' };
  }
  if (conflict) return { usePipelineAuthority: false, reason: 'conflict' };
  return { usePipelineAuthority: true, reason: 'aligned' };
}

module.exports = {
  runTextSensor,
  inferControllerIntentLabel,
  maybeLogDecisionConflict,
  logCognitiveImpact,
  evaluateGovernance
};
