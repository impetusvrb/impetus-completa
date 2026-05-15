'use strict';

/**
 * IMPETUS — Cognitive Explainability Service (Fase 6)
 * Rastreabilidade completa de decisões cognitivas.
 * Grafo de explicação, timeline de decisão e painel executivo.
 *
 * Integra: cognitiveAudit, unifiedDecisionAuditService,
 * operationalBrainExplanationService em um grafo explicável.
 *
 * Feature flag: IMPETUS_EXPLAINABILITY_ENABLED (default: true)
 */

const { v4: uuidv4 } = require('uuid');

const EXPLAIN_ENABLED = process.env.IMPETUS_EXPLAINABILITY_ENABLED !== 'false';

const DECISION_SOURCES = Object.freeze({
  PIPELINE: 'pipeline',
  COUNCIL: 'council',
  POLICY_ENGINE: 'policy_engine',
  ARBITRATION: 'arbitration',
  GOVERNANCE: 'governance',
  HUMAN: 'human',
  FALLBACK: 'fallback',
  ADAPTIVE: 'adaptive'
});

const NODE_TYPES = Object.freeze({
  EVENT: 'event',
  POLICY: 'policy',
  CAPABILITY: 'capability',
  ARBITRATION: 'arbitration',
  OBLIGATION: 'obligation',
  SCORE: 'score',
  DECISION: 'decision',
  RESPONSE: 'response'
});

const MAX_GRAPHS = 2000;
const MAX_TIMELINES = 5000;

const _graphs = [];
const _timelines = [];
let _graphsCreated = 0;
let _queriesAnswered = 0;

/**
 * Cria um grafo de explicabilidade para uma decisão cognitiva.
 */
function createExplainabilityGraph(decisionId, context = {}) {
  if (!EXPLAIN_ENABLED) return null;

  const graph = {
    graph_id: uuidv4(),
    decision_id: decisionId,
    company_id: context.company_id || null,
    user_id: context.user_id || null,
    created_at: new Date().toISOString(),
    nodes: [],
    edges: [],
    summary: null,
    final_decision: null
  };

  _graphs.push(graph);
  if (_graphs.length > MAX_GRAPHS) _graphs.splice(0, _graphs.length - MAX_GRAPHS);
  _graphsCreated++;

  return graph;
}

function addNode(graphId, nodeType, data = {}) {
  const graph = _graphs.find(g => g.graph_id === graphId);
  if (!graph) return null;

  const node = {
    node_id: uuidv4(),
    type: NODE_TYPES[nodeType] || nodeType,
    label: data.label || nodeType,
    source: data.source || DECISION_SOURCES.PIPELINE,
    score: data.score != null ? data.score : null,
    confidence: data.confidence != null ? data.confidence : null,
    reasoning: data.reasoning || null,
    timestamp: new Date().toISOString(),
    metadata: _safeClone(data.metadata || {})
  };

  graph.nodes.push(node);
  return node;
}

function addEdge(graphId, fromNodeId, toNodeId, relationship = 'leads_to') {
  const graph = _graphs.find(g => g.graph_id === graphId);
  if (!graph) return null;

  const edge = {
    edge_id: uuidv4(),
    from: fromNodeId,
    to: toNodeId,
    relationship,
    timestamp: new Date().toISOString()
  };

  graph.edges.push(edge);
  return edge;
}

function setDecision(graphId, decision) {
  const graph = _graphs.find(g => g.graph_id === graphId);
  if (!graph) return;

  graph.final_decision = {
    action: decision.action || 'unknown',
    source: decision.source || DECISION_SOURCES.PIPELINE,
    score: decision.score || null,
    confidence: decision.confidence || null,
    reasoning: decision.reasoning || null,
    timestamp: new Date().toISOString()
  };

  graph.summary = _buildGraphSummary(graph);
}

