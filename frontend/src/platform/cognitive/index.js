/**
 * CPL-001 / CPL-002 / CPL-003 — Cognitive Platform Layer.
 *
 * CPL-001: registry, contracts, discovery (architecture)
 * CPL-002: adapters, runtime, health, discovery API (orchestration)
 * CPL-003: capability governance (lifecycle, ownership, catalog, graph)
 *
 * Sem engines, recommendation, simulation, risk, timeline ou analytics próprios.
 */
export * from './registry/index.js';
export * from './runtime/index.js';
export * from './adapters/index.js';
export * from './health/index.js';
export * from './api/index.js';
export * from './governance/index.js';
export {
  bootstrapCognitivePlatformAdapters,
  isCognitivePlatformBootstrapped,
  resetBootstrapForTests
} from './runtime/cognitivePlatformBootstrap.js';
export { clearAdapterStoreForTests } from './runtime/cognitiveAdapterRuntime.js';
