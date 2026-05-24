'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');
const { resolveIdentity } = require('../identity/zIdentityRuntime');
const { composeContextual } = require('../composition/zCompositionRuntime');
const { resolvePersonalization } = require('./zContextPersonalizationRuntime');

/**
 * zContextAssemblyRuntime — assembla a "vista contextual" do utilizador:
 * identidade + composição (V2 internalizado) + personalização (Motor A
 * internalizado). Resultado é independente de qualquer pipeline externo.
 */
async function assembleContext(user = {}, ctx = {}) {
  if (!flags.isContextRuntimeEnabled()) {
    return { context: null, runtime_skipped: true };
  }

  const t0 = Date.now();
  const [identityOut, compositionOut, personalizationOut] = await Promise.all([
    Promise.resolve(resolveIdentity(user)),
    composeContextual(user, ctx),
    resolvePersonalization(user)
  ]);

  const assembled = {
    identity: identityOut?.identity || null,
    composition: compositionOut?.composition || null,
    personalization: personalizationOut?.personalization || null,
    assembly_ms: Date.now() - t0,
    sources: {
      identity: identityOut?.source,
      composition: compositionOut?.source,
      personalization: personalizationOut?.source
    }
  };

  return {
    context: assembled,
    runtime: 'runtime_z',
    source: 'z_context_assembly_runtime',
    degraded: !assembled.composition && !assembled.personalization,
    auto_mutation: false
  };
}

module.exports = { assembleContext };
