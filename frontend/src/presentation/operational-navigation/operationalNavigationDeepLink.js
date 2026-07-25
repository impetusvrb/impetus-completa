/**
 * NAV-002 — Deep link architecture (preparação CC → módulo · sem implementação cognitiva).
 */

/** @typedef {object} OperationalDeepLinkContext
 * @property {string} [source] — ex.: cognitive_center
 * @property {string} [intent] — ex.: inventory_rupture
 * @property {Record<string, string>} [filters]
 * @property {string} [targetModule]
 */

/**
 * Parse query string para contexto deep link (fase preparatória).
 * @param {string} search — location.search
 * @returns {OperationalDeepLinkContext|null}
 */
export function parseOperationalDeepLink(search = '') {
  if (!search) return null;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const source = params.get('onx_source');
  const intent = params.get('onx_intent');
  const targetModule = params.get('onx_module');
  if (!source && !intent && !targetModule) return null;

  /** @type {Record<string, string>} */
  const filters = {};
  for (const [key, value] of params.entries()) {
    if (key.startsWith('onx_filter_')) filters[key.replace('onx_filter_', '')] = value;
  }

  return Object.freeze({
    source: source || undefined,
    intent: intent || undefined,
    targetModule: targetModule || undefined,
    filters: Object.keys(filters).length ? filters : undefined
  });
}

/**
 * Reservado OPM-007+ — serialização para links CC.
 * @param {OperationalDeepLinkContext} ctx
 * @param {string} basePath
 */
export function buildOperationalDeepLinkHref(ctx, basePath) {
  if (!ctx) return basePath;
  const params = new URLSearchParams();
  if (ctx.source) params.set('onx_source', ctx.source);
  if (ctx.intent) params.set('onx_intent', ctx.intent);
  if (ctx.targetModule) params.set('onx_module', ctx.targetModule);
  if (ctx.filters) {
    for (const [k, v] of Object.entries(ctx.filters)) params.set(`onx_filter_${k}`, v);
  }
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}
