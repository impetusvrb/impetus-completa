'use strict';

/**
 * IMPETUS — Cognitive Authority Router (Consolidação F1)
 *
 * Autoridade única de routing cognitivo. Substitui a dispersão de entrypoints
 * por um ponto centralizado que governa, roteia, rastreia e aplica fallback.
 *
 * Lifecycle obrigatório:
 *   request → registry → governance → arbitration → orchestration → execution → observability → replay
 *
 * Este router NÃO substitui os serviços existentes — ele os ORQUESTRA.
 * Cada request cognitivo é um "cognitive request" que deve passar pelo lifecycle completo.
 *
 * Feature flag: IMPETUS_COGNITIVE_AUTHORITY_ROUTER_ENABLED (default: true)
 */

const { v4: uuidv4 } = require('uuid');

const ROUTER_ENABLED = process.env.IMPETUS_COGNITIVE_AUTHORITY_ROUTER_ENABLED !== 'false';

const LIFECYCLE_STAGES = Object.freeze([
  'request',
  'registry',
  'governance',
  'arbitration',
  'orchestration',
  'execution',
  'observability',
  'replay'
]);

const ROUTING_VERDICTS = Object.freeze({
  ALLOW: 'allow',
  ALLOW_WITH_TRACE: 'allow_with_trace',
  REDIRECT: 'redirect',
  DEGRADE: 'degrade',
  BLOCK: 'block',
  FALLBACK: 'fallback'
});

const MAX_ACTIVE_REQUESTS = 500;
const MAX_COMPLETED = 5000;
const MAX_LEGACY_AUDIT = 2000;

const _activeRequests = new Map();
const _completedRequests = [];
const _legacyAudit = [];
const _routingRules = new Map();
const _governanceHooks = [];

let _requestsRouted = 0;
let _requestsCompleted = 0;
let _requestsFailed = 0;
let _legacyDetections = 0;
let _governanceBlocks = 0;
let _fallbacksUsed = 0;
let _avgLatencyMs = 0;

/**
 * Ponto de entrada principal — TODA request cognitiva deveria passar por aqui.
 * @param {Object} request
 * @param {string} request.channel - canal de origem (dashboard_chat, council, voice, etc.)
 * @param {string} request.company_id
 * @param {string} request.user_id
 * @param {Object} request.payload
 * @param {Object} [request.metadata]
 * @returns {{ request_id: string, lifecycle: Object, routing: Object }}
 */
function route(request) {
  if (!ROUTER_ENABLED) {
    return { request_id: null, lifecycle: null, routing: { verdict: ROUTING_VERDICTS.ALLOW, reason: 'router_disabled' } };
  }

  const reqId = uuidv4();
  const now = new Date().toISOString();
  const channel = String(request.channel || 'unknown').toLowerCase();

  const cogReq = {
    request_id: reqId,
    channel,
    company_id: request.company_id || null,
    user_id: request.user_id || null,
    created_at: now,
    completed_at: null,
    stages: {},
    current_stage: LIFECYCLE_STAGES[0],
    status: 'active',
    routing: null,
    governance_result: null,
    arbitration_result: null,
    execution_result: null,
    latency_ms: null,
    trace: [],
    metadata: _safeClone(request.metadata || {})
  };

  for (const stage of LIFECYCLE_STAGES) {
    cogReq.stages[stage] = { status: 'pending', entered_at: null, exited_at: null, duration_ms: null, result: null };
  }

  _enterStage(cogReq, 'request');

  if (_activeRequests.size >= MAX_ACTIVE_REQUESTS) {
    _pruneOldestActive();
  }
  _activeRequests.set(reqId, cogReq);
  _requestsRouted++;

  const routing = _resolveRouting(cogReq);
  cogReq.routing = routing;

  _exitStage(cogReq, 'request', { routing });
  _enterStage(cogReq, 'registry');

  return { request_id: reqId, lifecycle: _lifecycleSummary(cogReq), routing };
}

/**
 * Avança o request por cada estágio do lifecycle.
 */
