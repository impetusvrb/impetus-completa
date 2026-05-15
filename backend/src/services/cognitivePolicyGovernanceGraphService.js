'use strict';

/**
 * IMPETUS — Cognitive Policy Engine · Fase 7 (Policy Governance Graph — read-only)
 * Grafo normativo observável: nós, arestas, causalidade, padrões e centralidade.
 * Não executa governance, arbitration nem obligations; só representação e observabilidade.
 * Rollout: IMPETUS_POLICY_GRAPH_ENABLED=true
 */

const { randomUUID } = require('crypto');

const POLICY_GRAPH_NODE_TYPES = Object.freeze({
  SIGNAL: 'SIGNAL',
  DECISION: 'DECISION',
  ARBITRATION: 'ARBITRATION',
  OBLIGATION: 'OBLIGATION',
  DOMAIN: 'DOMAIN',
  EFFECT: 'EFFECT',
  CORRELATION: 'CORRELATION'
});

const POLICY_GRAPH_RELATIONS = Object.freeze({
  CAUSES: 'CAUSES',
  REQUIRES: 'REQUIRES',
  OVERRIDES: 'OVERRIDES',
  CORRELATES_WITH: 'CORRELATES_WITH',
  DOMINATES: 'DOMINATES',
  GENERATES: 'GENERATES',
  DEPENDS_ON: 'DEPENDS_ON',
  ESCALATES_TO: 'ESCALATES_TO'
});

const SUPPORTED_PATTERN_TYPES = Object.freeze([
  'normative_cycle',
  'dominant_safety_cluster',
  'excessive_centralization',
  'cognitive_domain_dominance',
  'escalation_chain',
  'orphan_subgraph'
]);

