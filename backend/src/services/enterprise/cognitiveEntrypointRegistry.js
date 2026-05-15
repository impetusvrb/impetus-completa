'use strict';

/**
 * IMPETUS — Cognitive Entrypoint Registry (Fase 3.1 + 3.2 + 3.3)
 * Catálogo centralizado de TODOS os pontos de entrada cognitivos.
 * Garante lifecycle unificado: entrypoint → pipeline → governance → orchestration → policy → response.
 *
 * Pipeline Authority Mode (env IMPETUS_PIPELINE_AUTHORITY_MODE):
 *   shadow   → pipeline observa mas não decide
 *   partial  → pipeline decide em subset de channels
 *   primary  → pipeline decide na maioria, legado como fallback
 *   exclusive → só pipeline opera (legado desligado)
 *
 * Feature flag: IMPETUS_COGNITIVE_REGISTRY_ENABLED (default: true)
 */

const { v4: uuidv4 } = require('uuid');

const REGISTRY_ENABLED = process.env.IMPETUS_COGNITIVE_REGISTRY_ENABLED !== 'false';

const AUTHORITY_MODES = Object.freeze({
  SHADOW: 'shadow',
  PARTIAL: 'partial',
  PRIMARY: 'primary',
  EXCLUSIVE: 'exclusive'
});

const VALID_AUTHORITY_MODES = new Set(Object.values(AUTHORITY_MODES));

const ENTRYPOINT_TYPES = Object.freeze({
  DASHBOARD_CHAT: 'dashboard_chat',
  MULTIMODAL: 'multimodal',
  COUNCIL: 'council',
  COPILOT: 'copilot',
  AI_ACTION: 'ai_action',
  VOICE: 'voice',
  API: 'api',
  WEBHOOK: 'webhook',
  INTERNAL: 'internal',
  EDGE: 'edge',
  SCHEDULED: 'scheduled'
});

const LIFECYCLE_STAGES = Object.freeze([
  'entrypoint',
  'pipeline',
  'governance',
  'orchestration',
  'policy',
  'response'
]);

const _registry = new Map();
const _activeFlows = new Map();
const _flowHistory = [];
const MAX_FLOW_HISTORY = 2000;

let _flowsCreated = 0;
let _flowsCompleted = 0;
let _flowsFailed = 0;
let _legacyBypassDetections = 0;
let _pipelineDecisions = 0;

function getAuthorityMode() {
  const raw = String(process.env.IMPETUS_PIPELINE_AUTHORITY_MODE || 'shadow').trim().toLowerCase();
  return VALID_AUTHORITY_MODES.has(raw) ? raw : AUTHORITY_MODES.SHADOW;
}

function registerEntrypoint(id, config) {
  if (!id || typeof id !== 'string') return false;
  const entry = {
    id,
    type: config.type || ENTRYPOINT_TYPES.API,
    label: config.label || id,
    channels: config.channels || [],
    runtime: config.runtime || 'unified',
    governance_required: config.governance_required !== false,
    policy_required: config.policy_required !== false,
    registered_at: new Date().toISOString(),
    active: config.active !== false
  };
  _registry.set(id, Object.freeze(entry));
  return true;
}

function getRegisteredEntrypoints() {
  return Array.from(_registry.values());
}

function getEntrypoint(id) {
  return _registry.get(id) || null;
}

/**
 * Lifecycle unificado: cria um novo fluxo cognitivo que DEVE passar por todos os estágios.
 */
