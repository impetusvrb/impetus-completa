'use strict';

/** Grafo simples de propagação de risco (adjacência por tenant) */
function buildPropagationGraph(edges = []) {
  const adj = new Map();
  for (const e of edges) {
    const from = String(e.from || '');
    const to = String(e.to || '');
    if (!from || !to) continue;
    if (!adj.has(from)) adj.set(from, new Set());
    adj.get(from).add(to);
  }
  return { adj, edge_count: edges.length };
}

function downstreamRiskNodes(graph, start, maxDepth = 5) {
  const seen = new Set();
  const out = [];
  function walk(n, d) {
    if (d > maxDepth || seen.has(n)) return;
    seen.add(n);
    out.push({ node: n, depth: d });
    const next = graph.adj.get(n);
    if (!next) return;
    for (const t of next) walk(t, d + 1);
  }
  walk(String(start), 0);
  return out;
}

module.exports = {
  buildPropagationGraph,
  downstreamRiskNodes
};
