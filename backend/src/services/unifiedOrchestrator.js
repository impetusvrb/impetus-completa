'use strict';

/**
 * IMPETUS — Unified Orchestration Layer
 * Centraliza o lifecycle cognitivo (tracing, routing, convergência para runLlm/raw).
 * Rollout: IMPETUS_UNIFIED_ORCHESTRATOR_ENABLED=true
 */

const { AsyncLocalStorage } = require('async_hooks');
const { v4: uuidv4 } = require('uuid');
const aiSecurityGateway = require('./aiSecurityGateway');
const contextIntegrityService = require('./contextIntegrityService');
const cognitiveEventBackboneService = require('./cognitiveEventBackboneService');

const ORCH_VERSION = '1.0.0';

const RUNTIME_BY_CHANNEL = {
  dashboard_chat: 'decisionFacade',
  dashboard_chat_council: 'council',
  cognitive_council: 'council',
  internal_chat: 'unified',
  ai_orchestrator: 'unified',
  orchestrator_eval: 'unified',
  realtime_voice: 'realtime',
  webhook_message: 'lightweight'
};

const SUPPORTED_CHANNELS = Object.keys(RUNTIME_BY_CHANNEL);

const requestChannelAls = new AsyncLocalStorage();

let _legacyPathDetections = 0;
const LEGACY_ROLLING_CAP = 500;
/** @type {{ source: string, channel: string, trace_id: string|null, timestamp: string }[]} */
let _legacyRolling = [];
let _legacyZeroWindowStartMs = null;
let _everHadLegacy = false;
let _lastLegacyZeroWindowLog = false;

