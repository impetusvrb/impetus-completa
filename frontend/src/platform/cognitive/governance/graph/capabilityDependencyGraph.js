/**
 * CPL-003 — Dependency Graph (read-only).
 *
 * Capability → Adapter → Provider → Consumer
 */
import { CAPABILITY_COMPATIBILITY_MATRIX } from '../compatibility/capabilityCompatibility.js';

/**
 * @returns {{ nodes: Array, edges: Array, summary: Object }}
 */
export function buildCapabilityDependencyGraph(capabilityId = null) {
  const rows = capabilityId
    ? CAPABILITY_COMPATIBILITY_MATRIX.filter((r) => r.capabilityId === capabilityId)
    : CAPABILITY_COMPATIBILITY_MATRIX;

  const nodes = [];
  const edges = [];
  const seen = new Set();

  function addNode(id, type, label) {
    if (seen.has(id)) return;
    seen.add(id);
    nodes.push(Object.freeze({ id, type, label: label || id }));
  }

  for (const row of rows) {
    const capNode = `cap:${row.capabilityId}`;
    addNode(capNode, 'capability', row.label);

    if (row.contractId) {
      const contractNode = `contract:${row.contractId}`;
      addNode(contractNode, 'contract', row.contractId);
      edges.push(Object.freeze({ from: capNode, to: contractNode, relation: 'uses_contract' }));
    }

    if (row.adapterId) {
      const adapterNode = `adapter:${row.adapterId}`;
      addNode(adapterNode, 'adapter', row.adapterId);
      edges.push(Object.freeze({ from: capNode, to: adapterNode, relation: 'exposed_via' }));
    }

    for (const path of row.providers) {
      const providerNode = `provider:${path}`;
      addNode(providerNode, 'provider', path);
      edges.push(Object.freeze({ from: capNode, to: providerNode, relation: 'implemented_by' }));
      if (row.adapterId) {
        edges.push(
          Object.freeze({
            from: `adapter:${row.adapterId}`,
            to: providerNode,
            relation: 'delegates_to'
          })
        );
      }
    }

    for (const consumer of row.consumers) {
      const consumerNode = `consumer:${consumer}`;
      addNode(consumerNode, 'consumer', consumer);
      edges.push(Object.freeze({ from: consumerNode, to: capNode, relation: 'consumes' }));
    }
  }

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    summary: Object.freeze({
      capabilities: rows.length,
      nodes: nodes.length,
      edges: edges.length,
      adapters: nodes.filter((n) => n.type === 'adapter').length,
      providers: nodes.filter((n) => n.type === 'provider').length,
      consumers: nodes.filter((n) => n.type === 'consumer').length
    })
  });
}

export function getCapabilityDependencies(capabilityId) {
  return buildCapabilityDependencyGraph(capabilityId);
}