function createFlow(entrypointId, context = {}) {
  if (!REGISTRY_ENABLED) return null;

  const entry = _registry.get(entrypointId);
  if (!entry || !entry.active) return null;

  const flowId = uuidv4();
  const flow = {
    flow_id: flowId,
    entrypoint_id: entrypointId,
    entrypoint_type: entry.type,
    company_id: context.company_id || null,
    user_id: context.user_id || null,
    channel: context.channel || entry.channels[0] || 'unknown',
    authority_mode: getAuthorityMode(),
    stages: {},
    current_stage: LIFECYCLE_STAGES[0],
    status: 'active',
    created_at: new Date().toISOString(),
    completed_at: null,
    metadata: _safeClone(context.metadata || {}),
    trace: []
  };

  for (const stage of LIFECYCLE_STAGES) {
    flow.stages[stage] = { status: 'pending', entered_at: null, exited_at: null, result: null };
  }

  flow.stages.entrypoint.status = 'active';
  flow.stages.entrypoint.entered_at = flow.created_at;
  flow.trace.push({ stage: 'entrypoint', action: 'created', ts: flow.created_at });

  _activeFlows.set(flowId, flow);
  _flowsCreated++;

  return { flow_id: flowId, entrypoint: entry, authority_mode: flow.authority_mode };
}

function advanceFlow(flowId, stageResult = {}) {
  const flow = _activeFlows.get(flowId);
  if (!flow || flow.status !== 'active') return null;

  const currentIdx = LIFECYCLE_STAGES.indexOf(flow.current_stage);
  if (currentIdx < 0) return null;

  const now = new Date().toISOString();
  flow.stages[flow.current_stage].status = 'completed';
  flow.stages[flow.current_stage].exited_at = now;
  flow.stages[flow.current_stage].result = _safeClone(stageResult);

  flow.trace.push({
    stage: flow.current_stage,
    action: 'completed',
    ts: now,
    result_summary: stageResult.summary || null
  });

  const nextIdx = currentIdx + 1;
  if (nextIdx >= LIFECYCLE_STAGES.length) {
    flow.status = 'completed';
    flow.completed_at = now;
    flow.current_stage = null;
    _flowsCompleted++;
    _archiveFlow(flow);
    return { flow_id: flowId, status: 'completed', stages_passed: LIFECYCLE_STAGES.length };
  }

  const nextStage = LIFECYCLE_STAGES[nextIdx];
  flow.current_stage = nextStage;
  flow.stages[nextStage].status = 'active';
  flow.stages[nextStage].entered_at = now;

  flow.trace.push({ stage: nextStage, action: 'entered', ts: now });

  return { flow_id: flowId, status: 'active', current_stage: nextStage };
}

function failFlow(flowId, error) {
  const flow = _activeFlows.get(flowId);
  if (!flow) return;

  flow.status = 'failed';
  flow.completed_at = new Date().toISOString();
  flow.trace.push({ stage: flow.current_stage, action: 'failed', ts: flow.completed_at, error: String(error || 'unknown') });
  _flowsFailed++;
  _archiveFlow(flow);
}

function getFlow(flowId) {
  return _activeFlows.get(flowId) || _flowHistory.find(f => f.flow_id === flowId) || null;
}

/**
 * Ponto de decisão do pipeline authority:
 * determina se o pipeline deve controlar vs observar para este flow.
 */
function shouldPipelineDecide(flowId) {
  const flow = _activeFlows.get(flowId);
  if (!flow) return false;

  const mode = flow.authority_mode;

  if (mode === AUTHORITY_MODES.EXCLUSIVE) { _pipelineDecisions++; return true; }
  if (mode === AUTHORITY_MODES.SHADOW) return false;

  if (mode === AUTHORITY_MODES.PRIMARY) {
    _pipelineDecisions++;
    return true;
  }

  if (mode === AUTHORITY_MODES.PARTIAL) {
    const partialChannels = new Set(['dashboard_chat', 'ai_action', 'internal']);
    if (partialChannels.has(flow.channel)) {
      _pipelineDecisions++;
      return true;
    }
    return false;
  }

  return false;
}

function detectLegacyBypass(source, channel) {
  _legacyBypassDetections++;
  return {
    detected: true,
    source,
    channel,
    authority_mode: getAuthorityMode(),
    timestamp: new Date().toISOString(),
    recommendation: getAuthorityMode() === AUTHORITY_MODES.EXCLUSIVE
      ? 'BLOCK — exclusive mode ativo, legacy não permitido'
      : 'ALLOW_WITH_LOG — modo não-exclusive, legacy permitido com auditoria'
  };
}

