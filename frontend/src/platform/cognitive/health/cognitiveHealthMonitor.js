/**
 * CPL-002 — Health monitor (read-only · sem execução cognitiva).
 */
import { listRegisteredAdapters } from '../runtime/cognitiveAdapterRuntime.js';

export const COGNITIVE_HEALTH_STATES = Object.freeze(['available', 'degraded', 'offline', 'unknown']);

/**
 * @param {import('../runtime/cognitiveAdapterRuntime.js').CognitiveAdapter} adapter
 */
export function probeAdapterHealth(adapter) {
  if (!adapter) {
    return { status: 'offline', adapterId: null, checkedAt: new Date().toISOString() };
  }

  try {
    const health = adapter.health?.() || {};
    const caps = adapter.capabilities?.() || [];
    const providers = adapter.providerPaths || health.providers || [];

    if (health.status === 'offline') {
      return { ...health, adapterId: adapter.id, capabilities: caps.length, checkedAt: new Date().toISOString() };
    }

    if (!caps.length || !providers.length) {
      return {
        status: 'degraded',
        adapterId: adapter.id,
        domain: adapter.domain,
        version: adapter.version,
        capabilities: caps.length,
        providers: providers.length,
        checkedAt: new Date().toISOString()
      };
    }

    return {
      status: health.status || 'available',
      adapterId: adapter.id,
      domain: adapter.domain,
      version: adapter.version,
      capabilities: caps.length,
      capabilityList: caps,
      providers,
      checkedAt: new Date().toISOString(),
      ...health
    };
  } catch {
    return {
      status: 'offline',
      adapterId: adapter.id,
      domain: adapter.domain,
      checkedAt: new Date().toISOString()
    };
  }
}

export function monitorAllAdapters() {
  const adapters = listRegisteredAdapters();
  const results = adapters.map(probeAdapterHealth);
  const summary = {
    total: results.length,
    available: results.filter((r) => r.status === 'available').length,
    degraded: results.filter((r) => r.status === 'degraded').length,
    offline: results.filter((r) => r.status === 'offline').length,
    unknown: results.filter((r) => r.status === 'unknown').length,
    checkedAt: new Date().toISOString()
  };
  return { summary, adapters: results };
}

export function getAdapterHealth(adapterId) {
  const { adapters } = monitorAllAdapters();
  return adapters.find((a) => a.adapterId === adapterId) ?? { status: 'unknown', adapterId };
}