function isPolicyGraphEnabled() {
  return String(process.env.IMPETUS_POLICY_GRAPH_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';
}

function _nowIso() {
  return new Date().toISOString();
}

function _safeStr(v, max = 512) {
  if (v == null) return '';
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

function _normUpper(v, max = 64) {
  return _safeStr(v, max).trim().toUpperCase() || 'UNKNOWN';
}

function _safeMeta(obj) {
  try {
    if (obj != null && typeof obj === 'object' && !Array.isArray(obj)) return { ...obj };
  } catch (_e) {}
  return {};
}

/** @param {Record<string, unknown>} partial */
function createGraphNode(partial) {
  let p = {};
  try {
    p = partial && typeof partial === 'object' ? { ...partial } : {};
  } catch (_e) {
    p = {};
  }

  const typeKeys = new Set(Object.values(POLICY_GRAPH_NODE_TYPES));
  let node_type = _normUpper(p.node_type, 32);
  if (!typeKeys.has(node_type)) node_type = POLICY_GRAPH_NODE_TYPES.DOMAIN;

  let severity = _safeStr(p.severity, 32).trim().toLowerCase();
  if (!severity) severity = 'medium';

  let metadata = _safeMeta(p.metadata);

  const node = {
    node_id: p.node_id != null ? _safeStr(p.node_id, 64) : randomUUID(),
    node_type,
    domain: _normUpper(p.domain || p.domain_id, 32),
    label: _safeStr(p.label, 512) || node_type,
    severity,
    source: _safeStr(p.source, 256) || 'cognitivePolicyGovernanceGraphService',
    metadata,
    created_at: p.created_at != null ? _safeStr(p.created_at, 40) : _nowIso()
  };

  try {
    console.info('[POLICY_GRAPH]', JSON.stringify({ action: 'node', node_type: node.node_type, domain: node.domain }));
  } catch (_e2) {}
  return node;
}

/** @param {Record<string, unknown>} partial */
function createGraphEdge(partial) {
  let p = {};
  try {
    p = partial && typeof partial === 'object' ? { ...partial } : {};
  } catch (_e) {
    p = {};
  }

  const relKeys = new Set(Object.values(POLICY_GRAPH_RELATIONS));
  let relation_type = _normUpper(p.relation_type, 32);
  if (!relKeys.has(relation_type)) relation_type = POLICY_GRAPH_RELATIONS.DEPENDS_ON;

  let strength = p.strength;
  if (typeof strength !== 'number' || !Number.isFinite(strength)) strength = 0.5;
  strength = Math.min(1, Math.max(0, strength));

  const edge = {
    edge_id: p.edge_id != null ? _safeStr(p.edge_id, 64) : randomUUID(),
    from: _safeStr(p.from, 64),
    to: _safeStr(p.to, 64),
    relation_type,
    strength,
    metadata: _safeMeta(p.metadata),
    created_at: p.created_at != null ? _safeStr(p.created_at, 40) : _nowIso()
  };

  try {
    console.info(
      '[POLICY_GRAPH_EDGE]',
      JSON.stringify({ relation: edge.relation_type, from: edge.from?.slice(0, 8), to: edge.to?.slice(0, 8) })
    );
  } catch (_e2) {}
  return edge;
}

function _normalizeSignals(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const signal = _normUpper(item.signal || item.signal_type || item.type, 48);
    if (!signal || signal === 'UNKNOWN') continue;
    out.push({
      signal,
      severity: _safeStr(item.severity, 32).trim().toLowerCase() || 'medium',
      value: typeof item.value === 'number' && Number.isFinite(item.value) ? item.value : null,
      source: _safeStr(item.source || item.origin, 128) || 'policy_signal'
    });
  }
  return out;
}

function _normalizeObligations(raw) {
  if (Array.isArray(raw)) return raw.filter((o) => o && typeof o === 'object');
  if (raw && typeof raw === 'object' && Array.isArray(raw.obligations)) {
    return raw.obligations.filter((o) => o && typeof o === 'object');
  }
  if (raw && typeof raw === 'object' && Array.isArray(raw.list)) {
    return raw.list.filter((o) => o && typeof o === 'object');
  }
  return [];
}

/**
 * Composição observacional do grafo normativo.
 * @param {{ signals?: unknown[], decision?: Record<string, unknown>, arbitration?: Record<string, unknown>, obligations?: unknown }} input
 */
function composeGovernanceGraph(input) {
  const nodes = [];
  const edges = [];
  const nodeByKey = new Map();

  try {
    const inObj = input && typeof input === 'object' ? input : {};
    const decision = inObj.decision && typeof inObj.decision === 'object' ? inObj.decision : {};
    const arbitration = inObj.arbitration && typeof inObj.arbitration === 'object' ? inObj.arbitration : {};
    const signals = _normalizeSignals(inObj.signals != null ? inObj.signals : decision.signals);
    const obligations = _normalizeObligations(inObj.obligations);

    const decisionId = randomUUID();
    const riskLabel = _safeStr(decision.risk_level, 48) || 'composed';
    const decisionNode = createGraphNode({
      node_id: decisionId,
      node_type: POLICY_GRAPH_NODE_TYPES.DECISION,
      domain: 'GOVERNANCE',
      label: `Policy decision (${riskLabel})`,
      severity: _safeStr(decision.risk_level, 32).trim().toLowerCase() || 'medium',
      source: 'cognitivePolicyDecision',
      metadata: { effects: Array.isArray(decision.effects) ? decision.effects.length : 0 }
    });
    nodes.push(decisionNode);
    nodeByKey.set(`decision:${decisionId}`, decisionNode);

    const arbId = randomUUID();
    const winnerDom =
      arbitration.winner && arbitration.winner.domain ? _normUpper(arbitration.winner.domain, 32) : 'GOVERNANCE';
    const arbNode = createGraphNode({
      node_id: arbId,
      node_type: POLICY_GRAPH_NODE_TYPES.ARBITRATION,
      domain: winnerDom,
      label: `Arbitration winner: ${winnerDom}`,
      severity: 'medium',
      source: 'cognitivePolicyArbitrationService',
      metadata: {
        conflicts: Array.isArray(arbitration.conflicts) ? arbitration.conflicts.length : 0
      }
    });
    nodes.push(arbNode);
    nodeByKey.set(`arbitration:${arbId}`, arbNode);

    const domainSet = new Set([winnerDom]);
    for (const o of obligations) {
      if (o.domain) domainSet.add(_normUpper(o.domain, 32));
    }

    const domainNodes = new Map();
    for (const d of domainSet) {
      const dn = createGraphNode({
        node_type: POLICY_GRAPH_NODE_TYPES.DOMAIN,
        domain: d,
        label: `Domain ${d}`,
        severity: d === 'SAFETY' ? 'critical' : 'low',
        source: 'cognitivePolicyGovernanceGraphService',
        metadata: { topology_role: 'normative_domain' }
      });
      nodes.push(dn);
      domainNodes.set(d, dn);
      nodeByKey.set(`domain:${d}`, dn);
    }

    edges.push(
      createGraphEdge({
        from: arbId,
        to: domainNodes.get(winnerDom).node_id,
        relation_type: POLICY_GRAPH_RELATIONS.DOMINATES,
        strength: 0.95,
        metadata: { observational: true }
      })
    );

    const signalNodes = [];
    for (const s of signals) {
      const sn = createGraphNode({
        node_type: POLICY_GRAPH_NODE_TYPES.SIGNAL,
        domain: s.signal,
        label: `${s.signal} signal`,
        severity: s.severity,
        source: _safeStr(s.source, 128),
        metadata: { value: s.value }
      });
      nodes.push(sn);
      signalNodes.push(sn);
      nodeByKey.set(`signal:${sn.node_id}`, sn);

      edges.push(
        createGraphEdge({
          from: sn.node_id,
          to: decisionId,
          relation_type: POLICY_GRAPH_RELATIONS.GENERATES,
          strength: 0.85,
          metadata: { path: 'signal_to_decision' }
        })
      );
    }

    for (let i = 0; i < signalNodes.length; i++) {
      for (let j = i + 1; j < signalNodes.length; j++) {
        const a = signalNodes[i];
        const b = signalNodes[j];
        const sameHeavy =
          a.severity === b.severity && ['high', 'critical'].includes(a.severity || '');
        const sameDomain = a.domain === b.domain;
        if (sameHeavy || sameDomain) {
          edges.push(
            createGraphEdge({
              from: a.node_id,
              to: b.node_id,
              relation_type: POLICY_GRAPH_RELATIONS.CORRELATES_WITH,
              strength: sameHeavy ? 0.75 : 0.45,
              metadata: { pair: true }
            })
          );
        }
      }
    }

    const effects = Array.isArray(decision.effects) ? decision.effects : [];
    const effectNodes = [];
    for (const eff of effects.slice(0, 12)) {
      const effLabel = _safeStr(typeof eff === 'string' ? eff : eff?.type || eff?.effect, 64);
      if (!effLabel) continue;
      const en = createGraphNode({
        node_type: POLICY_GRAPH_NODE_TYPES.EFFECT,
        domain: winnerDom,
        label: `Effect ${effLabel}`,
        severity: 'medium',
        source: 'cognitivePolicyFacade',
        metadata: { effect: effLabel }
      });
      nodes.push(en);
      effectNodes.push(en);
      edges.push(
        createGraphEdge({
          from: decisionId,
          to: en.node_id,
          relation_type: POLICY_GRAPH_RELATIONS.GENERATES,
          strength: 0.7,
          metadata: { effect: effLabel }
        })
      );
    }

    const obligationNodes = [];
    for (const o of obligations) {
      const oid = o.obligation_id != null ? _safeStr(o.obligation_id, 64) : randomUUID();
      const on = createGraphNode({
        node_id: oid,
        node_type: POLICY_GRAPH_NODE_TYPES.OBLIGATION,
        domain: _normUpper(o.domain, 32),
        label: _safeStr(o.type, 64) || 'OBLIGATION',
        severity: _safeStr(o.severity, 24).toLowerCase() || 'medium',
        source: _safeStr(o.source, 128) || 'cognitivePolicyObligationService',
        metadata: { type: o.type, status: o.status }
      });
      nodes.push(on);
      obligationNodes.push(on);

      edges.push(
        createGraphEdge({
          from: decisionId,
          to: on.node_id,
          relation_type: POLICY_GRAPH_RELATIONS.GENERATES,
          strength: 0.88,
          metadata: { obligation_type: on.label }
        })
      );

      const domN = domainNodes.get(on.domain);
      if (domN) {
        edges.push(
          createGraphEdge({
            from: on.node_id,
            to: domN.node_id,
            relation_type: POLICY_GRAPH_RELATIONS.DEPENDS_ON,
            strength: 0.8,
            metadata: {}
          })
        );
      }

      const highEsc =
        on.severity === 'critical' ||
        on.label === 'HITL_REQUIRED' ||
        on.label === 'ESCALATE_RUNTIME';
      if (highEsc) {
        edges.push(
          createGraphEdge({
            from: decisionId,
            to: on.node_id,
            relation_type: POLICY_GRAPH_RELATIONS.ESCALATES_TO,
            strength: 0.92,
            metadata: { escalation: true }
          })
        );
      }
    }

    if (obligations.length >= 2) {
      const corr = createGraphNode({
        node_type: POLICY_GRAPH_NODE_TYPES.CORRELATION,
        domain: winnerDom,
        label: 'Obligation cluster correlation',
        severity: 'medium',
        source: 'detectGovernanceGraphPatterns',
        metadata: { obligation_count: obligations.length }
      });
      nodes.push(corr);
      edges.push(
        createGraphEdge({
          from: obligationNodes[0].node_id,
          to: corr.node_id,
          relation_type: POLICY_GRAPH_RELATIONS.CORRELATES_WITH,
          strength: 0.55,
          metadata: { cluster: true }
        })
      );
    }

    const summary = {
      node_count: nodes.length,
      edge_count: edges.length,
      signal_count: signalNodes.length,
      obligation_count: obligationNodes.length,
      domain_count: domainNodes.size,
      topology:
        `ARBITRATION→DOMINATES→DOMAIN; SIGNAL—GENERATES→DECISION; DECISION—GENERATES/ESCALATES_TO→OBLIGATION; OBLIGATION—DEPENDS_ON→DOMAIN; SIGNAL—CORRELATES_WITH—SIGNAL${effectNodes.length ? '; DECISION→EFFECT' : ''}`,
      generated_at: _nowIso()
    };

    try {
      console.info('[POLICY_GRAPH]', JSON.stringify({ action: 'compose', ...summary }));
    } catch (_e3) {}

    return { nodes, edges, summary };
  } catch (e) {
    try {
      console.warn('[POLICY_GRAPH]', { action: 'compose_error', message: _safeStr(e && e.message, 200) });
    } catch (_e4) {}
    const fallbackNode = createGraphNode({
      node_type: POLICY_GRAPH_NODE_TYPES.DOMAIN,
      domain: 'UNKNOWN',
      label: 'Empty graph fallback',
      severity: 'low',
      metadata: { error: _safeStr(e && e.message, 200) }
    });
    return {
      nodes: [fallbackNode],
      edges: [],
      summary: {
        node_count: 1,
        edge_count: 0,
        signal_count: 0,
        obligation_count: 0,
        domain_count: 0,
        topology: 'degraded_empty',
        generated_at: _nowIso()
      }
    };
  }
}

function _buildAdjacency(nodes, edges) {
  const ids = new Set(nodes.map((n) => n.node_id));
  const out = new Map();
  const undirected = new Map();
  for (const id of ids) {
    out.set(id, []);
    undirected.set(id, new Set());
  }
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) continue;
    out.get(e.from).push({ to: e.to, relation: e.relation_type });
    undirected.get(e.from).add(e.to);
    undirected.get(e.to).add(e.from);
  }
  return { out, undirected, ids };
}