function advanceStage(requestId, stageResult = {}) {
  const req = _activeRequests.get(requestId);
  if (!req || req.status !== 'active') return null;

  const currentIdx = LIFECYCLE_STAGES.indexOf(req.current_stage);
  if (currentIdx < 0) return null;

  _exitStage(req, req.current_stage, stageResult);

  const nextIdx = currentIdx + 1;
  if (nextIdx >= LIFECYCLE_STAGES.length) {
    return _completeRequest(req);
  }

  const nextStage = LIFECYCLE_STAGES[nextIdx];
  _enterStage(req, nextStage);

  return { request_id: requestId, current_stage: nextStage, status: 'active' };
}

/**
 * Completa o request com resultado final.
 */
function completeRequest(requestId, result = {}) {
  const req = _activeRequests.get(requestId);
  if (!req) return null;
  req.execution_result = _safeClone(result);
  return _completeRequest(req);
}

/**
 * Marca request como falhado.
 */
function failRequest(requestId, error) {
  const req = _activeRequests.get(requestId);
  if (!req) return null;

  req.status = 'failed';
  req.completed_at = new Date().toISOString();
  req.latency_ms = new Date(req.completed_at) - new Date(req.created_at);
  req.trace.push({ stage: req.current_stage, action: 'failed', ts: req.completed_at, error: String(error || '') });
  _requestsFailed++;
  _archive(req);

  return { request_id: requestId, status: 'failed' };
}

function _resolveRouting(req) {
  const rule = _routingRules.get(req.channel);

  if (rule) {
    return {
      verdict: rule.verdict || ROUTING_VERDICTS.ALLOW_WITH_TRACE,
      target_runtime: rule.target_runtime || 'unified',
      reason: `channel_rule:${req.channel}`,
      fallback_runtime: rule.fallback_runtime || 'fallback'
    };
  }

  let verdict = ROUTING_VERDICTS.ALLOW_WITH_TRACE;
  let targetRuntime = 'unified';

  if (req.channel.includes('dashboard')) targetRuntime = 'decisionFacade';
  else if (req.channel.includes('council')) targetRuntime = 'council';
  else if (req.channel.includes('voice') || req.channel.includes('realtime')) targetRuntime = 'realtime';
  else if (req.channel.includes('webhook')) targetRuntime = 'lightweight';

  for (const hook of _governanceHooks) {
    try {
      const hookResult = hook(req);
      if (hookResult && hookResult.block) {
        verdict = ROUTING_VERDICTS.BLOCK;
        _governanceBlocks++;
        break;
      }
      if (hookResult && hookResult.degrade) {
        verdict = ROUTING_VERDICTS.DEGRADE;
      }
    } catch {}
  }

  return {
    verdict,
    target_runtime: targetRuntime,
    reason: 'default_routing',
    fallback_runtime: 'fallback'
  };
}

function _completeRequest(req) {
  req.status = 'completed';
  req.completed_at = new Date().toISOString();
  req.latency_ms = new Date(req.completed_at) - new Date(req.created_at);
  req.trace.push({ stage: req.current_stage || 'final', action: 'completed', ts: req.completed_at });
  _requestsCompleted++;
  _updateAvgLatency(req.latency_ms);
  _archive(req);

  return {
    request_id: req.request_id,
    status: 'completed',
    latency_ms: req.latency_ms,
    stages_passed: Object.values(req.stages).filter(s => s.status === 'completed').length
  };
}

function _enterStage(req, stage) {
  const now = new Date().toISOString();
  req.current_stage = stage;
  req.stages[stage].status = 'active';
  req.stages[stage].entered_at = now;
  req.trace.push({ stage, action: 'entered', ts: now });
}

function _exitStage(req, stage, result) {
  const now = new Date().toISOString();
  const s = req.stages[stage];
  s.status = 'completed';
  s.exited_at = now;
  s.duration_ms = s.entered_at ? new Date(now) - new Date(s.entered_at) : 0;
  s.result = _safeClone(result || {});
}

function _updateAvgLatency(latencyMs) {
  const alpha = 0.05;
  _avgLatencyMs = _avgLatencyMs * (1 - alpha) + latencyMs * alpha;
}