function _buildGraphSummary(graph) {
  const policyNodes = graph.nodes.filter(n => n.type === NODE_TYPES.POLICY);
  const arbitrationNodes = graph.nodes.filter(n => n.type === NODE_TYPES.ARBITRATION);
  const scoreNodes = graph.nodes.filter(n => n.type === NODE_TYPES.SCORE);

  return {
    total_nodes: graph.nodes.length,
    total_edges: graph.edges.length,
    policies_evaluated: policyNodes.length,
    arbitrations: arbitrationNodes.length,
    scores_computed: scoreNodes.length,
    decision_source: graph.final_decision ? graph.final_decision.source : null,
    avg_confidence: scoreNodes.length
      ? Math.round(scoreNodes.reduce((s, n) => s + (n.confidence || 0), 0) / scoreNodes.length * 100) / 100
      : null
  };
}

/**
 * Cognitive Decision Timeline (Fase 6.2)
 * Registra a sequência temporal: evento → policy → arbitration → decisão → resposta
 */
function recordTimelineEntry(traceId, entry = {}) {
  if (!EXPLAIN_ENABLED) return;

  const timelineEntry = {
    entry_id: uuidv4(),
    trace_id: traceId,
    stage: entry.stage || 'unknown',
    action: entry.action || 'processed',
    source: entry.source || DECISION_SOURCES.PIPELINE,
    input_summary: entry.input_summary || null,
    output_summary: entry.output_summary || null,
    duration_ms: entry.duration_ms || null,
    score: entry.score || null,
    confidence: entry.confidence || null,
    timestamp: new Date().toISOString(),
    metadata: _safeClone(entry.metadata || {})
  };

  _timelines.push(timelineEntry);
  if (_timelines.length > MAX_TIMELINES) _timelines.splice(0, _timelines.length - MAX_TIMELINES);
}

function getTimeline(traceId) {
  return _timelines
    .filter(t => t.trace_id === traceId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

/**
 * Executive Explainability Panel (Fase 6.3)
 * Responde: "por que apareceu?", "quem decidiu?", "qual score?"
 */
function explainDecision(decisionId) {
  _queriesAnswered++;

  const graph = _graphs.find(g => g.decision_id === decisionId);
  if (!graph) {
    return {
      found: false,
      decision_id: decisionId,
      explanation: 'Decisão não encontrada no registro de explicabilidade.'
    };
  }

  const fd = graph.final_decision || {};
  const policyNodes = graph.nodes.filter(n => n.type === NODE_TYPES.POLICY);
  const arbitrationNodes = graph.nodes.filter(n => n.type === NODE_TYPES.ARBITRATION);

  return {
    found: true,
    decision_id: decisionId,
    why: fd.reasoning || 'Sem reasoning registado.',
    who_decided: fd.source || 'unknown',
    score: fd.score,
    confidence: fd.confidence,
    policies_involved: policyNodes.map(n => ({ label: n.label, score: n.score, reasoning: n.reasoning })),
    arbitrations: arbitrationNodes.map(n => ({ label: n.label, score: n.score })),
    graph_summary: graph.summary,
    timeline: getTimeline(graph.graph_id),
    generated_at: new Date().toISOString()
  };
}

function getRecentDecisions(companyId, limit = 20) {
  let filtered = _graphs;
  if (companyId) filtered = filtered.filter(g => g.company_id === String(companyId));
  return filtered.slice(-limit).map(g => ({
    graph_id: g.graph_id,
    decision_id: g.decision_id,
    created_at: g.created_at,
    summary: g.summary,
    has_decision: !!g.final_decision
  }));
}

function getMetrics() {
  return {
    graphs_created: _graphsCreated,
    queries_answered: _queriesAnswered,
    graphs_stored: _graphs.length,
    timeline_entries: _timelines.length,
    explainability_enabled: EXPLAIN_ENABLED
  };
}

function _safeClone(obj) {
  try { return JSON.parse(JSON.stringify(obj)); }
  catch { return {}; }
}

module.exports = {
  DECISION_SOURCES,
  NODE_TYPES,
  EXPLAIN_ENABLED,
  createExplainabilityGraph,
  addNode,
  addEdge,
  setDecision,
  recordTimelineEntry,
  getTimeline,
  explainDecision,
  getRecentDecisions,
  getMetrics
};
