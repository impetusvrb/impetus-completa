/**
 * CPL-002 — Capability Discovery API (consulta apenas · sem executar regras cognitivas).
 */
import {
  COGNITIVE_PLATFORM_REGISTRY,
  COGNITIVE_ADAPTER_REGISTRY,
  getCognitiveCapability,
  getCognitiveAdapterRegistryEntry
} from '../registry/cognitivePlatformRegistry.js';
import { getCognitiveContract } from '../contracts/cognitiveContractDescriptors.js';
import {
  getCognitiveAdapter,
  listRegisteredAdapters
} from '../runtime/cognitiveAdapterRuntime.js';
import { monitorAllAdapters, getAdapterHealth } from '../health/cognitiveHealthMonitor.js';

export const CPL_DISCOVERY_API_PHASE = 'CPL-002';

export function listCapabilities() {
  return COGNITIVE_PLATFORM_REGISTRY.map((cap) => ({
    capabilityId: cap.capabilityId,
    label: cap.label,
    contractId: cap.contractId,
    ownerDomain: cap.ownerDomain,
    adapterId: cap.adapterId,
    adapterStatus: cap.adapterStatus,
    canonicalImplementation: cap.canonicalImplementation
  }));
}

export function getCapability(capabilityId) {
  const cap = getCognitiveCapability(capabilityId);
  if (!cap) return null;
  const contract = cap.contractId ? getCognitiveContract(cap.contractId) : null;
  const adapter = cap.adapterId ? getCognitiveAdapter(cap.adapterId) : null;
  return {
    ...cap,
    contract: contract ? { contractId: contract.contractId, status: contract.status } : null,
    adapterRuntime: adapter
      ? { id: adapter.id, domain: adapter.domain, capabilities: adapter.capabilities() }
      : null
  };
}

export function listAdapters() {
  const runtime = listRegisteredAdapters().map((a) => ({
    id: a.id,
    domain: a.domain,
    version: a.version,
    capabilities: a.capabilities(),
    providerPaths: a.providerPaths
  }));
  const registry = COGNITIVE_ADAPTER_REGISTRY.map((a) => ({
    adapterId: a.adapterId,
    label: a.label,
    targetDomain: a.targetDomain,
    status: a.status,
    cplPhase: a.cplPhase,
    registered: runtime.some((r) => r.id === a.adapterId)
  }));
  return { runtime, registry };
}

export function getProvider(capabilityId) {
  const cap = getCognitiveCapability(capabilityId);
  if (!cap) return null;
  return {
    capabilityId: cap.capabilityId,
    ownerDomain: cap.ownerDomain,
    canonicalImplementation: cap.canonicalImplementation,
    alternateImplementations: cap.alternateImplementations,
    adapterId: cap.adapterId,
    note: 'Provider intelligence remains in domain — adapter translates contract only'
  };
}

export function getHealth(adapterId = null) {
  if (adapterId) return getAdapterHealth(adapterId);
  return monitorAllAdapters();
}

/** Executar adapter — delegação explícita (orchestration entry — not discovery). */
export function delegateToAdapter(adapterId, operation, context = {}) {
  const adapter = getCognitiveAdapter(adapterId);
  if (!adapter) return { ok: false, error: 'adapter_not_registered', adapterId };
  if (operation === 'simulate') return adapter.simulate(context.scenarioId, context);
  if (operation === 'explain') return adapter.explain(context.subOperation, context);
  if (operation === 'health') return { ok: true, result: adapter.health() };
  if (operation === 'capabilities') return { ok: true, result: adapter.capabilities() };
  return adapter.execute(operation, context);
}

export function getAdapterRegistryEntry(adapterId) {
  return getCognitiveAdapterRegistryEntry(adapterId);
}