function _archive(req) {
  _activeRequests.delete(req.request_id);
  _completedRequests.push(req);
  if (_completedRequests.length > MAX_COMPLETED) {
    _completedRequests.splice(0, _completedRequests.length - MAX_COMPLETED);
  }
}

function _pruneOldestActive() {
  const entries = Array.from(_activeRequests.entries());
  if (entries.length > 0) {
    entries.sort((a, b) => new Date(a[1].created_at) - new Date(b[1].created_at));
    const oldest = entries[0];
    failRequest(oldest[0], 'pruned_due_to_capacity');
  }
}

function _lifecycleSummary(req) {
  const summary = {};
  for (const stage of LIFECYCLE_STAGES) {
    summary[stage] = req.stages[stage].status;
  }
  return summary;
}

/**
 * Auditoria de caminhos legados.
 * Quando um fluxo cognitivo bypassa o authority router, registar aqui.
 */
function auditLegacyPath(source, channel, metadata = {}) {
  _legacyDetections++;
  const entry = {
    audit_id: uuidv4(),
    source: String(source || 'unknown'),
    channel: String(channel || 'unknown'),
    detected_at: new Date().toISOString(),
    metadata: _safeClone(metadata)
  };
  _legacyAudit.push(entry);
  if (_legacyAudit.length > MAX_LEGACY_AUDIT) {
    _legacyAudit.splice(0, _legacyAudit.length - MAX_LEGACY_AUDIT);
  }
  return entry;
}

/**
 * Registar regra de routing para um canal específico.
 */
function setRoutingRule(channel, rule) {
  _routingRules.set(channel, { ...rule, channel, set_at: new Date().toISOString() });
}

/**
 * Registar hook de governance (será chamado em cada routing).
 */
function registerGovernanceHook(fn) {
  if (typeof fn === 'function') _governanceHooks.push(fn);
}

function getRequest(requestId) {
  return _activeRequests.get(requestId)
    || _completedRequests.find(r => r.request_id === requestId)
    || null;
}

function getActiveRequests() {
  return Array.from(_activeRequests.values()).map(r => ({
    request_id: r.request_id,
    channel: r.channel,
    current_stage: r.current_stage,
    status: r.status,
    created_at: r.created_at,
    latency_so_far_ms: Date.now() - new Date(r.created_at).getTime()
  }));
}

function getLegacyAudit(limit = 50) {
  return _legacyAudit.slice(-Math.min(limit, 500));
}

function getMetrics() {
  return {
    requests_routed: _requestsRouted,
    requests_completed: _requestsCompleted,
    requests_failed: _requestsFailed,
    requests_active: _activeRequests.size,
    legacy_detections: _legacyDetections,
    governance_blocks: _governanceBlocks,
    fallbacks_used: _fallbacksUsed,
    avg_latency_ms: Math.round(_avgLatencyMs),
    routing_rules: _routingRules.size,
    governance_hooks: _governanceHooks.length,
    router_enabled: ROUTER_ENABLED
  };
}

function getHealth() {
  const m = getMetrics();
  const failRate = m.requests_routed > 0 ? m.requests_failed / m.requests_routed : 0;

  return {
    status: !ROUTER_ENABLED ? 'disabled'
      : failRate > 0.3 ? 'critical'
      : failRate > 0.1 ? 'degraded'
      : m.requests_active > MAX_ACTIVE_REQUESTS * 0.8 ? 'saturated'
      : 'healthy',
    metrics: m,
    fail_rate_pct: Math.round(failRate * 10000) / 100,
    lifecycle_stages: LIFECYCLE_STAGES.length
  };
}

function _safeClone(obj) {
  try { return JSON.parse(JSON.stringify(obj)); }
  catch { return {}; }
}

module.exports = {
  LIFECYCLE_STAGES,
  ROUTING_VERDICTS,
  ROUTER_ENABLED,
  route,
  advanceStage,
  completeRequest,
  failRequest,
  auditLegacyPath,
  setRoutingRule,
  registerGovernanceHook,
  getRequest,
  getActiveRequests,
  getLegacyAudit,
  getMetrics,
  getHealth
};
