'use strict';

/** Capacidades enterprise do domínio ENVIRONMENT (tenant + rollout + shadow). */
const ENVIRONMENT_CAPABILITIES = Object.freeze({
  environment_intelligence: {
    module_key: 'environment_intelligence',
    description: 'Licença do módulo ambiental'
  },
  environment_operational: {
    layer: 'operational',
    manifest_requires: { operational: true }
  },
  environment_governance: {
    layer: 'governance',
    manifest_requires: { governance: true }
  },
  environment_telemetry: {
    layer: 'telemetry',
    manifest_ids: ['environment_telemetry']
  },
  environment_cognitive: {
    layer: 'cognitive',
    manifest_requires: { cognitive: true }
  },
  environment_executive: {
    layer: 'executive',
    manifest_requires: { executive: true }
  }
});

module.exports = { ENVIRONMENT_CAPABILITIES };
