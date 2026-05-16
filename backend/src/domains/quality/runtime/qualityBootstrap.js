'use strict';

/**
 * Registo aditivo de ganchos de sumarização WAVE1 — domínio quality apenas.
 */

let _registered = false;

function ensureQualitySummarizationHooks() {
  if (_registered) return { registered: false, reason: 'already' };
  _registered = true;
  try {
    const { registerSummarizationHook } = require('../../../eventPipeline/summarization/summarizationHooks');

    registerSummarizationHook(
      'quality_universal_operational_shadow',
      async (envelope) => ({
        domain: 'quality',
        hook: 'operational_assist_shadow',
        event_name: envelope.event_name,
        correlation_id: envelope.correlation_id
      }),
      { domains: ['quality'], enabled: process.env.IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED === 'true' }
    );

    registerSummarizationHook(
      'quality_universal_governance_shadow',
      async (envelope) => ({
        domain: 'quality',
        hook: 'governance_analysis_shadow',
        event_name: envelope.event_name
      }),
      { domains: ['quality'], enabled: process.env.IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED === 'true' }
    );

    return { registered: true };
  } catch (err) {
    _registered = false;
    return { registered: false, error: err?.message || String(err) };
  }
}

module.exports = { ensureQualitySummarizationHooks };
