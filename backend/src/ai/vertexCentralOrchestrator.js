'use strict';

/**
 * Orquestração central IMPETUS — simula o papel do Vertex AI (fluxo, estado, decisão de etapa).
 * Implementação em Node até integração nativa com Vertex AI Agent/Flow (endpoint próprio).
 *
 * Ordem canónica: Entrada → Gemini (intenção + percepção) → [este orquestrador] → Claude → ChatGPT (só final).
 */

const geminiService = require('../services/geminiService');

const ORCHESTRATOR_ID = 'vertex_central_sim';

function isVertexGeminiTransport() {
  const v = String(process.env.GOOGLE_GENAI_USE_VERTEXAI || '').toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/** Alinhado ao arranque: só estrito com IMPETUS_STRICT_AI_PIPELINE=true|1|yes (omissão = não estrito). */
function isStrictAiPipeline() {
  const s = String(process.env.IMPETUS_STRICT_AI_PIPELINE || '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

/**
 * @param {string} traceId
 * @param {{ entrada_preview?: string }} meta
 */
function createCouncilRunTrace(traceId, meta = {}) {
  const now = new Date().toISOString();
  return {
    trace_id: traceId,
    orchestrator_id: ORCHESTRATOR_ID,
    coordination_engine: ORCHESTRATOR_ID,
    gemini_transport: isVertexGeminiTransport() ? 'vertex_ai' : 'google_ai_studio',
    vertex_ai_assists_gemini: Boolean(isVertexGeminiTransport() && geminiService.isAvailable()),
    started_at: now,
    completed_at: null,
    ok: null,
    error_code: null,
    entrada: {
      at: now,
      preview: String(meta.entrada_preview || '').slice(0, 800)
    },
    stages: []
  };
}

/**
 * @param {object} trace — createCouncilRunTrace
 * @param {string} stage
 * @param {object} [detail]
 */
function traceStage(trace, stage, detail = {}) {
  if (!trace || !Array.isArray(trace.stages)) return;
  trace.stages.push({
    stage,
    at: new Date().toISOString(),
    ...detail
  });
  try {
    console.info(
      '[VERTEX_ORCH]',
      JSON.stringify({ trace_id: trace.trace_id, stage, detail: Object.keys(detail || {}) })
    );
  } catch (_e) {
    /* ignore */
  }
}

function traceComplete(trace, ok, errorCode = null) {
  if (!trace) return;
  trace.completed_at = new Date().toISOString();
  trace.ok = ok;
  trace.error_code = errorCode || (ok ? null : 'UNKNOWN');
}

function vertexDecide(trace, decision, next_stage_hint) {
  traceStage(trace, 'vertex_orquestracao', {
    decision,
    next: next_stage_hint || null
  });
}

function getOrchestrationContext() {
  const geminiOk = typeof geminiService.isAvailable === 'function' && geminiService.isAvailable();
  const vertex = isVertexGeminiTransport();
  return {
    orchestrator_id: ORCHESTRATOR_ID,
    coordination_engine: ORCHESTRATOR_ID,
    gemini_transport: vertex ? 'vertex_ai' : geminiOk ? 'google_ai_studio' : 'unavailable',
    vertex_ai_assists_gemini: Boolean(vertex && geminiOk),
    strict_pipeline: isStrictAiPipeline(),
    pipeline_stages: [
      'entrada',
      'gemini_intent',
      'vertex_route',
      'gemini_perception',
      'vertex_route',
      'claude_technical',
      'vertex_route',
      'claude_internal_plan',
      'vertex_route',
      'chatgpt_final'
    ]
  };
}

/**
 * @param {string} code
 * @param {string} message
 * @returns {Error & { code: string }}
 */
function strictPipelineError(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}

module.exports = {
  ORCHESTRATOR_ID,
  createCouncilRunTrace,
  traceStage,
  traceComplete,
  vertexDecide,
  getOrchestrationContext,
  isStrictAiPipeline,
  isVertexGeminiTransport,
  strictPipelineError
};
