'use strict';

const domainRegistry = require('../registry/domainRegistry');

function getCapabilitiesForAxis(axis) {
  const domain = domainRegistry.getDomain(axis);
  return {
    axis: domain.axis,
    ai_contexts: [...(domain.ai_contexts || [])],
    allowed_modules: [...(domain.allowed_modules || [])],
    denied_modules: [...(domain.denied_modules || [])],
    widgets: [...(domain.widgets || [])],
    dashboards: [...(domain.dashboards || [])]
  };
}

module.exports = { getCapabilitiesForAxis };