/** @param {{ nodes: unknown[], edges: unknown[] }} graph */
function detectGovernanceGraphPatterns(graph) {
  const patterns = [];
  try {
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    const { out, undirected, ids } = _buildAdjacency(nodes, edges);

    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    const color = new Map();
    for (const id of ids) color.set(id, WHITE);
    let cycle = false;
    function dfs(u) {
      color.set(u, GRAY);
      for (const { to } of out.get(u) || []) {
        if (color.get(to) === GRAY) {
          cycle = true;
          return;
        }
        if (color.get(to) === WHITE) dfs(to);
        if (cycle) return;
      }
      color.set(u, BLACK);
    }
    for (const id of ids) {
      if (color.get(id) === WHITE) dfs(id);
      if (cycle) break;
    }
    if (cycle) {
      patterns.push({ type: 'normative_cycle', severity: 'high', detail: 'Directed cycle in normative edges' });
    }

    const safetyCrit = nodes.filter(
      (n) =>
        n &&
        (n.domain === 'SAFETY' || n.node_type === POLICY_GRAPH_NODE_TYPES.SIGNAL) &&
        n.severity === 'critical'
    );
    if (safetyCrit.length >= 2) {
      patterns.push({ type: 'dominant_safety_cluster', severity: 'high' });
    }

    const degree = new Map();
    for (const id of ids) degree.set(id, 0);
    for (const e of edges) {
      if (ids.has(e.from)) degree.set(e.from, (degree.get(e.from) || 0) + 1);
      if (ids.has(e.to)) degree.set(e.to, (degree.get(e.to) || 0) + 1);
    }
    let maxDeg = 0;
    let hubId = null;
    for (const [id, d] of degree) {
      if (d > maxDeg) {
        maxDeg = d;
        hubId = id;
      }
    }
    if (maxDeg >= Math.max(8, nodes.length * 0.35) && nodes.length > 4) {
      patterns.push({
        type: 'excessive_centralization',
        severity: 'medium',
        detail: hubId ? `hub_node=${hubId.slice(0, 8)}` : undefined
      });
    }

    const domainCounts = new Map();
    for (const n of nodes) {
      if (!n || n.node_type !== POLICY_GRAPH_NODE_TYPES.DOMAIN) continue;
      const d = n.domain || n.label;
      domainCounts.set(d, (domainCounts.get(d) || 0) + 1);
    }
    const nonDomain = nodes.filter((n) => n && n.node_type !== POLICY_GRAPH_NODE_TYPES.DOMAIN).length || 1;
    for (const [d, c] of domainCounts) {
      if (c / nonDomain > 0.4 && c >= 2) {
        patterns.push({
          type: 'cognitive_domain_dominance',
          severity: 'medium',
          domain: d
        });
      }
    }

    const escEdges = edges.filter((e) => e.relation_type === POLICY_GRAPH_RELATIONS.ESCALATES_TO);
    if (escEdges.length >= 2) {
      patterns.push({
        type: 'escalation_chain',
        severity: 'high',
        detail: `escalation_edges=${escEdges.length}`
      });
    }

    const connected = new Set();
    function visit(u) {
      connected.add(u);
      for (const v of undirected.get(u) || []) {
        if (!connected.has(v)) visit(v);
      }
    }
    const first = nodes[0] && nodes[0].node_id;
    if (first) visit(first);
    if (connected.size < ids.size && ids.size > 1) {
      patterns.push({ type: 'orphan_subgraph', severity: 'low' });
    }

    try {
      console.info('[POLICY_GRAPH_PATTERN]', JSON.stringify({ count: patterns.length }));
    } catch (_e) {}
  } catch (e) {
    patterns.push({ type: 'pattern_detection_degraded', severity: 'low', detail: _safeStr(e && e.message, 200) });
  }
  return { patterns };
}

