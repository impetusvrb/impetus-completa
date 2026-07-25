/**
 * FIN-AUD-001 — Dependency Graph (read-only).
 *
 * Domínio → Módulo → Serviço → Contrato → Provider → Consumer
 */
import { FIN_MODULE_MAP } from './finAud001ModuleMap.js';
import { FIN_CONTRACTS_INDEX } from './finAud001ContractsIndex.js';
import { FIN_AUD_DISCOVERY_CATALOG } from './finAud001DiscoveryIndex.js';

export function buildFinanceDependencyGraph(scope = 'all') {
  const nodes = [];
  const edges = [];
  const seen = new Set();

  function addNode(id, type, label) {
    if (seen.has(id)) return;
    seen.add(id);
    nodes.push(Object.freeze({ id, type, label: label || id }));
  }

  // Domains
  const domains = [...new Set(FIN_AUD_DISCOVERY_CATALOG.map((e) => e.domain))];
  for (const d of domains) {
    addNode(`domain:${d}`, 'domain', d);
  }

  // Modules
  for (const mod of FIN_MODULE_MAP) {
    addNode(`module:${mod.moduleId}`, 'module', mod.label);
    const dom = _moduleDomain(mod);
    if (dom) edges.push(Object.freeze({ from: `domain:${dom}`, to: `module:${mod.moduleId}`, relation: 'contains' }));
    for (const svc of mod.backendServices || []) {
      addNode(`service:${svc}`, 'service', svc);
      edges.push(Object.freeze({ from: `module:${mod.moduleId}`, to: `service:${svc}`, relation: 'uses' }));
    }
    for (const ui of mod.uiComponents || []) {
      addNode(`consumer:${ui}`, 'consumer', ui);
      edges.push(Object.freeze({ from: `consumer:${ui}`, to: `module:${mod.moduleId}`, relation: 'consumes' }));
    }
  }

  // Discovery services/APIs
  for (const entry of FIN_AUD_DISCOVERY_CATALOG) {
    if (entry.category === 'service' || entry.category === 'api') {
      const svcId = entry.id;
      addNode(`service:${svcId}`, 'service', entry.name);
      addNode(`provider:${entry.location}`, 'provider', entry.location);
      edges.push(Object.freeze({ from: `service:${svcId}`, to: `provider:${entry.location}`, relation: 'implemented_by' }));
      addNode(`domain:${entry.domain}`, 'domain', entry.domain);
      edges.push(Object.freeze({ from: `domain:${entry.domain}`, to: `service:${svcId}`, relation: 'owns' }));
    }
  }

  // Contracts
  for (const c of FIN_CONTRACTS_INDEX) {
    addNode(`contract:${c.contractId}`, 'contract', c.contractId);
    if (c.provider) {
      addNode(`provider:${c.provider}`, 'provider', c.provider);
      edges.push(Object.freeze({ from: `contract:${c.contractId}`, to: `provider:${c.provider}`, relation: 'provided_by' }));
    }
    const consumers = Array.isArray(c.consumer) ? c.consumer : c.consumers ? c.consumers : c.consumer ? [c.consumer] : [];
    for (const cons of consumers) {
      addNode(`consumer:${cons}`, 'consumer', cons);
      edges.push(Object.freeze({ from: `consumer:${cons}`, to: `contract:${c.contractId}`, relation: 'consumes' }));
    }
    if (c.status === 'broken') {
      edges.push(Object.freeze({ from: `contract:${c.contractId}`, to: 'gap:missing_http_routes', relation: 'broken' }));
      addNode('gap:missing_http_routes', 'gap', 'Missing HTTP routes');
    }
  }

  const filteredNodes = scope === 'finance_core'
    ? nodes.filter((n) => !n.id.includes('supply') && !n.id.includes('production') && !n.id.includes('logistics'))
    : nodes;

  const filteredEdges = scope === 'finance_core'
    ? edges.filter((e) => filteredNodes.some((n) => n.id === e.from) && filteredNodes.some((n) => n.id === e.to))
    : edges;

  return Object.freeze({
    nodes: Object.freeze(filteredNodes),
    edges: Object.freeze(filteredEdges),
    summary: Object.freeze({
      domains: filteredNodes.filter((n) => n.type === 'domain').length,
      modules: filteredNodes.filter((n) => n.type === 'module').length,
      services: filteredNodes.filter((n) => n.type === 'service').length,
      contracts: filteredNodes.filter((n) => n.type === 'contract').length,
      providers: filteredNodes.filter((n) => n.type === 'provider').length,
      consumers: filteredNodes.filter((n) => n.type === 'consumer').length,
      gaps: filteredNodes.filter((n) => n.type === 'gap').length,
      edges: filteredEdges.length
    })
  });
}

function _moduleDomain(mod) {
  if (mod.moduleId.includes('nexus')) return 'nexus_ia';
  if (mod.moduleId === 'finance_native') return 'eox';
  return 'platform_dashboard';
}

export function getFinanceDependenciesForModule(moduleId) {
  const graph = buildFinanceDependencyGraph();
  const moduleNode = `module:${moduleId}`;
  const related = graph.edges.filter((e) => e.from === moduleNode || e.to === moduleNode);
  return Object.freeze({ moduleId, edges: related });
}