function isUnifiedOrchestratorEnabled() {
  return String(process.env.IMPETUS_UNIFIED_ORCHESTRATOR_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';
}

function isBlockLegacyEnabled() {
  return String(process.env.IMPETUS_BLOCK_LEGACY_COGNITIVE_PATHS || '')
    .trim()
    .toLowerCase() === 'true';
}

function runWithRequestChannel(channel, fn) {
  const ch = channel != null ? String(channel).trim() : '';
  return requestChannelAls.run({ channel: ch }, fn);
}

function getRequestChannelOverride() {
  const s = requestChannelAls.getStore();
  const c = s && s.channel ? String(s.channel).trim() : '';
  return c || null;
}

function resolveExecutionPath({ channel, metadata }) {
  const meta = metadata && typeof metadata === 'object' ? metadata : {};
  const chRaw = channel != null ? String(channel) : 'unknown';
  let runtime = RUNTIME_BY_CHANNEL[chRaw];
  if (!runtime) {
    if (meta.council === true || meta.runtime === 'council') runtime = 'council';
    else if (meta.decision_facade === true) runtime = 'decisionFacade';
  }
  if (!runtime) {
    if (/council/i.test(chRaw)) runtime = 'council';
    else if (/dashboard/i.test(chRaw)) runtime = 'decisionFacade';
    else if (/realtime|voice/i.test(chRaw)) runtime = 'realtime';
    else if (/webhook/i.test(chRaw)) runtime = 'lightweight';
    else runtime = 'unified';
  }
  return { runtime, channel: chRaw };
}

function legacyZeroWindowHours() {
  const n = Number(process.env.IMPETUS_LEGACY_ZERO_WINDOW_HOURS || 72);
  return Number.isFinite(n) && n > 0 ? Math.min(8760, n) : 72;
}

/**
 * Registo governado de caminhos legacy (rolling + observabilidade).
 * @param {{ source?: string, channel?: string, trace_id?: string|null, timestamp?: string }} row
 */
function registerLegacyExecutionPath(row) {
  const r = row && typeof row === 'object' ? row : {};
  const entry = {
    source: r.source != null ? String(r.source).slice(0, 512) : 'unknown',
    channel: r.channel != null ? String(r.channel).slice(0, 128) : 'unknown',
    trace_id: r.trace_id != null ? String(r.trace_id).slice(0, 128) : null,
    timestamp: r.timestamp || new Date().toISOString()
  };
  _legacyRolling.push(entry);
  while (_legacyRolling.length > LEGACY_ROLLING_CAP) _legacyRolling.shift();
  _everHadLegacy = true;
  _legacyZeroWindowStartMs = null;
  _lastLegacyZeroWindowLog = false;
  try {
    console.warn(
      '[LEGACY_PATH_DETECTED]',
      JSON.stringify({
        ...entry,
        rolling_size: _legacyRolling.length,
        total_detections: _legacyPathDetections
      })
    );
  } catch (_e) {}
}

function detectLegacyExecution(payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  _legacyPathDetections += 1;
  registerLegacyExecutionPath({
    source: p.source || 'legacy',
    channel: p.channel || 'unknown',
    trace_id: p.trace_id != null ? p.trace_id : null,
    timestamp: p.ts || new Date().toISOString()
  });
  try {
    console.warn(
      '[LEGACY_COGNITIVE_PATH]',
      JSON.stringify({
        ...p,
        count: _legacyPathDetections,
        ts: new Date().toISOString()
      })
    );
  } catch (_e) {}
}

function _legacyPathsLast24hCount() {
  const cutoff = Date.now() - 24 * 3600000;
  let n = 0;
  for (const e of _legacyRolling) {
    const t = Date.parse(e.timestamp);
    if (!Number.isFinite(t)) continue;
    if (t >= cutoff) n += 1;
  }
  return n;
}

function _computeLegacyBlockModeReady() {
  const last24 = _legacyPathsLast24hCount();
  if (last24 > 0) {
    _legacyZeroWindowStartMs = null;
    return false;
  }
  const now = Date.now();
  if (_legacyZeroWindowStartMs == null) {
    _legacyZeroWindowStartMs = now;
  }
  const winMs = legacyZeroWindowHours() * 3600000;
  const ready = _everHadLegacy && last24 === 0 && now - _legacyZeroWindowStartMs >= winMs;
  if (ready && !_lastLegacyZeroWindowLog) {
    _lastLegacyZeroWindowLog = true;
    try {
      console.info(
        '[LEGACY_ZERO_WINDOW]',
        JSON.stringify({
          legacy_paths_last_24h: 0,
          window_hours: legacyZeroWindowHours(),
          legacy_block_mode_ready: true,
          note: 'readiness_only_no_auto_block'
        })
      );
    } catch (_e) {}
  }
  if (!ready) _lastLegacyZeroWindowLog = false;
  return ready;
}

function getLegacyRuntimeDashboard() {
  const legacy_paths_last_24h = _legacyPathsLast24hCount();
  const legacy_block_mode_ready = _computeLegacyBlockModeReady();
  return {
    legacy_paths_detected: _legacyPathDetections,
    legacy_paths_last_24h,
    legacy_block_mode_ready,
    legacy_rolling_buffer_size: _legacyRolling.length,
    legacy_zero_window_hours: legacyZeroWindowHours()
  };
}

function getLegacyPathCount() {
  return _legacyPathDetections;
}

function getSupportedChannelCount() {
  return SUPPORTED_CHANNELS.length;
}

/** Apenas testes / diagnóstico */
function _resetObservabilityCounters() {
  _legacyPathDetections = 0;
  _legacyRolling = [];
  _legacyZeroWindowStartMs = null;
  _everHadLegacy = false;
  _lastLegacyZeroWindowLog = false;
}

/** Só em NODE_ENV=test ou IMPETUS_TEST_MODE — avança o relógio interno da janela zero legacy */
function _legacyTestSetZeroWindowAgeMs(agoMs) {
  const testEnv =
    String(process.env.NODE_ENV || '') === 'test' ||
    String(process.env.IMPETUS_TEST_MODE || '')
      .trim()
      .toLowerCase() === 'true';
  if (!testEnv) return;
  const n = Number(agoMs);
  if (!Number.isFinite(n) || n < 0) return;
  _legacyZeroWindowStartMs = Date.now() - n;
}

function normalizeCognitiveResponse({
  content,
  traceId,
  channel,
  runtime,
  model,
  latencyMs,
  safety,
  consensus
}) {
  const text = content != null ? String(content) : '';
  let confidence = null;
  const m = text.match(/\b(confidence|confian[cç]a)\s*[:=]\s*(\d{1,3})\b/i);
  if (m) confidence = Math.min(100, parseInt(m[2], 10));
  if (confidence == null || !Number.isFinite(confidence)) {
    confidence = text.length > 80 ? 82 : 60;
  }
  return {
    content: text,
    confidence,
    trace_id: traceId,
    channel: channel || null,
    runtime: runtime || null,
    model: model || null,
    latency_ms: latencyMs != null ? latencyMs : null,
    safety: safety && typeof safety === 'object' ? safety : {},
    consensus: consensus && typeof consensus === 'object' ? consensus : {},
    orchestrator_version: ORCH_VERSION
  };
}

/**
 * Sessão WebSocket Realtime: observabilidade sem bloquear streaming.
 */
function traceRealtimeVoiceAttach({ user, model, traceId }) {
  if (!isUnifiedOrchestratorEnabled()) return;
  const tid = traceId || uuidv4();
  const runtimeId = uuidv4();
  const path = resolveExecutionPath({ channel: 'realtime_voice', metadata: {} });
  try {
    console.info(
      '[UNIFIED_ORCHESTRATOR]',
      JSON.stringify({
        trace_id: tid,
        runtime_id: runtimeId,
        channel: 'realtime_voice',
        runtime: path.runtime,
        model: model || null,
        gateway_enforced: aiSecurityGateway.isRealtimeGatewayEnabled(),
        orchestrator_version: ORCH_VERSION,
        mode: 'websocket_attach'
      })
    );
    console.info(
      '[UNIFIED_ROUTING]',
      JSON.stringify({
        trace_id: tid,
        runtime_id: runtimeId,
        channel: 'realtime_voice',
        runtime: path.runtime
      })
    );
    console.info(
      '[UNIFIED_RUNTIME]',
      JSON.stringify({
        trace_id: tid,
        runtime_id: runtimeId,
        channel: 'realtime_voice',
        model: model || null,
        latency_ms: 0,
        note: 'streaming_session'
      })
    );
  } catch (_e) {}
}

/**
 * Execução cognitiva unificada (texto LLM via messages OpenAI).
 */
async function executeCognitiveFlow({
  channel,
  user,
  companyId,
  messages,
  model,
  metadata,
  llmOpts
}) {
  const alsCh = getRequestChannelOverride();
  const effectiveChannel = alsCh || channel || 'unknown';
  const meta = metadata && typeof metadata === 'object' ? { ...metadata } : {};
  const traceId = meta.traceId || meta.trace_id || uuidv4();
  delete meta.traceId;
  delete meta.trace_id;

  const runtimeId = uuidv4();
  const started = Date.now();
  const path = resolveExecutionPath({ channel: effectiveChannel, metadata: meta });
  const llm = llmOpts && typeof llmOpts === 'object' ? llmOpts : {};
  const resolvedModel =
    model || llm.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const cid =
    companyId != null && String(companyId).trim() !== ''
      ? String(companyId).trim()
      : user?.company_id != null
        ? String(user.company_id).trim()
        : null;

  cognitiveEventBackboneService.publishCognitiveEventDeferred({
    event_type: cognitiveEventBackboneService.EVENT_TYPES.LLM_EXECUTION,
    trace_id: traceId,
    company_id: cid,
    channel: path.channel,
    runtime: path.runtime,
    context_hash: meta.context_hash || meta._context_hash || null,
    payload: { phase: 'start', model: resolvedModel },
    metadata: { runtime_id: runtimeId, unified: true }
  });

  try {
    console.info(
      '[UNIFIED_ORCHESTRATOR]',
      JSON.stringify({
        trace_id: traceId,
        runtime_id: runtimeId,
        channel: path.channel,
        runtime: path.runtime,
        model: resolvedModel,
        gateway_enforced: aiSecurityGateway.isGatewayEnabled(),
        orchestrator_version: ORCH_VERSION
      })
    );
    console.info(
      '[UNIFIED_ROUTING]',
      JSON.stringify({
        trace_id: traceId,
        runtime_id: runtimeId,
        channel: path.channel,
        runtime: path.runtime
      })
    );
  } catch (_e) {}

  const billing =
    llm.billing ||
    (user && user.id && cid ? { companyId: cid, userId: user.id } : undefined);

  const mergedOpts = {
    ...llm,
    model: resolvedModel,
    billing,
    user: user || ll.user,
    channel: path.channel,
    _unifiedRawAllowed: true
  };

  const ai = require('./ai');
  let text = '';
  try {
    if (aiSecurityGateway.isGatewayEnabled()) {
      const { runLlm } = require('./runLlm');
      text = await runLlm({
        channel: path.channel,
        user: user || mergedOpts.user || null,
        companyId: cid,
        model: resolvedModel,
        messages: Array.isArray(messages) ? messages : [],
        metadata: { ...meta, unified_runtime: path.runtime, _unifiedOrchestrated: true },
        traceId,
        llmOpts: mergedOpts,
        executeFn: (m, o) => ai.rawChatCompletionMessages(m, o)
      });
    } else {
      text = await ai.rawChatCompletionMessages(
        Array.isArray(messages) ? messages : [],
        mergedOpts
      );
    }
    try {
      const snap = contextIntegrityService.consumeIntegrityFlowTrace(traceId);
      console.info(
        '[CONTEXT_INTEGRITY]',
        JSON.stringify({
          trace_id: traceId,
          runtime_id: runtimeId,
          channel: path.channel,
          context_hash: snap?.context_hash ? String(snap.context_hash).slice(0, 24) : null,
          integrity_status: snap?.integrity_status || (contextIntegrityService.isContextIntegrityEnabled() ? 'not_traced' : 'layer_disabled'),
          tenant_scope: snap?.tenant_scope || cid || null
        })
      );
    } catch (_log) {}
    const latencyDone = Date.now() - started;
    cognitiveEventBackboneService.publishCognitiveEventDeferred({
      event_type: cognitiveEventBackboneService.EVENT_TYPES.LLM_EXECUTION,
      trace_id: traceId,
      company_id: cid,
      channel: path.channel,
      runtime: path.runtime,
      context_hash: meta.context_hash || meta._context_hash || null,
      payload: {
        phase: 'end',
        model: resolvedModel,
        latency_ms: latencyDone,
        output_chars: text != null ? String(text).length : 0
      },
      metadata: { runtime_id: runtimeId, unified: true }
    });
  } catch (e) {
    try {
      console.error(
        '[UNIFIED_ORCHESTRATOR_ERROR]',
        JSON.stringify({
          trace_id: traceId,
          runtime_id: runtimeId,
          channel: path.channel,
          message: e?.message || String(e)
        })
      );
    } catch (_e2) {}
    throw e;
  }

  const latencyMs = Date.now() - started;
  try {
    console.info(
      '[UNIFIED_RUNTIME]',
      JSON.stringify({
        trace_id: traceId,
        runtime_id: runtimeId,
        channel: path.channel,
        runtime: path.runtime,
        model: resolvedModel,
        latency_ms: latencyMs
      })
    );
  } catch (_e) {}

  return normalizeCognitiveResponse({
    content: text,
    traceId,
    channel: path.channel,
    runtime: path.runtime,
    model: resolvedModel,
    latencyMs,
    safety: {},
    consensus: {}
  });
}

module.exports = {
  ORCH_VERSION,
  RUNTIME_BY_CHANNEL,
  SUPPORTED_CHANNELS,
  isUnifiedOrchestratorEnabled,
  isBlockLegacyEnabled,
  runWithRequestChannel,
  getRequestChannelOverride,
  resolveExecutionPath,
  registerLegacyExecutionPath,
  detectLegacyExecution,
  getLegacyPathCount,
  getLegacyRuntimeDashboard,
  getSupportedChannelCount,
  normalizeCognitiveResponse,
  executeCognitiveFlow,
  traceRealtimeVoiceAttach,
  _resetObservabilityCounters,
  _legacyTestSetZeroWindowAgeMs
};
