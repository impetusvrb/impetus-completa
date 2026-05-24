'use strict';

/**
 * Correlaciona sinais de domínios SST/Ambiente/Qualidade/Produção/etc.
 * sem importar nenhum domínio (apenas regista o que veio no contexto).
 */
function buildCrossDomainContext(payloadFromZRuntime = {}) {
  const blocks = [
    payloadFromZRuntime?.production_cognitive_runtime && 'production',
    payloadFromZRuntime?.sst_cognitive_runtime && 'safety',
    payloadFromZRuntime?.environmental_cognitive_runtime && 'environmental',
    payloadFromZRuntime?.maintenance_cognitive_runtime && 'maintenance',
    payloadFromZRuntime?.specialized_cockpit_runtime && 'quality',
    payloadFromZRuntime?.hr_cognitive_runtime && 'hr',
    payloadFromZRuntime?.executive_cognitive_runtime && 'executive'
  ].filter(Boolean);

  return {
    active_domains: blocks,
    domain_count: blocks.length,
    multi_domain: blocks.length >= 2
  };
}

module.exports = { buildCrossDomainContext };
