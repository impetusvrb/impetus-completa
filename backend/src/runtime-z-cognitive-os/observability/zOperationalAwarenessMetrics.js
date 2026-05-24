'use strict';

function computeOperationalAwarenessMetrics(context = {}, awareness = {}) {
  return {
    awareness_score: context?.awareness_score || 0,
    multi_domain: !!context?.cross_domain?.multi_domain,
    domain_count: context?.cross_domain?.domain_count || 0,
    operational_state: awareness?.operational_state || 'idle',
    awareness_signature: awareness?.awareness_signature || ''
  };
}

module.exports = { computeOperationalAwarenessMetrics };