function _archiveFlow(flow) {
  _activeFlows.delete(flow.flow_id);
  _flowHistory.push(flow);
  if (_flowHistory.length > MAX_FLOW_HISTORY) {
    _flowHistory.splice(0, _flowHistory.length - MAX_FLOW_HISTORY);
  }
}

function _safeClone(obj) {
  try { return JSON.parse(JSON.stringify(obj)); }
  catch { return {}; }
}

function getMetrics() {
  return {
    flows_created: _flowsCreated,
    flows_completed: _flowsCompleted,
    flows_failed: _flowsFailed,
    flows_active: _activeFlows.size,
    legacy_bypass_detections: _legacyBypassDetections,
    pipeline_decisions: _pipelineDecisions,
    registered_entrypoints: _registry.size,
    authority_mode: getAuthorityMode(),
    registry_enabled: REGISTRY_ENABLED
  };
}

function getHealth() {
  const m = getMetrics();
  const failRate = m.flows_created > 0 ? m.flows_failed / m.flows_created : 0;

  return {
    status: !REGISTRY_ENABLED ? 'disabled'
      : failRate > 0.3 ? 'critical'
      : failRate > 0.1 ? 'degraded'
      : 'healthy',
    metrics: m,
    fail_rate_pct: Math.round(failRate * 10000) / 100
  };
}

_registerDefaults();

function _registerDefaults() {
  registerEntrypoint('dashboard_chat', {
    type: ENTRYPOINT_TYPES.DASHBOARD_CHAT,
    label: 'Dashboard Chat Widget',
    channels: ['dashboard_chat', 'dashboard_chat_council'],
    runtime: 'decisionFacade'
  });
  registerEntrypoint('cognitive_council', {
    type: ENTRYPOINT_TYPES.COUNCIL,
    label: 'Cognitive Council',
    channels: ['cognitive_council'],
    runtime: 'council'
  });
  registerEntrypoint('multimodal_chat', {
    type: ENTRYPOINT_TYPES.MULTIMODAL,
    label: 'Multimodal Chat',
    channels: ['internal_chat'],
    runtime: 'unified'
  });
  registerEntrypoint('voice_assistant', {
    type: ENTRYPOINT_TYPES.VOICE,
    label: 'Voice Assistant',
    channels: ['realtime_voice'],
    runtime: 'realtime'
  });
  registerEntrypoint('ai_action', {
    type: ENTRYPOINT_TYPES.AI_ACTION,
    label: 'AI Actions',
    channels: ['ai_action'],
    runtime: 'unified'
  });
  registerEntrypoint('webhook_ingress', {
    type: ENTRYPOINT_TYPES.WEBHOOK,
    label: 'Webhook Ingress',
    channels: ['webhook_message'],
    runtime: 'lightweight'
  });
  registerEntrypoint('edge_telemetry', {
    type: ENTRYPOINT_TYPES.EDGE,
    label: 'Edge Telemetry',
    channels: ['edge'],
    runtime: 'lightweight',
    governance_required: false
  });
  registerEntrypoint('scheduled_brain', {
    type: ENTRYPOINT_TYPES.SCHEDULED,
    label: 'Scheduled Brain',
    channels: ['scheduled'],
    runtime: 'unified'
  });
}

module.exports = {
  AUTHORITY_MODES,
  ENTRYPOINT_TYPES,
  LIFECYCLE_STAGES,
  REGISTRY_ENABLED,
  registerEntrypoint,
  getRegisteredEntrypoints,
  getEntrypoint,
  createFlow,
  advanceFlow,
  failFlow,
  getFlow,
  getAuthorityMode,
  shouldPipelineDecide,
  detectLegacyBypass,
  getMetrics,
  getHealth
};