/** @param {{ nodes: unknown[], edges: unknown[] }} graph */
function calculateGraphCentrality(graph) {
  const result = {
    dominant_domain: '—',
    dominant_obligation: '—',
    most_correlated_node: '—',
    dominant_normative_engine: '—'
  };
  try {
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];

    const domWeight = new Map();
    for (const n of nodes) {
      if (!n) continue;
      if (n.node_type === POLICY_GRAPH_NODE_TYPES.DOMAIN || n.node_type === POLICY_GRAPH_NODE_TYPES.OBLIGATION) {
        const d = n.domain || 'GOVERNANCE';
        domWeight.set(d, (domWeight.get(d) || 0) + 1);
      }
      for (const e of edges) {
        if (e.to === n.node_id || e.from === n.node_id) {
          const d = n.domain || 'GOVERNANCE';
          domWeight.set(d, (domWeight.get(d) || 0) + 0.25);
        }
      }
    }
    let bestD = null;
    let bestW = -1;
    for (const [d, w] of domWeight) {
      if (w > bestW) {
        bestW = w;
        bestD = d;
      }
    }
    if (bestD) result.dominant_domain = bestD;

    let oblBest = null;
    let oblScore = -1;
    for (const n of nodes) {
      if (!n || n.node_type !== POLICY_GRAPH_NODE_TYPES.OBLIGATION) continue;
      let s = 0;
      for (const e of edges) {
        if (e.from === n.node_id || e.to === n.node_id) s += 1;
      }
      const rank = n.severity === 'critical' ? 3 : n.severity === 'high' ? 2 : 1;
      s += rank;
      if (s > oblScore) {
        oblScore = s;
        oblBest = n.label || n.metadata?.type;
      }
    }
    if (oblBest) result.dominant_obligation = oblBest;

    let corrBest = null;
    let corrCount = -1;
    for (const n of nodes) {
      if (!n || n.node_type !== POLICY_GRAPH_NODE_TYPES.SIGNAL) continue;
      const c = edges.filter(
        (e) =>
          (e.from === n.node_id || e.to === n.node_id) && e.relation_type === POLICY_GRAPH_RELATIONS.CORRELATES_WITH
      ).length;
      if (c > corrCount) {
        corrCount = c;
        corrBest = `${n.domain}:${n.node_id.slice(0, 8)}`;
      }
    }
    if (corrBest && corrCount >= 0) result.most_correlated_node = corrCount > 0 ? corrBest : '—';

    const srcCount = new Map();
    for (const n of nodes) {
      if (!n || n.node_type !== POLICY_GRAPH_NODE_TYPES.SIGNAL) continue;
      const src = n.source || 'unknown';
      srcCount.set(src, (srcCount.get(src) || 0) + 1);
    }
    let bestS = null;
    let bestN = -1;
    for (const [s, c] of srcCount) {
      if (c > bestN) {
        bestN = c;
        bestS = s;
      }
    }
    if (bestS) result.dominant_normative_engine = bestS;

    try {
      console.info('[POLICY_GRAPH_CENTRALITY]', JSON.stringify({ dominant_domain: result.dominant_domain }));
    } catch (_e2) {}
  } catch (e) {
    result.detail = _safeStr(e && e.message, 200);
  }
  return result;
}

