'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');

let _compositionEngine = null;
function _lazyComposition() {
  if (_compositionEngine) return _compositionEngine;
  try {
    _compositionEngine = require('../../dashboardEngineV2/composition/compositionEngine');
  } catch (_) {
    _compositionEngine = null;
  }
  return _compositionEngine;
}

/**
 * zCompositionRuntime — internaliza V2 compositionEngine como sub-runtime
 * sem o expor directamente ao frontend. Devolve um payload já neutralizado
 * (sem prefixo `engine_v2`) com a origem registada para auditoria.
 *
 * Quando V2 estiver fisicamente arquivado, substituir o lazy require por
 * uma implementação nativa preservando o mesmo contrato de saída.
 */
async function composeContextual(user = {}, ctx = {}) {
  if (!flags.isCompositionRuntimeEnabled()) {
    return { composition: null, runtime_skipped: true };
  }

  const eng = _lazyComposition();
  if (!eng || typeof eng.composeDashboardV2 !== 'function') {
    return {
      composition: null,
      runtime: 'runtime_z',
      source: 'composition_engine_missing',
      degraded: true
    };
  }

  try {
    const v2 = await eng.composeDashboardV2(user, { traceId: ctx.trace_id || null });
    if (!v2) {
      return { composition: null, runtime: 'runtime_z', source: 'composition_no_result' };
    }
    return {
      composition: {
        identity: v2.identity || null,
        perfil: v2.perfil || null,
        modulos: v2.modulos || null,
        layout: v2.layout || null,
        assistente_ia: v2.assistente_ia || null,
        personalization: v2.personalization || null,
        explainability: v2.explainability || null
      },
      runtime: 'runtime_z',
      source: 'z_composition_runtime',
      delegated_to: 'engine_v2_composition',
      auto_mutation: false
    };
  } catch (err) {
    return {
      composition: null,
      runtime: 'runtime_z',
      source: 'z_composition_runtime_error',
      error: err?.message || String(err),
      degraded: true
    };
  }
}

module.exports = { composeContextual };
