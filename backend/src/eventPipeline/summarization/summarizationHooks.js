'use strict';

/**
 * Summarization hooks (WAVE 1) — registo estrutural para Wave 4.
 * Não executa summarização; apenas despacha para handlers registados.
 */

const _hooks = new Map(); // name -> { fn, domains, enabled }

let _stats = { invocations: 0, skipped: 0, handler_errors: 0 };

function registerSummarizationHook(name, fn, opts = {}) {
  const id = String(name || '').trim();
  if (!id || typeof fn !== 'function') {
    throw new Error('registerSummarizationHook: name e fn obrigatórios');
  }
  _hooks.set(id, {
    fn,
    domains: Array.isArray(opts.domains) ? opts.domains.map((d) => String(d).toLowerCase()) : null,
    enabled: opts.enabled !== false
  });
}

function unregisterSummarizationHook(name) {
  _hooks.delete(String(name || '').trim());
}

/**
 * @param {object} envelope — industrial envelope
 * @param {{ trigger?: string }} [ctx]
 */
async function invokeSummarizationHooks(envelope, ctx = {}) {
  if (!_hooks.size) {
    _stats.skipped += 1;
    return { invoked: 0, results: [] };
  }

  const domain = String(envelope?.domain || '').toLowerCase();
  const results = [];

  for (const [name, hook] of _hooks) {
    if (!hook.enabled) continue;
    if (hook.domains && hook.domains.length && !hook.domains.includes(domain)) continue;

    _stats.invocations += 1;
    try {
      const r = await hook.fn(envelope, ctx);
      results.push({ name, ok: true, result: r != null ? r : null });
    } catch (err) {
      _stats.handler_errors += 1;
      results.push({ name, ok: false, error: err?.message || String(err) });
    }
  }

  return { invoked: results.length, results };
}

function listHooks() {
  return [..._hooks.keys()].map((name) => {
    const h = _hooks.get(name);
    return { name, domains: h.domains, enabled: h.enabled };
  });
}

function getSummarizationStats() {
  return { ..._stats, registered_hooks: _hooks.size };
}

module.exports = {
  registerSummarizationHook,
  unregisterSummarizationHook,
  invokeSummarizationHooks,
  listHooks,
  getSummarizationStats
};