function appendGovernanceGraphTrace(trace, entry) {
  const list = Array.isArray(trace) ? [...trace] : [];
  try {
    list.push({
      type: _safeStr(entry && entry.type, 32).toUpperCase() || 'GRAPH',
      message: _safeStr(entry && entry.message, 2000),
      timestamp: _nowIso(),
      detail: entry && entry.detail && typeof entry.detail === 'object' ? entry.detail : undefined
    });
  } catch (_e) {
    list.push({ type: 'GRAPH', message: 'trace_append_failed', timestamp: _nowIso() });
  }
  try {
    console.info('[POLICY_GRAPH]', JSON.stringify({ action: 'trace', steps: list.length }));
  } catch (_e2) {}
  return list;
}

function validateGovernanceGraph(graph) {
  const errors = [];
  try {
    if (!graph || typeof graph !== 'object') {
      errors.push({ path: '', message: 'graph_missing' });
      return { valid: false, errors };
    }
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const nodeTypeSet = new Set(Object.values(POLICY_GRAPH_NODE_TYPES));
    const relSet = new Set(Object.values(POLICY_GRAPH_RELATIONS));
    const nodeIds = new Set();

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n || typeof n !== 'object') {
        errors.push({ path: `nodes[${i}]`, message: 'invalid' });
        continue;
      }
      if (!_safeStr(n.node_id, 1)) errors.push({ path: `nodes[${i}].node_id`, message: 'missing' });
      else nodeIds.add(n.node_id);
      if (!nodeTypeSet.has(n.node_type)) errors.push({ path: `nodes[${i}].node_type`, message: 'invalid_type' });
    }

    const touched = new Set();
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      if (!e || typeof e !== 'object') {
        errors.push({ path: `edges[${i}]`, message: 'invalid' });
        continue;
      }
      if (!relSet.has(e.relation_type)) errors.push({ path: `edges[${i}].relation_type`, message: 'invalid_relation' });
      if (!_safeStr(e.from, 1) || !nodeIds.has(e.from)) errors.push({ path: `edges[${i}].from`, message: 'invalid_reference' });
      if (!_safeStr(e.to, 1) || !nodeIds.has(e.to)) errors.push({ path: `edges[${i}].to`, message: 'invalid_reference' });
      if (nodeIds.has(e.from)) touched.add(e.from);
      if (nodeIds.has(e.to)) touched.add(e.to);
    }

    for (const id of nodeIds) {
      if (!touched.has(id) && nodes.length > 1) {
        errors.push({ path: `node:${id.slice(0, 8)}`, message: 'orphan_node' });
      }
    }
  } catch (e) {
    errors.push({ path: '', message: _safeStr(e && e.message, 200) });
  }
  return { valid: errors.length === 0, errors };
}

