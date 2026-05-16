'use strict';

/**
 * Descritores analíticos declarativos (sem queries cross-domain).
 */

module.exports = {
  SCHEMA_VERSION: 1,
  analytics_slices: [
    { id: 'pareto_defects', kind: 'pareto', source: 'quality_domain_only' },
    { id: 'spc_critical_params', kind: 'spc', source: 'quality_domain_only' },
    { id: 'copq_estimate', kind: 'financial_rollup', source: 'quality_domain_only' }
  ]
};
