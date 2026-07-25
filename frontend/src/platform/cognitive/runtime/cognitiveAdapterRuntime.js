/**
 * CPL-002 — Runtime comum de adapters cognitivos (thin · sem lógica de negócio).
 *
 * Adapters traduzem contratos CPL-001 → implementações domínio existentes.
 * Nunca executam heurísticas, regras ou recomendações próprias.
 */
export const CPL_ADAPTER_RUNTIME_PHASE = 'CPL-002';
export const CPL_ADAPTER_RUNTIME_VERSION = '1.0.0';

/** Operações canónicas expostas via adapter (delegação apenas). */
export const COGNITIVE_ADAPTER_OPERATIONS = Object.freeze([
  'capabilities',
  'execute',
  'explain',
  'simulate',
  'health'
]);

/**
 * @typedef {Object} CognitiveAdapter
 * @property {string} id
 * @property {string} domain
 * @property {string} version
 * @property {string[]} providerPaths — implementações domínio (referência)
 * @property {function(): string[]} capabilities
 * @property {function(string, Object): *} execute
 * @property {function(string, Object): *} [explain]
 * @property {function(string, Object): *} [simulate]
 * @property {function(): Object} health
 */

/**
 * Factory thin adapter — encapsula definição declarativa.
 * @param {Object} def
 * @returns {Readonly<CognitiveAdapter>}
 */
export function createCognitiveAdapter(def) {
  if (!def?.id || !def?.domain) {
    throw new Error('CognitiveAdapter requires id and domain');
  }

  const adapter = Object.freeze({
    id: def.id,
    domain: def.domain,
    version: def.version || '1.0.0',
    providerPaths: Object.freeze(def.providerPaths || []),
    contractIds: Object.freeze(def.contractIds || []),

    capabilities() {
      return [...(def.capabilities || [])];
    },

    execute(operation, context = {}) {
      if (!def.handlers?.[operation]) {
        return { ok: false, error: 'unsupported_operation', operation, adapterId: def.id };
      }
      try {
        const result = def.handlers[operation](context);
        return { ok: true, adapterId: def.id, operation, delegated: true, result };
      } catch (e) {
        return { ok: false, adapterId: def.id, operation, error: String(e.message || e) };
      }
    },

    explain(operation, context = {}) {
      if (def.handlers?.explain) return def.handlers.explain(operation, context);
      if (operation === 'trace' && def.handlers?.trace) {
        return { ok: true, adapterId: def.id, operation: 'explain', result: def.handlers.trace(context) };
      }
      return {
        ok: true,
        adapterId: def.id,
        operation: 'explain',
        result: {
          message: 'Thin adapter — intelligence owned by domain provider',
          providerPaths: def.providerPaths,
          contractIds: def.contractIds
        }
      };
    },

    simulate(scenarioId, context = {}) {
      if (!def.handlers?.simulate) {
        return { ok: false, error: 'simulate_not_supported', adapterId: def.id };
      }
      try {
        const result = def.handlers.simulate(scenarioId, context);
        return { ok: true, adapterId: def.id, operation: 'simulate', delegated: true, result };
      } catch (e) {
        return { ok: false, adapterId: def.id, operation: 'simulate', error: String(e.message || e) };
      }
    },

    health() {
      if (typeof def.healthProbe === 'function') {
        return def.healthProbe();
      }
      return { status: 'unknown', adapterId: def.id, version: def.version || '1.0.0' };
    }
  });

  return adapter;
}

/** Registo runtime in-memory (orquestração — não persiste estado operacional). */
const _adapterStore = new Map();

export function registerCognitiveAdapter(adapter) {
  if (!adapter?.id) throw new Error('registerCognitiveAdapter: missing id');
  _adapterStore.set(adapter.id, adapter);
  return adapter;
}

export function getCognitiveAdapter(adapterId) {
  return _adapterStore.get(adapterId) ?? null;
}

export function listRegisteredAdapters() {
  return [..._adapterStore.values()];
}

export function orchestrate(adapterId, operation, context = {}) {
  const adapter = getCognitiveAdapter(adapterId);
  if (!adapter) return { ok: false, error: 'adapter_not_found', adapterId };
  if (operation === 'health') return { ok: true, result: adapter.health() };
  if (operation === 'capabilities') return { ok: true, result: adapter.capabilities() };
  if (operation === 'simulate') return adapter.simulate(context.scenarioId, context);
  if (operation === 'explain') return adapter.explain(context.subOperation, context);
  return adapter.execute(context.subOperation || operation, context);
}

export function clearAdapterStoreForTests() {
  _adapterStore.clear();
}