function generateGovernanceGraphSnapshot() {
  return {
    generated_at: _nowIso(),
    node_types: [...Object.values(POLICY_GRAPH_NODE_TYPES)],
    relation_types: [...Object.values(POLICY_GRAPH_RELATIONS)],
    supported_patterns: [...SUPPORTED_PATTERN_TYPES],
    graph_enabled: isPolicyGraphEnabled()
  };
}

function buildDemoGraphCompositionInput() {
  try {
    const cognitivePolicyObligationService = require('./cognitivePolicyObligationService');
    const input = cognitivePolicyObligationService.buildDemoCompositionInput();
    const report = cognitivePolicyObligationService.generateObligationReport(input);
    return {
      signals: input.signals,
      decision: input.decision,
      arbitration: input.arbitration,
      obligations: report.obligations
    };
  } catch (_e) {
    return {
      signals: [{ signal: 'SAFETY', severity: 'critical', value: 0.9, source: 'demo' }],
      decision: { risk_level: 'critical', effects: ['BLOCK'], signals: [] },
      arbitration: { conflicts: [], winner: { domain: 'SAFETY' } },
      obligations: [
        {
          obligation_id: randomUUID(),
          type: 'HITL_REQUIRED',
          severity: 'critical',
          domain: 'SAFETY',
          source: 'demo',
          status: 'declared'
        }
      ]
    };
  }
}

function generateGovernanceGraphReport(input) {
  const compIn = input != null && typeof input === 'object' ? input : buildDemoGraphCompositionInput();
  let trace = [];
  trace = appendGovernanceGraphTrace(trace, {
    type: 'GRAPH',
    message: 'Governance graph composition started (read-only)',
    detail: { phase: 7 }
  });

  const { nodes, edges, summary } = composeGovernanceGraph(compIn);
  const { patterns } = detectGovernanceGraphPatterns({ nodes, edges });
  const centrality = calculateGraphCentrality({ nodes, edges });

  trace = appendGovernanceGraphTrace(trace, {
    type: 'GRAPH',
    message: 'SIGNAL generated OBLIGATION chain (observational topology)',
    detail: { edges: edges.length, patterns: patterns.length }
  });
  trace = appendGovernanceGraphTrace(trace, {
    type: 'GRAPH',
    message: `Centrality: domain=${centrality.dominant_domain} obligation=${centrality.dominant_obligation}`,
    detail: centrality
  });

  const validation = validateGovernanceGraph({ nodes, edges });

  return {
    nodes,
    edges,
    patterns,
    centrality,
    summary: { ...summary, validation_ok: validation.valid, pattern_count: patterns.length },
    trace,
    composition_input_meta: {
      signals_in: Array.isArray(compIn.signals) ? compIn.signals.length : 0,
      obligations_in: Array.isArray(compIn.obligations)
        ? compIn.obligations.length
        : compIn.obligations && typeof compIn.obligations === 'object' && Array.isArray(compIn.obligations.obligations)
          ? compIn.obligations.obligations.length
          : 0
    }
  };
}

function getPolicyGovernanceGraphDashboardSummary() {
  if (!isPolicyGraphEnabled()) {
    return {
      enabled: false,
      code: 'POLICY_GRAPH_DISABLED',
      message: 'Defina IMPETUS_POLICY_GRAPH_ENABLED=true para o grafo normativo observável.'
    };
  }
  const report = generateGovernanceGraphReport();
  const validation = validateGovernanceGraph({ nodes: report.nodes, edges: report.edges });
  return {
    enabled: true,
    generated_at: _nowIso(),
    node_count: report.nodes.length,
    edge_count: report.edges.length,
    dominant_domain: report.centrality?.dominant_domain ?? '—',
    dominant_obligation: report.centrality?.dominant_obligation ?? '—',
    pattern_count: report.patterns.length,
    pattern_preview: report.patterns.slice(0, 4).map((p) => p.type),
    topology_summary: report.summary?.topology ?? '—',
    validation_ok: validation.valid,
    trace_steps: report.trace.length
  };
}

function generatePolicyGovernanceGraphAdminPayload() {
  return {
    snapshot: generateGovernanceGraphSnapshot(),
    demo_graph: generateGovernanceGraphReport()
  };
}

module.exports = {
  POLICY_GRAPH_NODE_TYPES,
  POLICY_GRAPH_RELATIONS,
  SUPPORTED_PATTERN_TYPES,
  isPolicyGraphEnabled,
  createGraphNode,
  createGraphEdge,
  composeGovernanceGraph,
  detectGovernanceGraphPatterns,
  calculateGraphCentrality,
  appendGovernanceGraphTrace,
  generateGovernanceGraphReport,
  validateGovernanceGraph,
  generateGovernanceGraphSnapshot,
  buildDemoGraphCompositionInput,
  getPolicyGovernanceGraphDashboardSummary,
  generatePolicyGovernanceGraphAdminPayload
};
